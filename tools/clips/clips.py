#!/usr/bin/env python3
"""Refyne marketing clips.

  python3 clips.py build specs/04-tap-for-vitamins.json            # Instagram + TikTok versions
  python3 clips.py build specs/04-tap-for-vitamins.json --platform instagram
  python3 clips.py record|compose|check ...                        # the same steps one at a time

record   runs the app in headless Chrome on the sample-data demo and captures it at 30 fps.
compose  adds the caption band, the platform's handle, the phone frame and tap circles, and exports
         1080x1920, 30 fps, silent H.264 (one file per platform).
check    fails the clip if a banned word or price shows on screen, a caption makes a results claim,
         or anything is drawn in the bottom 20% (where the platforms' own buttons cover it).

The demo is built from the app files in this repo (so it is always the current app) plus the demo-only
files in demo/. It never touches a real account: it signs in as a fake user, the backend is a stand-in that
keeps data in the browser, and every request to anything but the local copy is blocked.
"""
import argparse, base64, functools, http.server, json, os, re, shutil, subprocess, sys, tempfile, threading, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
DEMO = HERE / 'demo'
FONT_DIR = HERE / '.fonts' / 'node_modules' / '@fontsource'
OUT = HERE / 'out'
RULES = HERE / 'rules.json'

HANDLES = {'instagram': '@refyne.fit', 'tiktok': '@refynefit'}

# layout (1080 x 1920). Captions + handle sit in the top third; the phone ends on the 80% line (y=1536) so nothing
# important is in the bottom 20%.
W, H = 1080, 1920
SAFE_Y = int(H * 0.8)                         # 1536
BAND = 470
FRAME_X0, FRAME_Y0, FRAME_Y1, RING, RADIUS = 130, 470, SAFE_Y, 6, 58
APP_X, APP_Y = FRAME_X0 + RING, FRAME_Y0 + RING
APP_W, APP_H = W - 2 * APP_X, FRAME_Y1 - RING - APP_Y
VIEW_W = 390                                  # phone-width layout the app is designed for
DSF = APP_W / VIEW_W
VIEW_H = round(APP_H / DSF)
FPS = 30

LOOKS = {
    'dark':  dict(top='#16161E', bottom='#262B34', ink='#FFFFFF', sub='#C7CBD3', pill='rgba(255,255,255,.14)'),
    'light': dict(top='#F1F1EC', bottom='#D9D9D0', ink='#161A20', sub='#4A4F57', pill='rgba(22,26,32,.09)'),
    'pink':  dict(top='#F8CFE0', bottom='#E39BB9', ink='#4A1230', sub='#6B2A4B', pill='rgba(255,255,255,.55)'),
    'lilac': dict(top='#EFE7F9', bottom='#BDA0DC', ink='#2B1D3D', sub='#4F3A6E', pill='rgba(255,255,255,.55)'),
    'white': dict(top='#FFFFFF', bottom='#DEDED8', ink='#161A20', sub='#4A4F57', pill='rgba(22,26,32,.08)'),
    'sand':  dict(top='#F8F1E4', bottom='#D9C8A8', ink='#3A2F1F', sub='#6A5A41', pill='rgba(255,255,255,.55)'),
    'mint':  dict(top='#EAF4EE', bottom='#9FCBB0', ink='#15372B', sub='#3F6656', pill='rgba(255,255,255,.55)'),
    'sky':   dict(top='#EAF2FB', bottom='#9EBFE3', ink='#12304F', sub='#3E5F82', pill='rgba(255,255,255,.55)'),
    'navy':  dict(top='#0E1A2B', bottom='#1C3150', ink='#FFFFFF', sub='#B9C6DA', pill='rgba(255,255,255,.14)'),
}
APP_FONTS = [('barlow-condensed', 'Barlow Condensed', [500, 600, 700], ['normal']),
             ('barlow', 'Barlow', [400, 500, 600], ['normal']),
             ('playfair-display', 'Playfair Display', [600, 700], ['normal', 'italic']),
             ('nunito', 'Nunito', [400, 600, 700, 800], ['normal'])]


def run(cmd, **kw):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f"command failed: {' '.join(str(c) for c in cmd[:4])} ...\n{r.stderr[-1800:]}")
    return r


def hex2rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k): pass


