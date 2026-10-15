
/* =========================================================
   GAME — state, player, economy, damage
   ========================================================= */
let G = null;
const SHIP_NAMES = ['CRUDE AWAKENING', 'OIL BE BACK', 'EVER GIVEN UP', 'BOATY McBOATFACE', 'PIER PRESSURE', 'SEAS THE DAY', 'KNOT TODAY', 'SIR SINKS-A-LOT', 'CTRL+SEA', 'FUEL ME ONCE', 'BARREL ROLL', 'TANKY McTANKFACE', 'LIQUID ASSETS', 'HULL YEAH', 'SEA-LEBRITY', 'UNSINKABLE II', 'SLICK RICK', 'WAVE GOODBYE', 'NAUTI BUOY', 'DRIFT CITY', 'PETROL PETAL', 'MAYDAY MAYBE'];
const RADIO = {
  start: ['Tanker, this is everyone. Good luck.', 'Head office: "Just go faster."', 'Crew: Snacks loaded. Oil not yet.', 'Insurer: We are watching. Nervously.'],
  boat: ['Crew: Speedboat inbound! They look friendly. Too friendly.', 'Crew: Small boat, big attitude, 3 o\'clock.', 'Crew: Visitors! Nobody ordered visitors.'],
  boarded: ['Boarders: Hello friend! Nice oil you have.', 'Crew: They are on deck! Zig-zag or HONK!', 'Boarders: We would like to speak to your oil.'],
  shaken: ['Crew: Boarders went for a swim!', 'Crew: And stay off!', 'Boarders: Okay okay, we leave. Rude.'],
  drone: ['Crew: Drone overhead. No wait, that one is a seagull. The other one is a drone.', 'Crew: Something is buzzing and it is not my phone.'],
  missile: ['Crew: MISSILE LAUNCH! Turn hard or pop flares!', 'Radar: Fast mover, sea skimming, rude.', 'Crew: Missile! Why is it always a missile?'],
  ball: ['Crew: Something big is falling. It is not Santa.', 'Radar: Ballistic inbound. Leave the red circle!', 'Crew: Incoming from the sky. Very incoming.'],
  sub: ['Sonar: Periscope! Watch the dashed line!', 'Sonar: Ping. Ping. Uh oh.'],
  swarm: ['Crew: That is a lot of drones. Like, a LOT.', 'Crew: Drone swarm! It is a whole wedding party!'],
  hit: ['Engineer: That was the good hull!', 'Crew: Ow.', 'Insurer: Premium going up!', 'Engineer: I can fix that. Probably.', 'Crew: The ship is now 10% more holes.'],
  low: ['Crew: Captain, the ship is now mostly a suggestion.', 'Engineer: She cannot take much more! Neither can I!'],
  deliver: ['Buyer: Pleasure doing business. Please leave.', 'Buyer: Smells like money. And diesel.', 'Head office: Great. Now do it again.', 'Buyer: Is that a hole in your hull? Not my problem.'],
  pizza: ['Crew: PIZZA! Morale restored!', 'Crew: Extra cheese, extra hull!'],
  flare: ['Crew: Pretty lights!', 'Crew: Flares out! Missiles love a light show.'],
  near: ['Crew: I saw my life flash before my eyes. It was mostly boats.', 'Crew: Was that close? That felt close.', 'Navigator: Totally planned that.'],
  aground: ['Navigator: In my defense, the map is old.', 'Crew: That was sand. We hit sand.'],
  hot: ['Broker: {g} pays DOUBLE for the next 22 seconds!', 'Broker: {g} is desperate. Double price, move it!'],
  full: ['Crew: Tanks full. Let us get out of here.', 'Crew: She is heavy and happy. To the Strait!'],
  nitro: ['Engineer: I removed the speed limiter. Also the brakes.'],
  dove: ['Diplomat: Has everyone tried talking?', 'Crew: The missiles turned into birds?! Diplomacy works!']
};
const TICKER = [
  'Oil traders refresh their screens 4,000 times per second.', 'Experts confirm the Strait of Hormuz is still narrow.', 'Insurance underwriter faints, recovers, faints again.',
  'Local dolphin rates tanker driving 2 out of 10.', 'Drone operator insists he was aiming at a seagull.', 'Seagull union demands hazard pay.',
  'Analysts: "Oil goes up when things explode." More at 11.', 'Shipping CEO asks captains: "Have you tried going faster?"', 'Captain\'s mom calls to ask if he is wearing his life jacket.',
  'Pizza delivery times in the Strait now "mostly under one war".', 'Sea mine reportedly "just floating around, no plans".', 'Ballistic missile seen "passing through, very fast, no comment".',
  'Fisherman unimpressed by 300-metre tanker, catches tuna.', 'Speedboat crew orders 300-metre tanker to "pull over".', 'Crew votes to rename ship "The Unsinkable (Probably)".',
  'Gas prices in Ohio react to a boat nobody there has heard of.', 'Brent crude asks everyone to please calm down.', 'War risk premium reaches "lol".',
  'Shipping company replaces safety manual with a single word: "Hurry".', 'Study: 9 out of 10 tankers prefer not to be on fire.'
];
const HEADLINES = {
  win: ['Analysts stunned as tanker does its job', 'Captain demands raise, receives pizza instead', 'Crude arrives on time, world shrugs, prices drop $0.03', 'Tanker survives Strait, insurance company sends flowers', 'Oil delivered. Crew demands a nap.', 'Hero captain refuses to say how many mines were involved'],
  sunk: ['Captain turns $90M tanker into artificial reef', 'Fish thrilled with new luxury apartment complex', 'Insurance company changes its phone number', 'Brent jumps as tanker becomes submarine', 'Marine biologists thank captain for the new reef'],
  time: ['Head office: "We expected more oil, less sightseeing"', 'Buyers switch to candles while tanker takes the scenic route', 'Captain cites "vibes" for missed quota', 'Oil still in tanker, tanker still in Strait, everyone confused']
};
const TRAFFIC_HIT = ['THANKS A LOT!', 'MY PAINT!', 'NOT AGAIN!', 'HEY!!', 'OUCH!', 'WRONG SHIP!'];
const TRAFFIC_BUMP = ['WATCH IT!', 'NICE PARKING!', 'LEARN TO STEER!', 'RUDE.', 'HEY!'];
const TRAFFIC_HONK = ['HONK HONK!', 'BEEP BEEP!', 'RUDE.', 'WE HEARD YOU.', 'HONK BACK!'];

