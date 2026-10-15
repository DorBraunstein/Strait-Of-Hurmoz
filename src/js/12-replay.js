
/* =========================================================
   FEATURE: INSTANT REPLAY — slow-motion replay of the level's best close call
   ========================================================= */
feature({ id: 'replay', group: 'FUNNY', name: 'Close-call replay', desc: 'Records your best near miss of the level and replays it in slow motion on the results screen, with an over-the-top sports commentator.' });

const RP_CALLS = [
  'THE CAPTAIN TURNED A 300-METRE TANKER LIKE A JET SKI!',
  'OH MY GOODNESS! THAT MISSILE NEEDS GLASSES!',
  'UNBELIEVABLE SCENES IN THE STRAIT! INSURANCE ADJUSTERS ARE WEEPING!',
  'WHAT A DODGE! THE MISSILE IS FILING A COMPLAINT!',
  'TEXTBOOK! IF THE TEXTBOOK WAS WRITTEN BY A MANIAC!',
  "THE CLOSEST SHAVE SINCE THE CAPTAIN'S LAST BEARD TRIM!",
  'THE CROWD GOES MILD! THE CROWD IS THREE SEAGULLS!',
  'NOBODY STEERS A SUPERTANKER LIKE THAT! NOBODY SHOULD!'
];
const RP = { frames: [], booms: [], acc: 0, rid: 0, pending: null, best: null, raf: 0, start: 0, ctx: null };
const rpOn = () => G && !G.attract && feat('replay');

onEvt('levelStart', () => { RP.frames = []; RP.booms = []; RP.pending = null; RP.best = null; RP.acc = 0; cancelAnimationFrame(RP.raf); });
onEvt('update', dt => {
  if (!rpOn()) return;
  if (G.mode === 'play' || RP.pending) {
    RP.acc += dt;
    if (RP.acc >= 1 / 30) { RP.acc = 0; RP.frames.push(rpSnap()); while (RP.frames.length && G.t - RP.frames[0].t > 3.4) RP.frames.shift(); }
  }
  if (RP.pending && G.t >= RP.pending.at) rpFinish();
});
onEvt('explode', (x, y, r) => {
  if (!rpOn()) return;
  RP.booms.push({ t: G.t, x, y, r });
  while (RP.booms.length && G.t - RP.booms[0].t > 4) RP.booms.shift();
});
onEvt('nearMiss', (x, y) => {
  if (!rpOn() || RP.pending) return;
  RP.pending = { at: G.t + 0.8, hit: G.t, x, y, d: Math.max(0, shipDist(x, y)), combo: G.combo };
});
function rpSnap() {
  const P = G.P, th = [], near = (x, y) => d2(x, y, P.x, P.y) < 760 * 760, id = o => o.rid || (o.rid = ++RP.rid);
  for (const m of G.missiles) if (!m.dead && near(m.x, m.y)) th.push(['m', id(m), m.x, m.y, m.a]);
  for (const d of G.drones) if (!d.dead && !d.pizza && near(d.x, d.y)) th.push(['d', id(d), d.x, d.y, d.a, d.st === 'dive' ? d.alt : 1]);
  for (const b of G.balls) if (!b.dead && b.t >= 0 && near(b.x, b.y)) th.push(['b', id(b), b.x, b.y, b.r, b.t / b.T]);
  for (const t of G.torps) if (!t.dead && near(t.x, t.y)) th.push(['t', id(t), t.x, t.y, t.a]);
  for (const m of G.mines) if (!m.dead && near(m.x, m.y)) th.push(['n', id(m), m.x, m.y]);
  for (const b of G.boats) if (!b.dead && near(b.x, b.y)) th.push(['s', id(b), b.x, b.y, b.a]);
  return { t: G.t, x: P.x, y: P.y, a: P.a, cargo: P.cargo / P.cap, th };
}
function rpFinish() {
  const p = RP.pending; RP.pending = null;
  const t0 = p.at - 3.0, frames = RP.frames.filter(f => f.t >= t0);
  if (frames.length < 20) return;
  const boom = RP.booms.find(b => Math.abs(b.x - p.x) < 1 && Math.abs(b.y - p.y) < 1 && Math.abs(b.t - p.hit) < 0.05);
  if (boom) p.d = Math.max(0, p.d - boom.r * 0.8); // blasts: measure from the edge of the damage radius
  const score = p.combo * 25 - p.d;
  if (RP.best && score <= RP.best.score) return;
  const metres = Math.max(1, Math.round(p.d * 4.7));
  const call = p.combo >= 3 ? 'A ×' + p.combo + ' COMBO! SOMEBODY STOP THIS CAPTAIN!' : pick(RP_CALLS);
  RP.best = { frames, booms: RP.booms.filter(b => b.t >= t0 && b.t <= p.at), hit: p.hit, score, metres, line: 'MISSED BY ' + metres + ' METRES. ' + call };
}