def serve(directory):
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(_Quiet, directory=str(directory)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


def launch(p):
    exe = os.environ.get('CHROME_PATH') or shutil.which('google-chrome') or shutil.which('chromium')
    kw = dict(args=['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'])
    if exe: kw['executable_path'] = exe
    return p.chromium.launch(**kw)


def stage_site():
    """The demo site: the app files from this repo + the demo-only files. The repo's config.js (your Supabase
    address) and real Supabase client are never copied."""
    site = Path(tempfile.mkdtemp(prefix='clipsite_'))   # one per build, so builds can run side by side
    (site / 'vendor').mkdir(parents=True)
    shutil.copy(REPO / 'app.css', site / 'app.css')
    # app.js is one closure, so clip steps can't reach its internals. In this demo copy only, expose the few they use.
    js = (REPO / 'app.js').read_text(encoding='utf-8').rstrip()
    if not js.endswith('boot();\n})();'): sys.exit('app.js no longer ends with "boot();})();"; update stage_site()')
    js = js[: -len('})();')] + 'Object.assign(window, { S, store, render, saveConfig, applyTheme, gardenStats, toISO, todayISO });\n})();\n'
    (site / 'app.js').write_text(js, encoding='utf-8')
    shutil.copytree(REPO / 'icons', site / 'icons')
    if (REPO / 'vendor' / 'zxing.min.js').exists(): shutil.copy(REPO / 'vendor' / 'zxing.min.js', site / 'vendor' / 'zxing.min.js')
    shutil.copy(DEMO / 'mock-supabase.js', site / 'vendor' / 'supabase.js')
    shutil.copy(DEMO / 'config.js', site / 'config.js')
    shutil.copy(DEMO / 'sample.js', site / 'sample.js')
    html = (REPO / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r"<script>\s*if \('serviceWorker' in navigator\).*?</script>", '', html, flags=re.S)
    for needle in ('<script src="config.js"></script>', '<script src="app.js"></script>'):
        if needle not in html: sys.exit(f'index.html no longer contains {needle}; update stage_site()')
    html = html.replace('<script src="config.js"></script>', (DEMO / 'inject_head.html').read_text(encoding='utf-8') + '<script src="config.js"></script>', 1)
    html = html.replace('<script src="app.js"></script>', '<script src="app.js"></script>\n' + (DEMO / 'inject_body.html').read_text(encoding='utf-8'), 1)
    (site / 'index.html').write_text(html, encoding='utf-8')
    return site


def app_font_css():
    css, files = [], {}
    for slug, fam, weights, styles in APP_FONTS:
        for w in weights:
            for s in styles:
                f = FONT_DIR / slug / 'files' / f'{slug}-latin-{w}-{s}.woff2'
                if not f.exists(): continue
                files[f.name] = f
                css.append(f"@font-face{{font-family:'{fam}';font-style:{s};font-weight:{w};"
                           f"src:url(https://fonts.gstatic.com/local/{f.name}) format('woff2')}}")
    if not files: print('note: fonts not installed (run setup_fonts.sh); the app will use fallback fonts', file=sys.stderr)
    return '\n'.join(css), files


RING_JS = """
(() => {
  const st = document.createElement('style');
  st.textContent = '@keyframes tapfx{0%{transform:translate(-50%,-50%) scale(.55);opacity:.95}100%{transform:translate(-50%,-50%) scale(1.3);opacity:0}}'
    + '.tapfx{position:fixed;z-index:2147483647;width:34px;height:34px;border-radius:50%;background:rgba(40,40,46,.22);'
    + 'border:2px solid rgba(255,255,255,.92);box-shadow:0 0 0 1.5px rgba(0,0,0,.35);pointer-events:none;animation:tapfx .5s ease-out forwards}';
  document.head.appendChild(st);
  window.__tap = (x, y) => { const d = document.createElement('div'); d.className = 'tapfx'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 650); };
  // fire-and-forget on purpose: waiting for it would stop the screen capture from being acknowledged
  window.__scroll = (dy, ms, sel) => {
    const el = (sel && (sel.endsWith('|last') ? [...document.querySelectorAll(sel.slice(0,-5))].pop() : document.querySelector(sel))) || document.scrollingElement || document.documentElement;
    const y0 = el.scrollTop, t0 = performance.now();
    const f = now => { const k = Math.min(1, (now - t0) / ms); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollTop = y0 + dy * e; if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  };
})();
"""

HIDE_DEMO_BAR = ("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');"
                 "s.textContent='#demoBar{display:none!important}';document.head.appendChild(s)})")


def do_step(page, st, wait):
    """wait(seconds) keeps acknowledging screen-capture frames; never block on a long Playwright call."""
    kind = st['do']
    if kind in ('tap', 'type'):
        el = page.locator(st['target']).first
        el.wait_for(state='visible', timeout=8000)
        box = el.bounding_box()
        # out of the clear part of the screen (under the header, tab bar or log button)? scroll it into view smoothly first
        if box['y'] < 70 or box['y'] + box['height'] > VIEW_H - 130:
            dy = box['y'] - VIEW_H * 0.42
            el.evaluate("e => { const p = e.closest('.panel'); document.querySelectorAll('[data-cs]').forEach(x => x.removeAttribute('data-cs')); if (p) p.setAttribute('data-cs', '1'); }")
            has_panel = page.evaluate("() => !!document.querySelector('[data-cs]')")
            page.evaluate('([dy,sel]) => window.__scroll(dy, 550, sel)', [dy, "[data-cs]" if has_panel else None])
            wait(0.7); box = el.bounding_box()
        cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        page.evaluate('([x,y]) => window.__tap(x,y)', [cx, cy])
        wait(0.14)
        page.mouse.click(cx, cy)
        if kind == 'type':
            page.keyboard.press('Control+A')     # replace what's already in the box (it can be pre-filled with last time's weight)
            wait(0.15)
            for ch in st['text']:
                page.keyboard.type(ch); wait(int(st.get('delay', 90)) / 1000)
    elif kind == 'scroll':
        page.evaluate('([dy,ms,sel]) => window.__scroll(dy,ms,sel)', [st['dy'], st.get('ms', 1000), st.get('target')])
    elif kind == 'eval':      # run a line of JavaScript in the app (e.g. switch theme, add a past workout)
        page.evaluate(st['js'])
    elif kind == 'press':
        page.keyboard.press(st['key'])
    elif kind != 'wait':
        sys.exit(f"unknown step: {kind}")


def record(spec, raw_path):
    """Capture the demo app as a constant-30fps video of just the app area (no caption, no frame)."""
    from playwright.sync_api import sync_playwright
    base = f'http://127.0.0.1:{serve(stage_site())}'
    fcss, ffiles = app_font_css()
    frames, pending = [], []
    with sync_playwright() as p:
        b = launch(p)
        ctx = b.new_context(viewport={'width': VIEW_W, 'height': VIEW_H}, device_scale_factor=DSF,
                            service_workers='block', locale='en-AU', timezone_id='Australia/Brisbane')

        def route(r):
            u = r.request.url
            if u.startswith(base): return r.continue_()
            if u.startswith('https://fonts.googleapis.com/'): return r.fulfill(content_type='text/css', body=fcss)
            if u.startswith('https://fonts.gstatic.com/local/'):
                f = ffiles.get(u.rsplit('/', 1)[1])
                if f: return r.fulfill(content_type='font/woff2', body=f.read_bytes(), headers={'access-control-allow-origin': '*'})
            r.abort()   # nothing else leaves this machine
        ctx.route('**/*', route)
        ctx.add_init_script(HIDE_DEMO_BAR)
        page = ctx.new_page()
        ready = "() => !!document.querySelector('#view .card')"
        # set-up before the camera runs: load the sample data exactly as the demo page does (tap "Fill with sample data" twice)
        page.goto(f'{base}/index.html'); page.wait_for_selector('#demoFill', state='attached', timeout=15000)
        page.evaluate("() => { const b = document.getElementById('demoFill'); b.click(); b.click(); }")
        page.wait_for_function(ready, timeout=20000)
        if spec.get('config'):   # e.g. {"theme": "lilac"}: set up the look, as if chosen earlier
            patch = dict(spec['config'])
            if any(k in patch for k in ('theme', 'grow', 'growSoft', 'car', 'carSoft', 'bonsai', 'flower')):
                patch.update(blooms=[], bloomsInit=False)   # finished cars/trees are filled in again in the chosen style
            page.evaluate("""(patch) => { const db = JSON.parse(localStorage.getItem('__mockdb')); const r = db.rows['config/settings'];
                r.data = Object.assign({}, r.data, patch); localStorage.setItem('__mockdb', JSON.stringify(db)); }""", patch)
            page.reload(); page.wait_for_function(ready, timeout=20000)
        if 'garden_inbloom' in spec:   # start with the car/bonsai/flower this many points (0-39) into its current growth
            need = (int(spec['garden_inbloom']) - page.evaluate('() => gardenStats().inBloom')) % 40
            if need:
                page.evaluate("""(n) => { const db = JSON.parse(localStorage.getItem('__mockdb')); const d = new Date(); d.setHours(12, 0, 0, 0);
                    for (let i = 0; i < n; i++) { const x = new Date(d); x.setDate(x.getDate() - 90 - i); const date = toISO(x);
                        db.rows['weights/' + date] = { collection: 'weights', id: date, data: { date, kg: 70 } }; }
                    localStorage.setItem('__mockdb', JSON.stringify(db)); }""", need)
                page.reload(); page.wait_for_function(ready, timeout=20000)
        if spec.get('start_tab'):
            page.evaluate("(t) => document.querySelector(`nav.tabs [data-tab='${t}']`).click()", spec['start_tab'])
        page.wait_for_timeout(1200)
        page.evaluate(RING_JS)
        cdp = ctx.new_cdp_session(page)
        cdp.on('Page.screencastFrame', lambda ev: (frames.append((ev['metadata']['timestamp'], ev['data'])), pending.append(ev['sessionId'])))
        T0 = time.time()
        cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 95, 'everyNthFrame': 1})

        def pump(until):
            while time.time() - T0 < until:
                page.wait_for_timeout(15)
                while pending: cdp.send('Page.screencastFrameAck', {'sessionId': pending.pop()})
        def wait(sec): pump(time.time() - T0 + sec)
        for st in sorted(spec['steps'], key=lambda s: s['at']):
            pump(st['at']); do_step(page, st, wait)
        pump(spec['duration'])
        cdp.send('Page.stopScreencast')
        b.close()
    if not frames: sys.exit('no frames were captured')
    tmp = Path(tempfile.mkdtemp(prefix='clipframes_'))
    base_ts = frames[0][0]; lines = ['ffconcat version 1.0']
    for i, (ts, data) in enumerate(frames):
        (tmp / f'f{i:06d}.jpg').write_bytes(base64.b64decode(data))
        t = ts - base_ts
        nxt = (frames[i + 1][0] - base_ts) if i + 1 < len(frames) else max(spec['duration'], t + 0.05)
        lines += [f"file 'f{i:06d}.jpg'", f'duration {max(nxt - t, 0.001):.4f}']
    lines.append(f"file 'f{len(frames) - 1:06d}.jpg'")
    (tmp / 'list.txt').write_text('\n'.join(lines))
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', tmp / 'list.txt', '-vf',
         f'fps={FPS},scale={APP_W}:{APP_H}:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '12',
         '-preset', 'veryfast', '-t', spec['duration'], raw_path])
    shutil.rmtree(tmp, ignore_errors=True)
    print(f'recorded {len(frames)} screen updates -> {raw_path}')