function newGame(level, attract, opts) {
  opts = opts || {};
  const cfg = opts.cfg || levelCfg(level);
  const [sx, sy] = P_(55.5, 26.0);
  LOADOUT = opts.loadout || null;
  G = {
    level, cfg, attract: !!attract, mode: attract ? 'attract' : 'play',
    t: 0, timeLeft: cfg.time, earned: 0, bonus: 0, deliveries: 0, dmg: 0, hits: 0, near: 0, kills: 0, ff: 0,
    chaos: 0, price: cfg.price, prevPrice: cfg.price, priceAgo: cfg.price, priceT: 0,
    hot: null, hotT: 7, combo: 0, comboT: 0,
    mines: [], boats: [], drones: [], missiles: [], balls: [], torps: [], subs: [], traffic: [], crates: [], flares: [],
    parts: [], pops: [], slicks: [], rings: [], tracers: [], lights: [], msgs: [],
    timers: {}, shake: 0, flash: 0, flashCol: '230,40,30',
    cam: { x: sx, y: sy }, route: [], routeT: 0, routeTarget: null,
    radio: null, radioT: 0, radioGap: 0, hint: null, hintStage: 0, endT: 0, result: null, fullShown: false,
    P: makePlayer(sx, sy), attractT: 0
  };
  LOADOUT = null;
  const c = cfg, keepRandom = Math.random;
  if (opts.seed) Math.random = mulberry(opts.seed); // same mines and traffic for everyone (Daily Strait)
  try {
    if (!attract) for (let i = 0; i < c.mines; i++) spawnMine(false);
    for (let i = 0, n = attract ? 9 : c.traffic; i < n; i++) spawnTraffic(true);
  } finally { Math.random = keepRandom; }
  for (const k of ['boat', 'drone', 'cruise', 'ball', 'torp', 'swarm', 'drift', 'amb']) if (c[k]) G.timers[k] = c[k] * rand(0.25, 0.5) + 1.2;
  G.timers.crate = 7; G.timers.pizza = attract ? 3 : rand(16, 26);
  if (!attract) {
    say(c.label || 'LEVEL ' + level, c.name, C.amber, 2.6);
    radio('start');
    if (level === 1) setHint(isTouch() ? 'Drag anywhere to steer. Follow the <b>magenta line</b> to an <b>oil field</b>.' : 'Steer with <b>WASD / arrows</b> or hold the mouse. Follow the <b>magenta line</b> to an <b>oil field</b>.', 9);
    else setHint(c.tip, 5);
  }
  updateRoute();
  emit('levelStart', G);
  return G;
}
function makePlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, a: -0.35, av: 0, hull: upVal('hull'), maxHull: upVal('hull'), cargo: 0, cap: upVal('tank'), pump: upVal('pump'),
    maxSpd: upVal('engine'), turn: upVal('rudder'), flares: upVal('flare'), bubble: upVal('bubble'), ciws: upVal('ciws'),
    nitro: 0, boarders: 0, shakeAcc: 0, inv: 0, dead: false, sinkT: 0, honkCD: 0, flareCD: 0, ciwsCD: 1, loading: null,
    thr: 0, trail: [], trailT: 0, smokeT: 0, groundT: 0, honkT: 0, aground: 0
  };
}

