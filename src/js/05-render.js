
/* =========================================================
   RENDER — the chart, the ships, the chaos
   ========================================================= */
const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d'); // swapped temporarily by withCtx() to paint previews
const mini = document.getElementById('mini'), mctx = mini.getContext('2d');
const fxCv = document.createElement('canvas'), fxc = fxCv.getContext('2d');
let DPR = 1, VW = 800, VH = 600, zoom = 1;
const RC = { x: 0, y: 0 };
const SEP_ZONE = [[55.66, 26.315], [56.02, 26.485], [56.30, 26.595], [56.58, 26.57], [56.80, 26.39], [56.96, 26.12], [57.11, 25.78], [57.30, 25.385], [57.56, 24.94]].map(a => P_(a[0], a[1]));
const ROSE = P_(56.95, 24.86);
const FONT_UI = '"Saira Condensed","Roboto Condensed","Arial Narrow",sans-serif';
const FONT_ST = '"Saira Stencil One",Impact,"Arial Narrow",sans-serif';
const FONT_MONO = '"IBM Plex Mono",ui-monospace,Menlo,monospace';
const FONT_SERIF = '"IBM Plex Serif",Georgia,serif';

function resize() {
  VW = Math.max(320, window.innerWidth); VH = Math.max(240, window.innerHeight);
  DPR = Math.min(window.devicePixelRatio || 1, VW * VH > 1500000 ? 1.5 : 2);
  canvas.width = Math.round(VW * DPR); canvas.height = Math.round(VH * DPR);
  zoom = clamp(Math.sqrt(VW * VH) / 1080, 0.45, 1.35);
  fxCv.width = Math.ceil(VW / 2); fxCv.height = Math.ceil(VH / 2);
  const r = mini.getBoundingClientRect();
  if (r.width > 0) { mini.width = Math.round(r.width * DPR); mini.height = Math.round(r.height * DPR); }
}
/** Run fn with the shared drawing helpers pointed at another 2D context. */
function withCtx(c, fn) { const keep = ctx; ctx = c; try { fn(); } finally { ctx = keep; } }
/** Optional painter for the player's tanker (skins); returns true when it drew the ship. */
let shipPainter = null;
function paintPlayerShip(x, y, a, o) { if (!(shipPainter && shipPainter(x, y, a, o))) drawShipShape('tanker', x, y, a, o); }
const inView = (V, x, y, m) => x > V.x0 - m && x < V.x1 + m && y > V.y0 - m && y < V.y1 + m;
const w2s = (x, y) => [(x - RC.x) * zoom + VW / 2, (y - RC.y) * zoom + VH / 2];
const px = n => n / zoom; // screen pixels -> world units
function setFont(weight, size, fam) { ctx.font = weight + ' ' + size.toFixed(1) + 'px ' + fam; }
function spacedText(t, x, y, sp, stroke) {
  if ('letterSpacing' in ctx) { ctx.letterSpacing = sp.toFixed(1) + 'px'; if (stroke) ctx.strokeText(t, x + sp / 2, y); ctx.fillText(t, x + sp / 2, y); ctx.letterSpacing = '0px'; }
  else { if (stroke) ctx.strokeText(t, x, y); ctx.fillText(t, x, y); }
}

function render() {
  const z = zoom;
  let sx = 0, sy = 0;
  if (G.shake > 0.4) { sx = rand(-G.shake, G.shake); sy = rand(-G.shake, G.shake); }
  RC.x = G.cam.x + sx / z; RC.y = G.cam.y + sy / z;
  const hw = VW / 2 / z, hh = VH / 2 / z;
  const V = { x0: RC.x - hw, y0: RC.y - hh, x1: RC.x + hw, y1: RC.y + hh };
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = C.seaDeep; ctx.fillRect(0, 0, VW, VH);
  ctx.save();
  ctx.translate(VW / 2, VH / 2); ctx.scale(z, z); ctx.translate(-RC.x, -RC.y);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(MAP.sea, 0, 0, WW, WH);
  drawNeatline(V);
  drawGraticule(V);
  drawSoundings(V);
  drawTSS();
  drawRose(V);
  drawWaves(V);
  drawSlicks(V);
  drawLand(V);
  drawLabels(V);
  drawZones(V);
  drawRoute();
  drawPartsLow(V);
  emit('drawSea', V);
  for (const c of G.crates) if (inView(V, c.x, c.y, 40)) drawCrate(c);
  for (const m of G.mines) if (inView(V, m.x, m.y, 30)) drawMine(m);
  for (const t of G.torps) drawTorp(t);
  for (const s of G.subs) drawSub(s);
  for (const t of G.traffic) if (inView(V, t.x, t.y, 120)) drawTraffic(t);
  for (const b of G.boats) if (inView(V, b.x, b.y, 60)) drawBoat(b);
  drawPlayer();
  for (const f of G.flares) drawFlare(f);
  for (const m of G.missiles) drawMissile(m, V);
  for (const b of G.balls) drawBallMark(b);
  drawPartsHigh(V);
  for (const d of G.drones) if (inView(V, d.x, d.y, 400)) drawDrone(d);
  emit('drawAir', V);
  for (const b of G.balls) drawBallFall(b);
  drawRings(); drawTracers(); drawPops();
  ctx.restore();
  if (G.cfg.night) drawDark(false);
  else if (G.cfg.fog) drawDark(true);
  drawScreenFx();
  emit('drawScreen', V);
  if (!G.attract) { drawIndicators(V); drawMsgs(); }
  drawJoystick();
}