def background(look):
    """Gradient + a soft shadow under the phone. Nothing else is ever drawn below the 80% line."""
    from PIL import Image, ImageDraw, ImageFilter
    bg = Image.composite(Image.new('RGB', (W, H), hex2rgb(look['bottom'])), Image.new('RGB', (W, H), hex2rgb(look['top'])),
                         Image.linear_gradient('L').resize((W, H)))
    sh = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle((FRAME_X0, FRAME_Y0 + 14, W - FRAME_X0, FRAME_Y1 + 14), radius=RADIUS, fill=95)
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    return Image.composite(Image.new('RGB', (W, H), (0, 0, 0)), bg, sh)


def make_assets(look, d):
    from PIL import Image, ImageDraw
    background(look).save(d / 'bg.png')
    S = 4
    ring = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle((FRAME_X0 * S, FRAME_Y0 * S, (W - FRAME_X0) * S, FRAME_Y1 * S), radius=RADIUS * S, fill=(14, 15, 18, 255))
    inner = Image.new('L', (W * S, H * S), 0)
    ImageDraw.Draw(inner).rounded_rectangle((APP_X * S, APP_Y * S, (W - APP_X) * S, (APP_Y + APP_H) * S), radius=(RADIUS - RING) * S, fill=255)
    ring.putalpha(Image.composite(Image.new('L', (W * S, H * S), 0), ring.getchannel('A'), inner))
    ring.resize((W, H), Image.LANCZOS).save(d / 'ring.png')
    mask = Image.new('L', (APP_W * S, APP_H * S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, APP_W * S, APP_H * S), radius=(RADIUS - RING) * S, fill=255)
    mask.resize((APP_W, APP_H), Image.LANCZOS).save(d / 'mask.png')