/* ---------- small helpers ---------- */
function part(kind, x, y, vx, vy, life, size, extra) {
  if (G.parts.length > 1500) return null;
  const p = { kind, x, y, vx, vy, t: 0, life, size, grow: 0, drag: 0 };
  if (extra) Object.assign(p, extra);
  G.parts.push(p); return p;
}
function popup(x, y, text, col, size) {
  let n = 0;
  for (const p of G.pops) if (p.t < 0.6 && Math.abs(p.x - x) < 120 && Math.abs(p.y0 - y) < 60) n++;
  G.pops.push({ x, y: y - n * 26, y0: y, text, col: col || C.ink, size: size || 20, t: 0, life: 1.4 });
}
function say(title, sub, col, life) { G.msgs.push({ title, sub: sub || '', col: col || C.ink, t: 0, life: life || 1.8 }); if (G.msgs.length > 2) G.msgs.shift(); }
function setHint(html, secs) { G.hint = { html, t: secs || 4 }; }
function radio(key, g) {
  if (!G || G.attract) return;
  const lines = RADIO[key]; if (!lines) return;
  if (G.radioGap > 0 && key !== 'boarded' && key !== 'ball' && key !== 'missile') return;
  G.radio = pick(lines).replace('{g}', g || ''); G.radioT = 3.2; G.radioGap = 1.6;
}
function addShake(v) { G.shake = Math.min(34, Math.max(G.shake, v * (REDUCED ? 0.25 : 1))); }
function isTouch() { return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches); }
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
function shipDist(x, y) { // distance from point to player hull edge
  const P = G.P, c = Math.cos(P.a), s = Math.sin(P.a);
  return segDist(x, y, P.x - c * 25, P.y - s * 25, P.x + c * 25, P.y + s * 25) - 7.5;
}
function trafDist(t, x, y) {
  const c = Math.cos(t.a), s = Math.sin(t.a), h = t.len / 2 - 6;
  return segDist(x, y, t.x - c * h, t.y - s * h, t.x + c * h, t.y + s * h) - 7;
}
function trailPush(o, x, y, gap, keep) {
  const tr = o.trail, last = tr[tr.length - 1];
  if (!last || G.t - last.t >= gap) tr.push({ x, y, t: G.t });
  while (tr.length && G.t - tr[0].t > keep) tr.shift();
}
function total() { return G.earned + G.bonus; }
function addBonus(v, x, y, label, col) {
  if (G.mode !== 'play') return;
  G.bonus += v;
  popup(x, y, (label ? label + ' ' : '') + '+' + fmtMoney(v), col || C.magenta, 18);
  checkQuota();
}
function checkQuota() { if (G.mode === 'play' && !G.cfg.scoreAttack && total() >= G.cfg.quota) winLevel(); }

