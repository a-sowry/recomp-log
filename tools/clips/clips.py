#!/usr/bin/env python3
"""Recomp Log marketing clips.

  python3 clips.py build specs/01-car-build.json     # record + compose + content check
  python3 clips.py record|compose|check ...           # the same steps one at a time

record   drives the app in demo mode (?demo=1, see demo.js) in headless Chrome and captures it at 30 fps.
compose  adds the caption band, phone frame and tap circles and exports 1080x1920, 30 fps, silent H.264.
check    reads the text in every frame (OCR) and fails if a banned word shows (see rules.json).

Nothing here needs a login or a network connection to your real data: the app runs on generated demo data
and every request to anything but the local copy of the app is blocked.
"""
import argparse, base64, functools, http.server, json, os, re, shutil, subprocess, sys, tempfile, threading, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
FONT_DIR = HERE / '.fonts' / 'node_modules' / '@fontsource'
OUT = HERE / 'out'

# layout, measured from the first nine clips (1080 x 1920)
W, H, BAND = 1080, 1920, 474
FRAME_X0, FRAME_Y0, RING, RADIUS = 36, 472, 6, 62
APP_X, APP_Y = FRAME_X0 + RING, FRAME_Y0 + RING
APP_W, APP_H = W - 2 * APP_X, H - APP_Y
VIEW_W = 390                      # phone-width layout the app is designed for
DSF = APP_W / VIEW_W
VIEW_H = round(APP_H / DSF)
FPS = 30