def render_captions(spec, look, platform, d):
    from playwright.sync_api import sync_playwright
    def inter(w): return base64.b64encode((FONT_DIR / 'inter' / 'files' / f'inter-latin-{w}-normal.woff2').read_bytes()).decode()
    html = (f"<style>@font-face{{font-family:I;font-weight:800;src:url(data:font/woff2;base64,{inter(800)})}}"
            f"@font-face{{font-family:I;font-weight:600;src:url(data:font/woff2;base64,{inter(600)})}}"
            f"@font-face{{font-family:I;font-weight:500;src:url(data:font/woff2;base64,{inter(500)})}}"
            f"html,body{{margin:0;background:transparent}}#c{{width:{W}px;height:{BAND}px;position:relative;font-family:I,sans-serif;box-sizing:border-box}}"
            f"#t{{position:absolute;left:0;right:0;top:34px;height:340px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;box-sizing:border-box}}"
            f"h1{{margin:0;font-weight:800;font-size:72px;line-height:1.08;color:{look['ink']};letter-spacing:-.8px}}"
            f"p{{margin:18px 0 0;font-weight:500;font-size:36px;color:{look['sub']}}}"
            f"#h{{position:absolute;left:0;right:0;bottom:26px;display:flex;justify-content:center}}"
            f"#h span{{font-weight:600;font-size:32px;color:{look['ink']};background:{look['pill']};padding:9px 30px;border-radius:999px;letter-spacing:.2px}}"
            f"</style><div id=c><div id=t><h1></h1><p></p></div><div id=h><span>{HANDLES[platform]}</span></div></div>")
    caps = spec['captions']; out = []
    with sync_playwright() as p:
        b = launch(p); page = b.new_page(viewport={'width': W, 'height': BAND}); page.set_content(html)
        for i, c in enumerate(caps):
            page.evaluate('([t,s]) => { document.querySelector("h1").textContent = t; const p = document.querySelector("p"); p.textContent = s || ""; p.style.display = s ? "block" : "none"; }',
                          [c['title'], c.get('sub', '')])
            png = d / f'cap{i}.png'
            page.locator('#c').screenshot(path=str(png), omit_background=True)
            end = caps[i + 1]['t'] if i + 1 < len(caps) else spec['duration']
            out.append((png, c['t'], end))
        b.close()
    return out