/* ---------- player ---------- */
function updatePlayer(dt) {
  const P = G.P;
  P.inv = Math.max(0, P.inv - dt); P.honkCD = Math.max(0, P.honkCD - dt); P.flareCD = Math.max(0, P.flareCD - dt);
  P.nitro = Math.max(0, P.nitro - dt); P.honkT = Math.max(0, P.honkT - dt); P.aground = Math.max(0, P.aground - dt);
  if (P.dead) {
    P.sinkT += dt; P.vx *= Math.exp(-1.5 * dt); P.vy *= Math.exp(-1.5 * dt); P.x += P.vx * dt; P.y += P.vy * dt; P.a += dt * 0.25;
    if (Math.random() < dt * 18) part('bubble', P.x + rand(-30, 30), P.y + rand(-14, 14), 0, 0, rand(0.6, 1.2), rand(3, 7));
    if (Math.random() < dt * 8) part('smoke', P.x + rand(-20, 20), P.y + rand(-10, 10), rand(-10, 10), rand(-10, 10), rand(1.5, 2.5), rand(10, 18), { grow: 1.6, drag: 1 });
    return;
  }
  const inp = (G.attract || G.mode !== 'play') ? (G.attract ? autopilot() : { dx: 0, dy: 0, thr: 0 }) : readInput();
  const boardSlow = Math.pow(0.66, P.boarders);
  const maxSpd = P.maxSpd * (P.nitro > 0 ? 1.45 : 1) * boardSlow * (P.cargo > 0 ? 1 - 0.06 * P.cargo / P.cap : 1);
  const spd = Math.hypot(P.vx, P.vy);
  let av = 0;
  P.thr = inp.thr;
  if (inp.thr > 0) {
    const want = Math.atan2(inp.dy, inp.dx), d = angDiff(P.a, want);
    const tr = P.turn * (0.72 + 0.28 * Math.min(1, spd / 140)) * (P.nitro > 0 ? 1.1 : 1);
    const da = clamp(d, -tr * dt, tr * dt);
    P.a += da; av = da / dt;
    const align = 0.42 + 0.58 * Math.max(0, Math.cos(d));
    const acc = (P.nitro > 0 ? 560 : 270) * inp.thr * align;
    P.vx += Math.cos(P.a) * acc * dt; P.vy += Math.sin(P.a) * acc * dt;
  }
  P.av = lerp(P.av, av, 0.3);
  const fx = Math.cos(P.a), fy = Math.sin(P.a);
  let fwd = P.vx * fx + P.vy * fy, lat = -P.vx * fy + P.vy * fx;
  lat *= Math.exp(-3.2 * dt);
  fwd *= Math.exp(-(inp.thr > 0 ? 0.12 : 0.55) * dt);
  if (fwd > maxSpd) fwd = lerp(fwd, maxSpd, 1 - Math.exp(-5 * dt));
  if (fwd < -50) fwd = -50;
  P.vx = fx * fwd - fy * lat; P.vy = fy * fwd + fx * lat;
  P.x += P.vx * dt; P.y += P.vy * dt;
  // chart edge
  if (P.x < 24) { P.x = 24; P.vx = Math.abs(P.vx) * 0.3; } if (P.x > WW - 24) { P.x = WW - 24; P.vx = -Math.abs(P.vx) * 0.3; }
  if (P.y < 24) { P.y = 24; P.vy = Math.abs(P.vy) * 0.3; } if (P.y > WH - 24) { P.y = WH - 24; P.vy = -Math.abs(P.vy) * 0.3; }
  collideLand(P, dt);
  // boarding shake-off meter
  if (P.boarders > 0) P.shakeAcc += Math.abs(P.av) * dt; else P.shakeAcc = 0;
  P.shakeAcc *= Math.exp(-0.5 * dt);
  // wake trail
  trailPush(P, P.x - fx * 26, P.y - fy * 26, 0.05, 1.5);
  if (P.nitro > 0 && Math.random() < dt * 40) part('fire', P.x - fx * 30 + rand(-3, 3), P.y - fy * 30 + rand(-3, 3), -fx * 120 + rand(-30, 30), -fy * 120 + rand(-30, 30), 0.3, rand(5, 8), { grow: 1.2, drag: 2 });
  // damage smoke
  const hp = P.hull / P.maxHull;
  if (hp < 0.5 && Math.random() < dt * (hp < 0.25 ? 16 : 7)) {
    part('smoke', P.x + fx * rand(-20, 10), P.y + fy * rand(-20, 10), rand(-8, 8) - P.vx * 0.2, rand(-8, 8) - P.vy * 0.2, rand(1.3, 2.2), rand(7, 12), { grow: 1.8, drag: 0.8 });
    if (hp < 0.25 && Math.random() < 0.5) part('fire', P.x + fx * rand(-18, 14), P.y + fy * rand(-18, 14) + rand(-4, 4), 0, 0, 0.35, rand(5, 8), { grow: 1.1 });
  }
  if (G.mode !== 'play' && !G.attract) return;
  // loading
  P.loading = null;
  for (const z of PICKUPS) if (d2(P.x, P.y, z.x, z.y) < z.r * z.r) { P.loading = z; break; }
  if (P.loading && P.cargo < P.cap - 1e-4) {
    P.cargo = Math.min(P.cap, P.cargo + P.pump * dt);
    if (!G.attract) Snd.glug();
    if (Math.random() < dt * 14) part('oil', P.x + rand(-18, 18), P.y + rand(-5, 5), 0, 0, 0.5, rand(2, 4));
    if (!G.attract && G.level === 1 && G.hintStage === 0) { G.hintStage = 1; setHint('Loading crude... stay inside the circle until the <b>CARGO</b> bar is full.', 6); }
    if (P.cargo >= P.cap - 1e-4 && !G.fullShown) {
      G.fullShown = true;
      if (!G.attract) {
        say('TANKS FULL', 'SAIL OUT THROUGH THE STRAIT', C.magenta, 1.8); radio('full'); Snd.power(); emit('full');
        if (G.level === 1 && G.hintStage < 2) { G.hintStage = 2; setHint('Tanks full! Follow the line <b>out through the Strait</b> to a buyer at the edge of the chart.', 9); }
      }
    }
  }
  if (P.cargo < P.cap * 0.95) G.fullShown = false;
  for (const g of GATES) if (P.cargo > 0.02 && d2(P.x, P.y, g.x, g.y) < g.r * g.r) deliver(g);
}
function shipTouchesLand(P) {
  const c = Math.cos(P.a), s = Math.sin(P.a);
  for (const [lx, ly] of [[27, 0], [14, 6], [14, -6], [0, 7], [0, -7], [-14, 6], [-14, -6], [-27, 0]]) if (isLand(P.x + c * lx - s * ly, P.y + s * lx + c * ly)) return true;
  return false;
}
function collideLand(P) {
  const c = Math.cos(P.a), s = Math.sin(P.a);
  let nx = 0, ny = 0, hit = false;
  for (const [lx, ly] of [[27, 0], [14, 6], [14, -6], [0, 7], [0, -7], [-14, 6], [-14, -6], [-27, 0]]) {
    const wx = P.x + c * lx - s * ly, wy = P.y + s * lx + c * ly;
    if (!isLand(wx, wy)) continue;
    hit = true;
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, ox = Math.cos(a), oy = Math.sin(a); if (!isLand(wx + ox * 22, wy + oy * 22)) { nx += ox; ny += oy; } }
  }
  if (!hit) return;
  let nl = Math.hypot(nx, ny);
  if (nl < 0.01) { nx = -P.vx; ny = -P.vy; nl = Math.hypot(nx, ny) || 1; }
  nx /= nl; ny /= nl;
  for (let i = 0; i < 16 && shipTouchesLand(P); i++) { P.x += nx * 3; P.y += ny * 3; }
  const vn = P.vx * nx + P.vy * ny;
  if (vn < 0) { P.vx -= 1.4 * vn * nx; P.vy -= 1.4 * vn * ny; }
  P.vx *= 0.92; P.vy *= 0.92;
  if (-vn > 150 && P.aground <= 0 && G.mode === 'play') {
    P.aground = 1.2; hurt(Math.min(14, -vn / 30), P.x, P.y, 'ground', true);
    say('RAN AGROUND', '', C.hull, 1.2); radio('aground'); ach('aground'); emit('aground');
    for (let i = 0; i < 12; i++) part('sand', P.x + nx * -20, P.y + ny * -20, rand(-90, 90), rand(-90, 90), 0.6, rand(2, 4), { drag: 3 });
  }
}
function autopilot() {
  const P = G.P;
  let tgt = G.route[0];
  if (!tgt) return { dx: 0, dy: 0, thr: 0 };
  if (G.route.length > 1 && d2(P.x, P.y, tgt[0], tgt[1]) < 90 * 90) tgt = G.route[1];
  if (P.loading && P.cargo < P.cap - 0.01) { const z = P.loading; const dx = z.x - P.x, dy = z.y - P.y, l = Math.hypot(dx, dy) || 1; return { dx: dx / l, dy: dy / l, thr: 0.25 }; }
  const dx = tgt[0] - P.x, dy = tgt[1] - P.y, l = Math.hypot(dx, dy) || 1;
  return { dx: dx / l, dy: dy / l, thr: 0.75 };
}

