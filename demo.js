/* Recomp Log demo mode.
 *
 * Loaded only when the page URL contains ?demo=1 (see the loader in index.html), so the normal app is untouched.
 * Everything runs in memory: nothing is saved to the browser, nothing is sent to Supabase, and your real sign-in is never read or changed.
 * It is used to record the marketing clips (tools/clips) and to preview the app with clean sample data.
 *
 * Options (all optional), e.g. /index.html?demo=1&theme=pink&grow=car&streak=40
 *   theme    theme id: auto, white, sand, mint, sky, pink, lilac, navy
 *   grow     what grows on the Food tab: bonsai | car | flower      (applies to the chosen theme's family)
 *   car      car style id for the chosen family (see CAR_STYLES in app.js)
 *   bonsai   bonsai species id            flower   flower id
 *   cup      tumbler colour id (rose, fuchsia, blush, lilac, peach, butter, sage, sky, cream, black)
 *   water    water logged today, in ml (default 0)       goal   daily water goal in ml (default 2750)
 *   streak   consecutive logged days up to today (default 40; 0 = brand new account)
 *   cars     finished cars / trees / flowers so far (default 5)
 *   bloom    points into the current one, 0-39 (default 35)
 *   weeks    full past weeks of 3 workouts, for the "weeks in a row" count (default 6)
 *   logged   0 = nothing logged yet today, 1 = today's meals logged (default 1)
 *   today    pretend today is this date, YYYY-MM-DD (default: the real date)
 *   cfg      JSON merged into the saved settings, for anything not covered above
 */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  if (q.get('demo') !== '1') return;
  window.__RECOMP_DEMO__ = true;

  function num(name, dflt) { var v = q.get(name); if (v === null || v === '') return dflt; var n = Number(v); return Number.isFinite(n) ? n : dflt; }

  /* ---- 1. nothing persists: swap the browser storage for in-memory copies ---- */
  function memStore() {
    var d = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
      setItem: function (k, v) { d[k] = String(v); },
      removeItem: function (k) { delete d[k]; },
      clear: function () { d = {}; },
      key: function (i) { return Object.keys(d)[i] || null; },
      get length() { return Object.keys(d).length; },
    };
  }
  try {
    Object.defineProperty(window, 'localStorage', { value: memStore(), configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: memStore(), configurable: true });
  } catch (e) { /* the app still works; it just may keep a little in the browser */ }

  /* ---- 2. optionally pretend it is another day ---- */
  var pretend = q.get('today');
  if (pretend && /^\d{4}-\d{2}-\d{2}$/.test(pretend)) {
    var RealDate = Date, p = pretend.split('-').map(Number), n0 = new RealDate();
    var off = new RealDate(p[0], p[1] - 1, p[2], n0.getHours(), n0.getMinutes(), n0.getSeconds()) - n0;
    window.Date = class DemoDate extends RealDate {
      constructor() { if (arguments.length === 0) super(RealDate.now() + off); else super(...arguments); }
      static now() { return RealDate.now() + off; }
    };
  }

  /* ---- 3. sample data ---- */
  var T = { kcal: 2250, p: 150, c: 265, f: 65 };
  var GARDEN = { PER_BLOOM: 40, WORKOUT: 5, FOOD_DAY: 1, PROTEIN_DAY: 1, WEIGH_IN: 1, CARDIO: 2 }; // mirrors app.js
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  var uidN = 0; function uid() { return 'demo' + (++uidN).toString(36); }

  // meal names here are generic on purpose: no people, brands or takeaway chains.
  var MEALS_TODAY = [
    { name: 'Greek yoghurt, berries and granola', slot: 'Breakfast', kcal: 480, p: 38, c: 52, f: 12,
      nut: { fib: 6, sug: 22, sat: 3.2, na: 210, k: 820, ca: 380, fe: 2, mg: 110, zn: 2.6, vc: 30, va: 120, fol: 48, b12: 1.4, vd: 0.1 } },
    { name: 'Chicken burrito bowl', slot: 'Lunch', kcal: 758, p: 57, c: 83, f: 19,
      nut: { fib: 9, sug: 17, sat: 2.7, na: 439, k: 1489, ca: 240, fe: 4, mg: 191, zn: 4.4, vc: 14, va: 375, fol: 76, b12: 1.2, vd: 0.1 } },
  ];
  var MEALS_FULL = [ // a "hit your protein" day
    { name: 'Overnight oats with banana', slot: 'Breakfast', kcal: 520, p: 34, c: 70, f: 12 },
    { name: 'Chicken and rice bowl', slot: 'Lunch', kcal: 720, p: 55, c: 80, f: 16 },
    { name: 'Salmon, potatoes and greens', slot: 'Dinner', kcal: 760, p: 52, c: 70, f: 24 },
    { name: 'Protein shake', slot: 'Snack', kcal: 240, p: 30, c: 14, f: 4 },
  ];
  var MEALS_LIGHT = [ // a day that misses the protein target
    { name: 'Toast with eggs', slot: 'Breakfast', kcal: 430, p: 24, c: 40, f: 18 },
    { name: 'Veggie pasta', slot: 'Lunch', kcal: 640, p: 26, c: 95, f: 15 },
    { name: 'Turkey tacos', slot: 'Dinner', kcal: 695, p: 52, c: 62, f: 23 },
  ];
  var SESSIONS = {
    Push: [['Barbell bench press', 60, 8], ['Dumbbell shoulder press', 20, 10], ['Tricep pushdown', 25, 12]],
    Pull: [['Seated cable row', 45, 10], ['Face pull', 20, 14], ['Barbell curl', 25, 10]],
    Legs: [['Back squat', 70, 8], ['Romanian deadlift', 60, 10], ['Leg press', 120, 12]],
    Upper: [['Incline dumbbell press', 22, 10], ['Dumbbell row', 24, 10], ['Lateral raise', 8, 14]],
    Lower: [['Hip thrust', 80, 10], ['Bulgarian split squat', 16, 10], ['Calf raise', 40, 15]],
  };
  var WEEKDAY_DAY = { 1: 'Push', 2: 'Pull', 3: 'Legs', 4: 'Upper', 5: 'Lower' };
  var TRAIN_WEEKDAYS = [1, 3, 5]; // Mon, Wed, Fri: the app's weekly goal is 3 workouts

  var rows = [];
  function put(coll, id, data) {
    var i = rows.findIndex(function (r) { return r.collection === coll && r.id === id; });
    if (i < 0) rows.push({ collection: coll, id: id, data: data }); else rows[i].data = data;
  }
  function mealDoc(m) { var o = { id: uid(), name: m.name, slot: m.slot, servings: 1, kcal: m.kcal, p: m.p, c: m.c, f: m.f }; if (m.nut) o.nut = m.nut; return o; }
  function totalsP(meals) { return meals.reduce(function (a, m) { return a + m.p; }, 0); }

  function generate() {
    var today = iso(new Date());
    var streak = Math.max(0, Math.round(num('streak', 40)));
    var cars = Math.max(0, Math.round(num('cars', 5)));
    var bloom = Math.min(39, Math.max(0, Math.round(num('bloom', 35))));
    var loggedToday = q.get('logged') !== '0' && streak > 0;
    var first = loggedToday ? 0 : 1; // how many days back the streak ends
    var days = {}, sessions = {}, weights = {};

    function addSession(date, back) {
      var name = WEEKDAY_DAY[parse(date).getDay()], wk = Math.floor(back / 7);
      sessions[date + '_' + name] = {
        date: date, day: name, note: '',
        exercises: SESSIONS[name].map(function (e) {
          var kg = Math.max(2.5, e[1] - wk * 1.25);
          return { name: e[0], sets: [0, 1, 2].map(function () { return { kg: kg, reps: e[2], partials: 0 }; }) };
        }),
      };
    }
    for (var k = 0; k < streak; k++) {
      var date = addDays(today, -(k + first));
      var isToday = date === today;
      var meals = isToday ? MEALS_TODAY : ((k % 10 === 3 || k % 10 === 7) ? MEALS_LIGHT : MEALS_FULL);
      days[date] = { date: date, meals: meals.map(mealDoc), cardio: [], steps: 6500 + ((k * 937) % 5200) };
      if (!isToday && TRAIN_WEEKDAYS.indexOf(parse(date).getDay()) >= 0) addSession(date, k);
      if (k % 7 === 2) weights[date] = { date: date, kg: Math.round((66.4 - (streak - k) * 0.04 + (k % 3) * 0.1) * 10) / 10 };
    }
    // Older training before the streak began, so "N weeks in a row" is right. One empty day is left between it
    // and the streak so the two don't join up. weeks = how many full past weeks of 3 workouts to show (default 6).
    if (streak > 0) {
      var weeksBack = Math.max(0, Math.round(num('weeks', 6)));
      var mondayOff = (parse(today).getDay() + 6) % 7;
      var earliest = addDays(today, -(mondayOff + weeksBack * 7));
      for (var j = streak + first + 1; addDays(today, -j) >= earliest; j++) {
        var od = addDays(today, -j);
        if (TRAIN_WEEKDAYS.indexOf(parse(od).getDay()) >= 0) addSession(od, j);
      }
    }

    // points the way app.js counts them, then nudge with walks / weigh-ins to land on the requested car count + progress
    function points() {
      var pts = 0;
      Object.keys(days).forEach(function (d) {
        var x = days[d];
        if (x.meals.length) { pts += GARDEN.FOOD_DAY; if (totalsP(x.meals) >= T.p - 10) pts += GARDEN.PROTEIN_DAY; }
        if (x.cardio.length) pts += GARDEN.CARDIO * Math.min(x.cardio.length, 2);
      });
      pts += Object.keys(sessions).length * GARDEN.WORKOUT;
      pts += Object.keys(weights).length * GARDEN.WEIGH_IN;
      return pts;
    }
    var target = cars * GARDEN.PER_BLOOM + bloom;
    var order = Object.keys(days).sort();
    for (var i = 0; points() < target && i < order.length * 2; i++) {
      var dd = days[order[i % order.length]];
      var need = target - points();
      if (need >= 2 && dd.cardio.length < 2) dd.cardio.push({ id: uid(), type: 'Walk', minutes: 30, note: '' });
      else if (need === 1) { var wdte = order[i % order.length]; if (!weights[wdte]) weights[wdte] = { date: wdte, kg: 65.8 }; }
    }

    if (loggedToday) days[today].water = num('water', 0);
    else if (q.get('water')) { days[today] = days[today] || { date: today, meals: [], cardio: [], steps: null }; days[today].water = num('water', 0); }

    var theme = q.get('theme') || 'auto';
    var cfg = {
      onboarded: true,
      theme: theme,
      targets: T,
      profile: { sex: 'female', age: 28, height: 168, activity: 'light', goal: 'recomp' },
      water: { goal: num('goal', 2750), colour: q.get('cup') || 'blush' },
    };
    if (q.get('grow')) { cfg.grow = q.get('grow') === 'flower' ? 'bonsai' : q.get('grow'); cfg.growSoft = q.get('grow'); }
    if (q.get('car')) { cfg.car = q.get('car'); cfg.carSoft = q.get('car'); }
    if (q.get('bonsai')) cfg.bonsai = q.get('bonsai');
    if (q.get('flower')) cfg.flower = q.get('flower');
    if (q.get('cfg')) { try { Object.assign(cfg, JSON.parse(q.get('cfg'))); } catch (e) { /* ignore bad JSON */ } }

    Object.keys(days).forEach(function (d) { put('days', d, days[d]); });
    Object.keys(sessions).forEach(function (s) { put('sessions', s, sessions[s]); });
    Object.keys(weights).forEach(function (w) { put('weights', w, weights[w]); });
    put('config', 'settings', cfg);
  }
  generate();

  /* ---- 4. a tiny in-memory stand-in for the Supabase client the app expects ---- */
  var USER = { id: 'demo-user', email: 'demo@example.com' };
  function builder(table) {
    var st = { op: 'select', filter: null, range: null, payload: null };
    var b = {
      select: function () { return b; },
      order: function () { return b; },
      range: function (a, z) { st.range = [a, z]; return b; },
      upsert: function (v) { st.op = 'upsert'; st.payload = v; return b; },
      delete: function () { st.op = 'delete'; return b; },
      match: function (m) { st.filter = m; return b; },
      eq: function () { return b; },
      then: function (resolve, reject) {
        var out = { data: [], error: null };
        if (table === 'docs') {
          if (st.op === 'select') { var all = rows.slice(); out.data = st.range ? all.slice(st.range[0], st.range[1] + 1) : all; }
          else if (st.op === 'upsert') { [].concat(st.payload).forEach(function (r) { put(r.collection, r.id, r.data); }); }
          else if (st.op === 'delete' && st.filter) { rows = rows.filter(function (r) { return !(r.collection === st.filter.collection && r.id === st.filter.id); }); }
        }
        return Promise.resolve(out).then(resolve, reject);
      },
    };
    return b;
  }
  var client = {
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: { user: USER } }, error: null }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      signInWithPassword: function () { return Promise.resolve({ data: { user: USER }, error: null }); },
      signOut: function () { return Promise.resolve({ error: null }); },
    },
    from: builder,
    storage: { from: function () { return {
      createSignedUrls: function () { return Promise.resolve({ data: [], error: null }); },
      upload: function () { return Promise.resolve({ data: null, error: null }); },
      remove: function () { return Promise.resolve({ data: null, error: null }); },
    }; } },
  };
  window.supabase = { createClient: function () { return client; } };
  window.RECOMP_CONFIG = Object.assign({}, window.RECOMP_CONFIG, { SUPABASE_URL: 'https://demo.invalid', SUPABASE_ANON_KEY: 'demo' });
})();
