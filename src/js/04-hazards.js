
/* =========================================================
   GAME — hazards, traffic, power-ups, main update
   ========================================================= */
const LANES = [LANE_OUT, LANE_IN].map(pts => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
});
function lanePos(L, s) {
  let i = 1;
  while (i < L.cum.length - 1 && L.cum[i] < s) i++;
  const a = L.pts[i - 1], b = L.pts[i], u = clamp((s - L.cum[i - 1]) / (L.cum[i] - L.cum[i - 1]), 0, 1);
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), Math.atan2(b[1] - a[1], b[0] - a[0])];
}
const CRATE_KINDS = [['repair', 30], ['bubble', 16], ['nitro', 18], ['flares', 16], ['dove', 7], ['cash', 13]];
function weighted(list) { let s = 0; for (const [, w] of list) s += w; let r = rand(s); for (const [k, w] of list) { r -= w; if (r <= 0) return k; } return list[0][0]; }

/* ---------- spawns ---------- */
function spawnMine(drifting) {
  const P = G.P;
  for (let k = 0; k < 50; k++) {
    let pt;
    if (drifting) pt = randomWater(40, 9999, P.x, P.y, 650, 1100, 20);
    else if (Math.random() < 0.6) { const i = randi(0, WPS.length - 2), u = Math.random(), a = WPS[i], b = WPS[i + 1]; pt = [lerp(a[0], b[0], u) + rand(-270, 270), lerp(a[1], b[1], u) + rand(-270, 270)]; }
    else pt = randomWater(40, 9999);
    if (!pt) continue;
    const [x, y] = pt;
    if (x < 40 || y < 40 || x > WW - 40 || y > WH - 40 || isLand(x, y) || coastDist(x, y) < 30) continue;
    if (d2(x, y, P.x, P.y) < 520 * 520) continue;
    if (PICKUPS.some(z => d2(x, y, z.x, z.y) < (z.r + 70) * (z.r + 70)) || GATES.some(z => d2(x, y, z.x, z.y) < (z.r + 70) * (z.r + 70))) continue;
    if (G.mines.some(m => d2(x, y, m.x, m.y) < 120 * 120)) continue;
    const a = rand(TAU), sp = drifting ? rand(12, 26) : 0;
    G.mines.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ph: rand(TAU), dead: false, fuse: 0, chain: false });
    return;
  }
}
function spawnTraffic(initial) {
  const kind = pick(['tanker', 'tanker', 'box', 'box', 'dhow']);
  const t = { kind, name: pick(SHIP_NAMES), len: kind === 'dhow' ? 26 : kind === 'box' ? 58 : 64, v: kind === 'dhow' ? rand(65, 90) : rand(100, 145),
    col: pick(['#3E6B57', '#8C3B2E', '#2F4B6E', '#5E4B7A', '#7A5A2E']), box: [pick(['#C2352B', '#2C5D7C', '#F2A31D', '#2E9E6A']), pick(['#E8E1CF', '#C0177A', '#2C5D7C', '#F2A31D'])],
    burn: 0, say: null, sayT: 0, ox: 0, oy: 0, bx: 0, by: 0, trail: [], dead: false };
  G.traffic.push(t);
  placeTraffic(t, initial);
}
function placeTraffic(t, initial) {
  const P = G.P;
  for (let k = 0; k < 20; k++) {
    t.L = pick(LANES); t.off = rand(-55, 55);
    t.s = initial ? rand(0, t.L.len * 0.92) : rand(0, 30);
    const [x, y, a] = lanePos(t.L, t.s);
    t.a = a; t.x = x - Math.sin(a) * t.off; t.y = y + Math.cos(a) * t.off; t.trail = [];
    if (d2(t.x, t.y, P.x, P.y) > 450 * 450 && !G.traffic.some(o => o !== t && d2(o.x, o.y, t.x, t.y) < 200 * 200)) return;
  }
}
function spawnBoat() {
  const live = G.boats.filter(b => !b.dead).length;
  if (live >= G.cfg.maxBoats) return;
  const P = G.P, pt = randomWater(14, 170, P.x, P.y, 850, 1300, 90);
  if (!pt) return;
  G.boats.push({ x: pt[0], y: pt[1], a: Math.atan2(P.y - pt[1], P.x - pt[0]), v: 0, st: 'chase', t: 0, ox: 0, oy: 0, tries: 0, flee: 0, say: null, sayT: 0, trail: [], dead: false });
  radio('boat');
}
function spawnDrone(x, y, extraLock) {
  const P = G.P;
  if (x === undefined) { const a = rand(TAU), r = rand(900, 1150); x = P.x + Math.cos(a) * r; y = P.y + Math.sin(a) * r; }
  G.drones.push({ x, y, a: Math.atan2(P.y - y, P.x - x), st: 'approach', t: 0, lt: 0, lockT: 0.8 + (extraLock || 0), alt: 1, tx: 0, ty: 0, d0: 1, target: null, wob: rand(TAU), pizza: false, dead: false });
}
function spawnSwarm() {
  const P = G.P, a = rand(TAU), cx = P.x + Math.cos(a) * 1250, cy = P.y + Math.sin(a) * 1250;
  const n = randi(6, 8 + Math.floor(G.level / 4));
  for (let i = 0; i < n; i++) spawnDrone(cx + rand(-130, 130), cy + rand(-130, 130), i * 0.22);
  radio('swarm'); say('DRONE SWARM', 'KEEP MOVING', C.hull, 1.4); Snd.buzz();
}
function spawnPizza() {
  const P = G.P, a = rand(TAU), sx = P.x + Math.cos(a) * 1100, sy = P.y + Math.sin(a) * 1100;
  const tx = P.x + P.vx * 2.5 + rand(-140, 140), ty = P.y + P.vy * 2.5 + rand(-140, 140);
  G.drones.push({ x: sx, y: sy, a: Math.atan2(ty - sy, tx - sx), st: 'pizza', pizza: true, t: 0, wob: 0, alt: 1, dead: false });
}
function spawnMissile() {
  const P = G.P, a = rand(TAU);
  let lx = P.x + Math.cos(a) * 1350, ly = P.y + Math.sin(a) * 1350;
  for (let r = 1500; r > 950; r -= 50) { const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (x > 0 && y > 0 && x < WW && y < WH && isLand(x, y)) { lx = x; ly = y; break; } }
  G.missiles.push({ x: lx, y: ly, a: Math.atan2(P.y - ly, P.x - lx), v: 240, t: 0, fuel: 7.5, target: null, lost: false, armed: !isLand(lx, ly), min: 1e9, nm: false, trail: [], dead: false });
  part('flash', lx, ly, 0, 0, 0.3, 60); G.lights.push({ x: lx, y: ly, r: 260, t: 0, life: 0.6 });
  Snd.launch(lx, ly); radio('missile');
}
function spawnBallistic(x, y, delay, r) {
  const P = G.P;
  if (x === undefined) { const k = rand(0.45, 1.0); x = P.x + P.vx * 2.7 * k + rand(-70, 70); y = P.y + P.vy * 2.7 * k + rand(-70, 70); }
  G.balls.push({ x, y, r: r || rand(105, 140), t: -(delay || 0), T: 2.7, wh: false, started: false, dead: false });
}
function spawnBarrage() {
  const P = G.P, fa = Math.hypot(P.vx, P.vy) > 40 ? Math.atan2(P.vy, P.vx) : P.a, kind = randi(0, 2);
  if (kind === 0) {
    const cx = P.x + Math.cos(fa) * 430, cy = P.y + Math.sin(fa) * 430, px = -Math.sin(fa), py = Math.cos(fa);
    for (let i = -2; i <= 2; i++) spawnBallistic(cx + px * i * 200, cy + py * i * 200, Math.abs(i) * 0.18, 112);
  } else if (kind === 1) {
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + rand(0.3); spawnBallistic(P.x + Math.cos(a) * 310, P.y + Math.sin(a) * 310, i * 0.12, 98); }
    spawnBallistic(P.x + P.vx * 2.6, P.y + P.vy * 2.6, 1.0, 115);
  } else {
    for (let i = 0; i < 5; i++) spawnBallistic(P.x + Math.cos(fa) * (160 + i * 175), P.y + Math.sin(fa) * (160 + i * 175), i * 0.32, 108);
  }
  radio('ball'); say('BARRAGE!', 'FIND THE GAP', C.hull, 1.4);
}
function spawnSub() {
  const P = G.P, fa = Math.hypot(P.vx, P.vy) > 40 ? Math.atan2(P.vy, P.vx) : P.a;
  for (let i = 0; i < 30; i++) {
    const a = fa + rand(-1.4, 1.4), r = rand(430, 650), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    if (x > 30 && y > 30 && x < WW - 30 && y < WH - 30 && !isLand(x, y) && coastDist(x, y) > 40) {
      G.subs.push({ x, y, t: 0, aa: Math.atan2(P.y - y, P.x - x), tv: 410 * Math.sqrt(G.cfg.threat), fired: false, dead: false });
      radio('sub'); Snd.ping(); return;
    }
  }
}
function spawnCrate() {
  const P = G.P, pt = randomWater(40, 9999, P.x + P.vx * 1.2, P.y + P.vy * 1.2, 260, 720, 40);
  if (!pt) return;
  G.crates.push({ x: pt[0], y: pt[1], kind: weighted(CRATE_KINDS), t: 0, life: 18, dead: false });
}

