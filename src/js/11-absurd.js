
/* =========================================================
   FEATURE: ABSURD ENEMIES — seagull swarms, a very lost carrier, inflatable decoys
   ========================================================= */
feature({ id: 'absurd', group: 'FUNNY', name: 'Absurd enemies', desc: 'From level 4: seagull swarms that block the view, a very lost aircraft carrier going the wrong way with flyby jets, and inflatable decoy tankers that missiles love.' });

RADIO.gulls = ['Crew: Seagulls! They have... decorated the bridge.', 'Crew: The gulls are back. Hide the fries.', 'Navigator: I cannot see. There is a seagull on my face.'];
RADIO.carrier = ['Carrier: Does anyone know the way to Hawaii?', 'Carrier: We are not lost. We are exploring.', 'Crew: There is a giant aircraft carrier going the wrong way.'];
RADIO.decoy = ['Crew: Someone inflated a fake tanker. Missiles love it.', 'Broker: Inflatable decoy deployed. Very convincing. Very pink.'];
const CARRIER_LINES = ['IS THIS THE PACIFIC?', 'WHERE IS HAWAII?', 'WE ARE NOT LOST', 'ANYONE HAVE A MAP?', 'GPS SAYS LEFT', 'SORRY, NEW HERE', 'RECALCULATING...', 'IS THIS THE MED?'];
Snd.squawk = function (x, y) {
  if (!this.ok('squawk', 0.22)) return;
  const v = x === undefined ? 1 : Math.max(0.3, this.att(x, y));
  this.tone(rand(1300, 1700), 0.16, 'sawtooth', 0.05 * v, rand(700, 900)); this.hiss(0.12, 'bandpass', 2400, 0.12 * v, 4);
};
Snd.jet = function () { if (this.ok('jet', 0.8)) { this.hiss(1.4, 'bandpass', 400, 0.5, 1.2, 2400); this.tone(90, 0.9, 'sawtooth', 0.06, 50, 0.3); } };
Snd.pffft = function () {
  if (!this.ok('pffft', 0.4)) return;
  const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), l = c.createOscillator(), lg = c.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(55, t + 1.3);
  f.type = 'lowpass'; f.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  l.frequency.value = 22; lg.gain.value = 0.08; l.connect(lg); lg.connect(g.gain);
  o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); l.start(t); o.stop(t + 1.45); l.stop(t + 1.45);
};

const AB = { carrier: null, gulls: [], gullT: 30, decoys: [], decoyT: 20, jets: [], splats: [] };
const abOn = () => G && !G.attract && feat('absurd');
onEvt('levelStart', () => {
  AB.carrier = null; AB.gulls = []; AB.decoys = []; AB.jets = []; AB.splats = [];
  AB.gullT = rand(16, 26); AB.decoyT = rand(12, 20);
  if (abOn() && G.level >= 5 && (G.level >= 9 || Math.random() < 0.75)) spawnCarrier();
});

onEvt('update', dt => {
  if (!abOn()) return;
  const lvl = G.level, playing = G.mode === 'play';
  if (playing && lvl >= 4 && (AB.gullT -= dt) <= 0) { AB.gullT = rand(28, 42); spawnGulls(); }
  if (playing && (lvl >= 5 || G.cfg.cruise) && (AB.decoyT -= dt) <= 0) { AB.decoyT = rand(26, 36); if (AB.decoys.length < 2) spawnDecoy(); }
  updateGulls(dt); updateCarrier(dt); updateDecoys(dt); updateJets(dt);
});