/* ---------- chart furniture ---------- */
function drawNeatline(V) {
  const b = px(10);
  ctx.fillStyle = C.ink;
  ctx.fillRect(-b, -b, WW + 2 * b, b); ctx.fillRect(-b, WH, WW + 2 * b, b); ctx.fillRect(-b, 0, b, WH); ctx.fillRect(WW, 0, b, WH);
  ctx.fillStyle = C.paper;
  const h = b * 0.45;
  for (let x = 0; x < WW; x += 200) { ctx.fillRect(x, -h - b * 0.25, 100, h); ctx.fillRect(x, WH + b * 0.3, 100, h); }
  for (let y = 0; y < WH; y += 222) { ctx.fillRect(-h - b * 0.25, y, h, 111); ctx.fillRect(WW + b * 0.3, y, h, 111); }
}
function drawGraticule(V) {
  ctx.strokeStyle = C.grat; ctx.lineWidth = px(1);
  ctx.beginPath();
  for (let lo = 54.5; lo < LON1; lo += 0.5) { const x = (lo - LON0) * KX; ctx.moveTo(x, Math.max(0, V.y0)); ctx.lineTo(x, Math.min(WH, V.y1)); }
  for (let la = 25.0; la < LAT1; la += 0.5) { const y = (LAT1 - la) * KY; ctx.moveTo(Math.max(0, V.x0), y); ctx.lineTo(Math.min(WW, V.x1), y); }
  ctx.stroke();
  setFont(500, px(11), FONT_MONO); ctx.fillStyle = 'rgba(44,93,124,.7)'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  for (let lo = 54.5; lo < LON1; lo += 0.5) { const x = (lo - LON0) * KX; if (x > V.x0 && x < V.x1) ctx.fillText(Math.floor(lo) + '°' + (lo % 1 ? '30' : '00') + '′E', x + px(4), Math.max(0, V.y0) + px(84)); }
  for (let la = 25.0; la < LAT1; la += 0.5) { const y = (LAT1 - la) * KY; if (y > V.y0 && y < V.y1) ctx.fillText(Math.floor(la) + '°' + (la % 1 ? '30' : '00') + '′N', Math.max(0, V.x0) + px(6), y + px(3)); }
}
function drawSoundings(V) {
  setFont('italic 500', px(11), FONT_SERIF); ctx.fillStyle = C.sound; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const s of MAP.soundings) if (inView(V, s.x, s.y, 20)) ctx.fillText(s.v, s.x, s.y);
}
function drawTSS() {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(192,23,122,.065)'; ctx.lineWidth = 46;
  ctx.beginPath(); SEP_ZONE.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  ctx.strokeStyle = 'rgba(192,23,122,.55)'; ctx.lineWidth = px(1.6); ctx.setLineDash([px(10), px(8)]);
  for (const L of [LANE_OUT, LANE_IN]) { ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(192,23,122,.55)';
  for (const L of LANES) for (let s = 300; s < L.len; s += 520) {
    const [x, y, a] = lanePos(L, s);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-3, 0); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
function drawRose(V) {
  const [x, y] = ROSE, R = 130;
  if (!inView(V, x, y, R + 40)) return;
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(192,23,122,.6)'; ctx.fillStyle = 'rgba(192,23,122,.6)';
  ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, TAU); ctx.stroke();
  ctx.beginPath();
  for (let d = 0; d < 360; d += 5) { const a = d / 180 * Math.PI - Math.PI / 2, l = d % 30 === 0 ? 14 : d % 10 === 0 ? 9 : 5; ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineTo(Math.cos(a) * (R - l), Math.sin(a) * (R - l)); }
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -R * 0.66); ctx.lineTo(7, -7); ctx.lineTo(R * 0.5, 0); ctx.lineTo(7, 7); ctx.lineTo(0, R * 0.5); ctx.lineTo(-7, 7); ctx.lineTo(-R * 0.5, 0); ctx.lineTo(-7, -7); ctx.closePath(); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
  setFont(700, 18, FONT_UI); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', 0, -R - 14);
  setFont('italic 500', 11, FONT_SERIF); ctx.fillText('VAR 2°E (2026)', 0, R * 0.36);
  ctx.restore();
}
function drawWaves(V) {
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = px(1.3); ctx.lineCap = 'round';
  ctx.beginPath();
  const t = G.t;
  for (const w of MAP.waves) {
    if (!inView(V, w.x, w.y, 20)) continue;
    const k = Math.sin(w.p + t * 1.4);
    if (k < 0.15) continue;
    const l = 9 * k * w.s;
    ctx.moveTo(w.x - l, w.y); ctx.quadraticCurveTo(w.x, w.y - 4 * k, w.x + l, w.y);
  }
  ctx.stroke();
}
function drawSlicks(V) {
  for (const s of G.slicks) {
    if (!inView(V, s.x, s.y, s.r * 2)) continue;
    const a = (1 - s.t / s.life) * 0.55, r = s.r * (1 + Math.min(1, s.t / 4) * 0.6);
    ctx.fillStyle = 'rgba(18,20,26,' + a.toFixed(3) + ')';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const ang = s.seed + i * 1.7, d = r * 0.45; ctx.moveTo(s.x + Math.cos(ang) * d + r * 0.6, s.y + Math.sin(ang) * d); ctx.ellipse(s.x + Math.cos(ang) * d, s.y + Math.sin(ang) * d, r * 0.6, r * 0.42, ang, 0, TAU); }
    ctx.fill();
  }
}
function drawLand(V) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.coast; ctx.lineWidth = px(1.8); ctx.stroke(MAP.landPath);
  ctx.strokeStyle = C.hill; ctx.lineWidth = px(1.2); ctx.lineCap = 'round';
  ctx.beginPath();
  for (const h of MAP.hills) {
    if (!inView(V, h.x, h.y, 20)) continue;
    const s = 7 * h.s;
    ctx.moveTo(h.x - s, h.y + s * 0.5); ctx.lineTo(h.x, h.y - s * 0.5); ctx.lineTo(h.x + s, h.y + s * 0.5);
  }
  ctx.stroke();
}
function drawLabels(V) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const L of LAND_LABELS) {
    const [x, y] = P_(L.lon, L.lat); if (!inView(V, x, y, 500)) continue;
    const s = Math.max(L.s, px(13));
    setFont(700, s, FONT_UI); ctx.fillStyle = 'rgba(22,38,58,.45)';
    spacedText(L.t, x, y, s * 0.35);
    if (L.sub) { setFont(600, s * 0.7, FONT_UI); spacedText(L.sub, x, y + s * 0.95, s * 0.2); }
  }
  for (const [name, lo, la, side] of CITIES) {
    const [x, y] = P_(lo, la); if (!inView(V, x, y, 250)) continue;
    const r = px(3.2);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.paper; ctx.lineWidth = px(1.2); ctx.stroke();
    const fs = Math.max(15, px(11.5)); setFont(600, fs, FONT_UI);
    ctx.fillStyle = C.ink;
    const o = r + fs * 0.4;
    if (side === 'n') { ctx.textAlign = 'center'; ctx.fillText(name, x, y - o - fs * 0.35); }
    else if (side === 's') { ctx.textAlign = 'center'; ctx.fillText(name, x, y + o + fs * 0.35); }
    else if (side === 'e') { ctx.textAlign = 'left'; ctx.fillText(name, x + o, y); }
    else { ctx.textAlign = 'right'; ctx.fillText(name, x - o, y); }
  }
  ctx.textAlign = 'center';
  for (const L of WATER_LABELS) {
    const [x, y] = P_(L.lon, L.lat); if (!inView(V, x, y, 700)) continue;
    const s = Math.max(L.s, px(12));
    ctx.save(); ctx.translate(x, y); ctx.rotate(L.r);
    setFont('italic 500', s, FONT_SERIF); ctx.fillStyle = 'rgba(44,93,124,.62)';
    spacedText(L.t, 0, 0, s * 0.18);
    ctx.restore();
  }
  for (const isl of MAP.islands) {
    if (!inView(V, isl.x, isl.y, 120)) continue;
    const fs = Math.max(13, px(11)); setFont('italic 500', fs, FONT_SERIF); ctx.fillStyle = C.ink2;
    ctx.fillText(isl.name, isl.x, isl.y + isl.r + fs * 0.9);
  }
}