function updateSpawns(dt) {
  if (G.attract) {
    G.timers.pizza -= dt;
    if (G.timers.pizza <= 0) { G.timers.pizza = rand(9, 14); spawnPizza(); }
    return;
  }
  if (G.mode !== 'play' || G.t < 1.5) return;
  const c = G.cfg, ramp = 1 + 0.4 * clamp(G.t / c.time, 0, 1);
  const tick = (k, fn) => { if (!c[k]) return; G.timers[k] -= dt * ramp; if (G.timers[k] <= 0) { G.timers[k] = c[k] * rand(0.75, 1.25); fn(); } };
  tick('boat', spawnBoat);
  tick('drone', () => { if (G.drones.length < 16) { spawnDrone(); Snd.buzz(); if (Math.random() < 0.25) radio('drone'); } });
  tick('cruise', () => { if (G.missiles.length < 7) spawnMissile(); });
  tick('ball', () => { if (c.barrage && Math.random() < 0.28) spawnBarrage(); else { spawnBallistic(); if (Math.random() < 0.3) radio('ball'); } });
  tick('torp', () => { if (G.subs.length < 2) spawnSub(); });
  tick('swarm', spawnSwarm);
  tick('drift', () => { if (G.mines.length < 60) spawnMine(true); });
  tick('amb', () => { const P = G.P, pt = randomWater(20, 9999, P.x, P.y, 520, 820, 30); if (pt) spawnBallistic(pt[0], pt[1], 0, rand(90, 120)); });
  G.timers.crate -= dt;
  if (G.timers.crate <= 0) { G.timers.crate = rand(9, 13); if (G.crates.length < 4) spawnCrate(); }
  if (c.pizza) { G.timers.pizza -= dt; if (G.timers.pizza <= 0) { G.timers.pizza = rand(24, 38); spawnPizza(); } }
}