/* ---------- results screen ---------- */
onEvt('port', () => {
  const box = $('replayBox');
  cancelAnimationFrame(RP.raf);
  box.hidden = !(feat('replay') && RP.best);
  if (box.hidden) return;
  $('replayLine').textContent = RP.best.line;
  RP.start = performance.now();
  const loop = () => {
    if (box.hidden || UI.sPort.hidden) return;
    try { drawReplay(); } catch (e) { console.error(e); return; }
    RP.raf = requestAnimationFrame(loop);
  };
  RP.raf = requestAnimationFrame(loop);
});
function drawReplay() {
  const cv = $('replayCv'), r = cv.getBoundingClientRect();
  if (r.width < 10) return;
  const W = Math.round(r.width * DPR), H = Math.round(r.height * DPR);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const c = RP.ctx || (RP.ctx = cv.getContext('2d')), clip = RP.best, fr = clip.frames;
  const T0 = fr[0].t, T1 = fr[fr.length - 1].t, speed = 0.35, hold = 1.1;
  const total = (T1 - T0) / speed + hold, wall = (performance.now() - RP.start) / 1000;
  const t = Math.min(T0 + (wall % total) * speed, T1);
  let i = 0;
  while (i < fr.length - 2 && fr[i + 1].t <= t) i++;
  const A = fr[i], B = fr[i + 1] || A, u = B.t > A.t ? clamp((t - A.t) / (B.t - A.t), 0, 1) : 0;
  const sx = lerp(A.x, B.x, u), sy = lerp(A.y, B.y, u), sa = A.a + angDiff(A.a, B.a) * u;
  const s = W / 640;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = C.sea; c.fillRect(0, 0, W, H);
  c.setTransform(s, 0, 0, s, W / 2 - sx * s, H / 2 - sy * s);
  c.drawImage(MAP.sea, 0, 0, WW, WH);
  c.strokeStyle = C.coast; c.lineWidth = 2 / s; c.stroke(MAP.landPath);
  const bmap = new Map(B.th.map(o => [o[1], o]));
  const trail = (rid, from) => { const pts = []; for (let k = Math.max(0, from - 14); k <= from; k++) { const o = fr[k].th.find(q => q[1] === rid); if (o) pts.push(o); } return pts; };
  for (const o of A.th) {
    const n = bmap.get(o[1]) || o, x = lerp(o[2], n[2], u), y = lerp(o[3], n[3], u), kind = o[0];
    if (kind === 'b') {
      const k = lerp(o[5], n[5], u);
      c.fillStyle = 'rgba(194,53,43,' + (0.12 + 0.2 * k).toFixed(3) + ')'; c.beginPath(); c.arc(x, y, o[4], 0, TAU); c.fill();
      c.strokeStyle = C.hull; c.lineWidth = 2.5; c.setLineDash([12, 7]); c.stroke(); c.setLineDash([]);
    } else if (kind === 'n') {
      c.fillStyle = '#2A333E'; c.beginPath(); c.arc(x, y, 9.5, 0, TAU); c.fill();
      c.strokeStyle = '#1C232C'; c.lineWidth = 2.8; c.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; c.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); c.lineTo(x + Math.cos(a) * 13.5, y + Math.sin(a) * 13.5); } c.stroke();
    } else {
      const a = o[4] + angDiff(o[4], n[4]) * u;
      if (kind === 'm' || kind === 't') {
        const pts = trail(o[1], i);
        if (pts.length > 1) { c.strokeStyle = kind === 'm' ? 'rgba(110,118,128,.5)' : 'rgba(255,255,255,.85)'; c.lineWidth = kind === 'm' ? 6 : 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[0][2], pts[0][3]); for (const q of pts) c.lineTo(q[2], q[3]); c.lineTo(x, y); c.stroke(); }
      }
      c.save(); c.translate(x, y); c.rotate(a);
      if (kind === 'm') {
        c.fillStyle = '#FFB13B'; c.beginPath(); c.moveTo(-9, -2.5); c.lineTo(-20, 0); c.lineTo(-9, 2.5); c.fill();
        c.fillStyle = '#E6E8EB'; c.fillRect(-9, -2.6, 16, 5.2); c.fillStyle = C.hull; c.beginPath(); c.moveTo(7, -2.6); c.lineTo(12, 0); c.lineTo(7, 2.6); c.fill();
      } else if (kind === 't') { c.fillStyle = '#20262E'; c.beginPath(); c.ellipse(0, 0, 9, 2.6, 0, 0, TAU); c.fill(); }
      else if (kind === 'd') { c.fillStyle = '#4C5560'; c.beginPath(); c.moveTo(13, 0); c.lineTo(-9, -12); c.lineTo(-5, 0); c.lineTo(-9, 12); c.closePath(); c.fill(); }
      else { c.fillStyle = '#5B6672'; c.beginPath(); c.moveTo(13, 0); c.quadraticCurveTo(6, -6, -10, -5); c.lineTo(-10, 5); c.quadraticCurveTo(6, 6, 13, 0); c.fill(); }
      c.restore();
    }
  }
  withCtx(c, () => paintPlayerShip(sx, sy, sa, { cargo: A.cargo, deck: '#A5432F' }));
  for (const b of clip.booms) {
    const k = (t - b.t) / 0.7;
    if (k < 0 || k > 1) continue;
    c.fillStyle = 'rgba(255,150,40,' + (0.85 * (1 - k)).toFixed(3) + ')'; c.beginPath(); c.arc(b.x, b.y, b.r * (0.4 + k * 0.8), 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,' + (1 - k).toFixed(3) + ')'; c.lineWidth = 4; c.beginPath(); c.arc(b.x, b.y, b.r * (0.5 + k * 1.1), 0, TAU); c.stroke();
  }
  // broadcast overlay
  c.setTransform(1, 0, 0, 1, 0, 0);
  const k = DPR, f = Math.max(11, Math.round(W / k / 46)) * k, pad = f * 0.6, bh = f * 1.7;
  c.font = '800 ' + f + 'px ' + FONT_UI; c.textBaseline = 'middle'; c.textAlign = 'left';
  const w1 = c.measureText('INSTANT REPLAY').width + f * 0.9 + pad * 2;
  c.fillStyle = C.hull; c.fillRect(10 * k, 10 * k, w1, bh);
  c.fillStyle = C.paper; c.fillText('INSTANT REPLAY', 10 * k + pad + f * 0.9, 10 * k + bh / 2);
  if (Math.floor(wall * 2) % 2) { c.beginPath(); c.arc(10 * k + pad + f * 0.3, 10 * k + bh / 2, f * 0.26, 0, TAU); c.fill(); }
  c.font = '600 ' + Math.round(f * 0.85) + 'px ' + FONT_MONO;
  const w2 = c.measureText('SLOW-MO ×0.35').width + pad * 2;
  c.fillStyle = 'rgba(22,38,58,.85)'; c.fillRect(W - 10 * k - w2, 10 * k, w2, bh);
  c.fillStyle = C.paper; c.fillText('SLOW-MO ×0.35', W - 10 * k - w2 + pad, 10 * k + bh / 2);
  c.fillStyle = 'rgba(22,38,58,.25)'; c.fillRect(0, H - 5 * k, W, 5 * k);
  c.fillStyle = C.magenta; c.fillRect(0, H - 5 * k, W * clamp((t - T0) / (T1 - T0), 0, 1), 5 * k);
  if (Math.abs(t - clip.hit) < 0.5) {
    const big = f * 2.2;
    c.font = Math.round(big) + 'px ' + FONT_ST; c.textAlign = 'center'; c.lineJoin = 'round';
    c.lineWidth = big * 0.18; c.strokeStyle = C.paper; c.strokeText('MISSED BY ' + clip.metres + ' M!', W / 2, H * 0.22);
    c.fillStyle = C.magenta; c.fillText('MISSED BY ' + clip.metres + ' M!', W / 2, H * 0.22);
  }
}