/* ---------- damage, explosions ---------- */
function hurt(amount, x, y, src, quiet) {
  const P = G.P;
  if (P.dead || G.mode !== 'play') return false;
  if (P.inv > 0) return false;
  if (P.bubble > 0 && src !== 'ground') {
    P.bubble--; P.inv = 0.6; Snd.pop(); popup(P.x, P.y - 30, 'POP! BUBBLE WRAP', C.chartBlue, 20);
    for (let i = 0; i < 14; i++) { const a = rand(TAU); part('bubble', P.x + Math.cos(a) * 34, P.y + Math.sin(a) * 22, Math.cos(a) * 60, Math.sin(a) * 60, 0.6, rand(3, 5), { drag: 2 }); }
    return false;
  }
  amount = Math.round(amount);
  P.hull -= amount; P.inv = 0.45; G.dmg += amount; G.hits++; save.st.dmg += amount;
  G.flash = 0.35; G.chaos += 2.4;
  addShake(10 + amount * 0.5);
  if (!quiet) { Snd.hit(); popup(P.x, P.y - 34, '-' + amount + ' HULL', C.hull, 22); radio(P.hull / P.maxHull < 0.3 ? 'low' : 'hit'); }
  const spill = P.cargo * 0.12;
  if (spill > 0.004) {
    P.cargo -= spill;
    G.slicks.push({ x: P.x + rand(-10, 10), y: P.y + rand(-10, 10), r: 18 + spill * 90, t: 0, life: 22, seed: Math.random() * 1000 });
    popup(P.x + 30, P.y - 8, 'SPILL -' + fmtBbl(spill), C.ink, 15);
  }
  emit('hurt', amount, src);
  if (P.hull <= 0) { P.hull = 0; killPlayer(); }
  return true;
}
function killPlayer() {
  const P = G.P; if (P.dead) return;
  P.dead = true;
  boomFx(P.x, P.y, 90); boomFx(P.x + Math.cos(P.a) * 22, P.y + Math.sin(P.a) * 22, 60);
  Snd.boom(2.2, P.x, P.y); addShake(30);
  G.slicks.push({ x: P.x, y: P.y, r: 60 + P.cargo * 120, t: 0, life: 40, seed: Math.random() * 1000 });
  for (const b of G.boats) if (b.st === 'board') { b.st = 'leave'; }
  P.boarders = 0;
  save.st.sunk++; ach('sunk');
  failLevel('sunk');
}
function boomFx(x, y, r) {
  part('flash', x, y, 0, 0, 0.2, r * 1.5);
  const n = Math.round(7 + r / 6), k = r / 50;
  for (let i = 0; i < n; i++) { const a = rand(TAU), s = rand(30, 140) * k; part('fire', x + rand(-r, r) * 0.2, y + rand(-r, r) * 0.2, Math.cos(a) * s, Math.sin(a) * s, rand(0.35, 0.75), rand(7, 15) * Math.max(0.7, k), { grow: 1.6, drag: 3 }); }
  for (let i = 0; i < n * 0.8; i++) { const a = rand(TAU), s = rand(10, 70) * k; part('smoke', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(1.3, 2.6), rand(9, 18) * Math.max(0.7, k), { grow: 2.1, drag: 1.4 }); }
  for (let i = 0; i < n; i++) { const a = rand(TAU), s = rand(200, 430) * (0.6 + r / 120); part('spark', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.22, 0.5), 2, { drag: 2.6 }); }
  for (let i = 0; i < n * 0.7; i++) { const a = rand(TAU), s = rand(50, 190) * Math.max(0.7, k); part('water', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.5, 0.95), rand(3, 6), { drag: 2.2 }); }
  G.rings.push({ x, y, r0: r * 0.25, r1: r * 1.35, t: 0, life: r > 90 ? 0.75 : 0.45, w: r > 90 ? 8 : 4 });
  G.lights.push({ x, y, r: r * 4, t: 0, life: 0.5 + r / 220 });
}
function explode(x, y, r, o) {
  o = o || {};
  boomFx(x, y, r);
  const dd = Math.hypot(x - G.cam.x, y - G.cam.y);
  addShake(clamp((r > 90 ? 28 : 13) * (1 - dd / 1500), 0, 30));
  Snd.boom(r / 45, x, y);
  G.chaos += r > 90 ? 3.4 : 1;
  let hitP = false;
  if (o.dmg && !G.P.dead) {
    const sd = shipDist(x, y);
    if (sd < r * 0.8) hitP = hurt(o.dmg * (1 - clamp(sd / r, 0, 1) * 0.45), x, y, o.src);
    else if (o.near && sd < r * o.near && G.mode === 'play') nearMiss(x, y);
  }
  for (const m of G.mines) if (!m.dead && m.fuse <= 0 && d2(m.x, m.y, x, y) < (r + 42) * (r + 42)) { m.fuse = rand(0.1, 0.28); m.chain = true; }
  for (const b of G.boats) if (!b.dead && d2(b.x, b.y, x, y) < (r + 14) * (r + 14)) killBoat(b, o.src !== 'player');
  if (r > 90) for (const d of G.drones) if (!d.dead && !d.pizza && d2(d.x, d.y, x, y) < r * r) { d.dead = true; boomFx(d.x, d.y, 26); }
  for (const t of G.traffic) if (trafDist(t, x, y) < r * 0.55) { t.burn = 7; t.say = pick(TRAFFIC_HIT); t.sayT = 2.2; G.chaos += 1.2; }
  emit('explode', x, y, r, o);
  return hitP;
}
function nearMiss(x, y) {
  if (G.mode !== 'play' || G.P.dead) return;
  G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 3; G.near++; save.st.near++;
  const v = 2 + G.level * 0.4;
  Snd.near();
  addBonus(v * G.combo, G.P.x, G.P.y - 46, G.combo > 1 ? 'CLOSE CALL ×' + G.combo : 'CLOSE CALL', C.magenta);
  if (G.combo >= 3) say('CLOSE CALL ×' + G.combo, 'SOMEONE GIVE THIS CAPTAIN A MEDAL', C.magenta, 1.2);
  if (Math.random() < 0.35) radio('near');
  if (save.st.near >= 10) ach('close10');
  emit('nearMiss', x, y);
}
function killBoat(b, ff) {
  if (b.dead) return;
  b.dead = true;
  if (b.st === 'board') G.P.boarders = Math.max(0, G.P.boarders - 1);
  boomFx(b.x, b.y, 30);
  if (ff && G.mode === 'play') { G.ff++; save.st.ff++; addBonus(3 + G.level * 0.3, b.x, b.y - 20, 'FRIENDLY FIRE', C.amber); ach('ff'); emit('ff'); }
}
function ach(id) {
  if (!ACH[id] || save.ach[id] || (G && G.attract)) return;
  save.ach[id] = Date.now(); persist();
  Snd.achieve(); showToast('BADGE UNLOCKED', ACH[id][0], ACH[id][1]);
  emit('badge', id);
}
const ACH = {
  first: ['Crude Awakening', 'Deliver your first cargo'], honk: ['Honk If You\'re Happy', 'Honk 50 times'], pizza: ['Pizza Diplomacy', 'Catch a pizza drone'],
  close10: ['Close Call Connoisseur', '10 near misses'], shake: ['Not Today, Pal', 'Shake off a boarding party'], aground: ['The Map Is Old', 'Run aground'],
  ff: ['Friendly Fire', 'Trick a weapon into hitting someone else'], dove: ['Peace Was An Option', 'Use Diplomacy'], sunk: ['Artificial Reef', 'Sink your tanker'],
  perfect: ['Not A Scratch', 'Finish a level without damage'], hot: ['Hot Deal', 'Deliver a HOT contract'], lvl10: ['Strait Outta Hormuz', 'Finish level 10'],
  billion: ['Billionaire Captain', 'Earn $1B in total'], chaos: ['Market Mover', 'Push Brent above $150'], ciws: ['BRRRT', 'Shoot down 25 threats with the CIWS'],
  mines: ['Minesweeper', 'Detonate 10 mines with other explosions']
};