/* ---------- oil fields and buyers ---------- */
function drawFlag(code, x, y, w) {
  const h = w * 0.64;
  ctx.save(); ctx.translate(x - w / 2, y - h / 2);
  if (code === 'in') {
    ctx.fillStyle = '#FF9933'; ctx.fillRect(0, 0, w, h / 3); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, h / 3, w, h / 3); ctx.fillStyle = '#138808'; ctx.fillRect(0, 2 * h / 3, w, h / 3);
    ctx.strokeStyle = '#000080'; ctx.lineWidth = w * 0.03; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.13, 0, TAU); ctx.stroke();
  } else if (code === 'cn') {
    ctx.fillStyle = '#DE2910'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#FFDE00'; star(w * 0.17, h * 0.27, h * 0.16);
    for (const [a, b] of [[0.33, 0.1], [0.4, 0.2], [0.4, 0.35], [0.33, 0.45]]) star(w * a, h * b, h * 0.05);
  } else if (code === 'jp') {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#BC002D'; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.3, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#003399'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#FFCC00';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.arc(w / 2 + Math.cos(a) * h * 0.33, h / 2 + Math.sin(a) * h * 0.33, h * 0.045, 0, TAU); ctx.fill(); }
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, w, h);
  ctx.restore();
  function star(cx, cy, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.4 : r, a = i / 10 * TAU - Math.PI / 2; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
}
function drawZones(V) {
  const P = G.P, t = G.t, tgt = G.routeTarget;
  for (const z of PICKUPS) {
    if (!inView(V, z.x, z.y, z.r + 120)) continue;
    const isT = tgt === z, pulse = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.fillStyle = isT ? 'rgba(242,163,29,' + (0.14 + pulse * 0.08).toFixed(3) + ')' : 'rgba(242,163,29,.08)';
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = isT ? C.amber : 'rgba(22,38,58,.45)'; ctx.lineWidth = px(isT ? 2.4 : 1.5); ctx.setLineDash([px(8), px(6)]);
    ctx.lineDashOffset = -t * 20; ctx.stroke(); ctx.setLineDash([]);
    if (z.kind === 'rig') drawRig(z.x, z.y, t);
    else if (z.kind === 'spm') drawSPM(z.x, z.y, t);
    else drawConvoy(z.x, z.y, t);
    const fs = Math.max(16, px(12.5)); setFont(800, fs, FONT_UI); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = px(3.5); ctx.strokeStyle = C.paper; ctx.fillStyle = C.ink;
    const lx = z.kind === 'edge' ? z.x + 120 : z.x, ly = z.kind === 'edge' ? z.y - z.r - fs : z.y + z.r + fs * 0.9;
    spacedText(z.name, lx, ly, fs * 0.08, true);
    setFont(700, fs * 0.72, FONT_UI); ctx.fillStyle = '#9A6408';
    spacedText(z.sub ? z.sub.toUpperCase() : 'LOAD CRUDE HERE', lx, ly + fs * 0.95, fs * 0.06, true);
  }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, WW, WH); ctx.clip();
  for (const g of GATES) {
    if (!inView(V, g.x, g.y, g.r + 160)) continue;
    const hot = G.hot && G.hot.g === g, isT = tgt === g;
    ctx.fillStyle = hot ? 'rgba(242,163,29,' + (0.2 + 0.1 * Math.sin(t * 8)).toFixed(3) + ')' : 'rgba(192,23,122,.08)';
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = hot ? C.amber : C.magenta; ctx.lineWidth = px(isT || hot ? 3 : 1.8); ctx.setLineDash([px(10), px(7)]); ctx.lineDashOffset = t * 24; ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
  for (const g of GATES) {
    if (!inView(V, g.x, g.y, g.r + 160)) continue;
    const hot = G.hot && G.hot.g === g;
    const ax = g.x - (g.x >= WW - 1 ? 70 : 0), ay = g.y - (g.y >= WH - 1 ? 70 : 0);
    drawFlag(g.flag, ax, ay - 26, 50);
    const fs = Math.max(18, px(13)); setFont(800, fs, FONT_UI); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = px(3.5); ctx.strokeStyle = C.paper; ctx.fillStyle = C.ink;
    spacedText('→ ' + g.name, ax, ay + 18, fs * 0.08, true);
    setFont(700, fs * 0.78, FONT_MONO);
    ctx.fillStyle = hot ? '#B4500A' : C.magenta;
    const label = hot ? 'HOT ×' + (g.mult * 2).toFixed(2).replace(/0$/, '') + ' · ' + Math.ceil(G.hot.t) + 's' : '×' + g.mult.toFixed(2).replace(/0$/, '') + (g.sub ? ' · ' + g.sub : '');
    spacedText(label, ax, ay + 18 + fs, 0, true);
  }
}
function drawRig(x, y, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(22,38,58,.2)'; ctx.fillRect(-14, -10, 34, 30);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); for (const [a, b] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) { ctx.moveTo(a, b); ctx.lineTo(a * 1.25, b * 1.25); } ctx.stroke();
  ctx.fillStyle = '#8D99A6'; ctx.fillRect(-16, -16, 32, 32); ctx.strokeRect(-16, -16, 32, 32);
  ctx.fillStyle = '#C9CED4'; ctx.fillRect(-12, -12, 13, 13);
  ctx.strokeStyle = C.paper; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(6.5, 6.5, 6, 0, TAU); ctx.stroke();
  setFont(800, 8, FONT_UI); ctx.fillStyle = C.paper; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', 6.5, 7);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, -14); ctx.lineTo(30, -30); ctx.stroke();
  const f = 1 + Math.sin(t * 17) * 0.18 + Math.sin(t * 7.3) * 0.12;
  ctx.fillStyle = '#F2A31D'; ctx.beginPath(); ctx.ellipse(33, -33, 7 * f, 10 * f, -0.8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.ellipse(32, -32, 3.5 * f, 5.5 * f, -0.8, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawSPM(x, y, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(30, 20, 40, -20, 70, 6); ctx.stroke();
  ctx.fillStyle = '#E0E3E6'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = C.hull; ctx.beginPath(); ctx.arc(0, 0, 13, -Math.PI / 2, 0); ctx.lineTo(0, 0); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 13, Math.PI / 2, Math.PI); ctx.lineTo(0, 0); ctx.fill();
  ctx.fillStyle = (Math.sin(t * 5) > 0) ? '#FFE08A' : C.ink; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawConvoy(x, y, t) {
  for (let i = 0; i < 3; i++) drawShipShape('tanker', x + 40 + i * 6, y - 60 + i * 60, Math.PI + Math.sin(t * 0.5 + i) * 0.03, { deck: ['#3E6B57', '#8C3B2E', '#2F4B6E'][i], len: 56 });
  ctx.fillStyle = C.magenta; ctx.beginPath(); ctx.moveTo(x + 150, y); ctx.lineTo(x + 120, y - 16); ctx.lineTo(x + 120, y + 16); ctx.closePath(); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
}
function drawRoute() {
  if (G.attract || !G.route.length || G.P.dead || G.mode !== 'play') return;
  const P = G.P;
  ctx.strokeStyle = 'rgba(192,23,122,.75)'; ctx.lineWidth = px(2.4); ctx.setLineDash([px(12), px(9)]); ctx.lineDashOffset = -G.t * 40; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(P.x, P.y); for (const p of G.route) ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(192,23,122,.75)';
  for (let i = 0; i < G.route.length - 1; i++) { const p = G.route[i]; ctx.beginPath(); ctx.arc(p[0], p[1], px(4), 0, TAU); ctx.fill(); }
  const n = G.route[0], a = Math.atan2(n[1] - P.y, n[0] - P.x), r = 66;
  ctx.save(); ctx.translate(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r); ctx.rotate(a);
  ctx.fillStyle = C.magenta; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -9); ctx.lineTo(-2, 0); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ---------- ships ---------- */
function hullPath(L, W) {
  const h = L / 2;
  ctx.beginPath();
  ctx.moveTo(-h + 2, -W / 2); ctx.lineTo(h * 0.55, -W / 2);
  ctx.quadraticCurveTo(h * 0.92, -W * 0.46, h, 0); ctx.quadraticCurveTo(h * 0.92, W * 0.46, h * 0.55, W / 2);
  ctx.lineTo(-h + 2, W / 2); ctx.quadraticCurveTo(-h - 1, 0, -h + 2, -W / 2); ctx.closePath();
}
function drawWake(tr, w0, spread, alpha) {
  if (tr.length < 2) return;
  const now = G.t;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], b = tr[i], ageA = now - a.t, ageB = now - b.t;
      const ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang), ny = Math.cos(ang);
      const oa = w0 + ageA * spread, ob = w0 + ageB * spread;
      const al = alpha * Math.max(0, 1 - ageA / 1.5);
      if (al <= 0.02) continue;
      ctx.strokeStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(a.x + nx * oa * side, a.y + ny * oa * side); ctx.lineTo(b.x + nx * ob * side, b.y + ny * ob * side); ctx.stroke();
    }
  }
  ctx.lineWidth = w0 * 1.4;
  for (let i = 1; i < tr.length; i++) {
    const a = tr[i - 1], b = tr[i], al = alpha * 0.6 * Math.max(0, 1 - (now - a.t) / 1.1);
    if (al <= 0.02) continue;
    ctx.strokeStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
}
function drawShipShape(kind, x, y, a, o) {
  o = o || {};
  const L = o.len || 64;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.save(); ctx.translate(3, 4); ctx.fillStyle = 'rgba(22,38,58,.2)';
  if (kind === 'dhow') { ctx.beginPath(); ctx.ellipse(0, 0, L / 2, 6, 0, 0, TAU); ctx.fill(); } else { hullPath(L, 16); ctx.fill(); }
  ctx.restore();
  if (kind === 'tanker') {
    hullPath(L, 16); ctx.fillStyle = o.hull || '#1F2833'; ctx.fill();
    ctx.save(); ctx.scale(0.9, 0.78); hullPath(L, 16); ctx.fillStyle = o.deck || '#A5432F'; ctx.fill(); ctx.restore();
    const h = L / 2;
    ctx.strokeStyle = '#E8D9B0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-h * 0.55, 0); ctx.lineTo(h * 0.78, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,217,176,.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-h * 0.5, -2.6); ctx.lineTo(h * 0.7, -2.6); ctx.moveTo(-h * 0.5, 2.6); ctx.lineTo(h * 0.7, 2.6);
    ctx.moveTo(0, -5.5); ctx.lineTo(0, 5.5); ctx.moveTo(2.5, -5.5); ctx.lineTo(2.5, 5.5); ctx.stroke();
    const fill = o.cargo === undefined ? 0.6 : o.cargo;
    for (let i = 0; i < 6; i++) {
      const hx = -h * 0.45 + i * (h * 1.2 / 5);
      const full = (i + 0.5) / 6 < fill;
      ctx.fillStyle = full ? '#141414' : 'rgba(232,217,176,.65)';
      ctx.beginPath(); ctx.arc(hx, -4.3, 1.5, 0, TAU); ctx.arc(hx, 4.3, 1.5, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#F4F1E8'; ctx.fillRect(-h + 1.5, -6.5, 11, 13);
    ctx.fillStyle = '#C9C4B5'; ctx.fillRect(-h + 9.5, -7.5, 2.2, 15);
    ctx.fillStyle = '#1F2833'; ctx.fillRect(-h + 3, -2.6, 4.5, 5.2); ctx.fillStyle = o.band || C.hull; ctx.fillRect(-h + 3, -1, 4.5, 2);
    ctx.fillStyle = '#E8D9B0'; ctx.beginPath(); ctx.arc(h * 0.84, -2.2, 1.2, 0, TAU); ctx.arc(h * 0.84, 2.2, 1.2, 0, TAU); ctx.fill();
  } else if (kind === 'box') {
    hullPath(L, 16); ctx.fillStyle = '#23324A'; ctx.fill();
    const h = L / 2, cols = o.box || ['#C2352B', '#2C5D7C'];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = cols[(i + j) % 2]; ctx.fillRect(-h * 0.5 + i * 7.6, -6 + j * 6.2, 7, 5.6);
    }
    ctx.fillStyle = '#F4F1E8'; ctx.fillRect(-h + 2, -6, 8, 12);
  } else {
    ctx.fillStyle = '#8B5A2B'; ctx.beginPath(); ctx.moveTo(L / 2, 0); ctx.quadraticCurveTo(L * 0.2, -7, -L / 2, -4); ctx.lineTo(-L / 2, 4); ctx.quadraticCurveTo(L * 0.2, 7, L / 2, 0); ctx.fill();
    ctx.strokeStyle = '#5A3A1C'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#F2ECDD'; ctx.beginPath(); ctx.moveTo(L * 0.3, -1); ctx.lineTo(-L * 0.25, -11); ctx.lineTo(-L * 0.15, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(22,38,58,.5)'; ctx.stroke();
  }
  ctx.restore();
}
function bubbleText(x, y, text, col) {
  const fs = Math.max(13, px(11)); setFont(800, fs, FONT_UI);
  const w = ctx.measureText(text).width + fs * 0.9, h = fs * 1.5;
  ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = px(1.5);
  ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.moveTo(x - 5, y); ctx.lineTo(x, y + 7); ctx.lineTo(x + 5, y); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col || C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - h / 2 + 1);
}
function drawTraffic(t) {
  drawWake(t.trail, 3, 16, 0.6);
  drawShipShape(t.kind, t.x, t.y, t.a, { deck: t.col, len: t.len, box: t.box, band: '#2C5D7C' });
  const P = G.P;
  if (!G.attract && d2(t.x, t.y, P.x, P.y) < 360 * 360) {
    const fs = Math.max(11, px(10)); setFont(700, fs, FONT_UI); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = px(3); ctx.strokeStyle = C.paper; ctx.fillStyle = C.ink2;
    spacedText((t.kind === 'dhow' ? '' : 'M/V ') + t.name, t.x, t.y + 24, 1, true);
  }
  if (t.sayT > 0) bubbleText(t.x, t.y - 26, t.say);
}
function drawBoat(b) {
  drawWake(b.trail, 2, 22, 0.7);
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
  ctx.fillStyle = 'rgba(22,38,58,.2)'; ctx.beginPath(); ctx.ellipse(2, 3, 12, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5B6672'; ctx.beginPath(); ctx.moveTo(13, 0); ctx.quadraticCurveTo(6, -6, -10, -5); ctx.lineTo(-10, 5); ctx.quadraticCurveTo(6, 6, 13, 0); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#E9ECEF'; ctx.fillRect(-4, -3, 6, 6);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-7, -2, 1.6, 0, TAU); ctx.arc(-7, 2, 1.6, 0, TAU); ctx.fill();
  ctx.restore();
  if (b.st === 'board') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(lerp(b.x, G.P.x, 0.35), lerp(b.y, G.P.y, 0.35)); ctx.stroke();
  }
  if (b.sayT > 0 && b.say) bubbleText(b.x, b.y - 18, b.say, b.st === 'board' ? C.hull : C.ink);
}
function drawPlayer() {
  const P = G.P;
  if (P.dead && P.sinkT > 3.5) return;
  drawWake(P.trail, 4, 20, 0.85);
  ctx.save();
  if (P.dead) { ctx.globalAlpha = clamp(1 - P.sinkT / 3.5, 0, 1); }
  paintPlayerShip(P.x, P.y, P.a, { cargo: P.cargo / P.cap, deck: '#A5432F' });
  ctx.restore();
  if (P.dead) return;
  if (P.inv > 0 && Math.floor(P.inv * 20) % 2) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#FFFFFF'; ctx.translate(P.x, P.y); ctx.rotate(P.a); hullPath(64, 16); ctx.fill(); ctx.restore(); }
  if (P.bubble > 0) {
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.a);
    ctx.fillStyle = 'rgba(173,216,255,.16)'; ctx.strokeStyle = 'rgba(80,150,210,.75)'; ctx.lineWidth = px(1.5);
    ctx.setLineDash([px(4), px(4)]); ctx.beginPath(); ctx.ellipse(0, 0, 46, 22, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + G.t * 0.3; ctx.beginPath(); ctx.arc(Math.cos(a) * 46, Math.sin(a) * 22, 2.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  if (P.loading && P.cargo < P.cap - 1e-4 && !G.attract) {
    const k = P.cargo / P.cap;
    ctx.strokeStyle = 'rgba(22,38,58,.25)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(P.x, P.y, 50, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.arc(P.x, P.y, 50, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke();
    const fs = Math.max(14, px(12)); setFont(800, fs, FONT_UI); ctx.textAlign = 'center'; ctx.lineWidth = px(3.5); ctx.strokeStyle = C.paper; ctx.fillStyle = C.ink;
    spacedText('LOADING ' + Math.floor(k * 100) + '%', P.x, P.y - 64, 1, true);
  }
  if (P.boarders > 0 && G.mode === 'play') {
    const k = clamp(P.shakeAcc / 2.3, 0, 1), w = 70;
    ctx.fillStyle = 'rgba(22,38,58,.6)'; ctx.fillRect(P.x - w / 2, P.y + 34, w, 7);
    ctx.fillStyle = C.magenta; ctx.fillRect(P.x - w / 2, P.y + 34, w * k, 7);
    const fs = Math.max(12, px(10)); setFont(800, fs, FONT_UI); ctx.textAlign = 'center'; ctx.fillStyle = C.ink; ctx.lineWidth = px(3); ctx.strokeStyle = C.paper;
    spacedText('SHAKE THEM OFF', P.x, P.y + 54, 1, true);
  }
}

/* ---------- hazards ---------- */
function drawMine(m) {
  const near = G.mode === 'play' && !G.P.dead && d2(m.x, m.y, G.P.x, G.P.y) < 220 * 220;
  const blink = Math.sin(m.ph * (near ? 16 : 5)) > 0.4;
  ctx.save(); ctx.translate(m.x, m.y);
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 15 + Math.sin(m.ph * 2) * 2, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#1C232C'; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * 13.5, Math.sin(a) * 13.5); }
  ctx.stroke();
  ctx.fillStyle = '#2A333E'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-3, -3, 3.2, 0, TAU); ctx.fill();
  ctx.fillStyle = blink ? '#FF3B2F' : '#7A1E18'; ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, TAU); ctx.fill();
  if (m.fuse > 0) { ctx.strokeStyle = '#FF3B2F'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
function drawCrate(c) {
  const left = c.life - c.t;
  if (left < 4 && Math.floor(left * 6) % 2 === 0) return;
  const bob = Math.sin(c.t * 3) * 0.12, s = 1 + Math.sin(c.t * 2.2) * 0.05;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(bob); ctx.scale(s, s);
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(c.t * 3) * 2, 0, TAU); ctx.stroke();
  ctx.fillStyle = 'rgba(22,38,58,.2)'; ctx.fillRect(-10, -8, 24, 22);
  ctx.fillStyle = '#C48A44'; ctx.fillRect(-12, -12, 24, 24);
  ctx.strokeStyle = '#7A4E1E'; ctx.lineWidth = 2; ctx.strokeRect(-12, -12, 24, 24);
  ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.stroke();
  ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, TAU); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.stroke();
  const k = c.kind;
  if (k === 'repair') { ctx.fillStyle = '#2E9E6A'; ctx.fillRect(-2, -6, 4, 12); ctx.fillRect(-6, -2, 12, 4); }
  else if (k === 'bubble') { ctx.strokeStyle = C.chartBlue; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.stroke(); ctx.fillStyle = C.chartBlue; ctx.beginPath(); ctx.arc(-1.6, -1.6, 1.4, 0, TAU); ctx.fill(); }
  else if (k === 'nitro') { ctx.fillStyle = C.hull; ctx.beginPath(); ctx.moveTo(1.5, -7); ctx.lineTo(-4, 1); ctx.lineTo(-0.5, 1); ctx.lineTo(-1.5, 7); ctx.lineTo(4, -1); ctx.lineTo(0.5, -1); ctx.closePath(); ctx.fill(); }
  else if (k === 'flares') { ctx.strokeStyle = C.magenta; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2); ctx.lineTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5); } ctx.stroke(); }
  else if (k === 'dove') { ctx.strokeStyle = C.chartBlue; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-6, -1); ctx.quadraticCurveTo(-3, -5, 0, 1); ctx.quadraticCurveTo(3, -5, 6, -1); ctx.stroke(); }
  else { setFont(800, 12, FONT_UI); ctx.fillStyle = '#9A6408'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 0.5); }
  ctx.restore();
}
function drawTorp(t) {
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  if (t.trail.length > 1) { ctx.beginPath(); ctx.moveTo(t.trail[0].x, t.trail[0].y); for (const p of t.trail) ctx.lineTo(p.x, p.y); ctx.stroke(); }
  ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a);
  ctx.fillStyle = '#20262E'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.6, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawSub(s) {
  if (s.t > 0.7 && !s.fired) {
    const a = Math.floor(s.t * 8) % 2 ? 0.85 : 0.45;
    ctx.strokeStyle = 'rgba(194,53,43,' + a + ')'; ctx.lineWidth = px(2); ctx.setLineDash([px(10), px(8)]);
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(s.aa) * 1200, s.y + Math.sin(s.aa) * 1200); ctx.stroke(); ctx.setLineDash([]);
  }
  const up = clamp(Math.min(s.t / 0.3, (2.8 - s.t) / 0.4), 0, 1);
  ctx.save(); ctx.translate(s.x, s.y); ctx.globalAlpha = up;
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(0, 0); ctx.lineTo(-18, 8); ctx.stroke();
  ctx.fillStyle = '#20262E'; ctx.fillRect(-2.5, -2.5, 5, 5); ctx.fillStyle = '#9BB7C9'; ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}
