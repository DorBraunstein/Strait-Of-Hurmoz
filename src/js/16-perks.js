
/* =========================================================
   FEATURE: PERK PICKS — after a win, choose 1 of 3 silly perks for the next level
   ========================================================= */
feature({ id: 'perks', group: 'ADDICTIVE', name: 'Perk picks', desc: 'After each win, pick 1 of 3 silly perks (shockwave horn, greasy hull, glass cannon, ...) that apply to the next level until you beat it.' });

const PERKS = [
  { id: 'slowmo', name: 'Slow-Mo Missiles', desc: 'Cruise missiles fly 25% slower.', apply: () => { G.mod.missileSpd = 0.75; } },
  { id: 'pizza2', name: 'Double Pizza', desc: 'Pizza drones come twice as often and heal twice as much.', apply: () => { G.mod.pizzaHeal = 2; G.mod.pizzaRate = 0.5; G.cfg.pizza = true; G.timers.pizza = 6; } },
  { id: 'shock', name: 'Shockwave Horn', desc: 'Every honk knocks drones and missiles out of the sky nearby.', apply: () => { G.mod.shockHorn = true; } },
  { id: 'greasy', name: 'Greasy Hull', desc: 'Boarders slip right off. Every single time.', apply: () => { G.mod.greasy = true; } },
  { id: 'lucky', name: 'Lucky Rubber Duck', desc: 'Start with two extra Bubble Wrap charges.', apply: () => { G.P.bubble += 2; } },
  { id: 'pumps', name: 'Bulk Discount', desc: 'Pumps load twice as fast.', apply: () => { G.P.pump *= 2; } },
  { id: 'turbo', name: 'Turbo Tuesday', desc: '18% more top speed, any day of the week.', apply: () => { G.P.maxSpd *= 1.18; } },
  { id: 'flares', name: 'Flare Party', desc: 'Three extra flares.', apply: () => { G.P.flares += 3; } },
  { id: 'insider', name: 'Insider Trading', desc: 'Brent starts $18 higher. Totally legal.', apply: () => { G.cfg.price += 18; } },
  { id: 'magnet', name: 'Crate Magnet', desc: 'Nearby crates drift toward you.', apply: () => { G.mod.magnet = true; } },
  { id: 'hotstreak', name: 'Hot Streak', desc: 'HOT deals last twice as long and pay ×2.5.', apply: () => { G.mod.hotTime = 2; G.mod.hotMult = 2.5; } },
  { id: 'overtime', name: 'Overtime', desc: '20 more seconds on the clock.', apply: () => { G.timeLeft += 20; G.cfg.time += 20; } },
  { id: 'glass', name: 'Glass Cannon', desc: 'Double pay, half the hull. What could go wrong?', apply: () => { G.payMult = (G.payMult || 1) * 2; G.P.maxHull = Math.max(20, Math.round(G.P.maxHull / 2)); G.P.hull = G.P.maxHull; } },
  { id: 'fanclub', name: 'Fan Club', desc: 'Close calls pay triple.', apply: () => { G.mod.nearMult = 3; } }
];
const perkById = id => PERKS.find(p => p.id === id);
const pkOn = () => G && !G.attract && feat('perks') && !G.cfg.daily;

onEvt('levelStart', () => {
  G.perk = null;
  if (!pkOn() || !save.perk || save.perk.level !== G.level) return;
  const p = perkById(save.perk.id);
  if (!p) return;
  p.apply(); G.perk = p;
  setTimeout(() => { if (G && G.perk === p && G.mode === 'play') say('PERK: ' + p.name.toUpperCase(), p.desc.toUpperCase(), C.magenta, 2.2); }, 1400);
});
onEvt('levelEnd', r => {
  if (!pkOn() || !r.win || !save.perk || save.perk.level !== G.level) return;
  save.perk = null; persist();
});
onEvt('chips', list => { if (pkOn() && G.perk) list.push('<span class="chip good">PERK · ' + G.perk.name.toUpperCase() + '</span>'); });
onEvt('honk', () => {
  if (!pkOn() || !G.mod.shockHorn) return;
  const P = G.P;
  let n = 0;
  for (const m of G.missiles) if (!m.dead && d2(m.x, m.y, P.x, P.y) < 260 * 260) { m.dead = true; boomFx(m.x, m.y, 28); n++; }
  for (const d of G.drones) if (!d.dead && !d.pizza && d2(d.x, d.y, P.x, P.y) < 260 * 260) { d.dead = true; boomFx(d.x, d.y, 24); n++; }
  G.rings.push({ x: P.x, y: P.y, r0: 20, r1: 280, t: 0, life: 0.5, w: 12, col: '255,255,255' });
  addShake(8);
  if (n) { Snd.boom(0.8, P.x, P.y); popup(P.x, P.y - 60, 'SHOCKWAVE ×' + n, C.magenta, 22); }
});
onEvt('update', dt => {
  if (!pkOn() || !G.mod.magnet || G.mode !== 'play') return;
  const P = G.P;
  for (const c of G.crates) {
    const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy);
    if (d < 340 && d > 1) { c.x += dx / d * 170 * dt; c.y += dy / d * 170 * dt; }
  }
});

/* ---------- results screen: pick a perk ---------- */
function perkOffer(level) {
  if (!save.perkOffer || save.perkOffer.level !== level) {
    const pool = PERKS.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    save.perkOffer = { level, ids: pool.slice(0, 3).map(p => p.id) };
    persist();
  }
  return save.perkOffer.ids.map(perkById).filter(Boolean);
}
onEvt('port', r => {
  const box = $('pPerks');
  box.hidden = true;
  if (!feat('perks') || !G || G.cfg.daily) return;
  box.textContent = '';
  const h = document.createElement('h3'); h.className = 'sec';
  if (!r.win) {
    if (save.perk && save.perk.level === G.level && perkById(save.perk.id)) {
      h.textContent = 'PERK KEPT FOR YOUR RETRY: ' + perkById(save.perk.id).name.toUpperCase();
      box.append(h); box.hidden = false;
    }
    return;
  }
  const next = save.level;
  h.textContent = 'PICK A PERK FOR LEVEL ' + next;
  const row = document.createElement('div'); row.className = 'perk-row';
  const render = () => {
    row.textContent = '';
    for (const p of perkOffer(next)) {
      const sel = save.perk && save.perk.level === next && save.perk.id === p.id;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'perk' + (sel ? ' sel' : '');
      b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      const nm = document.createElement('b'); nm.textContent = p.name;
      const ds = document.createElement('span'); ds.textContent = p.desc;
      b.append(nm, ds);
      b.addEventListener('click', e => { Snd.init(); Snd.buy(); save.perk = { id: p.id, level: next }; persist(); render(); if (e.detail > 0) b.blur(); });
      row.append(b);
    }
  };
  render();
  box.append(h, row); box.hidden = false;
});