def compose(spec, raw, out, platform):
    look = LOOKS[spec['look']]; d = Path(tempfile.mkdtemp(prefix='clipasm_')); dur = spec['duration']
    make_assets(look, d); caps = render_captions(spec, look, platform, d)
    still = lambda f: ['-loop', '1', '-framerate', FPS, '-t', dur, '-i', f]
    cmd = ['ffmpeg', '-y', *still(d / 'bg.png'), '-i', raw, *still(d / 'mask.png'), *still(d / 'ring.png')]
    for png, _, _ in caps: cmd += still(png)
    f = [f'[1:v]scale={APP_W}:{APP_H},format=rgba[a]', '[2:v]format=gray[m]', '[a][m]alphamerge[app]',
         f'[0:v][app]overlay={APP_X}:{APP_Y}[b0]', '[b0][3:v]overlay=0:0[b1]']
    last = 'b1'; fd = 0.22
    for i, (_, a, b) in enumerate(caps):
        parts = ['format=rgba']
        if a > 0: parts.append(f'fade=t=in:st={a}:d={fd}:alpha=1')
        if i < len(caps) - 1: parts.append(f'fade=t=out:st={b - fd}:d={fd}:alpha=1')
        f.append(f"[{4 + i}:v]{','.join(parts)}[c{i}]")
        f.append(f'[{last}][c{i}]overlay=0:0[o{i}]'); last = f'o{i}'
    run([*cmd, '-filter_complex', ';'.join(f), '-map', f'[{last}]', '-t', dur, '-r', FPS, '-c:v', 'libx264',
         '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', out])
    shutil.rmtree(d, ignore_errors=True)
    print(f'composed -> {out}')