/* ---------- hazards ---------- */
function updateMines(dt) {
  const P = G.P, live = G.mode === 'play' && !P.dead;
  for (const m of G.mines) {
    if (m.dead) continue;
    m.ph += dt;
    if (m.fuse > 0) {
      m.fuse -= dt;
      if (m.fuse <= 0) {
        m.dead = true;
        if (m.chain && G.mode === 'play') { save.st.mines++; if (save.st.mines >= 10) ach('mines'); popup(m.x, m.y - 18, 'CHAIN!', C.amber, 16); emit('chain'); }
        explode(m.x, m.y, 46, { dmg: 22, src: 'mine', near: 2.2 });
      }
      continue;
    }
    if (m.vx || m.vy) {
      const nx = m.x + m.vx * dt, ny = m.y + m.vy * dt;
      if (isLand(nx, ny) || nx < 20 || ny < 20 || nx > WW - 20 || ny > WH - 20) { m.vx = -m.vx; m.vy = -m.vy; } else { m.x = nx; m.y = ny; }
    }
    if (live) {
      const sd = shipDist(m.x, m.y);
      if (sd < 9) { m.dead = true; explode(m.x, m.y, 46, { dmg: 22, src: 'mine' }); continue; }
      if (sd < 140) Snd.ping();
    }
    for (const t of G.traffic) if (trafDist(t, m.x, m.y) < 8) { m.dead = true; explode(m.x, m.y, 46, { dmg: 22, src: 'mine' }); break; }
    if (m.dead) continue;
    for (const b of G.boats) if (!b.dead && b.st !== 'board' && d2(b.x, b.y, m.x, m.y) < 18 * 18) { m.dead = true; explode(m.x, m.y, 46, { dmg: 22, src: 'mine' }); break; }
  }
}
function updateTraffic(dt) {
  const P = G.P;
  for (const t of G.traffic) {
    t.s += t.v * dt;
    if (t.s >= t.L.len) { placeTraffic(t, false); continue; }
    const [x, y, a] = lanePos(t.L, t.s);
    t.a += clamp(angDiff(t.a, a), -0.45 * dt, 0.45 * dt);
    t.bx *= Math.exp(-1.5 * dt); t.by *= Math.exp(-1.5 * dt);
    t.ox = (t.ox + t.bx * dt) * Math.exp(-0.3 * dt); t.oy = (t.oy + t.by * dt) * Math.exp(-0.3 * dt);
    t.x = x - Math.sin(t.a) * t.off + t.ox; t.y = y + Math.cos(t.a) * t.off + t.oy;
    trailPush(t, t.x - Math.cos(t.a) * t.len * 0.45, t.y - Math.sin(t.a) * t.len * 0.45, 0.08, 1.8);
    t.burn = Math.max(0, t.burn - dt); t.sayT = Math.max(0, t.sayT - dt);
    if (t.burn > 0 && Math.random() < dt * 9) part('smoke', t.x + rand(-12, 12), t.y + rand(-6, 6), rand(-8, 8), rand(-8, 8), rand(1.4, 2.4), rand(7, 12), { grow: 1.8, drag: 1 });
    if (P.dead || G.attract) continue;
    const c = Math.cos(t.a), s = Math.sin(t.a), h = t.len / 2 - 6;
    let minD = 1e9, mx = 0, my = 0;
    for (let k = -2; k <= 2; k++) { const px = t.x + c * h * k / 2, py = t.y + s * h * k / 2, sd = shipDist(px, py); if (sd < minD) { minD = sd; mx = px; my = py; } }
    if (minD < 7) {
      let nx = P.x - mx, ny = P.y - my; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      P.x += nx * (8 - minD); P.y += ny * (8 - minD);
      const vn = P.vx * nx + P.vy * ny;
      if (vn < 0) { P.vx -= 1.5 * vn * nx; P.vy -= 1.5 * vn * ny; }
      t.bx -= nx * 50; t.by -= ny * 50;
      if (-vn > 110 && P.inv <= 0 && G.mode === 'play') {
        hurt(5, P.x, P.y, 'bump', true); Snd.hit();
        t.say = pick(TRAFFIC_BUMP); t.sayT = 2.2; popup(P.x, P.y - 30, 'BONK', C.ink, 18);
      }
    }
  }
}
function updateBoats(dt) {
  const P = G.P, sp = 365 * G.cfg.threat;
  if (P.boarders > 0 && P.shakeAcc > 2.3) {
    for (const b of G.boats) if (!b.dead && b.st === 'board') detachBoat(b, false);
    P.shakeAcc = 0;
  }
  for (const b of G.boats) {
    if (b.dead) continue;
    b.t += dt; b.sayT = Math.max(0, b.sayT - dt);
    if (b.st === 'board') {
      if (P.dead) { b.st = 'leave'; continue; }
      const c = Math.cos(P.a), s = Math.sin(P.a);
      b.x = P.x + c * b.ox - s * b.oy; b.y = P.y + s * b.ox + c * b.oy; b.a = P.a; b.v = Math.hypot(P.vx, P.vy);
      if (G.mode === 'play' && P.cargo > 0) {
        P.cargo = Math.max(0, P.cargo - 0.05 * dt);
        if (Math.random() < dt * 3) popup(b.x, b.y - 14, '-oil', C.hull, 13);
      }
      continue;
    }
    let tx, ty, speed = sp;
    if (b.st === 'chase') { tx = P.x + P.vx * 0.45; ty = P.y + P.vy * 0.45; if (P.dead || G.mode !== 'play') b.st = 'leave'; }
    else if (b.st === 'flee') { b.flee -= dt; tx = b.x + (b.x - P.x); ty = b.y + (b.y - P.y); speed = sp * 0.75; if (b.flee <= 0) { b.tries++; b.st = b.tries >= 3 ? 'leave' : 'chase'; } }
    else { tx = b.x + (b.x - P.x); ty = b.y + (b.y - P.y); if (d2(b.x, b.y, P.x, P.y) > 1700 * 1700) { b.dead = true; continue; } }
    let want = Math.atan2(ty - b.y, tx - b.x);
    const probe = ang => isLand(b.x + Math.cos(ang) * 70, b.y + Math.sin(ang) * 70);
    if (probe(b.a)) { const l = probe(b.a - 0.7), r = probe(b.a + 0.7); want = b.a + (l && !r ? 1.6 : !l && r ? -1.6 : (b.t % 2 < 1 ? 1.6 : -1.6)); speed *= 0.6; }
    b.a += clamp(angDiff(b.a, want), -2.9 * dt, 2.9 * dt);
    b.v = lerp(b.v, speed, 1 - Math.exp(-1.6 * dt));
    const nx = b.x + Math.cos(b.a) * b.v * dt, ny = b.y + Math.sin(b.a) * b.v * dt;
    if (isLand(nx, ny)) { b.a += Math.PI * 0.5 * (b.t % 2 < 1 ? 1 : -1); b.v *= 0.3; } else { b.x = nx; b.y = ny; }
    trailPush(b, b.x - Math.cos(b.a) * 9, b.y - Math.sin(b.a) * 9, 0.04, 0.8);
    if (b.st === 'chase' && G.mode === 'play' && !P.dead && shipDist(b.x, b.y) < 12) attachBoat(b);
  }
}
function attachBoat(b) {
  const P = G.P, c = Math.cos(P.a), s = Math.sin(P.a), dx = b.x - P.x, dy = b.y - P.y;
  const lx = dx * c + dy * s, ly = -dx * s + dy * c;
  b.ox = clamp(lx, -22, 22); b.oy = (ly >= 0 ? 1 : -1) * 15;
  b.st = 'board'; P.boarders++;
  b.say = pick(['HELLO FRIEND!', 'NICE OIL!', 'PULL OVER!', 'SURPRISE!']); b.sayT = 2;
  radio('boarded'); say('BOARDED!', isTouch() ? 'ZIG-ZAG HARD OR HONK' : 'ZIG-ZAG HARD OR HONK [H]', C.hull, 1.6); Snd.alarm();
  emit('boarded', b);
}
function detachBoat(b, byHonk) {
  const P = G.P;
  if (b.st === 'board') P.boarders = Math.max(0, P.boarders - 1);
  b.st = 'flee'; b.flee = byHonk ? 3.4 : 2.6; b.v = 230; b.a = Math.atan2(b.y - P.y, b.x - P.x);
  b.x += Math.cos(b.a) * 12; b.y += Math.sin(b.a) * 12;
  b.say = byHonk ? pick(['AAAH!', 'SO LOUD!', 'MY EARS!']) : pick(['WHEEE!', 'SPLASH!', 'NOT FAIR!']); b.sayT = 1.6;
  if (P.boarders === 0) P.shakeAcc = 0;
  if (G.mode === 'play') { ach('shake'); if (!byHonk) { radio('shaken'); popup(b.x, b.y - 20, 'SHAKEN OFF!', C.magenta, 18); } emit('shaken', b, byHonk); }
}
function updateDrones(dt) {
  const P = G.P, sp = 275 * Math.sqrt(G.cfg.threat);
  for (const d of G.drones) {
    if (d.dead) continue;
    d.t += dt; d.wob += dt * 3;
    if (d.pizza) {
      d.x += Math.cos(d.a) * 150 * dt; d.y += Math.sin(d.a) * 150 * dt;
      if (!P.dead && (G.mode === 'play' || G.attract) && shipDist(d.x, d.y) < 26) collectPizza(d);
      if (d.t > 30 || d2(d.x, d.y, P.x, P.y) > 2600 * 2600) d.dead = true;
      continue;
    }
    const tg = d.target && !d.target.dead ? d.target : null;
    if (d.target && d.target.dead && d.st !== 'dive') { d.target = null; d.st = 'leave'; }
    const tx = tg ? tg.x : P.x, ty = tg ? tg.y : P.y;
    if (d.st === 'approach') {
      d.a += clamp(angDiff(d.a, Math.atan2(ty - d.y, tx - d.x)), -2.6 * dt, 2.6 * dt);
      d.x += Math.cos(d.a) * sp * dt + Math.cos(d.wob) * 14 * dt; d.y += Math.sin(d.a) * sp * dt + Math.sin(d.wob * 1.3) * 14 * dt;
      if (G.mode !== 'play' || P.dead) d.st = 'leave';
      else if (d2(d.x, d.y, tx, ty) < 330 * 330) { d.st = 'lock'; d.lt = 0; Snd.beep(1320); }
    } else if (d.st === 'lock') {
      d.lt += dt; d.a += dt * 2.2;
      d.x += Math.cos(d.a) * 60 * dt; d.y += Math.sin(d.a) * 60 * dt;
      if (d.lt > d.lockT) {
        d.st = 'dive'; d.tx = tx + (tg ? 0 : P.vx * 0.22); d.ty = ty + (tg ? 0 : P.vy * 0.22);
        d.d0 = Math.max(1, Math.hypot(d.tx - d.x, d.ty - d.y)); d.a = Math.atan2(d.ty - d.y, d.tx - d.x); Snd.beep(1760);
      }
    } else if (d.st === 'dive') {
      const dx = d.tx - d.x, dy = d.ty - d.y, l = Math.hypot(dx, dy), step = 560 * dt;
      if (l <= step) { d.dead = true; explode(d.tx, d.ty, 48, { dmg: 16, src: 'drone', near: 2.6 }); }
      else { d.x += dx / l * step; d.y += dy / l * step; d.alt = clamp(l / d.d0, 0, 1); }
    } else {
      d.x += Math.cos(d.a) * sp * dt; d.y += Math.sin(d.a) * sp * dt;
      if (d2(d.x, d.y, P.x, P.y) > 2000 * 2000) d.dead = true;
    }
  }
}
function collectPizza(d) {
  d.dead = true;
  const P = G.P, heal = Math.round(P.maxHull * 0.2);
  P.hull = Math.min(P.maxHull, P.hull + heal);
  if (G.attract) return;
  popup(P.x, P.y - 42, 'PIZZA! +' + heal + ' HULL', '#2E9E6A', 24); Snd.power(); radio('pizza');
  save.st.pizza++; ach('pizza'); emit('pizza');
  for (let i = 0; i < 16; i++) { const a = rand(TAU); part('confetti', P.x, P.y, Math.cos(a) * 160, Math.sin(a) * 160, 0.9, 4, { drag: 2, col: pick(['#E8B04A', '#C2352B', '#2E9E6A']), rot: rand(TAU), vr: rand(-8, 8) }); }
}
function updateMissiles(dt) {
  const P = G.P, vmax = 440 * Math.pow(G.cfg.threat, 0.7);
  for (const m of G.missiles) {
    if (m.dead) continue;
    m.t += dt; m.v = Math.min(vmax, m.v + 240 * dt);
    if (m.target && m.target.dead) { m.target = null; m.lost = true; }
    const tg = m.target;
    if (!m.lost && (tg || !P.dead)) {
      let tx, ty;
      if (tg) { tx = tg.x; ty = tg.y; }
      else { const dd = Math.hypot(P.x - m.x, P.y - m.y), lead = Math.min(1.2, dd / m.v) * 0.55; tx = P.x + P.vx * lead; ty = P.y + P.vy * lead; }
      m.a += clamp(angDiff(m.a, Math.atan2(ty - m.y, tx - m.x)), -1.55 * dt, 1.55 * dt);
    }
    m.x += Math.cos(m.a) * m.v * dt; m.y += Math.sin(m.a) * m.v * dt;
    trailPush(m, m.x - Math.cos(m.a) * 9, m.y - Math.sin(m.a) * 9, 0.03, 1.1);
    const onLand = isLand(m.x, m.y);
    if (!m.armed && !onLand) m.armed = true;
    if (m.armed && onLand) { m.dead = true; explode(m.x, m.y, 40, { dmg: 22, src: 'missile' }); continue; }
    if (tg && d2(m.x, m.y, tg.x, tg.y) < 22 * 22) { m.dead = true; explode(m.x, m.y, 40, { dmg: 22, src: 'missile' }); continue; }
    if (!P.dead && G.mode === 'play') {
      const sd = shipDist(m.x, m.y);
      if (sd < 9) { m.dead = true; explode(m.x, m.y, 44, { dmg: 26, src: 'missile' }); continue; }
      if (sd < m.min) m.min = sd;
      else if (!m.nm && m.min < 95 && sd > m.min + 50) { m.nm = true; nearMiss(m.x, m.y); }
    }
    let boom = false;
    for (const t of G.traffic) if (trafDist(t, m.x, m.y) < 6) { boom = true; break; }
    if (!boom) for (const b of G.boats) if (!b.dead && d2(b.x, b.y, m.x, m.y) < 18 * 18) { boom = true; break; }
    if (!boom) for (const d of G.drones) if (!d.dead && !d.pizza && d.st !== 'dive' && d2(d.x, d.y, m.x, m.y) < 20 * 20) { d.dead = true; boom = true; if (G.mode === 'play') { G.ff++; save.st.ff++; addBonus(3 + G.level * 0.3, m.x, m.y - 20, 'FRIENDLY FIRE', C.amber); ach('ff'); emit('ff'); } break; }
    if (boom) { m.dead = true; explode(m.x, m.y, 40, { dmg: 22, src: 'missile' }); continue; }
    if (m.t > m.fuel) { m.dead = true; explode(m.x, m.y, 26, { dmg: 14, src: 'missile' }); }
    else if (m.x < -500 || m.y < -500 || m.x > WW + 500 || m.y > WH + 500) m.dead = true;
  }
}
function updateBalls(dt) {
  for (const b of G.balls) {
    if (b.dead) continue;
    b.t += dt;
    if (b.t < 0) continue;
    if (!b.started) { b.started = true; Snd.alarm(); }
    if (!b.wh && b.t > b.T - 1.15) { b.wh = true; Snd.whistle(1.15); }
    if (b.t >= b.T) {
      b.dead = true;
      explode(b.x, b.y, b.r, { dmg: 42, src: 'ball', near: 1.7 });
      G.rings.push({ x: b.x, y: b.y, r0: b.r * 0.6, r1: b.r * 2.3, t: 0, life: 0.9, w: 10 });
      for (let i = 0; i < 26; i++) { const a = rand(TAU), s = rand(40, 160); part('water', b.x + Math.cos(a) * b.r * 0.4, b.y + Math.sin(a) * b.r * 0.4, Math.cos(a) * s, Math.sin(a) * s, rand(0.7, 1.2), rand(5, 9), { drag: 1.8 }); }
    }
  }
}
function updateSubs(dt) {
  const P = G.P;
  for (const s of G.subs) {
    if (s.dead) continue;
    s.t += dt;
    if (s.t > 0.7 && s.t < 1.55 && !P.dead) { const dd = Math.hypot(P.x - s.x, P.y - s.y), tt = dd / s.tv; s.aa = Math.atan2(P.y + P.vy * tt * 0.9 - s.y, P.x + P.vx * tt * 0.9 - s.x); }
    if (s.t > 1.9 && !s.fired) { s.fired = true; G.torps.push({ x: s.x, y: s.y, a: s.aa, v: s.tv, t: 0, min: 1e9, nm: false, trail: [], dead: false }); Snd.launch(s.x, s.y); }
    if (s.t > 2.8) s.dead = true;
  }
}
function updateTorps(dt) {
  const P = G.P;
  for (const t of G.torps) {
    if (t.dead) continue;
    t.t += dt; t.x += Math.cos(t.a) * t.v * dt; t.y += Math.sin(t.a) * t.v * dt;
    trailPush(t, t.x, t.y, 0.04, 1.4);
    if (isLand(t.x, t.y)) { t.dead = true; explode(t.x, t.y, 30, {}); continue; }
    if (!P.dead && G.mode === 'play') {
      const sd = shipDist(t.x, t.y);
      if (sd < 5) { t.dead = true; explode(t.x, t.y, 46, { dmg: 30, src: 'torp' }); continue; }
      if (sd < t.min) t.min = sd; else if (!t.nm && t.min < 70 && sd > t.min + 40) { t.nm = true; nearMiss(t.x, t.y); }
    }
    for (const tr of G.traffic) if (trafDist(tr, t.x, t.y) < 4) { t.dead = true; explode(t.x, t.y, 40, {}); break; }
    if (t.t > 4.2) t.dead = true;
  }
}

