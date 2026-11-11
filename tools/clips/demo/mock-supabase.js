// Minimal stand-in for supabase-js v2, enough to drive the app's flows in a test browser.
(function () {
  const db = (window.__MOCK_DB = window.__MOCK_DB || (() => { try { return JSON.parse(localStorage.getItem('__mockdb') || 'null') || { rows: {}, files: {} }; } catch { return { rows: {}, files: {} }; } })());
  const save = () => { try { localStorage.setItem('__mockdb', JSON.stringify(db)); } catch {} };
  window.__MOCK_CALLS = [];
  const offline = () => !navigator.onLine;
  const netErr = () => ({ data: null, error: { message: 'Failed to fetch' } });
  const USER = { id: '11111111-2222-3333-4444-555555555555', email: 'demo@refyne.test' };
  let session = null; try { session = JSON.parse(localStorage.getItem('rl-auth') || 'null'); } catch {}
  const blobs = {};
  const keep = s => { try { s ? localStorage.setItem('rl-auth', JSON.stringify(s)) : localStorage.removeItem('rl-auth'); } catch {} };
  const listeners = [];
  db.tables = db.tables || {};
  function q(table) {
    if (table !== 'docs') {
      const t = (db.tables[table] = db.tables[table] || []);
      const done = r => { save(); return Promise.resolve(r); };
      return {
        upsert(row) { window.__MOCK_CALLS.push(['upsert:' + table, row]); const i = t.findIndex(x => x.endpoint && x.endpoint === row.endpoint); if (i >= 0) t[i] = row; else t.push(row); return done({ data: null, error: null }); },
        insert(row) { window.__MOCK_CALLS.push(['insert:' + table, row]); t.push(row); return done({ data: null, error: null }); },
        delete() { return { eq(col, v) { window.__MOCK_CALLS.push(['delete:' + table, v]); db.tables[table] = t.filter(x => x[col] !== v); return done({ error: null }); } }; },
      };
    } // TABLES
    return {
      upsert(rows) {
        window.__MOCK_CALLS.push(['upsert', Array.isArray(rows) ? rows.length : 1]);
        if (offline()) return Promise.resolve(netErr());
        for (const r of [].concat(rows)) db.rows[r.collection + '/' + r.id] = r;
        save(); return Promise.resolve({ data: null, error: null });
      },
      delete() {
        return { match(m) { window.__MOCK_CALLS.push(['delete', m.collection + '/' + m.id]); if (offline()) return Promise.resolve(netErr()); delete db.rows[m.collection + '/' + m.id]; save(); return Promise.resolve({ error: null }); } };
      },
      select() {
        const chain = {
          order() { return chain; },
          range(a, b) {
            window.__MOCK_CALLS.push(['select', a, b]);
            if (offline()) return Promise.resolve(netErr());
            const all = Object.values(db.rows).map(r => ({ collection: r.collection, id: r.id, data: r.data }));
            return Promise.resolve({ data: all.slice(a, b + 1), error: null });
          },
        };
        return chain;
      },
    };
  }
  window.supabase = {
    createClient() {
      return {
        auth: {
          async getSession() { return { data: { session } }; },
          async signInWithPassword({ email, password }) {
            if (!password) return { data: {}, error: { message: 'Invalid login credentials' } };
            session = { user: { ...USER, email } }; keep(session);
            listeners.forEach(f => f('SIGNED_IN', session)); return { data: { user: session.user, session }, error: null };
          },
          async signUp({ email, password, options }) { session = { user: { ...USER, email } }; keep(session); setTimeout(() => listeners.forEach(f => f('SIGNED_IN', session)), 0); return { data: { user: session.user, session }, error: null }; },
          async resetPasswordForEmail(email, opts) { window.__MOCK_CALLS.push(['reset', email, opts && opts.redirectTo]); return { data: {}, error: null }; },
          async updateUser({ password }) { window.__MOCK_CALLS.push(['updateUser', password.length]); return { data: {}, error: null }; },
          onAuthStateChange(f) { listeners.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
          async signOut() { session = null; keep(null); listeners.forEach(f => f('SIGNED_OUT', null)); return { error: null }; },
        },
        from: q,
        async rpc(fn) { window.__MOCK_CALLS.push(['rpc', fn]); if (fn === 'delete_my_account') { db.rows = {}; db.files = {}; save(); session = null; keep(null); } return { data: null, error: null }; },
        storage: {
          from() {
            return {
              async upload(path, blob) { if (offline()) return netErr(); db.files[path] = blob.size; blobs[path] = URL.createObjectURL(blob); save(); window.__MOCK_CALLS.push(['upload', path, blob.size]); return { data: { path }, error: null }; },
              async createSignedUrls(paths) { return { data: paths.map(p => ({ path: p, signedUrl: blobs[p] || "icons/icon-512.png" })), error: null }; },
              async list(prefix) { const names = Object.keys(db.files).filter(p => p.startsWith(prefix + '/')).map(p => ({ name: p.slice(prefix.length + 1) })); window.__MOCK_CALLS.push(['list', prefix, names.length]); return { data: names, error: null }; },
              async remove(paths) { paths.forEach(p => delete db.files[p]); save(); window.__MOCK_CALLS.push(['remove', paths]); return { data: null, error: null }; },
            };
          },
        },
      };
    },
  };
})();
