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
const APP_VERSION = 21; // keep in step with VERSION in sw.js
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
  if (S.config?.theme && THEME_ALIAS[S.config.theme]) { const cfg = cfgCopy(); cfg.theme = THEME_ALIAS[cfg.theme]; S.config = cfg; store.set('config', 'settings', cfg); }
  applyTheme(S.config?.theme || lsGet('rl:theme') || 'auto');
  const banner = S.syncError ? `<div class="banner">Some changes haven't reached your Supabase database yet (${esc(S.syncError)}). They're kept on this phone and retry automatically.</div>` : '';
  const gOn = gardenOn();
  const gBtn = document.querySelector('nav.tabs button[data-tab="garden"]'); if (gBtn) gBtn.hidden = !gOn;
  if (gBtn && gBtn.dataset.kind !== growKind()) { gBtn.dataset.kind = growKind(); gBtn.innerHTML = `<svg viewBox="0 0 24 24">${gm().icon}</svg>${gm().tab}`; }
  if (S.tab === 'garden' && !gOn) S.tab = 'today';
  const html = { today: viewToday, train: viewTrain, progress: viewProgress, body: viewBody, photos: viewPhotos, garden: viewGarden }[S.tab]();
  view.innerHTML = banner + html;
  if (S.tab === 'train') tickTimer();
  updateSync();
  syncBlooms();
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
  if (S.foodAdd === 'scan') {
    add = scanPanel();
  } else if (S.foodAdd !== 'custom') {
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
      <label class="f">Ingredients (optional, one per line, for nutrients and your grocery list)<textarea id="cf_ing" rows="3" placeholder="200 g chicken breast&#10;1 avocado&#10;100 g rice"></textarea></label>
      <div class="formrow">
        <label class="f">Meal<select id="cf_slot">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select></label>
        <label class="f" style="flex-direction:row;display:flex;align-items:center;gap:6px;color:var(--ink)"><input type="checkbox" id="cf_save" checked> Save to my meal plan</label>
        <button class="btn" type="submit">Add to log</button>
      </div></form>`;
  }
  const cardio = day?.cardio || [];
  return `${gardenCard()}
  <section class="sec">
    <div class="card tapcard" style="display:grid;gap:14px" data-act="openNutrients" role="button" tabindex="0" aria-label="Show all nutrients for this day">
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
  ${waterCard()}
  ${suppCard()}
  <section class="sec"><h2>Last 7 days</h2>
    <div class="week">${weekStrip()}</div>
    <div class="legend"><span><i style="background:var(--green)"></i>On target</span><span><i style="background:var(--yellow)"></i>Under, or protein short</span><span><i style="background:var(--red)"></i>Over by 150+</span></div>
  </section>
  <section class="sec"><h2>Logged</h2><div class="card rows">${log}</div></section>
  <section class="sec"><h2>Add food</h2>
    <div class="seg" role="group" aria-label="Food source">
      <button data-act="foodAdd" data-v="plan" aria-pressed="${S.foodAdd !== 'custom' && S.foodAdd !== 'scan'}">Meal plan</button>
      <button data-act="foodAdd" data-v="scan" aria-pressed="${S.foodAdd === 'scan'}">Scan</button>
      <button data-act="foodAdd" data-v="custom" aria-pressed="${S.foodAdd === 'custom'}">Add a meal</button>
      <button class="groc-btn" data-act="openGrocery"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11h10.2L20 7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>Grocery list</button>
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
  for (const d of DAYS) for (const p of prog[d]) {
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
  const dots = [1, 2, 3, 4].map(i => `<span class="ob-dot${i === st ? ' on' : ''}${i < st ? ' done' : ''}"></span>`).join('');
  let body = '';
  if (st === 1) {
    body = `<h3>Welcome to Recomp Log</h3>
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
  } else {
    body = `<h3>Make it yours</h3>
      <div class="f"><span>Colour</span><div class="swatches">${THEMES.map(t => `<button type="button" class="swatch" data-act="ob-theme" data-v="${t.id}" aria-pressed="${d.theme === t.id}" title="${t.name}">
        <span class="sw" style="${t.bg ? `background:${t.bg};border-color:${t.line}` : 'background:linear-gradient(135deg,#F1F1EC 50%,#11151A 50%)'}"></span><span class="swn">${t.name}</span></button>`).join('')}</div></div>
      ${(() => { const soft = isSoftId(d.theme); const g = growKind(d.theme, soft ? d.growSoft : d.grow); return `<div class="f"><span>What you grow. It grows every time you log, and fastest when you work out.</span>${growPicker(g, 'ob-grow', g, soft)}</div>` + (g === 'flower' ? `<div class="f"><span>Your flower</span>${flowerPicker('ob-flower', d.flower)}</div>` : ''); })()}
      <div class="ob-actions"><button type="button" class="btn ghost" data-act="ob-back">Back</button><button type="button" class="btn" data-act="ob-finish">Start logging</button></div>`;
  }
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet ob"><div class="panel"><div class="wrap ob-wrap"><div class="ob-dots" aria-label="Step ${st} of 4">${dots}</div>${body}</div></div></div>`;
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
    if (d.weight && !S.weights[todayISO()]) store.set('weights', todayISO(), { date: todayISO(), kg: d.weight });
  }
  S.ob = null; document.getElementById('sheetRoot').innerHTML = '';
  applyTheme(cfg.theme || 'auto'); saveConfig(cfg);
  toast(skip ? 'You can do setup any time from Settings.' : `All set${cfg.profile?.name ? ', ' + cfg.profile.name : ''}. Happy logging!`);
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
  S.foodAdd = 'scan'; S.scan = { code, status: 'loading', product: null }; render();
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
function scanPanel() {
  const s = S.scan;
  let res = '';
  if (s.status === 'loading') res = `<div class="empty">Looking up ${esc(s.code)}…</div>`;
  else if (s.status === 'notfound') res = `<div class="empty"><b>${s.partial ? esc(s.partial) + ' has no nutrition info yet.' : 'Not in the food database yet.'}</b>Add it with "Add a meal" using the numbers on the packet.<div style="margin-top:10px"><button class="btn ghost sm" data-act="foodAdd" data-v="custom">Add a meal</button></div></div>`;
  else if (s.status === 'error') res = `<div class="empty">${esc(s.msg)}</div>`;
  else if (s.status === 'found') {
    const p = s.product; const g = s.grams || 100; const k = g / 100;
    res = `<div class="scan-result">
      <div><div class="t">${esc(p.name)}</div><div class="small muted">${esc([p.brand, p.size].filter(Boolean).join(' · '))}</div></div>
      <div class="small muted">Per 100 g: ${r0(p.kcal)} kcal · P ${r1(p.p)} · C ${r1(p.c)} · F ${r1(p.f)}</div>
      <div class="formrow">
        <label class="f">Amount eaten (g or ml)<input type="number" id="sc_g" inputmode="decimal" min="1" value="${g}"></label>
        <label class="f">Meal<select id="sc_slot">${SLOTS.map(x => `<option ${x === guessSlot() ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      </div>
      <div class="seg">${p.serving ? `<button type="button" data-act="scanGrams" data-v="${p.serving}" aria-pressed="${g === p.serving}">1 serve (${r0(p.serving)} g)</button>` : ''}<button type="button" data-act="scanGrams" data-v="100" aria-pressed="${g === 100}">100 g</button></div>
      <div class="chips" id="sc_macros"><span class="chip k">${r0(p.kcal * k)} kcal</span><span class="chip p">P ${r0(p.p * k)}</span><span class="chip c">C ${r0(p.c * k)}</span><span class="chip f">F ${r0(p.f * k)}</span></div>
      <label class="f" style="flex-direction:row;display:flex;align-items:center;gap:6px;color:var(--ink)"><input type="checkbox" id="sc_save"> Save to my meal plan</label>
      <div><button class="btn" data-act="scanAdd">Add to log</button></div>
      <div class="small muted">Nutrition from Open Food Facts. Check it against the packet if it looks off.</div>
    </div>`;
  }
  return `<div class="scan-panel">
    <button class="btn scan-cta" data-act="openScanner"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M7 8v8M10 8v8M13 8v8M16 8v8"/></svg>Scan a barcode</button>
    <div class="formrow"><label class="f">Or type the barcode number<input type="text" id="sc_code" inputmode="numeric" autocomplete="off" value="${esc(s.code || '')}" placeholder="e.g. 9300633603262"></label><button class="btn ghost" data-act="scanLookup">Look up</button></div>
    ${res}</div>`;
}
function guessSlot() { const h = new Date().getHours(); return h < 10 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 20 ? 'Dinner' : 'Snack'; }

/* ---------- grocery list ---------- */
const GROCERY_ITEMS = {
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
function groceryItems() {
  const g = S.config?.grocery || {}; const counts = g.counts || {};
  const sums = {}; const loose = {};
  for (const m of planMeals()) {
    const n = counts[m.key] || 0; if (!n) continue;
    if (m.starter) {
      for (const [ing, grams] of RECIPE_GROCERY[m.key] || []) sums[ing] = (sums[ing] || 0) + grams * n;
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
function openGrocery() {
  const prevScroll = document.querySelector('.sheet .panel')?.scrollTop || 0;
  const g = S.config?.grocery || {}; const counts = g.counts || {}; const checked = g.checked || {};
  const meals = planMeals();
  const mealRows = SLOTS.map(slot => {
    const ms = meals.filter(m => m.slot === slot); if (!ms.length) return '';
    return `<div class="slotlabel">${slot}</div>` + ms.map(m => `<div class="row"><div class="t" style="min-width:0">${esc(m.name)}${!m.starter && !(m.food.ing || []).length ? '<div class="small muted">No ingredients saved for this meal</div>' : ''}</div>
      <div class="stepper"><button type="button" data-act="grocCount" data-k="${esc(m.key)}" data-d="-1" aria-label="Fewer">−</button><span>${counts[m.key] || 0}×</span><button type="button" data-act="grocCount" data-k="${esc(m.key)}" data-d="1" aria-label="More">+</button></div></div>`).join('');
  }).join('');
  const items = groceryItems();
  const left = items.filter(i => !checked[i.key]).length;
  const list = items.length ? AISLES.map(a => {
    const xs = items.filter(i => i.aisle === a); if (!xs.length) return '';
    return `<div class="slotlabel">${a}</div>` + xs.map(i => `<label class="groc ${checked[i.key] ? 'done' : ''}"><input type="checkbox" data-groc="${esc(i.key)}" ${checked[i.key] ? 'checked' : ''}><span class="gn">${esc(i.name)}</span><span class="gq">${esc(i.qty)}</span>${i.extra ? `<button type="button" class="xbtn sm" data-act="grocDelExtra" data-v="${i.extra}" aria-label="Remove ${esc(i.name)}">×</button>` : ''}</label>`).join('');
  }).join('') : `<div class="empty"><b>Your list is empty.</b>Tap + on the meals you'll make this week and their ingredients add up here.</div>`;
  document.getElementById('sheetRoot').innerHTML = `<div class="sheet"><div class="panel"><div class="wrap">
    <div style="display:flex;align-items:center;gap:10px"><h3>Grocery list</h3><button type="button" class="btn ghost sm" style="margin-left:auto" data-act="closeSheet">Close</button></div>
    <div class="card" style="display:grid;gap:4px"><div class="small muted">How many times will you have each meal this week?</div><div class="rows">${mealRows || '<div class="empty">Your meal plan is empty.</div>'}</div></div>
    <section class="sec"><h2>Shopping list <span class="aside">${items.length ? `${left} of ${items.length} left` : ''}</span></h2>
      <div class="card">${list}
        <div class="formrow" style="margin-top:10px"><label class="f">Add something else<input type="text" id="groc_extra" placeholder="e.g. paper towel"></label><button type="button" class="btn ghost" data-act="grocAddExtra">Add</button></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost sm" data-act="grocUntick">Untick all</button><button type="button" class="btn ghost sm" data-act="grocReset">Start a new week</button></div>
    </section>
  </div></div></div>`;
  const pn = document.querySelector('.sheet .panel'); if (pn) pn.scrollTop = prevScroll;
}
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
  return { ws, we, loggedDays: logged.length, avgKcal: avg(kcals), avgP: avg(prots), proteinHit: prots.filter(p => p >= T.p - 10).length, workouts: sess.length, workoutDays: sess.map(s => s.day).filter(Boolean), cardioMin: cardio.reduce((n, c) => n + (c.minutes || 0), 0), cardioN: cardio.length, wNow, wPrev, waistNow, waistPrev, pbs, suppTaken, suppPossible: supps.length * 7, gpts };
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
const NUTR_DB = {
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
const ING_WORDS = [['egg white', 'egg_white'], ['chicken thigh', 'chicken_thigh'], ['chicken', 'chicken_breast'], ['eggs', 'egg'], ['egg', 'egg'],
  ['almond milk', 'almond_milk'], ['milk', 'skim_milk'], ['yoghurt', 'greek_yog_0'], ['yogurt', 'greek_yog_0'], ['cottage', 'cottage_cheese'], ['parmesan', 'parmesan'],
  ['mozzarella', 'light_mozz'], ['cheese', 'light_cheese'], ['turkey', 'turkey_mince'], ['beef', 'lean_beef'], ['steak', 'lean_beef'], ['mince', 'lean_beef'], ['salmon', 'salmon'],
  ['banana', 'banana'], ['strawberr', 'strawberries'], ['berr', 'berries'], ['avocado', 'avocado'], ['spinach', 'spinach'], ['tomato', 'tomato'], ['capsicum', 'capsicum'],
  ['cucumber', 'cucumber'], ['carrot', 'carrot'], ['cabbage', 'cabbage'], ['broccolini', 'broccolini'], ['broccoli', 'broccoli'], ['sweet potato', 'sweet_potato'],
  ['onion', 'onion'], ['lettuce', 'lettuce'], ['lime', 'lime'], ['lemon', 'lime'], ['corn', 'corn'], ['edamame', 'edamame'], ['sourdough', 'sourdough'], ['bread', 'sourdough'],
  ['toast', 'sourdough'], ['tortilla', 'tortilla'], ['wrap', 'tortilla'], ['oat', 'oats'], ['whey', 'whey'], ['protein powder', 'whey'], ['brown rice', 'brown_rice_cooked'],
  ['rice cake', 'rice_cake'], ['rice', 'white_rice_cooked'], ['orzo', 'orzo_dry'], ['pasta', 'penne_dry'], ['penne', 'penne_dry'], ['flour', 'flour'], ['bean', 'black_beans'],
  ['passata', 'passata'], ['stock', 'broth'], ['broth', 'broth'], ['chia', 'chia'], ['granola', 'granola'], ['almond', 'almonds'], ['choc', 'choc_chips'], ['nori', 'nori'],
  ['olive oil', 'olive_oil'], ['oil', 'olive_oil'], ['peanut butter', 'peanut_butter'], ['maple', 'maple'], ['honey', 'honey'], ['kewpie', 'kewpie'], ['mayo', 'mayo'],
  ['sweet chilli', 'sweet_chilli'], ['sriracha', 'sriracha'], ['soy', 'soy'], ['salsa', 'salsa'], ['kimchi', 'kimchi']];
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
  return `<svg viewBox="0 0 124 200" class="bottle-svg" role="img" aria-label="Stanley cup ${Math.round(f * 100)}% full">
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
function waterCard() {
  if (S.config?.water?.hidden) return `<section class="sec"><h2>Water <button class="linkbtn h2btn push" data-act="waterHide" data-v="0" aria-expanded="false">Show</button></h2></section>`;
  const ml = S.days[S.date]?.water || 0; const goal = waterGoal(); const f = Math.min(1, ml / goal);
  const soft = softTheme(); const bs = bottleSize(); const left = Math.max(0, goal - ml);
  const msg = ml >= goal ? 'Goal hit. Nicely done.'
    : ml === 0 ? `Start with a glass. Your goal is ${fmtL(goal)} L.`
    : `${fmtL(left)} L to go, about ${Math.max(1, Math.round(left / bs * 2) / 2)} ${soft ? 'Stanley' : 'bottle'}${left / bs > 1 ? 's' : ''}.`;
  return `<section class="sec"><h2>Water <span class="aside">${fmtL(ml)} / ${fmtL(goal)} L</span><button class="linkbtn h2btn" data-act="waterHide" data-v="1" aria-expanded="true">Hide</button></h2>
    <div class="card water${ml >= goal ? ' done' : ''}">
      <div class="water-art">${soft ? stanleySVG(f, stanleyColour()) : plainBottleSVG(f)}</div>
      <div class="water-side">
        <div class="water-n"><b>${fmtL(ml)}</b> L <span>of ${fmtL(goal)} L</span></div>
        <div class="small muted">${msg}</div>
        <div class="water-btns">
          <button class="btn ghost sm" data-act="water" data-d="250">+ 250 ml</button>
          <button class="btn ghost sm" data-act="water" data-d="500">+ 500 ml</button>
          <button class="btn sm" data-act="water" data-d="${bs}">+ ${soft ? 'Full Stanley' : 'Full bottle'} <span class="wb-sz">${fmtL(bs)} L</span></button>
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
      <label class="f">${soft ? 'Stanley' : 'Bottle'} size (ml)<input type="number" id="wt_bottle" min="100" max="3000" step="10" value="${bottleSize()}"></label>
    </div>
    <div class="small muted">${S.config?.water?.goal ? '' : 'Goal starts at about 35 ml per kg of body weight. '}Drink more on hot days and long sessions.${soft ? ' A 40 oz Stanley holds 1,180 ml.' : ''}</div>
    ${soft ? `<div class="small muted">Stanley colour</div>
    <div class="stanley-pick" role="group" aria-label="Stanley colour">${STANLEY_COLOURS.map(([id, name, hex]) => `<button type="button" class="sp" data-act="stanleyColour" data-v="${id}" aria-pressed="${cur === id}" title="${name}">
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

/* ---------- SETTINGS ---------- */
function growPicker(kind, act, cur, soft = softTheme()) {
  return `<div class="flower-pick grow-pick" role="group" aria-label="What you grow">${(soft ? ['flower', 'bonsai', 'car'] : ['bonsai', 'car', 'flower']).map(k => `<button type="button" class="fp" data-act="${act}" data-v="${k}" aria-pressed="${cur === k}">
    <span class="fp-art">${k === 'flower' ? flowerSVG(5, false, { type: flowerType(), label: 'Flower' }) : growSVG(k, 5, false, { i: 0, label: GROWS[k].label, v: k === 'bonsai' ? bonsaiSp() : carStyle() })}</span><span class="fp-name">${GROWS[k].label}</span></button>`).join('')}</div>`;
}
function flowerPicker(act, cur) {
  return `<div class="flower-pick" role="group" aria-label="Choose your flower">${Object.entries(FLOWERS).map(([id, f]) => `<button type="button" class="fp" data-act="${act}" data-v="${id}" aria-pressed="${cur === id}">
    <span class="fp-art">${flowerSVG(5, false, { type: id, label: f.name })}</span><span class="fp-name">${f.name}</span></button>`).join('')}</div>`;
}
function bonsaiPicker(act, cur) {
  return `<div class="flower-pick" role="group" aria-label="Bonsai type">${Object.entries(BONSAI).map(([id, b]) => `<button type="button" class="fp" data-act="${act}" data-v="${id}" aria-pressed="${cur === id}">
    <span class="fp-art">${bonsaiSVG(5, false, b.name, id)}</span><span class="fp-name">${b.name}</span></button>`).join('')}</div>`;
}
function carPicker(act, cur) {
  return `<div class="flower-pick car-pick" role="group" aria-label="Car style">${Object.entries(CAR_STYLES).filter(([, c]) => !!c.soft === softTheme()).map(([id, c], k) => `<button type="button" class="fp" data-act="${act}" data-v="${id}" aria-pressed="${cur === id}">
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
    ${growSettings()}
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
      <div class="small muted">On days with extra exercise, like a long hike, swim or run, eat a bit more to fuel it.</div>
      <div><button type="button" class="btn ghost sm" data-act="redoSetup">Recalculate from my stats</button></div>
    </div>
    ${waterSettings()}
    <div class="card" style="display:grid;gap:10px"><div class="slotlabel" style="padding-top:0">Supplements</div>
      ${(S.config?.supps || []).length ? `<div class="rows">${S.config.supps.map(x => `<div class="row"><span class="t">${esc(x.name)}</span><button type="button" class="xbtn" data-act="suppDel" data-v="${x.id}" aria-label="Remove ${esc(x.name)}">×</button></div>`).join('')}</div>` : '<div class="small muted">Add what you take and tick them off on the Food tab each day.</div>'}
      <div class="formrow"><label class="f">Add a supplement<input type="text" id="supp_new" placeholder="e.g. Creatine 5 g"></label><button type="button" class="btn ghost" data-act="suppAdd">Add</button></div>
      <div class="chips">${SUPP_SUGGEST.filter(n => !(S.config?.supps || []).some(x => x.name === n)).map(n => `<button type="button" class="chip k chipbtn" data-act="suppQuick" data-v="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>
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
      <div class="small muted">App version ${APP_VERSION}</div>
      <details class="pw"><summary>Change password</summary>
        <div class="grid2" style="margin-top:8px">
          <label class="f">New password<input type="password" id="pw1" autocomplete="new-password" minlength="8"></label>
          <label class="f">Type it again<input type="password" id="pw2" autocomplete="new-password" minlength="8"></label>
        </div>
        <div id="pwMsg" class="small muted">At least 8 characters.</div>
        <div><button type="button" class="btn sm" data-act="changePw">Change password</button></div>
      </details>
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
      day.meals.push({ id: uid(), name: f.name, slot: f.slot || 'Snack', servings: 1, kcal: f.kcal, p: f.p, c: f.c, f: f.f, food: f.id, ...(f.ing?.length ? { ing: f.ing } : {}), ...(f.nut ? { nut: f.nut } : {}) });
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
    case 'ob-set': { S.ob.d[b.dataset.k] = b.dataset.v; if (S.ob.step === 1) { const e = obReadStep(); S.ob.err = null; void e; } openOnboarding(); break; }
    case 'ob-next': { const err = obReadStep(); if (err) { S.ob.err = err; openOnboarding(); break; } S.ob.err = null; openOnboarding(S.ob.step + 1); document.querySelector('.sheet .panel')?.scrollTo(0, 0); break; }
    case 'ob-back': { if (S.ob.step === 3) obReadStep(); openOnboarding(S.ob.step - 1); break; }
    case 'ob-skip': obFinish(true); break;
    case 'ob-finish': obFinish(false); break;
    case 'ob-theme': { S.ob.d.theme = b.dataset.v; appliedTheme = null; applyTheme(b.dataset.v); openOnboarding(); break; }
    case 'ob-flower': { S.ob.d.flower = b.dataset.v; openOnboarding(); break; }
    case 'ob-grow': { S.ob.d[isSoftId(S.ob.d.theme) ? 'growSoft' : 'grow'] = b.dataset.v; openOnboarding(); break; }
    case 'redoSetup': { const pr = S.config?.profile || {}; S.ob = { step: 1, d: { sex: pr.sex || 'female', age: pr.age, height: pr.height, weight: weightList().slice(-1)[0]?.kg || pr.weight, name: pr.name, activity: pr.activity || 'light', goal: pr.goal || 'recomp', theme: S.config?.theme || 'auto', flower: flowerType(), grow: S.config?.grow } }; openOnboarding(); break; }
    case 'changePw': changePassword(); break;
    case 'openScanner': openScanner(); break;
    case 'closeScanner': closeScanner(); break;
    case 'scanLookup': lookupBarcode(document.getElementById('sc_code')?.value); break;
    case 'scanGrams': S.scan.grams = +b.dataset.v; render(); break;
    case 'scanAdd': {
      const p = S.scan.product; if (!p) break;
      const g = numOrNull(document.getElementById('sc_g')?.value) || S.scan.grams || 100; const k = g / 100;
      const item = { name: `${p.name}${p.brand ? ' (' + p.brand + ')' : ''}, ${r0(g)} g`, kcal: r0(p.kcal * k), p: r1(p.p * k), c: r1(p.c * k), f: r1(p.f * k), slot: document.getElementById('sc_slot')?.value || guessSlot() };
      if (p.nut) { item.nut = {}; for (const [kk, vv] of Object.entries(p.nut)) item.nut[kk] = Math.round(vv * k * 100) / 100; }
      const day = localDay(S.date); day.meals.push({ id: uid(), servings: 1, barcode: S.scan.code, ...item }); saveDay(S.date, day);
      if (document.getElementById('sc_save')?.checked) { const cfg = cfgCopy(); cfg.foods = [...(cfg.foods || []), { id: uid(), barcode: S.scan.code, ...item }]; saveConfig(cfg); }
      S.scan = { code: '', status: 'idle', product: null }; S.foodAdd = 'plan'; render(); toast(`Added ${p.name}`); break;
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
  if (el.id === 'sc_g' && S.scan.product) {
    const p = S.scan.product; const k = (numOrNull(el.value) || 0) / 100; S.scan.grams = numOrNull(el.value) || 0;
    const m = document.getElementById('sc_macros'); if (m) m.innerHTML = `<span class="chip k">${r0(p.kcal * k)} kcal</span><span class="chip p">P ${r0(p.p * k)}</span><span class="chip c">C ${r0(p.c * k)}</span><span class="chip f">F ${r0(p.f * k)}</span>`;
    return;
  }
  if (el.id === 'ob_kcal') { const sh = document.getElementById('ob_kcal_show'); if (sh) sh.textContent = (+el.value || 0).toLocaleString(); }
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
    const day = localDay(S.date); const v = numOrNull(el.value); if (day.steps === v) return; day.steps = v; saveDay(S.date, day); toast('Steps saved');
  }
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('tapcard')) { e.preventDefault(); openNutrients(); return; } if (e.key === 'Enter' && e.target.id === 'sc_code') { e.preventDefault(); lookupBarcode(e.target.value); } if (e.key === 'Escape' && !document.getElementById('scanRoot').hidden) closeScanner(); });
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target; const v = id => document.getElementById(id)?.value;
  if (f.id === 'customForm') {
    const item = { name: v('cf_name').trim(), kcal: +v('cf_kcal') || 0, p: +v('cf_p') || 0, c: +v('cf_c') || 0, f: +v('cf_f') || 0, slot: v('cf_slot') };
    const ing = (v('cf_ing') || '').split('\n').map(x => x.trim()).filter(Boolean);
    if (!item.name) return;
    const day = localDay(S.date); day.meals.push({ id: uid(), servings: 1, ...item, ...(ing.length ? { ing } : {}) }); saveDay(S.date, day);
    if (document.getElementById('cf_save').checked) {
      const cfg = JSON.parse(JSON.stringify(S.config || {})); cfg.foods = [...(cfg.foods || []), { id: uid(), ...item, ...(ing.length ? { ing } : {}) }]; saveConfig(cfg);
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
    cfg.program = readProgramFromSheet();
    document.getElementById('sheetRoot').innerHTML = '';
    S.drafts = {}; saveConfig(cfg); toast('Targets and program saved');
  }
});

boot();
})();