/* ---------- power-ups, flares, horn, CIWS ---------- */
function updateCrates(dt) {
  const P = G.P;
  for (const c of G.crates) {
    if (c.dead) continue;
    c.t += dt;
    if (c.t > c.life) { c.dead = true; continue; }
    if (!P.dead && G.mode === 'play' && shipDist(c.x, c.y) < 16) collectCrate(c);
  }
}
function collectCrate(c) {
  c.dead = true;
  const P = G.P; Snd.power();
  const y = P.y - 44;
  if (c.kind === 'repair') { const h = Math.round(P.maxHull * 0.3); P.hull = Math.min(P.maxHull, P.hull + h); popup(P.x, y, 'REPAIRS +' + h + ' HULL', '#2E9E6A', 22); }
  else if (c.kind === 'bubble') { P.bubble = Math.min(6, P.bubble + 1); popup(P.x, y, 'BUBBLE WRAP +1', C.chartBlue, 22); }
  else if (c.kind === 'nitro') { P.nitro = 6; popup(P.x, y, 'NITRO!', C.hull, 26); radio('nitro'); }
  else if (c.kind === 'flares') { P.flares += 2; popup(P.x, y, 'FLARES +2', C.magenta, 22); }
  else if (c.kind === 'dove') diplomacy();
  else addBonus(8 + G.level * 2, P.x, y, 'LOST CARGO', C.amber);
  emit('crate', c.kind);
}
function diplomacy() {
  let n = 0;
  const dove = (x, y) => { for (let i = 0; i < 2; i++) { const a = rand(TAU); part('dove', x, y, Math.cos(a) * rand(60, 120), Math.sin(a) * rand(60, 120) - 40, rand(2.2, 3), rand(9, 12)); } };
  for (const m of G.missiles) if (!m.dead) { m.dead = true; dove(m.x, m.y); n++; }
  for (const d of G.drones) if (!d.dead && !d.pizza) { d.dead = true; dove(d.x, d.y); n++; }
  for (const b of G.balls) if (!b.dead) { b.dead = true; popup(b.x, b.y, 'CANCELLED', C.chartBlue, 18); n++; }
  for (const t of G.torps) if (!t.dead) { t.dead = true; n++; }
  for (const b of G.boats) if (!b.dead) { if (b.st === 'board') detachBoat(b, true); b.st = 'flee'; b.flee = 5; b.say = 'PEACE!'; b.sayT = 2; }
  say('DIPLOMACY!', n ? n + ' THREATS TURNED INTO DOVES' : 'EVERYONE CALM DOWN', C.chartBlue, 2);
  radio('dove'); ach('dove'); G.chaos *= 0.5;
}
function fireFlares() {
  const P = G.P;
  if (!G || G.mode !== 'play' || P.dead) return;
  if (P.flareCD > 0) return;
  if (P.flares <= 0) { Snd.nope(); popup(P.x, P.y - 34, 'NO FLARES', C.ink, 16); P.flareCD = 0.5; return; }
  P.flares--; P.flareCD = 0.7; Snd.flare(); radio('flare'); emit('flare');
  const fresh = [];
  for (let i = 0; i < 6; i++) {
    const a = P.a + Math.PI + rand(-1.4, 1.4), sp = rand(150, 280);
    const f = { x: P.x - Math.cos(P.a) * 22, y: P.y - Math.sin(P.a) * 22, vx: Math.cos(a) * sp + P.vx * 0.3, vy: Math.sin(a) * sp + P.vy * 0.3, t: 0, life: rand(2.8, 3.6), dead: false };
    G.flares.push(f); fresh.push(f);
  }
  for (const m of G.missiles) if (!m.dead && d2(m.x, m.y, P.x, P.y) < 720 * 720) { m.fc = true; if (Math.random() < 0.88) { m.target = pick(fresh); m.lost = false; } }
  for (const d of G.drones) if (!d.dead && !d.pizza && d.st !== 'dive' && d2(d.x, d.y, P.x, P.y) < 540 * 540) { d.fc = true; if (Math.random() < 0.88) { d.target = pick(fresh); d.st = 'approach'; } }
}
function updateFlares(dt) {
  for (const f of G.flares) {
    if (f.dead) continue;
    f.t += dt; const k = Math.exp(-1.6 * dt); f.vx *= k; f.vy *= k; f.x += f.vx * dt; f.y += f.vy * dt;
    if (Math.random() < dt * 28) part('spark', f.x, f.y, rand(-40, 40), rand(-40, 40), 0.3, 2, { drag: 2, col: '#FFD3EE' });
    if (Math.random() < dt * 9) part('smoke', f.x, f.y, rand(-10, 10), rand(-10, 10), 1.3, 5, { grow: 1.8, drag: 1, pale: true });
    if (f.t > f.life) f.dead = true;
  }
  if (!G.flares.length) return;
  // burning flares keep pulling in threats that wander close, once per threat
  const nearest = (x, y, r) => { let best = null, bd = r * r; for (const f of G.flares) if (!f.dead) { const dd = d2(x, y, f.x, f.y); if (dd < bd) { bd = dd; best = f; } } return best; };
  for (const m of G.missiles) if (!m.dead && !m.target && !m.lost && !m.fc) { const f = nearest(m.x, m.y, 560); if (f) { m.fc = true; if (Math.random() < 0.85) m.target = f; } }
  for (const d of G.drones) if (!d.dead && !d.pizza && !d.target && !d.fc && (d.st === 'approach' || d.st === 'lock')) { const f = nearest(d.x, d.y, 430); if (f) { d.fc = true; if (Math.random() < 0.85) { d.target = f; d.st = 'approach'; } } }
}
function honk() {
  const P = G.P;
  if (!G || G.mode !== 'play' || P.dead || P.honkCD > 0) return;
  P.honkCD = 4; P.honkT = 0.7; Snd.horn(); save.st.honks++;
  if (save.st.honks >= 50) ach('honk');
  G.rings.push({ x: P.x, y: P.y, r0: 30, r1: 340, t: 0, life: 0.7, w: 5, col: '192,23,122' });
  popup(P.x, P.y - 40, 'HOOOONK', C.magenta, 24);
  for (const b of G.boats) if (!b.dead && d2(b.x, b.y, P.x, P.y) < 340 * 340) { if (b.st === 'board') detachBoat(b, true); else { b.st = 'flee'; b.flee = 3.4; b.say = pick(['AAAH!', 'SO LOUD!']); b.sayT = 1.5; } }
  for (const t of G.traffic) if (d2(t.x, t.y, P.x, P.y) < 480 * 480 && Math.random() < 0.7) { t.say = pick(TRAFFIC_HONK); t.sayT = 2; }
  emit('honk');
}
function updateCIWS(dt) {
  const P = G.P;
  if (!P.ciws || P.dead || G.mode !== 'play') return;
  P.ciwsCD -= dt;
  if (P.ciwsCD > 0) return;
  const range = 220 + P.ciws * 40;
  let best = null, bd = range * range;
  for (const m of G.missiles) if (!m.dead) { const dd = d2(m.x, m.y, P.x, P.y); if (dd < bd) { bd = dd; best = m; } }
  for (const d of G.drones) if (!d.dead && !d.pizza) { const dd = d2(d.x, d.y, P.x, P.y); if (dd < bd) { bd = dd; best = d; } }
  if (!best) return;
  P.ciwsCD = [0, 1.7, 1.35, 1.1, 0.9, 0.72][P.ciws];
  best.dead = true;
  G.tracers.push({ x0: P.x, y0: P.y, x1: best.x, y1: best.y, t: 0 });
  Snd.brrt(P.x, P.y); boomFx(best.x, best.y, 22); Snd.boom(0.4, best.x, best.y);
  G.kills++; save.st.kills++;
  if (save.st.kills >= 25) ach('ciws');
  addBonus(1, best.x, best.y - 16, 'SPLASH ONE', C.chartBlue);
  emit('ciwsKill', best);
}

