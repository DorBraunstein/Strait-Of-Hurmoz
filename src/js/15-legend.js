
/* =========================================================
   FEATURE: CAPTAIN LEGEND — stylish play fills a meter; full meter = double pay + metal
   ========================================================= */
feature({ id: 'legend', group: 'ADDICTIVE', name: 'Captain Legend meter', desc: 'Close calls, friendly fire, sales and shoot-downs fill a meter. When it is full: 10 seconds of double pay, a heavy-metal horn and a golden tanker.' });

Snd.metal = function () {
  if (!this.ok('metal', 1)) return;
  const c = this.ctx, t0 = c.currentTime + 0.02;
  const shaper = c.createWaveShaper(), curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 512 - 1) * 7);
  shaper.curve = curve; shaper.oversample = '2x';
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
  const out = c.createGain(); out.gain.value = 0.2;
  shaper.connect(lp); lp.connect(out); out.connect(this.sfx);
  const chord = (f, at, len, peak) => {
    for (const m of [1, 1.5, 2]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(g); g.connect(shaper); o.start(at); o.stop(at + len + 0.05);
    }
  };
  [[82.4, 0, 0.12], [82.4, 0.18, 0.12], [98, 0.36, 0.12], [82.4, 0.54, 0.12], [110, 0.72, 0.22], [103.8, 0.98, 0.12], [98, 1.16, 0.12]].forEach(([f, d, l]) => chord(f, t0 + d, l, 0.5));
  chord(98, t0 + 1.34, 0.95, 0.4); chord(123.5, t0 + 1.34, 0.95, 0.3);
  this.hiss(1.5, 'highpass', 5200, 0.32, 0.7, null, 1.34); this.tone(62, 0.35, 'sine', 0.6, 40, 1.34);
  for (let i = 0; i < 7; i++) this.tone(58, 0.16, 'sine', 0.45, 40, i * 0.18);
};

const LG = { v: 0, t: 0, hudT: 0, count: 0 };
const lgOn = () => G && !G.attract && feat('legend');
onEvt('levelStart', () => {
  LG.v = 0; LG.t = 0; LG.count = 0;
  const row = $('hLegendRow');
  row.hidden = !lgOn(); row.classList.remove('on');
  lgHud(true);
});
function lgAdd(n) {
  if (!lgOn() || G.mode !== 'play' || LG.t > 0) return;
  LG.v = Math.min(100, LG.v + n);
  if (LG.v >= 100) legendOn();
}
onEvt('nearMiss', () => lgAdd(12 + 6 * Math.min(3, G.combo)));
onEvt('ff', () => lgAdd(15));
onEvt('ciwsKill', () => lgAdd(4));
onEvt('deliver', () => lgAdd(14));
onEvt('shaken', () => lgAdd(8));
onEvt('pizza', () => lgAdd(6));
onEvt('chain', () => lgAdd(6));
function legendOn() {
  LG.t = 10; LG.count++;
  G.payMult = (G.payMult || 1) * 2; G.musicBoost = 1;
  say('CAPTAIN LEGEND!', 'DOUBLE PAY FOR 10 SECONDS', '#C98300', 2.4);
  Snd.metal(); addShake(14);
  G.rings.push({ x: G.P.x, y: G.P.y, r0: 40, r1: 420, t: 0, life: 0.9, w: 9, col: '242,190,40' });
  $('hLegendRow').classList.add('on');
}
function legendOff() {
  LG.t = 0; LG.v = 0;
  G.payMult = Math.max(1, (G.payMult || 2) / 2); G.musicBoost = 0;
  $('hLegendRow').classList.remove('on');
}
onEvt('update', dt => {
  if (!lgOn()) return;
  const P = G.P;
  if (LG.t > 0) {
    LG.t -= dt; LG.v = Math.max(0, LG.t * 10);
    if (Math.random() < dt * 30) part('spark', P.x + rand(-40, 40), P.y + rand(-25, 25), rand(-60, 60), rand(-60, 60), 0.5, 2, { drag: 2, col: '#FFD24A' });
    if (Math.random() < dt * 40) { const c = Math.cos(P.a), s = Math.sin(P.a); part('fire', P.x - c * 32 + rand(-3, 3), P.y - s * 32 + rand(-3, 3), -c * 140 + rand(-30, 30), -s * 140 + rand(-30, 30), 0.35, rand(5, 9), { grow: 1.2, drag: 2 }); }
    if (LG.t <= 0 || G.mode !== 'play') legendOff();
  } else if (G.mode === 'play') LG.v = Math.max(0, LG.v - 1.6 * dt);
  lgHud(false, dt);
});
function lgHud(force, dt) {
  LG.hudT -= dt || 0;
  if (!force && LG.hudT > 0) return;
  LG.hudT = 0.1;
  $('hLegend').style.width = LG.v.toFixed(1) + '%';
  $('hLegendN').textContent = LG.t > 0 ? '×2 · ' + Math.ceil(LG.t) + 's' : Math.floor(LG.v) + '%';
}
onEvt('drawSea', () => {
  if (!lgOn() || LG.t <= 0 || G.P.dead) return;
  const P = G.P, r = 70 + Math.sin(G.t * 10) * 6;
  const g = ctx.createRadialGradient(P.x, P.y, 10, P.x, P.y, r);
  g.addColorStop(0, 'rgba(255,214,90,.55)'); g.addColorStop(1, 'rgba(255,214,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, TAU); ctx.fill();
});
onEvt('drawScreen', () => {
  if (!lgOn() || LG.t <= 0) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const a = 0.22 + 0.1 * Math.sin(G.t * 8);
  const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.38, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
  g.addColorStop(0, 'rgba(255,200,40,0)'); g.addColorStop(1, 'rgba(255,200,40,' + a.toFixed(3) + ')');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
});
onEvt('portLedger', (row) => { if (lgOn() && LG.count) row('Captain Legend mode', LG.count + (LG.count === 1 ? ' time' : ' times')); });