/* ---------- seagulls ---------- */
function spawnGulls() {
  const P = G.P, a = rand(TAU), sx = P.x + Math.cos(a) * 900, sy = P.y + Math.sin(a) * 900;
  const dir = Math.atan2(P.y - sy, P.x - sx) + rand(-0.25, 0.25), n = randi(22, 30);
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(Math.random()) * 230, q = rand(TAU), sp = rand(150, 190);
    AB.gulls.push({ x: sx + Math.cos(q) * r, y: sy + Math.sin(q) * r, vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp, ph: rand(TAU), s: rand(1.5, 2.4), t: 0, flee: false, pooped: false });
  }
  say('SEAGULLS!', 'HONK TO SCATTER THEM', C.ink2, 1.6); radio('gulls'); Snd.squawk();
}
function updateGulls(dt) {
  if (!AB.gulls.length) return;
  const P = G.P;
  for (const g of AB.gulls) {
    g.t += dt; g.ph += dt * (g.flee ? 22 : 12);
    g.x += g.vx * dt; g.y += g.vy * dt;
    if (!g.flee) { g.vx += Math.cos(g.t * 2 + g.ph) * 30 * dt; g.vy += Math.sin(g.t * 1.7 + g.ph) * 30 * dt; }
    if (!g.pooped && !g.flee && G.mode === 'play' && !P.dead && shipDist(g.x, g.y) < 6 && Math.random() < 0.6) {
      g.pooped = true;
      const c = Math.cos(P.a), s = Math.sin(P.a), dx = g.x - P.x, dy = g.y - P.y;
      if (AB.splats.length < 10) AB.splats.push({ lx: clamp(dx * c + dy * s, -26, 26), ly: clamp(-dx * s + dy * c, -6, 6), r: rand(2.5, 4.5), rot: rand(TAU) });
      if (Math.random() < 0.3) popup(P.x, P.y - 30, 'SPLAT!', C.ink2, 18);
    }
    if (Math.random() < dt * 0.25) Snd.squawk(g.x, g.y);
  }
  AB.gulls = AB.gulls.filter(g => g.t < 16 && d2(g.x, g.y, P.x, P.y) < 2000 * 2000);
}
onEvt('honk', () => {
  if (!abOn()) return;
  const P = G.P;
  let n = 0;
  for (const g of AB.gulls) {
    const d = Math.hypot(g.x - P.x, g.y - P.y);
    if (d < 520) { g.flee = true; const a = Math.atan2(g.y - P.y, g.x - P.x) + rand(-0.3, 0.3); g.vx = Math.cos(a) * 480; g.vy = Math.sin(a) * 480; n++; }
  }
  if (n > 3) { popup(P.x, P.y - 60, 'GULLS SCATTERED', C.ink2, 18); Snd.squawk(); }
  const k = AB.carrier;
  if (k && d2(k.x, k.y, P.x, P.y) < 600 * 600) { k.say = 'WHICH WAY TO HAWAII?'; k.sayT = 2.5; }
});
function drawGull(g) {
  const flap = Math.cos(g.ph), span = 17 * g.s * (0.72 + 0.28 * Math.abs(flap)), bend = 5 * g.s * flap, a = Math.atan2(g.vy, g.vx);
  ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(a);
  ctx.fillStyle = 'rgba(22,38,58,.13)'; ctx.beginPath(); ctx.ellipse(-16, 26, 6 * g.s, span * 0.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FBFBF8'; ctx.strokeStyle = '#56636F'; ctx.lineWidth = 1.1;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(2 * g.s, 0);
    ctx.quadraticCurveTo(3 * g.s + bend * 0.4, side * span * 0.45, -1 * g.s + bend, side * span * 0.55);
    ctx.lineTo(-6 * g.s + bend * 0.6, side * span);
    ctx.lineTo(-8 * g.s + bend * 0.6, side * span * 0.92);
    ctx.quadraticCurveTo(-6 * g.s, side * span * 0.5, -5 * g.s, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2F3740'; ctx.beginPath(); ctx.moveTo(-4.6 * g.s + bend * 0.6, side * span * 0.82); ctx.lineTo(-6 * g.s + bend * 0.6, side * span); ctx.lineTo(-8 * g.s + bend * 0.6, side * span * 0.92); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FBFBF8';
  }
  ctx.beginPath(); ctx.ellipse(-1.5 * g.s, 0, 6.5 * g.s, 2.4 * g.s, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7 * g.s, -1.6 * g.s); ctx.lineTo(-10 * g.s, 0); ctx.lineTo(-7 * g.s, 1.6 * g.s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F2A31D'; ctx.beginPath(); ctx.moveTo(4.8 * g.s, -0.8 * g.s); ctx.lineTo(7.6 * g.s, 0); ctx.lineTo(4.8 * g.s, 0.8 * g.s); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ---------- the very lost aircraft carrier ---------- */
function spawnCarrier() {
  const P = G.P;
  for (let k = 0; k < 20; k++) {
    const L = pick(LANES), s = L.len * rand(0.35, 0.95), [x, y, a] = lanePos(L, s);
    if (d2(x, y, P.x, P.y) < 1100 * 1100) continue;
    AB.carrier = { L, s, v: -58, x, y, a: a + Math.PI, say: pick(CARRIER_LINES), sayT: 3, lineT: rand(8, 12), jetT: rand(7, 11), bx: 0, by: 0, ox: 0, oy: 0 };
    radio('carrier');
    return;
  }
}
function updateCarrier(dt) {
  const k = AB.carrier;
  if (!k) return;
  k.s += k.v * dt;
  if (k.s < 30 || k.s > k.L.len - 30) { k.v = -k.v; k.s = clamp(k.s, 30, k.L.len - 30); k.say = 'WRONG WAY AGAIN?'; k.sayT = 2.5; }
  const [x, y, la] = lanePos(k.L, k.s), want = k.v < 0 ? la + Math.PI : la;
  k.a += clamp(angDiff(k.a, want), -0.3 * dt, 0.3 * dt);
  k.bx *= Math.exp(-1.5 * dt); k.by *= Math.exp(-1.5 * dt);
  k.ox = (k.ox + k.bx * dt) * Math.exp(-0.3 * dt); k.oy = (k.oy + k.by * dt) * Math.exp(-0.3 * dt);
  k.x = x + k.ox; k.y = y + k.oy;
  k.sayT -= dt;
  if ((k.lineT -= dt) <= 0) { k.lineT = rand(9, 14); k.say = pick(CARRIER_LINES); k.sayT = 3; }
  if (G.mode === 'play' && (k.jetT -= dt) <= 0) { k.jetT = rand(10, 16); AB.jets.push({ x: k.x, y: k.y, a: k.a + rand(-0.4, 0.4), t: 0, boom: false, trail: [] }); }
  const P = G.P, c = Math.cos(k.a), s = Math.sin(k.a), seg = (px, py) => segDist(px, py, k.x - c * 66, k.y - s * 66, k.x + c * 70, k.y + s * 70);
  for (const m of G.missiles) if (!m.dead && seg(m.x, m.y) < 15) { m.dead = true; explode(m.x, m.y, 40, { dmg: 22, src: 'missile' }); k.say = 'OW! WE ARE ON YOUR SIDE'; k.sayT = 2.5; }
  for (const m of G.mines) if (!m.dead && m.fuse <= 0 && seg(m.x, m.y) < 18) { m.dead = true; explode(m.x, m.y, 46, { dmg: 22, src: 'mine' }); }
  if (P.dead || G.mode !== 'play') return;
  let minD = 1e9, mx = 0, my = 0;
  for (let i = -3; i <= 3; i++) { const px = k.x + c * 22 * i, py = k.y + s * 22 * i, sd = shipDist(px, py); if (sd < minD) { minD = sd; mx = px; my = py; } }
  if (minD < 14) {
    let nx = P.x - mx, ny = P.y - my; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    P.x += nx * (15 - minD); P.y += ny * (15 - minD);
    const vn = P.vx * nx + P.vy * ny;
    if (vn < 0) { P.vx -= 1.6 * vn * nx; P.vy -= 1.6 * vn * ny; }
    k.bx -= nx * 20; k.by -= ny * 20;
    if (-vn > 110 && P.inv <= 0) { hurt(6, P.x, P.y, 'bump', true); Snd.hit(); k.say = 'WATCH IT, WE ARE LOST'; k.sayT = 2.2; popup(P.x, P.y - 30, 'BONK', C.ink, 20); }
  }
}
function drawCarrier(k) {
  ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.a);
  ctx.fillStyle = 'rgba(22,38,58,.2)'; ctx.beginPath(); ctx.moveTo(-70, -12); ctx.lineTo(66, -14); ctx.lineTo(84, 4); ctx.lineTo(66, 18); ctx.lineTo(-70, 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5E6874'; ctx.beginPath(); ctx.moveTo(-74, -14); ctx.lineTo(62, -17); ctx.lineTo(80, 0); ctx.lineTo(62, 15); ctx.lineTo(-74, 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7D8894'; ctx.beginPath(); ctx.moveTo(-70, -22); ctx.lineTo(30, -28); ctx.lineTo(52, -16); ctx.lineTo(60, -14); ctx.lineTo(76, 0); ctx.lineTo(60, 11); ctx.lineTo(-70, 10); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.rotate(-0.16);
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(40, -10); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(242,194,48,.8)'; ctx.beginPath(); ctx.moveTo(-60, -17); ctx.lineTo(40, -17); ctx.moveTo(-60, -3); ctx.lineTo(40, -3); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#3B4550'; ctx.fillRect(-6, 4, 24, 7); ctx.fillStyle = '#2A323B'; ctx.fillRect(0, 6, 8, 3);
  ctx.fillStyle = '#5E6874';
  for (let i = 0; i < 4; i++) { const jx = -64 + i * 11; ctx.beginPath(); ctx.moveTo(jx + 6, 3); ctx.lineTo(jx, -1); ctx.lineTo(jx, 7); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '800 16px ' + FONT_UI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.translate(58, -1); ctx.rotate(Math.PI / 2); ctx.fillText('??', 0, 0); ctx.restore();
  ctx.restore();
  if (k.sayT > 0) bubbleText(k.x, k.y - 40, k.say);
  const fs = Math.max(11, px(10)); setFont(700, fs, FONT_UI); ctx.textAlign = 'center'; ctx.lineWidth = px(3); ctx.strokeStyle = C.paper; ctx.fillStyle = C.ink2;
  spacedText('USS VERY LOST', k.x, k.y + 36, 1, true);
}
function updateJets(dt) {
  if (!AB.jets.length) return;
  const P = G.P;
  for (const j of AB.jets) {
    j.t += dt; j.a += Math.sin(j.t * 1.3) * 0.5 * dt;
    j.x += Math.cos(j.a) * 720 * dt; j.y += Math.sin(j.a) * 720 * dt;
    trailPush(j, j.x, j.y, 0.04, 0.9);
    if (!j.boom && d2(j.x, j.y, P.x, P.y) < 420 * 420) { j.boom = true; addShake(9); Snd.jet(); popup(j.x, j.y, 'SORRY!', C.ink2, 18); }
  }
  AB.jets = AB.jets.filter(j => j.t < 4);
}
function drawJet(j) {
  if (j.trail.length > 1) {
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(j.trail[0].x, j.trail[0].y); for (const p of j.trail) ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  ctx.save(); ctx.translate(j.x, j.y); ctx.rotate(j.a);
  ctx.fillStyle = 'rgba(22,38,58,.18)'; ctx.beginPath(); ctx.moveTo(-6, 26); ctx.lineTo(-18, 18); ctx.lineTo(-18, 34); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7D8894'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-2, -4); ctx.lineTo(-6, -14); ctx.lineTo(-10, -14); ctx.lineTo(-9, -3); ctx.lineTo(-14, -2); ctx.lineTo(-16, -7); ctx.lineTo(-18, -7); ctx.lineTo(-17, 0);
  ctx.lineTo(-18, 7); ctx.lineTo(-16, 7); ctx.lineTo(-14, 2); ctx.lineTo(-9, 3); ctx.lineTo(-10, 14); ctx.lineTo(-6, 14); ctx.lineTo(-2, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9BC7E4'; ctx.beginPath(); ctx.ellipse(6, 0, 4, 1.6, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ---------- inflatable decoy tankers ---------- */
function spawnDecoy() {
  const P = G.P, pt = randomWater(60, 9999, P.x + P.vx * 1.5, P.y + P.vy * 1.5, 380, 720, 40);
  if (!pt) return;
  AB.decoys.push({ x: pt[0], y: pt[1], a: rand(TAU), t: 0, hp: 2, deflate: 0, vx: rand(-8, 8), vy: rand(-8, 8), dead: false });
  say('INFLATABLE DECOY', 'MISSILES LOVE IT', '#C2457A', 1.6); radio('decoy');
}
function updateDecoys(dt) {
  if (!AB.decoys.length) return;
  for (const d of AB.decoys) {
    d.t += dt;
    if (d.deflate > 0) {
      d.deflate -= dt; d.a += dt * 9;
      d.vx += rand(-900, 900) * dt; d.vy += rand(-900, 900) * dt; d.vx *= 0.96; d.vy *= 0.96;
      if (d.deflate <= 0) d.dead = true;
    } else if (d.t > 32) { d.deflate = 1.6; Snd.pffft(); }
    d.x += d.vx * dt; d.y += d.vy * dt;
    if (d.deflate > 0 || d.dead) continue;
    for (const m of G.missiles) if (!m.dead && !m.target && !m.lost && !m.dc && d2(m.x, m.y, d.x, d.y) < 900 * 900) {
      m.dc = true;
      if (Math.random() < 0.9) { m.target = d; popup(m.x, m.y - 14, "DECOY'D!", '#C2457A', 16); }
    }
    for (const dr of G.drones) if (!dr.dead && !dr.pizza && !dr.target && !dr.dc && dr.st === 'approach' && d2(dr.x, dr.y, d.x, d.y) < 600 * 600) {
      dr.dc = true;
      if (Math.random() < 0.7) dr.target = d;
    }
  }
  AB.decoys = AB.decoys.filter(d => !d.dead);
}
onEvt('explode', (x, y, r) => {
  if (!abOn()) return;
  for (const d of AB.decoys) if (!d.dead && d.deflate <= 0 && d2(x, y, d.x, d.y) < (r + 34) * (r + 34)) {
    if (--d.hp <= 0) { d.deflate = 1.6; Snd.pffft(); popup(d.x, d.y - 26, 'PFFFFFT', '#C2457A', 24); }
  }
});
function drawDecoy(d) {
  const k = d.deflate > 0 ? Math.max(0.15, d.deflate / 1.6) : 1, wob = 1 + Math.sin(d.t * 3) * 0.03;
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.scale(k * wob, k);
  ctx.fillStyle = 'rgba(22,38,58,.16)'; ctx.beginPath(); ctx.ellipse(4, 5, 36, 13, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#F27BB5'; ctx.strokeStyle = '#B5126E'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-32, -10); ctx.lineTo(22, -11); ctx.quadraticCurveTo(38, -10, 38, 0); ctx.quadraticCurveTo(38, 10, 22, 11); ctx.lineTo(-32, 10); ctx.quadraticCurveTo(-38, 0, -32, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F7CF3B';
  for (let i = 0; i < 4; i++) ctx.fillRect(-22 + i * 13, -10, 5, 20);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-34, -7, 9, 14);
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(8, -9, 26, -6); ctx.stroke();
  ctx.fillStyle = '#B5126E'; ctx.beginPath(); ctx.arc(30, 6, 2.2, 0, TAU); ctx.fill();
  ctx.restore();
  if (d.deflate <= 0) {
    const fs = Math.max(10, px(9)); setFont(800, fs, FONT_UI); ctx.textAlign = 'center'; ctx.lineWidth = px(3); ctx.strokeStyle = C.paper; ctx.fillStyle = '#B5126E';
    spacedText('TOTALLY REAL TANKER', d.x, d.y + 26, 1, true);
  }
}

/* ---------- drawing layers ---------- */
onEvt('drawSea', V => {
  if (!abOn()) return;
  if (AB.carrier && inView(V, AB.carrier.x, AB.carrier.y, 200)) drawCarrier(AB.carrier);
  for (const d of AB.decoys) if (inView(V, d.x, d.y, 80)) drawDecoy(d);
});
onEvt('drawAir', V => {
  if (!abOn()) return;
  const P = G.P;
  if (AB.splats.length && !P.dead) {
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.a); ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (const s of AB.splats) { ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = s.rot + i / 7 * TAU, rr = s.r * (i % 2 ? 0.55 : 1); ctx.lineTo(s.lx + Math.cos(a) * rr, s.ly + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  for (const j of AB.jets) drawJet(j);
  for (const g of AB.gulls) if (inView(V, g.x, g.y, 60)) drawGull(g);
});