/* ---------- effects bookkeeping + main update ---------- */
function updateFx(dt) {
  for (const p of G.parts) {
    p.t += dt;
    if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.vr) p.rot += p.vr * dt;
  }
  const alive = o => o.t < o.life;
  G.parts = G.parts.filter(alive);
  for (const o of G.pops) o.t += dt; G.pops = G.pops.filter(alive);
  for (const o of G.rings) o.t += dt; G.rings = G.rings.filter(alive);
  for (const o of G.tracers) o.t += dt; G.tracers = G.tracers.filter(o => o.t < 0.22);
  for (const o of G.lights) o.t += dt; G.lights = G.lights.filter(alive);
  for (const o of G.slicks) o.t += dt; G.slicks = G.slicks.filter(alive);
  for (const o of G.msgs) o.t += dt; G.msgs = G.msgs.filter(alive);
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  G.radioT -= dt; G.radioGap -= dt;
  if (G.hint) { G.hint.t -= dt; if (G.hint.t <= 0) G.hint = null; }
}
function update(dt) {
  G.t += dt;
  if (G.mode === 'play') {
    G.timeLeft -= dt;
    if (G.timeLeft <= 0) { G.timeLeft = 0; failLevel('time'); }
  } else if (G.mode === 'won' || G.mode === 'lost') G.endT += dt;
  updatePlayer(dt);
  updateSpawns(dt);
  updateMines(dt); updateTraffic(dt); updateBoats(dt); updateDrones(dt); updateMissiles(dt);
  updateBalls(dt); updateSubs(dt); updateTorps(dt); updateCrates(dt); updateFlares(dt); updateCIWS(dt);
  updatePrice(dt); updateHot(dt);
  G.routeT -= dt; if (G.routeT <= 0) updateRoute();
  updateCamera(dt); updateFx(dt);
  emit('update', dt);
  const live = o => !o.dead;
  G.mines = G.mines.filter(live); G.boats = G.boats.filter(live); G.drones = G.drones.filter(live); G.missiles = G.missiles.filter(live);
  G.balls = G.balls.filter(live); G.subs = G.subs.filter(live); G.torps = G.torps.filter(live); G.crates = G.crates.filter(live); G.flares = G.flares.filter(live);
  const threat = G.missiles.length * 0.18 + G.drones.filter(d => !d.pizza).length * 0.07 + G.balls.length * 0.2 + G.boats.length * 0.12 + G.torps.length * 0.2;
  Snd.target = G.attract ? 0.15 : clamp(0.3 + threat + (G.cfg.threat - 1) * 0.6, 0.3, 1);
}
