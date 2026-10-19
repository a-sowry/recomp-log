(() => {
'use strict';

/* ---------- static data ---------- */
const DEFAULT_TARGETS = { kcal: 2250, p: 150, c: 265, f: 65 };
const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const RECIPES = [
  { id: 'B1', slot: 'Breakfast', name: 'TikTok protein pancake bowl', kcal: 566, p: 39, c: 69, f: 13 },
  { id: 'B2', slot: 'Breakfast', name: 'Overnight protein oats', kcal: 572, p: 48, c: 62, f: 12 },
  { id: 'B3', slot: 'Breakfast', name: 'Viral French toast', kcal: 561, p: 39, c: 79, f: 8 },
  { id: 'B4', slot: 'Breakfast', name: 'Cottage cheese omelette on sourdough', kcal: 604, p: 44, c: 66, f: 16 },
  { id: 'L1', slot: 'Lunch', name: 'Chicken burrito bowl', kcal: 662, p: 51, c: 73, f: 17 },
  { id: 'L2', slot: 'Lunch', name: 'Bang bang chicken bowl', kcal: 666, p: 47, c: 73, f: 19 },
  { id: 'L3', slot: 'Lunch', name: 'One-pot lemon chicken orzo', kcal: 642, p: 53, c: 74, f: 14 },
  { id: 'L4', slot: 'Lunch', name: 'Turkey pasta bake', kcal: 672, p: 52, c: 68, f: 18 },
  { id: 'D1', slot: 'Dinner', name: 'Takeout-style beef and broccoli', kcal: 679, p: 46, c: 82, f: 17 },
  { id: 'D2', slot: 'Dinner', name: 'Emily Mariko salmon rice bowl', kcal: 671, p: 41, c: 57, f: 30 },
  { id: 'D3', slot: 'Dinner', name: 'Turkey tacos', kcal: 695, p: 52, c: 62, f: 23 },
  { id: 'D4', slot: 'Dinner', name: 'Sweet potato and chicken thigh tray bake', kcal: 649, p: 50, c: 62, f: 20 },
  { id: 'S1', slot: 'Snack', name: 'Cottage cheese cookie dough', kcal: 369, p: 28, c: 45, f: 8 },
  { id: 'S2', slot: 'Snack', name: 'Anabolic ice cream', kcal: 376, p: 33, c: 41, f: 8 },
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
  foodAdd: 'plan', progressEx: null, compare: { a: null, b: null, pose: 'Front' },
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
const THEMES = [
  { id: 'auto', name: 'Chalk (follows phone)' },
  { id: 'chalk', name: 'Chalk', bg: '#F1F1EC', surface: '#FFFFFF', sunk: '#E7E8E2', line: '#D6D8D1' },
  { id: 'white', name: 'White', bg: '#FFFFFF', surface: '#F6F6F4', sunk: '#ECECE9', line: '#DCDCD7' },
  { id: 'sand', name: 'Sand', bg: '#F3EBDD', surface: '#FFFBF3', sunk: '#E8DDC9', line: '#D9CBB2' },
  { id: 'mint', name: 'Mint', bg: '#E4EFE8', surface: '#FAFDFB', sunk: '#D5E5DA', line: '#C1D6C8' },
  { id: 'sky', name: 'Sky', bg: '#E3ECF6', surface: '#FAFCFF', sunk: '#D3E0EE', line: '#BFD0E3' },
  { id: 'blush', name: 'Blush', bg: '#F6E5E3', surface: '#FFFAF9', sunk: '#ECD4D1', line: '#DEC1BD' },
  { id: 'pink', name: 'Pink', bg: '#FCDDEA', surface: '#FFF4F8', sunk: '#F7C9DC', line: '#EFB2CB', ink: '#3D1830', muted: '#8A4A6E', btn: '#C2306F', 'btn-ink': '#FFFFFF', blue: '#7B4FD0' },
  { id: 'night', name: 'Night', dark: true, bg: '#11151A', surface: '#1A2027', sunk: '#232A33', line: '#2E3640' },
  { id: 'navy', name: 'Navy', dark: true, bg: '#0E1A2B', surface: '#162437', sunk: '#1F2F46', line: '#2A3D56' },
  { id: 'black', name: 'Black', dark: true, bg: '#000000', surface: '#121212', sunk: '#1C1C1C', line: '#2A2A2A' },
];
let appliedTheme = null;
function applyTheme(id) {
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  if (appliedTheme === t.id) return;
  appliedTheme = t.id; lsSet('rl:theme', t.id);
  const root = document.documentElement;
  for (const k of ['bg', 'surface', 'sunk', 'line', 'ink', 'muted', 'btn', 'btn-ink', 'blue']) {
    if (t[k]) root.style.setProperty('--' + k, t[k]); else root.style.removeProperty('--' + k);
  }
  if (t.id === 'auto') delete root.dataset.theme; else root.dataset.theme = t.dark ? 'dark' : 'light';
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    if (t.bg) m.setAttribute('content', t.bg);
    else m.setAttribute('content', m.media && m.media.includes('dark') ? '#11151A' : '#F1F1EC');
  });
}
applyTheme(lsGet('rl:theme') || 'auto');

function targets() { return Object.assign({}, DEFAULT_TARGETS, S.config?.targets || {}); }
function program() {
  const p = S.config?.program;
  const out = {};
  for (const d of DAYS) out[d] = (p && p[d] ? p[d] : DEFAULT_PROGRAM[d].map(([name, sets, min, max]) => ({ name, sets, min, max })));
  return out;
}
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
    <div class="brand big"><span class="plate" aria-hidden="true"></span>Recomp Log</div>
    <p>Connect your Supabase project. You only do this once on each device.</p>
    ${msg ? `<p class="gate-err">${esc(msg)}</p>` : ''}
    <label class="f">Project URL<input type="text" id="su_url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://abcd1234.supabase.co" required></label>
    <label class="f">Anon public key<input type="text" id="su_key" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="eyJhbGciOi…" required></label>
    <button class="btn" type="submit">Connect</button>
    <p class="small muted">Find both in Supabase under Project Settings → API.</p>
  </form>`);
}
function showLogin(msg, email) {
  const last = lsGet('rl:lastUser');
  showGate(`<form class="gatebox" id="loginForm">
    <div class="brand big"><span class="plate" aria-hidden="true"></span>Recomp Log</div>
    <p>Sign in with the login you created in Supabase.</p>
    ${msg ? `<p class="gate-err">${esc(msg)}</p>` : ''}
    <label class="f">Email<input type="email" id="li_email" autocomplete="username" autocapitalize="off" value="${esc(email || last?.email || '')}" required></label>
    <label class="f">Password<input type="password" id="li_pw" autocomplete="current-password" required></label>
    <button class="btn" type="submit" id="li_btn">Sign in</button>
    <button class="linkbtn small" type="button" data-act="resetConn">Use a different Supabase project</button>
  </form>`);
}

async function boot() {
  updateOnline();
  const conf = sbConf();
  if (!conf) { showSetup(); return; }
  if (!window.supabase?.createClient) { showSetup('The app files did not load completely. Close and reopen the app.'); return; }
  sb = window.supabase.createClient(conf.url, conf.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'rl-auth', detectSessionInUrl: false } });
  let session = null;
  try { ({ data: { session } } = await sb.auth.getSession()); } catch (e) { console.error(e); }
  if (session) { startApp(session.user); }
  else if (!navigator.onLine && lsGet('rl:lastUser')) { S.offlineAuth = true; startApp(lsGet('rl:lastUser')); }
  else { showLogin(); }
  sb.auth.onAuthStateChange((ev, sess) => {
    if (ev === 'SIGNED_OUT') { S.user = null; showLogin(); }
    else if ((ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED') && sess && S.offlineAuth) { S.offlineAuth = false; store.flush().then(() => store.pull()); }
  });
}
function startApp(user) {
  S.user = { id: user.id, email: user.email };
  lsSet('rl:lastUser', S.user);
  hideGate(); store.loadLocal(); render(); updateSync();
  store.flush().then(() => store.pull());
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
  } else if (e.target.id === 'loginForm') {
    const btn = document.getElementById('li_btn'); btn.disabled = true; btn.textContent = 'Signing in…';
    const email = document.getElementById('li_email').value.trim();
    let data, error;
    try { ({ data, error } = await sb.auth.signInWithPassword({ email, password: document.getElementById('li_pw').value })); }
    catch (err) { error = { message: navigator.onLine ? 'Could not reach Supabase. Try again.' : 'You\'re offline. Connect to sign in.' }; }
    if (error) { showLogin(error.message === 'Invalid login credentials' ? 'That email and password don\'t match. Check them and try again.' : error.message, email); setTimeout(() => document.getElementById('li_pw')?.focus(), 0); return; }
    S.offlineAuth = false; startApp(data.user);
  }
});
gate.addEventListener('click', e => {
  if (e.target.closest('[data-act="resetConn"]')) { lsSet('rl:sbUrl', null); lsSet('rl:sbKey', null); location.reload(); }
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
  const name = `recomp-log-backup-${todayISO()}.json`;
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
  applyTheme(S.config?.theme || lsGet('rl:theme') || 'auto');
  const banner = S.syncError ? `<div class="banner">Some changes haven't reached your Supabase database yet (${esc(S.syncError)}). They're kept on this phone and retry automatically.</div>` : '';
  const html = { today: viewToday, train: viewTrain, progress: viewProgress, body: viewBody, photos: viewPhotos }[S.tab]();
  view.innerHTML = banner + html;
  if (S.tab === 'train') tickTimer();
  updateSync();
  const names = new Set(); for (const s of Object.values(S.sessions)) for (const e of s.exercises || []) names.add(e.name);
  for (const d of Object.values(program())) for (const e of d) names.add(e.name);
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
function viewToday() {
  const T = targets(); const day = S.days[S.date]; const t = dayTotals(day);
  const left = T.kcal - t.kcal; const pLeft = T.p - t.p;
  const meals = day?.meals || [];
  let log = '';
  if (!meals.length) {
    log = `<div class="empty"><b>Nothing logged for ${S.date === todayISO() ? 'today' : fmtDay(S.date)} yet.</b>Tap a meal from your plan below to add it.</div>`;
  } else {
    for (const slot of SLOTS) {
      const items = meals.filter(m => (m.slot || 'Snack') === slot);
      if (!items.length) continue;
      log += `<div class="slotlabel">${slot}</div>`;
      for (const m of items) {
        const s = m.servings ?? 1;
        log += `<div class="row"><div style="min-width:0"><div class="t">${esc(m.name)}</div>
          <div class="chips"><span class="chip k">${r0(m.kcal * s)} kcal</span><span class="chip p">P ${r0(m.p * s)}</span><span class="chip c">C ${r0(m.c * s)}</span><span class="chip f">F ${r0(m.f * s)}</span></div></div>
          <div class="stepper"><button data-act="serv" data-id="${m.id}" data-d="-0.5" aria-label="Less">−</button><span>${s}×</span><button data-act="serv" data-id="${m.id}" data-d="0.5" aria-label="More">+</button></div></div>`;
      }
    }
  }
  const myFoods = S.config?.foods || [];
  let add = '';
  if (S.foodAdd !== 'custom') {
    const hidden = new Set(S.config?.hiddenRecipes || []);
    const chipRow = m => `<div class="chips"><span class="chip k">${r0(m.kcal)} kcal</span><span class="chip p">P ${r0(m.p)}</span><span class="chip c">C ${r0(m.c)}</span><span class="chip f">F ${r0(m.f)}</span></div>`;
    let any = false;
    for (const slot of SLOTS) {
      const starters = RECIPES.filter(x => x.slot === slot && !hidden.has(x.id));
      const mine = myFoods.filter(f => (f.slot || 'Snack') === slot);
      if (!starters.length && !mine.length) continue;
      any = true;
      add += `<div class="slotlabel">${slot}</div>`;
      for (const f of mine) {
        add += `<div class="row"><div style="min-width:0"><div class="t">${esc(f.name)}</div>${chipRow(f)}</div>
          <span class="rowbtns"><button class="xbtn" data-act="forgetFood" data-id="${f.id}" aria-label="Delete ${esc(f.name)} from your meal plan" title="Delete">×</button><button class="btn sm" data-act="addMine" data-id="${f.id}">Add</button></span></div>`;
      }
      for (const r of starters) {
        add += `<div class="row"><div style="min-width:0"><div class="t">${esc(r.name)}</div>${chipRow(r)}</div>
          <span class="rowbtns"><button class="xbtn" data-act="hideRecipe" data-id="${r.id}" aria-label="Remove ${esc(r.name)} from your meal plan" title="Remove">×</button><button class="btn sm" data-act="addRecipe" data-id="${r.id}">Add</button></span></div>`;
      }
    }
    if (!any) add = `<div class="empty"><b>Your meal plan is empty.</b>Tap "Add a meal" to create your own. Removed starter meals can be brought back in Settings.</div>`;
  } else {
    add = `<form id="customForm" class="sec" style="gap:10px">
      <label class="f">Food<input type="text" id="cf_name" required placeholder="e.g. Chobani Fit yoghurt 170 g"></label>
      <div class="grid4">
        <label class="f">kcal<input type="number" id="cf_kcal" inputmode="decimal" min="0" required></label>
        <label class="f">Protein g<input type="number" id="cf_p" inputmode="decimal" min="0" value="0"></label>
        <label class="f">Carbs g<input type="number" id="cf_c" inputmode="decimal" min="0" value="0"></label>
        <label class="f">Fat g<input type="number" id="cf_f" inputmode="decimal" min="0" value="0"></label>
      </div>
      <div class="formrow">
        <label class="f">Meal<select id="cf_slot">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select></label>
        <label class="f" style="flex-direction:row;display:flex;align-items:center;gap:6px;color:var(--ink)"><input type="checkbox" id="cf_save" checked> Save to my meal plan</label>
        <button class="btn" type="submit">Add to log</button>
      </div></form>`;
  }
  const cardio = day?.cardio || [];
  return `
  <section class="sec">
    <div class="card" style="display:grid;gap:14px">
      <div class="kcal-big"><span class="n">${r0(t.kcal).toLocaleString()}</span><span class="of">/ ${T.kcal.toLocaleString()} kcal</span>
        <span class="left ${left < -150 ? 'down-txt' : ''}">${left >= 0 ? `${r0(left)} kcal left` : `${r0(-left)} kcal over`}${pLeft > 0 ? ` · ${r0(pLeft)} g protein to go` : ' · protein hit'}</span></div>
      <div class="macros">
        ${macroRow('Protein', t.p, T.p, '--red', ' g')}
        ${macroRow('Carbs', t.c, T.c, '--blue', ' g')}
        ${macroRow('Fat', t.f, T.f, '--yellow', ' g')}
      </div>
    </div>
  </section>
  <section class="sec"><h2>Last 7 days</h2>
    <div class="week">${weekStrip()}</div>
    <div class="legend"><span><i style="background:var(--green)"></i>On target</span><span><i style="background:var(--yellow)"></i>Under, or protein short</span><span><i style="background:var(--red)"></i>Over by 150+</span></div>
  </section>
  <section class="sec"><h2>Logged</h2><div class="card rows">${log}</div></section>
  <section class="sec"><h2>Add food</h2>
    <div class="seg" role="group" aria-label="Food source">
      <button data-act="foodAdd" data-v="plan" aria-pressed="${S.foodAdd !== 'custom'}">Meal plan</button>
      <button data-act="foodAdd" data-v="custom" aria-pressed="${S.foodAdd === 'custom'}">Add a meal</button>
    </div>
    <div class="card rows">${add}</div>
  </section>
  <section class="sec"><h2>Steps &amp; cardio</h2>
    <div class="card" style="display:grid;gap:10px">
      <div class="formrow"><label class="f">Steps<input type="number" id="steps" inputmode="numeric" min="0" placeholder="8,000–10,000 goal" value="${day?.steps ?? ''}"></label></div>
      ${cardio.length ? `<div class="rows">${cardio.map(c => `<div class="row"><div><span class="t">${esc(c.type)}</span> <span class="muted">${c.minutes ? c.minutes + ' min' : ''}${c.note ? ' · ' + esc(c.note) : ''}</span></div><button class="btn sm ghost" data-act="delCardio" data-id="${c.id}">Remove</button></div>`).join('')}</div>` : ''}
      <form id="cardioForm" class="formrow">
        <label class="f">Activity<select id="cd_type">${CARDIO_TYPES.map(c => `<option>${c}</option>`).join('')}</select></label>
        <label class="f">Minutes<input type="number" id="cd_min" inputmode="numeric" min="0"></label>
        <label class="f">Note<input type="text" id="cd_note" placeholder="e.g. run club 5 km"></label>
        <button class="btn ghost" type="submit">Add</button>
      </form>
    </div>
  </section>`;
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
    d = { note: existing.note || '', exercises: existing.exercises.map((e, i) => {
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
  if (!S.trainDay) S.trainDay = WEEKDAY_DAY[wd] || 'Rest';
  const seg = `<div class="seg" role="group" aria-label="Session">${[...DAYS, 'Rest'].map(d => `<button data-act="trainDay" data-v="${d}" aria-pressed="${S.trainDay === d}">${d}</button>`).join('')}</div>`;
  if (S.trainDay === 'Rest') {
    const day = S.days[S.date];
    return `<section class="sec"><h2>Session <span class="aside">${fmtDay(S.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span></h2>${seg}</section>
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
  const t = S.timer;
  return `<section class="sec"><h2>Session <span class="aside">${fmtDay(S.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span></h2>${seg}
    ${saved ? `<div class="small muted">Saved session. Changes overwrite it when you save again.</div>` : ''}</section>
    ${cards}
    <div><button class="btn ghost" data-act="addEx">+ Add exercise</button></div>
    <label class="f">Session notes<textarea id="sessNote" data-f="note">${esc(d.note)}</textarea></label>
    ${saved ? (S.confirmSession ? `<div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">Delete this ${S.trainDay} session? <button class="btn danger sm" data-act="delSession">Delete</button><button class="btn ghost sm" data-act="cancelDelSession">Keep it</button></div>` : `<div><button class="linkbtn" style="color:var(--red)" data-act="askDelSession">Delete this session</button></div>`) : ''}
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
function beep() {
  try {
    const ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); o.start(); o.stop(ctx.currentTime + 0.5);
  } catch {}
}
function startTimer(sec) {
  clearInterval(S.timer.handle);
  try { (beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)())).resume(); } catch {}
  S.timer.end = Date.now() + sec * 1000;
  S.timer.handle = setInterval(() => {
    tickTimer();
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
  S.sessions[key] = doc; lsSet('draft:' + key, null); delete S.drafts[key];
  render(); toast('Session saved');
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
function viewProgress() {
  const sess = sessionsSorted();
  if (!sess.length) return S.loaded.sessions || !navigator.onLine ? `<div class="card empty"><b>No lifts logged yet.</b>Save a session under Train and your progress shows up here.<div style="margin-top:8px">Have a backup file? Restore it from Settings (gear icon) → Restore from backup.</div></div>` : `<div class="card empty">Loading your lift history…</div>`;
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
  for (const d of DAYS) for (const p of prog[d]) {
    if (seen.has(p.name)) continue; seen.add(p.name);
    const hh = historyFor(p.name); if (!hh.length) continue;
    const f = hh[0], l = hh[hh.length - 1]; const ch = hh.length > 1 ? ((l.e1 - f.e1) / f.e1) * 100 : null;
    const st = STEP_EXERCISES.has(p.name);
    sumRows += `<tr><td><button class="linkbtn" data-act="pickEx" data-v="${esc(p.name)}">${esc(p.name)}</button><div class="small muted">${d}</div></td><td>${setTxt(l.top, st)}</td><td class="r">${st ? '' : kgFmt(r1(l.e1))}</td><td class="r ${ch == null ? '' : ch >= 0 ? 'up-txt' : 'down-txt'}">${ch == null ? '–' : (ch >= 0 ? '+' : '') + r0(ch) + '%'}</td></tr>`;
  }
  return `
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
        <label class="f">Weight kg<input type="number" id="w_kg" inputmode="decimal" step="0.1" min="30" max="250" value="${todayW?.kg ?? ''}" required></label>
        <label class="f">Waist cm<input type="number" id="w_waist" inputmode="decimal" step="0.5" min="40" max="200" placeholder="weekly, at navel" value="${todayW?.waist ?? ''}"></label>
      </div>
      <div><button class="btn" type="submit">Save weigh-in</button></div>
    </form>
  </section>
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
  ${list.length ? `<section class="sec"><h2>Log</h2><div class="card tablewrap"><table><thead><tr><th>Date</th><th class="r">kg</th><th class="r">Waist</th><th></th></tr></thead><tbody>
    ${list.slice().reverse().slice(0, 30).map(w => `<tr><td>${fmtDay(w.date)}</td><td class="r">${w.kg}</td><td class="r">${w.waist ?? ''}</td><td class="r"><button class="linkbtn" style="color:var(--muted)" data-act="delWeight" data-v="${w.date}">Remove</button></td></tr>`).join('')}
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

/* ---------- SETTINGS ---------- */
function openSettings() {
  const T = targets(); const prog = program();
  const ed = DAYS.map(d => `<div class="card" style="display:grid;gap:6px"><div class="slotlabel" style="padding-top:0">${d}</div>
    <div class="progrow small muted"><span>Exercise</span><span>Sets</span><span>Min</span><span>Max</span><span></span></div>
    ${prog[d].map((p, i) => `<div class="progrow" data-day="${d}">
      <input type="text" list="exnames" value="${esc(p.name)}" data-k="name" aria-label="${d} exercise ${i + 1}" id="pg_${d}_${i}_n">
      <input type="number" min="1" max="8" value="${p.sets}" data-k="sets" aria-label="Sets" id="pg_${d}_${i}_s">
      <input type="number" min="1" max="50" value="${p.min}" data-k="min" aria-label="Min reps" id="pg_${d}_${i}_a">
      <input type="number" min="1" max="50" value="${p.max}" data-k="max" aria-label="Max reps" id="pg_${d}_${i}_b">
      <button type="button" class="del" data-act="pgDel" aria-label="Remove">×</button></div>`).join('')}
    <div><button type="button" class="linkbtn" data-act="pgAdd" data-day="${d}">+ Exercise</button></div></div>`).join('');
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet" id="sheet"><div class="panel"><form class="wrap" id="settingsForm">
    <div style="display:flex;align-items:center;gap:10px"><h3>Settings</h3><button type="button" class="btn ghost sm" style="margin-left:auto" data-act="closeSettings">Close</button></div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Background colour</div>
      <div class="swatches" role="group" aria-label="Background colour">${THEMES.map(t => `<button type="button" class="swatch" data-act="theme" data-v="${t.id}" aria-pressed="${(S.config?.theme || 'auto') === t.id}" title="${t.name}">
        <span class="sw" style="${t.bg ? `background:${t.bg};border-color:${t.line}` : 'background:linear-gradient(135deg,#F1F1EC 50%,#11151A 50%)'}"></span><span class="swn">${t.name}</span></button>`).join('')}</div>
    </div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Meal plan</div>
      <div class="small muted">${(S.config?.hiddenRecipes || []).length ? `${(S.config.hiddenRecipes).length} of ${RECIPES.length} starter meals removed.` : `Showing all ${RECIPES.length} starter meals.`} Your own meals: ${(S.config?.foods || []).length}. Tap × on any meal to remove it.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${(S.config?.hiddenRecipes || []).length ? '<button type="button" class="btn ghost sm" data-act="restoreRecipes">Bring back starter meals</button>' : ''}
        ${(S.config?.hiddenRecipes || []).length < RECIPES.length ? '<button type="button" class="btn ghost sm" data-act="hideAllRecipes">Remove all starter meals</button>' : ''}
      </div>
    </div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Daily targets</div>
      <div class="grid4">
        <label class="f">kcal<input type="number" id="t_kcal" value="${T.kcal}" min="1000" max="5000"></label>
        <label class="f">Protein g<input type="number" id="t_p" value="${T.p}" min="0" max="400"></label>
        <label class="f">Carbs g<input type="number" id="t_c" value="${T.c}" min="0" max="800"></label>
        <label class="f">Fat g<input type="number" id="t_f" value="${T.f}" min="0" max="300"></label>
      </div>
      <div class="small muted">Started at ~2,250 kcal: 10% under a ~2,500 maintenance. Add 200–400 kcal on big hike, swim or run club days.</div>
    </div>
    ${ed}
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="submit">Save</button><button type="button" class="btn ghost" data-act="pgReset">Reset program to original split</button></div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Your data</div>
      <div class="small muted">${store.outbox.length ? `${store.outbox.length} change${store.outbox.length > 1 ? 's' : ''} waiting to sync.` : 'Everything is synced to your Supabase database.'}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn ghost sm" data-act="exportBackup">Export backup</button>
        <label class="btn ghost sm" style="cursor:pointer">Restore from backup<input type="file" id="restoreFile" accept="application/json,.json" hidden></label>
      </div>
    </div>
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Account</div>
      <div class="small">Signed in as <b>${esc(S.user?.email || '')}</b></div>
      ${S.confirmSignOut ? `<div class="small">${store.outbox.length ? `<b class="down-txt">${store.outbox.length} change${store.outbox.length > 1 ? 's' : ''} haven't synced yet and will be lost.</b> ` : ''}Sign out of this phone?</div><div style="display:flex;gap:8px"><button type="button" class="btn danger sm" data-act="signOut">Sign out</button><button type="button" class="btn ghost sm" data-act="cancelSignOut">Stay signed in</button></div>` : `<div><button type="button" class="btn ghost sm" data-act="askSignOut">Sign out</button></div>`}
    </div>
  </form></div></div>`;
}
function readProgramFromSheet() {
  const out = {}; for (const d of DAYS) out[d] = [];
  document.querySelectorAll('#settingsForm .progrow[data-day]').forEach(row => {
    const g = k => row.querySelector(`[data-k="${k}"]`).value;
    const name = g('name').trim(); if (!name) return;
    const min = Math.max(1, +g('min') || 8), max = Math.max(min, +g('max') || min);
    out[row.dataset.day].push({ name, sets: Math.max(1, +g('sets') || 3), min, max });
  });
  return out;
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

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  const D = () => getDraft();
  switch (a) {
    case 'goto': S.date = b.dataset.date; S.trainDay = null; render(); break;
    case 'tab': S.tab = b.dataset.v; render(); break;
    case 'foodAdd': S.foodAdd = b.dataset.v; render(); break;
    case 'addRecipe': {
      const r = RECIPES.find(x => x.id === b.dataset.id); const day = localDay(S.date);
      day.meals.push({ id: uid(), name: r.name, slot: r.slot, servings: 1, kcal: r.kcal, p: r.p, c: r.c, f: r.f, recipe: r.id });
      saveDay(S.date, day); toast(`Added ${r.name}`); break;
    }
    case 'addMine': {
      const f = (S.config?.foods || []).find(x => x.id === b.dataset.id); if (!f) break; const day = localDay(S.date);
      day.meals.push({ id: uid(), name: f.name, slot: f.slot || 'Snack', servings: 1, kcal: f.kcal, p: f.p, c: f.c, f: f.f });
      saveDay(S.date, day); toast(`Added ${f.name}`); break;
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
    case 'trainDay': S.trainDay = b.dataset.v; S.confirmSession = false; render(); break;
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
    case 'signOut': {
      S.confirmSignOut = false; document.getElementById('sheetRoot').innerHTML = '';
      lsSet(store.key('cache'), null); lsSet(store.key('outbox'), null); store.outbox = [];
      await sb.auth.signOut(); break;
    }
    case 'closeSettings': S.confirmSignOut = false; document.getElementById('sheetRoot').innerHTML = ''; if (pendingRender) { pendingRender = false; render(); } break;
    case 'pgDel': b.closest('.progrow').remove(); break;
    case 'pgAdd': {
      const d = b.dataset.day; const row = document.createElement('div'); row.className = 'progrow'; row.dataset.day = d; const i = Date.now();
      row.innerHTML = `<input type="text" list="exnames" data-k="name" aria-label="${d} new exercise" id="pg_${d}_${i}_n" placeholder="Exercise"><input type="number" min="1" max="8" value="3" data-k="sets" aria-label="Sets" id="pg_${d}_${i}_s"><input type="number" min="1" max="50" value="8" data-k="min" aria-label="Min reps" id="pg_${d}_${i}_a"><input type="number" min="1" max="50" value="12" data-k="max" aria-label="Max reps" id="pg_${d}_${i}_b"><button type="button" class="del" data-act="pgDel" aria-label="Remove">×</button>`;
      b.parentElement.before(row); row.querySelector('input').focus(); break;
    }
    case 'pgReset': {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); delete cfg.program; saveConfig(cfg);
      document.getElementById('sheetRoot').innerHTML = ''; S.drafts = {}; toast('Program reset to your original split'); break;
    }
  }
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.f && S.tab === 'train' && el.closest('#view')) {
    const d = getDraft();
    if (el.dataset.f === 'note') { d.note = el.value; persistDraft(); return; }
    const ex = d.exercises[el.dataset.e];
    if (el.dataset.f === 'name') { ex.name = el.value; persistDraft(); return; }
    const r = ex.rows[el.dataset.r];
    if (el.dataset.f === 'kg') r.kg = el.value; else if (el.dataset.f === 'reps') r.reps = el.value; else if (el.dataset.f === 'partials') r.partials = el.value;
    else if (r.drop) { if (el.dataset.f === 'dkg') r.drop.kg = el.value; else if (el.dataset.f === 'dreps') r.drop.reps = el.value; else if (el.dataset.f === 'dpartials') r.drop.partials = el.value; }
    persistDraft();
  }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'restoreFile' && el.files[0]) {
    restoreBackup(el.files[0]).then(n => { toast(`Restored ${n} records`); document.getElementById('sheetRoot').innerHTML = ''; render(); })
      .catch(err => { console.error(err); toast('That file isn\'t a Recomp Log backup.'); });
    return;
  }
  if (el.id === 'exPick') { S.progressEx = el.value; render(); }
  else if (el.id === 'cmpA') { S.compare.a = el.value; render(); }
  else if (el.id === 'cmpB') { S.compare.b = el.value; render(); }
  else if (el.id === 'cmpPose') { S.compare.pose = el.value; render(); }
  else if (el.dataset.f === 'name' && S.tab === 'train') { pendingRender = false; render(); }
  else if (el.id === 'steps') {
    const day = localDay(S.date); const v = numOrNull(el.value); if (day.steps === v) return; day.steps = v; saveDay(S.date, day); toast('Steps saved');
  }
});
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target; const v = id => document.getElementById(id)?.value;
  if (f.id === 'customForm') {
    const item = { name: v('cf_name').trim(), kcal: +v('cf_kcal') || 0, p: +v('cf_p') || 0, c: +v('cf_c') || 0, f: +v('cf_f') || 0, slot: v('cf_slot') };
    if (!item.name) return;
    const day = localDay(S.date); day.meals.push({ id: uid(), servings: 1, ...item }); saveDay(S.date, day);
    if (document.getElementById('cf_save').checked) {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); cfg.foods = [...(cfg.foods || []), { id: uid(), ...item }]; saveConfig(cfg);
    }
    toast(`Added ${item.name}`);
  } else if (f.id === 'cardioForm') {
    const day = localDay(S.date); day.cardio = day.cardio || [];
    day.cardio.push({ id: uid(), type: v('cd_type'), minutes: numOrNull(v('cd_min')), note: (v('cd_note') || '').trim() }); saveDay(S.date, day);
  } else if (f.id === 'weightForm') {
    const date = v('w_date') || todayISO(); const kg = numOrNull(v('w_kg')); if (!kg) return;
    const doc = { date, kg, waist: numOrNull(v('w_waist')) };
    store.set('weights', date, doc); render(); toast('Weigh-in saved');
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
    cfg.program = readProgramFromSheet();
    document.getElementById('sheetRoot').innerHTML = '';
    S.drafts = {}; saveConfig(cfg); toast('Targets and program saved');
  }
});

boot();
})();