/* ---------- economy ---------- */
function deliver(g) {
  const P = G.P;
  if (G.attract) { P.cargo = 0; return; }
  if (G.mode !== 'play') return;
  const hot = G.hot && G.hot.g === g;
  const ex = { mult: 1, flat: 0 };
  emit('preDeliver', g, ex, hot);
  const mult = g.mult * (hot ? 2 : 1) * ex.mult;
  const val = P.cargo * G.price * mult + ex.flat;
  const info = { hot, cargo: P.cargo, full: P.cargo >= P.cap * 0.95 };
  G.earned += val; G.deliveries++; save.st.deliv++;
  popup(P.x, P.y - 40, '+' + fmtMoney(val), C.magenta, 34);
  say('SOLD TO ' + g.name, fmtBbl(P.cargo) + ' × $' + G.price.toFixed(2) + (mult !== 1 ? ' × ' + mult.toFixed(2).replace(/0$/, '') : ''), C.magenta, 2);
  P.cargo = 0; G.fullShown = false;
  Snd.kaching(); radio('deliver');
  for (let i = 0; i < 46; i++) { const a = rand(TAU), s = rand(80, 340); part('confetti', P.x, P.y, Math.cos(a) * s, Math.sin(a) * s, rand(0.9, 1.6), rand(3, 6), { drag: 2.2, col: pick([C.magenta, C.amber, C.hull, C.chartBlue, '#2E9E6A']), rot: rand(TAU), vr: rand(-10, 10) }); }
  if (hot) { G.hot = null; G.hotT = rand(6, 10); ach('hot'); }
  ach('first');
  if (G.level === 1 && G.hintStage < 3) { G.hintStage = 3; setHint('Ka-ching! Fill the <b>QUOTA</b> bar to finish the level. Go load up again!', 6); }
  emit('deliver', g, val, info);
  checkQuota();
}
function winLevel() {
  if (G.mode !== 'play') return;
  G.mode = 'won'; G.endT = 0;
  if (G.cfg.daily) { dailyEnd(true, 'time'); Snd.fanfare(); say("TIME!", 'SCORE ' + fmtMoney(G.result.score), C.magenta, 2.2); emit('levelEnd', G.result); return; }
  const P = G.P, hullPct = P.hull / P.maxHull, timePct = G.timeLeft / G.cfg.time;
  const timeBonus = Math.round(G.timeLeft * (0.5 + G.level * 0.08) * 10) / 10;
  const perfect = G.dmg === 0 ? Math.round(total() * 0.15 * 10) / 10 : 0;
  const stars = 1 + (hullPct >= 0.6 ? 1 : 0) + (timePct >= 0.3 ? 1 : 0);
  const sum = total() + timeBonus + perfect;
  G.result = { win: true, stars, timeBonus, perfect, sum, reason: 'quota', headline: pick(HEADLINES.win) };
  save.cash += sum; save.earned += sum; save.level = G.level + 1; save.maxLevel = Math.max(save.maxLevel, G.level + 1); save.best = Math.max(save.best, G.level);
  save.stars[G.level] = Math.max(save.stars[G.level] || 0, stars);
  persist();
  Snd.fanfare(); say('QUOTA MET', stars === 3 ? 'FLAWLESS. SUSPICIOUSLY FLAWLESS.' : 'HEAD OFFICE IS MILDLY PLEASED', C.magenta, 2.2);
  for (let i = 0; i < 4; i++) setTimeout(() => { if (!G || G.mode !== 'won') return; const x = P.x + rand(-160, 160), y = P.y + rand(-120, 120); for (let k = 0; k < 40; k++) { const a = rand(TAU), s = rand(60, 260); part('confetti', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.8, 1.5), rand(3, 5), { drag: 2, col: pick([C.magenta, C.amber, C.hull, C.chartBlue]), rot: rand(TAU), vr: rand(-9, 9) }); } Snd.tone(rand(600, 1200), 0.2, 'triangle', 0.06); }, 250 + i * 260);
  if (G.dmg === 0) ach('perfect');
  if (G.level >= 10) ach('lvl10');
  if (save.earned >= 1000) ach('billion');
  emit('levelEnd', G.result);
}
function failLevel(reason) {
  if (G.mode !== 'play') return;
  G.mode = 'lost'; G.endT = 0;
  if (G.cfg.daily) { dailyEnd(false, reason); say('SUNK', 'SCORE ' + fmtMoney(G.result.score) + ' STILL COUNTS', C.hull, 2.4); setTimeout(() => Snd.trombone(), 700); emit('levelEnd', G.result); return; }
  const payout = Math.round(total() * 0.5 * 10) / 10;
  G.result = { win: false, reason, payout, sum: payout, stars: 0, headline: pick(HEADLINES[reason] || HEADLINES.time) };
  save.cash += payout; save.earned += payout; persist();
  if (reason === 'time') { say("TIME'S UP", 'THE OIL IS STILL IN THE BOAT', C.hull, 2.4); }
  else { say('SUNK', 'THE FISH SAY THANK YOU', C.hull, 2.4); }
  setTimeout(() => Snd.trombone(), reason === 'sunk' ? 700 : 100);
  emit('levelEnd', G.result);
}
function updatePrice(dt) {
  G.chaos = Math.min(140, G.chaos * Math.exp(-0.045 * dt));
  const t = G.t;
  G.price = G.cfg.price + G.chaos + 3.5 * Math.sin(t * 0.33) + 1.8 * Math.sin(t * 1.27 + 1.3) + (G.cfg.night ? 4 : 0);
  G.priceT += dt;
  if (G.priceT >= 1) { G.priceT = 0; G.priceAgo = G.prevPrice; G.prevPrice = G.price; }
  if (G.price > 150 && G.mode === 'play') ach('chaos');
}
function updateHot(dt) {
  if (G.attract) return;
  if (G.hot) { G.hot.t -= dt; if (G.hot.t <= 0) { G.hot = null; G.hotT = rand(8, 14); } }
  else if (G.mode === 'play') {
    G.hotT -= dt;
    if (G.hotT <= 0) { const g = pick(GATES); G.hot = { g, t: 22 }; say('HOT DEAL', g.name + ' PAYS ×2 FOR 22 SECONDS', C.amber, 2); radio('hot', g.name); Snd.alarm(); emit('hot', g); }
  }
}
function updateRoute() {
  G.routeT = 0.3;
  const P = G.P;
  const wantDeliver = P.cargo >= P.cap * 0.98 || (P.cargo > 0.05 && !P.loading && (P.cargo >= P.cap * 0.5 || P.x > 2150));
  let tgt = null, best = Infinity;
  if (wantDeliver) {
    if (G.hot) tgt = G.hot.g;
    else for (const g of GATES) { const d = d2(P.x, P.y, g.x, g.y); if (d < best) { best = d; tgt = g; } }
  } else {
    if (P.loading) tgt = P.loading;
    else for (const z of PICKUPS) { const d = d2(P.x, P.y, z.x, z.y) * (z.kind === 'edge' ? 1.3 : 1); if (d < best) { best = d; tgt = z; } }
  }
  G.routeTarget = tgt;
  G.route = tgt ? planRoute(P.x, P.y, tgt.x, tgt.y) : [];
}
function updateCamera(dt) {
  const P = G.P;
  let tx = P.x + P.vx * 0.42, ty = P.y + P.vy * 0.42;
  if (G.attract) { G.attractT += dt; }
  const k = 1 - Math.exp(-3.2 * dt);
  G.cam.x = lerp(G.cam.x, tx, k); G.cam.y = lerp(G.cam.y, ty, k);
  const hw = VW / 2 / zoom, hh = VH / 2 / zoom;
  G.cam.x = WW > 2 * hw ? clamp(G.cam.x, hw, WW - hw) : WW / 2;
  G.cam.y = WH > 2 * hh ? clamp(G.cam.y, hh, WH - hh) : WH / 2;
  G.shake *= Math.exp(-7 * dt);
  G.flash = Math.max(0, G.flash - dt);
}
