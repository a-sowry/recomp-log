(() => {
'use strict';

/* ---------- static data ---------- */
const DEFAULT_TARGETS = { kcal: 2250, p: 150, c: 265, f: 65 };
const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drinks'];
const RECIPES = [
  { id: 'B1', slot: 'Breakfast', name: 'Protein pancake bowl', kcal: 566, p: 39, c: 69, f: 13 },
  { id: 'B2', slot: 'Breakfast', name: 'Overnight protein oats', kcal: 572, p: 48, c: 62, f: 12 },
  { id: 'B3', slot: 'Breakfast', name: 'Protein French toast', kcal: 561, p: 39, c: 79, f: 8 },
  { id: 'B4', slot: 'Breakfast', name: 'Cottage cheese omelette on sourdough', kcal: 604, p: 44, c: 66, f: 16 },
  { id: 'L1', slot: 'Lunch', name: 'Chicken burrito bowl', kcal: 662, p: 51, c: 73, f: 17 },
  { id: 'L2', slot: 'Lunch', name: 'Bang bang chicken bowl', kcal: 666, p: 47, c: 73, f: 19 },
  { id: 'L3', slot: 'Lunch', name: 'One-pot lemon chicken orzo', kcal: 642, p: 53, c: 74, f: 14 },
  { id: 'L4', slot: 'Lunch', name: 'Turkey pasta bake', kcal: 672, p: 52, c: 68, f: 18 },
  { id: 'D1', slot: 'Dinner', name: 'Beef and broccoli stir-fry', kcal: 679, p: 46, c: 82, f: 17 },
  { id: 'D2', slot: 'Dinner', name: 'Salmon rice bowl', kcal: 671, p: 41, c: 57, f: 30 },
  { id: 'D3', slot: 'Dinner', name: 'Turkey tacos', kcal: 695, p: 52, c: 62, f: 23 },
  { id: 'D4', slot: 'Dinner', name: 'Sweet potato and chicken thigh tray bake', kcal: 649, p: 50, c: 62, f: 20 },
  { id: 'S1', slot: 'Snack', name: 'Cottage cheese cookie dough', kcal: 369, p: 28, c: 45, f: 8 },
  { id: 'S2', slot: 'Snack', name: 'Protein berry ice cream', kcal: 376, p: 33, c: 41, f: 8 },
  { id: 'S3', slot: 'Snack', name: 'Greek yoghurt protein bark (1/3 tray)', kcal: 367, p: 36, c: 31, f: 11 },
  { id: 'S4', slot: 'Snack', name: 'Protein banana mug cake', kcal: 416, p: 43, c: 40, f: 8 },
];
const DAYS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower'];
const WEEKDAY_DAY = { 1: 'Push', 2: 'Pull', 3: 'Legs', 4: 'Upper', 5: 'Lower' };
const DEFAULT_PROGRAM = {
  Push: [
    ['Dumbbell bench press', 4, 5, 8], ['Incline Smith press (kg/side)', 3, 8, 10], ['Pec deck', 3, 12, 15],
    ['Cable lateral raise', 4, 12, 15], ['Overhead triceps extension', 3, 12, 15], ['Triceps pushdown', 3, 10, 12],
  ],
  Pull: [
    ['Pulldown machine', 4, 6, 10], ['Chest-supported row', 3, 6, 10], ['Pullover', 3, 8, 12],
    ['Single-arm cable rear delt fly', 3, 12, 15], ['EZ-bar curl', 3, 8, 12], ['Single-arm Bayesian curl', 3, 10, 12],
  ],
  Legs: [
    ['Back squat', 4, 5, 8], ['Leg press', 3, 10, 12], ['Bulgarian split squat', 2, 8, 10],
    ['Leg extension', 3, 12, 15], ['Seated calf raise', 4, 10, 15],
  ],
  Upper: [
    ['Incline DB press', 3, 6, 10], ['Neutral-grip pulldown machine', 3, 8, 12], ['Seated cable row', 3, 10, 12],
    ['Pec deck', 3, 12, 15], ['Dumbbell lateral raise', 4, 12, 20], ['Cable curl', 2, 12, 15], ['Straight-bar pushdown', 2, 12, 15],
  ],
  Lower: [
    ['Romanian deadlift', 4, 6, 10], ['Hip thrust', 3, 8, 12], ['Seated hamstring curl', 3, 10, 15],
    ['Walking lunges', 2, 20, 20], ['Seated calf raise', 4, 12, 20],
  ],
};
const STEP_EXERCISES = new Set(['Walking lunges']);
const CARDIO_TYPES = ['Walk', 'Run', 'Swim', 'Hike', 'Cycle', 'Abs', 'Other'];
const POSES = ['Front', 'Side', 'Back'];

/* ---------- state ---------- */
const S = {
  tab: 'today', date: todayISO(),
  days: {}, sessions: {}, weights: {}, photos: {}, config: null,
  loaded: { days: false, sessions: false, weights: false, photos: false },
  user: null, offlineAuth: false, syncError: null, lastPull: 0,
  drafts: {}, trainDay: null,
  foodAdd: 'plan', search: { q: '', status: 'idle', off: [], offQ: '', pick: null }, drink: null, progressEx: null, compare: { a: null, b: null, pose: 'Front' },
  confirmPhoto: null, confirmSession: false, uploading: false,
  timer: { end: 0, total: 0, handle: 0 },
};
let pendingRender = false;

/* ---------- utils ---------- */
function todayISO() { return toISO(new Date()); }
function toISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = fromISO(s); d.setDate(d.getDate() + n); return toISO(d); }
function fmtDay(s, opts) { return fromISO(s).toLocaleDateString('en-AU', opts || { weekday: 'short', day: 'numeric', month: 'short' }); }
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function r0(n) { return Math.round(n); }
function r1(n) { return Math.round(n * 10) / 10; }
function kgFmt(n) { return (Math.round(n * 100) / 100).toString(); }
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function toast(msg) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
const APP_VERSION = 49; // keep in step with VERSION in sw.js
const THEMES = [
  { id: 'auto', name: 'Chalk (follows phone)' },
  { id: 'white', name: 'White', bg: '#FFFFFF', surface: '#F6F6F4', sunk: '#ECECE9', line: '#DCDCD7' },
  { id: 'sand', name: 'Sand', bg: '#F3EBDD', surface: '#FFFBF3', sunk: '#E8DDC9', line: '#D9CBB2' },
  { id: 'mint', name: 'Mint', bg: '#E4EFE8', surface: '#FAFDFB', sunk: '#D5E5DA', line: '#C1D6C8' },
  { id: 'sky', name: 'Sky', bg: '#E3ECF6', surface: '#FAFCFF', sunk: '#D3E0EE', line: '#BFD0E3' },
  { id: 'pink', name: 'Pink', style: 'soft', bg: '#FCDDEA', surface: '#FFF4F8', sunk: '#F7C9DC', line: '#EFB2CB', ink: '#3D1830', muted: '#8A4A6E', btn: '#C2306F', 'btn-ink': '#FFFFFF', blue: '#7B4FD0' },
  { id: 'lilac', name: 'Lilac', style: 'soft', bg: '#ECE3F7', surface: '#FCF9FF', sunk: '#DED0F0', line: '#CCB8E6', ink: '#2B1D3D', muted: '#6E5A8A', btn: '#8A4FD0', 'btn-ink': '#FFFFFF', blue: '#4F78D8', red: '#D2386E' },
  { id: 'navy', name: 'Navy', dark: true, bg: '#0E1A2B', surface: '#162437', sunk: '#1F2F46', line: '#2A3D56' },
];
// removed themes map to the closest one that's left
const THEME_ALIAS = { blush: 'pink', night: 'navy', black: 'navy', chalk: 'auto' };
function findTheme(id) { id = THEME_ALIAS[id] || id || 'auto'; return THEMES.find(x => x.id === id); }
let appliedTheme = null;
function applyTheme(id) {
  const t = findTheme(id) || THEMES[0];
  if (appliedTheme === t.id) return;
  appliedTheme = t.id; lsSet('rl:theme', t.id);
  const root = document.documentElement;
  for (const k of ['bg', 'surface', 'sunk', 'line', 'ink', 'muted', 'btn', 'btn-ink', 'blue', 'red']) {
    if (t[k]) root.style.setProperty('--' + k, t[k]); else root.style.removeProperty('--' + k);
  }
  if (t.style) root.dataset.style = t.style; else delete root.dataset.style;
  if (t.id === 'auto') delete root.dataset.theme; else root.dataset.theme = t.dark ? 'dark' : 'light';
  // Home-screen icon + manifest follow the theme. Phones lock the icon in when the app is added,
  // so a new theme's icon shows after removing the app from the home screen and adding it again.
  const setLink = (sel, href) => { const l = document.querySelector(sel); if (l && l.getAttribute('href') !== href) l.setAttribute('href', href); };
  setLink('link[rel="apple-touch-icon"]', `icons/t/${t.id}-180.png`);
  setLink('link[rel="icon"]', `icons/t/${t.id}-192.png`);
  document.documentElement.style.setProperty('--logo', `url(icons/t/${t.id}-180.png)`);
  setLink('link[rel="manifest"]', `manifest-${t.id}.webmanifest`);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    if (t.bg) m.setAttribute('content', t.bg);
    else m.setAttribute('content', m.media && m.media.includes('dark') ? '#11151A' : '#F1F1EC');
  });
}
applyTheme(lsGet('rl:theme') || 'auto');

function targets() { return Object.assign({}, DEFAULT_TARGETS, S.config?.targets || {}); }
// Each account's training split. Accounts from before custom splits (no config.split) keep the original Push/Pull/Legs/Upper/Lower.
function starterSplit() { return DAYS.map(name => ({ name, wd: Object.entries(WEEKDAY_DAY).filter(([, v]) => v === name).map(([k]) => +k) })); }
function splitList() { return Array.isArray(S.config?.split) ? S.config.split : starterSplit(); }
function splitDays() { return splitList().map(d => d.name); }
function dayForWeekday(wd) { return splitList().find(d => (d.wd || []).includes(wd))?.name || null; }
function program() {
  const p = S.config?.program; const legacy = !Array.isArray(S.config?.split);
  const out = {};
  for (const d of splitDays()) out[d] = (p && p[d] ? p[d] : legacy && DEFAULT_PROGRAM[d] ? DEFAULT_PROGRAM[d].map(([name, sets, min, max]) => ({ name, sets, min, max })) : []);
  return out;
}
const COMMON_EXERCISES = ['Barbell bench press', 'Incline dumbbell press', 'Overhead press', 'Dumbbell shoulder press', 'Lateral raise', 'Cable fly', 'Tricep pushdown', 'Overhead tricep extension', 'Dips', 'Push-ups',
  'Pull-ups', 'Lat pulldown', 'Seated cable row', 'Barbell row', 'Dumbbell row', 'Face pull', 'Rear delt fly', 'Barbell curl', 'Dumbbell curl', 'Hammer curl',
  'Back squat', 'Front squat', 'Leg press', 'Romanian deadlift', 'Deadlift', 'Hip thrust', 'Bulgarian split squat', 'Walking lunge', 'Leg extension', 'Lying leg curl', 'Seated leg curl', 'Calf raise',
  'Plank', 'Hanging leg raise', 'Cable crunch', 'Glute bridge', 'Kettlebell swing', 'Farmer carry'];
function dayTotals(day) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const m of (day?.meals || [])) { const s = m.servings ?? 1; t.kcal += m.kcal * s; t.p += m.p * s; t.c += m.c * s; t.f += m.f * s; }
  return t;
}

/* ---------- storage: Supabase + local cache + offline outbox ---------- */
const CFG = window.RECOMP_CONFIG || {};
let sb = null;
function sbConf() {
  const url = CFG.SUPABASE_URL || lsGet('rl:sbUrl');
  const key = CFG.SUPABASE_ANON_KEY || lsGet('rl:sbKey');
  return url && key ? { url, key } : null;
}
const store = {
  outbox: [],
  flushing: false,
  key(k) { return 'rl:' + k + ':' + (S.user?.id || 'anon'); },
  loadLocal() {
    const c = lsGet(this.key('cache')) || {};
    for (const n of ['days', 'sessions', 'weights', 'photos']) { S[n] = c[n] || {}; if (c[n]) S.loaded[n] = true; }
    S.config = c.config || null;
    this.outbox = lsGet(this.key('outbox')) || [];
  },
  saveLocal() {
    lsSet(this.key('cache'), { days: S.days, sessions: S.sessions, weights: S.weights, photos: S.photos, config: S.config });
    lsSet(this.key('outbox'), this.outbox);
  },
  apply(coll, id, data) {
    if (coll === 'config') { S.config = data; return; }
    if (data == null) delete S[coll][id]; else S[coll][id] = data;
  },
  set(coll, id, data) { this.apply(coll, id, data); this.enqueue({ op: 'set', coll, id, data }); },
  del(coll, id) { this.apply(coll, id, null); this.enqueue({ op: 'del', coll, id }); },
  enqueue(item) {
    // one pending write per document: the latest wins
    this.outbox = this.outbox.filter(o => !(o.coll === item.coll && o.id === item.id));
    this.outbox.push(item);
    this.saveLocal(); updateSync(); this.flush();
  },
  async flush() {
    if (this.flushing || !sb || !S.user || !navigator.onLine || S.offlineAuth) return;
    this.flushing = true;
    try {
      while (this.outbox.length) {
        const o = this.outbox[0];
        let res;
        if (o.op === 'set') {
          res = await sb.from('docs').upsert({ user_id: S.user.id, collection: o.coll, id: o.id, data: o.data, updated_at: new Date().toISOString() });
        } else {
          res = await sb.from('docs').delete().match({ user_id: S.user.id, collection: o.coll, id: o.id });
        }
        if (res.error) throw res.error;
        const i = this.outbox.indexOf(o);
        if (i !== -1) this.outbox.splice(i, 1);
        this.saveLocal();
      }
      S.syncError = null;
    } catch (e) {
      console.error('sync', e); S.syncError = e?.message || 'Sync failed';
    } finally { this.flushing = false; updateSync(); }
  },
  async pull() {
    if (!sb || !S.user || !navigator.onLine || S.offlineAuth) return;
    const rows = []; const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await sb.from('docs').select('collection,id,data').order('collection').order('id').range(from, from + page - 1);
      if (error) { console.error(error); S.syncError = error.message; updateSync(); return; }
      rows.push(...data);
      if (data.length < page) break;
    }
    const next = { days: {}, sessions: {}, weights: {}, photos: {} }; let config = null;
    for (const r of rows) {
      if (r.collection === 'config') { if (r.id === 'settings') config = r.data; }
      else if (next[r.collection]) next[r.collection][r.id] = r.data;
    }
    for (const n of Object.keys(next)) { S[n] = next[n]; S.loaded[n] = true; }
    S.config = config;
    for (const o of this.outbox) this.apply(o.coll, o.id, o.op === 'set' ? o.data : null); // unsynced local edits win
    S.syncError = null; S.lastPull = Date.now();
    this.saveLocal(); refreshPhotoUrls(); scheduleRender(); updateSync();
  },
  async bulkSet(coll, entries) {
    for (const e of entries) this.apply(coll, e.id, e.data);
    if (sb && S.user && navigator.onLine && !S.offlineAuth) {
      for (let i = 0; i < entries.length; i += 200) {
        const chunk = entries.slice(i, i + 200).map(e => ({ user_id: S.user.id, collection: coll, id: e.id, data: e.data, updated_at: new Date().toISOString() }));
        const { error } = await sb.from('docs').upsert(chunk);
        if (error) throw error;
      }
    } else {
      for (const e of entries) {
        this.outbox = this.outbox.filter(o => !(o.coll === coll && o.id === e.id));
        this.outbox.push({ op: 'set', coll, id: e.id, data: e.data });
      }
    }
    this.saveLocal(); updateSync();
  },
};
function updateSync() {
  const el = document.getElementById('syncDot'); if (!el) return;
  const pending = store.outbox.length;
  let state = 'ok', text = 'All changes saved';
  if (S.syncError) { state = 'err'; text = `Not synced: ${S.syncError}. Your changes are kept on this phone and retry automatically.`; }
  else if (!navigator.onLine || S.offlineAuth) { state = 'wait'; text = pending ? `Offline. ${pending} change${pending > 1 ? 's' : ''} waiting to sync.` : 'Offline. Showing your last synced data.'; }
  else if (pending) { state = 'wait'; text = `Syncing ${pending} change${pending > 1 ? 's' : ''}…`; }
  el.dataset.state = state; el.title = text; el.setAttribute('aria-label', text);
}

/* photos: private bucket, shown through signed URLs */
S.photoUrls = {};
async function refreshPhotoUrls() {
  if (!sb || !S.user || !navigator.onLine || S.offlineAuth) return;
  const need = Object.values(S.photos).map(p => p.path).filter(p => p && !S.photoUrls[p]);
  if (!need.length) return;
  const { data, error } = await sb.storage.from('photos').createSignedUrls(need, 60 * 60 * 24 * 7);
  if (error) { console.error(error); return; }
  for (const d of data || []) if (d.signedUrl && d.path) S.photoUrls[d.path] = d.signedUrl;
  scheduleRender();
}
function photoSrc(p) { return p && p.path ? (S.photoUrls[p.path] || '') : ''; }
function canUpload() { return !!(sb && S.user && navigator.onLine && !S.offlineAuth); }

/* ---------- sign-in gate ---------- */
const gate = document.getElementById('gate');
function showGate(html) { gate.innerHTML = html; gate.hidden = false; document.body.classList.add('gated'); }
function hideGate() { gate.hidden = true; gate.innerHTML = ''; document.body.classList.remove('gated'); }
function showSetup(msg) {
  showGate(`<form class="gatebox" id="setupForm">
    <div class="brand big"><span class="plate" aria-hidden="true"></span>Refyne</div>
    <p>Connect your Supabase project. You only do this once on each device.</p>
    ${msg ? `<p class="gate-err">${esc(msg)}</p>` : ''}
    <label class="f">Project URL<input type="text" id="su_url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://abcd1234.supabase.co" required></label>
    <label class="f">Anon public key<input type="text" id="su_key" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="eyJhbGciOi…" required></label>
    <button class="btn" type="submit">Connect</button>
    <p class="small muted">Find both in Supabase under Project Settings → API.</p>
  </form>`);
}
function showLogin(msg, email, mode = 'in', note = '') {
  const last = lsGet('rl:lastUser'); const em = esc(email || last?.email || '');
  const emailField = `<label class="f">Email<input type="email" id="li_email" autocomplete="username" autocapitalize="off" value="${em}" required></label>`;
  const err = msg ? `<p class="gate-err">${esc(msg)}</p>` : ''; const ok = note ? `<p class="gate-ok">${esc(note)}</p>` : '';
  let body;
  if (mode === 'up') body = `<p>Create your free account. It keeps your logs safe and synced across your devices.</p>${err}${ok}${emailField}
    <label class="f">Password<input type="password" id="li_pw" autocomplete="new-password" minlength="8" required></label>
    <label class="f">Password again<input type="password" id="li_pw2" autocomplete="new-password" minlength="8" required></label>
    <div class="small muted">At least 8 characters.</div>
    <label class="tick"><input type="checkbox" id="li_age" required> I'm 16 or older</label>
    <label class="tick"><input type="checkbox" id="li_ok" required> I understand Refyne isn't medical advice, and I agree to it storing my logs and progress photos as described below</label>
    <details class="privacy"><summary>Privacy and disclaimer</summary>${PRIVACY_HTML}</details>
    <button class="btn" type="submit" id="li_btn">Create account</button>
    <div class="small">Already have an account? <button class="linkbtn" type="button" data-act="authMode" data-v="in">Sign in</button></div>`;
  else if (mode === 'reset') body = `<p>Enter your email and we'll send you a link to set a new password.</p>${err}${ok}${emailField}
    <button class="btn" type="submit" id="li_btn">Send reset link</button>
    <div class="small"><button class="linkbtn" type="button" data-act="authMode" data-v="in">Back to sign in</button></div>`;
  else body = `<p>Sign in or create your account.</p>${err}${ok}${emailField}
    <label class="f">Password<input type="password" id="li_pw" autocomplete="current-password" required></label>
    <button class="btn" type="submit" id="li_btn">Sign in</button>
    <div class="small" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span>New here? <button class="linkbtn" type="button" data-act="authMode" data-v="up">Create an account</button></span><button class="linkbtn muted" type="button" data-act="authMode" data-v="reset">Forgot password?</button></div>`;
  showGate(`<form class="gatebox" id="loginForm" data-mode="${mode}">
    <div class="brand big"><span class="plate" aria-hidden="true"></span>Refyne</div>
    ${body}
  </form>`);
}
function showNewPassword(msg) {
  showGate(`<form class="gatebox" id="newPwForm">
    <div class="brand big"><span class="plate" aria-hidden="true"></span>Refyne</div>
    <p>Choose a new password.</p>${msg ? `<p class="gate-err">${esc(msg)}</p>` : ''}
    <label class="f">New password<input type="password" id="np1" autocomplete="new-password" minlength="8" required></label>
    <label class="f">Password again<input type="password" id="np2" autocomplete="new-password" minlength="8" required></label>
    <button class="btn" type="submit" id="np_btn">Save password</button>
  </form>`);
}
const authRedirect = () => location.origin + location.pathname;
const PRIVACY_HTML = `<p><b>Not medical advice.</b> Refyne is a general fitness and nutrition tracker. Calorie, macro and nutrient numbers are estimates. If you have a medical condition, are pregnant, or have a history of disordered eating, talk to a doctor or dietitian before changing how you eat or train.</p>
  <p><b>What's stored.</b> Your email, the food, drinks, water, steps, training, weights, measurements and progress photos you log, and your settings. It's stored with Supabase in Sydney, Australia, and other users can't see it. Progress photos are kept in private storage.</p>
  <p><b>What isn't.</b> No ads and no selling your data. Barcode and packaged-food searches send only the barcode or search words to Open Food Facts.</p>
  <p><b>Your control.</b> You can download a copy of your data or delete your account and everything in it at any time from Settings.</p>`;

async function boot() {
  updateOnline();
  const conf = sbConf();
  if (!conf) { showSetup(); return; }
  if (!window.supabase?.createClient) { showSetup('The app files did not load completely. Close and reopen the app.'); return; }
  // Links from sign-up and password-reset emails land here with the session in the URL.
  const recovering = /type=recovery/.test(location.hash);
  sb = window.supabase.createClient(conf.url, conf.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'rl-auth', detectSessionInUrl: true } });
  let session = null;
  try { ({ data: { session } } = await sb.auth.getSession()); } catch (e) { console.error(e); }
  if (/access_token|error_description/.test(location.hash)) { const bad = /error_description=([^&]+)/.exec(location.hash); history.replaceState(null, '', location.pathname + location.search); if (bad && !session) { showLogin(decodeURIComponent(bad[1].replace(/\+/g, ' ')) + ' Request a new link.'); return; } }
  if (session && recovering) { showNewPassword(); }
  else if (session) { startApp(session.user); }
  else if (!navigator.onLine && lsGet('rl:lastUser')) { S.offlineAuth = true; startApp(lsGet('rl:lastUser')); }
  else { showLogin(); }
  sb.auth.onAuthStateChange((ev, sess) => {
    if (ev === 'SIGNED_OUT') { S.user = null; showLogin(); }
    else if (ev === 'PASSWORD_RECOVERY') { showNewPassword(); }
    else if ((ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED') && sess && S.offlineAuth) { S.offlineAuth = false; store.flush().then(() => store.pull()); }
  });
}
function startApp(user) {
  S.user = { id: user.id, email: user.email };
  lsSet('rl:lastUser', S.user);
  hideGate(); store.loadLocal(); render(); updateSync();
  store.flush().then(() => store.pull()).then(() => { if (needsOnboarding() && !S.ob) openOnboarding(); });
}
function updateOnline() { document.body.classList.toggle('is-offline', !navigator.onLine); updateSync(); }
window.addEventListener('online', async () => {
  updateOnline();
  if (S.offlineAuth && sb) { const { data } = await sb.auth.getSession(); if (data.session) S.offlineAuth = false; else { showLogin('Your session expired. Sign in again to sync.'); return; } }
  store.flush().then(() => store.pull());
});
window.addEventListener('offline', updateOnline);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.user && Date.now() - (S.lastPull || 0) > 30000) store.flush().then(() => store.pull());
});
gate.addEventListener('submit', async e => {
  e.preventDefault();
  if (e.target.id === 'setupForm') {
    let url = document.getElementById('su_url').value.trim().replace(/\/+$/, '');
    const key = document.getElementById('su_key').value.trim();
    if (!/^https:\/\/.+/.test(url)) { showSetup('The Project URL should start with https://'); return; }
    lsSet('rl:sbUrl', url); lsSet('rl:sbKey', key); location.reload();
  } else if (e.target.id === 'newPwForm') {
    const a = document.getElementById('np1').value, b2 = document.getElementById('np2').value;
    if (a.length < 8) { showNewPassword('Use at least 8 characters.'); return; }
    if (a !== b2) { showNewPassword('Those passwords don\'t match.'); return; }
    const btn = document.getElementById('np_btn'); btn.disabled = true; btn.textContent = 'Saving…';
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) { showNewPassword(error.message); return; }
    const { data } = await sb.auth.getSession(); toast('Password updated'); if (data.session) startApp(data.session.user); else showLogin('', '', 'in', 'Password updated. Sign in with your new password.');
  } else if (e.target.id === 'loginForm' && e.target.dataset.mode === 'up') {
    const email = document.getElementById('li_email').value.trim(), pw = document.getElementById('li_pw').value;
    if (pw !== document.getElementById('li_pw2').value) { showLogin('Those passwords don\'t match.', email, 'up'); return; }
    const btn = document.getElementById('li_btn'); btn.disabled = true; btn.textContent = 'Creating account…';
    let data, error;
    if (!document.getElementById('li_age').checked || !document.getElementById('li_ok').checked) { showLogin('Tick both boxes to create your account.', email, 'up'); return; }
    try { ({ data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: authRedirect(), data: { age_16_plus: true, consent: 'v1', consent_at: new Date().toISOString() } } })); }
    catch (err) { error = { message: navigator.onLine ? 'Could not reach the server. Try again.' : 'You\'re offline. Connect to create an account.' }; }
    if (error) { showLogin(/already registered/i.test(error.message) ? 'That email already has an account. Sign in instead.' : error.message, email, /already registered/i.test(error.message) ? 'in' : 'up'); return; }
    if (data?.session) { S.offlineAuth = false; startApp(data.user); return; }
    showLogin('', email, 'in', `Almost there. We've emailed a link to ${email}. Tap it to confirm your account, then sign in here.`);
  } else if (e.target.id === 'loginForm' && e.target.dataset.mode === 'reset') {
    const email = document.getElementById('li_email').value.trim();
    const btn = document.getElementById('li_btn'); btn.disabled = true; btn.textContent = 'Sending…';
    let error; try { ({ error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: authRedirect() })); } catch (err) { error = { message: 'Could not reach the server. Try again.' }; }
    if (error) { showLogin(error.message, email, 'reset'); return; }
    showLogin('', email, 'in', `If ${email} has an account, a reset link is on its way. Open it on this phone.`);
  } else if (e.target.id === 'loginForm') {
    const btn = document.getElementById('li_btn'); btn.disabled = true; btn.textContent = 'Signing in…';
    const email = document.getElementById('li_email').value.trim();
    let data, error;
    try { ({ data, error } = await sb.auth.signInWithPassword({ email, password: document.getElementById('li_pw').value })); }
    catch (err) { error = { message: navigator.onLine ? 'Could not reach the server. Try again.' : 'You\'re offline. Connect to sign in.' }; }
    if (error) { showLogin(error.message === 'Invalid login credentials' ? 'That email and password don\'t match. Check them and try again.' : /not confirmed/i.test(error.message) ? 'Confirm your email first: tap the link we sent you, then sign in.' : error.message, email); setTimeout(() => document.getElementById('li_pw')?.focus(), 0); return; }
    S.offlineAuth = false; startApp(data.user);
  }
});
gate.addEventListener('click', e => {
  if (e.target.closest('[data-act="resetConn"]')) { lsSet('rl:sbUrl', null); lsSet('rl:sbKey', null); location.reload(); }
  const am = e.target.closest('[data-act="authMode"]'); if (am) { showLogin('', document.getElementById('li_email')?.value.trim(), am.dataset.v); }
});

/* ---------- backup + import ---------- */
async function importHistory() {
  const res = await fetch('seed/history.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load the spreadsheet history file.');
  const list = await res.json();
  await store.bulkSet('sessions', list.map(x => ({ id: x.id, data: x.data })));
  return list.length;
}
async function restoreBackup(file) {
  const j = JSON.parse(await file.text());
  const c = j.collections || j;
  let n = 0;
  for (const coll of ['days', 'sessions', 'weights']) {
    const m = c[coll]; if (!m || typeof m !== 'object') continue;
    const entries = Object.entries(m).map(([id, data]) => ({ id, data }));
    if (entries.length) { await store.bulkSet(coll, entries); n += entries.length; }
  }
  const cfg = c.config?.settings || (c.config && !c.config.settings ? c.config : null);
  if (cfg) { store.set('config', 'settings', cfg); n++; }
  return n;
}
async function exportBackup() {
  const payload = { app: 'recomp-log', version: 1, exportedAt: new Date().toISOString(), collections: { days: S.days, sessions: S.sessions, weights: S.weights, photos: S.photos, config: S.config ? { settings: S.config } : {} } };
  const name = `refyne-backup-${todayISO()}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function localDay(date) { return S.days[date] ? JSON.parse(JSON.stringify(S.days[date])) : { date, meals: [], cardio: [], steps: null }; }
function saveDay(date, day) { store.set('days', date, day); render(); }
function saveConfig(cfg) { store.set('config', 'settings', cfg); render(); }

function scheduleRender() {
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') && a.closest('#view, #sheetRoot')) { pendingRender = true; return; }
  render();
}
document.addEventListener('focusout', () => setTimeout(() => {
  if (!pendingRender) return;
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return;
  pendingRender = false; render();
}, 50));

/* ---------- render shell ---------- */
const view = document.getElementById('view');
function render() {
  document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === S.tab ? 'page' : 'false'));
  const dated = S.tab === 'today' || S.tab === 'train';
  document.getElementById('datenav').hidden = !dated;
  document.getElementById('dateLabel').textContent = S.date === todayISO() ? 'Today' : fmtDay(S.date);
  if (S.config?.theme && THEME_ALIAS[S.config.theme]) { const cfg = cfgCopy(); cfg.theme = THEME_ALIAS[cfg.theme]; S.config = cfg; store.set('config', 'settings', cfg); }
  applyTheme(S.config?.theme || lsGet('rl:theme') || 'auto');
  const banner = S.syncError ? `<div class="banner">Some changes haven't synced to your account yet (${esc(S.syncError)}). They're kept on this phone and retry automatically.</div>` : '';
  const gOn = gardenOn();
  const gBtn = document.querySelector('nav.tabs button[data-tab="garden"]'); if (gBtn) gBtn.hidden = !gOn;
  if (gBtn && gBtn.dataset.kind !== growKind()) { gBtn.dataset.kind = growKind(); gBtn.innerHTML = `<svg viewBox="0 0 24 24">${gm().icon}</svg>${gm().tab}`; }
  if (S.tab === 'garden' && !gOn) S.tab = 'today';
  if (S.tab === 'body' || S.tab === 'photos') { S.progView = S.tab; S.tab = 'progress'; }
  if (S.tab !== 'today') { S.addOpen = false; S.panel = null; }
  document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === S.tab ? 'page' : 'false'));
  const html = { today: viewToday, train: viewTrain, progress: viewProgressAll, garden: viewGarden }[S.tab]();
  const ovlScroll = view.querySelector('.sheet.ovl .panel')?.scrollTop || 0;
  view.innerHTML = banner + html;
  const ovl = view.querySelector('.sheet.ovl .panel');
  document.body.classList.toggle('ovl-open', !!ovl);
  if (ovl) {
    if (S.addFocus) { const el = ovl.querySelector(`[data-slot="${S.addFocus}"]`); S.addFocus = null; if (el) ovl.scrollTop = el.offsetTop - 12; }
    else ovl.scrollTop = ovlScroll;
  }
  if (S.tab === 'train') tickTimer();
  updateSync();
  syncBlooms();
  const names = new Set(); for (const s of Object.values(S.sessions)) for (const e of s.exercises || []) names.add(e.name);
  for (const d of Object.values(program())) for (const e of d) names.add(e.name);
  for (const n of COMMON_EXERCISES) names.add(n);
  document.getElementById('exnames').innerHTML = [...names].sort().map(n => `<option value="${esc(n)}">`).join('');
}

/* ---------- FOOD ---------- */
function macroRow(label, val, target, color, unit) {
  const pct = target ? Math.min(100, (val / target) * 100) : 0;
  const over = val > target * 1.05;
  return `<div class="macro" style="--c: var(${color})">
    <span class="k">${label}</span>
    <div class="bar${over ? ' over' : ''}" role="img" aria-label="${label} ${r0(val)} of ${target}${unit}"><i style="width:${pct}%"></i></div>
    <span class="v"><b>${r0(val)}</b> / ${target}${unit}</span>
  </div>`;
}
function weekStrip() {
  const T = targets(); const start = addDays(S.date, -6); let out = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i); const day = S.days[d]; const t = dayTotals(day);
    let cls = '';
    if (day && day.meals?.length) {
      const kOk = Math.abs(t.kcal - T.kcal) <= 150; const pOk = t.p >= T.p - 10;
      cls = t.kcal > T.kcal + 150 ? 'over' : (kOk && pOk ? 'hit' : 'part');
    }
    out += `<button data-act="goto" data-date="${d}" class="${d === S.date ? 'on' : ''}" aria-label="${fmtDay(d)}">
      <span class="d">${fromISO(d).toLocaleDateString('en-AU', { weekday: 'narrow' })}</span><span class="dot ${cls}"></span><span class="muted">${day?.meals?.length ? r0(t.kcal) : '–'}</span></button>`;
  }
  return out;
}
/* ---------- flower garden: grows with logging, most with workouts ---------- */
const GARDEN = { PER_BLOOM: 40, WORKOUT: 5, FOOD_DAY: 1, PROTEIN_DAY: 1, WEIGH_IN: 1, CARDIO: 2, WILT_DAYS: 4 };
function gardenOn() {
  const g = S.config?.garden;
  if (g === true || g === false) return g;
  return true;
}
function gardenStats() {
  const T = targets(); const today = todayISO();
  let pts = 0, todayPts = 0, lastWorkout = null;
  const add = (n, date) => { pts += n; if (date === today) todayPts += n; };
  for (const s of Object.values(S.sessions)) {
    if (s.source === 'spreadsheet' || !s.exercises?.length) continue;
    add(GARDEN.WORKOUT, s.date);
    if (!lastWorkout || s.date > lastWorkout) lastWorkout = s.date;
  }
  for (const d of Object.values(S.days)) {
    if (d.meals?.length) {
      add(GARDEN.FOOD_DAY, d.date);
      if (dayTotals(d).p >= T.p - 10) add(GARDEN.PROTEIN_DAY, d.date);
    }
    if (d.cardio?.length) add(GARDEN.CARDIO * Math.min(d.cardio.length, 2), d.date);
  }
  for (const w of Object.values(S.weights)) if (w.kg) add(GARDEN.WEIGH_IN, w.date);
  const bloomed = Math.floor(pts / GARDEN.PER_BLOOM);
  const inBloom = pts % GARDEN.PER_BLOOM;
  const daysSince = lastWorkout ? Math.round((fromISO(today) - fromISO(lastWorkout)) / 864e5) : null;
  return { pts, todayPts, bloomed, inBloom, toNext: GARDEN.PER_BLOOM - inBloom, stage: Math.min(5, Math.floor((inBloom / GARDEN.PER_BLOOM) * 6)), daysSince, wilting: daysSince != null && daysSince >= GARDEN.WILT_DAYS };
}
/* Flower types. Heads are drawn around (0,0) = top of the stem, growing upwards (negative y). */
const FLOWERS = {
  tulip: {
    name: 'Pink tulip',
    bud: () => `<path fill="#F07AA6" d="M-6 0 C -8 -10 -4 -18 0 -22 C 4 -18 8 -10 6 0 C 3 3 -3 3 -6 0Z"/><path fill="#D94E84" d="M0 -22 C 2 -14 2 -6 0 1 C 3 1 5 0 6 0 C 8 -10 4 -18 0 -22Z"/>`,
    bloom: () => `<path fill="#E2588F" d="M-11 -6 C -13 -16 -10 -26 -5 -31 C -2 -24 2 -24 5 -31 C 10 -26 13 -16 11 -6Z"/>
      <path fill="#F07AA6" d="M-12 -8 C -14 -20 -10 -27 -7 -29 C -3 -22 -2 -12 -1 1 C -7 2 -11 -2 -12 -8Z"/>
      <path fill="#F7A3C2" d="M12 -8 C 14 -20 10 -27 7 -29 C 3 -22 2 -12 1 1 C 7 2 11 -2 12 -8Z"/>
      <path fill="#F48FB5" d="M-6 -2 C -8 -12 -5 -24 0 -30 C 5 -24 8 -12 6 -2 C 3 2 -3 2 -6 -2Z"/>
      <path d="M0 -26 C -2 -18 -2 -8 0 0" fill="none" stroke="#E2588F" stroke-width=".9" opacity=".6"/>`,
    mini: () => `<g transform="translate(0 8.5) scale(.55)">${FLOWERS.tulip.bloom()}</g>`,
  },
  daisy: {
    name: 'Daisy',
    bud: () => `<circle cy="-6" r="6.5" fill="#8DBF6B"/><path d="M-4 -11 l4 -4 l4 4" fill="#FFFFFF" stroke="#E9E4DA" stroke-width=".8"/>`,
    bloom: () => Array.from({ length: 16 }, (_, i) => `<ellipse cx="0" cy="-22" rx="3.4" ry="9" transform="rotate(${i * 22.5} 0 -13)" fill="#FFFFFF" stroke="#E2DBCF" stroke-width=".7"/>`).join('') + `<circle cy="-13" r="5.5" fill="#F6C445" stroke="#E0A92A" stroke-width="1"/>`,
    mini: () => Array.from({ length: 10 }, (_, i) => `<ellipse cx="0" cy="-5.5" rx="2" ry="5" transform="rotate(${i * 36})" fill="#FFFFFF" stroke="#DDD6CA" stroke-width=".5"/>`).join('') + `<circle r="3" fill="#F6C445"/>`,
  },
  rose: {
    name: 'Rose', scale: 1.3,
    bud: () => `<ellipse cy="-8" rx="6.5" ry="9" fill="#D7354A"/><path d="M-7 -1 q 3 -8 7 -4 q 4 -4 7 4 q -7 4 -14 0z" fill="#4E9A6B"/>`,
    bloom: () => `<path d="M-13 -4 q 13 10 26 0 q -3 6 -13 7 q -10 -1 -13 -7z" fill="#4E9A6B"/>
      <circle cy="-13" r="13" fill="#D7354A"/><circle cy="-14" r="9.5" fill="#E2495E"/>
      <path d="M-6 -14 a6 6 0 1 1 6 6 a4 4 0 1 1 -4 -4 a2 2 0 1 1 2 2" fill="none" stroke="#A9233A" stroke-width="1.8" stroke-linecap="round" transform="translate(0 -1)"/>
      <path d="M-12 -9 q 4 7 12 7" fill="none" stroke="#A9233A" stroke-width="1.4"/><path d="M12 -9 q -4 7 -12 7" fill="none" stroke="#A9233A" stroke-width="1.4"/>`,
    mini: () => `<circle r="7.5" fill="#D7354A"/><circle r="5.2" fill="#E2495E"/><path d="M-3 0 a3 3 0 1 1 3 3 a2 2 0 1 1 -2 -2" fill="none" stroke="#A9233A" stroke-width="1.1"/>`,
  },
  sunflower: {
    name: 'Sunflower',
    bud: () => `<circle cy="-7" r="7.5" fill="#6FA35A"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M0 -14 l2 -4 l2 4z" fill="#F2B90F" transform="rotate(${-50 + i * 20} 0 -7)"/>`).join(''),
    bloom: () => Array.from({ length: 18 }, (_, i) => `<ellipse cx="0" cy="-25" rx="3.6" ry="8.5" transform="rotate(${i * 20} 0 -15)" fill="${i % 2 ? '#F7C531' : '#F2B10C'}"/>`).join('')
      + `<circle cy="-15" r="8.5" fill="#6B4226"/>` + Array.from({ length: 9 }, (_, i) => `<circle cx="${Math.cos(i * 0.7) * (i % 3 + 2.5)}" cy="${-15 + Math.sin(i * 0.7) * (i % 3 + 2.5)}" r="1" fill="#3E2614"/>`).join(''),
    mini: () => Array.from({ length: 12 }, (_, i) => `<ellipse cx="0" cy="-6.3" rx="2.2" ry="5" transform="rotate(${i * 30})" fill="#F2B90F"/>`).join('') + `<circle r="4" fill="#6B4226"/>`,
  },
  lavender: {
    name: 'Lavender', scale: 1.15,
    bud: () => Array.from({ length: 5 }, (_, i) => `<ellipse cx="${i % 2 ? 2.2 : -2.2}" cy="${-3 - i * 4}" rx="2.6" ry="3.4" fill="${i > 2 ? '#B9A3D9' : '#9C82C9'}"/>`).join(''),
    bloom: () => `<path d="M0 0 L0 -36" style="stroke:var(--green)" stroke-width="2.5"/>` + Array.from({ length: 11 }, (_, i) => `<ellipse cx="${i % 2 ? 3.2 : -3.2}" cy="${-3 - i * 3.4}" rx="${3.8 - i * 0.15}" ry="${4.4 - i * 0.15}" fill="${['#8A63C7', '#9B76D3', '#7C55BA'][i % 3]}"/>`).join('') + `<ellipse cy="-40" rx="2.2" ry="3" fill="#A88BDB"/>`,
    mini: () => `<g transform="translate(0 8)">` + Array.from({ length: 6 }, (_, i) => `<ellipse cx="${i % 2 ? 2 : -2}" cy="${-2 - i * 2.6}" rx="2.4" ry="2.8" fill="${['#8A63C7', '#9B76D3', '#7C55BA'][i % 3]}"/>`).join('') + `</g>`,
  },
};
const DEFAULT_FLOWER = 'tulip';
function flowerType() { const t = S.config?.flower; return FLOWERS[t] ? t : DEFAULT_FLOWER; }
function flowerSVG(stage, wilting, opts = {}) {
  // stage 0 seed, 1 sprout, 2 leaves, 3 tall, 4 bud, 5 bloom
  const F = FLOWERS[opts.type] || FLOWERS[DEFAULT_FLOWER];
  const H = [4, 20, 36, 54, 70, 78][stage];
  const top = 112 - H;
  const lean = wilting ? 1 : 0;
  const tipX = 60 + lean * 16, tipY = top + lean * 10;
  const stem = stage === 0 ? '' : `<path class="fl-stem" d="M60 112 Q ${60 - 6 + lean * 4} ${112 - H * 0.55} ${tipX} ${tipY}" />`;
  const leaf = (y, dir, s = 1) => `<path class="fl-leaf" d="M60 ${y} q ${dir * 14 * s} ${-10 * s} ${dir * 24 * s} ${-2 * s} q ${-dir * 10 * s} ${10 * s} ${-dir * 24 * s} ${2 * s} z" />`;
  let leaves = '';
  if (stage >= 1) leaves += leaf(108 - Math.min(H, 20) * 0.6, 1, stage === 1 ? 0.6 : 1);
  if (stage >= 2) leaves += leaf(100 - H * 0.25, -1);
  if (stage >= 3) leaves += leaf(96 - H * 0.45, 1, 0.85);
  let head = '';
  if (stage === 4) head = `<g class="fl-head" transform="translate(${tipX} ${tipY + 1}) rotate(${lean * 35}) scale(1.2)">${F.bud()}</g>`;
  else if (stage === 5) head = `<g class="fl-head" transform="translate(${tipX} ${tipY + 2}) rotate(${lean * 40}) scale(${F.scale || 1.45})">${F.bloom()}</g>`;
  const seed = stage === 0 ? `<path class="fl-soil" d="M44 107 q 16 -9 32 0 z"/><ellipse class="fl-seed" cx="60" cy="101.5" rx="4.5" ry="3.2" transform="rotate(-20 60 101.5)"/>` : '';
  const pot = `<path class="fl-pot" d="M34 112 h52 l-6 30 h-40 z"/><rect class="fl-rim" x="30" y="106" width="60" height="9" rx="4"/>`;
  return `<svg class="flower${wilting ? ' wilt' : ''}" viewBox="0 -16 120 166" role="img" aria-label="${opts.label || 'Your flower'}"><g class="fl-sway">${stem}${leaves}${head}</g>${seed}${pot}</svg>`;
}
function miniBloomSVG(type) {
  const F = FLOWERS[type] || FLOWERS[DEFAULT_FLOWER];
  return `<svg class="mini-bloom" viewBox="-12 -12 24 24" aria-hidden="true">${F.mini()}</svg>`;
}
/* ---------- what you grow: flowers on the soft themes, a bonsai or a car build on the others ---------- */
const PASTEL_COLOURS = ['#F4A6C6', '#C9B6F2', '#A8E0D2', '#A9D3F5', '#FFE7A8', '#FFC4A3', '#F5EFE6', '#E86CA2'];
const CAR_COLOURS = ['#D2342B', '#2F6FD6', '#EDEDE8', '#1F2226', '#F2B705', '#2E8B57', '#7B3FC4', '#E5732A'];
const GROWS = {
  flower: {
    label: 'Flower', tab: 'Garden', section: 'Your garden', next: 'to the next bloom', grownLabel: 'Flowers grown', growing: 'Growing',
    names: ['A seed, waiting', 'A little sprout', 'Two new leaves', 'Growing tall', 'A bud is forming', 'Almost in full bloom'],
    wilt: d => `Your flower's drooping. It's been ${d} days since your last workout. One session today perks it right up.`,
    grew: 'Your flower grew', done: () => `Your ${FLOWERS[flowerType()].name.toLowerCase()} bloomed!`, doneText: 'It\'s been planted in your garden. A new seed is already in the pot.',
    how: 'it blooms and gets planted in your garden', wiltHow: 'it droops', footer: 'Each flower is planted on the day it bloomed. Change your flower in Settings and new blooms grow as that flower.',
    icon: '<path d="M12 21v-8"/><path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zM12 13c3 0 5-2 5-5-3 0-5 2-5 5z"/><path d="M5 21h14"/><circle cx="12" cy="6" r="2.5"/>',
  },
  bonsai: {
    label: 'Bonsai', tab: 'Forest', section: 'Your forest', next: 'to the next tree', grownLabel: 'Trees grown', growing: 'Growing',
    names: ['A seed, waiting', 'A little sprout', 'A young sapling', 'The trunk is thickening', 'Branches filling out', 'Almost fully grown'],
    wilt: d => `Your bonsai's leaves are browning. It's been ${d} days since your last workout. One session today brings it back.`,
    grew: 'Your bonsai grew', done: v => `Your ${BONSAI[bonsaiSp(v)].name.toLowerCase()} bonsai is fully grown!`, doneText: 'It\'s been planted in your forest. A new seed is already in the pot.',
    how: 'it becomes a full-grown tree and gets planted in your forest', wiltHow: 'its leaves turn brown', footer: 'Each tree is planted on the day it finished growing. Change what you grow in Settings.',
    icon: '<path d="M12 21v-7"/><path d="M12 15l-3-2M12 13l3-2"/><path d="M7 21h10"/><path d="M5 9.5a3 3 0 0 1 3-3 4 4 0 0 1 8 0 3 3 0 0 1 0 6H8a3 3 0 0 1-3-3z"/>',
  },
  car: {
    label: 'Car build', tab: 'Garage', section: 'Your garage', next: 'to the next finished car', grownLabel: 'Cars built', growing: 'In the workshop',
    names: ['A bare chassis', 'Wheels are on', 'Body shell fitted', 'Doors and glass in', 'Fresh paint', 'Almost ready to drive'],
    wilt: d => `Your build's gathering dust. It's been ${d} days since your last workout. One session today gets it moving again.`,
    grew: 'Your car build moved forward', done: v => `Your ${CAR_STYLES[carStyle(v)].name} is finished!`, doneText: 'It\'s parked in your garage. A new chassis just rolled in.',
    how: 'the car is finished and parked in your garage', wiltHow: 'it gathers dust', footer: 'Each car is parked on the day it was finished. Change what you build in Settings.',
    icon: '<path d="M3 16.5v-3.5l2.2-5h13.6l2.2 5v3.5z"/><path d="M3 13h18"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
  },
};
function isSoftId(id) { const t = findTheme(id); return !!(t && t.style === 'soft'); }
function growKind(themeId, pref) {
  themeId = themeId ?? (S.config?.theme || lsGet('rl:theme') || 'auto');
  const soft = isSoftId(themeId); pref = pref ?? (soft ? S.config?.growSoft : S.config?.grow);
  return GROWS[pref] ? pref : soft ? 'flower' : 'bonsai';
}
function gm() { return GROWS[growKind()]; }
function growType() { const k = growKind(); return k === 'flower' ? flowerType() : k; }
function kindOf(type) { return type === 'bonsai' || type === 'car' ? type : 'flower'; }

const BONSAI = {
  juniper: { name: 'Juniper', dark: '#3F7D45', light: '#62A85A', bark: '#6E4B30', pot: ['#5E7F8C', '#4C6A77', '#3E5762'] },
  maple: { name: 'Japanese maple', dark: '#B83227', light: '#E8743B', bark: '#7A5A44', pot: ['#E6DAC5', '#D3C3A8', '#B5A386'], fallen: '#D9532F' },
  sakura: { name: 'Cherry blossom', dark: '#EE9DBE', light: '#FBD0E1', bark: '#5B3A2E', pot: ['#3F3434', '#302727', '#221B1B'], dots: '#FFFFFF', fallen: '#F6B9D0' },
  pine: { name: 'Pine', dark: '#2C5B4C', light: '#4E8A6E', bark: '#5C4636', pot: ['#C46A45', '#A9573A', '#8C482F'], flat: true },
  ficus: { name: 'Ficus', dark: '#3F8A34', light: '#86C25A', bark: '#9A8670', pot: ['#6E8F5B', '#5B7A4A', '#4A643C'], thick: true },
};
// Car body styles. Front is on the right; tyres touch the ground at y 129.
const CAR_STYLES = {
  jdm: { name: 'JDM coupe', w: [30, 90], r: 11,
    body: 'M8 118 V108 Q8 102 15 101 L40 98 L54 87 Q57 85 62 85 H76 Q82 85 87 89 L99 98 L108 100 Q113 101 113 107 V118 Z',
    glass: ['M57 97 L63 89 Q64 88 67 88 H70 V97 Z', 'M73 88 H77 Q81 88 84 91 L91 97 H73 Z'], doors: 'M71.5 98 V116 M50 100 Q49 108 50 116', handles: [[62, 102]], mirror: [87, 93],
    head: [106, 102], tail: [8, 103],
    extra5: e => `<path d="M12 101 V92 M21 101 V92" stroke="${e}" stroke-width="2"/><rect x="3" y="88.5" width="24" height="4" rx="1.5" fill="${e}"/><path d="M98 117 h15" stroke="${e}" stroke-width="2"/>` },
  hatch: { name: 'Hot hatch', w: [30, 84], r: 10.5,
    body: 'M14 118 V104 Q14 98 18 94 L24 84 Q26 80 31 80 H70 Q76 80 80 85 L88 95 L100 98 Q104 99 104 105 V118 Z',
    glass: ['M26 95 L30 86 Q31 84 34 84 H52 V95 Z', 'M55 84 H69 Q73 84 76 88 L82 95 H55 Z'], doors: 'M53.5 96 V116', handles: [[60, 100]], mirror: [79, 90],
    head: [99, 101], tail: [14, 100],
    extra5: e => `<path d="M18 80.5 h16 l-2 3 h-14z" fill="${e}"/><circle cx="16" cy="115" r="1.6" fill="#9EA4AA"/><circle cx="20" cy="115" r="1.6" fill="#9EA4AA"/>` },
  ute: { name: 'Ute', w: [30, 92], r: 11.5,
    body: 'M8 118 V100 H52 V86 Q52 80 58 80 H74 Q80 80 84 85 L93 96 L106 98 Q112 99 112 106 V118 Z',
    glass: ['M56 96 V86 Q56 84 59 84 H70 V96 Z', 'M73 84 H74 Q78 84 81 87 L88 96 H73 Z'], doors: 'M71.5 97 V116 M52 100 V116', handles: [[63, 100]], mirror: [86, 91],
    head: [106, 101], tail: [8, 102],
    extra5: e => `<path d="M14 100 V90 H46 V100" fill="none" stroke="#3A3F45" stroke-width="2.4"/><path d="M14 95 H46" stroke="#3A3F45" stroke-width="1.4"/><path d="M8 100 H52" stroke="${e}" stroke-width="1.5"/>` },
  fourwd: { name: '4WD', w: [30, 90], r: 13,
    body: 'M8 114 V96 Q8 92 12 91 L20 74 Q22 70 27 70 H80 Q86 70 89 75 L97 89 L106 91 Q112 92 112 99 V114 Z',
    glass: ['M22 88 L27 77 Q28 75 31 75 H54 V88 Z', 'M57 75 H79 Q83 75 86 79 L92 88 H57 Z'], doors: 'M55.5 89 V112 M33 90 V112', handles: [[44, 93], [64, 93]], mirror: [93, 84],
    head: [106, 95], tail: [8, 96],
    extra5: e => `<path d="M26 70 V65 M80 70 V65" stroke="#3A3F45" stroke-width="2"/><rect x="22" y="62.5" width="62" height="3" rx="1.5" fill="#3A3F45"/><circle cx="9" cy="100" r="7" fill="#1E2023"/><circle cx="9" cy="100" r="3.5" fill="#5B6168"/><path d="M96 89 V72" stroke="#2A2E33" stroke-width="2.6" stroke-linecap="round"/>` },
  muscle: { name: 'Muscle car', w: [28, 92], r: 11.5,
    body: 'M6 118 V106 Q6 101 12 100 L32 98 L46 86 Q49 83 54 83 H66 Q71 83 74 87 L81 97 L108 99 Q114 100 114 107 V118 Z',
    glass: ['M49 97 L54 88 Q55 86 58 86 H61 V97 Z', 'M64 86 H66 Q69 86 72 89 L77 97 H64 Z'], doors: 'M62.5 98 V116 M44 99 Q43 108 44 116', handles: [[53, 101]], mirror: [76, 93],
    head: [109, 102], tail: [6, 103],
    extra4: () => `<path d="M8 104 H113" stroke="#FFFFFF" stroke-width="2.2" opacity=".85"/><path d="M8 108 H113" stroke="#FFFFFF" stroke-width="2.2" opacity=".85"/>`,
    extra5: e => `<path d="M4 100 l3 -3 h12 l-2 3z" fill="${e}"/><rect x="88" y="95.5" width="12" height="3.5" rx="1" fill="#2A2E33"/><path d="M6 116 h8" stroke="#9EA4AA" stroke-width="2.4"/>` },
  sedan: { name: 'Sedan', w: [32, 88], r: 11,
    body: 'M10 118 V107 Q10 100 18 99 L38 97 L50 84 Q53 80 58 80 H79 Q85 80 89 85 L98 96 L106 98 Q111 99 111 105 V118 Z',
    glass: ['M53 96 L60 86 Q62 84 65 84 H69 V96 Z', 'M72 84 H79 Q83 84 86 88 L93 96 H72 Z'], doors: 'M70.5 97 V116 M48 99 Q47 108 48 116', handles: [[60, 101], [77, 101]], mirror: [89, 91],
    head: [104, 101], tail: [10, 102],
    extra5: e => `<path d="M13 98 V93 M21 98 V93" stroke="${e}" stroke-width="2"/><rect x="5" y="90.5" width="21" height="3.5" rx="1.5" fill="${e}"/>` },
};
// Feminine set, shown on Pink and Lilac. Pastel paint, white-wall tyres; finished ones get lashes and a heart.
Object.assign(CAR_STYLES, {
  bubble: { name: 'Bubble car', soft: true, w: [34, 86], r: 10,
    body: 'M14 118 V108 Q14 100 22 98 Q30 76 60 76 Q88 76 98 98 Q106 100 106 108 V118 Z',
    glass: ['M34 97 Q40 82 58 81 V97 Z', 'M62 81 Q80 82 86 97 H62 Z'], doors: 'M60 98 V116', handles: [[66, 101]], mirror: [88, 92],
    head: [99, 102], tail: [14, 103], decal: [48, 108],
    extra5: e => `<path d="M60 76 V72" stroke="${e}" stroke-width="1.6"/><circle cx="60" cy="71" r="2" fill="#F7D6E4"/>` },
  citymini: { name: 'City mini', soft: true, w: [32, 84], r: 10,
    body: 'M16 118 V102 Q16 96 22 95 L28 84 Q30 79 36 79 H70 Q76 79 79 84 L86 95 Q100 96 102 102 V118 Z',
    glass: ['M31 94 L35 85 Q36 83 39 83 H54 V94 Z', 'M57 83 H69 Q72 83 74 86 L79 94 H57 Z'], doors: 'M55.5 95 V116', handles: [[62, 99]], mirror: [80, 90],
    head: [96, 100], tail: [16, 100], decal: [44, 106],
    extra5: e => `<rect x="34" y="75.5" width="38" height="3.5" rx="1.75" fill="#FFFFFF" opacity=".9"/><path d="M38 75.5 V79 M46 75.5 V79 M54 75.5 V79 M62 75.5 V79" stroke="${e}" stroke-width=".8" opacity=".5"/>` },
  convertible: { name: 'Convertible', soft: true, w: [30, 90], r: 11,
    body: 'M6 118 V107 Q6 101 13 100 L46 99 L52 96 H66 L78 99 L108 100 Q114 101 114 108 V118 Z',
    glass: ['M76 98.5 L70 87 H72.5 L79.5 98.5 Z'], doors: 'M60 100 V116', handles: [[66, 103]], mirror: [80, 95],
    head: [107, 102], tail: [6, 103], decal: [44, 108],
    seats: '<path d="M50 97 q0 -9 6 -9 q4.5 0 4.5 9z" fill="#F5E6D3"/><path d="M38 99.5 q0 -8 5.5 -8 q4 0 4 8z" fill="#F5E6D3"/>',
    extra5: () => `<path d="M10 104 H110" stroke="#E6E8EB" stroke-width="1.6"/>` },
  cruiser: { name: 'Vintage cruiser', soft: true, w: [32, 90], r: 10.5,
    body: 'M4 118 V104 L8 92 L14 100 L36 98 L48 86 Q51 83 56 83 H72 Q78 83 82 88 L90 98 L110 100 Q116 101 116 108 V118 Z',
    glass: ['M51 97 L56 88 Q57 86 60 86 H64 V97 Z', 'M67 86 H72 Q76 86 79 90 L84 97 H67 Z'], doors: 'M65.5 98 V116', handles: [[56, 101]], mirror: [83, 94],
    head: [109, 102], tail: [6, 98], decal: [46, 110],
    extra4: () => `<path d="M18 108 Q60 104 106 108" stroke="#E6E8EB" stroke-width="2" fill="none"/>`,
    extra5: () => `<rect x="2" y="113" width="10" height="4" rx="2" fill="#E6E8EB"/><rect x="108" y="113" width="10" height="4" rx="2" fill="#E6E8EB"/>` },
  buggy: { name: 'Beach buggy', soft: true, w: [30, 90], r: 12,
    body: 'M10 116 V106 Q10 100 18 99 L42 100 L50 104 H70 L80 98 L104 98 Q112 99 112 106 V116 Z',
    glass: ['M80 98 L75.5 87 H78 L83 98 Z'], doors: '', handles: [], mirror: [84, 94],
    head: [105, 100], tail: [10, 102], decal: [26, 108],
    seats: '<path d="M54 103 q0 -9 6 -9 q4 0 4 9z" fill="#F5E6D3"/>',
    extra5: e => `<path d="M40 101 V86 Q40 82 44 82 H52 Q56 82 56 86 V103" fill="none" stroke="${e}" stroke-width="2.4"/><ellipse cx="47" cy="79.5" rx="28" ry="3.2" fill="#FFFFFF"/><path d="M21 79.5 H73" stroke="#7FC8E8" stroke-width="1.6"/>` },
});
const DEFAULT_BONSAI = 'juniper', DEFAULT_CAR = 'jdm', DEFAULT_CAR_SOFT = 'bubble', DEFAULT_BONSAI_SOFT = 'sakura';
function bonsaiSp(v) { v = v ?? S.config?.bonsai; return BONSAI[v] ? v : softTheme() ? DEFAULT_BONSAI_SOFT : DEFAULT_BONSAI; }
function carStyle(v) {
  if (v != null) return CAR_STYLES[v] ? v : DEFAULT_CAR;
  const soft = softTheme(); v = soft ? S.config?.carSoft : S.config?.car;
  return CAR_STYLES[v] && !!CAR_STYLES[v].soft === soft ? v : soft ? DEFAULT_CAR_SOFT : DEFAULT_CAR;
}
function growVariant() { const k = growKind(); return k === 'bonsai' ? bonsaiSp() : k === 'car' ? carStyle() : undefined; }

function bonsaiTree(stage, wilt, v) {
  const B = BONSAI[bonsaiSp(v)];
  const dark = wilt ? '#9C8F4A' : B.dark, light = wilt ? '#BCA95E' : B.light, bark = B.bark;
  const pad = (cx, cy, s) => {
    if (B.flat) return `<g><ellipse cx="${cx}" cy="${cy}" rx="${17 * s}" ry="${7 * s}" fill="${dark}"/><ellipse cx="${cx - 2 * s}" cy="${cy - 3 * s}" rx="${12 * s}" ry="${4.5 * s}" fill="${light}"/>`
      + Array.from({ length: 7 }, (_, k) => `<path d="M${cx - 14 * s + k * 4.6 * s} ${cy + 5 * s} l${1.2 * s} ${-3 * s}" stroke="${light}" stroke-width=".9" opacity=".8"/>`).join('') + '</g>';
    let g = `<g><circle cx="${cx - 9 * s}" cy="${cy + 2 * s}" r="${7 * s}" fill="${dark}"/><circle cx="${cx + 9 * s}" cy="${cy + 2 * s}" r="${7 * s}" fill="${dark}"/><circle cx="${cx}" cy="${cy - 2 * s}" r="${9.5 * s}" fill="${dark}"/>
      <circle cx="${cx - 7 * s}" cy="${cy - 1 * s}" r="${4.5 * s}" fill="${light}"/><circle cx="${cx + 2 * s}" cy="${cy - 6 * s}" r="${5 * s}" fill="${light}"/>`;
    if (B.dots && !wilt) g += [[-11, 3], [-4, -7], [5, 0], [10, -2], [-1, 3], [7, -9]].map(([dx, dy]) => `<circle cx="${cx + dx * s}" cy="${cy + dy * s}" r="${1.4 * s}" fill="${B.dots}"/>`).join('');
    return g + '</g>';
  };
  if (stage === 0) return `<path d="M48 119 q12 -8 24 0z" fill="#6B4226"/><ellipse cx="60" cy="114" rx="4" ry="3" fill="#8B5E3C" transform="rotate(-20 60 114)"/>`;
  if (stage === 1) return `<path d="M60 119 Q58 111 61 104" fill="none" stroke="#5E9A4E" stroke-width="2.5" stroke-linecap="round"/><path d="M61 105 q-8 -6 -11 0 q5 4 11 0z" fill="#7DB46A"/><path d="M61 104 q7 -7 11 -1 q-5 4 -11 1z" fill="#5E9A4E"/>`;
  const tw = B.thick ? 3 : 0;
  if (stage === 2) return `<path d="M60 119 C56 109 66 100 60 90" fill="none" stroke="${bark}" stroke-width="${5 + tw}" stroke-linecap="round"/>${pad(60, 82, 0.9)}`;
  const s = stage === 5 ? 1.2 : 1;
  let t = `<path d="M60 119 C52 106 72 96 62 82 C56 74 64 66 60 58" fill="none" stroke="${bark}" stroke-width="${(stage === 5 ? 9 : 7) + tw}" stroke-linecap="round"/>
    <path d="M60 119 C52 106 72 96 62 82" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".15" transform="translate(-2 0)"/>
    <path d="M61 88 Q50 86 40 80" fill="none" stroke="${bark}" stroke-width="${4 + tw / 2}" stroke-linecap="round"/>`;
  if (B.thick && stage === 5) t += `<path d="M57 100 Q52 110 54 119 M64 98 Q69 110 67 119" fill="none" stroke="${bark}" stroke-width="1.6" opacity=".8"/>`;
  if (stage >= 4) t += `<path d="M61 70 Q72 70 82 64" fill="none" stroke="${bark}" stroke-width="3.5" stroke-linecap="round"/>`;
  t += pad(36, 76, 0.9 * s);
  if (stage >= 4) t += pad(86, 60, 0.85 * s);
  t += pad(60, 50, s);
  return t;
}
function bonsaiSVG(stage, wilting, label, v) {
  const B = BONSAI[bonsaiSp(v)]; const [rim, body, feet] = B.pot;
  const ground = stage === 5 ? (B.fallen && !wilting ? `<g fill="${B.fallen}"><ellipse cx="34" cy="118.5" rx="2.2" ry="1.2"/><ellipse cx="78" cy="118" rx="2" ry="1.1"/><ellipse cx="88" cy="119" rx="1.8" ry="1"/></g>` : `<path d="M30 119 q5 -4 10 0 q4 -3 8 0" fill="#7DB46A"/><path d="M74 119 q5 -4 10 0 q4 -3 8 0" fill="#7DB46A"/>`) : '';
  const pot = `<ellipse cx="60" cy="119" rx="36" ry="3.5" fill="#5A3A24"/>${ground}<rect x="18" y="119" width="84" height="7" rx="3" fill="${rim}"/><path d="M23 126 H97 L92 138 H28 Z" fill="${body}"/><rect x="31" y="138" width="8" height="4" rx="1" fill="${feet}"/><rect x="81" y="138" width="8" height="4" rx="1" fill="${feet}"/>`;
  return `<svg class="flower${wilting ? ' wilt' : ''}" viewBox="0 -16 120 166" role="img" aria-label="${label || B.name + ' bonsai'}"><g class="fl-sway">${bonsaiTree(stage, wilting, v)}</g>${pot}</svg>`;
}
function carBody(stage, colour, wilting, v) {
  const C = CAR_STYLES[carStyle(v)]; const r = C.r, cy = 129 - r; const [w1, w2] = C.w;
  const tyre = cx => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1E2023"/>${C.soft ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.8}" fill="#F7F4EF"/>` : ''}<circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="#C9CDD2"/><circle cx="${cx}" cy="${cy}" r="${r * 0.18}" fill="#7E858C"/>`
    + [0, 72, 144, 216, 288].map(a => `<path d="M${cx} ${cy} l0 ${-r * 0.5}" stroke="#9EA4AA" stroke-width="1.4" transform="rotate(${a} ${cx} ${cy})"/>`).join('');
  let g = `<ellipse cx="60" cy="130" rx="54" ry="3.5" fill="#000" opacity=".18"/>`;
  if (stage <= 1) {
    const fx = w2 + 2;
    g += `<rect x="${w1 - 16}" y="${cy - 5}" width="${w2 - w1 + 32}" height="4.5" rx="2" fill="#5B6168"/><rect x="${fx - 6}" y="${cy - 16}" width="17" height="11" rx="2" fill="#7A8088"/><rect x="${fx - 2}" y="${cy - 19}" width="9" height="3" rx="1" fill="#5B6168"/>
      <rect x="${(w1 + w2) / 2 - 5}" y="${cy - 15}" width="9" height="10" rx="2" fill="#3E444B"/><rect x="${(w1 + w2) / 2 - 7}" y="${cy - 20}" width="3" height="15" rx="1.5" fill="#3E444B"/>`;
    if (stage === 0) g += [w1, w2].map(cx => `<circle cx="${cx}" cy="${cy}" r="3" fill="#3A3F45"/><path d="M${cx - 6} 129 L${cx - 3} ${cy + 3} H${cx + 3} L${cx + 6} 129 Z" fill="#C0392B"/>`).join('');
    else g += tyre(w1) + tyre(w2);
    return g;
  }
  const paint = stage >= 4 ? colour : '#A7ACB2';
  const edge = hexMix(paint, '#000000', 0.28);
  const glass = stage >= 3 ? '#A8D0EE' : '#3C4148';
  if (C.seats && stage >= 3) g += C.seats;
  g += `<path d="${C.body}" fill="${paint}" stroke="${edge}" stroke-width="1"/>${C.glass.map(d => `<path d="${d}" fill="${glass}"/>`).join('')}
    <circle cx="${w1}" cy="${cy}" r="${r + 2.5}" fill="#26292D"/><circle cx="${w2}" cy="${cy}" r="${r + 2.5}" fill="#26292D"/>`;
  if (stage >= 3) g += `<path d="${C.doors}" stroke="${edge}" stroke-width="1" fill="none" opacity=".7"/>${C.handles.map(([x, y]) => `<rect x="${x}" y="${y}" width="6" height="1.8" rx=".9" fill="${edge}"/>`).join('')}<path d="M${C.mirror[0]} ${C.mirror[1]} h5 v3 h-4z" fill="${edge}"/>`;
  if (stage >= 4) g += (C.extra4 ? C.extra4() : '') + `<path d="M${w1 - 14} ${cy - 13} H${w2 + 14}" stroke="#FFFFFF" stroke-width="2" opacity=".28"/>`;
  if (stage === 5) { const [hx, hy] = C.head, [tx, ty] = C.tail; g += C.extra5(edge) + (C.soft ? `<path d="M${hx} ${hy - 1} l-1.2 -3 M${hx + 2.5} ${hy - 1} l0 -3.4 M${hx + 5} ${hy - 1} l1.2 -3" stroke="#2A2226" stroke-width="1" stroke-linecap="round"/>` + (C.decal ? `<path transform="translate(${C.decal[0]} ${C.decal[1]})" d="M0 1.6 C-1 -0.6 -4 -0.2 -3.4 2 C-3 3.4 -1.4 4.4 0 5.6 C1.4 4.4 3 3.4 3.4 2 C4 -0.2 1 -0.6 0 1.6Z" fill="#FFFFFF" opacity=".9"/>` : '') : '') + `<path d="M${hx} ${hy} h6 v4 h-7z" fill="#FFE59A"/><path d="M${hx + 7} ${hy + 1} l8 -2 v7 l-8 -2z" fill="#FFE59A" opacity=".45"/><rect x="${tx}" y="${ty}" width="4" height="4" rx="1" fill="#E23B3B"/>`; }
  g += tyre(w1) + tyre(w2);
  if (wilting) g += `<g fill="#8A7A5C" opacity=".5"><circle cx="30" cy="104" r="1.2"/><circle cx="45" cy="110" r="1"/><circle cx="66" cy="92" r="1.1"/><circle cx="80" cy="108" r="1.3"/><circle cx="96" cy="103" r="1"/><circle cx="58" cy="112" r=".9"/></g>`;
  return g;
}
function carSVG(stage, wilting, colour, label, v) {
  return `<svg class="flower car${wilting ? ' wilt' : ''}" viewBox="0 56 120 92" role="img" aria-label="${label || CAR_STYLES[carStyle(v)].name}">
    <rect x="0" y="58" width="120" height="88" rx="12" fill="var(--sunk)"/><rect x="0" y="130" width="120" height="16" fill="#000" opacity=".08"/><path d="M0 130 H120" stroke="#000" opacity=".12"/>
    <path d="M60 58 V62" stroke="var(--muted)" stroke-width="1"/><path d="M51 62 h18 l-3 3.5 h-12z" fill="var(--muted)"/>
    <g class="car-g">${carBody(stage, colour, wilting, v)}</g></svg>`;
}
// Finished-car celebration: it revs, then drives off into a garage and the door rolls down.
function carDriveSVG(i, v) {
  const k = 0.7, ty = 129 - 129 * k;
  const C = CAR_STYLES[carStyle(v)];
  const exX = 4 + C.w[0] * k - C.r * k - 8, exY = 125;
  return `<div class="cele-drive"><svg viewBox="0 58 240 82" role="img" aria-label="Your finished car drives into the garage">
    <rect x="0" y="129" width="240" height="11" style="fill:var(--gar-floor, #8E949B)" opacity=".55"/>
    <rect x="168" y="90" width="44" height="40" fill="#2A2E33"/>
    <g class="dr-puffs">${[0, 1, 2].map(n => `<circle class="dr-puff p${n}" cx="${exX - n * 7}" cy="${exY - n * 3}" r="${5 + n * 2}" fill="#BFC5CC"/>`).join('')}</g>
    <g class="dr-car"><g class="dr-lines" stroke="var(--muted)" stroke-width="1.6" stroke-linecap="round"><path d="M-14 100 h-16"/><path d="M-8 110 h-22"/><path d="M-14 120 h-14"/></g>
      <g class="dr-shake"><g transform="translate(4 ${ty}) scale(${k})">${carBody(5, carColour(i, v), false, v)}</g></g></g>
    <path d="M212 78 H240 V130 H212 Z M160 78 H240 V90 H160 Z M160 90 H168 V130 H160 Z" style="fill:var(--surface)" stroke="var(--line)"/>
    <path d="M154 80 L200 62 L246 80 Z" style="fill:var(--btn)"/>
    <g class="dr-door"><rect x="168" y="90" width="44" height="40" fill="#C9CED4"/>${[96, 102, 108, 114, 120, 126].map(y => `<path d="M168 ${y} H212" stroke="#A9AFB6" stroke-width="1"/>`).join('')}</g>
  </svg></div>`;
}
function carColour(i, v) { const P = CAR_STYLES[carStyle(v)]?.soft ? PASTEL_COLOURS : CAR_COLOURS; return P[i % P.length]; }
function growSVG(type, stage, wilting, opts = {}) {
  if (type === 'bonsai') return bonsaiSVG(stage, wilting, opts.label, opts.v);
  if (type === 'car') return carSVG(stage, wilting, carColour(opts.i || 0, opts.v), opts.label, opts.v);
  return flowerSVG(stage, wilting, { type, label: opts.label });
}
function miniSVG(type, i, v) {
  if (type === 'bonsai') { const B = BONSAI[bonsaiSp(v)]; return `<svg class="mini-bloom" viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0 11 V2" stroke="${B.bark}" stroke-width="2.6" stroke-linecap="round"/><circle cx="-5.5" cy="0" r="5" fill="${B.dark}"/><circle cx="5.5" cy="0" r="5" fill="${B.dark}"/><circle cx="0" cy="-5" r="6" fill="${B.light}"/></svg>`; }
  if (type === 'car') return `<svg class="mini-bloom mini-car" viewBox="2 64 116 70" aria-hidden="true">${carBody(5, carColour(i, v), false, v)}</svg>`;
  return miniBloomSVG(type);
}
function groundTree(x, gy, i, stage, wilting, v) {
  const flip = i % 2 ? -1 : 1; const s = stage === 5 ? 1 : 0.95;
  return `<g transform="translate(${x} ${gy}) scale(${flip * s} ${s}) translate(-60 -119)"${wilting ? ' opacity=".85"' : ''}>${bonsaiTree(stage, wilting, v)}</g>`;
}
function groundCar(x, gy, i, stage, wilting, v) {
  const s = 0.92;
  return `<g transform="translate(${x - 60 * s} ${gy - 129 * s}) scale(${s})"${wilting ? ' class="car-dusty"' : ''}>${carBody(stage, carColour(i, v), wilting, v)}</g>`;
}
function groundItem(x, gy, i, type, stage, wilting, v) {
  if (type === 'bonsai') return groundTree(x, gy, i, stage, wilting, v);
  if (type === 'car') return groundCar(x, gy, i, stage, wilting, v);
  return groundFlower(x, gy, i, type, stage, wilting);
}
function gardenCard() {
  if (!gardenOn() || S.date !== todayISO()) return '';
  const g = gardenStats(); const M = gm(); const type = growType(); const blooms = S.config?.blooms || [];
  const names = M.names;
  let msg;
  if (g.wilting) msg = M.wilt(g.daysSince);
  else if (g.pts === 0) msg = `Log a workout or today's food to get started.`;
  else if (g.todayPts === 0) msg = `Nothing logged yet today. A workout gives it the biggest boost (+${GARDEN.WORKOUT}).`;
  else msg = `+${g.todayPts} today. ${g.toNext} more to go, about ${Math.ceil(g.toNext / GARDEN.WORKOUT)} workout${Math.ceil(g.toNext / GARDEN.WORKOUT) > 1 ? 's' : ''}.`;
  const shown = Math.min(g.bloomed, 14);
  const bed = g.bloomed ? `<div class="bed" aria-label="${g.bloomed} ${M.grownLabel.toLowerCase()}">${Array.from({ length: shown }, (_, k) => miniSVG(blooms[k]?.type || type, k, blooms[k] ? blooms[k].v : growVariant())).join('')}${g.bloomed > shown ? `<span class="small muted">+${g.bloomed - shown}</span>` : ''}</div>` : '';
  return `<section class="card garden${type === 'car' ? ' is-car' : ''}" aria-label="${M.label}">
    <div class="garden-plant">${growSVG(type, g.stage, g.wilting, { label: names[g.stage], i: blooms.length, v: growVariant() })}</div>
    <div class="garden-text">
      <div class="garden-title">${g.wilting ? 'Needs a workout' : names[g.stage]}</div>
      ${streakChips()}
      <div class="garden-bar" role="img" aria-label="${g.inBloom} of ${GARDEN.PER_BLOOM} ${M.next}"><i style="width:${(g.inBloom / GARDEN.PER_BLOOM) * 100}%"></i></div>
      <div class="small">${msg}</div>
      ${bed}
      <details class="small muted garden-how"><summary>How it grows</summary>Workout +${GARDEN.WORKOUT} · Cardio +${GARDEN.CARDIO} · Food logged +${GARDEN.FOOD_DAY} · Protein hit +${GARDEN.PROTEIN_DAY} · Weigh-in +${GARDEN.WEIGH_IN}. Every ${GARDEN.PER_BLOOM} points ${M.how}. Miss workouts for ${GARDEN.WILT_DAYS}+ days and ${M.wiltHow} (you never lose progress).</details>
    </div>
  </section>`;
}

function viewToday() {
  const T = targets(); const day = S.days[S.date]; const t = dayTotals(day);
  const left = T.kcal - t.kcal; const pLeft = T.p - t.p;
  const meals = day?.meals || [];
  let log = '';
  if (!meals.length) {
    log = `<div class="empty"><b>Nothing logged for ${S.date === todayISO() ? 'today' : fmtDay(S.date)} yet.</b>Tap "Log food or drink" to add your first meal.</div>`;
  } else {
    for (const slot of SLOTS) {
      const items = meals.filter(m => (m.slot || 'Snack') === slot);
      if (!items.length) continue;
      log += `<div class="slotlabel">${slot}</div>`;
      for (const m of items) {
        const s = m.servings ?? 1;
        const mk = m.recipe ? 'R:' + m.recipe : m.food && (S.config?.foods || []).some(x => x.id === m.food) ? 'F:' + m.food : '';
        log += `<div class="row"><div style="min-width:0"${mk ? ` class="meal-open" data-act="openMeal" data-k="${mk}" role="button" tabindex="0"` : ''}><div class="t">${esc(m.name)}${mk ? ' <span class="open-hint" aria-hidden="true">›</span>' : ''}</div>
          <div class="chips"><span class="chip k">${r0(m.kcal * s)} kcal</span><span class="chip p">P ${r0(m.p * s)}</span><span class="chip c">C ${r0(m.c * s)}</span><span class="chip f">F ${r0(m.f * s)}</span></div></div>
          <span class="rowbtns"><button class="starbtn" data-act="favToggle" data-k="L:${m.id}" aria-pressed="${isFav(m.name)}" aria-label="${isFav(m.name) ? 'Remove from' : 'Add to'} favourites">${starSVG(isFav(m.name))}</button><div class="stepper"><button data-act="serv" data-id="${m.id}" data-d="-0.5" aria-label="Less">−</button><span>${s}×</span><button data-act="serv" data-id="${m.id}" data-d="0.5" aria-label="More">+</button></div></span></div>`;
      }
    }
  }
  const myFoods = S.config?.foods || [];
  let add = '';
  if (S.foodAdd === 'scan') {
    add = scanPanel();
  } else if (S.foodAdd === 'search') {
    add = searchPanel();
  } else if (S.foodAdd === 'drinks') {
    add = drinksPanel();
  } else if (S.foodAdd !== 'custom') {
    const hidden = new Set(S.config?.hiddenRecipes || []);
    const chipRow = m => `<div class="chips"><span class="chip k">${r0(m.kcal)} kcal</span><span class="chip p">P ${r0(m.p)}</span><span class="chip c">C ${r0(m.c)}</span><span class="chip f">F ${r0(m.f)}</span></div>`;
    let any = false;
    for (const slot of SLOTS) {
      const starters = RECIPES.filter(x => x.slot === slot && !hidden.has(x.id));
      const mine = myFoods.filter(f => (f.slot || 'Snack') === slot);
      if (!starters.length && !mine.length) continue;
      any = true;
      add += `<div class="slotlabel" data-slot="${slot}">${slot}</div>`;
      for (const f of mine) {
        add += `<div class="row"><div class="meal-open" style="min-width:0" data-act="openMeal" data-k="F:${f.id}" role="button" tabindex="0"><div class="t">${esc(f.name)} <span class="open-hint" aria-hidden="true">›</span></div>${chipRow(f)}</div>
          <span class="rowbtns"><button class="xbtn" data-act="forgetFood" data-id="${f.id}" aria-label="Delete ${esc(f.name)} from your meal plan" title="Delete">×</button><button class="btn sm" data-act="addMine" data-id="${f.id}">Add</button></span></div>`;
      }
      for (const r of starters) {
        add += `<div class="row"><div class="meal-open" style="min-width:0" data-act="openMeal" data-k="R:${r.id}" role="button" tabindex="0"><div class="t">${esc(r.name)} <span class="open-hint" aria-hidden="true">›</span></div>${chipRow(r)}</div>
          <span class="rowbtns"><button class="xbtn" data-act="hideRecipe" data-id="${r.id}" aria-label="Remove ${esc(r.name)} from your meal plan" title="Remove">×</button><button class="btn sm" data-act="addRecipe" data-id="${r.id}">Add</button></span></div>`;
      }
    }
    if (!any) add = `<div class="empty"><b>Your meal plan is empty.</b>Pick a few starter meals sized to your targets, or tap "Add a meal" to create your own.<div style="margin-top:10px"><button type="button" class="btn sm" data-act="openStarters">Browse starter meals</button></div></div>`;
    else add = `<div class="sp-entry"><button type="button" class="linkbtn" data-act="openStarters">+ Browse starter meals</button></div>` + add;
  } else {
    const built = buildState().items.length;
    add = `<form id="customForm" class="sec" style="gap:10px">
      ${S.build?.editId || S.build?.fromRecipe ? `<div class="edit-banner"><span>${S.build.editId ? 'Editing your meal. Change amounts and the totals update.' : 'Making your own version of a starter meal. It saves to your meals and replaces the starter in your list.'}</span><button type="button" class="linkbtn" data-act="cancelEditMeal">Cancel</button></div>` : ''}
      <label class="f">Meal name<input type="text" id="cf_name" required placeholder="e.g. Chicken pesto wrap" value="${esc(cfVal('cf_name'))}"></label>
      ${builderCard()}
      <div class="slotlabel" style="padding-top:2px">${built ? 'Totals (worked out from your ingredients, edit if needed)' : 'Calories and macros'}</div>
      <div class="grid4">
        <label class="f">kcal<input type="number" id="cf_kcal" inputmode="decimal" step="any" min="0" required value="${esc(cfVal('cf_kcal'))}"></label>
        <label class="f">Protein g<input type="number" id="cf_p" inputmode="decimal" step="any" min="0" value="${esc(cfVal('cf_p', '0'))}"></label>
        <label class="f">Carbs g<input type="number" id="cf_c" inputmode="decimal" step="any" min="0" value="${esc(cfVal('cf_c', '0'))}"></label>
        <label class="f">Fat g<input type="number" id="cf_f" inputmode="decimal" step="any" min="0" value="${esc(cfVal('cf_f', '0'))}"></label>
      </div>
      <label class="f">${built ? 'Other ingredients (optional, one per line)' : 'Ingredients (optional, one per line, for nutrients and your grocery list)'}<textarea id="cf_ing" rows="3" placeholder="200 g chicken breast&#10;1 avocado&#10;100 g rice">${esc(cfVal('cf_ing'))}</textarea></label>
      <div class="formrow">
        <label class="f">Meal<select id="cf_slot">${SLOTS.map(s => `<option ${s === cfVal('cf_slot', guessSlot()) ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        ${S.build?.editId || S.build?.fromRecipe ? '' : `<label class="f" style="flex-direction:row;display:flex;align-items:center;gap:6px;color:var(--ink)"><input type="checkbox" id="cf_save" ${cfVal('cf_save', true) ? 'checked' : ''}> Save to my meal plan</label>`}
        ${S.build?.editId || S.build?.fromRecipe ? `<label class="f" style="flex-direction:row;display:flex;align-items:center;gap:6px;color:var(--ink)"><input type="checkbox" id="cf_logtoo"> Also add to today's log</label><button class="btn" type="submit">Save changes</button>` : '<button class="btn" type="submit">Add to log</button>'}
      </div></form>`;
  }
  const cardio = day?.cardio || [];
  const shown = foodShown();
  const emptySlots = SLOTS.filter(sl => !meals.some(m => (m.slot || 'Snack') === sl));
  const addSheet = !S.addOpen ? '' : `<div class="sheet ovl" data-ovl="add"><div class="panel"><div class="wrap">
    <div class="ovl-head"><h3>Log food</h3><button type="button" class="btn ghost sm" data-act="closeAdd">Done</button></div>
    <div class="ovl-sub"><span class="small muted">${r0(t.kcal).toLocaleString()} / ${T.kcal.toLocaleString()} kcal · P ${r0(t.p)} / ${T.p} g</span><span><button class="linkbtn groc-btn" data-act="openPlanner">Plan &amp; shop</button></span></div>
    ${quickCard()}
    <div class="seg" role="group" aria-label="Food source">
      <button data-act="foodAdd" data-v="plan" aria-pressed="${!['custom', 'scan', 'search', 'drinks'].includes(S.foodAdd)}">Meal plan</button>
      <button data-act="foodAdd" data-v="search" aria-pressed="${S.foodAdd === 'search'}">Search</button>
      <button data-act="foodAdd" data-v="drinks" aria-pressed="${S.foodAdd === 'drinks'}">Drinks</button>
      <button data-act="foodAdd" data-v="scan" aria-pressed="${S.foodAdd === 'scan'}">Scan</button>
      <button data-act="foodAdd" data-v="custom" aria-pressed="${S.foodAdd === 'custom'}">Add a meal</button>
    </div>
    <div class="card rows">${add}</div>
  </div></div></div>`;
  const panelSheet = S.panel === 'water' ? `<div class="sheet ovl" data-ovl="panel"><div class="panel"><div class="wrap">
      <div class="ovl-head"><h3>Water</h3><button type="button" class="btn ghost sm" data-act="closePanel">Done</button></div>${waterCard(true)}</div></div></div>`
    : S.panel === 'steps' ? `<div class="sheet ovl" data-ovl="panel"><div class="panel"><div class="wrap">
      <div class="ovl-head"><h3>Steps &amp; cardio</h3><button type="button" class="btn ghost sm" data-act="closePanel">Done</button></div>
      <div class="card" style="display:grid;gap:10px">
      ${stepsCard(day)}
      ${cardio.length ? `<div class="rows">${cardio.map(c => `<div class="row"><div><span class="t">${esc(c.type)}</span> <span class="muted">${c.minutes ? c.minutes + ' min' : ''}${c.note ? ' · ' + esc(c.note) : ''}</span></div><button class="btn sm ghost" data-act="delCardio" data-id="${c.id}">Remove</button></div>`).join('')}</div>` : ''}
      <form id="cardioForm" class="formrow">
        <label class="f">Activity<select id="cd_type">${CARDIO_TYPES.map(c => `<option>${c}</option>`).join('')}</select></label>
        <label class="f">Minutes<input type="number" id="cd_min" inputmode="numeric" min="0"></label>
        <label class="f">Note<input type="text" id="cd_note" placeholder="e.g. run club 5 km"></label>
        <button class="btn ghost" type="submit">Add</button>
      </form></div></div></div></div>` : '';
  return `<section class="sec">
    <div class="card tapcard hero" style="display:grid;gap:14px" data-act="openNutrients" role="button" tabindex="0" aria-label="Show all nutrients for this day">
      ${growChip()}
      <div class="kcal-big"><span class="n">${r0(t.kcal).toLocaleString()}</span><span class="of">/ ${T.kcal.toLocaleString()} kcal</span>
        <span class="left ${left < -150 ? 'down-txt' : ''}">${left >= 0 ? `${r0(left)} kcal left` : `${r0(-left)} kcal over`}${pLeft > 0 ? ` · ${r0(pLeft)} g protein to go` : ' · protein hit'}</span></div>
      <div class="macros">
        ${macroRow('Protein', t.p, T.p, '--red', ' g')}
        ${macroRow('Carbs', t.c, T.c, '--blue', ' g')}
        ${macroRow('Fat', t.f, T.f, '--yellow', ' g')}
      </div>
      <div class="tap-hint"><span>Fibre, vitamins, minerals and more</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></div>
    </div>
  </section>
  ${shown.water || shown.steps ? `<div class="tiles${shown.water && shown.steps ? '' : ' one'}">${shown.water ? waterTile() : ''}${shown.steps ? stepsTile(day) : ''}</div>` : ''}
  ${shown.supps ? suppCard() : ''}
  ${shown.week ? `<section class="sec"><h2>Last 7 days</h2>
    <div class="week">${weekStrip()}</div>
    <div class="legend"><span><i style="background:var(--green)"></i>On target</span><span><i style="background:var(--yellow)"></i>Under, or protein short</span><span><i style="background:var(--red)"></i>Over by 150+</span></div>
  </section>` : ''}
  <section class="sec"><h2>${S.date === todayISO() ? "Today's food" : 'Food'}</h2><div class="card rows">${log}
    ${emptySlots.length && meals.length ? `<div class="slot-adds">${emptySlots.map(sl => `<button type="button" class="chip chipbtn" data-act="openAdd" data-v="${sl}">+ ${sl}</button>`).join('')}</div>` : ''}
  </div></section>
  ${shown.fits ? fitsCard() : ''}
  <div class="log-cta"><button type="button" class="btn log-btn" data-act="openAdd"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Log food or drink</button></div>
  ${addSheet}${panelSheet}`;
}

// What shows on the Food page. Water and steps show unless turned off; the rest are opt-in.
function foodShown() {
  const c = S.config || {};
  return { water: !c.water?.hidden, steps: !c.stepsHidden, supps: c.suppHidden === false, week: !!c.weekShown, fits: c.fitsHidden === false };
}
function growChip() {
  if (!gardenOn() || S.date !== todayISO()) return '';
  const g = gardenStats(); const M = gm(); const type = growType(); const blooms = S.config?.blooms || [];
  return `<button type="button" class="grow-chip" data-act="tab" data-v="garden" aria-label="${M.label}: ${g.wilting ? 'needs a workout' : M.names[g.stage]}">
    <span class="gc-art">${growSVG(type, g.stage, g.wilting, { label: M.names[g.stage], i: blooms.length, v: growVariant() })}</span>
    <span class="gc-text"><b>${g.wilting ? 'Needs a workout' : M.names[g.stage]}</b><span class="garden-bar"><i style="width:${(g.inBloom / GARDEN.PER_BLOOM) * 100}%"></i></span></span>
    <svg class="gc-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`;
}
function waterTile() {
  const ml = S.days[S.date]?.water || 0; const goal = waterGoal(); const f = Math.min(1, ml / goal); const soft = softTheme(); const bs = bottleSize();
  return `<div class="tile${ml >= goal ? ' done' : ''}">
    <button type="button" class="tile-main" data-act="openPanel" data-v="water" aria-label="Water: ${fmtL(ml)} of ${fmtL(goal)} litres. Open water">
      <span class="tile-art">${soft ? stanleySVG(f, stanleyColour()) : plainBottleSVG(f)}</span>
      <span class="tile-txt"><span class="tile-k">Water</span><b>${fmtL(ml)}</b><span class="tile-of">/ ${fmtL(goal)} L</span></span></button>
    <div class="tile-btns"><button type="button" class="chip chipbtn" data-act="water" data-d="250">+250</button><button type="button" class="chip chipbtn" data-act="water" data-d="${bs}">+${soft ? 'Tumbler' : 'Bottle'}</button></div>
  </div>`;
}
function stepsTile(day) {
  const n = day?.steps || 0; const goal = stepGoal(); const pct = Math.min(100, n / goal * 100); const cardio = day?.cardio || [];
  return `<div class="tile${n >= goal ? ' done' : ''}">
    <button type="button" class="tile-main" data-act="openPanel" data-v="steps" aria-label="Steps: ${n} of ${goal}. Open steps and cardio">
      <span class="tile-txt"><span class="tile-k">Steps${cardio.length ? ` · ${cardio.length} cardio` : ''}</span><b>${n.toLocaleString()}</b><span class="tile-of">/ ${goal.toLocaleString()}</span></span>
      <span class="garden-bar steps-bar"><i style="width:${pct}%"></i></span></button>
    <div class="tile-btns"><button type="button" class="chip chipbtn" data-act="stepsAdd" data-v="1000">+1,000</button><button type="button" class="chip chipbtn" data-act="openPanel" data-v="steps">More</button></div>
  </div>`;
}

/* ---------- TRAIN ---------- */
function sessionsSorted() { return Object.entries(S.sessions).map(([id, s]) => ({ id, ...s })).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0); }
function lastFor(name, beforeDate) {
  for (const s of sessionsSorted()) {
    if (s.date >= beforeDate) continue;
    const e = (s.exercises || []).find(x => x.name === name);
    if (e && e.sets?.length) return { date: s.date, sets: e.sets };
  }
  return null;
}
function setTxt(st, steps) {
  if (steps || st.unit === 'steps') return `${kgFmt(st.kg)}×${st.reps} steps`;
  let t = `${kgFmt(st.kg)}×${st.reps}${st.partials ? '+' + st.partials + 'p' : ''}`;
  if (st.drop && st.drop.reps) t += ` → ${kgFmt(st.drop.kg)}×${st.drop.reps}${st.drop.partials ? '+' + st.drop.partials + 'p' : ''}`;
  return t;
}
function increment(name, kg) {
  if (/leg press/i.test(name) || kg >= 100) return 5;
  if (/lateral|rear delt|fly|curl|pushdown|extension/i.test(name) && kg <= 12.5) return 1.25;
  return 2.5;
}
function hintFor(ex, last) {
  if (!last || !ex.max || STEP_EXERCISES.has(ex.name)) return '';
  const work = last.sets;
  const topKg = Math.max(...work.map(s => s.kg));
  const atTop = work.filter(s => s.kg === topKg);
  const allHit = work.length >= ex.sets && atTop.every(s => s.reps >= ex.max) && atTop.length >= Math.min(ex.sets, work.length);
  if (allHit) return `<span class="hint up">Every set hit ${ex.max} at ${kgFmt(topKg)} kg last time. Go up to ${kgFmt(topKg + increment(ex.name, topKg))} kg.</span>`;
  const below = atTop.some(s => s.reps < ex.min);
  if (below) return `<span class="hint hold">Below ${ex.min} reps at ${kgFmt(topKg)} kg last time. Stay at ${kgFmt(topKg)} kg, or drop one step, and build reps.</span>`;
  return `<span class="hint hold">Stay at ${kgFmt(topKg)} kg and add reps until every set hits ${ex.max}.</span>`;
}
function draftKey() { return S.date + '_' + S.trainDay; }
function getDraft() {
  const key = draftKey();
  if (S.drafts[key]) return S.drafts[key];
  const saved = lsGet('draft:' + key);
  if (saved) return (S.drafts[key] = saved);
  const existing = S.sessions[key];
  const prog = program()[S.trainDay] || [];
  let d;
  if (existing) {
    d = { note: existing.note || '', title: existing.name || '', exercises: existing.exercises.map((e, i) => {
      const p = prog.find(x => x.name === e.name) || prog[i] || {};
      return { name: e.name, sets: p.sets || e.sets.length, min: p.min, max: p.max, rows: e.sets.map(s => ({ kg: s.kg, reps: s.reps, partials: s.partials || '', drop: s.drop ? { kg: s.drop.kg, reps: s.drop.reps, partials: s.drop.partials || '' } : null })) };
    }), fromSaved: true };
  } else {
    d = { note: '', exercises: prog.map(p => {
      const last = lastFor(p.name, S.date);
      const rows = [];
      for (let i = 0; i < p.sets; i++) {
        const ls = last?.sets[i] || last?.sets[last.sets.length - 1];
        rows.push({ kg: ls ? ls.kg : '', reps: '', partials: '', drop: null, ph: ls ? ls.reps : '' });
      }
      return { name: p.name, sets: p.sets, min: p.min, max: p.max, rows };
    }) };
  }
  return (S.drafts[key] = d);
}
function persistDraft() { lsSet('draft:' + draftKey(), S.drafts[draftKey()]); }
function viewTrain() {
  const wd = fromISO(S.date).getDay();
  if (!S.trainDay) {
    // Order: the session you picked for this date (remembered on this phone) → the scheduled day if it's logged
    // → any other session logged on this date → the scheduled day.
    const def = dayForWeekday(wd) || 'Rest';
    const picked = (lsGet('rl:trainPick') || {})[S.date];
    const loggedDay = Object.keys(S.sessions).filter(k => k.startsWith(S.date + '_')).map(k => k.slice(S.date.length + 1))[0];
    S.trainDay = picked || (S.sessions[S.date + '_' + def] ? def : loggedDay) || def;
  }
  if (S.trainDay !== 'Custom' && S.trainDay !== 'Rest' && !splitDays().includes(S.trainDay)) S.trainDay = 'Rest';
  const seg = `<div class="seg" role="group" aria-label="Session">${[...splitDays(), 'Custom', 'Rest'].map(d => `<button data-act="trainDay" data-v="${d}" aria-pressed="${S.trainDay === d}">${d}</button>`).join('')}</div>`;
  if (S.trainDay === 'Rest') {
    const day = S.days[S.date];
    return `<section class="sec"><h2>Session <span class="aside">${fmtDay(S.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span></h2>${seg}</section>
    ${splitDays().length ? '' : `<div class="card" style="display:grid;gap:8px"><b>No training split set up yet.</b><div class="small muted">Build your own split in Settings: name your days, pick which weekdays they're on, and add exercises. Or tap Custom to log any session.</div><div><button class="btn sm" data-act="openSplit">Set up my split</button></div></div>`}
    <div class="card empty"><b>Rest day.</b>Log abs, cardio, swims and hikes under Food → Steps &amp; cardio. ${day?.cardio?.length ? `Logged today: ${day.cardio.map(c => esc(c.type)).join(', ')}.` : ''}<div style="margin-top:10px"><button class="btn ghost" data-act="tab" data-v="today">Go to steps &amp; cardio</button></div></div>`;
  }
  if (!S.loaded.sessions && navigator.onLine && !S.offlineAuth) return `<section class="sec">${seg}</section><div class="card empty">Loading your lift history…</div>`;
  const d = getDraft();
  const saved = !!S.sessions[draftKey()];
  let cards = '';
  d.exercises.forEach((ex, ei) => {
    const steps = STEP_EXERCISES.has(ex.name);
    const last = lastFor(ex.name, S.date);
    const scheme = ex.max ? `${ex.sets} × ${ex.min === ex.max ? ex.min : ex.min + '–' + ex.max}${steps ? ' steps' : ''}` : '';
    let rows = `<div class="sethead"><span>Set</span><span>kg</span><span>${steps ? 'Steps' : 'Reps'}</span><span>${steps ? '' : '+Part.'}</span><span>${steps ? '' : 'Drop'}</span></div>`;
    ex.rows.forEach((r, ri) => {
      rows += `<div class="setrow"><span class="n">${ri + 1}</span>
        <input type="number" inputmode="decimal" step="0.25" min="0" aria-label="Set ${ri + 1} weight" data-f="kg" data-e="${ei}" data-r="${ri}" value="${r.kg ?? ''}" id="kg_${ei}_${ri}">
        <input type="number" inputmode="numeric" min="0" aria-label="Set ${ri + 1} reps" data-f="reps" data-e="${ei}" data-r="${ri}" value="${r.reps ?? ''}" placeholder="${r.ph ?? ''}" id="rp_${ei}_${ri}">
        ${steps ? '<span></span><span></span>' : `<input type="number" inputmode="numeric" min="0" aria-label="Set ${ri + 1} partial reps" data-f="partials" data-e="${ei}" data-r="${ri}" value="${r.partials ?? ''}" placeholder="0" id="pa_${ei}_${ri}">
        <button class="dropbtn" data-act="drop" data-e="${ei}" data-r="${ri}" aria-pressed="${!!r.drop}" aria-label="Drop set">DROP</button>`}</div>`;
      if (r.drop) rows += `<div class="setrow drop"><span class="n">↳</span>
        <input type="number" inputmode="decimal" step="0.25" min="0" aria-label="Drop weight" data-f="dkg" data-e="${ei}" data-r="${ri}" value="${r.drop.kg ?? ''}" id="dkg_${ei}_${ri}">
        <input type="number" inputmode="numeric" min="0" aria-label="Drop reps" data-f="dreps" data-e="${ei}" data-r="${ri}" value="${r.drop.reps ?? ''}" id="drp_${ei}_${ri}">
        <input type="number" inputmode="numeric" min="0" aria-label="Drop partial reps" data-f="dpartials" data-e="${ei}" data-r="${ri}" value="${r.drop.partials ?? ''}" placeholder="0" id="dpa_${ei}_${ri}"><span></span></div>`;
    });
    cards += `<div class="card ex">
      <div class="ex-head"><input type="text" list="exnames" aria-label="Exercise" data-f="name" data-e="${ei}" value="${esc(ex.name)}" id="exn_${ei}"><span class="scheme">${scheme}</span></div>
      ${last ? `<div class="last">Last (${fmtDay(last.date, { day: 'numeric', month: 'short' })}): ${last.sets.map(s => setTxt(s, steps)).join(', ')}</div>` : `<div class="last">No history for this exercise yet.</div>`}
      ${hintFor(ex, last)}
      <div class="sets">${rows}</div>
      <div class="ex-foot"><button class="linkbtn" data-act="addSet" data-e="${ei}">+ Set</button>${ex.rows.length > 1 ? `<button class="linkbtn" data-act="rmSet" data-e="${ei}">− Set</button>` : ''}<button class="linkbtn" style="margin-left:auto;color:var(--muted)" data-act="rmEx" data-e="${ei}">Remove exercise</button></div>
    </div>`;
  });
  const t = S.timer; const custom = S.trainDay === 'Custom';
  const prog = program();
  const picker = custom ? `<select id="customPick" class="custom-pick" aria-label="Add an exercise from your program"><option value="">+ Add from your program</option>${splitDays().map(dn => `<optgroup label="${esc(dn)}">${prog[dn].map(e => `<option value="${esc(dn + '|' + e.name)}">${esc(e.name)}</option>`).join('')}</optgroup>`).join('')}</select>` : '';
  const customHead = custom ? `<div class="card custom-head"><label class="f">Session name (optional)<input type="text" data-f="title" id="sessTitle" placeholder="e.g. Quick arms, hotel gym" value="${esc(d.title || '')}"></label>
      ${d.exercises.length ? '' : `<div class="small muted">Build a session that fits the time you've got. Pick exercises from your split below and their last weights fill in, or add any exercise by name.</div>`}</div>` : '';
  return `<section class="sec"><h2>Session <span class="aside">${fmtDay(S.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span></h2>${seg}
    ${saved ? `<div class="small muted">Saved session. Changes overwrite it when you save again.</div>` : ''}</section>
    ${customHead}
    ${cards}
    <div class="add-ex-row">${picker}<button class="btn ghost" data-act="addEx">+ Add ${custom ? 'any ' : ''}exercise</button></div>
    <label class="f">Session notes<textarea id="sessNote" data-f="note">${esc(d.note)}</textarea></label>
    ${saved ? (S.confirmSession ? `<div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">Delete this ${custom ? (d.title || 'custom') : S.trainDay} session? <button class="btn danger sm" data-act="delSession">Delete</button><button class="btn ghost sm" data-act="cancelDelSession">Keep it</button></div>` : `<div><button class="linkbtn" style="color:var(--red)" data-act="askDelSession">Delete this session</button></div>`) : ''}
    <div class="savebar">
      <div class="timer" aria-label="Rest timer"><span class="clock" id="clock">${t.end ? '' : '0:00'}</span>
        <button class="btn sm ghost" data-act="timer" data-s="90">1:30</button><button class="btn sm ghost" data-act="timer" data-s="120">2:00</button><button class="btn sm ghost" data-act="timer" data-s="180">3:00</button></div>
      <button class="btn" data-act="saveSession">Save session</button>
    </div>`;
}
function tickTimer() {
  const el = document.getElementById('clock'); if (!el) return;
  const t = S.timer;
  if (!t.end) { el.textContent = '0:00'; el.classList.remove('done'); return; }
  const left = Math.max(0, Math.round((t.end - Date.now()) / 1000));
  el.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
  el.classList.toggle('done', left === 0);
}
function timerVol() { const v = S.config?.timerVol; return v == null ? 80 : v; }
function timerBeeps() { return S.config?.timerBeeps || 2; }
function beep(vol = timerVol(), count = timerBeeps()) {
  try {
    // "transient" lets the beep briefly duck music instead of being drowned out (Safari 16.4+)
    try { if (navigator.audioSession) navigator.audioSession.type = 'transient'; } catch {}
    const ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)()); ctx.resume?.();
    const peak = Math.max(0.0001, Math.min(1, vol / 100));
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(ctx.destination);
    for (let n = 0; n < count; n++) {
      const t0 = ctx.currentTime + n * 0.32;
      for (const [freq, share] of [[880, 1], [1760, 0.35]]) { // fundamental + an octave on top: carries better over music
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = freq; o.connect(g); g.connect(comp);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak * share, t0 + 0.015); g.gain.setValueAtTime(peak * share, t0 + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
        o.start(t0); o.stop(t0 + 0.28);
      }
    }
  } catch {}
}
/* ---------- rest-timer notifications (web push) ---------- */
// Per phone: this device's on/off lives in localStorage; the subscription lives in Supabase (push_subs).
function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
function isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
function pushOn() { return !!lsGet('rl:pushOn') && pushSupported() && Notification.permission === 'granted'; }
function vapidKey() { const k = window.RECOMP_CONFIG?.VAPID_PUBLIC_KEY || ''; const b = atob(k.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - k.length % 4) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); }
async function enablePush() {
  if (!pushSupported()) { toast(/iPhone|iPad/.test(navigator.userAgent) && !isStandalone() ? 'Open Refyne from your Home Screen icon to turn on notifications.' : 'This browser can\'t show notifications.'); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notifications are blocked. Allow them in iPhone Settings → Notifications → Refyne.'); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() });
    const j = sub.toJSON();
    const { error } = await sb.from('push_subs').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
    if (error) throw error;
    lsSet('rl:pushOn', true); toast('Notifications on for this phone');
  } catch (e) { console.error(e); toast('Couldn\'t turn on notifications: ' + (e.message || e)); }
  if (document.getElementById('settingsForm')) openSettings();
}
async function disablePush() {
  lsSet('rl:pushOn', false);
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) { await sb.from('push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); } } catch (e) { console.error(e); }
  toast('Notifications off for this phone'); if (document.getElementById('settingsForm')) openSettings();
}
async function schedulePush(sec, title = 'Rest over', body = 'Time for your next set.') {
  if (!pushOn() || !navigator.onLine || !sb) return null;
  const id = crypto.randomUUID ? crypto.randomUUID() : uid() + '-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0').slice(-12);
  const { error } = await sb.from('push_jobs').insert({ id, send_at: new Date(Date.now() + sec * 1000).toISOString(), title, body, tag: 'rest' });
  if (error) { console.error(error); return null; }
  return id;
}
async function cancelPush(id) { if (!id || !sb) return; try { await sb.from('push_jobs').delete().eq('id', id); } catch {} }
function startTimer(sec) {
  clearInterval(S.timer.handle);
  if (S.timer.pushId) { cancelPush(S.timer.pushId); S.timer.pushId = null; }
  const myRun = (S.timer.run = (S.timer.run || 0) + 1);
  schedulePush(sec).then(id => { if (id && S.timer.run === myRun) S.timer.pushId = id; else if (id) cancelPush(id); });
  try { (beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)())).resume(); } catch {}
  S.timer.end = Date.now() + sec * 1000;
  S.timer.handle = setInterval(() => {
    tickTimer();
    // still looking at the app near the end? cancel the notification and just beep here
    if (S.timer.pushId && document.visibilityState === 'visible' && S.timer.end - Date.now() < 2500) { cancelPush(S.timer.pushId); S.timer.pushId = null; }
    if (Date.now() >= S.timer.end) { clearInterval(S.timer.handle); beep(); toast('Rest over. Next set.'); }
  }, 250);
  tickTimer();
}
function numOrNull(v) { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
async function saveSession() {
  const d = getDraft(); const key = draftKey();
  const exercises = d.exercises.map(ex => ({
    name: (ex.name || '').trim(),
    sets: ex.rows.filter(r => numOrNull(r.reps) > 0).map(r => {
      const st = { kg: numOrNull(r.kg) ?? 0, reps: numOrNull(r.reps), partials: numOrNull(r.partials) || 0 };
      if (STEP_EXERCISES.has(ex.name)) st.unit = 'steps';
      if (r.drop && numOrNull(r.drop.reps) > 0) st.drop = { kg: numOrNull(r.drop.kg) ?? 0, reps: numOrNull(r.drop.reps), partials: numOrNull(r.drop.partials) || 0 };
      return st;
    }),
  })).filter(e => e.name && e.sets.length);
  if (!exercises.length) { toast('Log reps on at least one set first.'); return; }
  const doc = { date: S.date, day: S.trainDay, exercises, note: d.note || '' };
  if (S.trainDay === 'Custom' && (d.title || '').trim()) doc.name = d.title.trim();
  const pbs = detectPBs(doc, key);
  if (pbs.length) doc.pbs = pbs.map(x => x.name);
  S.sessions[key] = doc; lsSet('draft:' + key, null); delete S.drafts[key];
  render();
  if (pbs.length) celebrate(pbs.length > 1 ? `${pbs.length} new personal bests!` : 'New personal best!', pbs, gardenOn() ? `<div class="small muted">${gm().grew} too (+${GARDEN.WORKOUT}).</div>` : '');
  else toast(gardenOn() ? `Session saved. ${gm().grew} (+${GARDEN.WORKOUT})` : 'Session saved');
  store.set('sessions', key, doc);
}

/* ---------- PROGRESS ---------- */
function e1rm(st) { if (st.unit === 'steps') return st.kg; const r = Math.min(st.reps, 15); return st.kg * (1 + r / 30); }
function historyFor(name) {
  const out = [];
  for (const s of sessionsSorted().slice().reverse()) {
    const e = (s.exercises || []).find(x => x.name === name);
    if (!e || !e.sets?.length) continue;
    const best = e.sets.reduce((b, st) => e1rm(st) > e1rm(b) ? st : b, e.sets[0]);
    const top = e.sets.reduce((b, st) => (st.kg > b.kg || (st.kg === b.kg && st.reps > b.reps)) ? st : b, e.sets[0]);
    out.push({ date: s.date, e1: e1rm(best), top, sets: e.sets, src: s.source, week: s.week });
  }
  return out;
}
function niceTicks(min, max, n) {
  const span = max - min || 1; const step0 = span / n; const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || 10 * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step; const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}
function lineChart(points, opts) {
  // points: [{x: Date ms, y, y2?}]
  if (points.length < 2) return `<div class="empty">Log this ${opts.noun || 'lift'} a couple more times to see a trend line.</div>`;
  const W = 640, H = 240, L = 44, R = 64, Tp = 14, B = 28;
  const xs = points.map(p => p.x); const ys = points.flatMap(p => [p.y, p.y2].filter(v => v != null));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const { lo, hi, ticks } = niceTicks(Math.min(...ys), Math.max(...ys), 4);
  const X = x => L + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - L - R);
  const Y = y => Tp + (1 - (y - lo) / (hi - lo || 1)) * (H - Tp - B);
  let g = '<g class="grid">' + ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/>`).join('') + '</g>';
  g += '<g class="axis">' + ticks.map(t => `<text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end">${kgFmt(t)}</text>`).join('');
  const months = []; const d0 = new Date(x0); const dm = new Date(d0.getFullYear(), d0.getMonth() + 1, 1);
  for (let d = dm; d.getTime() <= x1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
  g += months.map(m => `<text x="${X(m.getTime())}" y="${H - 8}" text-anchor="middle">${m.toLocaleDateString('en-AU', { month: 'short' })}</text>`).join('') + '</g>';
  const path1 = points.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
  const area = path1 + ` L${X(points[points.length - 1].x).toFixed(1)} ${Y(lo)} L${X(points[0].x).toFixed(1)} ${Y(lo)} Z`;
  g += `<path class="a1" d="${area}"/><path class="l1" d="${path1}"/>`;
  if (opts.second) {
    const p2 = points.filter(p => p.y2 != null);
    g += p2.map(p => `<circle class="p2" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y2).toFixed(1)}" r="3"/>`).join('');
  }
  g += points.map(p => `<circle class="p1" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.2"/>`).join('');
  const last = points[points.length - 1];
  g += `<g class="end"><text x="${X(last.x) + 8}" y="${Y(last.y) + 5}">${kgFmt(r1(last.y))}${opts.unit || ''}</text></g>`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label)}">${g}</svg></div>`;
}
function viewProgressAll() {
  const v = ['body', 'photos'].includes(S.progView) ? S.progView : 'lifts';
  const seg = `<div class="seg prog-seg" role="group" aria-label="Progress view">${[['lifts', 'Lifts'], ['body', 'Body'], ['photos', 'Photos']].map(([k, l]) => `<button data-act="progView" data-v="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>`;
  return seg + (v === 'body' ? viewBody() : v === 'photos' ? viewPhotos() : viewProgress());
}
function viewProgress() {
  const sess = sessionsSorted();
  if (!sess.length) return weeklyCard() + (S.loaded.sessions || !navigator.onLine ? `<div class="card empty"><b>No lifts logged yet.</b>Save a session under Train and your progress shows up here.<div style="margin-top:8px">Have a backup file? Restore it from Settings (gear icon) → Restore from backup.</div></div>` : `<div class="card empty">Loading your lift history…</div>`);
  const lastUse = {}; for (const s of sess) for (const e of s.exercises || []) if (!lastUse[e.name]) lastUse[e.name] = s.date;
  const names = Object.keys(lastUse).sort((a, b) => lastUse[a] < lastUse[b] ? 1 : lastUse[a] > lastUse[b] ? -1 : a.localeCompare(b));
  if (!S.progressEx || !lastUse[S.progressEx]) S.progressEx = names.includes('Back squat') ? 'Back squat' : names[0];
  const h = historyFor(S.progressEx);
  const steps = STEP_EXERCISES.has(S.progressEx);
  const pts = h.map(x => ({ x: fromISO(x.date).getTime(), y: steps ? x.top.kg : x.e1, y2: steps ? null : x.top.kg }));
  const first = h[0], last = h[h.length - 1];
  const best = h.reduce((b, x) => x.e1 > b.e1 ? x : b, h[0]);
  const change = first && last ? ((last.e1 - first.e1) / first.e1) * 100 : 0;
  // summary of current program lifts
  const prog = program(); const seen = new Set(); let sumRows = '';
  for (const d of splitDays()) for (const p of prog[d]) {
    if (seen.has(p.name)) continue; seen.add(p.name);
    const hh = historyFor(p.name); if (!hh.length) continue;
    const f = hh[0], l = hh[hh.length - 1]; const ch = hh.length > 1 ? ((l.e1 - f.e1) / f.e1) * 100 : null;
    const st = STEP_EXERCISES.has(p.name);
    sumRows += `<tr><td><button class="linkbtn" data-act="pickEx" data-v="${esc(p.name)}">${esc(p.name)}</button><div class="small muted">${d}</div></td><td>${setTxt(l.top, st)}</td><td class="r">${st ? '' : kgFmt(r1(l.e1))}</td><td class="r ${ch == null ? '' : ch >= 0 ? 'up-txt' : 'down-txt'}">${ch == null ? '–' : (ch >= 0 ? '+' : '') + r0(ch) + '%'}</td></tr>`;
  }
  return `${weeklyCard()}
  <section class="sec"><h2>Lift</h2>
    <select id="exPick" aria-label="Exercise">${names.map(n => `<option ${n === S.progressEx ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
  </section>
  <section class="card" style="display:grid;gap:12px">
    <div class="stat3">
      <div class="s"><span>${steps ? 'Latest' : 'Est. 1RM now'}</span><b>${steps ? kgFmt(last.top.kg) : kgFmt(r1(last.e1))} kg</b></div>
      <div class="s"><span>${steps ? 'Sessions' : 'Best est. 1RM'}</span><b>${steps ? h.length : kgFmt(r1(best.e1)) + ' kg'}</b></div>
      <div class="s"><span>Since ${fmtDay(first.date, { day: 'numeric', month: 'short' })}</span><b class="${change >= 0 ? 'up-txt' : 'down-txt'}">${h.length > 1 ? (change >= 0 ? '+' : '') + r0(change) + '%' : '–'}</b></div>
    </div>
    ${lineChart(pts, { label: S.progressEx + ' progress', unit: ' kg', second: !steps })}
    <div class="legend">${steps ? '<span><i style="background:var(--red)"></i>Weight carried</span>' : '<span><i style="background:var(--red)"></i>Estimated 1RM (best set)</span><span><i style="background:var(--surface);border:1.5px solid var(--muted)"></i>Heaviest weight used</span>'}</div>
  </section>
  <section class="sec"><h2>Every session <span class="aside">${h.length} logged</span></h2>
    <div class="card tablewrap"><table><thead><tr><th>Date</th><th>Sets</th></tr></thead><tbody>
    ${h.slice().reverse().map(x => `<tr><td style="white-space:nowrap">${fmtDay(x.date, { day: 'numeric', month: 'short' })}${x.src === 'spreadsheet' ? `<div class="small muted">Sheet wk ${x.week}</div>` : ''}</td><td>${x.sets.map(s => setTxt(s, steps)).join(', ')}</td></tr>`).join('')}
    </tbody></table></div>
  </section>
  <section class="sec"><h2>Your program, first log vs latest</h2>
    <div class="card tablewrap"><table><thead><tr><th>Exercise</th><th>Latest top set</th><th class="r">e1RM</th><th class="r">Change</th></tr></thead><tbody>${sumRows || '<tr><td colspan="4" class="muted">No history for your current program exercises yet.</td></tr>'}</tbody></table></div>
    <div class="small muted">Estimated 1RM uses the Epley formula on your best set (full reps only), so lifts at different rep counts compare fairly. Machine swaps show as separate exercises.</div>
  </section>`;
}

/* ---------- BODY ---------- */
function weightList() { return Object.values(S.weights).filter(w => w.kg).sort((a, b) => a.date < b.date ? -1 : 1); }
function avgBetween(list, from, to) { const xs = list.filter(w => w.date >= from && w.date <= to).map(w => w.kg); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; }
function measureSection() {
  const all = Object.values(S.weights).sort((a, b) => a.date < b.date ? -1 : 1);
  const have = MEASURES.filter(([k]) => all.some(w => w[k]));
  if (!have.length) return '';
  if (!S.measure || !have.some(([k]) => k === S.measure)) S.measure = have[0][0];
  const k = S.measure; const pts = all.filter(w => w[k]).map(w => ({ x: fromISO(w.date).getTime(), y: w[k] }));
  const first = pts[0], last = pts[pts.length - 1]; const diff = last.y - first.y;
  return `<section class="sec"><h2>Measurements</h2>
    <div class="card" style="display:grid;gap:12px">
      <div class="seg" role="group" aria-label="Measurement">${have.map(([id, name]) => `<button data-act="measure" data-v="${id}" aria-pressed="${id === k}">${name}</button>`).join('')}</div>
      <div class="stat3">
        <div class="s"><span>Latest</span><b>${last.y} cm</b></div>
        <div class="s"><span>First</span><b>${first.y} cm</b></div>
        <div class="s"><span>Change</span><b class="${pts.length < 2 ? '' : (k === 'waist' || k === 'hips') ? (diff <= 0 ? 'up-txt' : 'down-txt') : (diff >= 0 ? 'up-txt' : 'down-txt')}">${pts.length > 1 ? (diff > 0 ? '+' : '') + r1(diff) + ' cm' : '–'}</b></div>
      </div>
      ${lineChart(pts, { label: MEASURES.find(m => m[0] === k)[1] + ' over time', unit: ' cm', noun: 'measurement' })}
    </div></section>`;
}
function viewBody() {
  const list = weightList(); const today = todayISO();
  const todayW = S.weights[today];
  const a7 = avgBetween(list, addDays(today, -6), today);
  const p7 = avgBetween(list, addDays(today, -13), addDays(today, -7));
  const rate = a7 != null && p7 != null ? a7 - p7 : null;
  const waists = list.filter(w => w.waist);
  const lastWaist = waists[waists.length - 1];
  const firstWaist = waists[0];
  let advice = 'Weigh in each morning after the toilet, before food. The 7-day average matters, not single days.';
  if (rate != null) {
    if (rate < -0.5) advice = `Down ${r1(-rate)} kg on last week's average. That's faster than a recomp needs, so add about 150 kcal a day (Settings) to protect muscle.`;
    else if (rate > 0.4) advice = `Up ${r1(rate)} kg on last week's average. One week can be water or creatine; if it repeats, trim 100–150 kcal.`;
    else advice = `Within ${r1(Math.abs(rate))} kg of last week's average. For a recomp that's on track: steady weight, waist and lifts doing the talking.`;
  }
  const span = list.length ? (fromISO(list[list.length - 1].date) - fromISO(list[0].date)) / 864e5 : 0;
  if (span >= 28 && firstWaist && lastWaist && rate != null && Math.abs(rate) <= 0.1 && lastWaist.waist >= firstWaist.waist) {
    advice = 'Four weeks in with weight and waist both flat. Drop 100–150 kcal or add 2–3k steps a day, not both.';
  }
  const pts = list.map((w, i) => {
    const from = addDays(w.date, -6);
    const avg = avgBetween(list.slice(0, i + 1), from, w.date);
    return { x: fromISO(w.date).getTime(), y: avg, y2: w.kg };
  });
  return `
  <section class="sec"><h2>Weigh-in</h2>
    <form id="weightForm" class="card" style="display:grid;gap:10px">
      <div class="formrow">
        <label class="f">Date<input type="date" id="w_date" value="${today}" max="${today}"></label>
        <label class="f">Weight kg<input type="number" id="w_kg" inputmode="decimal" step="0.1" min="30" max="250" value="${todayW?.kg ?? ''}"></label>
        <label class="f">Waist cm<input type="number" id="w_waist" inputmode="decimal" step="0.5" min="40" max="200" placeholder="weekly, at navel" value="${todayW?.waist ?? ''}"></label>
      </div>
      <details class="more-meas"${['arms', 'chest', 'hips', 'thighs'].some(k => todayW?.[k]) ? ' open' : ''}><summary>More measurements</summary>
        <div class="grid4">
          <label class="f">Arms cm<input type="number" id="w_arms" inputmode="decimal" step="0.5" min="15" max="70" placeholder="flexed" value="${todayW?.arms ?? ''}"></label>
          <label class="f">Chest cm<input type="number" id="w_chest" inputmode="decimal" step="0.5" min="50" max="180" value="${todayW?.chest ?? ''}"></label>
          <label class="f">Hips cm<input type="number" id="w_hips" inputmode="decimal" step="0.5" min="50" max="200" value="${todayW?.hips ?? ''}"></label>
          <label class="f">Thighs cm<input type="number" id="w_thighs" inputmode="decimal" step="0.5" min="30" max="110" value="${todayW?.thighs ?? ''}"></label>
        </div>
        <div class="small muted">Measure every 1–2 weeks, same time of day, tape snug but not tight.</div>
      </details>
      <div><button class="btn" type="submit">Save weigh-in</button></div>
    </form>
  </section>
  ${measureSection()}
  <section class="card" style="display:grid;gap:12px">
    <div class="stat3">
      <div class="s"><span>7-day avg</span><b>${a7 != null ? r1(a7) + ' kg' : '–'}</b></div>
      <div class="s"><span>vs prior week</span><b class="${rate == null ? '' : rate <= 0 ? 'up-txt' : 'down-txt'}">${rate != null ? (rate > 0 ? '+' : '') + r1(rate) + ' kg' : '–'}</b></div>
      <div class="s"><span>Waist</span><b>${lastWaist ? lastWaist.waist + ' cm' : '–'}</b>${firstWaist && lastWaist && firstWaist !== lastWaist ? `<span class="small" style="text-transform:none;letter-spacing:0">${lastWaist.waist - firstWaist.waist <= 0 ? '' : '+'}${r1(lastWaist.waist - firstWaist.waist)} cm since ${fmtDay(firstWaist.date, { day: 'numeric', month: 'short' })}</span>` : ''}</div>
    </div>
    ${list.length ? lineChart(pts, { label: 'Body weight, 7-day average', unit: ' kg', second: true, noun: 'weigh-in' }) : `<div class="empty"><b>No weigh-ins yet.</b>Your starting point is about 75 kg. Log tomorrow morning's weight to start the trend.</div>`}
    ${list.length ? `<div class="legend"><span><i style="background:var(--red)"></i>7-day average</span><span><i style="background:var(--surface);border:1.5px solid var(--muted)"></i>Daily weigh-in</span></div>` : ''}
    <div class="small">${advice}</div>
  </section>
  ${Object.keys(S.weights).length ? `<section class="sec"><h2>Log</h2><div class="card tablewrap"><table><thead><tr><th>Date</th><th class="r">kg</th><th class="r">Waist</th><th></th></tr></thead><tbody>
    ${Object.values(S.weights).sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 30).map(w => `<tr><td>${fmtDay(w.date)}${['arms', 'chest', 'hips', 'thighs'].some(k => w[k]) ? `<div class="small muted">${['arms', 'chest', 'hips', 'thighs'].filter(k => w[k]).map(k => `${k[0].toUpperCase() + k.slice(1)} ${w[k]}`).join(' · ')}</div>` : ''}</td><td class="r">${w.kg ?? ''}</td><td class="r">${w.waist ?? ''}</td><td class="r"><button class="linkbtn" style="color:var(--muted)" data-act="delWeight" data-v="${w.date}">Remove</button></td></tr>`).join('')}
  </tbody></table></div></section>` : ''}`;
}

/* ---------- PHOTOS ---------- */
function photoList() { return Object.entries(S.photos).map(([id, p]) => ({ id, ...p })).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : POSES.indexOf(a.pose) - POSES.indexOf(b.pose)); }
function nearestWeight(date) { const l = weightList(); let best = null; for (const w of l) if (!best || Math.abs(fromISO(w.date) - fromISO(date)) < Math.abs(fromISO(best.date) - fromISO(date))) best = w; return best && Math.abs(fromISO(best.date) - fromISO(date)) <= 3 * 864e5 ? best : null; }
function phTile(p) {
  const src = photoSrc(p);
  return `<div class="ph">${src ? `<img src="${esc(src)}" alt="${esc(p.pose)} photo, ${fmtDay(p.date)}" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="ph-off">${navigator.onLine ? 'Loading…' : 'Offline'}</span>`}
    <span class="tag">${esc(p.pose)}</span>
    ${canUpload() ? `<button class="x" data-act="askDelPhoto" data-id="${p.id}" aria-label="Delete photo">×</button>` : ''}
    ${S.confirmPhoto === p.id ? `<div class="confirm">Delete this photo for good?<span style="display:flex;gap:6px;justify-content:center"><button class="btn danger sm" data-act="delPhoto" data-id="${p.id}">Delete</button><button class="btn ghost sm" style="color:#fff;border-color:#fff" data-act="cancelDelPhoto">Keep</button></span></div>` : ''}
  </div>`;
}
function viewPhotos() {
  const list = photoList(); const dates = [...new Set(list.map(p => p.date))];
  const up = canUpload() ? `<form id="photoForm" class="card" style="display:grid;gap:10px">
      <div class="formrow">
        <label class="f">Pose<select id="ph_pose">${POSES.map(p => `<option>${p}</option>`).join('')}</select></label>
        <label class="f">Date<input type="date" id="ph_date" value="${todayISO()}" max="${todayISO()}"></label>
      </div>
      <label class="f">Photo<input type="file" id="ph_file" accept="image/*" required></label>
      <div><button class="btn" type="submit" ${S.uploading ? 'disabled' : ''}>${S.uploading ? 'Uploading…' : 'Add photo'}</button></div>
      <div class="small muted">Same spot, same light, same time of day every 2–3 weeks. Photos are shrunk to 1600 px and stored in a private bucket that only your login can open.</div>
    </form>` : `<div class="card small muted">${navigator.onLine ? 'Sign in to add photos.' : 'You\'re offline. Photos upload once you have signal again; everything else still saves.'}</div>`;
  let compare = '';
  if (dates.length >= 2) {
    const a = S.compare.a && dates.includes(S.compare.a) ? S.compare.a : dates[dates.length - 1];
    const b = S.compare.b && dates.includes(S.compare.b) ? S.compare.b : dates[0];
    const pose = S.compare.pose;
    const pa = list.find(p => p.date === a && p.pose === pose), pb = list.find(p => p.date === b && p.pose === pose);
    const wa = nearestWeight(a), wb = nearestWeight(b);
    const opt = sel => dates.map(d => `<option value="${d}" ${d === sel ? 'selected' : ''}>${fmtDay(d, { day: 'numeric', month: 'short', year: 'numeric' })}</option>`).join('');
    compare = `<section class="sec"><h2>Compare</h2><div class="card" style="display:grid;gap:10px">
      <div class="formrow"><label class="f">Before<select id="cmpA">${opt(a)}</select></label><label class="f">After<select id="cmpB">${opt(b)}</select></label>
      <label class="f">Pose<select id="cmpPose">${POSES.map(p => `<option ${p === pose ? 'selected' : ''}>${p}</option>`).join('')}</select></label></div>
      <div class="compare">
        <div>${pa ? `<div class="ph">${photoSrc(pa) ? `<img src="${esc(photoSrc(pa))}" alt="${pose} ${fmtDay(a)}">` : '<span class="ph-off">Offline</span>'}</div>` : `<div class="ph" style="display:grid;place-items:center"><span class="small muted">No ${pose.toLowerCase()} photo</span></div>`}<div class="cap">${fmtDay(a, { day: 'numeric', month: 'short' })}${wa ? ` · ${wa.kg} kg` : ''}</div></div>
        <div>${pb ? `<div class="ph">${photoSrc(pb) ? `<img src="${esc(photoSrc(pb))}" alt="${pose} ${fmtDay(b)}">` : '<span class="ph-off">Offline</span>'}</div>` : `<div class="ph" style="display:grid;place-items:center"><span class="small muted">No ${pose.toLowerCase()} photo</span></div>`}<div class="cap">${fmtDay(b, { day: 'numeric', month: 'short' })}${wb ? ` · ${wb.kg} kg` : ''}</div></div>
      </div></div></section>`;
  }
  const gal = dates.length ? `<div class="gal">${dates.map(d => `<div class="day"><div class="slotlabel" style="padding-top:0">${fmtDay(d, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div class="imgs">${list.filter(p => p.date === d).map(phTile).join('')}</div></div>`).join('')}</div>`
    : `<div class="card empty"><b>No progress photos yet.</b>Take front, side and back photos today as your baseline. In 3 weeks you can compare them side by side here.</div>`;
  return `<section class="sec"><h2>Add a progress photo</h2>${up}</section>${compare}<section class="sec"><h2>Timeline</h2>${gal}</section>`;
}
function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const max = 1600; let { naturalWidth: w, naturalHeight: h } = img; const k = Math.min(1, max / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error('encode')), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image. Try a JPEG or PNG.')); };
    img.src = url;
  });
}

const RECIPE_GROCERY = {"B1":[["egg_white",100.0],["whey",20.0],["oats",50.0],["banana",100.0],["peanut_butter",15.0],["berries",80.0],["maple",10.0]],"B2":[["oats",55.0],["whey",20.0],["greek_yog_0",150.0],["skim_milk",150.0],["banana",60.0],["peanut_butter",10.0],["chia",5.0]],"B3":[["sourdough",120.0],["egg_white",100.0],["egg",55.0],["greek_yog_0",100.0],["berries",80.0],["maple",10.0]],"B4":[["egg_white",100.0],["egg",55.0],["cottage_cheese",100.0],["spinach",40.0],["tomato",80.0],["sourdough",120.0],["avocado",40.0]],"L1":[["chicken_breast",150.0],["olive_oil",5.0],["brown_rice_cooked",190.0],["black_beans",70.0],["corn",40.0],["capsicum",50.0],["tomato",50.0],["greek_yog_0",40.0],["avocado",40.0],["salsa",30.0]],"L2":[["chicken_breast",160.0],["olive_oil",5.0],["white_rice_cooked",190.0],["cucumber",80.0],["carrot",50.0],["cabbage",50.0],["avocado",30.0],["greek_yog_0",25.0],["mayo",8.0],["sweet_chilli",8.0],["sriracha",5.0],["honey",5.0],["rice_vinegar",5.0]],"L3":[["chicken_breast",150.0],["flour",12.0],["olive_oil",7.0],["orzo_dry",85.0],["broth",150.0],["spinach",30.0],["tomato",60.0],["parmesan",10.0],["lime",15.0]],"L4":[["turkey_mince",150.0],["penne_dry",85.0],["passata",150.0],["onion",40.0],["spinach",30.0],["light_mozz",25.0],["olive_oil",3.0]],"D1":[["lean_beef",150.0],["broccoli",150.0],["olive_oil",7.0],["soy",25.0],["broth",25.0],["cornflour",4.0],["white_rice_cooked",250.0]],"D2":[["salmon",140.0],["white_rice_cooked",170.0],["soy",15.0],["sriracha",5.0],["kewpie",5.0],["avocado",30.0],["kimchi",60.0],["edamame",50.0],["nori",1]],"D3":[["turkey_mince",140.0],["taco_season",10.0],["olive_oil",3.0],["tortilla",90.0],["light_cheese",20.0],["salsa",60.0],["tomato",50.0],["lettuce",30.0],["black_beans",60.0],["greek_yog_0",40.0]],"D4":[["chicken_thigh",180.0],["sweet_potato",330.0],["olive_oil",7.0],["broccolini",100.0],["greek_yog_0",60.0]],"S1":[["cottage_cheese",200.0],["maple",10.0],["choc_chips",10.0],["rice_cake",22.0],["strawberries",150.0]],"S2":[["whey",35.0],["strawberries",200.0],["almond_milk",100.0],["granola",25.0],["banana",50.0]],"S3":[["greek_yog_0",166.7],["whey",20.0],["honey",10.0],["choc_chips",16.7],["almonds",10.0],["berries",33.3]],"S4":[["whey",25.0],["egg_white",60.0],["banana",100.0],["oats",20.0],["greek_yog_0",100.0],["peanut_butter",10.0]]};
/* =====================================================================
   FEATURES: onboarding, password, barcode, grocery, PBs, weekly summary,
   measurements, supplements, streaks, garden tab
   ===================================================================== */
const cfgCopy = () => JSON.parse(JSON.stringify(S.config || {}));

/* ---------- first-run setup ---------- */
const ACTIVITY = [
  { id: 'low', label: 'Mostly sitting, little exercise', mult: 1.3 },
  { id: 'light', label: 'Training 2–3 days a week', mult: 1.45 },
  { id: 'mod', label: 'Training 4–5 days a week', mult: 1.55 },
  { id: 'high', label: 'Training 6+ days, or a physical job', mult: 1.7 },
];
const GOALS = [
  { id: 'lose', label: 'Lose fat', adj: 0.8, protein: 2.0 },
  { id: 'recomp', label: 'Lose fat and build muscle', adj: 0.9, protein: 2.0 },
  { id: 'maintain', label: 'Stay where I am', adj: 1.0, protein: 1.8 },
  { id: 'gain', label: 'Build muscle', adj: 1.1, protein: 1.8 },
];
function calcTargets(p) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'female' ? -161 : 5);
  const tdee = bmr * (ACTIVITY.find(a => a.id === p.activity)?.mult || 1.45);
  const goal = GOALS.find(g => g.id === p.goal) || GOALS[1];
  const kcal = Math.round((tdee * goal.adj) / 50) * 50;
  const prot = Math.round((p.weight * goal.protein) / 5) * 5;
  const fat = Math.round(Math.max(p.weight * 0.8, (kcal * 0.25) / 9) / 5) * 5;
  const carbs = Math.max(50, Math.round((kcal - prot * 4 - fat * 9) / 4 / 5) * 5);
  return { kcal, p: prot, c: carbs, f: fat, tdee: Math.round(tdee / 10) * 10 };
}
function needsOnboarding() { return !!(S.user && S.lastPull && !S.config?.onboarded && !S.config?.targets); }
function openOnboarding(step) {
  S.ob = S.ob || { step: 1, d: { sex: 'female', activity: 'light', goal: 'recomp', theme: S.config?.theme || 'pink', flower: S.config?.flower || DEFAULT_FLOWER } };
  if (step) S.ob.step = step;
  const d = S.ob.d; const st = S.ob.step;
  const dots = [1, 2, 3, 4, 5].map(i => `<span class="ob-dot${i === st ? ' on' : ''}${i < st ? ' done' : ''}"></span>`).join('');
  let body = '';
  if (st === 1) {
    body = `<h3>Welcome to Refyne</h3>
      <p class="muted">Two minutes of setup and the app works out calorie and protein targets for your body and goal.</p>
      ${S.ob.err ? `<div class="gate-err">${esc(S.ob.err)}</div>` : ''}
      <label class="f">First name (optional)<input type="text" id="ob_name" autocomplete="given-name" value="${esc(d.name || '')}"></label>
      <div class="f"><span>Body</span><div class="seg" role="group" aria-label="Sex for calorie formula">
        <button type="button" data-act="ob-set" data-k="sex" data-v="female" aria-pressed="${d.sex === 'female'}">Female</button>
        <button type="button" data-act="ob-set" data-k="sex" data-v="male" aria-pressed="${d.sex === 'male'}">Male</button></div>
        <span class="small muted">Only used in the calorie formula.</span></div>
      <div class="grid3">
        <label class="f">Age<input type="number" id="ob_age" inputmode="numeric" min="14" max="90" value="${d.age ?? ''}"></label>
        <label class="f">Height cm<input type="number" id="ob_h" inputmode="decimal" min="120" max="230" value="${d.height ?? ''}"></label>
        <label class="f">Weight kg<input type="number" id="ob_w" inputmode="decimal" step="0.1" min="35" max="250" value="${d.weight ?? ''}"></label>
      </div>
      <div class="ob-actions"><button type="button" class="linkbtn muted" data-act="ob-skip">Skip setup</button><button type="button" class="btn" data-act="ob-next">Next</button></div>`;
  } else if (st === 2) {
    body = `<h3>Your week and your goal</h3>
      <div class="f"><span>How active are you?</span><div class="ob-list">${ACTIVITY.map(a => `<button type="button" class="ob-opt" data-act="ob-set" data-k="activity" data-v="${a.id}" aria-pressed="${d.activity === a.id}">${a.label}</button>`).join('')}</div></div>
      <div class="f"><span>What's your goal?</span><div class="ob-list">${GOALS.map(g => `<button type="button" class="ob-opt" data-act="ob-set" data-k="goal" data-v="${g.id}" aria-pressed="${d.goal === g.id}">${g.label}</button>`).join('')}</div></div>
      <div class="ob-actions"><button type="button" class="btn ghost" data-act="ob-back">Back</button><button type="button" class="btn" data-act="ob-next">See my targets</button></div>`;
  } else if (st === 3) {
    const t = d.targets || calcTargets(d);
    const g = GOALS.find(x => x.id === d.goal);
    body = `<h3>Your daily targets</h3>
      <p class="muted">Maintenance is about ${t.tdee?.toLocaleString() || '–'} kcal a day. For "${esc(g.label.toLowerCase())}" we've set:</p>
      <div class="card ob-targets">
        <div class="ob-big"><b id="ob_kcal_show">${t.kcal.toLocaleString()}</b><span>kcal a day</span></div>
        <div class="grid4">
          <label class="f">kcal<input type="number" id="ob_kcal" value="${t.kcal}" min="1000" max="5000"></label>
          <label class="f">Protein g<input type="number" id="ob_p" value="${t.p}" min="0" max="400"></label>
          <label class="f">Carbs g<input type="number" id="ob_c" value="${t.c}" min="0" max="800"></label>
          <label class="f">Fat g<input type="number" id="ob_f" value="${t.f}" min="0" max="300"></label>
        </div>
        <div class="small muted">Protein is set at ${g.protein} g per kg of body weight to protect and build muscle. You can change any of these later in Settings.</div>
      </div>
      <div class="ob-actions"><button type="button" class="btn ghost" data-act="ob-back">Back</button><button type="button" class="btn" data-act="ob-next">Looks good</button></div>`;
  } else if (st === 4) {
    const t = d.targets || calcTargets(d); const { n, html } = starterPickerHTML(t.kcal);
    body = `<h3>Starter meals</h3>
      <p class="muted">Want some meals to get you going? Pick your eating style, leave out anything you can't have, and tick the ones you like. They're sized to your ${t.kcal.toLocaleString()} kcal a day.</p>
      ${html}
      <div class="ob-actions"><button type="button" class="btn ghost" data-act="ob-back">Back</button><button type="button" class="linkbtn muted" data-act="ob-skipmeals">Skip for now</button><button type="button" class="btn" data-act="ob-next">${n ? `Add ${n} & continue` : 'Continue'}</button></div>
      <div class="small muted">You can add starter meals any time from Log food or Settings.</div>`;
  } else {
    body = `<h3>Make it yours</h3>
      <div class="f"><span>Colour</span><div class="swatches">${THEMES.map(t => `<button type="button" class="swatch" data-act="ob-theme" data-v="${t.id}" aria-pressed="${d.theme === t.id}" title="${t.name}">
        <span class="sw" style="${t.bg ? `background:${t.bg};border-color:${t.line}` : 'background:linear-gradient(135deg,#F1F1EC 50%,#11151A 50%)'}"></span><span class="swn">${t.name}</span></button>`).join('')}</div></div>
      ${obGrowHTML(d)}
      ${d.redo ? '' : `<div class="f"><span>Your training</span><div class="start-pick">
        <button type="button" class="card start-opt" data-act="ob-start" data-v="blank" aria-pressed="${(d.start || 'blank') === 'blank'}"><b>Build my own split</b><span class="small muted">Start with no workouts and set up your own training days in Settings.</span></button>
        <button type="button" class="card start-opt" data-act="ob-start" data-v="starter" aria-pressed="${d.start === 'starter'}"><b>Use the starter split</b><span class="small muted">A 5-day Push / Pull / Legs / Upper / Lower split. Everything's editable.</span></button></div></div>`}
      <div class="ob-actions"><button type="button" class="btn ghost" data-act="ob-back">Back</button><button type="button" class="btn" data-act="ob-finish">Start logging</button></div>`;
  }
  const prevScroll = st >= 4 && S.ob.lastStep === st ? (document.querySelector('#sheetRoot .sheet .panel')?.scrollTop || 0) : 0; S.ob.lastStep = st;
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet ob"><div class="panel"><div class="wrap ob-wrap"><div class="ob-dots" aria-label="Step ${st} of 5">${dots}</div>${body}</div></div></div>`;
  const pn = document.querySelector('#sheetRoot .sheet .panel'); if (pn) pn.scrollTop = prevScroll;
}
// A tiny hand-drawn heart with sparkles, for the soft themes.
function cuteMoji() { return `<svg class="cutemoji" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z" fill="#F4A6C6" stroke="#E86CA2" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.2 11.2a1.8 1.8 0 0 1 1.6-1.4" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/><path d="M20 2.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill="#C9B6F2"/><path d="M4 2.8l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z" fill="#FFC4A3"/></svg>`; }
function obGrowHTML(d) {
  const soft = isSoftId(d.theme); const on = d.garden !== false;
  const g = growKind(d.theme, soft ? d.growSoft : d.grow);
  const vb = BONSAI[d.bonsai] ? d.bonsai : soft ? DEFAULT_BONSAI_SOFT : DEFAULT_BONSAI;
  const vc = CAR_STYLES[d.car] && !!CAR_STYLES[d.car].soft === soft ? d.car : soft ? DEFAULT_CAR_SOFT : DEFAULT_CAR;
  const sub = !on ? '' : g === 'flower' ? `<div class="f"><span>Your flower</span>${flowerPicker('ob-flower', d.flower)}</div>`
    : g === 'bonsai' ? `<div class="f"><span>Bonsai type</span>${bonsaiPicker('ob-bonsai', vb)}</div>`
    : `<div class="f"><span>Car style</span>${carPicker('ob-car', vc, soft)}</div>`;
  return `<div class="f"><span>Grow something</span>
      <div class="small muted ob-grow-note">${soft ? `Just a little extra motivation for the girls ${cuteMoji()}` : 'Just a bit of extra motivation.'} It grows every time you log, and fastest when you work out. Finished ones get their own tab.</div>
      <div class="seg" role="group" aria-label="Grow something"><button type="button" data-act="ob-garden" data-v="on" aria-pressed="${on}">Show it</button><button type="button" data-act="ob-garden" data-v="off" aria-pressed="${!on}">Hide it</button></div>
      <div class="small muted">${on ? 'Not your thing? Hide it now.' : 'Hidden.'} You can turn it ${on ? 'off' : 'back on'} any time in Settings → Grow something.</div>
      ${on ? growPicker(g, 'ob-grow', g, soft, vb, vc) : ''}</div>${sub}`;
}
function obReadStep() {
  const d = S.ob.d; const v = id => document.getElementById(id)?.value;
  if (S.ob.step === 1) {
    d.name = (v('ob_name') || '').trim(); d.age = numOrNull(v('ob_age')); d.height = numOrNull(v('ob_h')); d.weight = numOrNull(v('ob_w'));
    if (!d.age || d.age < 14 || d.age > 90) return 'Enter your age (14–90).';
    if (!d.height || d.height < 120 || d.height > 230) return 'Enter your height in centimetres (e.g. 168).';
    if (!d.weight || d.weight < 35 || d.weight > 250) return 'Enter your weight in kilograms (e.g. 62.5).';
    d.targets = null;
  } else if (S.ob.step === 2) {
    d.targets = calcTargets(d);
  } else if (S.ob.step === 3) {
    d.targets = { ...(d.targets || calcTargets(d)), kcal: +v('ob_kcal') || d.targets.kcal, p: +v('ob_p') || 0, c: +v('ob_c') || 0, f: +v('ob_f') || 0 };
  }
  return null;
}
function obFinish(skip) {
  const cfg = cfgCopy();
  cfg.onboarded = true;
  if (!skip) {
    const d = S.ob.d; const t = d.targets || calcTargets(d);
    cfg.targets = { kcal: t.kcal, p: t.p, c: t.c, f: t.f };
    cfg.profile = { name: d.name || '', sex: d.sex, age: d.age, height: d.height, weight: d.weight, activity: d.activity, goal: d.goal };
    cfg.theme = d.theme; cfg.flower = d.flower; if (d.grow) cfg.grow = d.grow; if (d.growSoft) cfg.growSoft = d.growSoft;
    if (d.garden != null) cfg.garden = d.garden; if (d.bonsai) cfg.bonsai = d.bonsai; if (d.car) cfg[CAR_STYLES[d.car].soft ? 'carSoft' : 'car'] = d.car;
    if (d.weight && !S.weights[todayISO()]) store.set('weights', todayISO(), { date: todayISO(), kg: d.weight });
  }
  // brand-new accounts start blank unless they chose the starter plan (redoing setup never touches meals or the split)
  const hasHistory = Object.keys(S.days).length || Object.keys(S.sessions).length || Object.keys(S.weights).filter(k => k !== todayISO()).length || (cfg.foods || []).length;
  const firstTime = !S.ob?.d?.redo && !cfg.split && !cfg.program && !hasHistory;
  // new accounts never get the old fixed meal plan; they pick starter meals sized to their own targets instead
  if (firstTime) { cfg.hiddenRecipes = RECIPES.map(r => r.id); if (skip || (S.ob?.d?.start || 'blank') === 'blank') { cfg.split = []; cfg.program = {}; } else cfg.split = starterSplit(); }
  const added = skip ? 0 : addStarterMeals(cfg, cfg.targets?.kcal || targets().kcal); if (skip) S.sp = null;
  S.ob = null; document.getElementById('sheetRoot').innerHTML = '';
  applyTheme(cfg.theme || 'auto'); saveConfig(cfg);
  toast(skip ? 'You can do setup any time from Settings.' : `All set${cfg.profile?.name ? ', ' + cfg.profile.name : ''}.${added ? ` ${added} starter meal${added > 1 ? 's' : ''} added to your plan.` : ''} Happy logging!`);
}

/* ---------- change password ---------- */
async function changePassword() {
  const a = document.getElementById('pw1')?.value || '', b = document.getElementById('pw2')?.value || '';
  const msg = document.getElementById('pwMsg');
  const say = (t, bad) => { if (msg) { msg.textContent = t; msg.className = 'small ' + (bad ? 'down-txt' : 'up-txt'); } };
  if (a.length < 8) return say('Use at least 8 characters.', true);
  if (a !== b) return say('The two passwords don\'t match.', true);
  if (!navigator.onLine || !sb) return say('You need signal to change your password.', true);
  const { error } = await sb.auth.updateUser({ password: a });
  if (error) return say(error.message || 'Could not change the password. Try again.', true);
  document.getElementById('pw1').value = ''; document.getElementById('pw2').value = '';
  say('Password changed. Use it next time you sign in.'); toast('Password changed');
}

/* ---------- barcode scanner (Open Food Facts) ---------- */
S.scan = { code: '', status: 'idle', product: null };
function loadScript(src) {
  return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load')); document.head.appendChild(s); });
}
let scanReader = null;
async function openScanner() {
  const root = document.getElementById('scanRoot');
  root.innerHTML = `<div class="scan-overlay" role="dialog" aria-label="Scan a barcode"><video id="scanVideo" playsinline muted></video><div class="scan-frame" aria-hidden="true"></div>
    <div class="scan-ui"><div class="scan-tip" id="scanTip">Point the camera at the barcode</div><button type="button" class="btn" data-act="closeScanner">Cancel</button></div></div>`;
  root.hidden = false;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocam');
    await loadScript('vendor/zxing.min.js');
    const Z = window.ZXing;
    const hints = new Map(); hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
    scanReader = new Z.BrowserMultiFormatReader(hints, 250);
    await scanReader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, document.getElementById('scanVideo'), (result) => {
      if (result) { const code = result.getText(); closeScanner(); if (navigator.vibrate) navigator.vibrate(60); lookupBarcode(code); }
    });
  } catch (e) {
    console.error(e);
    const tip = document.getElementById('scanTip');
    if (tip) tip.textContent = e?.name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in iPhone Settings → Safari → Camera, or type the barcode number instead.' : 'The camera isn\'t available here. Type the barcode number instead.';
  }
}
function closeScanner() {
  try { scanReader?.reset(); } catch {}
  scanReader = null;
  const v = document.getElementById('scanVideo'); if (v?.srcObject) v.srcObject.getTracks().forEach(t => t.stop());
  const root = document.getElementById('scanRoot'); root.hidden = true; root.innerHTML = '';
}
async function lookupBarcode(code) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length < 6) { toast('That doesn\'t look like a barcode number.'); return; }
  if (S.build?.mode !== 'scan') S.foodAdd = 'scan'; S.scan = { code, status: 'loading', product: null }; render();
  const cache = lsGet('rl:off:' + code);
  if (cache) { S.scan = { code, status: 'found', product: cache, grams: cache.serving || 100 }; render(); return; }
  if (!navigator.onLine) { S.scan = { code, status: 'error', product: null, msg: 'You\'re offline. Scan again when you have signal.' }; render(); return; }
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_en,brands,nutriments,serving_quantity,serving_size,quantity`);
    const j = await res.json();
    if (j.status !== 1 || !j.product) { S.scan = { code, status: 'notfound' }; render(); return; }
    const p = j.product, n = p.nutriments || {};
    const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] != null ? n['energy_100g'] / 4.184 : null);
    if (kcal == null) { S.scan = { code, status: 'notfound', partial: p.product_name }; render(); return; }
    const prod = { name: (p.product_name_en || p.product_name || 'Unnamed product').trim(), brand: (p.brands || '').split(',')[0].trim(), kcal: +kcal, p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0), nut: offNut(n), serving: +p.serving_quantity || null, servingLabel: p.serving_size || '', size: p.quantity || '' };
    lsSet('rl:off:' + code, prod);
    S.scan = { code, status: 'found', product: prod, grams: prod.serving || 100 }; render();
  } catch (e) { console.error(e); S.scan = { code, status: 'error', msg: 'Couldn\'t reach the food database. Check your signal and try again.' }; render(); }
}
/* ---------- food search: common foods built in + Open Food Facts for packaged foods ---------- */
// [name, kcal, protein, carbs, fat per 100 g, serve g, serve label, nutrient key, extra search words]
// Values are typical figures from USDA FoodData Central / AUSNUT; cooked weights unless it says otherwise.
const COMMON_FOODS = [
  ['Apple', 52, 0.3, 14, 0.2, 180, '1 medium'], ['Banana', 89, 1.1, 23, 0.3, 120, '1 medium', 'banana'], ['Orange', 47, 0.9, 12, 0.1, 160, '1 medium'],
  ['Mandarin', 53, 0.8, 13, 0.3, 90, '1 medium'], ['Strawberries', 32, 0.7, 7.7, 0.3, 150, '1 cup', 'strawberries'], ['Blueberries', 57, 0.7, 14.5, 0.3, 150, '1 cup', 'berries', 'berry'],
  ['Grapes', 69, 0.7, 18, 0.2, 150, '1 cup'], ['Watermelon', 30, 0.6, 7.6, 0.2, 280, '1 wedge', null, 'melon'], ['Mango', 60, 0.8, 15, 0.4, 200, '1 mango'],
  ['Pineapple', 50, 0.5, 13, 0.1, 165, '1 cup'], ['Kiwifruit', 61, 1.1, 15, 0.5, 75, '1 kiwi'], ['Pear', 57, 0.4, 15, 0.1, 180, '1 medium'],
  ['Avocado', 160, 2, 8.5, 14.7, 75, '½ avocado', 'avocado'], ['Medjool dates', 277, 1.8, 75, 0.2, 24, '1 date'], ['Sultanas / raisins', 299, 3.1, 79, 0.5, 30, '1 small box'],
  ['Broccoli', 34, 2.8, 7, 0.4, 100, '1 cup', 'broccoli'], ['Carrot', 41, 0.9, 10, 0.2, 70, '1 medium', 'carrot'], ['Potato (boiled)', 87, 1.9, 20, 0.1, 150, '1 medium', null, 'potatoes spud'],
  ['Sweet potato (baked)', 90, 2, 21, 0.2, 150, '1 medium', 'sweet_potato'], ['Spinach', 23, 2.9, 3.6, 0.4, 30, '1 cup', 'spinach'], ['Tomato', 18, 0.9, 3.9, 0.2, 120, '1 medium', 'tomato'],
  ['Cucumber', 15, 0.7, 3.6, 0.1, 100, '½ cucumber', 'cucumber'], ['Capsicum', 31, 1, 6, 0.3, 120, '1 medium', 'capsicum', 'pepper'], ['Corn on the cob', 96, 3.4, 21, 1.5, 100, '1 cob', 'corn'],
  ['Peas', 81, 5.4, 14, 0.4, 80, '½ cup'], ['Salad leaves', 17, 1.3, 3, 0.2, 50, '1 cup', 'lettuce', 'lettuce'], ['Mushrooms', 22, 3.1, 3.3, 0.3, 70, '1 cup'],
  ['Onion', 40, 1.1, 9, 0.1, 110, '1 medium', 'onion'], ['Zucchini', 17, 1.2, 3.1, 0.3, 200, '1 medium'], ['Pumpkin (roasted)', 45, 1, 11, 0.1, 150, '1 cup'],
  ['Green beans', 31, 1.8, 7, 0.2, 100, '1 cup'], ['Cauliflower', 25, 1.9, 5, 0.3, 100, '1 cup'],
  ['White rice (cooked)', 130, 2.7, 28, 0.3, 180, '1 cup', 'white_rice_cooked', 'jasmine basmati'], ['Brown rice (cooked)', 123, 2.7, 26, 1, 180, '1 cup', 'brown_rice_cooked'],
  ['Pasta (cooked)', 158, 5.8, 31, 0.9, 180, '1 cup', null, 'spaghetti penne'], ['Rolled oats (dry)', 389, 13, 66, 7, 40, '½ cup', 'oats', 'porridge oatmeal'],
  ['Quinoa (cooked)', 120, 4.4, 21, 1.9, 185, '1 cup'], ['White bread', 265, 9, 49, 3.2, 35, '1 slice', null, 'toast'], ['Wholemeal bread', 247, 13, 41, 3.4, 40, '1 slice', null, 'toast'],
  ['Sourdough bread', 270, 10, 51, 1.8, 50, '1 slice', 'sourdough', 'toast'], ['Wrap / tortilla', 300, 8, 50, 7, 60, '1 wrap', 'tortilla'], ['English muffin', 227, 8, 44, 1.7, 65, '1 muffin'],
  ['Bagel', 257, 10, 50, 1.6, 95, '1 bagel'], ['Wheat biscuit cereal', 358, 12, 67, 1.4, 30, '2 biscuits', null, 'weetbix weet-bix cereal'], ['Muesli', 380, 10, 60, 10, 60, '½ cup', null, 'cereal'],
  ['Granola', 450, 10, 60, 18, 45, '⅓ cup', 'granola', 'cereal'], ['Rice cakes', 387, 8, 81, 2.8, 8, '1 cake', 'rice_cake'], ['Hot chips / fries', 312, 3.4, 41, 15, 150, 'small serve', null, 'chips fries'],
  ['Egg noodles (cooked)', 138, 4.5, 25, 2, 200, '1 cup'], ['Instant noodles (dry)', 450, 9, 60, 19, 85, '1 packet', null, 'mi goreng ramen'], ['Couscous (cooked)', 112, 3.8, 23, 0.2, 160, '1 cup'],
  ['Crumpet', 180, 6, 36, 0.8, 50, '1 crumpet'],
  ['Chicken breast (cooked)', 165, 31, 0, 3.6, 150, '1 breast', 'chicken_breast'], ['Chicken thigh (cooked)', 180, 25, 0, 8.5, 120, '1 thigh', 'chicken_thigh'],
  ['Beef mince, lean (cooked)', 217, 26, 0, 12, 100, '100 g', 'lean_beef', 'ground'], ['Steak, rump (cooked)', 190, 30, 0, 7.5, 200, '1 steak', 'lean_beef', 'beef'],
  ['Lamb chop (cooked)', 260, 25, 0, 17, 100, '1 chop'], ['Pork loin (cooked)', 200, 29, 0, 9, 150, '1 serve'], ['Salmon (cooked)', 206, 22, 0, 12.4, 150, '1 fillet', 'salmon', 'fish'],
  ['Tuna in springwater', 109, 25, 0, 0.8, 95, '1 small tin', null, 'fish can'], ['Prawns (cooked)', 99, 24, 0.2, 0.3, 100, '100 g', null, 'shrimp seafood'],
  ['White fish (cooked)', 110, 23, 0, 2, 150, '1 fillet', null, 'barramundi snapper cod'], ['Egg', 143, 12.6, 0.7, 9.5, 50, '1 large egg', 'egg', 'eggs'],
  ['Egg whites', 52, 11, 0.7, 0.2, 100, '100 ml', 'egg_white'], ['Bacon (cooked)', 280, 28, 1, 18, 30, '1 rasher'], ['Ham', 120, 18, 2, 4, 30, '2 slices', null, 'deli'],
  ['Turkey breast (deli)', 104, 18, 3, 2, 30, '2 slices'], ['Tofu (firm)', 144, 15, 3, 8.7, 100, '100 g'], ['Sausage (beef, cooked)', 300, 13, 5, 25, 65, '1 sausage', null, 'snag'],
  ['Chickpeas (tinned)', 139, 7, 22, 2.4, 85, '½ cup'], ['Lentils (cooked)', 116, 9, 20, 0.4, 200, '1 cup'], ['Black beans (tinned)', 132, 8.9, 24, 0.5, 130, '½ cup', 'black_beans'],
  ['Baked beans', 81, 4.8, 13, 0.3, 220, '½ tin'], ['Whey protein powder', 380, 75, 8, 6, 30, '1 scoop', 'whey', 'protein shake'], ['Beef jerky', 280, 40, 12, 7, 50, '1 packet'],
  ['Milk, full cream', 66, 3.4, 4.8, 3.6, 250, '1 glass', 'skim_milk'], ['Milk, skim', 35, 3.5, 5, 0.1, 250, '1 glass', 'skim_milk'],
  ['Greek yoghurt (plain)', 120, 6, 5, 9, 170, '¾ cup', null, 'yogurt'], ['Greek yoghurt, 0% fat', 59, 10, 3.6, 0.4, 170, '¾ cup', 'greek_yog_0', 'yogurt'],
  ['Cheddar cheese', 403, 25, 1.3, 33, 21, '1 slice', 'light_cheese'], ['Mozzarella', 280, 28, 3, 17, 30, '30 g', 'light_mozz', 'cheese'], ['Cottage cheese', 98, 11, 3.4, 4.3, 100, '100 g', 'cottage_cheese'],
  ['Feta', 264, 14, 4, 21, 30, '30 g', null, 'cheese'], ['Butter', 717, 0.9, 0.1, 81, 7, '1 tsp'], ['Ice cream (vanilla)', 207, 3.5, 24, 11, 70, '1 scoop'],
  ['Almonds', 579, 21, 22, 50, 30, '1 handful', 'almonds', 'nuts'], ['Cashews', 553, 18, 30, 44, 30, '1 handful', null, 'nuts'], ['Mixed nuts', 607, 20, 21, 54, 30, '1 handful', null, 'nuts'],
  ['Peanut butter', 588, 25, 20, 50, 16, '1 tbsp', 'peanut_butter'], ['Dark chocolate (70%)', 598, 7.8, 46, 43, 20, '2 squares', 'choc_chips', 'choc'],
  ['Milk chocolate', 535, 7.6, 59, 30, 25, '1 row', null, 'choc'], ['Potato chips / crisps', 536, 7, 53, 35, 45, '1 small bag', null, 'chips'],
  ['Popcorn (lightly salted)', 470, 9, 56, 22, 25, '1 small bag'], ['Muesli bar', 420, 7, 64, 14, 32, '1 bar'], ['Protein bar', 370, 30, 35, 12, 60, '1 bar'],
  ['Hummus', 166, 7.9, 14, 9.6, 30, '2 tbsp', null, 'dip'], ['Olive oil', 884, 0, 0, 100, 14, '1 tbsp', 'olive_oil', 'oil'], ['Honey', 304, 0.3, 82, 0, 21, '1 tbsp', 'honey'],
  ['Jam', 250, 0.4, 60, 0.1, 20, '1 tbsp'], ['Yeast extract spread', 190, 25, 20, 0.5, 5, '1 tsp', null, 'vegemite'], ['Mayonnaise', 680, 1, 1, 75, 15, '1 tbsp', 'mayo'],
  ['Tomato sauce', 110, 1, 25, 0.2, 15, '1 tbsp', null, 'ketchup'], ['Sweet chilli sauce', 220, 0.5, 50, 0.5, 15, '1 tbsp', 'sweet_chilli'], ['Soy sauce', 53, 8, 5, 0.6, 15, '1 tbsp', 'soy'],
  ['Plain sweet biscuit', 450, 6, 70, 16, 10, '1 biscuit', null, 'cookie'], ['Chocolate biscuit', 500, 5, 63, 25, 18, '1 biscuit', null, 'cookie'],
  ['Croissant', 406, 8, 46, 21, 60, '1 croissant'], ['Banana bread', 326, 4.3, 55, 10.5, 100, '1 slice'], ['Blueberry muffin', 377, 5, 54, 16, 120, '1 muffin'], ['Donut', 452, 5, 51, 25, 60, '1 donut', null, 'doughnut'],
  ['Sushi hand roll', 180, 6, 30, 4, 110, '1 hand roll'], ['Pizza slice', 250, 11, 28, 10, 110, '1 slice'], ['Burger (takeaway)', 250, 13, 24, 11, 220, '1 burger', null, 'hamburger cheeseburger'],
  ['Meat pie', 260, 8, 24, 15, 175, '1 pie'], ['Sausage roll', 300, 8, 25, 19, 150, '1 roll'], ['Fried chicken', 260, 20, 10, 15, 120, '1 piece'],
  ['Chicken nuggets', 296, 15, 18, 18, 18, '1 nugget'], ['Kebab / wrap (chicken)', 200, 12, 20, 8, 400, '1 kebab', null, 'doner'], ['Poke bowl', 140, 8, 18, 4, 450, '1 bowl'],
  ['Pad thai', 180, 7, 25, 6, 400, '1 serve', null, 'noodles'], ['Fried rice', 170, 5, 24, 6, 300, '1 serve'], ['Butter chicken (curry only)', 150, 11, 6, 9, 300, '1 serve', null, 'curry'],
  ['Spaghetti bolognese', 135, 7, 18, 4, 400, '1 serve', null, 'pasta'], ['Caesar salad', 150, 7, 7, 11, 250, '1 serve'],
].map(([name, kcal, p, c, f, serving, unitLabel, key, words]) => ({ name, kcal, p, c, f, serving, unitLabel, key, words: (name + ' ' + (words || '')).toLowerCase(), common: true }));
function nutFromKey(key) { const v = NUTR_DB[key]; if (!v) return null; const o = {}; NK.forEach((k, i) => { o[k] = v[i]; }); return o; }
function searchCommon(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean); if (!terms.length) return [];
  return COMMON_FOODS.map(f => {
    const words = f.words.split(/[^a-z0-9%]+/);
    if (!terms.every(t => words.some(w => w.startsWith(t)) || f.words.includes(t))) return null;
    return [f, (f.name.toLowerCase().startsWith(terms[0]) ? 0 : 1) + f.name.length / 100];
  }).filter(Boolean).sort((a, b) => a[1] - b[1]).slice(0, 8).map(x => x[0]);
}
function offProduct(p) {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] != null ? n['energy_100g'] / 4.184 : null);
  if (kcal == null || !(p.product_name_en || p.product_name)) return null;
  return { code: p.code || '', name: (p.product_name_en || p.product_name).trim(), brand: (p.brands || '').split(',')[0].trim(), kcal: +kcal, p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0),
    nut: offNut(n), serving: +p.serving_quantity || null, servingLabel: p.serving_size || '', size: p.quantity || '', au: (p.countries_tags || []).includes('en:australia') };
}
const offSearchCache = {};
async function searchOFF(q) {
  q = q.trim(); if (q.length < 2) return;
  S.search.status = 'loading'; S.search.offQ = q; renderSearch();
  if (offSearchCache[q]) { S.search.off = offSearchCache[q]; S.search.status = 'done'; renderSearch(); return; }
  if (!navigator.onLine) { S.search.status = 'offline'; renderSearch(); return; }
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=40&fields=code,product_name,product_name_en,brands,nutriments,serving_quantity,serving_size,quantity,countries_tags`;
    const j = await (await fetch(url)).json();
    const list = (j.products || []).map(offProduct).filter(Boolean).sort((a, b) => (b.au - a.au)).slice(0, 15);
    offSearchCache[q] = list; if (S.search.offQ !== q) return;
    S.search.off = list; S.search.status = 'done';
  } catch (e) { console.error(e); S.search.status = 'error'; }
  renderSearch();
}
/* ---------- takeaway: Australian chain menus ---------- */
// Takeaway items: [chain, item, kcal, protein, carbs, fat, 'calc'?] per serve, taken from each chain's own published
// Australian nutrition PDFs (TAKEAWAY_SOURCES). Every item's calories were checked against 4/4/9 kcal per g of protein,
// carbs and fat. 'calc' = the chain's printed energy didn't match its own macros, so calories are worked out from the macros.
const TAKEAWAY = [["McDonald's", "BBQ Bacon Angus", 793, 48.1, 49.9, 44.0], ["McDonald's", "Big Arch", 1071, 55.8, 54.8, 69.7], ["McDonald's", "Big Mac", 557, 24.6, 44.9, 29.4], ["McDonald's", "Double Big Mac", 762, 39.7, 47.8, 43.9], ["McDonald's", "Cheeseburger", 306, 14.5, 29.9, 13.0], ["McDonald's", "Double Cheeseburger", 457, 24.9, 32.2, 23.6], ["McDonald's", "Classic Angus", 705, 40.1, 46.2, 39.3], ["McDonald's", "Hamburger", 258, 11.6, 29.1, 9.2], ["McDonald's", "Quarter Pounder", 533, 30.2, 37.2, 28.7], ["McDonald's", "Double Quarter Pounder", 805, 52.3, 34.2, 50.6], ["McDonald's", "Chicken McNuggets, 3 pack", 108, 6.0, 6.2, 6.5], ["McDonald's", "Chicken McNuggets, 6 pack", 216, 12.1, 12.4, 13.0], ["McDonald's", "Chicken McNuggets, 10 pack", 361, 20.1, 20.6, 21.7], ["McDonald's", "Chicken McNuggets, 20 pack", 722, 40.2, 41.2, 43.4], ["McDonald's", "McWings, 3 pack", 480, 27.5, 20.6, 30.2], ["McDonald's", "Chicken 'n' Cheese", 418, 17.0, 39.0, 21.1], ["McDonald's", "McChicken", 435, 16.7, 45.2, 20.0], ["McDonald's", "Double McChicken", 691, 28.3, 59.3, 37.0], ["McDonald's", "McCrispy", 593, 26.2, 59.2, 27.6], ["McDonald's", "McCrispy Deluxe", 650, 29.5, 60.3, 31.9], ["McDonald's", "McSpicy", 583, 30.0, 48.5, 29.2], ["McDonald's", "Filet-O-Fish", 339, 14.6, 34.6, 14.6], ["McDonald's", "Chicken Snack Wrap", 282, 14.0, 32.5, 9.6], ["McDonald's", "Classic Chicken McWrap", 529, 21.5, 52.9, 25.0], ["McDonald's", "Spicy Chicken McWrap", 590, 30.6, 42.9, 32.6], ["McDonald's", "Fries, small", 219, 3.5, 24.3, 11.5], ["McDonald's", "Fries, medium", 315, 5.0, 35.2, 16.6], ["McDonald's", "Fries, large", 390, 6.1, 43.3, 20.5], ["McDonald's", "Apple slices", 42, 0.3, 8.5, 0.2], ["McDonald's", "Bacon & Egg McMuffin", 289, 17.3, 25.2, 13.0], ["McDonald's", "Big Brekkie Burger", 734, 38.9, 52.3, 39.1], ["McDonald's", "Chicken McMuffin", 409, 19.5, 37.9, 19.5], ["McDonald's", "Sausage McMuffin", 301, 16.0, 25.3, 14.6], ["McDonald's", "Sausage & Egg McMuffin", 373, 22.1, 25.4, 20.1], ["McDonald's", "Brekkie Wrap", 449, 17.9, 36.5, 25.1], ["McDonald's", "Mega Brekkie Wrap", 880, 45.8, 53.8, 53.7], ["McDonald's", "Hotcakes with butter and syrup", 595, 9.4, 95.7, 18.6], ["McDonald's", "Hash brown", 143, 1.4, 12.4, 9.6], ["McDonald's", "Cappuccino, skim, medium", 129, 12.7, 18.1, 0.4], ["McDonald's", "Cappuccino, oat, medium", 201, 2.1, 28.3, 8.4], ["McDonald's", "Flat white, skim, medium", 118, 12.1, 16.2, 0.3], ["McDonald's", "Flat white, oat, medium", 188, 1.9, 26.1, 8.1], ["McDonald's", "Latte, skim, medium", 106, 11.0, 14.6, 0.3], ["McDonald's", "Latte, oat, medium", 170, 1.7, 23.6, 7.3], ["McDonald's", "Caramel latte, skim, medium", 159, 10.6, 28.0, 0.3], ["McDonald's", "Mocha, skim, medium", 229, 14.0, 37.9, 1.3], ["McDonald's", "Hot chocolate, skim, medium", 304, 17.1, 51.1, 1.8], ["McDonald's", "Chai latte, skim, medium", 234, 13.1, 40.4, 1.8], ["Hungry Jack's", "Whopper", 686, 29.2, 47.0, 42.3, "calc"], ["Hungry Jack's", "Whopper Cheese", 761, 33.8, 47.9, 48.2, "calc"], ["Hungry Jack's", "Cheeseburger", 311, 15.6, 28.5, 14.8], ["Hungry Jack's", "BBQ Cheeseburger", 390, 15.6, 28.5, 23.7, "calc"], ["Hungry Jack's", "Chicken Royale", 458, 11.5, 41.7, 27.2, "calc"], ["Hungry Jack's", "Jack's Fried Chicken Classic", 800, 36.1, 55.2, 48.3, "calc"], ["Hungry Jack's", "Grill Masters Chipotle", 804, 46.0, 33.6, 54.4], ["Hungry Jack's", "Grill Masters Chipotle Double", 1226, 79.5, 34.4, 86.7], ["Hungry Jack's", "Chips, small", 254, 3.1, 33.9, 11.8], ["Hungry Jack's", "Chips, medium", 308, 3.8, 41.1, 14.3], ["Hungry Jack's", "Chips, large", 440, 5.4, 58.8, 20.4], ["Hungry Jack's", "Nuggets, 3 pack", 130, 7.4, 10.7, 6.4], ["Hungry Jack's", "Chicken tender strips, 3 pack", 572, 23.7, 31.7, 39.0], ["Guzman y Gomez", "Burrito, grilled chicken", 773, 48.3, 91.0, 23.5], ["Guzman y Gomez", "Burrito, beef brisket", 806, 48.5, 90.6, 27.3], ["Guzman y Gomez", "Burrito, pulled pork", 759, 42.1, 90.4, 24.9], ["Guzman y Gomez", "Burrito, ground beef", 828, 36.7, 93.9, 33.5], ["Guzman y Gomez", "Burrito, BBQ beef rib", 909, 48.8, 96.4, 36.2], ["Guzman y Gomez", "Bowl, grilled chicken", 659, 43.8, 74.1, 20.5], ["Guzman y Gomez", "Bowl, beef brisket", 692, 44.0, 73.7, 24.3], ["Guzman y Gomez", "Bowl, ground beef", 714, 32.2, 77.0, 30.5], ["Guzman y Gomez", "Bowl, BBQ beef rib", 795, 44.3, 79.5, 33.2], ["Guzman y Gomez", "Mini burrito, grilled chicken", 453, 26.5, 53.1, 14.6], ["Guzman y Gomez", "Mini bowl, grilled chicken", 409, 24.2, 48.6, 12.8], ["Guzman y Gomez", "Cali burrito, grilled chicken", 966, 47.5, 77.8, 50.4], ["Guzman y Gomez", "Caesar burrito, grilled chicken", 855, 44.8, 57.7, 48.7], ["Guzman y Gomez", "Nachos, grilled chicken", 1110, 52.3, 77.7, 64.3], ["Guzman y Gomez", "Nacho fries, grilled chicken", 1100, 51.0, 71.6, 66.6], ["Guzman y Gomez", "Quesadilla, grilled chicken", 458, 29.8, 33.7, 22.4], ["Guzman y Gomez", "Soft taco, grilled chicken (1)", 192, 15.8, 15.6, 7.1], ["Guzman y Gomez", "Hard taco, grilled chicken (1)", 186, 14.8, 13.2, 7.7], ["Guzman y Gomez", "Hard taco, ground beef (1)", 208, 10.2, 14.4, 11.7], ["Guzman y Gomez", "Caesar salad, grilled chicken", 579, 37.5, 15.1, 40.6], ["Guzman y Gomez", "Brekkie burrito, bacon", 587, 25.3, 45.2, 33.3], ["Guzman y Gomez", "Big brekkie burrito, bacon", 974, 40.2, 74.7, 56.2], ["Guzman y Gomez", "Brekkie bowl, bacon", 427, 30.8, 10.5, 29.1], ["Guzman y Gomez", "Churros with chocolate sauce", 400, 5.8, 45.4, 21.3], ["Guzman y Gomez", "Guacamole, medium", 237, 2.3, 0.9, 24.9], ["Guzman y Gomez", "Guacamole, small", 165, 1.6, 0.6, 17.3], ["Guzman y Gomez", "White rice (side)", 313, 7.0, 62.6, 3.5], ["Zambrero", "Classic burrito, grilled chicken (no sauce)", 776, 35.5, 90.1, 29.7], ["Zambrero", "Classic burrito, barbacoa beef (no sauce)", 805, 37.2, 92.6, 31.0], ["Zambrero", "Classic bowl, grilled chicken (no sauce)", 492, 28.0, 46.5, 21.1], ["Zambrero", "Classic bowl, barbacoa beef (no sauce)", 521, 29.7, 49.0, 22.4], ["Zambrero", "Small burrito, grilled chicken (no sauce)", 523, 22.7, 57.8, 21.6], ["Zambrero", "Small bowl, grilled chicken (no sauce)", 316, 17.2, 26.2, 15.6], ["Zambrero", "Big burrito, grilled chicken (no sauce)", 953, 54.6, 99.2, 37.6], ["Zambrero", "Big bowl, grilled chicken (no sauce)", 657, 46.7, 53.6, 27.8], ["Zambrero", "Nachos, grilled chicken (no sauce)", 785, 35.9, 50.0, 48.8], ["Zambrero", "Quesadilla, grilled chicken (no sauce)", 538, 32.9, 42.8, 25.5], ["Zambrero", "Signature burrito, grilled chicken (no sauce)", 940, 43.4, 94.6, 41.9], ["Zambrero", "Signature bowl, grilled chicken (no sauce)", 643, 35.6, 49.0, 33.0], ["Zambrero", "Toasted burrito, grilled chicken (no sauce)", 867, 39.7, 92.9, 36.8], ["Subway", "Chicken Schnitzel 6-inch", 538, 29.9, 49.5, 23.6], ["Subway", "Sweet Onion Chicken Teriyaki 6-inch", 396, 25.3, 54.5, 8.0], ["Subway", "Chicken & Bacon Ranch 6-inch", 466, 28.9, 39.1, 21.0], ["Subway", "Chicken Strips 6-inch", 382, 25.8, 38.3, 13.3], ["Subway", "Chicken Classic 6-inch", 492, 22.3, 47.5, 22.8], ["Subway", "Italian B.M.T. 6-inch", 506, 24.6, 42.5, 25.8], ["Subway", "Italian Meatball 6-inch", 561, 24.0, 51.8, 28.4], ["Subway", "Chipotle Steak Melt 6-inch", 485, 25.2, 42.4, 22.6], ["Subway", "Turkey on Rye 6-inch", 394, 23.9, 47.7, 10.7], ["Subway", "Tuna Mayo 6-inch", 377, 21.8, 38.2, 14.5], ["Subway", "Honey Mustard Leg Ham 6-inch", 391, 21.4, 48.0, 11.4], ["Subway", "Veggie Delite with Avo 6-inch", 377, 16.1, 44.5, 14.7], ["Subway", "BBQ Southern Style Chicken 6-inch", 482, 19.3, 63.1, 16.1], ["Subway", "Chicken Schnitzel wrap", 532, 26.8, 48.6, 24.9], ["Subway", "Sweet Onion Chicken Teriyaki wrap", 429, 24.2, 55.8, 11.6], ["Subway", "Chicken Strips wrap", 415, 24.6, 39.8, 17.0], ["Subway", "Chicken & Bacon Ranch wrap", 499, 27.8, 40.4, 24.7], ["Subway", "Turkey wrap", 378, 19.6, 46.4, 12.0], ["Domino's", "Margherita pizza (1 slice, large classic)", 109, 4.9, 15.3, 2.6], ["Domino's", "Simply Cheese pizza (1 slice, large classic)", 119, 5.8, 15.1, 3.4], ["Domino's", "Pepperoni pizza (1 slice, large classic)", 129, 5.4, 15.2, 4.7], ["Domino's", "Ham and Cheese pizza (1 slice, large classic)", 112, 5.5, 15.6, 2.6], ["Domino's", "Hawaiian pizza (1 slice, large classic)", 118, 5.6, 17.1, 2.7], ["Domino's", "Double Beef and Onion pizza (1 slice, large classic)", 134, 6.3, 17.1, 4.1], ["Domino's", "BBQ Sausage and Onion pizza (1 slice, large classic)", 129, 5.0, 18.1, 3.8], ["Domino's", "Loaded Pepperoni pizza (1 slice, large classic)", 144, 6.0, 15.2, 6.0], ["Domino's", "Godfather pizza (1 slice, large classic)", 134, 5.5, 15.8, 4.7], ["Domino's", "BBQ Meatlovers pizza (1 slice, large classic)", 141, 6.6, 17.1, 4.7], ["Domino's", "Vegorama pizza (1 slice, large classic)", 110, 4.5, 15.6, 2.7], ["Domino's", "Supreme pizza (1 slice, large classic)", 135, 6.4, 16.1, 4.5], ["Domino's", "Double Bacon Cheeseburger pizza (1 slice, large classic)", 148, 6.9, 17.8, 5.1], ["Domino's", "Chicken Supreme pizza (1 slice, large classic)", 120, 6.0, 16.2, 2.9], ["Domino's", "Capricciosa pizza (1 slice, large classic)", 127, 6.2, 15.8, 4.0], ["Domino's", "Butter Chicken pizza (1 slice, large classic)", 136, 6.3, 17.1, 3.5], ["Domino's", "BBQ Steak pizza (1 slice, large classic)", 136, 6.7, 17.9, 3.6], ["Domino's", "Mega Meatlovers pizza (1 slice, large classic)", 163, 8.0, 19.2, 5.5], ["Domino's", "Peri Peri Chicken pizza (1 slice, large classic)", 131, 6.1, 16.3, 4.2], ["Domino's", "BBQ Chicken and Bacon pizza (1 slice, large classic)", 137, 7.0, 17.4, 4.0], ["Domino's", "Chicken and Camembert pizza (1 slice, large classic)", 161, 7.4, 16.0, 7.0], ["Domino's", "The Lot pizza (1 slice, large classic)", 178, 7.6, 16.7, 8.5], ["Domino's", "Steak Carnivore pizza (1 slice, large classic)", 149, 7.1, 16.0, 5.9], ["Domino's", "Cheesy garlic bread", 535, 13.3, 70.9, 20.4], ["Domino's", "Crispy chips with pizza salt", 490, 6.4, 47.9, 25.2], ["Domino's", "Southern chicken bites, 20 pack", 359, 16.2, 17.6, 24.8], ["Domino's", "Chicken wings, no sauce", 421, 38.3, 5.6, 27.4], ["Domino's", "Chicken wings, BBQ sauce", 502, 38.7, 24.9, 27.4], ["Domino's", "Chicken tenders 4 pack, no sauce", 325, 23.1, 23.6, 15.2], ["Domino's", "Chicken tenders 4 pack, BBQ sauce", 406, 23.6, 42.8, 15.2], ["Domino's", "Cheese and garlic scrolls, 4 pack", 602, 20.4, 78.3, 21.2], ["Domino's", "Triple cheese bites, 5 pack", 270, 12.5, 26.3, 12.2], ["KFC", "Garlic Parmesan Sub", 621, 32.9, 51.9, 31], ["KFC", "Hot Honey Habanero Sub", 581, 32.8, 65.1, 20.8], ["KFC", "Supercharged Sub", 597, 32.7, 52.2, 28.2], ["KFC", "Original Crispy Burger", 448, 24.7, 35.9, 22.3], ["KFC", "Original Crispy Bacon & Cheese Burger", 570, 31.6, 36.2, 32.8], ["KFC", "Original Crispy BBQ Bacon Stacker Burger", 843, 55, 51.5, 45.8], ["KFC", "Double Tender Burger", 522, 28.8, 37.4, 28.1], ["KFC", "Zinger Burger", 448, 26.2, 34.4, 22.5], ["KFC", "Zinger Bacon & Cheese Burger", 549, 33.1, 36.2, 30], ["KFC", "Zinger Stacker Burger", 737, 51.2, 48.8, 37.3], ["KFC", "Zinger Crunch Burger", 568, 29.7, 45.2, 29.3], ["KFC", "3 Original Tenders Dip'd", 546, 35, 29.3, 32.1], ["KFC", "5 Original Tenders Dip'd", 815, 57.8, 41.6, 46.3], ["KFC", "1 Original Tender", 135, 11.4, 6.2, 7.1], ["KFC", "3 Pieces Wicked Boneless", 343, 28.2, 18.4, 17.3], ["KFC", "6 Pieces Wicked Boneless", 685, 56.4, 36.9, 34.6], ["KFC", "1 Piece of Chicken", 235, 20.4, 7.2, 13.9], ["KFC", "3 Pieces of Chicken", 705, 61.2, 21.5, 41.8], ["KFC", "6 Pieces of Chicken", 1410, 122.5, 43.1, 83.6], ["KFC", "Original Crispy Fillet Piece", 224, 18.9, 10.5, 11.8], ["KFC", "Zinger Fillet Piece", 224, 20.4, 9.1, 12], ["KFC", "Snack Popcorn Chicken", 241, 11.8, 14.8, 15], ["KFC", "Regular Popcorn Chicken", 393, 19.3, 24.2, 24.4], ["KFC", "Maxi Popcorn Chicken", 720, 35.3, 44.3, 44.7], ["KFC", "3 Wicked Wings", 389, 22.6, 13.9, 27.3], ["KFC", "6 Wicked Wings", 779, 45.1, 27.8, 54.5], ["KFC", "10 Wicked Wings", 1298, 75.2, 46.3, 90.9], ["KFC", "3 Nuggets", 125, 8, 6, 7.7], ["KFC", "6 Nuggets", 311, 16.2, 25.9, 15.7], ["KFC", "10 Nuggets", 539, 27, 47.8, 26.3], ["KFC", "Regular Chips", 283, 4.4, 40.6, 11.5], ["KFC", "Large Chips", 567, 8.9, 81.1, 23], ["KFC", "Original Pepper Mayo Slider", 305, 14.9, 25.7, 15.6], ["KFC", "Original BBQ Slider", 278, 14.9, 29.4, 10.8], ["KFC", "Original Supercharged Slider", 294, 14.9, 26.4, 14.1], ["KFC", "Zinger Protein Pack (regular)", 692, 40.1, 63.2, 29.9], ["KFC", "Zinger Protein Bowl", 552, 44, 27.6, 28.9], ["KFC", "Zinger Crunch Twister", 582, 27.4, 53.4, 27.9], ["KFC", "Original Crunch Twister", 589, 29, 48.9, 30], ["KFC", "Zinger Crunch Bowl", 415, 23.2, 27.5, 23.2], ["KFC", "Original Tenders Crunch Bowl", 475, 25.5, 29.3, 27.8], ["KFC", "Crunchy Jalapeno Slaw", 192, 2.8, 18.4, 11.2], ["KFC", "Regular Potato & Gravy", 64, 1.9, 12, 0.9], ["KFC", "Large Potato & Gravy", 261, 7.7, 49.1, 3.6], ["KFC", "Regular Coleslaw", 93, 1.1, 14.1, 3.4], ["KFC", "Large Coleslaw", 380, 4.5, 58.1, 14], ["KFC", "Regular Gravy", 51, 1.8, 8.3, 1.2], ["KFC", "Dinner Roll", 107, 4, 16.5, 2.4], ["KFC", "Creamy Garlic Dip", 115, 0.5, 3.9, 11], ["KFC", "Double Chocolate Mousse", 356, 2.8, 19.8, 29.9]].map(([brand, name, kcal, p, c, f, calc]) => ({ brand, name, kcal, p, c, f, calc: !!calc }));
const TAKEAWAY_SOURCES = [
  ["McDonald's", 'Main Food Menu and McCafé Beverages nutrition guides, January 2026'],
  ["Hungry Jack's", 'Nutritional Guide, 17 February 2026'],
  ['Guzman y Gomez', 'Allergen, Ingredient and Nutritional Information, October 2026'],
  ['Subway', 'Australia Nutrition Information, October 2025'],
  ['Zambrero', 'Nutritional Information (Australia), April 2026'],
  ["Domino's", 'Nutritional information page, dominos.com.au, November 2026 (pizzas per slice of a large classic crust)'],
  ['KFC', 'Nutrition & Allergen Guide, kfc.com.au, information correct as at February 2026'],
];
const CHAINS = [...new Set(TAKEAWAY.map(t => t.brand))];
const CHAIN_ALIASES = { "McDonald's": 'mcdonalds maccas macca\'s mcd', "Hungry Jack's": 'hungry jacks hj hjs', 'KFC': 'kfc kentucky', 'Red Rooster': 'red rooster', 'Guzman y Gomez': 'guzman gyg', 'Zambrero': 'zambrero zambreros', "Nando's": 'nandos', "Domino's": 'dominos pizza', 'Subway': 'subway' };
function searchTakeaway(q) {
  const norm = x => x.toLowerCase().replace(/['’]/g, '');
  const terms = norm(q).split(/\s+/).filter(Boolean); if (!terms.length) return [];
  // Items whose own name holds the words rank first (so "big mac" finds the Big Mac before other McDonald's items).
  const score = t => { const nm = norm(t.name); return terms.filter(w => nm.includes(w)).length * 2 + (nm.startsWith(terms[0]) ? 1 : 0); };
  return TAKEAWAY.filter(t => { const hay = norm(`${t.brand} ${t.name} ${CHAIN_ALIASES[t.brand] || ''}`); return terms.every(w => hay.includes(w)); })
    .map((t, i) => ({ t, i, s: score(t) })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.t).slice(0, 40);
}
function takeawayPanel(t, build) {
  const q = S.search.qty || 1; const x = v => r0(v * q);
  return `<div class="scan-result">
    <div><div class="t">${esc(t.name)}</div><div class="small muted">${esc(t.brand)} · per serve</div></div>
    <div class="formrow"><div class="f"><span class="small muted">How many</span><div class="stepper"><button type="button" data-act="taQty" data-d="-0.5" aria-label="Less">−</button><span>${q}×</span><button type="button" data-act="taQty" data-d="0.5" aria-label="More">+</button></div></div>
      ${build ? '' : `<label class="f">Meal<select id="sc_slot">${SLOTS.map(s => `<option ${s === guessSlot() ? 'selected' : ''}>${s}</option>`).join('')}</select></label>`}</div>
    <div class="chips"><span class="chip k">${x(t.kcal)} kcal</span><span class="chip p">P ${x(t.p)}</span><span class="chip c">C ${x(t.c)}</span><span class="chip f">F ${x(t.f)}</span></div>
    <div><button type="button" class="btn" data-act="${build ? 'buildAddTa' : 'taAdd'}">${build ? 'Add to meal' : 'Add to log'}</button></div>
    <div class="small muted">From ${esc(t.brand)}'s published Australian nutrition info. Sauces and extras aren't included unless listed.${t.calc ? ` ${esc(t.brand)}'s listed energy for this item doesn't match its own protein, carbs and fat, so the calories here are worked out from those.` : ''}</div></div>`;
}

function searchRows() {
  const s = S.search; const q = (s.q || '').trim();
  if (!q) return `<div class="empty small">Type a food, like "banana", "rump steak", "Big Mac" or a brand name. Common foods and takeaway show straight away. Press Search for packaged foods.</div>${CHAINS.length ? `<div class="slotlabel">Takeaway</div><div class="chips chain-chips">${CHAINS.map(c => `<button type="button" class="chip k chipbtn" data-act="searchChain" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}`;
  const common = searchCommon(q); const ta = searchTakeaway(q);
  const row = (f, i, src) => {
    const g = f.serving || 100; const k = g / 100;
    return `<div class="row"><div style="min-width:0"><div class="t">${esc(f.name)}</div><div class="small muted">${esc([f.brand, f.unitLabel ? `${f.unitLabel} (${r0(g)} g)` : f.serving ? `1 serve (${r0(g)} g)` : '100 g'].filter(Boolean).join(' · '))}</div>
      <div class="chips"><span class="chip k">${r0(f.kcal * k)} kcal</span><span class="chip p">P ${r0(f.p * k)}</span><span class="chip c">C ${r0(f.c * k)}</span><span class="chip f">F ${r0(f.f * k)}</span></div></div>
      <button type="button" class="btn sm" data-act="searchPick" data-src="${src}" data-i="${i}">Add</button></div>`;
  };
  let h = ta.length ? `<div class="slotlabel">Takeaway</div>${ta.map((t, i) => `<div class="row"><div style="min-width:0"><div class="t">${esc(t.name)}</div><div class="small muted">${esc(t.brand)} · 1 serve</div>
      <div class="chips"><span class="chip k">${r0(t.kcal)} kcal</span><span class="chip p">P ${r0(t.p)}</span><span class="chip c">C ${r0(t.c)}</span><span class="chip f">F ${r0(t.f)}</span></div></div>
      <button type="button" class="btn sm" data-act="searchPick" data-src="ta" data-i="${i}">Add</button></div>`).join('')}` : '';
  h += common.length ? `<div class="slotlabel">Common foods</div>${common.map((f, i) => row(f, i, 'common')).join('')}` : '';
  const offHead = `<div class="slotlabel">Packaged foods</div>`;
  if (s.status === 'loading') h += offHead + `<div class="empty small">Searching Open Food Facts…</div>`;
  else if (s.status === 'offline') h += offHead + `<div class="empty small">You're offline, so only common foods can be searched.</div>`;
  else if (s.status === 'error') h += offHead + `<div class="empty small">Couldn't reach the food database. Try again in a moment.</div>`;
  else if (s.status === 'done' && s.offQ === q) h += offHead + (s.off.length ? s.off.map((f, i) => row(f, i, 'off')).join('') : `<div class="empty small">No packaged foods found for "${esc(q)}". Try fewer words or the brand name.</div>`);
  else h += `<div class="row"><span class="small muted">Looking for a brand or packaged food?</span><button type="button" class="btn ghost sm" data-act="searchGo">Search packaged foods</button></div>`;
  if (!common.length && !ta.length && s.status === 'idle') h = `<div class="empty small">No common foods or takeaway match "${esc(q)}".</div>` + h;
  return h;
}
function renderSearch() { const el = document.getElementById('fs_res'); if (el) el.innerHTML = searchRows(); }
function searchPanel(build) {
  const s = S.search;
  if (s.pick?.ta) return `<div class="search-panel"><div><button type="button" class="linkbtn" data-act="searchBack">‹ Back to results</button></div>${takeawayPanel(s.pick, build)}</div>`;
  if (s.pick) return `<div class="search-panel"><div><button type="button" class="linkbtn" data-act="searchBack">‹ Back to results</button></div>${productPanel(S.scan, s.pick.common ? 'common' : 'off', build)}</div>`;
  return `<div class="search-panel">
    <div class="formrow"><label class="f">Search foods<input type="search" id="fs_q" enterkeyhint="search" autocomplete="off" value="${esc(s.q || '')}" placeholder="e.g. banana, sourdough, Chobani"></label><button type="button" class="btn ghost" data-act="searchGo">Search</button></div>
    <div class="rows" id="fs_res">${searchRows()}</div></div>`;
}
function productPanel(s, src, build) {
  const p = s.product; const g = s.grams || 100; const k = g / 100;
  const note = src === 'common' ? 'Typical values for this food. Brands and recipes vary.' : 'Nutrition from Open Food Facts. Check it against the packet if it looks off.';
  return `<div class="scan-result">
      <div><div class="t">${esc(p.name)}</div><div class="small muted">${esc([p.brand, p.size].filter(Boolean).join(' · '))}</div></div>
      <div class="small muted">Per 100 g: ${r0(p.kcal)} kcal · P ${r1(p.p)} · C ${r1(p.c)} · F ${r1(p.f)}</div>
      <div class="formrow">
        <label class="f">Amount eaten (g or ml)<input type="number" id="sc_g" inputmode="decimal" step="any" min="1" value="${g}"></label>
        ${build ? '' : `<label class="f">Meal<select id="sc_slot">${SLOTS.map(x => `<option ${x === guessSlot() ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`}
      </div>
      <div class="seg">${p.serving ? `<button type="button" data-act="scanGrams" data-v="${p.serving}" aria-pressed="${g === p.serving}">${esc(p.unitLabel || '1 serve')} (${r0(p.serving)} g)</button>` : ''}${p.serving && p.unitLabel && !/^\d/.test(p.unitLabel) ? `<button type="button" data-act="scanGrams" data-v="${p.serving * 2}" aria-pressed="${g === p.serving * 2}">×2</button>` : ''}<button type="button" data-act="scanGrams" data-v="100" aria-pressed="${g === 100}">100 g</button></div>
      <div class="chips" id="sc_macros"><span class="chip k">${r0(p.kcal * k)} kcal</span><span class="chip p">P ${r0(p.p * k)}</span><span class="chip c">C ${r0(p.c * k)}</span><span class="chip f">F ${r0(p.f * k)}</span></div>
      ${build ? `<div><button type="button" class="btn" data-act="buildAdd">Add to meal</button></div>` : `<label class="f" style="flex-direction:row;display:flex;align-items:center;gap:6px;color:var(--ink)"><input type="checkbox" id="sc_save"> Save to my meal plan</label>
      <div><button class="btn" data-act="scanAdd">Add to log</button></div>`}
      <div class="small muted">${note}</div>
    </div>`;
}

/* ---------- drinks ---------- */
const MILKS = { full: ['Full cream', 64, 3.4, 4.8, 3.6], lite: ['Lite', 46, 3.6, 5, 1.4], skim: ['Skim', 35, 3.5, 5, 0.1], oat: ['Oat', 59, 1, 6.6, 3], almond: ['Almond', 30, 1, 1.5, 2.4], soy: ['Soy', 50, 3.2, 4, 2.4], lf: ['Lactose free', 62, 3.3, 4.6, 3.4] };
const CUPS = { small: ['Small', 220], regular: ['Regular', 330], large: ['Large', 450] };
// [name, share of the cup that's milk, extras [kcal, p, c, f], fixed size ml]
const CAFE = {
  flatwhite: ['Flat white', 0.8], latte: ['Latte', 0.85], cappuccino: ['Cappuccino', 0.65], longblack: ['Long black', 0], espresso: ['Espresso', 0, null, 30],
  piccolo: ['Piccolo', 0.7, null, 90], macchiato: ['Macchiato', 0.25, null, 60], mocha: ['Mocha', 0.75, [70, 1, 15, 1]], icedlatte: ['Iced latte', 0.6],
  icedcoffee: ['Iced coffee (ice cream)', 0.6, [140, 2.5, 16, 7.5]], chai: ['Chai latte', 0.85, [60, 0, 15, 0]], dirtychai: ['Dirty chai', 0.8, [60, 0, 15, 0]],
  matcha: ['Matcha latte', 0.85, [20, 1, 3, 0]], hotchoc: ['Hot chocolate', 0.9, [95, 1.5, 21, 1]], tea: ['Tea with milk', 0.12], plaintea: ['Tea / herbal tea', 0],
};
// Ready-made drinks: per 100 ml with sizes, or fixed serves.
const DRINK_CATS = [
  ['soft', 'Soft drinks'], ['energy', 'Energy & sports'], ['juice', 'Juice & milk'], ['alcohol', 'Alcohol'], ['other', 'Other'],
];
const CAN = [['Can', 375], ['Bottle', 600], ['Glass', 250]];
const DRINKS = [
  { cat: 'soft', name: 'Cola', per: [42, 0, 10.6, 0], sizes: CAN }, { cat: 'soft', name: 'Cola, no sugar', per: [0.4, 0, 0, 0], sizes: CAN },
  { cat: 'soft', name: 'Lemonade', per: [38, 0, 9.5, 0], sizes: CAN }, { cat: 'soft', name: 'Ginger beer', per: [47, 0, 12, 0], sizes: CAN },
  { cat: 'soft', name: 'Orange soda', per: [46, 0, 11.5, 0], sizes: CAN }, { cat: 'soft', name: 'Iced tea (bottled)', per: [28, 0, 7, 0], sizes: [['Bottle', 500], ['Glass', 250]] },
  { cat: 'soft', name: 'Tonic water', per: [34, 0, 8.8, 0], sizes: [['Can', 300], ['Glass', 200]] }, { cat: 'soft', name: 'Sparkling water', per: [0, 0, 0, 0], sizes: [['Glass', 250], ['Bottle', 500]] },
  { cat: 'energy', name: 'Energy drink', per: [45, 0, 11, 0], sizes: [['Small can', 250], ['Large can', 500]] }, { cat: 'energy', name: 'Energy drink, sugar free', per: [3, 0, 0.5, 0], sizes: [['Small can', 250], ['Large can', 500]] },
  { cat: 'energy', name: 'Sports drink', per: [24, 0, 6, 0], sizes: [['Bottle', 600], ['Large bottle', 1000]] }, { cat: 'energy', name: 'Electrolyte drink, sugar free', per: [2, 0, 0.3, 0], sizes: [['Bottle', 600]] },
  { cat: 'juice', name: 'Orange juice', per: [42, 0.7, 9, 0.1], sizes: [['Glass', 250], ['Bottle', 350]] }, { cat: 'juice', name: 'Apple juice', per: [44, 0.1, 10.5, 0.1], sizes: [['Glass', 250], ['Bottle', 350]] },
  { cat: 'juice', name: 'Fruit smoothie', per: [60, 1, 13, 0.3], sizes: [['Regular', 450], ['Large', 650]] }, { cat: 'juice', name: 'Coconut water', per: [19, 0.7, 3.7, 0.2], sizes: [['Pack', 330]] },
  { cat: 'juice', name: 'Chocolate milk', per: [70, 3.4, 10, 2], sizes: [['Small', 300], ['Large', 600]] }, { cat: 'juice', name: 'Iced coffee milk', per: [68, 3.4, 9.5, 1.8], sizes: [['Small', 300], ['Large', 600]] },
  { cat: 'juice', name: 'Milk, full cream', per: MILKS.full.slice(1), sizes: [['Glass', 250]] }, { cat: 'juice', name: 'Milk, skim', per: MILKS.skim.slice(1), sizes: [['Glass', 250]] },
  { cat: 'alcohol', name: 'Beer, full strength', per: [40, 0.3, 3, 0], sizes: [['Can / stubby', 375], ['Schooner', 425], ['Pint', 570]] },
  { cat: 'alcohol', name: 'Beer, mid strength', per: [30, 0.3, 2.6, 0], sizes: [['Can / stubby', 375], ['Schooner', 425], ['Pint', 570]] },
  { cat: 'alcohol', name: 'Beer, light', per: [26, 0.2, 2.2, 0], sizes: [['Can / stubby', 375], ['Schooner', 425], ['Pint', 570]] },
  { cat: 'alcohol', name: 'Cider', per: [50, 0, 5.5, 0], sizes: [['Can / bottle', 375], ['Pint', 570]] },
  { cat: 'alcohol', name: 'Red wine', per: [85, 0.1, 2.6, 0], sizes: [['Glass', 150], ['Large glass', 250], ['Bottle', 750]] },
  { cat: 'alcohol', name: 'White wine', per: [82, 0.1, 2.6, 0], sizes: [['Glass', 150], ['Large glass', 250], ['Bottle', 750]] },
  { cat: 'alcohol', name: 'Rosé', per: [80, 0.1, 3, 0], sizes: [['Glass', 150], ['Large glass', 250]] }, { cat: 'alcohol', name: 'Sparkling wine', per: [76, 0.2, 1.5, 0], sizes: [['Glass', 150]] },
  { cat: 'alcohol', name: 'Spirit + mixer', spirit: true }, { cat: 'alcohol', name: 'Premix can', per: [67, 0, 8, 0], sizes: [['Can', 375]] },
  { cat: 'alcohol', name: 'Premix can, no sugar', per: [40, 0, 0.5, 0], sizes: [['Can', 375]] }, { cat: 'alcohol', name: 'Hard seltzer', per: [26, 0, 0.5, 0], sizes: [['Can', 375]] },
  { cat: 'alcohol', name: 'Cocktail', fixed: [['Espresso martini', 230, 0.5, 20, 0], ['Margarita', 270, 0, 23, 0], ['Spritz', 165, 0, 17, 0], ['Mojito', 220, 0, 25, 0], ['Piña colada', 400, 1, 50, 12]] },
  { cat: 'other', name: 'Protein shake', fixed: [['With water', 115, 23, 2.5, 1.5], ['With skim milk', 220, 34, 17, 2], ['With full cream milk', 310, 33, 17, 12.5]] },
  { cat: 'other', name: 'Bubble tea', fixed: [['Medium', 300, 2, 55, 8], ['Large', 420, 3, 77, 11], ['Medium, less sugar', 220, 2, 35, 8]] },
  { cat: 'other', name: 'Kombucha', per: [15, 0, 3.5, 0], sizes: [['Bottle', 330]] },
];
const SPIRIT_MIXERS = { none: ['Neat / soda', 0, 0, 0, 0], diet: ['Diet cola', 0.6, 0, 0, 0], cola: ['Cola', 63, 0, 16, 0], lemonade: ['Lemonade', 57, 0, 14, 0], tonic: ['Tonic', 51, 0, 13, 0], juice: ['Juice', 63, 1, 14, 0], energy: ['Energy drink', 68, 0, 16, 0] };
function drinkState() { if (!S.drink) S.drink = Object.assign({ cat: 'cafe', type: 'flatwhite', size: 'regular', milk: 'full', sugar: 0, shots: 1, mixer: 'cola' }, lsGet('rl:drink') || {}); return S.drink; }
function drinkCalc() {
  const d = drinkState();
  if (d.cat === 'cafe') {
    const [nm, frac, ex, fixed] = CAFE[d.type] || CAFE.flatwhite; const ml = fixed || CUPS[d.size][1];
    const m = MILKS[d.milk] || MILKS.full; const mm = ml * frac / 100;
    const kcal = m[1] * mm + (ex ? ex[0] : 0) + 2 + d.sugar * 16, p = m[2] * mm + (ex ? ex[1] : 0), c = m[3] * mm + (ex ? ex[2] : 0) + d.sugar * 4, f = m[4] * mm + (ex ? ex[3] : 0);
    const bits = [fixed ? null : CUPS[d.size][0].toLowerCase(), frac ? m[0].toLowerCase() : null, d.sugar ? `${d.sugar} sugar` : null].filter(Boolean);
    return { name: `${nm}${bits.length ? ` (${bits.join(', ')})` : ''}`, kcal, p, c, f };
  }
  const it = DRINKS[d.item]; if (!it) return null;
  if (it.spirit) { const mx = SPIRIT_MIXERS[d.mixer] || SPIRIT_MIXERS.none; return { name: `${d.shots === 2 ? 'Double' : 'Spirit'} + ${mx[0].toLowerCase()}`, kcal: 69 * d.shots + mx[1], p: mx[2], c: mx[3], f: mx[4] }; }
  if (it.fixed) { const o = it.fixed[d.opt || 0] || it.fixed[0]; return { name: `${it.name} (${o[0].toLowerCase()})`, kcal: o[1], p: o[2], c: o[3], f: o[4] }; }
  const sz = it.sizes[d.opt || 0] || it.sizes[0]; const k = sz[1] / 100;
  return { name: `${it.name} (${sz[0].toLowerCase()}, ${sz[1]} ml)`, kcal: it.per[0] * k, p: it.per[1] * k, c: it.per[2] * k, f: it.per[3] * k };
}
function recentDrinks() {
  const seen = new Map();
  for (const d of Object.values(S.days).sort((a, b) => a.date < b.date ? 1 : -1)) for (const m of (d.meals || []).slice().reverse()) if (m.drink && !seen.has(m.name)) seen.set(m.name, m);
  return [...seen.values()].slice(0, 6);
}
function drinksPanel() {
  const d = drinkState(); const segBtns = (k, opts, cur) => `<div class="seg wrap">${opts.map(([v, l]) => `<button type="button" data-act="drinkOpt" data-k="${k}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
  const recent = recentDrinks();
  let h = recent.length ? `<div class="slotlabel" style="padding-top:0">Recent</div><div class="chips drink-recent">${recent.map((m, i) => `<button type="button" class="chip k chipbtn" data-act="drinkRecent" data-i="${i}">+ ${esc(m.name)} · ${r0(m.kcal)}</button>`).join('')}</div>` : '';
  h += segBtns('cat', [['cafe', 'Coffee & tea'], ...DRINK_CATS], d.cat);
  if (d.cat === 'cafe') {
    const [, frac, , fixed] = CAFE[d.type] || CAFE.flatwhite;
    h += `<div class="f"><span class="small muted">Drink</span>${segBtns('type', Object.entries(CAFE).map(([k, v]) => [k, v[0]]), d.type)}</div>`;
    if (!fixed) h += `<div class="f"><span class="small muted">Size</span>${segBtns('size', Object.entries(CUPS).map(([k, v]) => [k, `${v[0]} (${v[1]} ml)`]), d.size)}</div>`;
    if (frac) h += `<div class="f"><span class="small muted">Milk</span>${segBtns('milk', Object.entries(MILKS).map(([k, v]) => [k, v[0]]), d.milk)}</div>`;
    h += `<div class="f"><span class="small muted">Sugar or syrup (tsp / pumps)</span>${segBtns('sugar', [[0, 'None'], [1, '1'], [2, '2'], [3, '3']], d.sugar)}</div>`;
  } else {
    const items = DRINKS.map((it, i) => [i, it]).filter(([, it]) => it.cat === d.cat);
    if (!items.some(([i]) => i === d.item)) d.item = items[0][0], d.opt = 0;
    h += `<div class="f"><span class="small muted">Drink</span>${segBtns('item', items.map(([i, it]) => [i, it.name]), d.item)}</div>`;
    const it = DRINKS[d.item];
    if (it.spirit) h += `<div class="f"><span class="small muted">Shots</span>${segBtns('shots', [[1, 'Single (30 ml)'], [2, 'Double (60 ml)']], d.shots)}</div><div class="f"><span class="small muted">Mixer (150 ml)</span>${segBtns('mixer', Object.entries(SPIRIT_MIXERS).map(([k, v]) => [k, v[0]]), d.mixer)}</div>`;
    else if (it.fixed) h += `<div class="f"><span class="small muted">Which one</span>${segBtns('opt', it.fixed.map((o, i) => [i, o[0]]), d.opt || 0)}</div>`;
    else h += `<div class="f"><span class="small muted">Size</span>${segBtns('opt', it.sizes.map((s, i) => [i, `${s[0]} (${s[1]} ml)`]), d.opt || 0)}</div>`;
  }
  const x = drinkCalc();
  h += `<div class="drink-total"><div><div class="t">${esc(x.name)}</div><div class="chips"><span class="chip k">${r0(x.kcal)} kcal</span><span class="chip p">P ${r0(x.p)}</span><span class="chip c">C ${r0(x.c)}</span><span class="chip f">F ${r0(x.f)}</span></div></div><button class="btn" data-act="drinkAdd">Add drink</button></div>
    <div class="small muted">Typical café and supermarket figures. Alcohol calories are included even though they don't show up as protein, carbs or fat.</div>`;
  return `<div class="drinks-panel">${h}</div>`;
}
function addDrinkToLog(x) {
  const day = localDay(S.date); day.meals.push({ id: uid(), name: x.name, slot: 'Drinks', servings: 1, kcal: r0(x.kcal), p: r1(x.p), c: r1(x.c), f: r1(x.f), drink: true });
  saveDay(S.date, day); toast(`Added ${x.name}`);
}

/* ---------- steps through the day ---------- */
function stepGoal() { return S.config?.stepGoal || 10000; }
function stepsCard(day) {
  const n = day?.steps || 0; const goal = stepGoal(); const pct = Math.min(100, n / goal * 100); const log = day?.stepLog || [];
  return `<div class="steps-box">
      <div class="steps-n"><b>${n.toLocaleString()}</b> steps <span>of ${goal.toLocaleString()}</span></div>
      <div class="garden-bar steps-bar" role="img" aria-label="${n} of ${goal} steps"><i style="width:${pct}%"></i></div>
      <div class="chips">${[500, 1000, 2500, 5000].map(v => `<button type="button" class="chip k chipbtn" data-act="stepsAdd" data-v="${v}">+ ${v.toLocaleString()}</button>`).join('')}</div>
      <div class="formrow"><label class="f">Add steps<input type="number" id="st_add" inputmode="numeric" min="1" placeholder="e.g. 3200"></label><button type="button" class="btn ghost" data-act="stepsAdd">Add</button></div>
      ${log.length ? `<div class="small muted">Added today: ${log.slice(-6).map(x => `${x.n > 0 ? '+' : ''}${x.n.toLocaleString()} at ${x.t}`).join(' · ')}${log.length > 6 ? ' …' : ''} <button type="button" class="linkbtn" data-act="stepsUndo">Undo last</button></div>` : ''}
      <details class="small steps-more"${S.stepsMore ? ' open' : ''}><summary>Set today's total or change your goal</summary>
        <div class="formrow" style="margin-top:8px"><label class="f">Today's total<input type="number" id="steps" inputmode="numeric" min="0" placeholder="From your phone's Health app" value="${day?.steps ?? ''}"></label>
        <label class="f">Daily goal<input type="number" id="st_goal" inputmode="numeric" min="1000" step="500" value="${goal}"></label></div>
      </details>
    </div>`;
}

function scanPanel() {
  const s = S.scan;
  const res = scanResult(s, false);
  return `<div class="scan-panel">
    <button class="btn scan-cta" data-act="openScanner"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M7 8v8M10 8v8M13 8v8M16 8v8"/></svg>Scan a barcode</button>
    <div class="formrow"><label class="f">Or type the barcode number<input type="text" id="sc_code" inputmode="numeric" autocomplete="off" value="${esc(s.code || '')}" placeholder="e.g. 9300633603262"></label><button class="btn ghost" data-act="scanLookup">Look up</button></div>
    ${res}</div>`;
}
function guessSlot() { const h = new Date().getHours(); return h < 10 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 20 ? 'Dinner' : 'Snack'; }

/* ---------- meal pages: ingredients, amounts and method ---------- */
// From the Recomp Meal Plan doc. Amounts are per serve unless a line says otherwise.
const RECIPE_INFO = {"B1": {"title": "Protein Pancake Bowl", "src": "Eating Bird Food (Brittany Mullins), inspired by Brynley Joyner’s viral TikTok", "note": "Adapted: the original uses a US protein pancake mix, so whey and oats stand in for it, and toppings are portioned.", "ing": ["100 g liquid egg whites", "20 g whey protein (about ⅔ scoop)", "50 g rolled oats, blitzed into flour", "1 medium banana (100 g), mashed", "½ tsp baking powder, pinch of cinnamon", "Toppings: 15 g peanut butter, 80 g blueberries, 10 g maple syrup"], "method": ["Spray a microwave-safe bowl. Mash the banana in it, then whisk in the egg whites, whey, oat flour, baking powder and cinnamon.", "Microwave about 1½–2 minutes until a skewer comes out clean (or bake at 180 °C for about 15 minutes).", "Top with peanut butter, blueberries and maple syrup."]}, "B2": {"title": "Overnight Protein Oats", "src": "Viral YouTube recipe, featured in Nutrola’s macro-verified social media roundup", "note": "Ingredient list from the original; quantities set to your breakfast target.", "ing": ["55 g rolled oats", "20 g whey protein (vanilla or chocolate)", "150 g plain Greek yoghurt, 0% fat", "150 ml skim milk", "5 g chia seeds", "Toppings: ½ banana (60 g) sliced, 10 g peanut butter"], "method": ["Stir the oats, whey, yoghurt, milk and chia together in a jar until smooth.", "Seal and refrigerate overnight (at least 4 hours).", "Top with banana and peanut butter in the morning. Make 3–4 jars at once for the week."]}, "B3": {"title": "Protein French Toast", "src": "TikTok viral protein French toast (12M+ views), via Nutrola’s macro-verified roundup", "note": "Whey is left out of the batter here to keep your day’s protein balanced. Add 15 g whey to the batter if you want an extra 12 g protein.", "ing": ["2 thick slices sourdough (120 g)", "100 g liquid egg whites", "1 whole egg", "½ tsp cinnamon, ½ tsp vanilla extract", "Toppings: 100 g plain Greek yoghurt (0%), 80 g mixed berries, 10 g maple syrup"], "method": ["Whisk the egg whites, egg, cinnamon and vanilla in a shallow dish.", "Soak each slice for about 20 seconds per side.", "Cook in a sprayed non-stick pan over medium heat, 2–3 minutes per side until golden.", "Top with yoghurt, berries and maple syrup."]}, "B4": {"title": "Cottage Cheese Egg Omelette on Sourdough", "src": "Instagram cottage cheese egg-white omelette, via Nutrola’s macro-verified roundup", "note": "Toast and avocado added so it fills a full breakfast slot.", "ing": ["100 g liquid egg whites", "1 whole egg", "100 g light cottage cheese", "40 g baby spinach", "80 g cherry tomatoes, halved", "Everything bagel seasoning, salt and pepper", "2 slices sourdough (120 g), toasted", "40 g avocado (about ¼)"], "method": ["Wilt the spinach and tomatoes in a sprayed pan, then remove.", "Pour in the whisked egg whites and egg. When nearly set, spoon the cottage cheese and veg over one half.", "Fold, cook another minute so the cottage cheese turns creamy, and season.", "Serve with toast topped with smashed avocado."]}, "L1": {"title": "Meal-Prep Chicken Burrito Bowl", "src": "Clean Eatz Kitchen", "note": "Original makes 4 bowls at 480 kcal. Quantities below are per bowl, with a bit more rice plus avocado and salsa to hit 650.", "ing": ["150 g chicken breast (raw)", "5 ml olive oil", "Spice mix: ½ tsp each chilli powder, cumin, smoked paprika, garlic powder, pinch of salt", "190 g cooked brown rice (about 65 g dry), with lime juice and coriander stirred through", "70 g black beans, drained", "40 g corn kernels", "50 g red capsicum, diced", "50 g cherry tomatoes, halved", "40 g plain Greek yoghurt (0%)", "40 g avocado", "30 g salsa"], "method": ["Toss the chicken with oil and the spice mix. Roast at 220 °C for 18–22 minutes until cooked through (74 °C inside). Rest, then dice.", "Stir lime juice and coriander through the rice.", "Build the bowl: rice, chicken, beans, corn, capsicum and tomatoes.", "Add yoghurt, avocado and salsa just before eating. Keeps 4 days in the fridge (store wet toppings separately)."]}, "L2": {"title": "Bang Bang Chicken Bowl", "src": "@selfbycjs, published by Fundies (Australian)", "note": "Swapped chicken thigh for breast for more protein. The lighter yoghurt-based sauce is from the original.", "ing": ["160 g chicken breast (raw), diced", "5 ml oil, 1 tsp smoked paprika, salt and pepper", "190 g cooked white or jasmine rice (about 65 g dry)", "80 g cucumber, sliced", "50 g carrot, grated", "50 g purple cabbage, shredded", "30 g avocado", "Sauce: 25 g Greek yoghurt, 8 g mayo, 8 g sweet chilli sauce, 5 g sriracha, 5 g honey, 1 tsp rice vinegar", "Sesame seeds and coriander to finish"], "method": ["Season the chicken with paprika, salt and pepper. Pan-fry in the oil over medium-high heat for 6–8 minutes until golden and cooked.", "Whisk the sauce ingredients until smooth. Adjust heat or sweetness to taste.", "Layer rice, cabbage, carrot, cucumber, avocado and chicken in a bowl.", "Drizzle with the sauce and top with sesame seeds and coriander."]}, "L3": {"title": "One-Pot Lemon Chicken Orzo", "src": "Taste of Home", "note": "Original serves 4 at 399 kcal. Single-serve quantities below are scaled up, with a little parmesan added.", "ing": ["150 g chicken breast (raw), cut into pieces and pounded thin", "12 g plain flour mixed with ¼ tsp garlic powder", "7 ml olive oil", "85 g dry orzo (wholemeal if you can find it)", "150 ml salt-reduced chicken stock (plus a splash of water if needed)", "30 g baby spinach", "60 g cherry tomatoes, halved", "15 ml lemon juice, plus zest", "10 g parmesan, grated", "Fresh basil, salt and pepper"], "method": ["Season the chicken, dust in the flour mix, and pan-fry in the oil 3–4 minutes per side until golden. Remove.", "Bring the stock to a boil in the same pan, add the orzo, then cover and simmer 8–10 minutes until tender.", "Stir in the spinach, tomatoes, lemon juice and zest.", "Return the chicken, then finish with parmesan and basil."]}, "L4": {"title": "Turkey Pasta Bake", "src": "Instagram ground turkey pasta bake, via Nutrola’s macro-verified roundup", "note": "Ingredient list from the original; quantities are per serve. Multiply by 4–5 for a meal-prep tray.", "ing": ["150 g lean turkey mince", "85 g dry wholemeal penne", "150 g passata or marinara sauce", "40 g onion, diced, and 1 garlic clove", "30 g baby spinach", "25 g light mozzarella, grated", "3 ml olive oil", "1 tsp Italian herbs, chilli flakes optional"], "method": ["Cook the penne 2 minutes short of the packet time and drain.", "Brown the turkey with the onion and garlic in the oil, then add the passata, herbs and spinach and simmer 5 minutes.", "Mix in the pasta, transfer to a baking dish and top with mozzarella.", "Bake at 200 °C for 15 minutes until bubbling."]}, "D1": {"title": "Beef and Broccoli Stir-Fry", "src": "Mad About Food (Madeline Tague, @mad_about_food)", "note": "Original serves 3 without rice. Single-serve quantities below include rice.", "ing": ["150 g flank or rump steak, sliced thin", "150 g broccoli florets", "7 ml oil", "25 ml soy sauce (or coconut aminos)", "25 ml beef stock", "4 g cornflour mixed with 1 tbsp water", "1 tsp minced garlic, ½ tsp minced ginger", "250 g cooked white rice (about 85 g dry)"], "method": ["Steam the broccoli in a covered pan with a splash of water for 5 minutes, then set aside.", "Pound the beef with a mallet to tenderise, then slice into strips.", "Stir-fry the beef in the oil for about 3 minutes.", "Add the broccoli plus the soy, stock, garlic and ginger. Stir in the cornflour slurry and simmer 2 minutes until glossy. Serve over rice."]}, "D2": {"title": "Salmon Rice Bowl", "src": "Emily Mariko (TikTok), base quantities from PantryLink’s written version", "note": "Scaled up from the original, with edamame added for protein. Higher in fat, but it’s mostly omega-3 from the salmon.", "ing": ["140 g salmon fillet (raw weight), baked or air-fried", "170 g cooked white rice (about 60 g dry)", "15 ml soy sauce", "5 g sriracha", "5 g Kewpie mayo", "30 g avocado", "60 g kimchi", "50 g shelled edamame", "1 nori sheet, cut into squares"], "method": ["Cook the salmon at 200 °C for 12–15 minutes (or use leftovers).", "Flake the salmon onto a plate, add the rice and an ice cube on top, cover with baking paper and microwave until hot. Remove the ice cube.", "Drizzle with soy, sriracha and Kewpie and mash everything together.", "Top with avocado, kimchi and edamame. Scoop into nori squares to eat."]}, "D3": {"title": "Turkey Tacos", "src": "TikTok turkey taco wraps, via Nutrola’s macro-verified roundup", "note": "The original uses lettuce cups for a cut. Since you have the calories, these use soft tortillas plus black beans.", "ing": ["140 g lean turkey mince", "10 g taco seasoning", "3 ml oil", "3 small soft tortillas (90 g total)", "20 g reduced-fat cheese, grated", "60 g salsa", "50 g tomato, diced", "30 g shredded lettuce", "60 g black beans, warmed", "40 g plain Greek yoghurt (as sour cream)", "Lime, coriander and red onion to finish"], "method": ["Brown the turkey in the oil, add the taco seasoning and a splash of water, and simmer until thick.", "Warm the tortillas in a dry pan.", "Fill with turkey, beans, lettuce, tomato, cheese and salsa.", "Top with yoghurt, a squeeze of lime and coriander."]}, "D4": {"title": "Sweet Potato and Chicken Thigh Tray Bake", "src": "YouTube sheet-pan recipe, via Nutrola’s macro-verified roundup", "note": "Skinless thighs keep it juicy. A garlic yoghurt sauce and greens are added.", "ing": ["180 g skinless chicken thigh (raw)", "330 g sweet potato, cubed", "7 ml olive oil", "1 tsp smoked paprika, ½ tsp garlic powder, salt and pepper", "100 g broccolini", "Sauce: 60 g plain Greek yoghurt (0%), ½ crushed garlic clove, squeeze of lemon"], "method": ["Toss the sweet potato and chicken with the oil and spices on a lined tray.", "Roast at 220 °C for 30–35 minutes, adding the broccolini for the last 10 minutes.", "Mix the yoghurt, garlic and lemon.", "Serve everything with the sauce spooned over."]}, "S1": {"title": "Cottage Cheese Cookie Dough", "src": "TikTok viral (200M+ views), via Nutrola’s macro-verified roundup", "note": "Made without protein powder. Rice cakes and strawberries are added to round it out.", "ing": ["200 g light cottage cheese", "10 g maple syrup", "½ tsp vanilla extract, pinch of salt", "10 g dark choc chips", "On the side: 3 thin rice cakes (22 g), 150 g strawberries"], "method": ["Blend the cottage cheese, maple and vanilla until completely smooth.", "Fold in the choc chips.", "Chill 15 minutes, then spread on rice cakes or dip strawberries in it."]}, "S2": {"title": "Protein Berry Ice Cream", "src": "YouTube, popularised by fitness creator Greg Doucette (via Nutrola’s macro-verified roundup)", "note": "Banana and granola are added for post-gym carbs.", "ing": ["35 g whey or casein protein", "200 g frozen strawberries", "½ frozen banana (50 g)", "100 ml unsweetened almond milk", "¼ tsp xanthan gum (optional, makes it fluffier)", "Handful of ice, sweetener to taste", "Topping: 25 g granola"], "method": ["Add everything except the granola to a blender (a food processor works best).", "Blend 2–3 minutes, scraping down, until thick and it holds its shape.", "Scoop into a big bowl and top with granola."]}, "S3": {"title": "Greek Yoghurt Protein Bark", "src": "TikTok viral, via Nutrola’s macro-verified roundup", "note": "The batch makes 3 snack serves. Macros shown are per serve (⅓ of the tray).", "ing": ["Whole batch (3 serves):", "500 g plain Greek yoghurt (0%)", "60 g whey protein (2 scoops)", "30 g honey", "100 g mixed berries", "50 g dark choc chips", "30 g almonds, chopped"], "method": ["Mix the yoghurt, whey and honey until smooth.", "Spread about 1 cm thick on a baking-paper-lined tray.", "Scatter over the berries, choc chips and almonds.", "Freeze at least 3 hours, then break into pieces. Keeps for weeks in a container in the freezer."]}, "S4": {"title": "Protein Banana Mug Cake", "src": "Instagram protein mug cake, via Nutrola’s macro-verified roundup", "note": "", "ing": ["25 g whey protein", "60 g liquid egg whites", "1 medium banana (100 g), mashed", "20 g rolled oats", "½ tsp baking powder, cinnamon", "Topping: 100 g plain Greek yoghurt (0%) with 10 g peanut butter swirled through"], "method": ["Mash the banana in a large mug and mix in everything except the topping.", "Microwave 60–90 seconds until risen and just set in the centre.", "Let it sit for a minute, then top with the peanut butter yoghurt."]}};

function ingLineHTML(l) {
  if (/:$/.test(l)) return `<li class="ing-sub">${esc(l.slice(0, -1))}</li>`;
  const m = l.match(/^([A-Z][A-Za-z ]{2,14}):\s*(.+)$/);
  return m ? `<li><b>${esc(m[1])}:</b> ${esc(m[2])}</li>` : `<li>${esc(l)}</li>`;
}
function mealByKey(key) {
  if (key.startsWith('R:')) { const r = RECIPES.find(x => x.id === key.slice(2)); return r ? { kind: 'recipe', r, info: RECIPE_INFO[r.id] || {} } : null; }
  const f = (S.config?.foods || []).find(x => x.id === key.slice(2)); return f ? { kind: 'mine', r: f } : null;
}
function openMeal(key, editing) {
  const m = mealByKey(key); if (!m) return;
  const r = m.r; const ing = m.kind === 'recipe' ? (m.info.ing || []) : (r.ing || []);
  const chips = `<div class="chips"><span class="chip k">${r0(r.kcal)} kcal</span><span class="chip p">P ${r0(r.p)} g</span><span class="chip c">C ${r0(r.c)} g</span><span class="chip f">F ${r0(r.f)} g</span></div>`;
  let ingHTML;
  if (editing) ingHTML = `<label class="f">One ingredient per line, with the amount first<textarea id="meal_ing" rows="8" placeholder="200 g chicken breast&#10;1 avocado&#10;100 g rice">${esc(ing.join('\n'))}</textarea></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="mealIngSave" data-k="${esc(key)}">Save ingredients</button><button class="btn ghost" data-act="openMeal" data-k="${esc(key)}">Cancel</button></div>
      <div class="small muted">These also feed your grocery list and the nutrients panel.</div>`;
  else if (ing.length) ingHTML = `<ul class="ing-list">${ing.map(ingLineHTML).join('')}</ul>`;
  else ingHTML = `<div class="empty small"><b>No ingredients saved for this meal yet.</b>Add them so you can see the amounts here, and so they count towards your grocery list and nutrients.<div style="margin-top:10px"><button class="btn ghost sm" data-act="editMeal" data-k="${esc(key)}">Add ingredients</button></div></div>`;
  const steps = m.kind === 'recipe' ? m.info.method : r.method;
  const method = steps?.length ? `<div class="slotlabel">Method</div><ol class="method-list">${steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '';
  const contains = m.kind !== 'recipe' && r.contains ? `<div class="small muted">${r.contains.length ? `Contains ${r.contains.map(a => ALLERGEN_LABEL[a].toLowerCase()).join(', ')}.` : 'Made without common allergens.'} Based on the ingredients listed, so check labels if you have an allergy.</div>` : '';
  const addAct = m.kind === 'recipe' ? `data-act="addRecipe" data-id="${r.id}"` : `data-act="addMine" data-id="${r.id}"`;
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet" id="sheet"><div class="panel"><div class="wrap meal-page">
    <div style="display:flex;align-items:center;gap:10px"><div class="small muted">${esc(r.slot || 'Snack')}</div><button type="button" class="btn ghost sm" style="margin-left:auto" data-act="closeSheet">Close</button></div>
    <h3>${esc(r.name)}</h3>
    ${chips}
    ${m.kind === 'recipe' && m.info.src ? `<div class="small muted">Source: ${esc(m.info.src)}</div>` : ''}
    ${m.kind === 'recipe' && m.info.note ? `<div class="small meal-note">${esc(m.info.note)}</div>` : ''}
    <div class="slotlabel">Ingredients${m.kind === 'recipe' && !/batch/i.test(ing.join(' ')) ? ' <span class="aside">1 serve</span>' : ''}</div>
    ${ingHTML}
    ${contains}
    ${method}
    <div class="meal-actions"><button class="btn" ${addAct} data-close="1">Add to today's log</button><button class="btn ghost" data-act="editMeal" data-k="${esc(key)}">${m.kind === 'recipe' ? 'Make it my own' : 'Edit meal'}</button><button class="btn ghost starbtn-wide" data-act="favToggle" data-k="${esc(key)}" data-reopen="${esc(key)}" aria-pressed="${isFav(r.name)}">${starSVG(isFav(r.name))}${isFav(r.name) ? 'Favourite' : 'Add to favourites'}</button></div>
  </div></div></div>`;
  if (editing) setTimeout(() => document.getElementById('meal_ing')?.focus(), 50);
}

/* ---------- favourites, regulars, "what fits", week plan ---------- */
// A loggable snapshot of a meal: name, slot, macros and links back to where it came from.
function snapOf(m) {
  const o = { name: m.name, slot: m.slot || 'Snack', kcal: +m.kcal || 0, p: +m.p || 0, c: +m.c || 0, f: +m.f || 0 };
  for (const k of ['recipe', 'food', 'ing', 'nut', 'drink', 'barcode']) if (m[k] != null) o[k] = m[k];
  return o;
}
function itemFromKey(key) {
  const [t, id] = [key.slice(0, 1), key.slice(2)];
  if (t === 'R') { const r = RECIPES.find(x => x.id === id); return r && { name: r.name, slot: r.slot, kcal: r.kcal, p: r.p, c: r.c, f: r.f, recipe: r.id }; }
  if (t === 'F') { const f = (S.config?.foods || []).find(x => x.id === id); return f && { ...snapOf(f), food: f.id }; }
  if (t === 'Q') { const q = favs().find(x => x.id === id); return q && snapOf(q); }
  return null;
}
function logItem(it, slot) {
  const day = localDay(S.date); day.meals.push({ id: uid(), servings: 1, ...snapOf(it), slot: slot || it.slot || guessSlot() });
  saveDay(S.date, day); toast(`Added ${it.name}`);
}
// Starter meals renamed for launch; favourites saved under the old names still match.
const RENAMED_MEALS = { 'TikTok protein pancake bowl': 'Protein pancake bowl', 'Viral French toast': 'Protein French toast', 'Takeout-style beef and broccoli': 'Beef and broccoli stir-fry', 'Emily Mariko salmon rice bowl': 'Salmon rice bowl', 'Anabolic ice cream': 'Protein berry ice cream' };
function favs() { return (S.config?.favs || []).map(f => RENAMED_MEALS[f.name] ? { ...f, name: RENAMED_MEALS[f.name] } : f); }
function isFav(name) { return favs().some(f => f.name === name); }
function toggleFav(it) {
  const cfg = cfgCopy(); const list = cfg.favs || [];
  if (list.some(f => f.name === it.name)) { cfg.favs = list.filter(f => f.name !== it.name); saveConfig(cfg); toast('Removed from favourites'); return false; }
  cfg.favs = [...list, { id: uid(), ...snapOf(it) }]; saveConfig(cfg); toast('Added to favourites'); return true;
}
function regulars() { // logged at least twice in the last 30 days, most-logged first, not already a favourite
  const since = addDays(todayISO(), -30); const counts = new Map();
  for (const d of Object.values(S.days)) {
    if (d.date < since) continue;
    for (const m of d.meals || []) { const c = counts.get(m.name) || { n: 0, last: null, date: '' }; c.n++; if (d.date >= c.date) { c.last = m; c.date = d.date; } counts.set(m.name, c); }
  }
  return [...counts.entries()].filter(([name, c]) => c.n >= 2 && !isFav(name)).sort((a, b) => b[1].n - a[1].n).slice(0, 6).map(([, c]) => ({ ...snapOf(c.last), times: c.n }));
}
const starSVG = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" ${on ? 'class="on"' : ''}/></svg>`;
function quickRow(it, btn, extra = '') {
  return `<div class="row qrow"><div style="min-width:0"><div class="t">${esc(it.name)}</div><div class="small muted">${r0(it.kcal)} kcal · P ${r0(it.p)} g${extra}</div></div><span class="rowbtns">${btn}</span></div>`;
}

/* week plan: config.weekPlan = { 'YYYY-MM-DD': { Breakfast: [key, ...], ... } }, keys like R:B1, F:<id>, Q:<fav id> */
const PLAN_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
function planDay(date) { return S.config?.weekPlan?.[date] || {}; }
function plannedToday() {
  const pd = planDay(S.date); const logged = {}; for (const m of S.days[S.date]?.meals || []) logged[m.name] = (logged[m.name] || 0) + 1;
  const out = [];
  for (const slot of PLAN_SLOTS) for (const key of pd[slot] || []) { const it = itemFromKey(key); if (!it) continue; const done = logged[it.name] > 0; if (done) logged[it.name]--; out.push({ key, slot, it, done }); }
  return out;
}
function savePlan(mut) {
  const cfg = cfgCopy(); cfg.weekPlan = cfg.weekPlan || {}; mut(cfg.weekPlan);
  const cut = addDays(todayISO(), -35); for (const d of Object.keys(cfg.weekPlan)) { const v = cfg.weekPlan[d]; if (d < cut || !Object.values(v).some(a => a?.length)) delete cfg.weekPlan[d]; }
  S.config = cfg; store.set('config', 'settings', cfg);
}
function planCounts(ws) { // grocery counts (planMeals keys) from a week of the plan
  const counts = {};
  for (let i = 0; i < 7; i++) for (const keys of Object.values(planDay(addDays(ws, i)))) for (const key of keys || []) {
    let k = null; if (key.startsWith('R:')) k = key.slice(2); else if (key.startsWith('F:')) k = 'f:' + key.slice(2);
    else if (key.startsWith('Q:')) { const q = itemFromKey(key); if (q?.recipe) k = q.recipe; else if (q?.food) k = 'f:' + q.food; }
    if (k) counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}
function planOptions(slot) {
  const meals = planMeals(); const opt = m => `<option value="${m.starter ? 'R:' + m.key : 'F:' + m.food.id}">${esc(m.name)} (${r0((m.starter ? RECIPES.find(r => r.id === m.key) : m.food).kcal)} kcal)</option>`;
  const here = meals.filter(m => m.slot === slot), other = meals.filter(m => m.slot !== slot);
  return `<option value="">+ Add ${slot.toLowerCase()}</option>${here.length ? `<optgroup label="${slot}">${here.map(opt).join('')}</optgroup>` : ''}${favs().length ? `<optgroup label="Favourites">${favs().map(q => `<option value="Q:${q.id}">${esc(q.name)} (${r0(q.kcal)} kcal)</option>`).join('')}</optgroup>` : ''}${other.length ? `<optgroup label="Other meals">${other.map(opt).join('')}</optgroup>` : ''}`;
}
// Plan & shop: pick how many times you'll have each meal this week; the shopping list builds underneath.
// config.plan = { 'YYYY-MM-DD' (week start): { key: count } }, keys as planMeals() (recipe id or 'f:<food id>').
function planWs(off = S.planWeek || 0) { return addDays(weekStart(todayISO()), off * 7); }
function weekCounts(ws) {
  const saved = S.config?.plan?.[ws]; if (saved) return saved;
  return planCounts(ws); // weeks planned the old way (day by day) still count
}
function savePlanCounts(ws, mut) {
  const cfg = cfgCopy(); cfg.plan = cfg.plan || {}; const c = { ...(cfg.plan[ws] || weekCounts(ws)) }; mut(c);
  for (const k of Object.keys(c)) if (!c[k]) delete c[k];
  cfg.plan[ws] = c; const cut = addDays(weekStart(todayISO()), -28); for (const w of Object.keys(cfg.plan)) if (w < cut) delete cfg.plan[w];
  S.config = cfg; store.set('config', 'settings', cfg);
}
function mealMacros(m) { const r = m.starter ? RECIPES.find(x => x.id === m.key) : m.food; return { kcal: r?.kcal || 0, p: r?.p || 0 }; }
function openPlanner() {
  const prevScroll = document.querySelector('#sheetRoot .sheet .panel')?.scrollTop || 0;
  const off = S.planWeek || 0; const ws = planWs(off); const T = targets(); const counts = weekCounts(ws);
  const meals = planMeals(); let kcal = 0, p = 0, n = 0;
  for (const m of meals) { const c = counts[m.key] || 0; if (!c) continue; const mm = mealMacros(m); kcal += mm.kcal * c; p += mm.p * c; n += c; }
  const label = `${fmtDay(ws, { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(ws, 6), { day: 'numeric', month: 'short' })}`;
  const avg = n ? `<div class="plan-sum"><div><b>${r0(kcal / 7).toLocaleString()}</b><span>kcal a day</span></div><div><b>${r0(p / 7)}</b><span>g protein a day</span></div><div><b>${n}</b><span>meal${n > 1 ? 's' : ''} planned</span></div></div>
    <div class="small muted">Your target is ${T.kcal.toLocaleString()} kcal and ${T.p} g protein a day. Anything you don't plan (snacks, eating out) fills the gap.</div>`
    : `<div class="small muted">Tap + on the meals you'll have this week, as many times as you'll have them. Your shopping list builds underneath.</div>`;
  const rows = SLOTS.map(slot => {
    const ms = meals.filter(m => m.slot === slot); if (!ms.length) return '';
    return `<div class="slotlabel">${slot}</div>` + ms.map(m => { const c = counts[m.key] || 0; const mm = mealMacros(m);
      return `<div class="row plan-row${c ? ' on' : ''}"><div style="min-width:0"><div class="t">${esc(m.name)}</div><div class="small muted">${r0(mm.kcal)} kcal · ${r0(mm.p)} g protein${!m.starter && !(m.food.ing || []).length ? ' · no ingredients saved' : ''}</div></div>
        <div class="stepper"><button type="button" data-act="planCount" data-k="${esc(m.key)}" data-d="-1" aria-label="Fewer ${esc(m.name)}"${c ? '' : ' disabled'}>−</button><span>${c}×</span><button type="button" data-act="planCount" data-k="${esc(m.key)}" data-d="1" aria-label="More ${esc(m.name)}">+</button></div></div>`; }).join('');
  }).join('');
  const spread = S.config?.planSpread?.[ws];
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet"><div class="panel"><div class="wrap planner">
    <div style="display:flex;align-items:center;gap:10px"><h3>Plan &amp; shop</h3><button type="button" class="btn ghost sm" style="margin-left:auto" data-act="closeSheet">Close</button></div>
    <div class="seg" role="group" aria-label="Week"><button type="button" data-act="planWeek" data-v="0" aria-pressed="${off === 0}">This week</button><button type="button" data-act="planWeek" data-v="1" aria-pressed="${off === 1}">Next week</button></div>
    <div class="small"><b>${label}</b></div>
    ${avg}
    <div class="card rows">${rows || '<div class="empty"><b>Your meal plan is empty.</b>Add meals in Log food → Add a meal first.</div>'}</div>
    ${n ? `<div class="card" style="display:grid;gap:8px"><div class="small">${spread ? `<b>On your days.</b> Each day's meals show at the top of Log food for one-tap logging.` : `Want each day's meals ready to tap in Log food? Spread them across the week.`}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn ${spread ? 'ghost ' : ''}sm" data-act="planSpread">${spread ? 'Re-spread' : 'Spread across the week'}</button>${spread ? '<button type="button" class="btn ghost sm" data-act="planUnspread">Clear the days</button>' : ''}${off === 1 || Object.keys(S.config?.plan?.[planWs(off - 1)] || {}).length ? '' : ''}<button type="button" class="btn ghost sm" data-act="planCopy">Copy last week</button></div></div>` : `<div><button type="button" class="btn ghost sm" data-act="planCopy">Copy last week</button></div>`}
    ${groceryHTML(ws)}
  </div></div></div>`;
  const pn = document.querySelector('#sheetRoot .sheet .panel'); if (pn) pn.scrollTop = prevScroll;
}
function groceryHTML(ws) {
  const g = S.config?.grocery || {}; const checked = g.checked || {}; const have = g.have || {};
  const items = groceryItems(ws); const need = items.filter(i => !have[i.key]); const had = items.filter(i => have[i.key]);
  const left = need.filter(i => !checked[i.key]).length;
  const row = i => `<div class="groc ${checked[i.key] ? 'done' : ''}"><label class="gl"><input type="checkbox" data-groc="${esc(i.key)}" ${checked[i.key] ? 'checked' : ''}><span class="gn">${esc(i.name)}</span><span class="gq">${esc(i.qty)}</span></label>${i.extra ? `<button type="button" class="linkbtn small" data-act="grocDelExtra" data-v="${i.extra}" aria-label="Remove ${esc(i.name)}">×</button>` : `<button type="button" class="linkbtn small" data-act="grocHave" data-k="${esc(i.key)}">Have it</button>`}</div>`;
  const list = need.length ? AISLES.map(a => {
    const xs = need.filter(i => i.aisle === a); if (!xs.length) return '';
    return `<div class="slotlabel">${a}</div>` + xs.map(row).join('');
  }).join('') : `<div class="empty">${items.length ? '<b>Nothing left to buy.</b>Everything is ticked off or already in your pantry.' : '<b>Your list is empty.</b>Plan some meals above and their ingredients add up here.'}</div>`;
  return `<section class="sec"><h2>Shopping list <span class="aside">${need.length ? `${left} of ${need.length} left` : ''}</span></h2>
    <div class="card">${list}
      <div class="formrow" style="margin-top:10px"><label class="f">Add something else<input type="text" id="groc_extra" placeholder="e.g. paper towel"></label><button type="button" class="btn ghost" data-act="grocAddExtra">Add</button></div>
    </div>
    ${had.length ? `<details class="card small"><summary><b>Already have (${had.length})</b> <span class="muted">· left off the list</span></summary>${had.map(i => `<div class="groc"><span class="gl"><span class="gn">${esc(i.name)}</span><span class="gq">${esc(i.qty)}</span></span><button type="button" class="linkbtn small" data-act="grocHave" data-k="${esc(i.key)}">Need it</button></div>`).join('')}</details>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn sm" data-act="grocShare"${need.length ? '' : ' disabled'}>Share list</button><button type="button" class="btn ghost sm" data-act="grocUntick">Untick all</button></div>
  </section>`;
}
function groceryText(ws) {
  const g = S.config?.grocery || {}; const checked = g.checked || {}; const have = g.have || {};
  const need = groceryItems(ws).filter(i => !have[i.key] && !checked[i.key]);
  const label = `${fmtDay(ws, { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(ws, 6), { day: 'numeric', month: 'short' })}`;
  return `Shopping list (${label})\n` + AISLES.map(a => { const xs = need.filter(i => i.aisle === a); return xs.length ? `\n${a}\n` + xs.map(i => `- ${i.name}${i.qty ? ' (' + i.qty + ')' : ''}`).join('\n') : ''; }).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
function spreadPlan(ws) {
  const counts = weekCounts(ws); const meals = planMeals();
  savePlan(wp => {
    for (let i = 0; i < 7; i++) delete wp[addDays(ws, i)];
    for (const slot of SLOTS) {
      const queue = []; for (const m of meals.filter(x => x.slot === slot)) for (let k = 0; k < (counts[m.key] || 0); k++) queue.push(m.starter ? 'R:' + m.key : 'F:' + m.food.id);
      const pslot = PLAN_SLOTS.includes(slot) ? slot : 'Snack';
      queue.forEach((key, j) => { const d = addDays(ws, j % 7); wp[d] = wp[d] || {}; (wp[d][pslot] = wp[d][pslot] || []).push(key); });
    }
  });
  const cfg = cfgCopy(); cfg.planSpread = { ...(cfg.planSpread || {}), [ws]: true }; S.config = cfg; store.set('config', 'settings', cfg);
}

/* ---------- starter meals: original recipes by eating style, sized to each person's targets ---------- */
const ING_ALLERGENS = {"whey": ["dairy"], "greek_yog_0": ["dairy"], "skim_milk": ["dairy"], "cottage_cheese": ["dairy"], "parmesan": ["dairy"], "light_mozz": ["dairy"], "light_cheese": ["dairy"], "feta": ["dairy"], "halloumi": ["dairy"], "choc_chips": ["dairy", "soy"], "egg": ["egg"], "egg_white": ["egg"], "mayo": ["egg"], "kewpie": ["egg"], "oats": ["gluten"], "sourdough": ["gluten"], "flour": ["gluten"], "tortilla": ["gluten"], "penne_dry": ["gluten"], "orzo_dry": ["gluten"], "wholegrain_bread": ["gluten"], "granola": ["gluten", "nuts"], "taco_season": ["gluten"], "broth": ["gluten"], "soy": ["soy", "gluten"], "almonds": ["nuts"], "almond_milk": ["nuts"], "peanut_butter": ["nuts"], "firm_tofu": ["soy"], "tempeh": ["soy"], "edamame": ["soy"], "soy_milk": ["soy"], "soy_yoghurt": ["soy"], "tamari": ["soy"], "salmon": ["fish"], "tuna": ["fish"], "white_fish": ["fish"], "smoked_salmon": ["fish"], "kimchi": ["fish", "shellfish"], "prawns": ["shellfish"], "hummus": ["sesame"], "tahini": ["sesame"], "sesame_oil": ["sesame"]};
const ALLERGEN_LABEL = { dairy: 'Dairy', gluten: 'Gluten', egg: 'Egg', nuts: 'Nuts', soy: 'Soy', fish: 'Fish', shellfish: 'Shellfish', sesame: 'Sesame' };
const STYLES = [['all', 'Everything'], ['pesc', 'Pescatarian'], ['veg', 'Vegetarian'], ['vegan', 'Vegan']];
const SLOT_SHARE = { Breakfast: 0.25, Lunch: 0.3, Dinner: 0.3, Snack: 0.15 };
// [id, style, slot, name, [[ingredient, grams]], method]
const STARTER_LIB = [["s01", "all", "Breakfast", "Ham, egg & spinach wrap", [["egg", 110], ["egg_white", 100], ["ham", 50], ["spinach", 30], ["light_cheese", 20], ["tortilla", 60]], ["Whisk the eggs and egg whites, then scramble in a non-stick pan over medium heat with the spinach.", "Warm the wrap, layer the ham and cheese, then add the eggs.", "Roll it up tight and toast it seam-side down for 1 minute."]], ["s02", "all", "Breakfast", "Turkey & potato breakfast hash", [["turkey_mince", 120], ["potato", 200], ["capsicum", 80], ["onion", 50], ["spinach", 30], ["egg", 55], ["olive_oil", 5]], ["Dice the potato small and microwave it for 4 minutes to soften.", "Fry the potato in the oil until golden, then add the mince, onion and capsicum and cook until browned.", "Stir through the spinach and top with a fried or poached egg."]], ["s03", "all", "Breakfast", "Berry protein oats", [["oats", 50], ["whey", 25], ["greek_yog_0", 120], ["skim_milk", 150], ["berries", 100], ["chia", 5]], ["Stir the oats, protein powder, yoghurt, milk and chia together in a jar.", "Refrigerate overnight, or microwave for 2 minutes for a warm version.", "Top with the berries."]], ["s04", "all", "Lunch", "Teriyaki chicken rice bowl", [["chicken_breast", 150], ["white_rice_cooked", 180], ["broccoli", 100], ["carrot", 50], ["soy", 15], ["honey", 10], ["sesame_oil", 3]], ["Slice the chicken and pan-fry until cooked through.", "Add the soy sauce and honey and toss until sticky.", "Serve over the rice with steamed broccoli and grated carrot, drizzled with the sesame oil."]], ["s05", "all", "Lunch", "Beef burrito bowl", [["lean_beef", 140], ["brown_rice_cooked", 150], ["black_beans", 70], ["corn", 40], ["salsa", 50], ["lettuce", 30], ["greek_yog_0", 40], ["taco_season", 8]], ["Brown the beef (or lean mince) with the taco seasoning and a splash of water.", "Warm the rice, beans and corn.", "Build the bowl with lettuce, salsa and a spoon of yoghurt as sour cream."]], ["s06", "all", "Lunch", "Chicken Caesar-style wrap", [["chicken_breast", 130], ["tortilla", 60], ["lettuce", 40], ["parmesan", 10], ["greek_yog_0", 40], ["mayo", 8]], ["Grill the chicken and slice it.", "Mix the yoghurt, mayo and a squeeze of lemon for a light dressing.", "Fill the wrap with lettuce, chicken, parmesan and dressing, then roll."]], ["s07", "all", "Dinner", "Beef & broccoli rice noodles", [["lean_beef", 150], ["rice_noodles", 200], ["broccoli", 120], ["capsicum", 60], ["tamari", 15], ["cornflour", 5], ["olive_oil", 5]], ["Slice the beef thinly and stir-fry in the oil over high heat for 2 minutes, then set aside.", "Stir-fry the broccoli and capsicum, then add the tamari mixed with the cornflour and a splash of water.", "Toss the beef and noodles through until glossy."]], ["s08", "all", "Dinner", "Chicken thigh & sweet potato tray bake", [["chicken_thigh", 170], ["sweet_potato", 250], ["broccolini", 100], ["olive_oil", 7], ["greek_yog_0", 50]], ["Toss the chicken and cubed sweet potato with the oil, paprika, salt and pepper.", "Roast at 220 °C for 30 minutes, adding the broccolini for the last 10.", "Serve with the yoghurt mixed with garlic and lemon."]], ["s09", "all", "Dinner", "Turkey bolognese pasta", [["turkey_mince", 150], ["penne_dry", 80], ["passata", 150], ["onion", 50], ["spinach", 30], ["parmesan", 10], ["olive_oil", 4]], ["Cook the pasta.", "Soften the onion in the oil, brown the mince, then add the passata and simmer for 10 minutes.", "Stir in the spinach and pasta and finish with parmesan."]], ["s10", "all", "Snack", "Yoghurt, berries & granola", [["greek_yog_0", 200], ["berries", 100], ["granola", 25]], ["Spoon the yoghurt into a bowl.", "Top with the berries and granola."]], ["s11", "all", "Snack", "Protein shake & banana", [["whey", 30], ["skim_milk", 250], ["banana", 110]], ["Shake or blend the protein powder with the milk.", "Have it with the banana, or blend the banana in."]], ["s12", "all", "Snack", "Eggs & avocado rice cakes", [["egg", 110], ["rice_cake", 15], ["avocado", 40]], ["Boil the eggs for 8 minutes, then peel and slice.", "Spread the avocado on the rice cakes and top with the egg, salt and pepper."]], ["s13", "pesc", "Breakfast", "Smoked salmon & eggs on toast", [["egg", 110], ["egg_white", 60], ["smoked_salmon", 50], ["wholegrain_bread", 70], ["spinach", 30]], ["Toast the bread.", "Softly scramble the eggs and egg whites with the spinach.", "Serve on the toast topped with the smoked salmon and cracked pepper."]], ["s14", "pesc", "Breakfast", "Tuna & egg muffin melt", [["tuna", 70], ["egg", 55], ["wholegrain_bread", 70], ["light_cheese", 20], ["tomato", 60]], ["Mix the tuna with pepper and a little lemon.", "Toast the bread, top with tuna, tomato and cheese, and grill until melted.", "Serve with a fried or poached egg."]], ["s15", "pesc", "Breakfast", "Cottage cheese berry bowl", [["cottage_cheese", 200], ["berries", 120], ["oats", 30], ["chia", 10], ["honey", 8]], ["Spoon the cottage cheese into a bowl.", "Top with the berries, oats and chia.", "Drizzle with honey."]], ["s16", "pesc", "Lunch", "Tuna sushi bowl", [["tuna", 95], ["white_rice_cooked", 170], ["edamame", 50], ["cucumber", 60], ["avocado", 40], ["tamari", 10], ["kewpie", 8]], ["Season the warm rice with a splash of rice vinegar.", "Top with tuna, edamame, cucumber and avocado.", "Finish with tamari and a drizzle of mayo."]], ["s17", "pesc", "Lunch", "Garlic prawn & quinoa salad", [["prawns", 150], ["quinoa_cooked", 150], ["spinach", 40], ["tomato", 80], ["feta", 30], ["olive_oil", 7]], ["Pan-fry the prawns with garlic in the oil for 2–3 minutes until pink.", "Toss the quinoa, spinach and tomatoes with lemon juice.", "Top with the prawns and crumbled feta."]], ["s18", "pesc", "Lunch", "Salmon & sweet potato salad", [["salmon", 120], ["sweet_potato", 200], ["spinach", 40], ["cucumber", 60], ["greek_yog_0", 40]], ["Roast the cubed sweet potato at 220 °C for 25 minutes.", "Bake or pan-fry the salmon for 10–12 minutes.", "Serve on spinach and cucumber with yoghurt mixed with lemon and dill."]], ["s19", "pesc", "Dinner", "Baked fish with potatoes & greens", [["white_fish", 180], ["potato", 250], ["broccolini", 100], ["peas", 60], ["olive_oil", 7]], ["Roast the halved potatoes in the oil at 220 °C for 30 minutes.", "Add the fish to the tray for the last 12 minutes with lemon and herbs.", "Serve with steamed broccolini and peas."]], ["s20", "pesc", "Dinner", "Prawn stir-fry with rice noodles", [["prawns", 160], ["rice_noodles", 200], ["capsicum", 80], ["zucchini", 80], ["tamari", 15], ["sesame_oil", 4], ["sweet_chilli", 15]], ["Stir-fry the prawns in the sesame oil until pink, then set aside.", "Stir-fry the capsicum and zucchini for 3 minutes.", "Add the noodles, tamari, sweet chilli and prawns and toss to coat."]], ["s21", "pesc", "Dinner", "Teriyaki salmon with rice & broccolini", [["salmon", 140], ["white_rice_cooked", 170], ["broccolini", 100], ["tamari", 15], ["maple", 10]], ["Mix the tamari and maple syrup and brush over the salmon.", "Bake at 200 °C for 12 minutes.", "Serve with the rice and steamed broccolini."]], ["s22", "pesc", "Snack", "Tuna & rice crackers", [["tuna", 95], ["rice_crackers", 20], ["cucumber", 60]], ["Season the tuna with lemon and pepper.", "Serve with the rice crackers and sliced cucumber."]], ["s23", "pesc", "Snack", "Greek yoghurt & berries", [["greek_yog_0", 200], ["berries", 100], ["honey", 8]], ["Top the yoghurt with the berries.", "Drizzle with honey."]], ["s24", "pesc", "Snack", "Smoked salmon cucumber bites", [["smoked_salmon", 60], ["cottage_cheese", 80], ["cucumber", 120], ["rice_cake", 15]], ["Slice the cucumber into thick rounds.", "Top the cucumber and rice cakes with cottage cheese and smoked salmon."]], ["s25", "veg", "Breakfast", "Veggie omelette with feta", [["egg", 110], ["egg_white", 100], ["mushrooms", 60], ["spinach", 30], ["feta", 25], ["wholegrain_bread", 45]], ["Cook the mushrooms and spinach in a non-stick pan.", "Pour in the whisked eggs and egg whites and cook until nearly set.", "Add the feta, fold, and serve with toast."]], ["s26", "veg", "Breakfast", "Yoghurt protein bowl", [["greek_yog_0", 200], ["whey", 20], ["berries", 100], ["granola", 30], ["chia", 5]], ["Stir the protein powder into the yoghurt until smooth.", "Top with the berries, granola and chia."]], ["s27", "veg", "Breakfast", "Egg & black bean breakfast burrito", [["egg", 110], ["egg_white", 60], ["black_beans", 60], ["light_cheese", 20], ["salsa", 40], ["tortilla", 60]], ["Scramble the eggs and egg whites.", "Warm the beans.", "Fill the wrap with eggs, beans, cheese and salsa, then roll and toast."]], ["s28", "veg", "Lunch", "Halloumi & quinoa salad", [["halloumi", 80], ["quinoa_cooked", 170], ["spinach", 40], ["cucumber", 60], ["tomato", 80], ["chickpeas", 60], ["olive_oil", 5]], ["Slice the halloumi and pan-fry until golden.", "Toss the quinoa, chickpeas, spinach, cucumber and tomato with lemon and the oil.", "Top with the halloumi."]], ["s29", "veg", "Lunch", "Chickpea & feta wrap", [["chickpeas", 100], ["feta", 30], ["greek_yog_0", 40], ["lettuce", 30], ["tomato", 60], ["tortilla", 60]], ["Roughly mash the chickpeas with the yoghurt, lemon and pepper.", "Fill the wrap with the chickpea mix, feta, lettuce and tomato.", "Roll up and toast if you like."]], ["s30", "veg", "Lunch", "Egg fried rice with edamame", [["white_rice_cooked", 180], ["egg", 110], ["edamame", 80], ["peas", 50], ["carrot", 50], ["tamari", 10], ["sesame_oil", 4]], ["Stir-fry the carrot, peas and edamame in the sesame oil.", "Push to the side, scramble the eggs, then add the rice.", "Toss everything with the tamari until hot."]], ["s31", "veg", "Dinner", "Lentil bolognese pasta", [["lentils", 150], ["penne_dry", 80], ["passata", 150], ["onion", 50], ["mushrooms", 80], ["parmesan", 15], ["olive_oil", 4]], ["Cook the pasta.", "Soften the onion and mushrooms in the oil, add the lentils and passata, and simmer for 10 minutes.", "Toss with the pasta and top with parmesan."]], ["s32", "veg", "Dinner", "Black bean & cheese enchilada bake", [["black_beans", 120], ["corn_tortilla", 75], ["light_cheese", 35], ["salsa", 80], ["corn", 50], ["greek_yog_0", 50], ["spinach", 30]], ["Mix the beans, corn, spinach and half the salsa.", "Fill and roll the tortillas, place in a dish, top with the rest of the salsa and the cheese.", "Bake at 200 °C for 15 minutes and serve with yoghurt."]], ["s33", "veg", "Dinner", "Tofu, chickpea & spinach curry", [["firm_tofu", 120], ["chickpeas", 80], ["spinach", 60], ["passata", 100], ["coconut_milk", 80], ["brown_rice_cooked", 150]], ["Brown the cubed tofu in a pan.", "Add curry powder, the passata, coconut milk and chickpeas and simmer for 10 minutes.", "Stir in the spinach and serve with the rice."]], ["s34", "veg", "Snack", "Cottage cheese & tomato rice cakes", [["cottage_cheese", 150], ["rice_cake", 22], ["tomato", 80]], ["Spread the cottage cheese on the rice cakes.", "Top with sliced tomato, salt and pepper."]], ["s35", "veg", "Snack", "Eggs with hummus & veggie sticks", [["egg", 110], ["hummus", 40], ["carrot", 80], ["cucumber", 80]], ["Boil the eggs for 8 minutes, then peel.", "Serve with hummus and carrot and cucumber sticks."]], ["s36", "veg", "Snack", "Banana protein smoothie", [["whey", 30], ["skim_milk", 250], ["banana", 110], ["oats", 15]], ["Blend everything with a handful of ice until smooth."]], ["s37", "vegan", "Breakfast", "Tofu scramble on toast", [["firm_tofu", 180], ["spinach", 40], ["tomato", 80], ["nutritional_yeast", 8], ["wholegrain_bread", 70], ["olive_oil", 4]], ["Crumble the tofu into a pan with the oil, turmeric, salt and pepper.", "Add the spinach and tomato and cook until hot.", "Stir through the nutritional yeast and serve on toast."]], ["s38", "vegan", "Breakfast", "Vegan protein oats", [["oats", 50], ["pea_protein", 25], ["soy_milk", 200], ["banana", 80], ["chia", 8], ["berries", 60]], ["Cook the oats in the soy milk for 3 minutes, or soak overnight.", "Stir in the protein powder and chia.", "Top with banana and berries."]], ["s39", "vegan", "Breakfast", "Soy yoghurt smoothie bowl", [["soy_yoghurt", 200], ["pea_protein", 25], ["berries", 120], ["banana", 60], ["pumpkin_seeds", 10]], ["Blend the yoghurt, protein powder, berries and banana until thick.", "Pour into a bowl and top with pumpkin seeds."]], ["s40", "vegan", "Lunch", "Chickpea & quinoa tahini salad", [["chickpeas", 150], ["quinoa_cooked", 150], ["spinach", 40], ["cucumber", 60], ["tomato", 80], ["tahini", 15]], ["Toss the chickpeas, quinoa and veg together.", "Whisk the tahini with lemon juice and water into a dressing.", "Pour over the salad."]], ["s41", "vegan", "Lunch", "Tempeh burrito bowl", [["tempeh", 120], ["brown_rice_cooked", 150], ["black_beans", 70], ["corn", 40], ["salsa", 50], ["avocado", 40], ["taco_season", 6]], ["Crumble the tempeh and fry with the taco seasoning and a splash of water.", "Warm the rice, beans and corn.", "Build the bowl and top with salsa and avocado."]], ["s42", "vegan", "Lunch", "Teriyaki tofu rice bowl", [["firm_tofu", 160], ["white_rice_cooked", 170], ["edamame", 60], ["broccoli", 100], ["tamari", 15], ["maple", 10]], ["Press and cube the tofu, then pan-fry until golden.", "Add the tamari and maple syrup and toss until sticky.", "Serve over rice with edamame and steamed broccoli."]], ["s43", "vegan", "Dinner", "Vegan lentil bolognese", [["lentils", 180], ["penne_dry", 80], ["passata", 150], ["onion", 50], ["mushrooms", 80], ["nutritional_yeast", 8], ["olive_oil", 4]], ["Cook the pasta.", "Soften the onion and mushrooms in the oil, add the lentils and passata, and simmer for 10 minutes.", "Toss with the pasta and sprinkle with nutritional yeast."]], ["s44", "vegan", "Dinner", "Tofu & veg stir-fry with noodles", [["firm_tofu", 160], ["rice_noodles", 200], ["broccoli", 100], ["capsicum", 80], ["tamari", 15], ["sesame_oil", 4], ["sweet_chilli", 10]], ["Pan-fry the cubed tofu in the sesame oil until crisp, then set aside.", "Stir-fry the broccoli and capsicum.", "Add the noodles, tamari, sweet chilli and tofu and toss."]], ["s45", "vegan", "Dinner", "Chickpea & spinach curry", [["chickpeas", 180], ["firm_tofu", 80], ["spinach", 60], ["passata", 120], ["coconut_milk", 80], ["brown_rice_cooked", 150]], ["Fry curry powder and garlic for 30 seconds.", "Add the passata, coconut milk, chickpeas and cubed tofu and simmer for 10 minutes.", "Stir in the spinach and serve with the rice."]], ["s46", "vegan", "Snack", "Soy yoghurt, berries & seeds", [["soy_yoghurt", 200], ["berries", 100], ["pumpkin_seeds", 15]], ["Top the yoghurt with berries and pumpkin seeds."]], ["s47", "vegan", "Snack", "Edamame & rice crackers", [["edamame", 120], ["rice_crackers", 20]], ["Steam or microwave the edamame and sprinkle with salt.", "Serve with the rice crackers."]], ["s48", "vegan", "Snack", "Pea protein shake & banana", [["pea_protein", 30], ["soy_milk", 250], ["banana", 110]], ["Shake or blend the protein powder with the soy milk.", "Have it with the banana, or blend it in."]]].map(([id, style, slot, name, ing, method]) => ({ id, style, slot, name, ing, method }));

function libContains(r) { const a = new Set(); for (const [k] of r.ing) for (const x of ING_ALLERGENS[k] || []) a.add(x); return [...a]; }
function libGrams(g) { return g < 20 ? Math.max(1, Math.round(g)) : Math.round(g / 5) * 5; }
function libBase(r) { let kcal = 0; for (const [k, g] of r.ing) kcal += (INGR_MACROS[k]?.[0] || 0) * g / 100; return kcal; }
// The recipe scaled so it fills this slot's share of the day's calories, times the person's own nudge.
function libScaled(r, dayKcal, nudge = 1) {
  const want = (dayKcal || 2000) * SLOT_SHARE[r.slot] * nudge; const f = Math.min(2.5, Math.max(0.4, want / libBase(r)));
  const ing = r.ing.map(([k, g]) => [k, libGrams(g * f)]); const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const [k, g] of ing) { const m = INGR_MACROS[k] || [0, 0, 0, 0]; t.kcal += m[0] * g / 100; t.p += m[1] * g / 100; t.c += m[2] * g / 100; t.f += m[3] * g / 100; }
  return { ing, ...t };
}
function libLine(k, g) { const u = GROCERY_ITEMS[k]?.[2] === 'ml' ? 'ml' : 'g'; return `${g} ${u} ${ingrName(k)}`; }
function spState() { S.sp = S.sp || { style: 'all', avoid: [], picked: {} }; return S.sp; }
// The picker: style tabs, "leave out" allergen chips, three recipes per meal sized for this person, tick to add.
function starterPickerHTML(dayKcal) {
  const sp = spState(); const avoid = new Set(sp.avoid);
  const tabs = `<div class="seg sp-tabs" role="group" aria-label="Eating style">${STYLES.map(([k, l]) => `<button type="button" data-act="spStyle" data-v="${k}" aria-pressed="${sp.style === k}">${l}</button>`).join('')}</div>`;
  const chips = `<div class="sp-avoid"><span class="small muted">Leave out:</span>${Object.entries(ALLERGEN_LABEL).map(([k, l]) => `<button type="button" class="chip chipbtn${avoid.has(k) ? ' on' : ''}" data-act="spAvoid" data-v="${k}" aria-pressed="${avoid.has(k)}">${l}</button>`).join('')}</div>`;
  const slots = SLOTS.filter(sl => SLOT_SHARE[sl]).map(sl => {
    const rs = STARTER_LIB.filter(r => r.style === sp.style && r.slot === sl && !libContains(r).some(a => avoid.has(a)));
    const cards = rs.map(r => {
      const nud = sp.picked[r.id] ?? 1; const on = r.id in sp.picked; const x = libScaled(r, dayKcal, nud); const con = libContains(r);
      return `<div class="sp-card${on ? ' on' : ''}">
        <label class="sp-top"><input type="checkbox" data-sp-pick="${r.id}" ${on ? 'checked' : ''}><span class="sp-name"><b>${esc(r.name)}</b>
          <span class="chips"><span class="chip k">${r0(x.kcal)} kcal</span><span class="chip p">P ${r0(x.p)}</span><span class="chip c">C ${r0(x.c)}</span><span class="chip f">F ${r0(x.f)}</span></span></span></label>
        <div class="small muted">${con.length ? `Contains ${con.map(a => ALLERGEN_LABEL[a].toLowerCase()).join(', ')}` : 'Made without the allergens listed above'}</div>
        <div class="sp-row"><details class="small"><summary>Ingredients and method</summary><ul class="ing-list">${x.ing.map(([k, g]) => `<li>${esc(libLine(k, g))}</li>`).join('')}</ul><ol class="method-list">${r.method.map(m => `<li>${esc(m)}</li>`).join('')}</ol><div class="muted">Plus salt, pepper, herbs and spices to taste.</div></details>
          <div class="stepper sp-size" aria-label="Portion size"><button type="button" data-act="spNudge" data-id="${r.id}" data-d="-0.1" aria-label="Smaller portion">−</button><span>${Math.round(nud * 100)}%</span><button type="button" data-act="spNudge" data-id="${r.id}" data-d="0.1" aria-label="Bigger portion">+</button></div></div>
      </div>`;
    }).join('');
    return `<div class="slotlabel">${sl} <span class="aside">· about ${r0((dayKcal || 2000) * SLOT_SHARE[sl]).toLocaleString()} kcal for you</span></div>${cards || `<div class="empty small">No ${sl.toLowerCase()} recipes in this style without those ingredients. Try another tab, or add your own later.</div>`}`;
  }).join('');
  const n = Object.keys(sp.picked).length;
  return { n, html: `${tabs}${chips}<div class="sp-list">${slots}</div>
    <div class="small muted sp-legal">Each recipe is sized to your daily calories, and you can make any portion bigger or smaller. Allergen info is based on the ingredients listed. Brands vary and some products may contain traces, so always check the label if you have an allergy.</div>` };
}
function starterFood(r, dayKcal, nudge) {
  const x = libScaled(r, dayKcal, nudge); const items = x.ing.map(([k, g]) => itemCalc({ name: ingrName(k), g, per: perFromKey(k), unit: GROCERY_ITEMS[k]?.[2] === 'ml' ? 'ml' : 'g' }));
  const nut = {}; for (const it of items) for (const [k, v] of Object.entries(it.nut || {})) nut[k] = Math.round(((nut[k] || 0) + v) * 100) / 100;
  return { id: uid(), name: r.name, slot: r.slot, kcal: r0(x.kcal), p: r1(x.p), c: r1(x.c), f: r1(x.f), serves: 1, ing: x.ing.map(([k, g]) => libLine(k, g)), items, nut, method: r.method, contains: libContains(r), starter: r.id, groc: x.ing };
}
function addStarterMeals(cfg, dayKcal) { // -> number added
  const sp = spState(); cfg.foods = cfg.foods || []; let n = 0;
  for (const [id, nud] of Object.entries(sp.picked)) { const r = STARTER_LIB.find(x => x.id === id); if (r) { cfg.foods.push(starterFood(r, dayKcal, nud)); n++; } }
  S.sp = null; return n;
}
function openStarterSheet() {
  const prev = document.querySelector('#sheetRoot .sheet .panel')?.scrollTop || 0;
  const { n, html } = starterPickerHTML(targets().kcal);
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet" data-sp="app"><div class="panel"><div class="wrap">
    <div style="display:flex;align-items:center;gap:10px"><h3>Starter meals</h3><button type="button" class="btn ghost sm" style="margin-left:auto" data-act="closeSheet">Close</button></div>
    <div class="small muted">Pick any you like. They're added to your meal plan as your own meals, so you can edit them any time.</div>
    ${html}
    <div class="sp-bar"><button type="button" class="btn" data-act="spAddApp"${n ? '' : ' disabled'}>${n ? `Add ${n} meal${n > 1 ? 's' : ''}` : 'Tick the meals you want'}</button></div>
  </div></div></div>`;
  const pn = document.querySelector('#sheetRoot .sheet .panel'); if (pn) pn.scrollTop = prev;
}
function spRefresh() { if (S.ob && S.ob.step === 4) openOnboarding(); else openStarterSheet(); }

/* "What fits?": rank your meals, favourites and regulars against what's left today */
function fitsCard() {
  if (S.config?.fitsHidden) return `<section class="sec"><h2>What fits <button class="linkbtn h2btn push" data-act="fitsHide" data-v="0">Show</button></h2></section>`;
  const T = targets(); const t = dayTotals(S.days[S.date]); const kLeft = T.kcal - t.kcal, pLeft = T.p - t.p;
  const head = `<h2>What fits <span class="aside">${kLeft > 0 ? `${r0(kLeft).toLocaleString()} kcal${pLeft > 0 ? ` · ${r0(pLeft)} g protein` : ''} left` : ''}</span><button class="linkbtn h2btn" data-act="fitsHide" data-v="1">Hide</button></h2>`;
  if (kLeft < 120) return `<section class="sec">${head}<div class="card small muted">You're at your calories for ${S.date === todayISO() ? 'today' : 'this day'}${pLeft > 5 ? `, with ${r0(pLeft)} g protein still to go. Something like egg whites, a protein shake with water or 0% Greek yoghurt adds protein for few calories` : '. Water, black coffee and tea are free'}.</div></section>`;
  const seen = new Set(); const cands = [];
  const push = (it, key) => { if (!it || seen.has(it.name)) return; seen.add(it.name); cands.push({ it, key }); };
  for (const m of planMeals()) push(itemFromKey(m.starter ? 'R:' + m.key : 'F:' + m.food.id), m.starter ? 'R:' + m.key : 'F:' + m.food.id);
  for (const q of favs()) push(snapOf(q), 'Q:' + q.id);
  regulars().forEach((r, i) => push(r, 'G:' + i));
  const slot = guessSlot();
  const fit = cands.filter(c => c.it.kcal > 0 && c.it.kcal <= kLeft + 40 && !c.it.drink).map(c => {
    const score = pLeft > 10 ? Math.min(c.it.p, pLeft) / Math.max(c.it.kcal, 60) * 100 + c.it.kcal / kLeft * 3 : c.it.kcal / kLeft * 10;
    return { ...c, score: score + (c.it.slot === slot ? 4 : 0) };
  }).sort((a, b) => b.score - a.score).slice(0, 4);
  if (!fit.length) return `<section class="sec">${head}<div class="card small muted">Nothing in your meal plan fits under ${r0(kLeft)} kcal. Try Search for something lighter, like fruit, yoghurt or a protein shake.</div></section>`;
  const rows = fit.map(({ it, key }) => {
    const after = kLeft - it.kcal, pAfter = pLeft - it.p;
    return quickRow(it, `<button class="btn sm" data-act="quickAdd" data-k="${key}">Add</button>`, ` · then ${r0(Math.max(0, after)).toLocaleString()} kcal${pAfter > 0 ? `, ${r0(pAfter)} g protein` : ', protein hit'} left`);
  }).join('');
  return `<section class="sec">${head}<div class="card rows">${rows}</div></section>`;
}
function quickCard() {
  const planned = plannedToday(); const fav = favs(); const reg = regulars();
  if (!planned.length && !fav.length && !reg.length) return '';
  if (S.config?.quickHidden) return `<section class="sec"><h2>Quick add <button class="linkbtn h2btn push" data-act="quickHide" data-v="0" aria-expanded="false">Show</button></h2></section>`;
  let h = '';
  if (planned.length) h += `<div class="slotlabel">Planned for ${S.date === todayISO() ? 'today' : fmtDay(S.date)}</div>` + planned.map(x => quickRow(x.it, x.done ? `<span class="done-tick" aria-label="Logged">✓ Logged</span>` : `<button class="btn sm" data-act="quickAdd" data-k="${x.key}" data-s="${x.slot}">Add</button>`)).join('');
  if (fav.length) h += `<div class="slotlabel">Favourites</div>` + fav.map(q => quickRow(q, `<button class="starbtn" data-act="favToggle" data-k="Q:${q.id}" aria-label="Remove ${esc(q.name)} from favourites" aria-pressed="true">${starSVG(true)}</button><button class="btn sm" data-act="quickAdd" data-k="Q:${q.id}">Add</button>`)).join('');
  if (reg.length) h += `<div class="slotlabel">Your regulars</div>` + reg.map((r, i) => quickRow(r, `<button class="starbtn" data-act="favToggle" data-k="G:${i}" aria-label="Add ${esc(r.name)} to favourites" aria-pressed="false">${starSVG(false)}</button><button class="btn sm" data-act="quickAdd" data-k="G:${i}">Add</button>`, ` · logged ${r.times}× lately`)).join('');
  return `<section class="sec"><h2>Quick add <button class="linkbtn h2btn push" data-act="quickHide" data-v="1" aria-expanded="true">Hide</button></h2><div class="card rows">${h}</div></section>`;
}
function quickItem(key) { return key.startsWith('G:') ? regulars()[+key.slice(2)] : itemFromKey(key); }

/* ---------- Add a meal: build it from scanned / searched ingredients ---------- */
// S.build = { items: [{ name, line, kcal, p, c, f, nut }], serves, mode: null | 'scan' | 'search' }
// S.cf keeps what's typed in the Add a meal form, so scanning or searching doesn't wipe it.
function buildState() { if (!S.build) S.build = { items: [], serves: 1, mode: null }; return S.build; }
function cfVal(id, def = '') { return S.cf && S.cf[id] != null ? S.cf[id] : def; }
function buildTotals() {
  const b = buildState(); const t = { kcal: 0, p: 0, c: 0, f: 0 }; const nut = {}; let anyNut = false;
  for (const it of b.items) { t.kcal += it.kcal; t.p += it.p; t.c += it.c; t.f += it.f; if (it.nut) { anyNut = true; for (const [k, v] of Object.entries(it.nut)) nut[k] = (nut[k] || 0) + v; } }
  const s = Math.max(1, +b.serves || 1); for (const k in t) t[k] /= s; for (const k in nut) nut[k] = Math.round(nut[k] / s * 100) / 100;
  return { ...t, nut: anyNut ? nut : null };
}
function applyBuildTotals() {
  const b = buildState(); S.cf = S.cf || {};
  if (!b.items.length) return;
  const t = buildTotals(); S.cf.cf_kcal = r0(t.kcal); S.cf.cf_p = r1(t.p); S.cf.cf_c = r1(t.c); S.cf.cf_f = r1(t.f);
}
function buildAddItem(it) {
  const b = buildState(); b.items.push(it); b.mode = null; S.scan = { code: '', status: 'idle', product: null }; S.search.pick = null; S.search.qty = 1;
  applyBuildTotals(); render(); toast(`Added ${it.name} to the meal`);
}
function scanResult(s, build) {
  if (s.status === 'loading') return `<div class="empty">Looking up ${esc(s.code)}…</div>`;
  if (s.status === 'notfound') return `<div class="empty"><b>${s.partial ? esc(s.partial) + ' has no nutrition info yet.' : 'Not in the food database yet.'}</b>${build ? 'Try Search instead, or type its numbers into the totals below.' : 'Add it with "Add a meal" using the numbers on the packet.<div style="margin-top:10px"><button class="btn ghost sm" data-act="foodAdd" data-v="custom">Add a meal</button></div>'}</div>`;
  if (s.status === 'error') return `<div class="empty">${esc(s.msg)}</div>`;
  if (s.status === 'found') return productPanel(s, 'off', build);
  return '';
}
function builderCard() {
  const b = buildState(); const t = buildTotals();
  const amt = (it, i) => it.per ? `<label class="amt"><input type="number" inputmode="decimal" step="any" min="0" id="bi_${i}" data-bi="${i}" value="${it.g}" aria-label="Amount of ${esc(it.name)}"><span>${it.unit === 'ml' ? 'ml' : 'g'}</span></label>`
    : it.each ? `<label class="amt"><input type="number" inputmode="decimal" step="0.5" min="0" id="bi_${i}" data-bi="${i}" value="${it.q}" aria-label="How many ${esc(it.name)}"><span>×</span></label>` : '';
  const list = b.items.length ? `<div class="rows build-list">${b.items.map((it, i) => `<div class="row"><div style="min-width:0"><div class="t">${esc(it.per || it.each ? it.name : it.line)}</div><div class="small muted" id="bk_${i}">${r0(it.kcal)} kcal · P ${r0(it.p)} · C ${r0(it.c)} · F ${r0(it.f)}${it.fixed ? ' · fixed' : ''}</div></div><span class="rowbtns">${amt(it, i)}<button type="button" class="xbtn" data-act="buildDel" data-i="${i}" aria-label="Remove ${esc(it.name)}">×</button></span></div>`).join('')}</div>
    <div class="build-total"><span>${b.serves > 1 ? `Per serve (÷ ${b.serves})` : 'Meal total'}</span><b>${r0(t.kcal)} kcal</b><span class="muted">P ${r0(t.p)} · C ${r0(t.c)} · F ${r0(t.f)}</span></div>` : `<div class="small muted">Scan or search each ingredient and enter how much you used. The calories and macros below add themselves up.</div>`;
  let adder = '';
  if (b.mode === 'scan') adder = `<div class="build-adder"><div class="formrow"><label class="f">Barcode number<input type="text" id="sc_code" inputmode="numeric" autocomplete="off" value="${esc(S.scan.code || '')}" placeholder="Scan, or type the number"></label><button type="button" class="btn ghost" data-act="scanLookup">Look up</button></div>
      <div><button type="button" class="btn ghost sm" data-act="openScanner">Open camera again</button> <button type="button" class="linkbtn muted" data-act="buildMode" data-v="">Cancel</button></div>${scanResult(S.scan, true)}</div>`;
  else if (b.mode === 'search') adder = `<div class="build-adder">${searchPanel(true)}<div><button type="button" class="linkbtn muted" data-act="buildMode" data-v="">Cancel</button></div></div>`;
  return `<div class="card build-card"><div class="slotlabel" style="padding-top:0">Build it from ingredients <span class="aside">optional</span></div>
    ${list}
    ${b.mode ? adder : `<div class="build-btns"><button type="button" class="btn ghost sm" data-act="buildScan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M7 8v8M10 8v8M13 8v8M16 8v8"/></svg>Scan barcode</button><button type="button" class="btn ghost sm" data-act="buildMode" data-v="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>Search food</button></div>`}
    ${b.items.length ? `<label class="f serves">Makes how many serves?<input type="number" id="cf_serves" inputmode="numeric" min="1" max="20" value="${b.serves}"></label>` : ''}
  </div>`;
}

/* ---------- editing meals: amounts drive the calories ---------- */
// Per 100 g/ml [kcal, protein, carbs, fat] for the starter-meal ingredients (the same values the starter macros were worked out from).
const INGR_MACROS = {"chicken_breast": [108, 23.0, 0, 1.6], "chicken_thigh": [140, 19.5, 0, 7.0], "lean_beef": [140, 22.0, 0, 5.5], "turkey_mince": [140, 21.0, 0, 6.0], "salmon": [200, 20.0, 0, 13.0], "white_rice_cooked": [130, 2.6, 28.5, 0.3], "brown_rice_cooked": [123, 2.7, 25.6, 1.0], "orzo_dry": [357, 12.5, 72, 1.5], "penne_dry": [350, 13.0, 66, 2.0], "oats": [380, 13.0, 60, 7.0], "whey": [400, 80, 10, 5], "greek_yog_0": [60, 10.0, 4, 0.2], "skim_milk": [36, 3.6, 5, 0.1], "banana": [89, 1.1, 20, 0.3], "peanut_butter": [610, 25, 13, 50], "egg": [143, 12.6, 0.7, 9.5], "egg_white": [50, 11, 0.7, 0.2], "cottage_cheese": [80, 12.5, 3, 2.0], "sourdough": [255, 9, 49, 1.5], "berries": [50, 0.8, 10, 0.3], "maple": [260, 0, 67, 0], "honey": [304, 0.3, 82, 0], "black_beans": [90, 6, 13, 0.5], "corn": [86, 3.3, 17, 1.3], "capsicum": [30, 1, 5, 0.3], "tomato": [18, 0.9, 3, 0.2], "olive_oil": [884, 0, 0, 100], "avocado": [165, 2, 2, 15], "cabbage": [25, 1.3, 4, 0.1], "carrot": [41, 0.9, 7, 0.2], "cucumber": [15, 0.6, 3, 0.1], "kewpie": [680, 1.5, 2, 75], "mayo": [680, 1.5, 2, 75], "sweet_chilli": [220, 0.3, 53, 0.3], "sriracha": [95, 2, 19, 1], "soy": [60, 8, 6, 0], "broccoli": [34, 2.8, 4, 0.4], "broth": [5, 1, 0.3, 0], "cornflour": [360, 0.3, 88, 0], "kimchi": [20, 1.5, 2.5, 0.5], "spinach": [23, 2.9, 1, 0.4], "parmesan": [420, 36, 0, 29], "flour": [364, 10, 73, 1], "tortilla": [300, 8, 46, 7.5], "light_cheese": [300, 30, 0.5, 19], "salsa": [35, 1.3, 6, 0.2], "sweet_potato": [80, 1.6, 17, 0.1], "choc_chips": [490, 5, 60, 27], "almonds": [580, 21, 5, 50], "strawberries": [32, 0.7, 6, 0.3], "almond_milk": [15, 0.5, 0.3, 1.2], "granola": [450, 10, 60, 18], "edamame": [122, 11, 8, 5], "passata": [35, 1.5, 6, 0.2], "onion": [40, 1.1, 7, 0.1], "light_mozz": [250, 25, 1, 16], "taco_season": [300, 6, 55, 5], "chia": [490, 17, 8, 31], "broccolini": [35, 3.5, 3, 0.4], "lettuce": [15, 1.3, 2, 0.2], "rice_cake": [390, 8, 80, 3], "nori": [0, 0, 0, 0], "rice_vinegar": [20, 0, 4, 0], "lime": [25, 0.4, 8, 0.1], "ham": [105, 18, 1.5, 3], "bacon": [124, 19, 0.5, 5], "potato": [77, 2, 15.5, 0.1], "firm_tofu": [144, 15.8, 1.5, 8.7], "tempeh": [192, 20.3, 6, 10.8], "chickpeas": [125, 7, 15.5, 2.6], "lentils": [90, 6.8, 11.8, 0.4], "tuna": [110, 25, 0, 1], "prawns": [85, 20, 0.2, 0.6], "white_fish": [95, 19, 0, 2], "smoked_salmon": [140, 21, 0, 6], "pea_protein": [380, 80, 2, 6], "soy_milk": [40, 3.4, 0.6, 2.2], "soy_yoghurt": [50, 4, 2, 2.3], "hummus": [240, 7, 11, 18], "quinoa_cooked": [120, 4.4, 18.5, 1.9], "rice_noodles": [108, 1.8, 24, 0.2], "wholegrain_bread": [245, 10, 40, 3.5], "feta": [200, 17, 1, 14], "halloumi": [250, 25, 2, 16], "nutritional_yeast": [375, 50, 15, 4], "tahini": [595, 17, 10, 54], "tamari": [60, 10.5, 5.6, 0.1], "sesame_oil": [884, 0, 0, 100], "coconut_milk": [75, 0.6, 2, 7], "pumpkin_seeds": [575, 30, 5, 49], "rice_crackers": [400, 7.5, 82, 4], "mushrooms": [22, 3.1, 0.5, 0.3], "zucchini": [17, 1.2, 2.5, 0.3], "peas": [77, 5.4, 9.5, 0.4], "gf_wrap": [290, 5, 50, 7], "corn_tortilla": [218, 5.7, 40, 2.9]};
const INGR_NAMES = { ham: "Lean leg ham", bacon: "Short-cut bacon", potato: "Potato", firm_tofu: "Firm tofu", tempeh: "Tempeh", chickpeas: "Chickpeas (tinned, drained)", lentils: "Brown lentils (tinned, drained)", tuna: "Tuna in springwater (drained)", prawns: "Raw prawns (peeled)", white_fish: "White fish fillet (raw)", smoked_salmon: "Smoked salmon", pea_protein: "Pea protein powder", soy_milk: "Soy milk (unsweetened)", soy_yoghurt: "Plain soy yoghurt", hummus: "Hummus", quinoa_cooked: "Quinoa (cooked)", rice_noodles: "Rice noodles (cooked)", wholegrain_bread: "Wholegrain bread", feta: "Reduced-fat feta", halloumi: "Light halloumi", nutritional_yeast: "Nutritional yeast", tahini: "Tahini", tamari: "Tamari (gluten-free soy sauce)", sesame_oil: "Sesame oil", coconut_milk: "Light coconut milk", pumpkin_seeds: "Pumpkin seeds", rice_crackers: "Plain rice crackers", mushrooms: "Mushrooms", zucchini: "Zucchini", peas: "Frozen peas", gf_wrap: "Gluten-free wrap", corn_tortilla: "Corn tortilla", white_rice_cooked: 'White rice (cooked)', brown_rice_cooked: 'Brown rice (cooked)', chicken_breast: 'Chicken breast (raw)', chicken_thigh: 'Skinless chicken thigh (raw)', lean_beef: 'Lean beef steak (raw)', turkey_mince: 'Lean turkey mince (raw)', salmon: 'Salmon fillet (raw)', orzo_dry: 'Orzo (dry)', penne_dry: 'Wholemeal penne (dry)', oats: 'Rolled oats', egg: 'Egg', nori: 'Nori sheet' };
function ingrName(key) { return INGR_NAMES[key] || (GROCERY_ITEMS[key] ? GROCERY_ITEMS[key][0] : key.replace(/_/g, ' ')); }
function perFromKey(key) { const m = INGR_MACROS[key]; if (!m) return null; return { kcal: m[0], p: m[1], c: m[2], f: m[3], nut: nutFromKey(key) }; }
function itemCalc(it) { // recompute an editable builder item from its amount
  if (it.per) { const k = (+it.g || 0) / 100; Object.assign(it, { kcal: it.per.kcal * k, p: it.per.p * k, c: it.per.c * k, f: it.per.f * k, line: `${r0(it.g)} ${it.unit === 'ml' ? 'ml' : 'g'} ${it.name}` }); if (it.per.nut) { it.nut = {}; for (const [kk, vv] of Object.entries(it.per.nut)) it.nut[kk] = vv * k; } }
  else if (it.each) { const q = +it.q || 0; Object.assign(it, { kcal: it.each.kcal * q, p: it.each.p * q, c: it.each.c * q, f: it.each.f * q, line: `${q}× ${it.name}` }); }
  return it;
}
function matchLine(line) { // "200 g chicken breast" -> builder item, or null if we can't tell what it is
  const t = line.trim(); const pi = parseIng(t);
  const own = t.replace(/^(\d+(?:[.,]\d+)?|half|½)\s*(kg|g|ml|l|tbsp|tsp)?\b\.?\s*/i, '').trim();
  if (pi && INGR_MACROS[pi[0]]) { const asG = /^\d+(?:[.,]\d+)?\s*(kg|g|ml|l|tbsp|tsp)\b/i.test(t); return itemCalc({ name: asG && own ? own.charAt(0).toUpperCase() + own.slice(1) : ingrName(pi[0]), g: Math.round(pi[1]), per: perFromKey(pi[0]) }); }
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b\.?\s+(.+)$/i);
  if (m) { let q = parseFloat(m[1].replace(',', '.')); if (/^(kg|l)$/i.test(m[2])) q *= 1000; const f = searchCommon(m[3])[0]; if (f) return itemCalc({ name: m[3].charAt(0).toUpperCase() + m[3].slice(1), g: Math.round(q), per: { kcal: f.kcal, p: f.p, c: f.c, f: f.f, nut: f.key ? nutFromKey(f.key) : null } }); }
  return null;
}
function itemsFromFood(f) {
  if (f.items?.length) return JSON.parse(JSON.stringify(f.items)).map(itemCalc);
  const items = [], rest = [];
  for (const l of f.ing || []) { if (/:$/.test(l.trim())) continue; const it = matchLine(l); if (it) items.push(it); else rest.push(l); }
  const serves = f.serves || 1; const sum = { kcal: 0, p: 0, c: 0, f: 0 }; for (const it of items) for (const k in sum) sum[k] += it[k];
  const left = { kcal: f.kcal * serves - sum.kcal, p: f.p * serves - sum.p, c: f.c * serves - sum.c, f: f.f * serves - sum.f };
  if (rest.length || left.kcal > 15) items.push({ name: 'Rest of the meal', line: 'Rest of the meal (from your original numbers)', kcal: Math.max(0, left.kcal), p: Math.max(0, left.p), c: Math.max(0, left.c), f: Math.max(0, left.f), fixed: true });
  return { items, rest };
}
function editMeal(key) {
  const m = mealByKey(key); if (!m) return; const r = m.r;
  let items, rest = [], serves = 1, name = r.name;
  if (m.kind === 'recipe') {
    items = (RECIPE_GROCERY[r.id] || []).filter(([k, g]) => g > 0 && INGR_MACROS[k] && k !== 'nori').map(([k, g]) => itemCalc({ name: ingrName(k), g: Math.round(g * 10) / 10, per: perFromKey(k), unit: ['skim_milk', 'almond_milk', 'broth', 'soy', 'olive_oil', 'rice_vinegar'].includes(k) ? 'ml' : 'g' }));
  } else {
    const x = itemsFromFood(r); if (Array.isArray(x)) items = x; else { items = x.items; rest = x.rest; } serves = r.serves || 1;
  }
  S.build = { items, serves, mode: null, editId: m.kind === 'mine' ? r.id : null, fromRecipe: m.kind === 'recipe' ? r.id : null };
  S.cf = { cf_name: name, cf_slot: r.slot || 'Snack', cf_ing: rest.join('\n'), cf_save: true };
  applyBuildTotals();
  document.getElementById('sheetRoot').innerHTML = ''; S.foodAdd = 'custom'; render();
  setTimeout(() => document.getElementById('customForm')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
}

/* ---------- grocery list ---------- */
const GROCERY_ITEMS = { ham: ["Lean leg ham", "Fridge", "g"], bacon: ["Short-cut bacon", "Meat & fish", "g"], potato: ["Potatoes", "Fruit & veg", "g"], firm_tofu: ["Firm tofu", "Fridge", "g"], tempeh: ["Tempeh", "Fridge", "g"], chickpeas: ["Chickpeas (tinned)", "Pantry", "g"], lentils: ["Brown lentils (tinned)", "Pantry", "g"], tuna: ["Tuna in springwater", "Pantry", "g"], prawns: ["Raw peeled prawns", "Meat & fish", "g"], white_fish: ["White fish fillets", "Meat & fish", "g"], smoked_salmon: ["Smoked salmon", "Fridge", "g"], pea_protein: ["Pea protein powder", "Pantry", "g"], soy_milk: ["Soy milk, unsweetened", "Dairy & eggs", "ml"], soy_yoghurt: ["Plain soy yoghurt", "Dairy & eggs", "g"], hummus: ["Hummus", "Fridge", "g"], quinoa_cooked: ["Quinoa (dry, about ⅓ of cooked weight)", "Pantry", "g", undefined, 0.36], rice_noodles: ["Rice noodles (dry, about ⅖ of cooked weight)", "Pantry", "g", undefined, 0.4], wholegrain_bread: ["Wholegrain bread", "Bakery", "g"], feta: ["Reduced-fat feta", "Dairy & eggs", "g"], halloumi: ["Light halloumi", "Dairy & eggs", "g"], nutritional_yeast: ["Nutritional yeast", "Pantry", "g"], tahini: ["Tahini", "Sauces & spreads", "g"], tamari: ["Tamari", "Sauces & spreads", "ml"], sesame_oil: ["Sesame oil", "Pantry", "ml"], coconut_milk: ["Light coconut milk", "Pantry", "ml"], pumpkin_seeds: ["Pumpkin seeds", "Pantry", "g"], rice_crackers: ["Plain rice crackers", "Pantry", "g"], mushrooms: ["Mushrooms", "Fruit & veg", "g"], zucchini: ["Zucchini", "Fruit & veg", "g"], peas: ["Frozen peas", "Frozen", "g"], gf_wrap: ["Gluten-free wraps", "Bakery", "g"], corn_tortilla: ["Corn tortillas", "Bakery", "g"],
  egg_white: ['Liquid egg whites', 'Dairy & eggs', 'ml'], egg: ['Eggs', 'Dairy & eggs', 'each', 55], greek_yog_0: ['Greek yoghurt, 0% fat', 'Dairy & eggs', 'g'],
  skim_milk: ['Skim milk', 'Dairy & eggs', 'ml'], cottage_cheese: ['Light cottage cheese', 'Dairy & eggs', 'g'], parmesan: ['Parmesan', 'Dairy & eggs', 'g'],
  light_mozz: ['Light mozzarella', 'Dairy & eggs', 'g'], light_cheese: ['Reduced-fat cheese', 'Dairy & eggs', 'g'], almond_milk: ['Unsweetened almond milk', 'Dairy & eggs', 'ml'],
  chicken_breast: ['Chicken breast', 'Meat & fish', 'g'], chicken_thigh: ['Skinless chicken thigh', 'Meat & fish', 'g'], lean_beef: ['Lean beef (flank or rump)', 'Meat & fish', 'g'],
  turkey_mince: ['Lean turkey mince', 'Meat & fish', 'g'], salmon: ['Salmon fillet', 'Meat & fish', 'g'],
  banana: ['Bananas', 'Fruit & veg', 'each', 110], berries: ['Mixed berries', 'Fruit & veg', 'g'], strawberries: ['Strawberries (fresh or frozen)', 'Fruit & veg', 'g'],
  avocado: ['Avocado', 'Fruit & veg', 'g'], spinach: ['Baby spinach', 'Fruit & veg', 'g'], tomato: ['Cherry tomatoes', 'Fruit & veg', 'g'], capsicum: ['Red capsicum', 'Fruit & veg', 'g'],
  cucumber: ['Cucumber', 'Fruit & veg', 'g'], carrot: ['Carrot', 'Fruit & veg', 'g'], cabbage: ['Purple cabbage', 'Fruit & veg', 'g'], broccoli: ['Broccoli', 'Fruit & veg', 'g'],
  broccolini: ['Broccolini', 'Fruit & veg', 'g'], sweet_potato: ['Sweet potato', 'Fruit & veg', 'g'], onion: ['Onion', 'Fruit & veg', 'g'], lettuce: ['Lettuce', 'Fruit & veg', 'g'],
  lime: ['Limes / lemons', 'Fruit & veg', 'each', 30], corn: ['Corn kernels', 'Frozen', 'g'], edamame: ['Shelled edamame', 'Frozen', 'g'],
  sourdough: ['Sourdough bread', 'Bakery', 'g'], tortilla: ['Small soft tortillas', 'Bakery', 'each', 30],
  oats: ['Rolled oats', 'Pantry', 'g'], whey: ['Whey protein', 'Pantry', 'g'], white_rice_cooked: ['White / jasmine rice (dry)', 'Pantry', 'g', null, 1 / 3], brown_rice_cooked: ['Brown rice (dry)', 'Pantry', 'g', null, 1 / 3],
  orzo_dry: ['Orzo', 'Pantry', 'g'], penne_dry: ['Wholemeal penne', 'Pantry', 'g'], flour: ['Plain flour', 'Pantry', 'g'], cornflour: ['Cornflour', 'Pantry', 'g'],
  black_beans: ['Black beans (tinned)', 'Pantry', 'g'], passata: ['Passata', 'Pantry', 'g'], broth: ['Stock (chicken or beef)', 'Pantry', 'ml'], chia: ['Chia seeds', 'Pantry', 'g'],
  granola: ['Granola', 'Pantry', 'g'], almonds: ['Almonds', 'Pantry', 'g'], choc_chips: ['Dark choc chips', 'Pantry', 'g'], rice_cake: ['Rice cakes', 'Pantry', 'each', 7.5],
  nori: ['Nori sheets', 'Pantry', 'sheets'], taco_season: ['Taco seasoning', 'Pantry', 'g'], olive_oil: ['Olive oil', 'Pantry', 'ml'],
  peanut_butter: ['Peanut butter', 'Sauces & spreads', 'g'], maple: ['Maple syrup', 'Sauces & spreads', 'g'], honey: ['Honey', 'Sauces & spreads', 'g'], mayo: ['Mayonnaise', 'Sauces & spreads', 'g'],
  kewpie: ['Kewpie mayo', 'Sauces & spreads', 'g'], sweet_chilli: ['Sweet chilli sauce', 'Sauces & spreads', 'g'], sriracha: ['Sriracha', 'Sauces & spreads', 'g'], soy: ['Soy sauce', 'Sauces & spreads', 'ml'],
  salsa: ['Salsa', 'Sauces & spreads', 'g'], rice_vinegar: ['Rice vinegar', 'Sauces & spreads', 'ml'], kimchi: ['Kimchi', 'Fridge', 'g'],
};
const AISLES = ['Fruit & veg', 'Meat & fish', 'Dairy & eggs', 'Fridge', 'Bakery', 'Frozen', 'Pantry', 'Sauces & spreads', 'Other'];
function planMeals() {
  const hidden = new Set(S.config?.hiddenRecipes || []);
  return [...RECIPES.filter(r => !hidden.has(r.id)).map(r => ({ key: r.id, name: r.name, slot: r.slot, starter: true })),
    ...(S.config?.foods || []).map(f => ({ key: 'f:' + f.id, name: f.name, slot: f.slot || 'Snack', food: f }))];
}
function grocPlanMode() { const g = S.config?.grocery || {}; return g.mode ? g.mode === 'plan' : Object.keys(planCounts(addDays(weekStart(todayISO()), (S.grocWeek || 0) * 7))).length > 0; }
function groceryItems(ws = planWs()) {
  const g = S.config?.grocery || {}; const counts = weekCounts(ws);
  const sums = {}; const loose = {};
  for (const m of planMeals()) {
    const n = counts[m.key] || 0; if (!n) continue;
    if (m.starter) {
      for (const [ing, grams] of RECIPE_GROCERY[m.key] || []) sums[ing] = (sums[ing] || 0) + grams * n;
    } else if (m.food.groc?.length) {
      for (const [ing, grams] of m.food.groc) sums[ing] = (sums[ing] || 0) + grams * n;
    } else {
      for (const line of m.food.ing || []) {
        const t = line.trim(); if (!t) continue;
        const mm = t.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b\.?\s+(.+)$/i);
        if (mm) {
          let q = parseFloat(mm[1].replace(',', '.')); let u = mm[2].toLowerCase();
          if (u === 'kg') { q *= 1000; u = 'g'; } if (u === 'l') { q *= 1000; u = 'ml'; }
          const key = 'x:' + mm[3].toLowerCase() + '|' + u;
          loose[key] = loose[key] || { name: mm[3], unit: u, q: 0 }; loose[key].q += q * n;
        } else { const key = 'x:' + t.toLowerCase(); loose[key] = loose[key] || { name: t, unit: 'x', q: 0 }; loose[key].q += n; }
      }
    }
  }
  const out = [];
  for (const [ing, total] of Object.entries(sums)) {
    const [name, aisle, unit, per, factor] = GROCERY_ITEMS[ing] || [ing, 'Other', 'g'];
    let qty;
    if (unit === 'each') qty = `${Math.max(1, Math.ceil(total / per))}`;
    else if (unit === 'sheets') qty = `${Math.ceil(total)} sheet${Math.ceil(total) > 1 ? 's' : ''}`;
    else { const q = total * (factor || 1); qty = q >= 1000 ? `${r1(q / 1000)} ${unit === 'ml' ? 'L' : 'kg'}` : `${Math.ceil(q / 5) * 5} ${unit}`; }
    out.push({ key: ing, name, aisle, qty });
  }
  for (const [key, v] of Object.entries(loose)) out.push({ key, name: v.name, aisle: 'Other', qty: v.unit === 'x' ? (v.q > 1 ? `×${v.q}` : '') : `${Math.ceil(v.q)} ${v.unit}` });
  for (const x of g.extra || []) out.push({ key: 'e:' + x.id, name: x.text, aisle: 'Other', qty: '', extra: x.id });
  return out;
}
function openGrocery() { openPlanner(); }
function saveGrocery(mut) { const cfg = cfgCopy(); cfg.grocery = cfg.grocery || { counts: {}, checked: {}, extra: [] }; cfg.grocery.counts ||= {}; cfg.grocery.checked ||= {}; cfg.grocery.extra ||= []; mut(cfg.grocery); store.set('config', 'settings', cfg); openGrocery(); }

/* ---------- personal bests + confetti ---------- */
function detectPBs(doc, key) {
  const pbs = [];
  for (const ex of doc.exercises) {
    if (STEP_EXERCISES.has(ex.name) || !ex.sets.length) continue;
    let prevBest = 0, prevMax = 0, had = false;
    for (const [id, s] of Object.entries(S.sessions)) {
      if (id === key) continue;
      const e = (s.exercises || []).find(x => x.name === ex.name); if (!e) continue;
      for (const st of e.sets || []) { had = true; prevBest = Math.max(prevBest, e1rm(st)); prevMax = Math.max(prevMax, st.kg); }
    }
    if (!had) continue;
    const best = ex.sets.reduce((b, st) => e1rm(st) > e1rm(b) ? st : b, ex.sets[0]);
    const nowE = e1rm(best), nowMax = Math.max(...ex.sets.map(s => s.kg));
    if (nowMax > prevMax + 1e-9) pbs.push({ name: ex.name, text: `${kgFmt(nowMax)} kg, your heaviest yet (up from ${kgFmt(prevMax)} kg)` });
    else if (nowE > prevBest + 0.25) pbs.push({ name: ex.name, text: `${kgFmt(best.kg)} kg × ${best.reps}: estimated 1RM ${kgFmt(r1(nowE))} kg (+${kgFmt(r1(nowE - prevBest))} kg)` });
  }
  return pbs;
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
  const W = innerWidth, H = innerHeight, dpr = devicePixelRatio || 1; c.width = W * dpr; c.height = H * dpr;
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const soft = document.documentElement.dataset.style === 'soft';
  const cols = soft ? ['#F48FB5', '#E2588F', '#F7A3C2', '#FFFFFF', '#F6C445', '#C9A7F0', '#FFD1E1'] : ['#C9302A', '#2A5BC9', '#D29C00', '#2F8A4C', '#F06AA0', '#17202A'];
  const parts = Array.from({ length: 170 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * 0.7, vx: (Math.random() - 0.5) * 2.4, vy: 2.2 + Math.random() * 3.2, r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.22, s: 5 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)], w: Math.random() * 6.3, flower: soft && Math.random() < 0.18 }));
  const t0 = performance.now();
  (function frame(t) {
    const el = t - t0; x.clearRect(0, 0, W, H); let alive = false;
    for (const p of parts) {
      p.w += 0.05; p.x += p.vx + Math.sin(p.w) * 0.9; p.y += p.vy; p.r += p.vr; if (p.y < H + 20) alive = true;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = el > 3600 ? Math.max(0, 1 - (el - 3600) / 800) : 1; x.fillStyle = p.c;
      if (p.flower) { for (let i = 0; i < 5; i++) { x.rotate(Math.PI * 2 / 5); x.beginPath(); x.ellipse(0, -p.s * 0.55, p.s * 0.32, p.s * 0.55, 0, 0, Math.PI * 2); x.fill(); } x.fillStyle = '#F6C445'; x.beginPath(); x.arc(0, 0, p.s * 0.25, 0, Math.PI * 2); x.fill(); }
      else if (soft) { x.beginPath(); x.ellipse(0, 0, p.s * 0.5, p.s, 0, 0, Math.PI * 2); x.fill(); }
      else x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      x.restore();
    }
    if (alive && el < 4400) requestAnimationFrame(frame); else c.remove();
  })(t0);
}
function celebrate(title, lines, extra = '') {
  confetti();
  const root = document.getElementById('celebrateRoot');
  root.innerHTML = `<div class="celebrate" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="card cele-card">
    <div class="cele-title">${esc(title)}</div>${extra}
    ${lines.map(l => `<div class="cele-line">${l.name ? `<b>${esc(l.name)}</b>` : ''}<span>${esc(l.text)}</span></div>`).join('')}
    <button class="btn" data-act="closeCelebrate">Nice!</button></div></div>`;
  root.hidden = false;
}

/* ---------- weekly summary ---------- */
function weekStart(iso) { const d = fromISO(iso); return addDays(iso, -((d.getDay() + 6) % 7)); }
function weekSummary(ws) {
  const we = addDays(ws, 6); const T = targets(); const inWeek = d => d >= ws && d <= we;
  const days = Object.values(S.days).filter(d => inWeek(d.date));
  const logged = days.filter(d => d.meals?.length);
  const kcals = logged.map(d => dayTotals(d).kcal), prots = logged.map(d => dayTotals(d).p);
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const sess = Object.values(S.sessions).filter(s => inWeek(s.date) && s.source !== 'spreadsheet' && s.exercises?.length);
  const cardio = days.flatMap(d => d.cardio || []);
  const list = weightList();
  const wNow = avgBetween(list, ws, we), wPrev = avgBetween(list, addDays(ws, -7), addDays(ws, -1));
  const waists = list.filter(w => w.waist);
  const waistNow = [...waists].reverse().find(w => inWeek(w.date)); const waistPrev = [...waists].reverse().find(w => w.date < ws);
  const pbs = sess.flatMap(s => (s.pbs || []).map(n => ({ name: n, date: s.date })));
  const supps = S.config?.supps || [];
  const suppTaken = days.reduce((n, d) => n + (d.supps || []).filter(id => supps.some(s => s.id === id)).length, 0);
  let gpts = 0; if (gardenOn()) { for (const s of sess) gpts += GARDEN.WORKOUT; for (const d of logged) { gpts += GARDEN.FOOD_DAY; if (dayTotals(d).p >= T.p - 10) gpts += GARDEN.PROTEIN_DAY; } for (const d of days) if (d.cardio?.length) gpts += GARDEN.CARDIO * Math.min(d.cardio.length, 2); gpts += list.filter(w => inWeek(w.date)).length * GARDEN.WEIGH_IN; }
  return { ws, we, loggedDays: logged.length, avgKcal: avg(kcals), avgP: avg(prots), proteinHit: prots.filter(p => p >= T.p - 10).length, workouts: sess.length, workoutDays: sess.map(s => s.day === 'Custom' ? (s.name || 'Custom') : s.day).filter(Boolean), cardioMin: cardio.reduce((n, c) => n + (c.minutes || 0), 0), cardioN: cardio.length, wNow, wPrev, waistNow, waistPrev, pbs, suppTaken, suppPossible: supps.length * 7, gpts };
}
function weeklyCard() {
  S.weekOff = S.weekOff || 0;
  const ws = addDays(weekStart(todayISO()), -7 * S.weekOff);
  const w = weekSummary(ws); const T = targets();
  const label = S.weekOff === 0 ? 'This week' : S.weekOff === 1 ? 'Last week' : `${fmtDay(w.ws, { day: 'numeric', month: 'short' })} – ${fmtDay(w.we, { day: 'numeric', month: 'short' })}`;
  const wDiff = w.wNow != null && w.wPrev != null ? w.wNow - w.wPrev : null;
  const waistDiff = w.waistNow && w.waistPrev ? w.waistNow.waist - w.waistPrev.waist : null;
  const tile = (k, v, sub, cls = '') => `<div class="wk-tile"><span class="wk-k">${k}</span><b class="${cls}">${v}</b>${sub ? `<span class="wk-sub">${sub}</span>` : ''}</div>`;
  return `<section class="sec"><h2>Weekly summary <span class="aside wk-nav"><button class="iconbtn sm" data-act="weekNav" data-d="1" aria-label="Previous week"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><span>${label}</span><button class="iconbtn sm" data-act="weekNav" data-d="-1" aria-label="Next week" ${S.weekOff === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></span></h2>
    <div class="card wk">
      <div class="wk-grid">
        ${tile('Workouts', w.workouts, w.workoutDays.length ? w.workoutDays.join(', ') : 'none yet')}
        ${tile('Avg calories', w.avgKcal != null ? r0(w.avgKcal).toLocaleString() : '–', `${w.loggedDays}/7 days logged · target ${T.kcal.toLocaleString()}`)}
        ${tile('Protein hit', `${w.proteinHit}/7`, w.avgP != null ? `avg ${r0(w.avgP)} g of ${T.p} g` : 'days on target')}
        ${tile('Cardio', w.cardioMin ? `${w.cardioMin} min` : w.cardioN ? `${w.cardioN}×` : '–', w.cardioN ? `${w.cardioN} session${w.cardioN > 1 ? 's' : ''}` : '')}
        ${tile('Weight', w.wNow != null ? `${r1(w.wNow)} kg` : '–', wDiff != null ? `${wDiff > 0 ? '+' : ''}${r1(wDiff)} kg vs week before` : 'weekly average')}
        ${tile('Waist', w.waistNow ? `${w.waistNow.waist} cm` : '–', waistDiff != null ? `${waistDiff > 0 ? '+' : ''}${r1(waistDiff)} cm` : '', waistDiff != null ? (waistDiff <= 0 ? 'up-txt' : 'down-txt') : '')}
      </div>
      ${w.pbs.length ? `<div class="wk-pbs"><span class="wk-k">Personal bests</span>${w.pbs.map(p => `<span class="chip pb">${esc(p.name)}</span>`).join('')}</div>` : ''}
      ${w.suppPossible ? `<div class="small muted">Supplements taken: ${w.suppTaken} of ${w.suppPossible}</div>` : ''}
      ${gardenOn() && w.gpts ? `<div class="small muted">${gm().grew} +${w.gpts} this week.</div>` : ''}
    </div></section>`;
}

/* ---------- body measurements ---------- */
const MEASURES = [['waist', 'Waist'], ['arms', 'Arms'], ['chest', 'Chest'], ['hips', 'Hips'], ['thighs', 'Thighs']];

/* ---------- supplements ---------- */
const SUPP_SUGGEST = ['Creatine 5 g', 'Protein powder', 'Fish oil', 'Vitamin D', 'Magnesium', 'Multivitamin', 'Iron', 'Electrolytes'];
function suppCard() {
  const list = S.config?.supps || []; if (!list.length) return '';
  if (S.config?.suppHidden) return `<section class="sec"><h2>Supplements <button class="linkbtn h2btn push" data-act="suppHide" data-v="0" aria-expanded="false">Show</button></h2></section>`;
  const taken = new Set(S.days[S.date]?.supps || []);
  return `<section class="sec"><h2>Supplements <span class="aside">${list.filter(s => taken.has(s.id)).length}/${list.length} today</span><button class="linkbtn h2btn" data-act="suppHide" data-v="1" aria-expanded="true">Hide</button></h2>
    <div class="card supp-row">${list.map(s => `<button class="supp${taken.has(s.id) ? ' on' : ''}" data-act="suppTick" data-v="${s.id}" aria-pressed="${taken.has(s.id)}"><span class="tick" aria-hidden="true"></span>${esc(s.name)}</button>`).join('')}</div></section>`;
}

/* ---------- nutrients (micros) ---------- */
// Per 100 g (or ml): fibre g, sugars g, sat fat g, sodium mg, potassium mg, calcium mg, iron mg, magnesium mg, zinc mg,
// vit C mg, vit A µg RAE, folate µg DFE, B12 µg, vit D µg. Approximate values from USDA FoodData Central / AUSNUT;
// bread folate reflects Australia's mandatory folic acid fortification.
const NK = ['fib', 'sug', 'sat', 'na', 'k', 'ca', 'fe', 'mg', 'zn', 'vc', 'va', 'fol', 'b12', 'vd'];
const NUTR_DB = { ham: [0, 1, 1, 1100, 300, 10, 0.8, 20, 1.5, 0, 0, 3, 0.5, 0.5], bacon: [0, 0.5, 1.8, 1300, 300, 8, 0.7, 18, 1.8, 0, 0, 2, 0.6, 0.5], potato: [2.2, 0.8, 0, 6, 420, 12, 0.8, 23, 0.3, 20, 0, 15, 0, 0], firm_tofu: [2.3, 0.6, 1.3, 14, 237, 350, 2.7, 58, 1.6, 0, 0, 29, 0, 0], tempeh: [4, 0, 2.2, 9, 412, 111, 2.7, 81, 1.1, 0, 0, 24, 0.1, 0], chickpeas: [7, 0.3, 0.3, 240, 110, 40, 1.3, 25, 0.7, 0.1, 1, 60, 0, 0], lentils: [3.7, 0.8, 0.1, 250, 220, 20, 2, 25, 1, 1, 0, 90, 0, 0], tuna: [0, 0, 0.3, 300, 230, 10, 1, 30, 0.7, 0, 10, 4, 2.5, 2], prawns: [0, 0, 0.1, 500, 170, 60, 0.3, 35, 1.3, 0, 0, 19, 1.1, 0], white_fish: [0, 0, 0.5, 70, 300, 10, 0.3, 25, 0.4, 0, 10, 10, 1, 1], smoked_salmon: [0, 0, 1.2, 1300, 180, 10, 0.8, 18, 0.3, 0, 25, 2, 3, 10], pea_protein: [1, 0.5, 1, 1000, 100, 100, 20, 50, 6, 0, 0, 0, 0, 0], soy_milk: [0.5, 0.4, 0.3, 45, 150, 120, 0.5, 15, 0.3, 0, 60, 10, 0.4, 1], soy_yoghurt: [1, 2, 0.4, 30, 130, 120, 0.6, 15, 0.3, 0, 0, 10, 0.4, 0.8], hummus: [6, 0.5, 2.4, 400, 230, 40, 2.4, 70, 1.5, 0, 1, 60, 0, 0], quinoa_cooked: [2.8, 0.9, 0.2, 7, 170, 17, 1.5, 64, 1.1, 0, 1, 42, 0, 0], rice_noodles: [1, 0, 0, 20, 30, 4, 0.2, 3, 0.3, 0, 0, 3, 0, 0], wholegrain_bread: [6.5, 3, 0.6, 420, 230, 90, 2.2, 60, 1.3, 0, 0, 40, 0, 0], feta: [0, 1, 9, 1100, 62, 490, 0.6, 19, 2.9, 0, 125, 32, 1.7, 0.4], halloumi: [0, 2, 10, 1800, 80, 700, 0.2, 25, 2.5, 0, 150, 10, 1.2, 0.3], nutritional_yeast: [20, 0, 0.6, 50, 1800, 30, 4, 180, 8, 0, 0, 2300, 7.8, 0], tahini: [9, 0.5, 7.5, 115, 415, 420, 8.9, 95, 4.6, 0, 3, 98, 0, 0], tamari: [0.8, 1.7, 0, 5600, 212, 20, 2.4, 40, 0.4, 0, 0, 18, 0, 0], sesame_oil: [0, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], coconut_milk: [0, 1.5, 6.5, 15, 100, 5, 0.6, 15, 0.3, 0, 0, 5, 0, 0], pumpkin_seeds: [6, 1.4, 8.7, 7, 800, 46, 8.8, 590, 7.8, 2, 1, 58, 0, 0], rice_crackers: [1.5, 1, 1, 700, 120, 10, 1, 30, 1, 0, 0, 5, 0, 0], mushrooms: [1, 2, 0, 5, 320, 3, 0.5, 9, 0.5, 2, 0, 17, 0, 0.2], zucchini: [1, 2.5, 0.1, 8, 260, 16, 0.4, 18, 0.3, 18, 10, 24, 0, 0], peas: [5, 4.5, 0.1, 100, 150, 22, 1.5, 22, 0.7, 18, 40, 59, 0, 0], gf_wrap: [4, 2, 1, 500, 100, 40, 1, 20, 0.5, 0, 0, 10, 0, 0], corn_tortilla: [6, 1, 0.4, 45, 186, 81, 1.2, 72, 1, 0, 0, 5, 0, 0],
  egg_white: [0, 0.7, 0, 166, 163, 7, 0.1, 11, 0, 0, 0, 4, 0.1, 0], egg: [0, 0.4, 3.1, 142, 138, 56, 1.75, 12, 1.3, 0, 160, 47, 0.9, 2],
  greek_yog_0: [0, 3.2, 0.1, 36, 141, 110, 0.1, 11, 0.5, 0, 1, 7, 0.75, 0], skim_milk: [0, 5, 0.1, 42, 156, 122, 0, 11, 0.4, 0, 10, 5, 0.5, 0],
  cottage_cheese: [0, 2.7, 1.2, 330, 86, 61, 0.15, 7, 0.4, 0, 12, 13, 0.6, 0], parmesan: [0, 0.9, 19, 1600, 92, 1180, 0.8, 44, 2.75, 0, 207, 7, 1.2, 0.5],
  light_mozz: [0, 1, 10, 620, 85, 780, 0.2, 23, 2.9, 0, 120, 9, 0.8, 0.3], light_cheese: [0, 0.5, 15, 650, 80, 800, 0.2, 28, 3.5, 0, 200, 15, 0.9, 0.3],
  almond_milk: [0.2, 0, 0, 60, 70, 120, 0.3, 7, 0.1, 0, 0, 0, 0.2, 0],
  chicken_breast: [0, 0, 0.6, 45, 370, 5, 0.4, 28, 0.7, 0, 9, 4, 0.2, 0.1], chicken_thigh: [0, 0, 1.1, 95, 240, 9, 0.8, 23, 1.6, 0, 8, 6, 0.6, 0.1],
  lean_beef: [0, 0, 2, 55, 340, 6, 2, 22, 4, 0, 0, 7, 1.6, 0.1], turkey_mince: [0, 0, 2, 70, 290, 15, 1, 25, 2.4, 0, 0, 8, 1.1, 0.2],
  salmon: [0, 0, 3.1, 59, 363, 9, 0.3, 27, 0.4, 0, 58, 26, 3.2, 11],
  banana: [2.6, 12.2, 0.1, 1, 358, 5, 0.3, 27, 0.15, 8.7, 3, 20, 0, 0], berries: [4, 6, 0, 1, 120, 20, 0.6, 15, 0.3, 15, 2, 15, 0, 0],
  strawberries: [2, 4.9, 0, 1, 153, 16, 0.4, 13, 0.1, 59, 1, 24, 0, 0], avocado: [6.7, 0.7, 2.1, 7, 485, 12, 0.55, 29, 0.6, 10, 7, 81, 0, 0],
  spinach: [2.2, 0.4, 0.1, 79, 558, 99, 2.7, 79, 0.5, 28, 469, 194, 0, 0], tomato: [1.2, 2.6, 0, 5, 237, 10, 0.3, 11, 0.2, 14, 42, 15, 0, 0],
  capsicum: [2.1, 4.2, 0, 4, 211, 7, 0.4, 12, 0.25, 128, 157, 46, 0, 0], cucumber: [0.5, 1.7, 0, 2, 147, 16, 0.3, 13, 0.2, 2.8, 5, 7, 0, 0],
  carrot: [2.8, 4.7, 0, 69, 320, 33, 0.3, 12, 0.24, 5.9, 835, 19, 0, 0], cabbage: [2.1, 3.8, 0, 27, 243, 45, 0.8, 16, 0.2, 57, 56, 18, 0, 0],
  broccoli: [2.6, 1.7, 0, 33, 316, 47, 0.7, 21, 0.4, 89, 31, 63, 0, 0], broccolini: [2.5, 1.5, 0, 30, 300, 50, 0.8, 20, 0.4, 80, 60, 60, 0, 0],
  sweet_potato: [3, 4.2, 0, 55, 337, 30, 0.6, 25, 0.3, 2.4, 709, 11, 0, 0], onion: [1.7, 4.2, 0, 4, 146, 23, 0.2, 10, 0.2, 7.4, 0, 19, 0, 0],
  lettuce: [2.1, 1.2, 0, 8, 247, 33, 1, 14, 0.2, 4, 436, 136, 0, 0], lime: [0.4, 1.7, 0, 2, 117, 14, 0.1, 8, 0.1, 30, 2, 10, 0, 0],
  corn: [2, 3.2, 0.2, 15, 270, 2, 0.5, 37, 0.5, 6.8, 9, 46, 0, 0], edamame: [5.2, 2.2, 0.7, 6, 436, 63, 2.3, 64, 1.4, 6.1, 9, 311, 0, 0],
  sourdough: [2.4, 2.5, 0.3, 510, 120, 20, 2.5, 25, 0.8, 0, 0, 120, 0, 0], tortilla: [3, 2.5, 2, 600, 160, 100, 3, 25, 0.6, 0, 0, 100, 0, 0],
  oats: [10.1, 1, 1.2, 2, 362, 54, 4.7, 177, 4, 0, 0, 32, 0, 0], whey: [0, 5, 1.5, 200, 500, 450, 1, 80, 2, 0, 0, 10, 1, 0],
  white_rice_cooked: [0.4, 0.1, 0.1, 1, 35, 10, 0.2, 12, 0.5, 0, 0, 3, 0, 0], brown_rice_cooked: [1.6, 0.4, 0.2, 4, 86, 10, 0.6, 39, 0.7, 0, 0, 4, 0, 0],
  orzo_dry: [3, 2.7, 0.3, 6, 220, 21, 1.3, 53, 1.4, 0, 0, 18, 0, 0], penne_dry: [9, 3, 0.3, 8, 330, 40, 3.6, 140, 3, 0, 0, 40, 0, 0],
  flour: [2.7, 0.3, 0.2, 2, 107, 15, 1.2, 22, 0.7, 0, 0, 26, 0, 0], cornflour: [0.9, 0, 0, 9, 3, 2, 0.5, 3, 0.1, 0, 0, 0, 0, 0],
  black_beans: [6.9, 0.3, 0.1, 240, 370, 35, 1.9, 42, 0.7, 0, 0, 90, 0, 0], passata: [1.5, 4, 0, 30, 400, 15, 1, 18, 0.3, 10, 30, 10, 0, 0],
  broth: [0, 0.4, 0.1, 380, 40, 2, 0.1, 1, 0, 0, 0, 0, 0, 0], chia: [34.4, 0, 3.3, 16, 407, 631, 7.7, 335, 4.6, 1.6, 0, 49, 0, 0],
  granola: [6, 20, 1.5, 30, 400, 50, 3, 110, 2.5, 0, 0, 20, 0, 0], almonds: [12.5, 4.4, 3.8, 1, 733, 269, 3.7, 270, 3.1, 0, 0, 44, 0, 0],
  choc_chips: [7, 48, 18, 10, 560, 60, 8, 170, 2.5, 0, 2, 0, 0, 0], rice_cake: [4.2, 0.9, 0.6, 30, 290, 11, 1.5, 131, 2.9, 0, 0, 21, 0, 0],
  nori: [36, 0.5, 0.3, 300, 2000, 250, 11, 300, 3, 40, 500, 500, 0, 0], taco_season: [13, 10, 0.5, 6500, 1000, 150, 10, 100, 1, 2, 300, 20, 0, 0],
  olive_oil: [0, 0, 14, 2, 1, 1, 0.6, 0, 0, 0, 0, 0, 0, 0], peanut_butter: [6, 9, 10, 400, 650, 45, 1.9, 170, 2.9, 0, 0, 87, 0, 0],
  maple: [0, 60, 0, 12, 212, 102, 0.1, 21, 1.5, 0, 0, 0, 0, 0], honey: [0.2, 82, 0, 4, 52, 6, 0.4, 2, 0.2, 0.5, 0, 2, 0, 0],
  mayo: [0, 1, 11, 600, 20, 8, 0.2, 1, 0.1, 0, 20, 5, 0.1, 0.2], kewpie: [0, 1.5, 10, 700, 20, 10, 0.5, 1, 0.2, 0, 50, 5, 0.2, 0.5],
  sweet_chilli: [1, 50, 0, 1400, 70, 10, 0.5, 5, 0.1, 5, 30, 2, 0, 0], sriracha: [2, 22, 0, 2100, 320, 18, 1.6, 15, 0.2, 27, 120, 10, 0, 0],
  soy: [0.8, 0.4, 0, 5500, 435, 33, 1.5, 43, 0.4, 0, 0, 14, 0, 0], salsa: [1.8, 4, 0, 700, 280, 30, 0.4, 15, 0.3, 4, 25, 15, 0, 0],
  rice_vinegar: [0, 10, 0, 1000, 10, 5, 0.1, 1, 0, 0, 0, 0, 0, 0], kimchi: [1.6, 1.1, 0, 500, 150, 33, 2.5, 14, 0.2, 18, 50, 50, 0, 0],
};
const EACH_G = { egg: 55, banana: 110, avocado: 150, lime: 30, tortilla: 30, rice_cake: 7.5, nori: 2.6, egg_white: 33, carrot: 70, onion: 110, sweet_potato: 200, tomato: 15, chicken_breast: 200, salmon: 140, capsicum: 150, cucumber: 200 };
const ING_WORDS = [["smoked salmon", "smoked_salmon"], ["soy milk", "soy_milk"], ["soy yoghurt", "soy_yoghurt"], ["sesame oil", "sesame_oil"], ["coconut milk", "coconut_milk"], ["rice noodle", "rice_noodles"], ["rice cracker", "rice_crackers"], ["wholegrain bread", "wholegrain_bread"], ["pea protein", "pea_protein"], ["corn tortilla", "corn_tortilla"], ["gluten-free wrap", "gf_wrap"], ["white fish", "white_fish"], ["fish fillet", "white_fish"], ["nutritional yeast", "nutritional_yeast"], ["pumpkin seed", "pumpkin_seeds"], ["leg ham", "ham"], ['egg white', 'egg_white'], ['chicken thigh', 'chicken_thigh'], ['chicken', 'chicken_breast'], ['eggs', 'egg'], ['egg', 'egg'],
  ['almond milk', 'almond_milk'], ['milk', 'skim_milk'], ['yoghurt', 'greek_yog_0'], ['yogurt', 'greek_yog_0'], ['cottage', 'cottage_cheese'], ['parmesan', 'parmesan'],
  ['mozzarella', 'light_mozz'], ['cheese', 'light_cheese'], ['turkey', 'turkey_mince'], ['beef', 'lean_beef'], ['steak', 'lean_beef'], ['mince', 'lean_beef'], ['salmon', 'salmon'],
  ['banana', 'banana'], ['strawberr', 'strawberries'], ['berr', 'berries'], ['avocado', 'avocado'], ['spinach', 'spinach'], ['tomato', 'tomato'], ['capsicum', 'capsicum'],
  ['cucumber', 'cucumber'], ['carrot', 'carrot'], ['cabbage', 'cabbage'], ['broccolini', 'broccolini'], ['broccoli', 'broccoli'], ['sweet potato', 'sweet_potato'],
  ['onion', 'onion'], ['lettuce', 'lettuce'], ['lime', 'lime'], ['lemon', 'lime'], ['corn', 'corn'], ['edamame', 'edamame'], ['sourdough', 'sourdough'], ['bread', 'sourdough'],
  ['toast', 'sourdough'], ['tortilla', 'tortilla'], ['wrap', 'tortilla'], ['oat', 'oats'], ['whey', 'whey'], ['protein powder', 'whey'], ['brown rice', 'brown_rice_cooked'],
  ['rice cake', 'rice_cake'], ['rice', 'white_rice_cooked'], ['orzo', 'orzo_dry'], ['pasta', 'penne_dry'], ['penne', 'penne_dry'], ['flour', 'flour'], ['bean', 'black_beans'],
  ['passata', 'passata'], ['stock', 'broth'], ['broth', 'broth'], ['chia', 'chia'], ['granola', 'granola'], ['almond', 'almonds'], ['choc', 'choc_chips'], ['nori', 'nori'],
  ['olive oil', 'olive_oil'], ['oil', 'olive_oil'], ['peanut butter', 'peanut_butter'], ['maple', 'maple'], ['honey', 'honey'], ['kewpie', 'kewpie'], ['mayo', 'mayo'],
  ['sweet chilli', 'sweet_chilli'], ['sriracha', 'sriracha'], ['soy', 'soy'], ['salsa', 'salsa'], ['kimchi', 'kimchi'], ["tofu", "firm_tofu"], ["tempeh", "tempeh"], ["chickpea", "chickpeas"], ["lentil", "lentils"], ["tuna", "tuna"], ["prawn", "prawns"], ["hummus", "hummus"], ["quinoa", "quinoa_cooked"], ["feta", "feta"], ["halloumi", "halloumi"], ["tahini", "tahini"], ["tamari", "tamari"], ["mushroom", "mushrooms"], ["zucchini", "zucchini"], ["bacon", "bacon"], ["potato", "potato"], ["peas", "peas"]];
function parseIng(line) { // -> [key, grams] or null
  const t = line.trim().toLowerCase(); if (!t) return null;
  const hit = ING_WORDS.find(([w]) => t.includes(w)); if (!hit) return null; const key = hit[1];
  let m = t.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|tbsp|tsp)\b/);
  if (m) { const q = parseFloat(m[1].replace(',', '.')); return [key, q * ({ kg: 1000, l: 1000, tbsp: 15, tsp: 5 }[m[2]] || 1)]; }
  m = t.match(/^(\d+(?:[.,]\d+)?|half|½)\s/); const n = m ? (/half|½/.test(m[1]) ? 0.5 : parseFloat(m[1].replace(',', '.'))) : 1;
  return EACH_G[key] ? [key, n * EACH_G[key]] : null;
}
function addNut(acc, key, grams) { const v = NUTR_DB[key]; if (!v) return; NK.forEach((k, i) => { acc[k] = (acc[k] || 0) + v[i] * grams / 100; }); }
function mealNutrients(m) { // -> {nut, partial} or null when no data
  const s = m.servings ?? 1; const acc = {};
  if (m.nut) { for (const k of NK) if (m.nut[k] != null) acc[k] = m.nut[k] * s; return { nut: acc, partial: NK.some(k => m.nut[k] == null) }; }
  if (m.recipe && RECIPE_GROCERY[m.recipe]) { for (const [ing, g] of RECIPE_GROCERY[m.recipe]) addNut(acc, ing, (ing === 'nori' ? g * EACH_G.nori : g) * s); return { nut: acc, partial: false }; }
  const ing = m.ing || (m.food && (S.config?.foods || []).find(f => f.id === m.food)?.ing);
  if (ing?.length) { let miss = 0; for (const l of ing) { const p = parseIng(l); if (p) addNut(acc, p[0], p[1] * s); else miss++; } if (miss === ing.length) return null; return { nut: acc, partial: miss > 0 }; }
  return null;
}
function offNut(n) { // Open Food Facts nutriments (grams per 100 g) -> our units per 100 g
  const f = (k, mul) => (n[k + '_100g'] != null && n[k + '_100g'] !== '' ? +n[k + '_100g'] * mul : undefined);
  const o = { fib: f('fiber', 1), sug: f('sugars', 1), sat: f('saturated-fat', 1), na: f('sodium', 1000), k: f('potassium', 1000), ca: f('calcium', 1000), fe: f('iron', 1000),
    mg: f('magnesium', 1000), zn: f('zinc', 1000), vc: f('vitamin-c', 1000), va: f('vitamin-a', 1e6), fol: f('folates', 1e6) ?? f('vitamin-b9', 1e6), b12: f('vitamin-b12', 1e6), vd: f('vitamin-d', 1e6) };
  for (const k of NK) if (o[k] == null || isNaN(o[k])) delete o[k];
  return Object.keys(o).length ? o : null;
}
// Australian NRVs (NHMRC). Sodium is the suggested dietary target; sat fat is <10% of energy.
function nutrientTargets() {
  const pr = S.config?.profile || {}; const fem = pr.sex === 'female'; const age = +pr.age || 25; const T = targets();
  return [
    { k: 'fib', name: 'Fibre', u: 'g', min: fem ? 25 : 30, grp: 'Everyday' },
    { k: 'sat', name: 'Saturated fat', u: 'g', max: Math.round(T.kcal * 0.1 / 9), grp: 'Everyday' },
    { k: 'sug', name: 'Sugars', u: 'g', info: 'Total sugars, including fruit and dairy', grp: 'Everyday' },
    { k: 'na', name: 'Sodium', u: 'mg', max: 2000, grp: 'Everyday' },
    { k: 'ca', name: 'Calcium', u: 'mg', min: (fem && age > 50) || age > 70 ? 1300 : 1000, grp: 'Minerals' },
    { k: 'fe', name: 'Iron', u: 'mg', min: fem && age <= 50 ? 18 : 8, grp: 'Minerals' },
    { k: 'mg', name: 'Magnesium', u: 'mg', min: fem ? (age > 30 ? 320 : 310) : (age > 30 ? 420 : 400), grp: 'Minerals' },
    { k: 'k', name: 'Potassium', u: 'mg', min: fem ? 2800 : 3800, grp: 'Minerals' },
    { k: 'zn', name: 'Zinc', u: 'mg', min: fem ? 8 : 14, grp: 'Minerals' },
    { k: 'va', name: 'Vitamin A', u: 'µg', min: fem ? 700 : 900, grp: 'Vitamins' },
    { k: 'vc', name: 'Vitamin C', u: 'mg', min: 45, grp: 'Vitamins' },
    { k: 'fol', name: 'Folate', u: 'µg', min: 400, grp: 'Vitamins' },
    { k: 'b12', name: 'Vitamin B12', u: 'µg', min: 2.4, grp: 'Vitamins' },
    { k: 'vd', name: 'Vitamin D', u: 'µg', min: age > 70 ? 15 : age > 50 ? 10 : 5, grp: 'Vitamins', note: 'Mostly made from sunlight, so food alone rarely gets there' },
  ];
}
function dayNutrients(day) {
  const tot = {}; let counted = 0, partial = 0; const meals = day?.meals || [];
  for (const m of meals) { const r = mealNutrients(m); if (!r) continue; counted++; if (r.partial) partial++; for (const k of NK) if (r.nut[k] != null) tot[k] = (tot[k] || 0) + r.nut[k]; }
  return { tot, counted, partial, total: meals.length };
}
const fmtN = (v, u) => u === 'µg' && v < 10 ? r1(v) : u === 'g' && v < 10 ? r1(v) : r0(v).toLocaleString();
function openNutrients() {
  const day = S.days[S.date]; const { tot, counted, partial, total } = dayNutrients(day); const t = dayTotals(day);
  const list = nutrientTargets(); const pr = S.config?.profile || {};
  const row = n => {
    const v = tot[n.k] || 0; const tgt = n.min || n.max;
    if (n.info) return `<div class="nrow"><span class="k">${n.name}</span><span class="nnote">${n.info}</span><span class="v"><b>${fmtN(v, n.u)}</b> ${n.u}</span></div>`;
    const pct = Math.min(100, v / tgt * 100); const over = n.max && v > n.max; const hit = n.min && v >= n.min;
    return `<div class="nrow${over ? ' over' : ''}${hit ? ' hit' : ''}"><span class="k">${n.name}</span>
      <div class="bar${over ? ' over' : ''}" role="img" aria-label="${n.name} ${fmtN(v, n.u)} ${n.u} of ${n.max ? 'limit ' : ''}${tgt} ${n.u}"><i style="width:${pct}%"></i></div>
      <span class="v"><b>${fmtN(v, n.u)}</b> / ${n.max ? '≤' : ''}${fmtN(tgt, n.u)} ${n.u}</span>${n.note && !hit ? `<span class="nnote">${n.note}</span>` : ''}</div>`;
  };
  const grp = g => `<div class="ngrp">${list.filter(n => n.grp === g).map(row).join('')}</div>`;
  const low = list.filter(n => n.min && n.k !== 'vd' && (tot[n.k] || 0) < n.min * 0.5).map(n => n.name);
  const body = !total ? `<div class="empty"><b>Nothing logged yet.</b>Log a meal and its nutrients show up here.</div>`
    : !counted ? `<div class="empty"><b>No nutrient data for these meals yet.</b>Meals from your plan, scanned foods and your own meals with ingredients are counted.</div>`
    : `<div class="card nutr">${grp('Everyday')}</div>
      <div class="slotlabel">Vitamins</div><div class="card nutr">${grp('Vitamins')}</div>
      <div class="slotlabel">Minerals</div><div class="card nutr">${grp('Minerals')}</div>
      ${low.length && S.date === todayISO() && new Date().getHours() >= 18 ? `<div class="small nlow">Still low today: ${low.slice(0, 4).join(', ')}.</div>` : ''}`;
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet" id="sheet"><div class="panel"><div class="wrap nsheet">
    <div style="display:flex;align-items:center;gap:10px"><h3>Nutrients</h3><button type="button" class="btn ghost sm" style="margin-left:auto" data-act="closeSheet">Close</button></div>
    <div class="small muted">${S.date === todayISO() ? 'Today' : fmtDay(S.date)}${total ? ` · from ${counted} of ${total} meal${total > 1 ? 's' : ''}` : ''}</div>
    <div class="chips"><span class="chip k">${r0(t.kcal).toLocaleString()} kcal</span><span class="chip p">P ${r0(t.p)} g</span><span class="chip c">C ${r0(t.c)} g</span><span class="chip f">F ${r0(t.f)} g</span></div>
    ${body}
    <div class="small muted">${total && counted < total ? `${total - counted} meal${total - counted > 1 ? 's' : ''} logged with only calories and macros ${total - counted > 1 ? "aren't" : "isn't"} counted. Add ingredients to your own meals to include them. ` : ''}${partial ? 'Some scanned foods only list a few nutrients. ' : ''}Estimates from standard food data. Targets are Australian daily recommendations for ${pr.sex === 'female' ? 'women' : 'men'}${pr.age ? ' aged ' + pr.age : ''}.</div>
  </div></div></div>`;
}
/* ---------- water ---------- */
const STANLEY_COLOURS = [
  ['rose', 'Rose Quartz', '#E7A1B4'], ['fuchsia', 'Fuchsia', '#D8457F'], ['blush', 'Blush', '#F1C3C0'], ['lilac', 'Lilac', '#B89BE2'],
  ['peach', 'Peach', '#F3AE85'], ['butter', 'Butter', '#F1D98A'], ['sage', 'Sage', '#9CB89A'], ['sky', 'Sky', '#8DC2E6'],
  ['cream', 'Cream', '#EFE4D2'], ['black', 'Black', '#2C2B30'],
];
function softTheme() { const t = findTheme(S.config?.theme || lsGet('rl:theme')); return !!(t && t.style === 'soft'); }
function hexMix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function waterGoal() {
  if (S.config?.water?.goal) return S.config.water.goal;
  const w = weightList().slice(-1)[0]?.kg;
  return w ? Math.min(4000, Math.max(2000, Math.round(w * 35 / 250) * 250)) : 2500;
}
function bottleSize() { return S.config?.water?.bottle || (softTheme() ? 1180 : 750); }
function stanleyColour() { const id = S.config?.water?.colour || 'rose'; return (STANLEY_COLOURS.find(c => c[0] === id) || STANLEY_COLOURS[0])[2]; }
const fmtL = ml => (ml / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 });

function waveD(y, x0, x1) { // gentle wave across, closed down to the bottom
  let d = `M${x0} ${y}`; for (let x = x0; x < x1; x += 40) d += ` q10 -4 20 0 t20 0`;
  return d + ` V210 H${x0} Z`;
}
function stanleySVG(f, col) {
  const dark = hexMix(col, '#000000', 0.22), pale = hexMix(col, '#FFFFFF', 0.62), shine = hexMix(col, '#FFFFFF', 0.85);
  const top = 46, bot = 192, y = bot - f * (bot - top);
  const body = 'M22 46 H98 L90 148 H30 Z M33 148 H87 L85 187 Q84.6 192 80 192 H40 Q35.4 192 35 187 Z';
  return `<svg viewBox="0 0 124 200" class="bottle-svg" role="img" aria-label="Tumbler ${Math.round(f * 100)}% full">
    <defs><clipPath id="stClip"><path d="${body}"/></clipPath></defs>
    <path d="M94 60 C116 60 116 62 115 92 L113 124 C112 132 106 134 89 134" fill="none" stroke="${dark}" stroke-width="9" stroke-linecap="round"/>
    <path d="M94 60 C116 60 116 62 115 92 L113 124 C112 132 106 134 89 134" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"/>
    <rect x="66" y="2" width="7" height="34" rx="3.5" transform="rotate(14 69 36)" fill="${dark}"/>
    <path d="${body}" fill="${pale}"/>
    <g clip-path="url(#stClip)">
      <g class="wave"><path d="${waveD(y, -40, 180)}" fill="${col}"/></g>
      ${f > 0.08 ? `<circle class="bub" cx="48" cy="${Math.min(184, y + 22)}" r="2.2" fill="${shine}"/><circle class="bub b2" cx="70" cy="${Math.min(186, y + 40)}" r="1.6" fill="${shine}"/>` : ''}
      <rect x="29" y="52" width="7" height="88" rx="3.5" fill="#FFFFFF" opacity=".35"/>
      <rect x="31" y="150" width="58" height="3" fill="${dark}" opacity=".25"/>
    </g>
    <rect x="18" y="32" width="84" height="16" rx="7" fill="${dark}"/>
    <rect x="25" y="26" width="70" height="9" rx="4.5" fill="${col}"/>
    <rect x="25" y="26" width="70" height="3" rx="1.5" fill="#FFFFFF" opacity=".3"/>
  </svg>`;
}
function plainBottleSVG(f) {
  const top = 54, bot = 190, y = bot - f * (bot - top);
  const body = 'M42 36 H78 Q78 46 92 56 V178 Q92 190 80 190 H40 Q28 190 28 178 V56 Q42 46 42 36 Z';
  return `<svg viewBox="0 0 124 200" class="bottle-svg" role="img" aria-label="Water bottle ${Math.round(f * 100)}% full">
    <defs><clipPath id="pbClip"><path d="${body}"/></clipPath></defs>
    <path d="${body}" fill="var(--sunk)" opacity=".55"/>
    <g clip-path="url(#pbClip)">
      <g class="wave"><path d="${waveD(y, -40, 180)}" fill="#4BA3E3" opacity=".85"/></g>
      ${f > 0.08 ? `<circle class="bub" cx="50" cy="${Math.min(182, y + 22)}" r="2.2" fill="#FFFFFF" opacity=".7"/><circle class="bub b2" cx="72" cy="${Math.min(184, y + 40)}" r="1.6" fill="#FFFFFF" opacity=".7"/>` : ''}
      <rect x="34" y="62" width="6" height="110" rx="3" fill="#FFFFFF" opacity=".35"/>
    </g>
    <path d="${body}" fill="none" stroke="var(--line)" stroke-width="2"/>
    ${[0.25, 0.5, 0.75].map(t => `<line x1="84" x2="92" y1="${bot - t * (bot - top)}" y2="${bot - t * (bot - top)}" stroke="var(--muted)" stroke-width="1.5" opacity=".6"/>`).join('')}
    <path d="M30 112 H90 M30 120 H90" stroke="var(--line)" stroke-width="1.5" opacity=".8"/>
    <rect x="38" y="20" width="44" height="18" rx="5" fill="var(--btn)"/>
    <rect x="50" y="8" width="20" height="14" rx="4" fill="var(--btn)" opacity=".85"/>
  </svg>`;
}
function waterCard(inPanel) {
  if (!inPanel && S.config?.water?.hidden) return `<section class="sec"><h2>Water <button class="linkbtn h2btn push" data-act="waterHide" data-v="0" aria-expanded="false">Show</button></h2></section>`;
  const ml = S.days[S.date]?.water || 0; const goal = waterGoal(); const f = Math.min(1, ml / goal);
  const soft = softTheme(); const bs = bottleSize(); const left = Math.max(0, goal - ml);
  const msg = ml >= goal ? 'Goal hit. Nicely done.'
    : ml === 0 ? `Start with a glass. Your goal is ${fmtL(goal)} L.`
    : `${fmtL(left)} L to go, about ${Math.max(1, Math.round(left / bs * 2) / 2)} ${soft ? 'tumbler' : 'bottle'}${left / bs > 1 ? 's' : ''}.`;
  return `<section class="sec">${inPanel ? '' : `<h2>Water <span class="aside">${fmtL(ml)} / ${fmtL(goal)} L</span><button class="linkbtn h2btn" data-act="waterHide" data-v="1" aria-expanded="true">Hide</button></h2>`}
    <div class="card water${ml >= goal ? ' done' : ''}">
      <div class="water-art">${soft ? stanleySVG(f, stanleyColour()) : plainBottleSVG(f)}</div>
      <div class="water-side">
        <div class="water-n"><b>${fmtL(ml)}</b> L <span>of ${fmtL(goal)} L</span></div>
        <div class="small muted">${msg}</div>
        <div class="water-btns">
          <button class="btn ghost sm" data-act="water" data-d="250">+ 250 ml</button>
          <button class="btn ghost sm" data-act="water" data-d="500">+ 500 ml</button>
          <button class="btn sm" data-act="water" data-d="${bs}">+ ${soft ? 'Full tumbler' : 'Full bottle'} <span class="wb-sz">${fmtL(bs)} L</span></button>
        </div>
        ${ml ? '<button class="linkbtn muted" data-act="water" data-d="-250">Take off 250 ml</button>' : ''}
      </div>
    </div></section>`;
}
function waterSettings() {
  const soft = softTheme(); const cur = S.config?.water?.colour || 'rose';
  return `<div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Water</div>
    <div class="grid2">
      <label class="f">Daily goal (ml)<input type="number" id="wt_goal" min="500" max="8000" step="250" value="${waterGoal()}"></label>
      <label class="f">${soft ? 'Tumbler' : 'Bottle'} size (ml)<input type="number" id="wt_bottle" min="100" max="3000" step="10" value="${bottleSize()}"></label>
    </div>
    <div class="small muted">${S.config?.water?.goal ? '' : 'Goal starts at about 35 ml per kg of body weight. '}Drink more on hot days and long sessions.${soft ? ' A 40 oz tumbler holds 1,180 ml.' : ''}</div>
    ${soft ? `<div class="small muted">Tumbler colour</div>
    <div class="stanley-pick" role="group" aria-label="Tumbler colour">${STANLEY_COLOURS.map(([id, name, hex]) => `<button type="button" class="sp" data-act="stanleyColour" data-v="${id}" aria-pressed="${cur === id}" title="${name}">
      <span class="sp-art">${stanleySVG(0.6, hex).replace(/stClip/g, 'stClip_' + id)}</span><span class="sp-name">${name}</span></button>`).join('')}</div>` : ''}
  </div>`;
}

/* ---------- streaks ---------- */
const WEEK_GOAL = 3;
function loggedDates() {
  const set = new Set();
  for (const d of Object.values(S.days)) if (d.meals?.length || d.cardio?.length || d.supps?.length || d.water) set.add(d.date);
  for (const s of Object.values(S.sessions)) if (s.source !== 'spreadsheet' && s.exercises?.length) set.add(s.date);
  for (const w of Object.values(S.weights)) if (w.kg) set.add(w.date);
  return set;
}
function streakStats() {
  const set = loggedDates(); const today = todayISO();
  let d = set.has(today) ? today : addDays(today, -1); let cur = 0;
  while (set.has(d)) { cur++; d = addDays(d, -1); }
  const sorted = [...set].sort(); let best = 0, run = 0, prev = null;
  for (const x of sorted) { run = prev && addDays(prev, 1) === x ? run + 1 : 1; best = Math.max(best, run); prev = x; }
  const wk = ws => Object.values(S.sessions).filter(s => s.source !== 'spreadsheet' && s.exercises?.length && s.date >= ws && s.date <= addDays(ws, 6)).length;
  const thisWs = weekStart(today); const thisWeek = wk(thisWs);
  let weeks = thisWeek >= WEEK_GOAL ? 1 : 0; let w = addDays(thisWs, -7);
  while (wk(w) >= WEEK_GOAL) { weeks++; w = addDays(w, -7); }
  return { cur, best, todayLogged: set.has(today), thisWeek, weeks };
}
function streakChips() {
  const s = streakStats();
  return `<div class="streaks"><span class="streak-chip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 3 4 4.5 4 8.5A4 4 0 0 1 8 11.5c0-1.6.8-2.6 1.6-3.3C9.8 10 11 10.5 11 10.5 10.4 7 12 5 12 3z"/><path d="M12 21a6 6 0 0 0 6-6c0-1.5-.4-2.7-1-3.7"/><path d="M6.9 11.6A6 6 0 0 0 12 21"/></svg>${s.cur}-day streak</span>
    <span class="streak-chip">${s.thisWeek}/${WEEK_GOAL} workouts this week</span></div>`;
}

/* ---------- garden: bloom history + Garden tab ---------- */
function bloomEvents() {
  const T = targets(); const ev = [];
  for (const s of Object.values(S.sessions)) if (s.source !== 'spreadsheet' && s.exercises?.length) ev.push([s.date, GARDEN.WORKOUT]);
  for (const d of Object.values(S.days)) {
    if (d.meals?.length) { ev.push([d.date, GARDEN.FOOD_DAY]); if (dayTotals(d).p >= T.p - 10) ev.push([d.date, GARDEN.PROTEIN_DAY]); }
    if (d.cardio?.length) ev.push([d.date, GARDEN.CARDIO * Math.min(d.cardio.length, 2)]);
  }
  for (const w of Object.values(S.weights)) if (w.kg) ev.push([w.date, GARDEN.WEIGH_IN]);
  ev.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  const dates = []; let pts = 0;
  for (const [date, n] of ev) { const before = Math.floor(pts / GARDEN.PER_BLOOM); pts += n; const after = Math.floor(pts / GARDEN.PER_BLOOM); for (let i = before; i < after; i++) dates.push(date); }
  return dates;
}
let bloomSyncArmed = false;
function syncBlooms() {
  if (!S.lastPull || !gardenOn() || bloomSyncArmed) return;
  const dates = bloomEvents(); const have = S.config?.blooms || [];
  if (dates.length <= have.length) return;
  bloomSyncArmed = true;
  setTimeout(() => {
    bloomSyncArmed = false;
    const cfg = cfgCopy(); const prev = cfg.blooms || []; const type = growType();
    const firstTime = !cfg.bloomsInit;
    const v = growVariant(); const added = dates.slice(prev.length).map(date => ({ date, type, ...(v ? { v } : {}) }));
    cfg.blooms = [...prev, ...added]; cfg.bloomsInit = true;
    saveConfig(cfg);
    if (added.some(x => x.date === todayISO()) && (!firstTime || added.length === 1)) { const M = gm(); celebrate(M.done(v), [{ text: M.doneText }], (type === 'car' ? carDriveSVG(prev.length + added.length - 1, v) : `<div class="cele-flower">${growSVG(type, 5, false, { i: prev.length + added.length - 1, v })}</div>`)); }
  }, 0);
}
function groundFlower(x, gy, i, type, stage = 5, wilting = false) {
  const F = FLOWERS[type] || FLOWERS[DEFAULT_FLOWER];
  const H = stage === 5 ? 58 + ((i * 37) % 17) : [0, 14, 26, 40, 52][stage];
  const lean = wilting ? 12 : ((i * 13) % 7) - 3;
  const tipX = x + lean, tipY = gy - H;
  if (stage === 0) return `<ellipse cx="${x}" cy="${gy - 2}" rx="4" ry="3" fill="#6B4226"/>`;
  let g = `<path d="M${x} ${gy} Q ${x - 4} ${gy - H * 0.55} ${tipX} ${tipY}" fill="none" style="stroke:#4E9A6B" stroke-width="3" stroke-linecap="round"/>`;
  if (H > 18) g += `<path d="M${x} ${gy - H * 0.3} q 12 -9 21 -2 q -9 8 -21 2z" fill="#5FA877"/><path d="M${x} ${gy - H * 0.5} q -12 -9 -20 -2 q 8 8 20 2z" fill="#4E9A6B"/>`;
  if (stage === 4) g += `<g transform="translate(${tipX} ${tipY + 1}) scale(1.1)">${F.bud()}</g>`;
  else if (stage === 5) g += `<g transform="translate(${tipX} ${tipY + 2}) rotate(${wilting ? 35 : lean}) scale(${(F.scale || 1.45) * 0.9})">${F.bloom()}</g>`;
  return `<g${wilting ? ' opacity=".75"' : ''}>${g}</g>`;
}
function gardenScene() {
  const blooms = S.config?.blooms || []; const g = gardenStats();
  const items = [...blooms.map((b, i) => ({ kind: 'bloom', i, ...b })), { kind: 'growing', i: blooms.length }];
  const PER = 3, W = 360, ROW = 132, TOP = 70;
  const rows = Math.ceil(items.length / PER);
  const Hh = TOP + rows * ROW + 10;
  const garage = growKind() === 'car';
  let svg = garage ? `<defs><linearGradient id="gwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--gar-top, #E6E8EB)"/><stop offset="1" style="stop-color:var(--gar-bot, #CDD1D6)"/></linearGradient></defs>
    <rect width="${W}" height="${Hh}" rx="18" fill="url(#gwall)"/>
    ${[60, 180, 300].map(cx => `<ellipse class="gar-glow" cx="${cx}" cy="24" rx="40" ry="12" fill="#FFF3C4"/><rect x="${cx - 30}" y="12" width="60" height="6" rx="3" fill="#FFF7D6" stroke="#B8BCC2"/>`).join('')}
    <g stroke="#000" opacity=".06">${Array.from({ length: Math.floor(Hh / 22) }, (_, k) => `<path d="M0 ${40 + k * 22} H${W}"/>`).join('')}</g>`
  : `<defs><linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--g-sky-top, #DCEBFA)"/><stop offset="1" style="stop-color:var(--g-sky-bot, #F7FBFF)"/></linearGradient>
    <linearGradient id="gsoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5A3B"/><stop offset="1" stop-color="#6E452C"/></linearGradient></defs>
    <rect width="${W}" height="${Hh}" rx="18" fill="url(#gsky)"/>
    <circle cx="${W - 46}" cy="40" r="20" fill="#FFD66B"/><circle cx="${W - 46}" cy="40" r="28" fill="#FFD66B" opacity=".25"/>
    <g fill="#FFFFFF" opacity=".9"><ellipse cx="70" cy="38" rx="26" ry="10"/><ellipse cx="90" cy="31" rx="18" ry="11"/><ellipse cx="190" cy="52" rx="20" ry="7"/></g>`;
  for (let r = 0; r < rows; r++) {
    const gy = TOP + (r + 1) * ROW - 34;
    if (garage) {
      svg += `<rect x="0" y="${gy - 2}" width="${W}" height="36" style="fill:var(--gar-floor, #8E949B)"/><rect x="0" y="${gy - 2}" width="${W}" height="3" style="fill:var(--gar-edge, #A9AEB4)"/>
        ${[120, 240].map(bx => `<path d="M${bx - 2} ${gy + 2} h4 l3 30 h-4z" style="fill:var(--gar-bay, #E9C46A)" opacity=".85"/>`).join('')}
        <g style="fill:var(--gar-dot, #6F757C)">${Array.from({ length: 6 }, (_, k) => `<circle cx="${20 + k * 64 + ((r * 13) % 20)}" cy="${gy + 26}" r="1.5"/>`).join('')}</g>`;
    } else
    svg += `<path d="M0 ${gy} Q ${W / 2} ${gy - 8} ${W} ${gy} V ${gy + 34} H 0 Z" fill="url(#gsoil)"/>
      <path d="M0 ${gy + 1} Q ${W / 2} ${gy - 7} ${W} ${gy + 1} V ${gy - 6} Q ${W / 2} ${gy - 14} 0 ${gy - 6} Z" fill="#7CBF6E"/>`;
    if (!garage) for (let k = 0; k < 9; k++) { const gx = 14 + k * 42 + ((r * 17 + k * 11) % 14); svg += `<path d="M${gx} ${gy - 4} l3 -9 l2 9 l3 -7 l1 7" fill="#6BB05E"/>`; }
    if (!garage) for (let k = 0; k < 5; k++) { const sx = 30 + k * 70 + ((r * 23 + k * 7) % 20); svg += `<circle cx="${sx}" cy="${gy + 18 + (k % 3) * 4}" r="2" fill="#5A3A24"/>`; }
    for (let c = 0; c < PER; c++) {
      const it = items[r * PER + c]; if (!it) continue;
      const x = 60 + c * 120;
      if (it.kind === 'bloom') {
        svg += groundItem(x, gy - 4, it.i, it.type || growType(), 5, false, it.v);
        svg += `<text x="${x}" y="${gy + 22}" text-anchor="middle" class="g-label">${fmtDay(it.date, { day: 'numeric', month: 'short' })}</text>`;
      } else {
        svg += groundItem(x, gy - 4, it.i, growType(), g.stage, g.wilting, growVariant());
        svg += `<text x="${x}" y="${gy + 22}" text-anchor="middle" class="g-label">${g.wilting ? 'Needs a workout' : gm().growing}</text>`;
      }
    }
  }
  return `<svg class="garden-scene" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${gm().section}: ${blooms.length} ${gm().grownLabel.toLowerCase()}">${svg}</svg>`;
}
function viewGarden() {
  return gardenCard() + viewGardenRest();
}
function viewGardenRest() {
  const s = streakStats(); const g = gardenStats(); const blooms = S.config?.blooms || [];
  const ws = weekStart(todayISO());
  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i); const worked = Object.values(S.sessions).some(x => x.date === d && x.source !== 'spreadsheet' && x.exercises?.length);
    const logged = loggedDates().has(d);
    return `<span class="wd${worked ? ' w' : logged ? ' l' : ''}${d === todayISO() ? ' today' : ''}"><i></i>${fromISO(d).toLocaleDateString('en-AU', { weekday: 'narrow' })}</span>`;
  }).join('');
  return `<section class="card" style="display:grid;gap:12px">
      <div class="stat3">
        <div class="s"><span>Day streak</span><b>${s.cur}</b></div>
        <div class="s"><span>Best streak</span><b>${s.best}</b></div>
        <div class="s"><span>${gm().grownLabel}</span><b>${blooms.length}</b></div>
      </div>
      <div class="small">${s.cur === 0 ? 'Log anything today to start a streak.' : s.todayLogged ? `You've logged today. Come back tomorrow for day ${s.cur + 1}.` : `Log something today to keep your ${s.cur}-day streak going.`}</div>
    </section>
    <section class="sec"><h2>Workout goal <span class="aside">${s.thisWeek} of ${WEEK_GOAL} this week</span></h2>
      <div class="card" style="display:grid;gap:10px">
        <div class="weekdots">${dots}</div>
        <div class="legend"><span><i style="background:var(--btn)"></i>Workout</span><span><i style="background:var(--sunk);border:1px solid var(--line)"></i>Logged</span></div>
        <div class="small">${s.weeks ? `${s.weeks} week${s.weeks > 1 ? 's' : ''} in a row with ${WEEK_GOAL}+ workouts.` : `Hit ${WEEK_GOAL} workouts in a week to start a weekly streak.`}</div>
      </div></section>
    <section class="sec"><h2>${gm().section} <span class="aside">${g.toNext} points ${gm().next}</span></h2>
      ${gardenScene()}
      <div class="small muted">${gm().footer}</div>
    </section>`;
}

/* ---------- "How it's calculated": every formula and data source in one place ---------- */
function openMethods() {
  const T = targets(); const pr = S.config?.profile || {};
  const wt = weightList().slice(-1)[0]?.kg || pr.weight;
  const n = v => Math.round(v).toLocaleString();
  let worked;
  if (pr.age && pr.height && wt && pr.sex) {
    const male = pr.sex !== 'female'; const act = ACTIVITY.find(a => a.id === pr.activity) || ACTIVITY[1]; const goal = GOALS.find(g => g.id === pr.goal) || GOALS[1];
    const bmr = 10 * wt + 6.25 * pr.height - 5 * pr.age + (male ? 5 : -161); const tdee = bmr * act.mult; const c = calcTargets({ ...pr, weight: wt });
    worked = `<ol class="method-list">
      <li><b>Resting burn (BMR)</b> = 10 × ${wt} kg + 6.25 × ${pr.height} cm − 5 × ${pr.age} ${male ? '+ 5' : '− 161'} = <b>${n(bmr)} kcal</b></li>
      <li><b>Daily burn</b> = ${n(bmr)} × ${act.mult} (${act.label.toLowerCase()}) = <b>${n(tdee)} kcal</b></li>
      <li><b>Calories</b> = ${n(tdee)} × ${goal.adj} (${goal.label.toLowerCase().replace(/\bi\b/g, 'I')}), rounded to the nearest 50 = <b>${n(c.kcal)} kcal</b></li>
      <li><b>Protein</b> = ${wt} kg × ${goal.protein} g = ${r1(wt * goal.protein)} g, rounded to the nearest 5 = <b>${c.p} g</b></li>
      <li><b>Fat</b> = the higher of 0.8 × ${wt} kg (${r1(wt * 0.8)} g) or 25% of calories (${r1(c.kcal * 0.25 / 9)} g), rounded to the nearest 5 = <b>${c.f} g</b></li>
      <li><b>Carbs</b> = what's left: (${n(c.kcal)} − ${c.p} × 4 − ${c.f} × 9) ÷ 4 = <b>${c.c} g</b></li>
    </ol>
    <div class="small muted">Your saved targets are ${n(T.kcal)} kcal, ${T.p} g protein, ${T.c} g carbs and ${T.f} g fat. If they differ from the above, they were set or edited by hand, or your weight has changed since. Tap "Recalculate from my stats" in Settings to update them.</div>`;
  } else {
    worked = `<div class="small">Your targets are ${n(T.kcal)} kcal, ${T.p} g protein, ${T.c} g carbs and ${T.f} g fat. They were entered directly rather than worked out in setup, so there's no working to show here. Tap "Recalculate from my stats" in Settings to enter your age, height and sex, and the full working will appear here.</div>`;
  }
  const milk = Object.values(MILKS).map(m => `${m[0]} ${m[1]} kcal`).join(', ');
  const cafe = Object.values(CAFE).filter(c => c[1] > 0 && !c[3]).map(c => `${c[0].toLowerCase()} ${Math.round(c[1] * 100)}%`).join(', ');
  const sec = (title, body, open) => `<details class="card meth"${open ? ' open' : ''}><summary>${title}</summary><div class="meth-body">${body}</div></details>`;
  const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet"><div class="panel"><div class="wrap methods">
    <div style="display:flex;align-items:center;gap:10px"><h3>How it's calculated</h3><button type="button" class="btn ghost sm" style="margin-left:auto" data-act="closeMethods">${S.methodsFromSettings ? '‹ Settings' : 'Close'}</button></div>
    <div class="small muted">Every number in the app comes from one of the formulas or sources below. They're good estimates for everyday tracking, not medical or dietetic advice. Talk to a GP or dietitian for anything specific to your health.</div>
    ${sec('Your daily targets', `<p>Calories start from the <b>Mifflin–St Jeor equation</b>, the most widely used and accurate formula for resting energy needs. That's then scaled by how active you are and by your goal.</p>
      <ul class="ing-list">
        <li><b>Resting burn (BMR):</b> 10 × weight (kg) + 6.25 × height (cm) − 5 × age, then + 5 for men or − 161 for women.</li>
        <li><b>Activity:</b> ${ACTIVITY.map(a => `${a.label.toLowerCase()} × ${a.mult}`).join('; ')}.</li>
        <li><b>Goal:</b> ${GOALS.map(g => `${g.label.toLowerCase().replace(/\bi\b/g, 'I')} × ${g.adj}${g.adj !== 1 ? ` (${g.adj < 1 ? '−' : '+'}${Math.round(Math.abs(1 - g.adj) * 100)}%)` : ''}`).join('; ')}. Rounded to the nearest 50 kcal.</li>
        <li><b>Protein:</b> 2.0 g per kg of body weight when losing fat or recomping, 1.8 g per kg otherwise. That's within the 1.6–2.2 g/kg range research supports for building and keeping muscle.</li>
        <li><b>Fat:</b> the higher of 0.8 g per kg or 25% of calories, so hormones and fat-soluble vitamins are covered.</li>
        <li><b>Carbs:</b> whatever calories are left, at a minimum of 50 g.</li>
        <li><b>Energy per gram:</b> protein 4 kcal, carbs 4 kcal, fat 9 kcal, alcohol 7 kcal. 1 kcal = 4.184 kJ.</li>
      </ul>
      <div class="slotlabel">Your working</div>${worked}`, true)}
    ${sec('Where food calories come from', `<ul class="ing-list">
        <li><b>Starter meals:</b> each recipe comes from a named food blogger or social media creator (shown on the meal's page). I recalculated the macros from every ingredient's weight using standard nutrition values, not the creator's own figures, which are often overstated.</li>
        <li><b>Common foods (Search):</b> typical values per 100 g from ${link('https://fdc.nal.usda.gov/', 'USDA FoodData Central')} and Food Standards Australia New Zealand's ${link('https://www.foodstandards.gov.au/science-data/food-nutrient-databases/ausnut', 'AUSNUT')}. Meat, rice and pasta use cooked weights unless the name says otherwise.</li>
        <li><b>Packaged foods and barcodes:</b> ${link('https://world.openfoodfacts.org/', 'Open Food Facts')}, a free database built from nutrition panels people photograph and enter. It's usually right, but worth checking against the packet.</li>
        ${TAKEAWAY.length ? `<li><b>Takeaway:</b> each chain's own published Australian nutrition information: ${TAKEAWAY_SOURCES.map(([c, d]) => `${esc(c)} (${esc(d)})`).join('; ')}. Every item was checked so its calories match its protein, carbs and fat within 15%. A few Hungry Jack's items list an energy figure that doesn't match their own macros, so their calories are worked out from the macros.</li>` : ''}
        <li><b>Drinks:</b> milk per 100 ml: ${milk}. Cups: small 220 ml, regular 330 ml, large 450 ml. Share of the cup that's milk: ${cafe}. Sugar or syrup 16 kcal per teaspoon or pump. A 30 ml spirit is 69 kcal. Other drinks use typical per-100 ml values for their category.</li>
        <li><b>Your own meals:</b> exactly the numbers you entered.</li>
        <li><b>Servings:</b> 1.5× a meal is simply 1.5 times its calories and macros.</li>
      </ul>`)}
    ${sec('Vitamins, minerals, fibre and sodium', `<ul class="ing-list">
        <li><b>Amounts:</b> worked out from each ingredient's weight using USDA FoodData Central and AUSNUT values. Bread includes Australia's mandatory folic acid fortification. Scanned foods use whatever the packet lists.</li>
        <li><b>Which meals count:</b> starter meals, searched and scanned foods, and your own meals that have ingredients listed. Meals with only calories and macros can't be broken down.</li>
        <li><b>Targets:</b> the ${link('https://www.eatforhealth.gov.au/nutrient-reference-values', 'Nutrient Reference Values for Australia and New Zealand')} (NHMRC) for your age and sex. Sodium uses the 2,000 mg suggested dietary target, and saturated fat is capped at 10% of your calories.</li>
        <li><b>Vitamin D:</b> mostly made from sunlight, so food alone rarely reaches the target.</li>
      </ul>`)}
    ${sec('Water and steps', `<ul class="ing-list">
        <li><b>Water goal:</b> 35 ml per kg of body weight, rounded to the nearest 250 ml and kept between 2 and 4 L. You can change it in Settings. A full tumbler is 1,180 ml (40 oz).</li>
        <li><b>Step goal:</b> 10,000 a day by default. Change it under Steps on the Food tab.</li>
      </ul>`)}
    ${sec('Training, PBs and progression', `<ul class="ing-list">
        <li><b>Estimated 1-rep max:</b> the Epley formula, weight × (1 + reps ÷ 30), with reps capped at 15 so very high-rep sets don't inflate it.</li>
        <li><b>Personal best:</b> either the heaviest weight you've ever done on that exercise, or an estimated 1RM more than 0.25 kg above your previous best.</li>
        <li><b>"Go up" hints:</b> once every set hits the top of the rep range, add 2.5 kg. That's 1.25 kg for small isolation lifts like curls, laterals and flyes under 12.5 kg, and 5 kg for leg press or anything at 100 kg or more.</li>
      </ul>`)}
    ${sec('Food tab colours and suggestions', `<ul class="ing-list">
        <li><b>Green:</b> within 150 kcal of your target and protein within 10 g of it. <b>Yellow:</b> under, or protein short. <b>Red:</b> more than 150 kcal over.</li>
        <li><b>What fits:</b> your meals, favourites and regulars that fit the calories you have left. They're ranked by protein per calorie, with a bonus for meals that suit the time of day.</li>
        <li><b>Your regulars:</b> anything logged at least twice in the last 30 days.</li>
      </ul>`)}
    ${sec('Weight trend advice', `<ul class="ing-list">
        <li>Compares this week's average weight with last week's, because single days swing with water, salt and food in your gut.</li>
        <li>Losing more than 0.5 kg a week suggests eating a little more to protect muscle. Gaining more than 0.4 kg suggests trimming 100–150 kcal if it repeats.</li>
      </ul>`)}
    ${sec('Garden, forest and garage points', `<ul class="ing-list">
        <li>Workout +${GARDEN.WORKOUT}, cardio +${GARDEN.CARDIO} (up to 2 a day), food logged +${GARDEN.FOOD_DAY}, protein target hit +${GARDEN.PROTEIN_DAY}, weigh-in +${GARDEN.WEIGH_IN}.</li>
        <li>Every ${GARDEN.PER_BLOOM} points a flower blooms, a tree finishes or a car is built. Go ${GARDEN.WILT_DAYS}+ days without a workout and it droops, browns or gathers dust, but you never lose progress.</li>
      </ul>`)}
  </div></div></div>`;
}

/* ---------- SETTINGS ---------- */
function growPicker(kind, act, cur, soft = softTheme(), vb = bonsaiSp(), vc = carStyle()) {
  return `<div class="flower-pick grow-pick" role="group" aria-label="What you grow">${(soft ? ['flower', 'bonsai', 'car'] : ['bonsai', 'car', 'flower']).map(k => `<button type="button" class="fp" data-act="${act}" data-v="${k}" aria-pressed="${cur === k}">
    <span class="fp-art">${k === 'flower' ? flowerSVG(5, false, { type: flowerType(), label: 'Flower' }) : growSVG(k, 5, false, { i: 0, label: GROWS[k].label, v: k === 'bonsai' ? vb : vc })}</span><span class="fp-name">${GROWS[k].label}</span></button>`).join('')}</div>`;
}
function flowerPicker(act, cur) {
  return `<div class="flower-pick" role="group" aria-label="Choose your flower">${Object.entries(FLOWERS).map(([id, f]) => `<button type="button" class="fp" data-act="${act}" data-v="${id}" aria-pressed="${cur === id}">
    <span class="fp-art">${flowerSVG(5, false, { type: id, label: f.name })}</span><span class="fp-name">${f.name}</span></button>`).join('')}</div>`;
}
function bonsaiPicker(act, cur) {
  return `<div class="flower-pick" role="group" aria-label="Bonsai type">${Object.entries(BONSAI).map(([id, b]) => `<button type="button" class="fp" data-act="${act}" data-v="${id}" aria-pressed="${cur === id}">
    <span class="fp-art">${bonsaiSVG(5, false, b.name, id)}</span><span class="fp-name">${b.name}</span></button>`).join('')}</div>`;
}
function carPicker(act, cur, soft = softTheme()) {
  return `<div class="flower-pick car-pick" role="group" aria-label="Car style">${Object.entries(CAR_STYLES).filter(([, c]) => !!c.soft === soft).map(([id, c], k) => `<button type="button" class="fp" data-act="${act}" data-v="${id}" aria-pressed="${cur === id}">
    <span class="fp-art">${carSVG(5, false, carColour(k, id), c.name, id)}</span><span class="fp-name">${c.name}</span></button>`).join('')}</div>`;
}
function growSettings() {
  const soft = softTheme(); const kind = growKind(); const M = gm();
  return `<div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Grow something</div>
      <div class="small muted">Something on the Food tab that grows as you log, and fastest when you work out. Finished ones go to their own tab.</div>
      <div class="seg" role="group" aria-label="Show it">
        <button type="button" data-act="garden" data-v="on" aria-pressed="${gardenOn()}">Show</button>
        <button type="button" data-act="garden" data-v="off" aria-pressed="${!gardenOn()}">Hide</button>
      </div>
      <div class="small muted">What you grow</div>${growPicker(kind, 'grow', kind)}
      ${kind === 'flower' ? `<div class="small muted">Your flower</div>${flowerPicker('flower', flowerType())}` : kind === 'car' ? `<div class="small muted">Car style</div>${carPicker('carStyle', carStyle())}<div class="small muted">Each finished car gets a new colour and is parked in your Garage tab. Switching style starts the next build as that style; finished cars keep theirs.</div>` : `<div class="small muted">Bonsai type</div>${bonsaiPicker('bonsaiSp', bonsaiSp())}<div class="small muted">Each finished bonsai is planted as a tree in your Forest tab. Switching type grows the next one as that type; finished trees keep theirs.</div>`}
    </div>`;
}
// Very low calorie targets get a gentle warning (not a block): below these, most adults struggle to meet their needs.
function kcalFloor() { return S.config?.profile?.sex === 'male' ? 1500 : 1200; }
function lowKcalWarn(k) {
  k = +k; if (!k || k >= kcalFloor()) return '';
  return `<div class="banner warn-soft">${r0(k)} kcal is very low. Below about ${kcalFloor().toLocaleString()} kcal a day it's hard to get enough protein and nutrients, and you can lose muscle and energy. Only go this low if a doctor or dietitian has set it for you.</div>`;
}
function openSettings() {
  // Re-opening while Settings is already up (after picking a theme, car, bonsai, colour…) keeps your place instead of jumping to the top.
  const keepScroll = document.getElementById('settingsForm') ? (document.querySelector('.sheet .panel')?.scrollTop || 0) : 0;
  const T = targets(); const prog = program();
  const sl = splitList();
  const overview = sl.length ? sl.map(d => `${esc(d.name)}${d.wd?.length ? ` <span class="muted">${wdShort(d.wd)}</span>` : ''}`).join(' · ') : 'No training days yet';
  const ed = `<details class="card split-wrap" id="splitEditor"${S.splitOpen ? ' open' : ''}>
      <summary><span class="sw-head"><b>Training split</b><span class="small sw-over">${overview}</span></span><span class="linkbtn sw-edit">Edit</span></summary>
      <div class="split-body">
        <div class="small muted">Tap a day to change its name, weekdays or exercises. The Train tab opens on the right day automatically. Tap Save at the bottom when you're done.</div>
        <div id="splitDays">${sl.map((sd, di) => dayEditor(sd, prog[sd.name] || [], di)).join('')}</div>
        <div><button type="button" class="btn ghost sm" data-act="pgAddDay">+ Add a training day</button></div>
      </div>
    </details>`;
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet" id="sheet"><div class="panel"><form class="wrap" id="settingsForm">
    <div style="display:flex;align-items:center;gap:10px"><h3>Settings</h3><button type="button" class="btn ghost sm" style="margin-left:auto" data-act="closeSettings">Close</button></div>
    <button type="button" class="card methods-cta" data-act="openMethods"><span><b>How it's calculated</b><span class="small muted">The formulas behind your targets, and where every food's calories come from</span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Background colour</div>
      <div class="swatches" role="group" aria-label="Background colour">${THEMES.map(t => `<button type="button" class="swatch" data-act="theme" data-v="${t.id}" aria-pressed="${(S.config?.theme || 'auto') === t.id}" title="${t.name}">
        <span class="sw" style="${t.bg ? `background:${t.bg};border-color:${t.line}` : 'background:linear-gradient(135deg,#F1F1EC 50%,#11151A 50%)'}"></span><span class="swn">${t.name}</span></button>`).join('')}</div>
      <div class="icon-note"><img src="icons/t/${findTheme(S.config?.theme)?.id || 'auto'}-180.png" alt="" width="40" height="40"><span class="small muted">Your home-screen icon matches this colour. Phones lock the icon in when you add the app, so to update it, remove Refyne from your home screen and add it again from ${/iPhone|iPad/.test(navigator.userAgent) ? 'Safari (Share → Add to Home Screen)' : 'your browser menu'}. Your data stays.</span></div>
    </div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Food page</div>
      <div class="small muted">Choose what shows on the Food tab. Everything you turn off still works, it's just out of the way.</div>
      ${[['water', 'Water'], ['steps', 'Steps and cardio'], ['supps', 'Supplements'], ['week', 'Last 7 days'], ['fits', 'What fits (meal suggestions)']].map(([k, l]) => `<label class="tick"><input type="checkbox" data-food="${k}" ${foodShown()[k] ? 'checked' : ''}> ${l}</label>`).join('')}
    </div>
    ${growSettings()}
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Meal plan</div>
      <div class="small muted">Your meals: ${(S.config?.foods || []).length}. Starter meals come in Everything, Pescatarian, Vegetarian and Vegan, with allergen filters, and are sized to your targets. ${(S.config?.hiddenRecipes || []).length < RECIPES.length ? `Showing ${RECIPES.length - (S.config?.hiddenRecipes || []).length} of ${RECIPES.length} classic meals.` : ''} Tap × on any meal to remove it.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn sm" data-act="openStarters">Browse starter meals</button>
        ${(S.config?.hiddenRecipes || []).length ? '<button type="button" class="btn ghost sm" data-act="restoreRecipes">Show classic meals</button>' : ''}
        ${(S.config?.hiddenRecipes || []).length < RECIPES.length ? '<button type="button" class="btn ghost sm" data-act="hideAllRecipes">Remove classic meals</button>' : ''}
      </div>
    </div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Daily targets</div>
      <div class="grid4">
        <label class="f">kcal<input type="number" id="t_kcal" value="${T.kcal}" min="1000" max="5000"></label>
        <label class="f">Protein g<input type="number" id="t_p" value="${T.p}" min="0" max="400"></label>
        <label class="f">Carbs g<input type="number" id="t_c" value="${T.c}" min="0" max="800"></label>
        <label class="f">Fat g<input type="number" id="t_f" value="${T.f}" min="0" max="300"></label>
      </div>
      <div id="t_warn">${lowKcalWarn(T.kcal)}</div>
      <div class="small muted">On days with extra exercise, like a long hike, swim or run, eat a bit more to fuel it.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost sm" data-act="redoSetup">Recalculate from my stats</button><button type="button" class="btn ghost sm" data-act="openMethods">How it's calculated</button></div>
    </div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Rest timer</div>
      <label class="f">Volume <span class="small muted" id="tv_show">${timerVol()}%</span><input type="range" id="tv_vol" min="0" max="100" step="5" value="${timerVol()}" class="range"></label>
      <div class="f"><span class="small muted">Beeps when rest is over</span><div class="seg">${[1, 2, 3].map(n => `<button type="button" data-act="timerBeeps" data-v="${n}" aria-pressed="${timerBeeps() === n}">${n}</button>`).join('')}</div></div>
      <div><button type="button" class="btn ghost sm" data-act="testBeep">Test sound</button></div>
      <div class="small muted">The beep also depends on your phone's volume, and on iPhone it won't play if the ring/silent switch is on silent. It briefly turns your music down so you can hear it.</div>
      <div class="slotlabel">Notify me when rest is over</div>
      ${!pushSupported() ? `<div class="small muted">${/iPhone|iPad/.test(navigator.userAgent) && !isStandalone() ? 'Open Refyne from its Home Screen icon (not Safari) to turn this on. Needs iOS 16.4 or later.' : 'This browser can\'t show notifications.'}</div>`
        : `<div class="small muted">Get a notification when your rest timer ends, even if you've switched to music or locked your phone. This is set per phone.</div>
      <div class="seg" role="group" aria-label="Rest notifications"><button type="button" data-act="pushOn" aria-pressed="${pushOn()}">On</button><button type="button" data-act="pushOff" aria-pressed="${!pushOn()}">Off</button></div>
      ${pushOn() ? '<div><button type="button" class="btn ghost sm" data-act="pushTest">Send a test in 5 seconds</button></div><div class="small muted">Tap it, then lock your phone or switch apps.</div>' : ''}`}
    </div>
    ${waterSettings()}
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Supplements</div>
      ${(S.config?.supps || []).length ? `<div class="rows">${S.config.supps.map(x => `<div class="row"><span class="t">${esc(x.name)}</span><button type="button" class="xbtn" data-act="suppDel" data-v="${x.id}" aria-label="Remove ${esc(x.name)}">×</button></div>`).join('')}</div>` : '<div class="small muted">Add what you take and tick them off on the Food tab each day.</div>'}
      <div class="formrow"><label class="f">Add a supplement<input type="text" id="supp_new" placeholder="e.g. Creatine 5 g"></label><button type="button" class="btn ghost" data-act="suppAdd">Add</button></div>
      <div class="chips">${SUPP_SUGGEST.filter(n => !(S.config?.supps || []).some(x => x.name === n)).map(n => `<button type="button" class="chip k chipbtn" data-act="suppQuick" data-v="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>
    </div>
    ${ed}
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="submit">Save</button><button type="button" class="btn ghost sm" data-act="pgStarter">Use the starter split</button><button type="button" class="btn ghost sm" data-act="pgClear">Clear my split</button></div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Your data</div>
      <div class="small muted">${store.outbox.length ? `${store.outbox.length} change${store.outbox.length > 1 ? 's' : ''} waiting to sync.` : 'Everything is synced to your account.'}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn ghost sm" data-act="exportBackup">Export backup</button>
        <label class="btn ghost sm" style="cursor:pointer">Restore from backup<input type="file" id="restoreFile" accept="application/json,.json" hidden></label>
      </div>
    </div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Account</div>
      <div class="small">Signed in as <b>${esc(S.user?.email || '')}</b></div>
      <div class="small muted">App version ${APP_VERSION}</div>
      <details class="fb"${S.fbOpen ? ' open' : ''}><summary>Send feedback</summary>
        <div style="display:grid;gap:8px;margin-top:8px">
          <div class="small muted">Something broken, confusing or missing? Tell us. It goes straight to the person building Refyne.</div>
          <textarea id="fb_text" rows="4" maxlength="2000" placeholder="What happened, or what would make Refyne better?"></textarea>
          <div><button type="button" class="btn sm" data-act="sendFeedback">Send</button></div>
        </div>
      </details>
      <details class="privacy"><summary>Privacy and disclaimer</summary>${PRIVACY_HTML}</details>
      <details class="pw"><summary>Change password</summary>
        <div class="grid2" style="margin-top:8px">
          <label class="f">New password<input type="password" id="pw1" autocomplete="new-password" minlength="8"></label>
          <label class="f">Type it again<input type="password" id="pw2" autocomplete="new-password" minlength="8"></label>
        </div>
        <div id="pwMsg" class="small muted">At least 8 characters.</div>
        <div><button type="button" class="btn sm" data-act="changePw">Change password</button></div>
      </details>
      <details class="del"${S.delOpen ? ' open' : ''}><summary>Delete my account</summary>
        <div style="display:grid;gap:8px;margin-top:8px">
          <div class="small">This permanently deletes your account, every log, weigh-in and session, and all your progress photos. It can't be undone. Download a backup first if you want to keep a copy.</div>
          <label class="f">Type DELETE to confirm<input type="text" id="del_confirm" autocomplete="off" autocapitalize="characters"></label>
          <div><button type="button" class="btn danger sm" data-act="deleteAccount">Delete everything</button></div>
          <div id="delMsg" class="small muted"></div>
        </div>
      </details>
      ${S.confirmSignOut ? `<div class="small">${store.outbox.length ? `<b class="down-txt">${store.outbox.length} change${store.outbox.length > 1 ? 's' : ''} haven't synced yet and will be lost.</b> ` : ''}Sign out of this phone?</div><div style="display:flex;gap:8px"><button type="button" class="btn danger sm" data-act="signOut">Sign out</button><button type="button" class="btn ghost sm" data-act="cancelSignOut">Stay signed in</button></div>` : `<div><button type="button" class="btn ghost sm" data-act="askSignOut">Sign out</button></div>`}
    </div>
  </form></div></div>`;
  if (keepScroll) { const pn = document.querySelector('.sheet .panel'); if (pn) pn.scrollTop = keepScroll; }
}
const WD = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']];
const WD_LONG = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
function exRow(p, k) {
  return `<div class="progrow">
      <input type="text" list="exnames" value="${esc(p.name || '')}" data-k="name" aria-label="Exercise" id="pg_${k}_n" placeholder="Exercise">
      <input type="number" min="1" max="10" value="${p.sets || 3}" data-k="sets" aria-label="Sets" id="pg_${k}_s">
      <input type="number" min="1" max="50" value="${p.min || 8}" data-k="min" aria-label="Min reps" id="pg_${k}_a">
      <input type="number" min="1" max="50" value="${p.max || 12}" data-k="max" aria-label="Max reps" id="pg_${k}_b">
      <button type="button" class="del" data-act="pgDel" aria-label="Remove exercise">×</button></div>`;
}
const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function wdShort(wd) { return [1, 2, 3, 4, 5, 6, 0].filter(n => wd.includes(n)).map(n => WD_SHORT[n]).join(', '); }
function daySumText(name, wd, n) { return { name: name || 'New day', meta: `${wd.length ? wdShort(wd) : 'No weekday'} · ${n} exercise${n === 1 ? '' : 's'}` }; }
function dayEditor(sd, exs, di, open = false) {
  const k = 'd' + di + '_' + Math.random().toString(36).slice(2, 6); const t = daySumText(sd.name, sd.wd || [], exs.length);
  return `<details class="dayedit"${open ? ' open' : ''}>
    <summary class="day-sum"><b class="ds-name">${esc(t.name)}</b><span class="ds-meta small muted">${t.meta}</span></summary>
    <div class="day-body">
    <div class="dayedit-head"><input type="text" class="dayname" data-k="dayname" value="${esc(sd.name)}" placeholder="Day name, e.g. Push, Full body A" aria-label="Training day name" maxlength="24"><button type="button" class="linkbtn" style="color:var(--red)" data-act="pgDelDay">Remove day</button></div>
    <div class="wdpick" role="group" aria-label="Which weekdays">${WD.map(([n, l]) => `<button type="button" class="wd-chip" data-wd="${n}" aria-pressed="${(sd.wd || []).includes(n)}" aria-label="${WD_LONG[n]}" data-act="wdToggle">${l}</button>`).join('')}</div>
    <div class="progrow small muted"><span>Exercise</span><span>Sets</span><span>Min</span><span>Max</span><span></span></div>
    <div class="dayexs">${exs.map((p, i) => exRow(p, k + '_' + i)).join('')}</div>
    <div><button type="button" class="linkbtn" data-act="pgAdd">+ Exercise</button></div>
    </div></details>`;
}
function refreshDaySum(card) {
  if (!card) return;
  const t = daySumText((card.querySelector('.dayname')?.value || '').trim(), [...card.querySelectorAll('.wd-chip[aria-pressed="true"]')].map(x => +x.dataset.wd),
    [...card.querySelectorAll('.dayexs .progrow')].filter(r => (r.querySelector('[data-k="name"]')?.value || '').trim()).length);
  card.querySelector('.ds-name').textContent = t.name; card.querySelector('.ds-meta').textContent = t.meta;
}
function readSplitFromSheet() { // -> { split, program } from the Settings editor
  const split = [], program = {}; const used = new Set(['custom', 'rest']);
  document.querySelectorAll('#settingsForm .dayedit').forEach((card, i) => {
    let name = (card.querySelector('.dayname').value || '').trim().replace(/[_/]/g, ' ') || `Day ${i + 1}`;
    let n = name, c = 2; while (used.has(n.toLowerCase())) n = `${name} ${c++}`; used.add(n.toLowerCase());
    const wd = [...card.querySelectorAll('.wd-chip[aria-pressed="true"]')].map(b => +b.dataset.wd);
    const exs = [];
    card.querySelectorAll('.progrow:not(.small)').forEach(row => {
      const g = k => row.querySelector(`[data-k="${k}"]`)?.value ?? '';
      const ex = g('name').trim(); if (!ex) return;
      const min = Math.max(1, +g('min') || 8), max = Math.max(min, +g('max') || min);
      exs.push({ name: ex, sets: Math.max(1, Math.min(10, +g('sets') || 3)), min, max });
    });
    split.push({ name: n, wd }); program[n] = exs;
  });
  // a weekday can only open one day: the first day that claims it wins
  const seen = new Set(), clash = []; for (const d of split) d.wd = d.wd.filter(w => { if (seen.has(w)) { clash.push(`${WD_LONG[w]} stays with ${split.find(x => x.wd.includes(w) && x !== d)?.name}`); return false; } seen.add(w); return true; });
  return { split, program, clash };
}

/* ---------- events ---------- */
document.querySelector('nav.tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]'); if (!b) return;
  S.tab = b.dataset.tab; S.confirmPhoto = null; S.confirmSession = false; render(); window.scrollTo(0, 0);
});
document.getElementById('prevDay').onclick = () => { S.date = addDays(S.date, -1); S.trainDay = null; S.confirmSession = false; render(); };
document.getElementById('nextDay').onclick = () => { S.date = addDays(S.date, 1); S.trainDay = null; S.confirmSession = false; render(); };
document.getElementById('todayBtn').onclick = () => { S.date = todayISO(); S.trainDay = null; render(); };
document.getElementById('openSettings').onclick = openSettings;

document.addEventListener('change', e => {
  const pick = e.target.dataset?.spPick;
  if (pick) { const sp = spState(); if (e.target.checked) sp.picked[pick] = sp.picked[pick] ?? 1; else delete sp.picked[pick]; spRefresh(); return; }
  const k = e.target.dataset?.food; if (!k) return;
  const cfg = cfgCopy(); const on = e.target.checked;
  if (k === 'water') cfg.water = { ...(cfg.water || {}), hidden: !on };
  else if (k === 'steps') cfg.stepsHidden = !on;
  else if (k === 'supps') cfg.suppHidden = !on;
  else if (k === 'week') cfg.weekShown = on;
  else if (k === 'fits') cfg.fitsHidden = !on;
  saveConfig(cfg);
});
document.addEventListener('click', e => {
  const o = e.target.classList?.contains('ovl') ? e.target : null;
  if (o) { if (o.dataset.ovl === 'add') S.addOpen = false; else S.panel = null; render(); }
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  const D = () => getDraft();
  switch (a) {
    case 'goto': S.date = b.dataset.date; S.trainDay = null; render(); break;
    case 'tab': S.tab = b.dataset.v; render(); window.scrollTo(0, 0); break;
    case 'openAdd': S.addOpen = true; S.panel = null; if (b.dataset.v === 'Drinks') S.foodAdd = 'drinks'; else if (b.dataset.v) { S.foodAdd = 'plan'; S.addFocus = b.dataset.v; } render(); break;
    case 'closeAdd': S.addOpen = false; if (S.foodAdd === 'scan') { try { closeScanner(); } catch {} } render(); break;
    case 'openPanel': S.panel = b.dataset.v; S.addOpen = false; render(); break;
    case 'closePanel': S.panel = null; render(); break;
    case 'progView': S.progView = b.dataset.v; render(); window.scrollTo(0, 0); break;
    case 'foodAdd': S.foodAdd = b.dataset.v; render(); break;
    case 'addRecipe': {
      const r = RECIPES.find(x => x.id === b.dataset.id); const day = localDay(S.date);
      day.meals.push({ id: uid(), name: r.name, slot: r.slot, servings: 1, kcal: r.kcal, p: r.p, c: r.c, f: r.f, recipe: r.id });
      saveDay(S.date, day); toast(`Added ${r.name}`); if (b.dataset.close) document.getElementById('sheetRoot').innerHTML = ''; break;
    }
    case 'addMine': {
      const f = (S.config?.foods || []).find(x => x.id === b.dataset.id); if (!f) break; const day = localDay(S.date);
      day.meals.push({ id: uid(), name: f.name, slot: f.slot || 'Snack', servings: 1, kcal: f.kcal, p: f.p, c: f.c, f: f.f, food: f.id, ...(f.ing?.length ? { ing: f.ing } : {}), ...(f.nut ? { nut: f.nut } : {}) });
      saveDay(S.date, day); toast(`Added ${f.name}`); if (b.dataset.close) document.getElementById('sheetRoot').innerHTML = ''; break;
    }
    case 'hideRecipe': {
      const r = RECIPES.find(x => x.id === b.dataset.id); if (!r) break;
      const cfg = JSON.parse(JSON.stringify(S.config || {}));
      cfg.hiddenRecipes = [...new Set([...(cfg.hiddenRecipes || []), r.id])];
      saveConfig(cfg); toast(`Removed ${r.name}. Bring it back in Settings.`); break;
    }
    case 'restoreRecipes': {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); cfg.hiddenRecipes = []; saveConfig(cfg); openSettings(); toast('Starter meals restored'); break;
    }
    case 'hideAllRecipes': {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); cfg.hiddenRecipes = RECIPES.map(r => r.id); saveConfig(cfg); openSettings(); toast('Starter meals removed. Your own meals stay.'); break;
    }
    case 'flower': {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); cfg.flower = b.dataset.v; saveConfig(cfg); openSettings(); toast(`${FLOWERS[b.dataset.v].name} planted`); break;
    }
    case 'bonsaiSp': { const cfg = cfgCopy(); cfg.bonsai = b.dataset.v; saveConfig(cfg); openSettings(); toast(`${BONSAI[b.dataset.v].name} it is`); break; }
    case 'carStyle': { const cfg = cfgCopy(); cfg[CAR_STYLES[b.dataset.v].soft ? 'carSoft' : 'car'] = b.dataset.v; saveConfig(cfg); openSettings(); toast(`Building a ${CAR_STYLES[b.dataset.v].name}`); break; }
    case 'grow': { const cfg = cfgCopy(); cfg[softTheme() ? 'growSoft' : 'grow'] = b.dataset.v; saveConfig(cfg); openSettings(); toast(b.dataset.v === 'car' ? 'New build started in the garage' : b.dataset.v === 'bonsai' ? 'Bonsai planted' : 'Flower planted'); break; }
    case 'garden': {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); cfg.garden = b.dataset.v === 'on'; saveConfig(cfg); openSettings(); break;
    }
    case 'theme': {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); cfg.theme = b.dataset.v; applyTheme(cfg.theme); saveConfig(cfg); openSettings(); break;
    }
    case 'forgetFood': {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); cfg.foods = (cfg.foods || []).filter(x => x.id !== b.dataset.id); saveConfig(cfg); break;
    }
    case 'serv': {
      const day = localDay(S.date); const m = day.meals.find(x => x.id === b.dataset.id); if (!m) break;
      const n = Math.round(((m.servings ?? 1) + Number(b.dataset.d)) * 2) / 2;
      if (n <= 0) day.meals = day.meals.filter(x => x.id !== m.id); else m.servings = n;
      saveDay(S.date, day); break;
    }
    case 'delCardio': { const day = localDay(S.date); day.cardio = (day.cardio || []).filter(x => x.id !== b.dataset.id); saveDay(S.date, day); break; }
    case 'trainDay': {
      S.trainDay = b.dataset.v; S.confirmSession = false;
      // Remember the pick for this date only; keep the last ~3 weeks.
      const picks = lsGet('rl:trainPick') || {}; const cut = addDays(todayISO(), -21);
      picks[S.date] = S.trainDay; Object.keys(picks).forEach(k => { if (k < cut) delete picks[k]; });
      lsSet('rl:trainPick', picks); render(); break;
    }
    case 'drop': { const r = D().exercises[b.dataset.e].rows[b.dataset.r]; r.drop = r.drop ? null : { kg: r.kg ? Math.max(0, Number(r.kg) - increment(D().exercises[b.dataset.e].name, Number(r.kg)) * 2) : '', reps: '', partials: '' }; persistDraft(); render(); break; }
    case 'addSet': { const ex = D().exercises[b.dataset.e]; const l = ex.rows[ex.rows.length - 1]; ex.rows.push({ kg: l?.kg ?? '', reps: '', partials: '', drop: null, ph: l?.ph ?? '' }); persistDraft(); render(); break; }
    case 'rmSet': { D().exercises[b.dataset.e].rows.pop(); persistDraft(); render(); break; }
    case 'rmEx': { D().exercises.splice(+b.dataset.e, 1); persistDraft(); render(); break; }
    case 'addEx': { D().exercises.push({ name: '', sets: 3, min: 8, max: 12, rows: [0, 1, 2].map(() => ({ kg: '', reps: '', partials: '', drop: null })) }); persistDraft(); render(); setTimeout(() => document.getElementById('exn_' + (D().exercises.length - 1))?.focus(), 0); break; }
    case 'saveSession': saveSession(); break;
    case 'askDelSession': S.confirmSession = true; render(); break;
    case 'cancelDelSession': S.confirmSession = false; render(); break;
    case 'delSession': {
      const key = draftKey(); delete S.sessions[key]; delete S.drafts[key]; lsSet('draft:' + key, null); S.confirmSession = false; render(); toast('Session deleted');
      store.del('sessions', key); break;
    }
    case 'timer': startTimer(+b.dataset.s); break;
    case 'pickEx': S.progressEx = b.dataset.v; render(); window.scrollTo(0, 0); break;
    case 'delWeight': { const d = b.dataset.v; store.del('weights', d); render(); break; }
    case 'askDelPhoto': S.confirmPhoto = b.dataset.id; render(); break;
    case 'cancelDelPhoto': S.confirmPhoto = null; render(); break;
    case 'delPhoto': {
      const id = b.dataset.id; const p = S.photos[id]; S.confirmPhoto = null; render();
      try { store.del('photos', id); if (p?.path) { const { error } = await sb.storage.from('photos').remove([p.path]); if (error) throw error; } toast('Photo deleted'); }
      catch (err) { console.error(err); toast('Could not delete the photo file. Try again.'); }
      break;
    }
    case 'importHistory': {
      b.disabled = true; b.textContent = 'Importing…';
      try { const n = await importHistory(); toast(`Imported ${n} sessions`); document.getElementById('sheetRoot').innerHTML = ''; render(); }
      catch (err) { console.error(err); toast(err.message || 'Import failed. Try again with signal.'); b.disabled = false; b.textContent = 'Import spreadsheet history'; }
      break;
    }
    case 'exportBackup': exportBackup(); break;
    case 'askSignOut': S.confirmSignOut = true; openSettings(); break;
    case 'cancelSignOut': S.confirmSignOut = false; openSettings(); break;
    case 'sendFeedback': {
      const t = (document.getElementById('fb_text')?.value || '').trim(); if (!t) { toast('Type your feedback first'); break; }
      b.disabled = true;
      try {
        const { error } = await sb.from('feedback').insert({ message: t.slice(0, 2000), app_version: APP_VERSION, theme: S.config?.theme || 'auto', device: navigator.userAgent.slice(0, 200) });
        if (error) throw error;
        S.fbOpen = false; openSettings(); toast('Thanks! Feedback sent.');
      } catch (err) { console.error(err); b.disabled = false; toast(navigator.onLine ? 'Couldn\'t send feedback. Try again later.' : 'You\'re offline. Try again when you\'re connected.'); }
      break;
    }
    case 'deleteAccount': {
      const msg = document.getElementById('delMsg');
      if ((document.getElementById('del_confirm')?.value || '').trim().toUpperCase() !== 'DELETE') { if (msg) msg.textContent = 'Type DELETE in the box to confirm.'; break; }
      if (!navigator.onLine) { if (msg) msg.textContent = 'You need to be online to delete your account.'; break; }
      b.disabled = true; if (msg) msg.textContent = 'Deleting…';
      try {
        // Make sure the server side is set up before touching anything.
        const ready = await sb.rpc('account_tools_ready'); if (ready.error) throw ready.error;
        // Photos first (storage files), then the account; the database removes every row with it.
        for (;;) {
          const { data: files, error } = await sb.storage.from('photos').list(S.user.id, { limit: 100 });
          if (error) throw error; if (!files?.length) break;
          const { error: e2 } = await sb.storage.from('photos').remove(files.map(f => `${S.user.id}/${f.name}`)); if (e2) throw e2;
          if (files.length < 100) break;
        }
        try { if (pushOn()) await disablePush(); } catch {}
        const { error } = await sb.rpc('delete_my_account'); if (error) throw error;
        for (const k of Object.keys(localStorage)) if (k.includes(S.user.id) || k.startsWith('draft:') || ['rl:lastUser', 'rl:trainPick', 'rl:pushOn'].includes(k)) localStorage.removeItem(k);
        store.outbox = []; document.getElementById('sheetRoot').innerHTML = '';
        await sb.auth.signOut().catch(() => {});
        S.user = null; showLogin('', '', 'in', 'Your account and all its data have been deleted.');
      } catch (err) { console.error(err); b.disabled = false; if (msg) msg.textContent = 'Something went wrong, so nothing more was deleted. Try again, or send feedback if it keeps happening.'; }
      break;
    }
    case 'signOut': {
      S.confirmSignOut = false; document.getElementById('sheetRoot').innerHTML = '';
      lsSet(store.key('cache'), null); lsSet(store.key('outbox'), null); store.outbox = [];
      await sb.auth.signOut(); break;
    }
    case 'ob-set': { S.ob.d[b.dataset.k] = b.dataset.v; if (S.ob.step === 1) { const e = obReadStep(); S.ob.err = null; void e; } openOnboarding(); break; }
    case 'ob-next': { const err = obReadStep(); if (err) { S.ob.err = err; openOnboarding(); break; } S.ob.err = null; openOnboarding(S.ob.step + 1); document.querySelector('.sheet .panel')?.scrollTo(0, 0); break; }
    case 'ob-back': { if (S.ob.step === 3) obReadStep(); openOnboarding(S.ob.step - 1); break; }
    case 'ob-skip': obFinish(true); break;
    case 'ob-finish': obFinish(false); break;
    case 'ob-theme': { S.ob.d.theme = b.dataset.v; appliedTheme = null; applyTheme(b.dataset.v); openOnboarding(); break; }
    case 'ob-flower': { S.ob.d.flower = b.dataset.v; openOnboarding(); break; }
    case 'ob-bonsai': { S.ob.d.bonsai = b.dataset.v; openOnboarding(); break; }
    case 'ob-car': { S.ob.d.car = b.dataset.v; openOnboarding(); break; }
    case 'ob-garden': { S.ob.d.garden = b.dataset.v === 'on'; openOnboarding(); break; }
    case 'ob-start': { S.ob.d.start = b.dataset.v; openOnboarding(); break; }
    case 'ob-skipmeals': { S.sp = null; openOnboarding(5); document.querySelector('.sheet .panel')?.scrollTo(0, 0); break; }
    case 'spStyle': { spState().style = b.dataset.v; spRefresh(); break; }
    case 'spAvoid': { const sp = spState(); const k = b.dataset.v; sp.avoid = sp.avoid.includes(k) ? sp.avoid.filter(x => x !== k) : [...sp.avoid, k];
      for (const id of Object.keys(sp.picked)) { const r = STARTER_LIB.find(x => x.id === id); if (r && libContains(r).some(a => sp.avoid.includes(a))) delete sp.picked[id]; } spRefresh(); break; }
    case 'spNudge': { const sp = spState(); const id = b.dataset.id; const cur = sp.picked[id] ?? 1; const nv = Math.round(Math.min(1.6, Math.max(0.6, cur + Number(b.dataset.d))) * 10) / 10;
      sp.picked[id] = nv; spRefresh(); break; }
    case 'spAddApp': { const cfg = cfgCopy(); const n = addStarterMeals(cfg, targets().kcal); if (!n) break; document.getElementById('sheetRoot').innerHTML = ''; saveConfig(cfg); toast(`${n} meal${n > 1 ? 's' : ''} added to your meal plan`); break; }
    case 'openStarters': { S.sp = null; openStarterSheet(); break; }
    case 'ob-grow': { S.ob.d[isSoftId(S.ob.d.theme) ? 'growSoft' : 'grow'] = b.dataset.v; openOnboarding(); break; }
    case 'redoSetup': { const pr = S.config?.profile || {}; S.ob = { step: 1, d: { redo: true, sex: pr.sex || 'female', age: pr.age, height: pr.height, weight: weightList().slice(-1)[0]?.kg || pr.weight, name: pr.name, activity: pr.activity || 'light', goal: pr.goal || 'recomp', theme: S.config?.theme || 'auto', flower: flowerType(), grow: S.config?.grow, growSoft: S.config?.growSoft, garden: gardenOn(), bonsai: S.config?.bonsai, car: S.config?.car || S.config?.carSoft } }; openOnboarding(); break; }
    case 'changePw': changePassword(); break;
    case 'openScanner': openScanner(); break;
    case 'closeScanner': closeScanner(); break;
    case 'scanLookup': lookupBarcode(document.getElementById('sc_code')?.value); break;
    case 'scanGrams': S.scan.grams = +b.dataset.v; render(); break;
    case 'openMeal': openMeal(b.dataset.k); break;
    case 'pushOn': enablePush(); break;
    case 'pushOff': disablePush(); break;
    case 'pushTest': schedulePush(5, 'Test notification', 'Rest-timer notifications are working.').then(id => toast(id ? 'Test on its way. Lock your phone or switch apps now.' : 'Couldn\'t schedule the test. Check you\'re online.')); break;
    case 'testBeep': beep(+(document.getElementById('tv_vol')?.value ?? timerVol())); break;
    case 'timerBeeps': { const cfg = cfgCopy(); cfg.timerBeeps = +b.dataset.v; saveConfig(cfg); openSettings(); beep(timerVol(), +b.dataset.v); break; }
    case 'editMeal': editMeal(b.dataset.k); break;
    case 'cancelEditMeal': S.build = null; S.cf = null; S.foodAdd = 'plan'; render(); break;
    case 'buildScan': buildState().mode = 'scan'; S.scan = { code: '', status: 'idle', product: null }; render(); openScanner(); break;
    case 'buildMode': { const bs = buildState(); bs.mode = b.dataset.v || null; S.search.pick = null; if (!bs.mode) S.scan = { code: '', status: 'idle', product: null }; render(); if (bs.mode === 'search') setTimeout(() => document.getElementById('fs_q')?.focus(), 50); break; }
    case 'buildDel': { const bs = buildState(); bs.items.splice(+b.dataset.i, 1); if (bs.items.length) applyBuildTotals(); render(); break; }
    case 'buildAdd': {
      const p = S.scan.product; if (!p) break;
      const g = numOrNull(document.getElementById('sc_g')?.value) || S.scan.grams || 100; const k = g / 100;
      const nm = `${p.name}${p.brand ? ' (' + p.brand + ')' : ''}`; let nut = null;
      if (p.nut) { nut = {}; for (const [kk, vv] of Object.entries(p.nut)) nut[kk] = vv * k; }
      buildAddItem(itemCalc({ name: nm, g: r0(g), per: { kcal: p.kcal, p: p.p, c: p.c, f: p.f, nut: p.nut || null } })); break;
    }
    case 'buildAddTa': {
      const t = S.search.pick; if (!t?.ta) break; const q = S.search.qty || 1; const nm = `${t.name} (${t.brand})`;
      buildAddItem(itemCalc({ name: nm, q, each: { kcal: t.kcal, p: t.p, c: t.c, f: t.f } })); break;
    }
    case 'closeMethods': if (S.methodsFromSettings) openSettings(); else document.getElementById('sheetRoot').innerHTML = ''; break;
    case 'openMethods': S.methodsFromSettings = !!b.closest('#settingsForm'); openMethods(); break;
    case 'quickAdd': { const it = quickItem(b.dataset.k); if (it) logItem(it, b.dataset.s); break; }
    case 'favToggle': {
      const k = b.dataset.k; const it = k.startsWith('L:') ? (S.days[S.date]?.meals || []).find(m => m.id === k.slice(2)) : quickItem(k);
      if (it) toggleFav(it); if (b.dataset.reopen) openMeal(b.dataset.reopen); break;
    }
    case 'quickHide': { const cfg = cfgCopy(); cfg.quickHidden = b.dataset.v === '1'; saveConfig(cfg); break; }
    case 'fitsHide': { const cfg = cfgCopy(); cfg.fitsHidden = b.dataset.v === '1'; saveConfig(cfg); break; }
    case 'openPlanner': openPlanner(); break;
    case 'planWeek': S.planWeek = +b.dataset.v; openPlanner(); break;
    case 'planCount': { const ws = planWs(); savePlanCounts(ws, c => { c[b.dataset.k] = Math.max(0, Math.min(21, (c[b.dataset.k] || 0) + Number(b.dataset.d))); });
      if (S.config?.planSpread?.[ws]) spreadPlan(ws); render(); openPlanner(); break; }
    case 'planSpread': spreadPlan(planWs()); render(); openPlanner(); toast('Meals spread across the week'); break;
    case 'planUnspread': { const ws = planWs(); savePlan(wp => { for (let i = 0; i < 7; i++) delete wp[addDays(ws, i)]; }); const cfg = cfgCopy(); if (cfg.planSpread) delete cfg.planSpread[ws]; S.config = cfg; store.set('config', 'settings', cfg); render(); openPlanner(); break; }
    case 'grocHave': saveGrocery(gr => { gr.have = gr.have || {}; if (gr.have[b.dataset.k]) delete gr.have[b.dataset.k]; else gr.have[b.dataset.k] = true; }); break;
    case 'grocShare': {
      const text = groceryText(planWs());
      try { if (navigator.share) { await navigator.share({ title: 'Shopping list', text }); break; } } catch (err) { if (err?.name === 'AbortError') break; }
      try { await navigator.clipboard.writeText(text); toast('List copied. Paste it into Messages or Notes.'); } catch { toast('Couldn\'t share the list on this device.'); }
      break;
    }
    case 'planDel': savePlan(wp => { const a = wp[b.dataset.d]?.[b.dataset.s]; if (a) a.splice(+b.dataset.i, 1); }); render(); openPlanner(); break;
    case 'planCopy': { const ws = planWs(); const prev = weekCounts(addDays(ws, -7)); if (!Object.keys(prev).length) { toast('Nothing was planned the week before'); break; }
      savePlanCounts(ws, c => { for (const k of Object.keys(c)) delete c[k]; Object.assign(c, prev); }); if (S.config?.planSpread?.[ws]) spreadPlan(ws); render(); openPlanner(); toast('Copied last week'); break; }
    case 'planClear': { const ws = addDays(weekStart(todayISO()), (S.planWeek || 0) * 7); savePlan(wp => { for (let i = 0; i < 7; i++) delete wp[addDays(ws, i)]; }); render(); openPlanner(); break; }
    case 'planGroc': S.grocWeek = S.planWeek || 0; saveGrocery(gr => { gr.mode = 'plan'; }); break;
    case 'grocMode': saveGrocery(gr => { gr.mode = b.dataset.v; }); break;
    case 'grocWeek': S.grocWeek = +b.dataset.v; openGrocery(); break;
    case 'mealIngEdit': openMeal(b.dataset.k, true); break;
    case 'mealIngSave': {
      const id = b.dataset.k.slice(2); const lines = (document.getElementById('meal_ing')?.value || '').split('\n').map(x => x.trim()).filter(Boolean);
      const cfg = cfgCopy(); cfg.foods = (cfg.foods || []).map(f => f.id === id ? { ...f, ing: lines } : f); saveConfig(cfg); openMeal(b.dataset.k); toast('Ingredients saved'); break;
    }
    case 'searchGo': searchOFF(document.getElementById('fs_q')?.value || S.search.q); break;
    case 'searchChain': { S.search.q = b.dataset.v; S.search.status = 'idle'; const inp = document.getElementById('fs_q'); if (inp) inp.value = b.dataset.v; renderSearch(); break; }
    case 'taQty': S.search.qty = Math.max(0.5, Math.min(10, (S.search.qty || 1) + Number(b.dataset.d))); render(); break;
    case 'taAdd': {
      const t = S.search.pick; if (!t?.ta) break; const q = S.search.qty || 1;
      const day = localDay(S.date); day.meals.push({ id: uid(), name: `${t.name} (${t.brand})`, slot: document.getElementById('sc_slot')?.value || guessSlot(), servings: q, kcal: t.kcal, p: t.p, c: t.c, f: t.f, takeaway: true });
      saveDay(S.date, day); S.search.pick = null; S.search.qty = 1; render(); toast(`Added ${t.name}`); break;
    }
    case 'searchPick': {
      if (b.dataset.src === 'ta') { const t = searchTakeaway(S.search.q)[+b.dataset.i]; if (!t) break; S.search.pick = { ...t, ta: true }; S.search.qty = 1; render(); break; }
      const f = b.dataset.src === 'common' ? searchCommon(S.search.q)[+b.dataset.i] : S.search.off[+b.dataset.i]; if (!f) break;
      const prod = { ...f, nut: f.nut || (f.key ? nutFromKey(f.key) : null) };
      S.search.pick = prod; S.scan = { code: f.code || '', status: 'found', product: prod, grams: f.serving || 100, from: 'search' }; render(); break;
    }
    case 'searchBack': S.search.pick = null; render(); break;
    case 'drinkOpt': {
      const d = drinkState(); const k = b.dataset.k; const num = ['sugar', 'shots', 'item', 'opt'].includes(k);
      d[k] = num ? +b.dataset.v : b.dataset.v; if (k === 'item' || k === 'cat') d.opt = 0;
      lsSet('rl:drink', d); render(); break;
    }
    case 'drinkAdd': { const x = drinkCalc(); if (x) addDrinkToLog(x); break; }
    case 'drinkRecent': { const m = recentDrinks()[+b.dataset.i]; if (m) addDrinkToLog(m); break; }
    case 'stepsAdd': {
      const inp = document.getElementById('st_add'); const n = Math.round(+(b.dataset.v || inp?.value || 0)); if (!(n > 0)) { toast('Type how many steps to add'); break; }
      const day = localDay(S.date); day.steps = (day.steps || 0) + n; const now = new Date();
      day.stepLog = [...(day.stepLog || []), { n, t: now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) }]; saveDay(S.date, day); toast(`+${n.toLocaleString()} steps`); break;
    }
    case 'stepsUndo': {
      const day = localDay(S.date); const last = (day.stepLog || []).pop(); if (!last) break;
      day.steps = Math.max(0, (day.steps || 0) - last.n); saveDay(S.date, day); toast('Removed the last steps you added'); break;
    }
    case 'scanAdd': {
      const p = S.scan.product; if (!p) break;
      const g = numOrNull(document.getElementById('sc_g')?.value) || S.scan.grams || 100; const k = g / 100;
      const item = { name: `${p.name}${p.brand ? ' (' + p.brand + ')' : ''}, ${r0(g)} g`, kcal: r0(p.kcal * k), p: r1(p.p * k), c: r1(p.c * k), f: r1(p.f * k), slot: document.getElementById('sc_slot')?.value || guessSlot() };
      if (p.nut) { item.nut = {}; for (const [kk, vv] of Object.entries(p.nut)) item.nut[kk] = Math.round(vv * k * 100) / 100; }
      const day = localDay(S.date); day.meals.push({ id: uid(), servings: 1, barcode: S.scan.code, ...item }); saveDay(S.date, day);
      if (document.getElementById('sc_save')?.checked) { const cfg = cfgCopy(); cfg.foods = [...(cfg.foods || []), { id: uid(), barcode: S.scan.code, ...item }]; saveConfig(cfg); }
      const fromSearch = S.scan.from === 'search';
      S.scan = { code: '', status: 'idle', product: null }; S.foodAdd = fromSearch ? 'search' : 'plan'; S.search.pick = null; render(); toast(`Added ${p.name}`); break;
    }
    case 'openGrocery': openGrocery(); break;
    case 'closeSheet': document.getElementById('sheetRoot').innerHTML = ''; if (pendingRender) { pendingRender = false; render(); } break;
    case 'grocCount': saveGrocery(gr => { const n = Math.max(0, Math.min(14, (gr.counts[b.dataset.k] || 0) + Number(b.dataset.d))); if (n) gr.counts[b.dataset.k] = n; else delete gr.counts[b.dataset.k]; }); break;
    case 'grocAddExtra': { const t = document.getElementById('groc_extra')?.value.trim(); if (!t) break; saveGrocery(gr => gr.extra.push({ id: uid(), text: t })); break; }
    case 'grocDelExtra': saveGrocery(gr => { gr.extra = gr.extra.filter(x => x.id !== b.dataset.v); delete gr.checked['e:' + b.dataset.v]; }); break;
    case 'grocUntick': saveGrocery(gr => { gr.checked = {}; }); break;
    case 'grocReset': saveGrocery(gr => { gr.counts = {}; gr.checked = {}; gr.extra = []; }); break;
    case 'closeCelebrate': { const r = document.getElementById('celebrateRoot'); r.hidden = true; r.innerHTML = ''; break; }
    case 'weekNav': S.weekOff = Math.max(0, (S.weekOff || 0) + Number(b.dataset.d)); render(); break;
    case 'measure': S.measure = b.dataset.v; render(); break;
    case 'openNutrients': openNutrients(); break;
    case 'suppHide': { const cfg = cfgCopy(); cfg.suppHidden = b.dataset.v === '1'; saveConfig(cfg); break; }
    case 'waterHide': { const cfg = cfgCopy(); cfg.water = { ...(cfg.water || {}), hidden: b.dataset.v === '1' }; saveConfig(cfg); break; }
    case 'water': {
      const day = localDay(S.date); const before = day.water || 0; const g = waterGoal();
      day.water = Math.max(0, before + Number(b.dataset.d)); saveDay(S.date, day);
      if (before < g && day.water >= g) toast('Water goal hit. Nice!'); break;
    }
    case 'stanleyColour': { const cfg = cfgCopy(); cfg.water = { ...(cfg.water || {}), colour: b.dataset.v }; saveConfig(cfg); openSettings(); break; }
    case 'suppTick': {
      const day = localDay(S.date); const set = new Set(day.supps || []);
      if (set.has(b.dataset.v)) set.delete(b.dataset.v); else set.add(b.dataset.v);
      day.supps = [...set]; saveDay(S.date, day); break;
    }
    case 'suppAdd': case 'suppQuick': {
      const name = a === 'suppQuick' ? b.dataset.v : document.getElementById('supp_new')?.value.trim(); if (!name) break;
      const cfg = cfgCopy(); cfg.supps = [...(cfg.supps || []), { id: uid(), name }]; saveConfig(cfg); openSettings(); break;
    }
    case 'suppDel': { const cfg = cfgCopy(); cfg.supps = (cfg.supps || []).filter(x => x.id !== b.dataset.v); saveConfig(cfg); openSettings(); break; }
    case 'closeSettings': S.confirmSignOut = false; document.getElementById('sheetRoot').innerHTML = ''; if (pendingRender) { pendingRender = false; render(); } break;
    case 'pgDel': { const card = b.closest('.dayedit'); b.closest('.progrow').remove(); refreshDaySum(card); break; }
    case 'pgAdd': {
      const box = b.closest('.dayedit').querySelector('.dayexs'); const tmp = document.createElement('div'); tmp.innerHTML = exRow({}, 'n' + Date.now());
      const row = tmp.firstElementChild; box.append(row); row.querySelector('input').focus(); refreshDaySum(b.closest('.dayedit')); break;
    }
    case 'pgAddDay': { const box = document.getElementById('splitDays'); const tmp = document.createElement('div'); tmp.innerHTML = dayEditor({ name: '', wd: [] }, [], box.children.length, true); box.append(tmp.firstElementChild); box.lastElementChild.querySelector('.dayname').focus(); break; }
    case 'pgDelDay': b.closest('.dayedit').remove(); break;
    case 'wdToggle': b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); refreshDaySum(b.closest('.dayedit')); break;
    case 'pgStarter': {
      const box = document.getElementById('splitDays');
      box.innerHTML = starterSplit().map((sd, di) => dayEditor(sd, DEFAULT_PROGRAM[sd.name].map(([name, sets, min, max]) => ({ name, sets, min, max })), di)).join('');
      const se = document.getElementById('splitEditor'); if (se) se.open = true;
      toast('Starter split loaded. Tap Save to keep it.'); break;
    }
    case 'pgClear': { document.getElementById('splitDays').innerHTML = ''; toast('Split cleared. Add your own days, then tap Save.'); break; }
    case 'openSplit': S.splitOpen = true; openSettings(); S.splitOpen = false; setTimeout(() => document.getElementById('splitEditor')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 80); break;
  }
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.closest?.('#customForm') && el.id && el.id.startsWith('cf_') && el.id !== 'cf_serves') { S.cf = S.cf || {}; S.cf[el.id] = el.type === 'checkbox' ? el.checked : el.value; }
  if (el.classList?.contains('dayname') || (el.dataset?.k === 'name' && el.closest('.dayedit'))) refreshDaySum(el.closest('.dayedit'));
  if (el.id === 't_kcal') { const w = document.getElementById('t_warn'); if (w) w.innerHTML = lowKcalWarn(el.value); return; }
  if (el.id === 'tv_vol') { const sh = document.getElementById('tv_show'); if (sh) sh.textContent = el.value + '%'; return; }
  if (el.dataset.bi != null) {
    const bs = buildState(); const it = bs.items[+el.dataset.bi]; if (!it) return; const v = Math.max(0, +el.value || 0);
    if (it.per) it.g = v; else if (it.each) it.q = v; itemCalc(it); applyBuildTotals();
    const row = document.getElementById('bk_' + el.dataset.bi); if (row) row.textContent = `${r0(it.kcal)} kcal · P ${r0(it.p)} · C ${r0(it.c)} · F ${r0(it.f)}`;
    ['cf_kcal', 'cf_p', 'cf_c', 'cf_f'].forEach(id => { const x = document.getElementById(id); if (x) x.value = S.cf[id]; });
    const tot = document.querySelector('.build-total'); if (tot) { const t = buildTotals(); tot.innerHTML = `<span>${bs.serves > 1 ? `Per serve (÷ ${bs.serves})` : 'Meal total'}</span><b>${r0(t.kcal)} kcal</b><span class="muted">P ${r0(t.p)} · C ${r0(t.c)} · F ${r0(t.f)}</span>`; }
    return;
  }
  if (el.id === 'cf_serves') { const bs = buildState(); bs.serves = Math.max(1, Math.min(20, Math.round(+el.value) || 1)); applyBuildTotals(); ['cf_kcal', 'cf_p', 'cf_c', 'cf_f'].forEach(id => { const x = document.getElementById(id); if (x) x.value = S.cf[id]; }); const tot = document.querySelector('.build-total'); if (tot) { const t = buildTotals(); tot.innerHTML = `<span>${bs.serves > 1 ? `Per serve (÷ ${bs.serves})` : 'Meal total'}</span><b>${r0(t.kcal)} kcal</b><span class="muted">P ${r0(t.p)} · C ${r0(t.c)} · F ${r0(t.f)}</span>`; } return; }
  if (el.id === 'fs_q') { S.search.q = el.value; if (S.search.status !== 'loading') S.search.status = 'idle'; renderSearch(); return; }
  if (el.id === 'sc_g' && S.scan.product) {
    const p = S.scan.product; const k = (numOrNull(el.value) || 0) / 100; S.scan.grams = numOrNull(el.value) || 0;
    const m = document.getElementById('sc_macros'); if (m) m.innerHTML = `<span class="chip k">${r0(p.kcal * k)} kcal</span><span class="chip p">P ${r0(p.p * k)}</span><span class="chip c">C ${r0(p.c * k)}</span><span class="chip f">F ${r0(p.f * k)}</span>`;
    return;
  }
  if (el.id === 'ob_kcal') { const sh = document.getElementById('ob_kcal_show'); if (sh) sh.textContent = (+el.value || 0).toLocaleString(); }
  if (el.dataset.f && S.tab === 'train' && el.closest('#view')) {
    const d = getDraft();
    if (el.dataset.f === 'note') { d.note = el.value; persistDraft(); return; }
    if (el.dataset.f === 'title') { d.title = el.value; persistDraft(); return; }
    const ex = d.exercises[el.dataset.e];
    if (el.dataset.f === 'name') { ex.name = el.value; persistDraft(); return; }
    const r = ex.rows[el.dataset.r];
    if (el.dataset.f === 'kg') r.kg = el.value; else if (el.dataset.f === 'reps') r.reps = el.value; else if (el.dataset.f === 'partials') r.partials = el.value;
    else if (r.drop) { if (el.dataset.f === 'dkg') r.drop.kg = el.value; else if (el.dataset.f === 'dreps') r.drop.reps = el.value; else if (el.dataset.f === 'dpartials') r.drop.partials = el.value; }
    persistDraft();
  }
});
document.addEventListener('toggle', e => { if (e.target.classList?.contains('steps-more')) S.stepsMore = e.target.open; }, true);
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'restoreFile' && el.files[0]) {
    restoreBackup(el.files[0]).then(n => { toast(`Restored ${n} records`); document.getElementById('sheetRoot').innerHTML = ''; render(); })
      .catch(err => { console.error(err); toast('That file isn\'t a Refyne backup.'); });
    return;
  }
  if (el.closest?.('#customForm') && (el.id === 'cf_slot' || el.id === 'cf_save')) { S.cf = S.cf || {}; S.cf[el.id] = el.type === 'checkbox' ? el.checked : el.value; }
  if (el.id === 'customPick' && el.value) {
    const [dn, name] = el.value.split('|'); const spec = (program()[dn] || []).find(x => x.name === name) || { sets: 3, min: 8, max: 12 };
    const last = lastFor(name, S.date); const rows = [];
    for (let i = 0; i < spec.sets; i++) { const ls = last?.sets[i] || last?.sets[last.sets.length - 1]; rows.push({ kg: ls ? ls.kg : '', reps: '', partials: '', drop: null, ph: ls ? ls.reps : '' }); }
    getDraft().exercises.push({ name, sets: spec.sets, min: spec.min, max: spec.max, rows }); persistDraft(); render(); toast(`Added ${name}`); return;
  }
  if (el.id === 'tv_vol') { const cfg = cfgCopy(); cfg.timerVol = +el.value; saveConfig(cfg); beep(+el.value); return; }
  if (el.dataset.planD) {
    const key = el.value; if (!key) return; const d = el.dataset.planD, sl = el.dataset.planS;
    savePlan(wp => { wp[d] = wp[d] || {}; wp[d][sl] = [...(wp[d][sl] || []), key]; }); render(); openPlanner(); return;
  }
  if (el.dataset.groc) { const k = el.dataset.groc; const on = el.checked; saveGrocery(gr => { if (on) gr.checked[k] = true; else delete gr.checked[k]; }); return; }
  if (el.id === 'exPick') { S.progressEx = el.value; render(); }
  else if (el.id === 'cmpA') { S.compare.a = el.value; render(); }
  else if (el.id === 'cmpB') { S.compare.b = el.value; render(); }
  else if (el.id === 'cmpPose') { S.compare.pose = el.value; render(); }
  else if (el.dataset.f === 'name' && S.tab === 'train') { pendingRender = false; render(); }
  else if (el.id === 'wt_goal' || el.id === 'wt_bottle') {
    const n = Math.round(+el.value); const k = el.id === 'wt_goal' ? 'goal' : 'bottle';
    if (!(n >= 100 && n <= 8000)) { toast('Enter a number in ml'); return; }
    const cfg = cfgCopy(); cfg.water = { ...(cfg.water || {}), [k]: n }; saveConfig(cfg); toast(k === 'goal' ? 'Water goal saved' : 'Bottle size saved');
  }
  else if (el.id === 'steps') {
    const day = localDay(S.date); const v = numOrNull(el.value); if (day.steps === v) return; day.steps = v; day.stepLog = []; saveDay(S.date, day); toast('Step total saved');
  }
  else if (el.id === 'st_goal') {
    const v = Math.round(+el.value); if (!(v >= 1000)) return; const cfg = cfgCopy(); cfg.stepGoal = v; saveConfig(cfg); toast('Step goal saved');
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'fs_q') { e.preventDefault(); e.target.blur(); searchOFF(e.target.value); return; } if (e.key === 'Enter' && e.target.id === 'st_add') { e.preventDefault(); document.querySelector('[data-act=stepsAdd]:not([data-v])')?.click(); return; } if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('meal-open')) { e.preventDefault(); openMeal(e.target.dataset.k); return; } if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('tapcard')) { e.preventDefault(); openNutrients(); return; } if (e.key === 'Enter' && e.target.id === 'sc_code') { e.preventDefault(); lookupBarcode(e.target.value); } if (e.key === 'Escape' && !document.getElementById('scanRoot').hidden) closeScanner(); });
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target; const v = id => document.getElementById(id)?.value;
  if (f.id === 'customForm') {
    const item = { name: v('cf_name').trim(), kcal: +v('cf_kcal') || 0, p: +v('cf_p') || 0, c: +v('cf_c') || 0, f: +v('cf_f') || 0, slot: v('cf_slot') };
    const b = buildState(); const bt = b.items.length ? buildTotals() : null;
    const ing = [...b.items.filter(x => !x.fixed).map(x => x.line), ...(v('cf_ing') || '').split('\n').map(x => x.trim()).filter(Boolean)];
    if (b.items.length && b.serves > 1) ing.unshift(`Whole recipe (${b.serves} serves):`);
    if (bt?.nut) item.nut = bt.nut;
    if (!item.name) return;
    const extra = { ...(ing.length ? { ing } : {}), ...(b.items.length ? { items: JSON.parse(JSON.stringify(b.items)), serves: b.serves } : {}) };
    const editId = b.editId, fromRecipe = b.fromRecipe; const logToo = editId || fromRecipe ? !!document.getElementById('cf_logtoo')?.checked : true;
    S.build = null; S.cf = null;
    if (editId || fromRecipe) {
      const cfg = cfgCopy(); cfg.foods = cfg.foods || [];
      if (editId) cfg.foods = cfg.foods.map(x => x.id === editId ? { id: x.id, ...item, ...extra, ...(x.method ? { method: x.method } : {}) } : x);
      else { cfg.foods.push({ id: uid(), ...item, ...extra }); cfg.hiddenRecipes = [...new Set([...(cfg.hiddenRecipes || []), fromRecipe])]; }
      saveConfig(cfg);
      if (logToo) { const day = localDay(S.date); day.meals.push({ id: uid(), servings: 1, ...item, ...(ing.length ? { ing } : {}) }); saveDay(S.date, day); }
      S.foodAdd = 'plan'; render(); toast(editId ? `${item.name} updated` : `${item.name} saved to your meals`); return;
    }
    const day = localDay(S.date); day.meals.push({ id: uid(), servings: 1, ...item, ...(ing.length ? { ing } : {}) }); saveDay(S.date, day);
    if (document.getElementById('cf_save')?.checked) {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); cfg.foods = [...(cfg.foods || []), { id: uid(), ...item, ...extra }]; saveConfig(cfg);
    }
    toast(`Added ${item.name}`);
  } else if (f.id === 'cardioForm') {
    const day = localDay(S.date); day.cardio = day.cardio || [];
    day.cardio.push({ id: uid(), type: v('cd_type'), minutes: numOrNull(v('cd_min')), note: (v('cd_note') || '').trim() }); saveDay(S.date, day);
  } else if (f.id === 'weightForm') {
    const date = v('w_date') || todayISO();
    const doc = { date, kg: numOrNull(v('w_kg')), waist: numOrNull(v('w_waist')) };
    for (const k of ['arms', 'chest', 'hips', 'thighs']) { const x = numOrNull(v('w_' + k)); if (x) doc[k] = x; }
    if (!doc.kg && !doc.waist && !['arms', 'chest', 'hips', 'thighs'].some(k => doc[k])) { toast('Enter your weight or at least one measurement.'); return; }
    store.set('weights', date, doc); render(); toast('Saved');
  } else if (f.id === 'photoForm') {
    const file = document.getElementById('ph_file').files[0]; if (!file || !canUpload()) return;
    const pose = v('ph_pose'), date = v('ph_date') || todayISO();
    S.uploading = true; render();
    try {
      const blob = await shrink(file);
      const id = uid(); const path = `${S.user.id}/${id}.jpg`;
      const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      store.set('photos', id, { date, pose, path });
      refreshPhotoUrls();
      toast(`${pose} photo added`);
    } catch (err) {
      console.error(err);
      toast(err?.message?.startsWith('That file') ? err.message : /exceed|size/i.test(err?.message || '') ? 'That photo is too large even after shrinking.' : 'Upload failed. Check your signal and try again.');
    } finally { S.uploading = false; render(); }
  } else if (f.id === 'settingsForm') {
    const cfg = JSON.parse(JSON.stringify(S.config || {}));
    cfg.targets = { kcal: +v('t_kcal') || DEFAULT_TARGETS.kcal, p: +v('t_p') || 0, c: +v('t_c') || 0, f: +v('t_f') || 0 };
    const sp = readSplitFromSheet(); cfg.split = sp.split; cfg.program = sp.program; S.trainDay = null; S.splitClash = sp.clash;
    document.getElementById('sheetRoot').innerHTML = '';
    S.drafts = {}; saveConfig(cfg); toast(S.splitClash?.length ? `Saved. Each weekday can only open one day, so ${S.splitClash.join('; ')}.` : 'Targets and split saved'); S.splitClash = null;
  }
});

boot();
})();
