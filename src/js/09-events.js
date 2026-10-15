
/* =========================================================
   FEATURE: SPECIAL ORDERS + RUBBER DUCK CONVOYS
   ========================================================= */
feature({ id: 'events', group: 'FUNNY', name: 'Special orders and rubber ducks', desc: 'Buyers make absurd requests with big rewards, and duckling convoys cross the Strait. Hitting a duck costs money.' });

const ORDERS = [
  { id: 'onebarrel', title: 'ONE BARREL, URGENT', bubble: 'JUST 1 BARREL PLS', time: 35, desc: 'needs exactly one barrel. Any delivery there earns a flat bonus.' },
  { id: 'scratch', title: 'NOT A SCRATCH', bubble: 'NO SCRATCHES!', time: 45, desc: 'pays ×3 if you arrive without taking a hit.' },
  { id: 'speed', title: 'SPEED RUN', bubble: 'HURRY HURRY', time: 30, desc: 'pays ×2 if you get there within 30 seconds.' },
  { id: 'serenade', title: 'SERENADE', bubble: 'SING TO ME', time: 45, desc: 'pays ×2 if you honk 3 times on the way.' },
  { id: 'smoky', title: 'SMOKY FLAVOUR', bubble: 'MAKE IT SMOKY', time: 45, desc: 'pays ×2 for crude that arrives on fire (hull under 50%).' }
];
RADIO.ducks = ['Crew: Captain... are those ducks?', 'Navigator: Duck crossing ahead. I repeat, DUCKS.', 'Crew: Mother duck has right of way, legally.'];
RADIO.order = ['Broker: Weird order coming in. Very weird. Very lucrative.', 'Broker: A buyer has a special request. Do not ask why.'];
Snd.squeak = function () {
  if (!this.ok('squeak', 0.08)) return;
  this.tone(1050, 0.11, 'sine', 0.12, 1750); this.tone(1500, 0.13, 'triangle', 0.08, 900, 0.09);
};
const EV = { order: null, orderT: 20, duckT: 25, ducks: [], honks: 0 };

onEvt('levelStart', () => {
  EV.order = null; EV.ducks = []; EV.honks = 0;
  EV.orderT = rand(14, 22); EV.duckT = rand(16, 28);
});
const evOn = () => G && !G.attract && feat('events') && G.level >= 2;

onEvt('update', dt => {
  if (!evOn()) return;
  if (G.mode === 'play') {
    if (EV.order) {
      EV.order.t -= dt;
      if (EV.order.t <= 0) { popup(G.P.x, G.P.y - 60, 'ORDER EXPIRED', C.ink2, 18); EV.order = null; EV.orderT = rand(22, 34); }
    } else if ((EV.orderT -= dt) <= 0) startOrder();
    if ((EV.duckT -= dt) <= 0) { EV.duckT = rand(32, 46); if (!EV.ducks.length) spawnDucks(); }
  }
  updateDucks(dt);
});
function startOrder() {
  const o = pick(ORDERS), g = pick(GATES);
  EV.order = { o, g, t: o.time, hits0: G.hits, honks0: EV.honks };
  say('SPECIAL ORDER', o.title + ' · ' + g.name, C.amber, 2.2);
  setHint('<b>' + g.name + '</b> ' + o.desc, 6);
  radio('order'); Snd.alarm();
}
onEvt('honk', () => { EV.honks++; });
onEvt('preDeliver', (g, ex) => {
  const e = EV.order;
  if (!evOn() || !e || e.g !== g) return;
  const P = G.P, id = e.o.id;
  let ok = true;
  if (id === 'scratch') ok = G.hits === e.hits0;
  else if (id === 'serenade') ok = EV.honks - e.honks0 >= 3;
  else if (id === 'smoky') ok = P.hull / P.maxHull < 0.5;
  EV.order = null; EV.orderT = rand(24, 36);
  if (!ok) { popup(P.x, P.y - 72, 'ORDER FAILED · BUYER SIGHS', C.ink2, 20); return; }
  if (id === 'onebarrel') ex.flat += 15 + G.level * 3;
  else ex.mult *= id === 'scratch' ? 3 : 2;
  popup(P.x, P.y - 74, 'ORDER FILLED: ' + e.o.title, C.amber, 24);
  Snd.power();
});
onEvt('chips', list => {
  const e = EV.order;
  if (evOn() && e) list.push('<span class="chip warn">ORDER ' + e.g.name + ' · ' + Math.ceil(e.t) + 's</span>');
});