function drawMissile(m, V) {
  const tr = m.trail;
  if (tr.length > 1) {
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], b = tr[i], age = G.t - a.t, al = Math.max(0, 0.5 * (1 - age / 1.1));
      if (al < 0.02) continue;
      ctx.strokeStyle = 'rgba(110,118,128,' + al.toFixed(3) + ')'; ctx.lineWidth = 3 + age * 10;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  if (!inView(V, m.x, m.y, 40)) return;
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a);
  const f = 0.7 + Math.random() * 0.6;
  ctx.fillStyle = '#FFB13B'; ctx.beginPath(); ctx.moveTo(-9, -2.5); ctx.lineTo(-9 - 11 * f, 0); ctx.lineTo(-9, 2.5); ctx.fill();
  ctx.fillStyle = '#E6E8EB'; ctx.fillRect(-9, -2.6, 16, 5.2);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(-9, -2.6, 16, 5.2);
  ctx.fillStyle = C.hull; ctx.beginPath(); ctx.moveTo(7, -2.6); ctx.lineTo(12, 0); ctx.lineTo(7, 2.6); ctx.fill();
  ctx.fillStyle = '#5C6670'; ctx.beginPath(); ctx.moveTo(-8, -2.6); ctx.lineTo(-11, -6.5); ctx.lineTo(-5, -2.6); ctx.moveTo(-8, 2.6); ctx.lineTo(-11, 6.5); ctx.lineTo(-5, 2.6); ctx.fill();
  ctx.restore();
}
function drawBallMark(b) {
  if (b.t < -0.6) return;
  const k = clamp(b.t / b.T, 0, 1), pulse = 0.5 + 0.5 * Math.sin(G.t * (8 + k * 14));
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.t < 0) ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(194,53,43,' + (0.1 + 0.14 * pulse * k).toFixed(3) + ')';
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.hull; ctx.lineWidth = px(2.5); ctx.setLineDash([px(12), px(7)]); ctx.lineDashOffset = G.t * 30;
  ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(194,53,43,' + (0.35 + 0.5 * k).toFixed(3) + ')'; ctx.lineWidth = px(2);
  ctx.beginPath(); ctx.arc(0, 0, b.r * (1 + 1.2 * (1 - k)), 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-b.r * 0.3, 0); ctx.lineTo(b.r * 0.3, 0); ctx.moveTo(0, -b.r * 0.3); ctx.lineTo(0, b.r * 0.3); ctx.stroke();
  if (b.t >= 0) {
    const fs = Math.max(18, px(15)); setFont(800, fs, FONT_MONO); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = px(3.5); ctx.strokeStyle = C.paper; ctx.fillStyle = C.hull;
    const txt = Math.max(0, b.T - b.t).toFixed(1);
    ctx.strokeText(txt, 0, -b.r * 0.55); ctx.fillText(txt, 0, -b.r * 0.55);
  }
  ctx.restore();
}
function drawBallFall(b) {
  if (b.t < b.T - 0.75 || b.dead) return;
  const h = clamp((b.T - b.t) / 0.75, 0, 1);
  ctx.fillStyle = 'rgba(22,38,58,' + (0.35 * (1 - h)).toFixed(3) + ')';
  ctx.beginPath(); ctx.ellipse(b.x, b.y, 22 * (1 - h * 0.6), 10 * (1 - h * 0.6), 0, 0, TAU); ctx.fill();
  const y = b.y - h * 620, s = 1 + h * 0.8;
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(b.x, y - 40 * s); ctx.lineTo(b.x, y - 160 * s); ctx.stroke();
  ctx.save(); ctx.translate(b.x, y); ctx.scale(s, s);
  ctx.fillStyle = '#E6E8EB'; ctx.fillRect(-6, -38, 12, 34); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(-6, -38, 12, 34);
  ctx.fillStyle = C.hull; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(0, 10); ctx.lineTo(6, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5C6670'; ctx.beginPath(); ctx.moveTo(-6, -38); ctx.lineTo(-12, -46); ctx.lineTo(-6, -30); ctx.moveTo(6, -38); ctx.lineTo(12, -46); ctx.lineTo(6, -30); ctx.fill();
  ctx.restore();
}
function drawDrone(d) {
  const alt = d.pizza ? 1 : (d.st === 'dive' ? d.alt : 1);
  ctx.fillStyle = 'rgba(22,38,58,.22)';
  ctx.save(); ctx.translate(d.x + alt * 16, d.y + alt * 24); ctx.rotate(d.a); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.restore();
  if (d.st === 'lock' && !d.target) {
    const P = G.P; ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(G.t * 3);
    ctx.strokeStyle = 'rgba(194,53,43,.85)'; ctx.lineWidth = px(2); ctx.setLineDash([px(8), px(6)]); ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
  if (d.st === 'dive') {
    ctx.strokeStyle = 'rgba(194,53,43,.7)'; ctx.lineWidth = px(1.6); ctx.setLineDash([px(6), px(6)]);
    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.tx, d.ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.hull; ctx.lineWidth = px(2.2); ctx.beginPath(); ctx.moveTo(d.tx - 10, d.ty - 10); ctx.lineTo(d.tx + 10, d.ty + 10); ctx.moveTo(d.tx + 10, d.ty - 10); ctx.lineTo(d.tx - 10, d.ty + 10); ctx.stroke();
  }
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a);
  const s = d.st === 'dive' ? 1 + (1 - d.alt) * 0.1 : 1.1; ctx.scale(s, s);
  if (d.pizza) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    for (const [a, b] of [[8, 8], [8, -8], [-8, 8], [-8, -8]]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(a, b); ctx.stroke(); ctx.fillStyle = 'rgba(46,158,106,.35)'; ctx.beginPath(); ctx.arc(a, b, 6, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#C48A44'; ctx.fillRect(-7, -7, 14, 14); ctx.strokeRect(-7, -7, 14, 14);
    ctx.fillStyle = '#E8B04A'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill(); ctx.fillStyle = C.hull; ctx.beginPath(); ctx.arc(-1.5, -1, 1.2, 0, TAU); ctx.arc(1.8, 1.4, 1.2, 0, TAU); ctx.fill();
    ctx.restore();
    const fs = Math.max(11, px(10)); setFont(800, fs, FONT_UI); ctx.textAlign = 'center'; ctx.lineWidth = px(3); ctx.strokeStyle = C.paper; ctx.fillStyle = '#1F7A50';
    spacedText('PIZZA', d.x, d.y - 22, 1, true);
    return;
  }
  ctx.fillStyle = '#4C5560'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-9, -12); ctx.lineTo(-5, 0); ctx.lineTo(-9, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#C9D1D9'; ctx.beginPath(); ctx.ellipse(4, 0, 3.5, 1.8, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(22,38,58,.6)'; ctx.lineWidth = 1.2; const pa = G.t * 40; ctx.beginPath(); ctx.moveTo(-6 + Math.cos(pa) * 0.5, Math.sin(pa) * 5); ctx.lineTo(-6 - Math.cos(pa) * 0.5, -Math.sin(pa) * 5); ctx.stroke();
  if (d.st !== 'approach') { ctx.fillStyle = Math.floor(G.t * 10) % 2 ? '#FF3B2F' : '#FFD0CC'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawFlare(f) {
  const k = 1 - f.t / f.life, r = 9 + Math.random() * 3;
  const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 2.4);
  g.addColorStop(0, 'rgba(255,255,255,' + k.toFixed(3) + ')'); g.addColorStop(0.3, 'rgba(255,170,225,' + (0.8 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(192,23,122,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, r * 2.4, 0, TAU); ctx.fill();
}

/* ---------- particles and overlays ---------- */
function drawPartsLow(V) {
  for (const p of G.parts) {
    if (p.kind !== 'water' && p.kind !== 'oil' && p.kind !== 'bubble' && p.kind !== 'sand') continue;
    if (!inView(V, p.x, p.y, 30)) continue;
    const k = p.t / p.life, a = 1 - k;
    if (p.kind === 'water') { ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.9).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + k), 0, TAU); ctx.fill(); }
    else if (p.kind === 'oil') { ctx.fillStyle = 'rgba(15,15,18,' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    else if (p.kind === 'sand') { ctx.fillStyle = 'rgba(190,150,80,' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k), 0, TAU); ctx.stroke(); }
  }
}
function drawPartsHigh(V) {
  for (const p of G.parts) {
    const kd = p.kind;
    if (kd === 'water' || kd === 'oil' || kd === 'bubble' || kd === 'sand') continue;
    if (!inView(V, p.x, p.y, 120)) continue;
    const k = p.t / p.life, a = 1 - k;
    if (kd === 'smoke') {
      const r = p.size * (1 + p.grow * k);
      ctx.fillStyle = p.pale ? 'rgba(240,230,245,' + (a * 0.5).toFixed(3) + ')' : 'rgba(78,86,96,' + (a * 0.42).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    } else if (kd === 'fire') {
      const r = p.size * (1 + p.grow * k);
      ctx.fillStyle = k < 0.25 ? 'rgba(255,226,120,' + a.toFixed(3) + ')' : k < 0.55 ? 'rgba(255,140,40,' + a.toFixed(3) + ')' : 'rgba(200,50,30,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    } else if (kd === 'spark') {
      ctx.strokeStyle = p.col || 'rgba(255,200,90,' + a.toFixed(3) + ')'; ctx.globalAlpha = p.col ? a : 1; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (kd === 'flash') {
      const r = p.size * (0.5 + k);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, 'rgba(255,255,240,' + a.toFixed(3) + ')'); g.addColorStop(0.4, 'rgba(255,220,120,' + (a * 0.6).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    } else if (kd === 'confetti') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.col; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    } else if (kd === 'dove') {
      const flap = Math.sin(p.t * 22) * 4;
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = Math.min(1, a * 2);
      ctx.strokeStyle = C.ink; ctx.fillStyle = '#FFFFFF'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-p.size, -flap); ctx.quadraticCurveTo(-p.size * 0.4, -p.size * 0.6, 0, 0); ctx.quadraticCurveTo(p.size * 0.4, -p.size * 0.6, p.size, -flap); ctx.quadraticCurveTo(p.size * 0.3, 2, 0, 3); ctx.quadraticCurveTo(-p.size * 0.3, 2, -p.size, -flap); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
}
function drawRings() {
  for (const r of G.rings) {
    const k = r.t / r.life, e = 1 - Math.pow(1 - k, 3), rad = lerp(r.r0, r.r1, e);
    ctx.strokeStyle = 'rgba(' + (r.col || '255,255,255') + ',' + (1 - k).toFixed(3) + ')'; ctx.lineWidth = Math.max(0.5, r.w * (1 - k));
    ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, TAU); ctx.stroke();
  }
}
function drawTracers() {
  for (const t of G.tracers) {
    const a = 1 - t.t / 0.22;
    ctx.strokeStyle = 'rgba(242,163,29,' + a.toFixed(3) + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t.t * 400;
    ctx.beginPath(); ctx.moveTo(t.x0, t.y0); ctx.lineTo(t.x1, t.y1); ctx.stroke(); ctx.setLineDash([]);
  }
}
function drawPops() {
  for (const p of G.pops) {
    const k = p.t / p.life, a = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1, pop = 1 + Math.max(0, 1 - p.t / 0.12) * 0.5;
    const fs = p.size / Math.max(zoom, 0.6) * pop;
    ctx.save(); ctx.globalAlpha = a; setFont(800, fs, FONT_UI); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = fs * 0.22; ctx.strokeStyle = C.paper; ctx.lineJoin = 'round'; ctx.fillStyle = p.col;
    const y = p.y - p.t * 46;
    ctx.strokeText(p.text, p.x, y); ctx.fillText(p.text, p.x, y);
    ctx.restore();
  }
}
function drawDark(fog) {
  const w = fxCv.width, h = fxCv.height, s = w / VW;
  fxc.setTransform(1, 0, 0, 1, 0, 0); fxc.globalCompositeOperation = 'source-over'; fxc.clearRect(0, 0, w, h);
  fxc.fillStyle = fog ? 'rgba(226,233,236,.9)' : 'rgba(6,14,32,.8)'; fxc.fillRect(0, 0, w, h);
  fxc.globalCompositeOperation = 'destination-out';
  const L = (x, y, r, a) => {
    const [sx, sy] = w2s(x, y), X = sx * s, Y = sy * s, R = r * zoom * s;
    if (X < -R || Y < -R || X > w + R || Y > h + R) return;
    const g = fxc.createRadialGradient(X, Y, 0, X, Y, R); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(0.55, 'rgba(0,0,0,' + (a * 0.6) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    fxc.fillStyle = g; fxc.beginPath(); fxc.arc(X, Y, R, 0, TAU); fxc.fill();
  };
  const P = G.P, c = Math.cos(P.a), sn = Math.sin(P.a);
  L(P.x, P.y, fog ? 420 : 240, 1);
  if (!fog) { L(P.x + c * 170, P.y + sn * 170, 210, 0.85); L(P.x + c * 360, P.y + sn * 360, 170, 0.55); }
  for (const o of G.lights) L(o.x, o.y, o.r * (1 - o.t / o.life * 0.5), 1 - o.t / o.life);
  for (const b of G.balls) if (b.t > -0.5) L(b.x, b.y, b.r * 1.4, 0.75);
  for (const f of G.flares) L(f.x, f.y, 170, 0.9);
  for (const m of G.missiles) L(m.x, m.y, 110, 0.8);
  for (const d of G.drones) if (d.st !== 'approach' || d.pizza) L(d.x, d.y, 70, 0.6);
  for (const t of G.traffic) L(t.x, t.y, 90, 0.55);
  for (const z of PICKUPS) L(z.x, z.y, 170, 0.75);
  for (const g of GATES) L(g.x, g.y, 200, 0.6);
  for (const cty of CITIES) { const [x, y] = P_(cty[1], cty[2]); L(x, y, 110, 0.6); }
  for (const cr of G.crates) L(cr.x, cr.y, 60, 0.6);
  fxc.globalCompositeOperation = 'source-over';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.drawImage(fxCv, 0, 0, VW, VH);
}
function drawScreenFx() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.flash > 0 && !REDUCED) { ctx.fillStyle = 'rgba(' + G.flashCol + ',' + (G.flash * 0.45).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); }
  const P = G.P;
  if (!G.attract && !P.dead && P.hull / P.maxHull < 0.3) {
    const a = 0.25 + 0.15 * Math.sin(G.t * 6);
    const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.35, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
    g.addColorStop(0, 'rgba(194,53,43,0)'); g.addColorStop(1, 'rgba(194,53,43,' + a.toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
}
function drawIndicators(V) {
  if (G.mode !== 'play') return;
  const m = 30, list = [];
  for (const o of G.missiles) list.push([o.x, o.y, '#D7261E', 'M']);
  for (const o of G.drones) if (!o.pizza && o.st !== 'leave') list.push([o.x, o.y, '#E07B00', 'D']);
  for (const o of G.drones) if (o.pizza) list.push([o.x, o.y, '#2E9E6A', 'P']);
  for (const o of G.balls) if (o.t > -0.3) list.push([o.x, o.y, C.magenta, '!']);
  for (const o of G.boats) if (o.st === 'chase') list.push([o.x, o.y, C.ink, 'B']);
  for (const o of G.subs) list.push([o.x, o.y, C.chartBlue, 'S']);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const cx = VW / 2, cy = VH / 2;
  let n = 0;
  for (const [x, y, col, ch] of list) {
    const [sx, sy] = w2s(x, y);
    if (sx > m && sx < VW - m && sy > m && sy < VH - m) continue;
    if (n++ > 14) break;
    const dx = sx - cx, dy = sy - cy, kx = (VW / 2 - m) / Math.abs(dx || 1e-6), ky = (VH / 2 - m) / Math.abs(dy || 1e-6), k = Math.min(kx, ky);
    const ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx);
    const dist = Math.hypot(x - G.P.x, y - G.P.y), sc = clamp(1.3 - dist / 2400, 0.6, 1.2);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.scale(sc, sc);
    ctx.fillStyle = col; ctx.strokeStyle = C.paper; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -11); ctx.lineTo(-6, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(-a); setFont(800, 10, FONT_UI); ctx.fillStyle = C.paper; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, -Math.cos(a) * 1, -Math.sin(a) * 1);
    ctx.restore();
  }
}
function drawMsgs() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  let y = VH * 0.32;
  const big = clamp(VW * 0.085, 30, 66);
  for (const m of G.msgs) {
    const k = m.t / m.life, pop = m.t < 0.16 ? 1 + (1 - m.t / 0.16) * 0.45 : 1, a = k > 0.75 ? (1 - k) / 0.25 : 1;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(VW / 2, y); ctx.scale(pop, pop);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = big.toFixed(0) + 'px ' + FONT_ST;
    ctx.lineWidth = big * 0.16; ctx.strokeStyle = C.paper; ctx.strokeText(m.title, 0, 0);
    ctx.fillStyle = m.col; ctx.fillText(m.title, 0, 0);
    if (m.sub) {
      const fs = clamp(big * 0.32, 13, 20);
      ctx.font = '800 ' + fs.toFixed(0) + 'px ' + FONT_UI;
      ctx.lineWidth = fs * 0.35; ctx.strokeStyle = C.paper;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      ctx.strokeText(m.sub, 0, big * 0.68); ctx.fillStyle = C.ink; ctx.fillText(m.sub, 0, big * 0.68);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    ctx.restore();
    y += big * 1.65;
  }
}
function drawJoystick() {
  const j = Input.joy;
  if (!j.active) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.strokeStyle = 'rgba(22,38,58,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(j.ox, j.oy, 58, 0, TAU); ctx.stroke();
  const dx = j.x - j.ox, dy = j.y - j.oy, l = Math.hypot(dx, dy), k = l > 58 ? 58 / l : 1;
  ctx.fillStyle = 'rgba(22,38,58,.55)'; ctx.beginPath(); ctx.arc(j.ox + dx * k, j.oy + dy * k, 24, 0, TAU); ctx.fill();
}