def norm(s): return re.sub(r'[^a-z0-9]', '', s.lower())


def check_captions(spec):
    pats = json.loads(RULES.read_text())['caption_banned']; bad = []
    for c in spec['captions']:
        for field in ('title', 'sub'):
            for p in pats:
                if re.search(p, c.get(field, '').lower()): bad.append({'caption': c.get(field), 'rule': p})
    return bad


def check_video(video, spec, per_second=2):
    """OCR every sampled frame for banned words/prices, and confirm the bottom 20% is empty background."""
    if not shutil.which('tesseract'): sys.exit('tesseract is not installed (needed for the content check)')
    rules = json.loads(RULES.read_text())
    banned = [(t, norm(t)) for t in rules['banned'] if norm(t)]
    pats = [re.compile(p, re.I) for p in rules['banned_patterns']]
    d = Path(tempfile.mkdtemp(prefix='clipocr_'))
    run(['ffmpeg', '-y', '-i', video, '-vf', f'fps={per_second}', '-q:v', '2', d / 'f_%04d.png'])
    hits = []; frames = sorted(d.glob('f_*.png'))
    for i, png in enumerate(frames):
        txt = run(['tesseract', png, '-', '--psm', '11']).stdout; n = norm(txt)
        for term, nt in banned:
            if nt in n: hits.append({'t': round(i / per_second, 1), 'word': term})
        for p in pats:
            m = p.search('\n'.join(l for l in txt.splitlines() if 'REFYNE' not in l.upper()))  # header line: gear icon is misread as '$'
            if m: hits.append({'t': round(i / per_second, 1), 'pattern': m.group(0)})
    # safe zone: below ~y=1600 (past the phone's soft shadow) a frame must equal the plain background
    from PIL import Image, ImageChops
    bg = background(LOOKS[spec['look']]).crop((0, 1600, W, H))
    for i in range(0, len(frames), max(1, len(frames) // 6)):
        diff = ImageChops.difference(Image.open(frames[i]).convert('RGB').crop((0, 1600, W, H)), bg).getextrema()
        if max(hi for _, hi in diff) > 12: hits.append({'t': round(i / per_second, 1), 'safe_zone': 'something is drawn in the bottom 20%'})
    shutil.rmtree(d, ignore_errors=True)
    return hits


def load(p): return json.loads(Path(p).read_text())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['build', 'record', 'compose', 'check'])
    ap.add_argument('specs', nargs='+', help='spec file(s)')
    ap.add_argument('--platform', choices=['instagram', 'tiktok'], action='append', help='default: both')
    ap.add_argument('--no-check', action='store_true')
    a = ap.parse_args(); OUT.mkdir(exist_ok=True); bad = False
    platforms = a.platform or ['instagram', 'tiktok']
    for s in a.specs:
        spec = load(s); raw = OUT / f"{spec['id']}.raw.mp4"
        if spec['duration'] > 20: sys.exit(f"{spec['id']}: {spec['duration']}s is over the 20 second limit")
        cb = check_captions(spec)
        if cb: print(f"{spec['id']}: caption rules FAILED {cb}"); bad = True; continue
        if a.cmd in ('build', 'record'): record(spec, raw)
        for pf in platforms:
            fin = OUT / f"{spec['id']}-{pf}.mp4"
            if a.cmd in ('build', 'compose'): compose(spec, raw, fin, pf)
            if a.cmd in ('build', 'check') and not a.no_check:
                hits = check_video(fin, spec)
                (OUT / f"{spec['id']}-{pf}.check.json").write_text(json.dumps({'clean': not hits, 'hits': hits}, indent=1))
                print(f"{spec['id']}-{pf}: content check", 'CLEAN' if not hits else f'FAILED {hits}'); bad |= bool(hits)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