/* ---------- ducks ---------- */
function spawnDucks() {
  const P = G.P, fa = Math.hypot(P.vx, P.vy) > 40 ? Math.atan2(P.vy, P.vx) : P.a;
  for (let k = 0; k < 24; k++) {
    const side = Math.random() < 0.5 ? 1 : -1, ahead = rand(380, 620), off = rand(420, 560);
    const x = P.x + Math.cos(fa) * ahead + Math.cos(fa + side * Math.PI / 2) * off;
    const y = P.y + Math.sin(fa) * ahead + Math.sin(fa + side * Math.PI / 2) * off;
    if (x < 60 || y < 60 || x > WW - 60 || y > WH - 60 || isLand(x, y) || coastDist(x, y) < 50) continue;
    const a = fa - side * Math.PI / 2, n = randi(7, 11);
    for (let i = 0; i < n; i++) EV.ducks.push({ x: x - Math.cos(a) * i * 30, y: y - Math.sin(a) * i * 30, a, big: i === 0, t: rand(5), hit: false, z: 0, spin: 0, vx: 0, vy: 0, life: 0 });
    say('DUCK CROSSING', 'MIND THE DUCKLINGS', '#B98A12', 1.8);
    radio('ducks'); Snd.squeak();
    return;
  }
}
function updateDucks(dt) {
  if (!EV.ducks.length) return;
  const P = G.P;
  for (let i = 0; i < EV.ducks.length; i++) {
    const d = EV.ducks[i];
    d.t += dt;
    if (d.hit) { d.life += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z = Math.sin(Math.min(1, d.life / 1.2) * Math.PI) * 1.2; d.spin += dt * 12; continue; }
    let sp = 52;
    if (i === 0) {
      d.a += Math.sin(d.t * 0.7) * 0.25 * dt;
      if (isLand(d.x + Math.cos(d.a) * 70, d.y + Math.sin(d.a) * 70)) d.a += 1.8 * dt;
    } else {
      const lead = EV.ducks[i - 1], gap = lead.big ? 36 : 28, tx = lead.x - Math.cos(lead.a) * gap, ty = lead.y - Math.sin(lead.a) * gap, dd = Math.hypot(tx - d.x, ty - d.y);
      if (dd > 1) d.a = Math.atan2(ty - d.y, tx - d.x);
      sp = clamp(dd * 2.2, 0, 90);
    }
    d.x += Math.cos(d.a) * sp * dt; d.y += Math.sin(d.a) * sp * dt;
    if (G.mode === 'play' && !P.dead && shipDist(d.x, d.y) < (d.big ? 15 : 9)) hitDuck(d, true);
    for (const m of G.missiles) if (!m.dead && d2(m.x, m.y, d.x, d.y) < 15 * 15) { m.dead = true; explode(m.x, m.y, 36, { dmg: 22, src: 'missile' }); hitDuck(d, false); break; }
  }
  EV.ducks = EV.ducks.filter(d => !(d.hit && d.life > 1.2));
  const lead = EV.ducks.find(d => !d.hit);
  if (!lead || d2(lead.x, lead.y, P.x, P.y) > 2300 * 2300 || lead.t > 60) EV.ducks = EV.ducks.filter(d => d.hit);
}
function hitDuck(d, byShip) {
  d.hit = true; d.life = 0;
  const P = G.P, a = Math.atan2(d.y - P.y, d.x - P.x);
  d.vx = Math.cos(a) * 140; d.vy = Math.sin(a) * 140;
  Snd.squeak();
  if (!byShip) { popup(d.x, d.y - 20, 'QUACK!', '#B98A12', 20); return; }
  const fine = d.big ? 3 : 1;
  G.bonus -= fine;
  popup(d.x, d.y - 24, (d.big ? 'YOU HIT MOTHER DUCK' : 'DUCK FOUL') + ' -' + fmtMoney(fine), C.hull, d.big ? 22 : 18);
}
onEvt('drawSea', V => {
  if (!evOn()) return;
  for (const d of EV.ducks) if (inView(V, d.x, d.y, 60)) drawDuck(d);
  const e = EV.order;
  if (e && G.mode === 'play') {
    const g = e.g, ax = g.x - (g.x >= WW - 1 ? 70 : 0), ay = g.y - (g.y >= WH - 1 ? 70 : 0);
    if (inView(V, ax, ay, 300)) bubbleText(ax, ay - 66, e.o.bubble + ' · ' + Math.ceil(e.t) + 's', '#9A6408');
  }
});
function drawDuck(d) {
  const s = (d.big ? 2.1 : 1.25) * (1 + d.z * 0.7);
  ctx.save(); ctx.translate(d.x, d.y - d.z * 30); ctx.rotate(d.a + d.spin); ctx.scale(s, s);
  if (!d.hit) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(-1, 0, 12.5 + Math.sin(d.t * 3) * 1.4, 9, 0, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = '#F7CF3B'; ctx.strokeStyle = '#B98A12'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-10, -2.5); ctx.lineTo(-14.5, -4.5); ctx.lineTo(-10.5, 2.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-2, 0, 9.5, 6.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(5.5, 0, 4.9, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F07B1C'; ctx.beginPath(); ctx.moveTo(9.6, -1.7); ctx.lineTo(13.8, 0); ctx.lineTo(9.6, 1.7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(6.6, -2.3, 0.95, 0, TAU); ctx.arc(6.6, 2.3, 0.95, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-3.5, -2.3, 4.2, 1.6, -0.2, 0, TAU); ctx.fill();
  ctx.restore();
}