/* ---------- minimap ---------- */
function drawMini() {
  const w = mini.width, h = mini.height;
  if (!w || !h) return;
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.drawImage(MAP.mini, 0, 0, w, h);
  const sx = w / WW, sy = h / WH, d = Math.max(1, w / 180);
  const P_m = (x, y) => [x * sx, y * sy];
  mctx.lineWidth = 1 * d; mctx.strokeStyle = 'rgba(192,23,122,.35)'; mctx.setLineDash([3 * d, 3 * d]);
  for (const L of [LANE_OUT, LANE_IN]) { mctx.beginPath(); L.forEach((p, i) => { const [x, y] = P_m(p[0], p[1]); i ? mctx.lineTo(x, y) : mctx.moveTo(x, y); }); mctx.stroke(); }
  mctx.setLineDash([]);
  const P = G.P;
  if (!G.attract && G.route.length && G.mode === 'play') {
    mctx.strokeStyle = C.magenta; mctx.lineWidth = 2 * d; mctx.setLineDash([4 * d, 3 * d]);
    mctx.beginPath(); mctx.moveTo(P.x * sx, P.y * sy); for (const p of G.route) mctx.lineTo(p[0] * sx, p[1] * sy); mctx.stroke(); mctx.setLineDash([]);
  }
  for (const z of PICKUPS) { mctx.fillStyle = C.amber; mctx.strokeStyle = C.ink; mctx.lineWidth = 1 * d; mctx.beginPath(); mctx.arc(z.x * sx, z.y * sy, 3.6 * d, 0, TAU); mctx.fill(); mctx.stroke(); }
  for (const g of GATES) {
    const hot = G.hot && G.hot.g === g;
    mctx.fillStyle = hot ? (Math.floor(G.t * 4) % 2 ? C.amber : C.hull) : C.magenta;
    mctx.beginPath(); mctx.arc(g.x * sx, g.y * sy, (hot ? 6 : 4.5) * d, 0, TAU); mctx.fill();
  }
  mctx.fillStyle = '#D7261E';
  for (const m of G.missiles) { mctx.beginPath(); mctx.arc(m.x * sx, m.y * sy, 2 * d, 0, TAU); mctx.fill(); }
  mctx.fillStyle = '#E07B00';
  for (const o of G.drones) if (!o.pizza) { mctx.fillRect(o.x * sx - d, o.y * sy - d, 2 * d, 2 * d); }
  mctx.fillStyle = C.ink;
  for (const o of G.boats) { mctx.fillRect(o.x * sx - d, o.y * sy - d, 2 * d, 2 * d); }
  mctx.strokeStyle = C.hull; mctx.lineWidth = 1.5 * d;
  for (const b of G.balls) if (b.t > -0.3) { mctx.beginPath(); mctx.arc(b.x * sx, b.y * sy, Math.max(3 * d, b.r * sx), 0, TAU); mctx.stroke(); }
  mctx.strokeStyle = 'rgba(22,38,58,.55)'; mctx.lineWidth = 1 * d;
  const hw = VW / 2 / zoom, hh = VH / 2 / zoom; mctx.strokeRect((G.cam.x - hw) * sx, (G.cam.y - hh) * sy, hw * 2 * sx, hh * 2 * sy);
  mctx.save(); mctx.translate(P.x * sx, P.y * sy); mctx.rotate(P.a);
  mctx.fillStyle = C.hull; mctx.strokeStyle = C.paper; mctx.lineWidth = 1.5 * d;
  mctx.beginPath(); mctx.moveTo(7 * d, 0); mctx.lineTo(-5 * d, -4.5 * d); mctx.lineTo(-5 * d, 4.5 * d); mctx.closePath(); mctx.fill(); mctx.stroke();
  mctx.restore();
}