LOOKS = {
    'dark':  dict(top='#16161E', bottom='#21262E', ink='#FFFFFF', sub='#C7CBD3'),
    'pink':  dict(top='#F6C5DB', bottom='#D88AA9', ink='#4A1230', sub='#6B2A4B'),
    'lilac': dict(top='#ECE3F7', bottom='#B596D6', ink='#2B1D3D', sub='#4F3A6E'),
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


def serve():
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(_Quiet, directory=str(REPO)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


def launch(p):
    exe = os.environ.get('CHROME_PATH') or shutil.which('google-chrome') or shutil.which('chromium')
    kw = dict(args=['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'])
    if exe: kw['executable_path'] = exe
    return p.chromium.launch(**kw)


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
  window.__scroll = (dy, ms) => {
    const el = document.scrollingElement || document.documentElement; const y0 = el.scrollTop, t0 = performance.now();
    const f = now => { const k = Math.min(1, (now - t0) / ms); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollTop = y0 + dy * e; if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  };
})();
"""


def do_step(page, st, wait):
    """wait(seconds) keeps acknowledging screen-capture frames; never block on a long Playwright call."""
    kind = st['do']
    if kind in ('tap', 'type'):
        el = page.locator(st['target']).first
        el.wait_for(state='visible', timeout=8000)
        box = el.bounding_box()
        cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        page.evaluate('([x,y]) => window.__tap(x,y)', [cx, cy])
        wait(0.14)
        page.mouse.click(cx, cy)
        if kind == 'type':
            wait(0.15)
            for ch in st['text']:
                page.keyboard.type(ch); wait(int(st.get('delay', 90)) / 1000)
    elif kind == 'scroll':
        page.evaluate('([dy,ms]) => window.__scroll(dy,ms)', [st['dy'], st.get('ms', 1000)])
    elif kind != 'wait':
        sys.exit(f"unknown step: {kind}")


def record(spec, raw_path):
    """Capture the demo app as a constant-30fps video of just the app area (no caption, no frame)."""
    from playwright.sync_api import sync_playwright
    base = f'http://127.0.0.1:{serve()}'
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
        page = ctx.new_page()
        page.goto(f"{base}/index.html?{spec['query']}")
        page.wait_for_timeout(1500)
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


def make_assets(look, d):
    from PIL import Image, ImageDraw
    bg = Image.composite(Image.new('RGB', (W, H), hex2rgb(look['bottom'])), Image.new('RGB', (W, H), hex2rgb(look['top'])),
                         Image.linear_gradient('L').resize((W, H)))
    bg.save(d / 'bg.png')
    S = 4
    ring = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle((FRAME_X0 * S, FRAME_Y0 * S, (W - FRAME_X0) * S, (H + 300) * S), radius=RADIUS * S, fill=(14, 15, 18, 255))
    inner = Image.new('L', (W * S, H * S), 0)
    ImageDraw.Draw(inner).rounded_rectangle((APP_X * S, APP_Y * S, (W - APP_X) * S, (H + 300) * S), radius=(RADIUS - RING) * S, fill=255)
    ring.putalpha(Image.composite(Image.new('L', (W * S, H * S), 0), ring.getchannel('A'), inner))
    ring.resize((W, H), Image.LANCZOS).save(d / 'ring.png')
    mask = Image.new('L', (APP_W * S, (APP_H + 300) * S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, APP_W * S, (APP_H + 300) * S), radius=(RADIUS - RING) * S, fill=255)
    mask.crop((0, 0, APP_W * S, APP_H * S)).resize((APP_W, APP_H), Image.LANCZOS).save(d / 'mask.png')


def render_captions(spec, look, d):
    from playwright.sync_api import sync_playwright
    def inter(w): return base64.b64encode((FONT_DIR / 'inter' / 'files' / f'inter-latin-{w}-normal.woff2').read_bytes()).decode()
    html = (f"<style>@font-face{{font-family:I;font-weight:800;src:url(data:font/woff2;base64,{inter(800)})}}"
            f"@font-face{{font-family:I;font-weight:500;src:url(data:font/woff2;base64,{inter(500)})}}"
            f"html,body{{margin:0;background:transparent}}#c{{width:{W}px;height:{BAND}px;display:flex;flex-direction:column;align-items:center;"
            f"justify-content:center;text-align:center;font-family:I,sans-serif;padding:0 70px;box-sizing:border-box}}"
            f"h1{{margin:0;font-weight:800;font-size:68px;line-height:1.1;color:{look['ink']};letter-spacing:-.6px}}"
            f"p{{margin:18px 0 0;font-weight:500;font-size:34px;color:{look['sub']}}}</style><div id=c><h1></h1><p></p></div>")
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


def compose(spec, raw, out):
    look = LOOKS[spec['look']]; d = Path(tempfile.mkdtemp(prefix='clipasm_')); dur = spec['duration']
    make_assets(look, d); caps = render_captions(spec, look, d)
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


def check(video, rules_path=HERE / 'rules.json', per_second=2):
    """OCR every sampled frame and report banned words. Returns the list of hits (empty = clean)."""
    if not shutil.which('tesseract'): sys.exit('tesseract is not installed (needed for the content check)')
    banned = [(t, norm(t)) for t in json.loads(Path(rules_path).read_text())['banned'] if norm(t)]
    d = Path(tempfile.mkdtemp(prefix='clipocr_'))
    run(['ffmpeg', '-y', '-i', video, '-vf', f'fps={per_second}', '-q:v', '2', d / 'f_%04d.png'])
    hits = []
    for i, png in enumerate(sorted(d.glob('f_*.png'))):
        n = norm(run(['tesseract', png, '-', '--psm', '11']).stdout)
        for term, nt in banned:
            if nt in n: hits.append({'t': round(i / per_second, 1), 'term': term})
    shutil.rmtree(d, ignore_errors=True)
    return hits


def load(p): return json.loads(Path(p).read_text())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['build', 'record', 'compose', 'check'])
    ap.add_argument('specs', nargs='+', help='spec file(s); for check: video file(s)')
    ap.add_argument('--no-check', action='store_true')
    a = ap.parse_args(); OUT.mkdir(exist_ok=True); bad = False
    for s in a.specs:
        if a.cmd == 'check':
            hits = check(s); print(s, 'CLEAN' if not hits else f'FAILED {hits}'); bad |= bool(hits); continue
        spec = load(s); raw, fin = OUT / f"{spec['id']}.raw.mp4", OUT / f"{spec['id']}.mp4"
        if a.cmd in ('build', 'record'): record(spec, raw)
        if a.cmd in ('build', 'compose'): compose(spec, raw, fin)
        if a.cmd == 'build' and not a.no_check:
            hits = check(fin); (OUT / f"{spec['id']}.check.json").write_text(json.dumps({'clean': not hits, 'hits': hits}, indent=1))
            print(f"{spec['id']}: content check", 'CLEAN' if not hits else f'FAILED {hits}'); bad |= bool(hits)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
