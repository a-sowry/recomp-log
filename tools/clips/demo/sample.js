// Demo only: fills the fake account with about five weeks of believable made-up data, for screenshots.
(function () {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const ago = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
  const id = () => Math.random().toString(36).slice(2, 10);
  function build() {
    const rows = {}; const put = (c, k, data) => { rows[c + '/' + k] = { collection: c, id: k, data }; };
    const foods = [
      ['Berry protein oats', 'Breakfast', 455, 42, 52, 8, ['50 g oats', '25 g whey protein', '120 g Greek yoghurt 0%', '150 ml skim milk', '100 g berries']],
      ['Eggs on sourdough', 'Breakfast', 430, 30, 38, 16, ['2 eggs', '100 g egg whites', '80 g sourdough', '30 g spinach']],
      ['Chicken burrito bowl', 'Lunch', 560, 48, 62, 12, ['150 g chicken breast', '160 g brown rice (cooked)', '60 g black beans', '40 g corn', '40 g salsa']],
      ['Tuna sushi bowl', 'Lunch', 540, 40, 64, 14, ['95 g tuna', '170 g white rice (cooked)', '50 g edamame', '40 g avocado', '60 g cucumber']],
      ['Beef & broccoli noodles', 'Dinner', 575, 44, 64, 14, ['150 g lean beef', '200 g rice noodles (cooked)', '120 g broccoli', '15 ml tamari']],
      ['Salmon, rice & greens', 'Dinner', 560, 38, 55, 19, ['140 g salmon', '170 g white rice (cooked)', '100 g broccolini']],
      ['Turkey bolognese pasta', 'Dinner', 545, 45, 58, 12, ['150 g turkey mince', '80 g penne (dry)', '150 g passata', '10 g parmesan']],
      ['Yoghurt, berries & granola', 'Snack', 265, 22, 32, 5, ['200 g Greek yoghurt 0%', '100 g berries', '25 g granola']],
      ['Protein shake & banana', 'Snack', 290, 31, 37, 2, ['30 g whey protein', '250 ml skim milk', '1 banana']],
    ].map(([name, slot, kcal, p, c, f, ing]) => ({ id: id(), name, slot, kcal, p, c, f, serves: 1, ing }));
    const prog = {
      Push: [['Dumbbell bench press', 4, 6, 10, 22], ['Incline Smith press', 3, 8, 10, 15], ['Cable lateral raise', 4, 12, 15, 5], ['Triceps pushdown', 3, 10, 12, 20]],
      Pull: [['Lat pulldown', 4, 8, 10, 45], ['Chest-supported row', 3, 8, 10, 35], ['Face pull', 3, 12, 15, 15], ['Dumbbell curl', 3, 10, 12, 9]],
      Legs: [['Hack squat', 4, 6, 10, 60], ['Romanian deadlift', 3, 8, 10, 50], ['Leg extension', 3, 12, 15, 40], ['Seated calf raise', 3, 12, 15, 30]],
      Upper: [['Machine chest press', 3, 8, 10, 40], ['Seated cable row', 3, 8, 10, 45], ['Shoulder press', 3, 8, 10, 12], ['Hammer curl', 3, 10, 12, 10]],
      Lower: [['Hip thrust', 4, 8, 10, 70], ['Leg press', 3, 10, 12, 110], ['Lying leg curl', 3, 10, 12, 30], ['Walking lunge', 3, 10, 12, 10]],
    };
    put('config', 'settings', {
      onboarded: true, targets: { kcal: 1850, p: 135, c: 190, f: 55 },
      profile: { name: 'Sam', sex: 'female', age: 26, height: 166, weight: 68.2, activity: 'mod', goal: 'recomp' },
      theme: 'auto', garden: true, split: Object.keys(prog).map((name, i) => ({ name, wd: [i + 1] })),
      program: Object.fromEntries(Object.entries(prog).map(([d, xs]) => [d, xs.map(([name, sets, min, max]) => ({ name, sets, min, max }))])),
      foods, hiddenRecipes: ['B1', 'B2', 'B3', 'B4', 'L1', 'L2', 'L3', 'L4', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3', 'S4'],
      supps: [{ id: 's1', name: 'Creatine 5 g' }, { id: 's2', name: 'Vitamin D' }],
    });
    const by = s => foods.filter(f => f.slot === s);
    const DAYS = 35; const weeks = DAYS / 7;
    for (let n = DAYS; n >= 0; n--) {
      const d = ago(n); const date = iso(d); const wd = d.getDay();
      const skip = n > 0 && rnd() < 0.08; if (skip) continue;
      const slots = n === 0 ? ['Breakfast', 'Lunch'] : ['Breakfast', 'Lunch', 'Dinner', 'Snack'].concat(rnd() < 0.35 ? ['Snack'] : []);
      const meals = slots.map(s => { const f = pick(by(s)); return { id: id(), servings: 1, name: f.name, slot: s, kcal: f.kcal, p: f.p, c: f.c, f: f.f, food: f.id, ing: f.ing }; });
      const cardio = n && rnd() < 0.25 ? [{ id: id(), type: pick(['Walk', 'Incline walk', 'Run', 'Cycle']), minutes: pick([20, 30, 40]) }] : [];
      put('days', date, { date, meals, cardio, steps: n === 0 ? 4200 : Math.round(6000 + rnd() * 7000), water: n === 0 ? 1250 : Math.round((1750 + rnd() * 1250) / 250) * 250, supps: n === 0 ? ['s1'] : rnd() < 0.85 ? ['s1', 's2'] : ['s1'] });
      // weigh-ins most mornings, trending gently down; waist once a week
      if (rnd() < 0.7 || n === 0) { const kg = Math.round((70.4 - (DAYS - n) * 0.064 + (rnd() - 0.5) * 0.7) * 10) / 10; const w = { date, kg }; if (wd === 0 || n === 0) w.waist = Math.round((79 - (DAYS - n) * 0.07) * 2) / 2; put('weights', date, w); }
      // training Mon–Fri, missing the odd one, slowly progressing
      const day = Object.keys(prog)[wd - 1];
      if (day && n > 0 && rnd() < 0.88) {
        const wk = (DAYS - n) / 7; const key = date + '_' + day;
        const exercises = prog[day].map(([name, sets, min, max, kg0]) => {
          const step = kg0 >= 40 ? 2.5 : kg0 >= 15 ? 1.25 : 0.5; const kg = Math.round((kg0 + Math.floor(wk * 0.8) * step) / step) * step;
          return { name, sets: Array.from({ length: sets }, (_, i) => ({ kg, reps: Math.max(min, max - i - Math.floor(rnd() * 2)), partials: 0 })) };
        });
        put('sessions', key, { date, day, exercises, note: '' });
      }
    }
    void weeks; return rows;
  }
  window.demoFill = function () {
    let v = null; try { v = localStorage.getItem('rl-demo-v'); localStorage.clear(); if (v) localStorage.setItem('rl-demo-v', v);
      localStorage.setItem('__mockdb', JSON.stringify({ rows: build(), files: {} }));
      localStorage.setItem('rl-auth', JSON.stringify({ user: { id: '11111111-2222-3333-4444-555555555555', email: 'demo@refyne.test' } })); } catch {}
    location.reload();
  };
})();
