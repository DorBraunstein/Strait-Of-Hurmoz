/* =========================================================
   STRAIT OUTTA HORMUZ — core: utils, chart data, map, routing, save, levels
   ========================================================= */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => b === undefined ? Math.random() * (a === undefined ? 1 : a) : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const hyp = Math.hypot;
const d2 = (ax, ay, bx, by) => { const x = ax - bx, y = ay - by; return x * x + y * y; };
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const fmtMoney = m => { const a = Math.abs(m); if (a >= 1000) return '$' + (m / 1000).toFixed(a >= 10000 ? 1 : 2) + 'B'; if (a >= 100) return '$' + Math.round(m) + 'M'; return '$' + (Math.round(m * 10) / 10).toFixed(1).replace(/\.0$/, '') + 'M'; };
const fmtBbl = c => c >= 0.995 ? c.toFixed(2).replace(/0$/, '') + 'M bbl' : Math.round(c * 1000) + 'k bbl';
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- palette (mirrors the CSS tokens) ---------- */
const C = {
  sea: '#D3E8EF', seaGulf: '#DCEEF3', seaDeep: '#9FC6DA', shoal: '#A9D3E8', shoal2: '#C3E1EE', contour: 'rgba(44,93,124,.35)',
  land: '#F1DFA9', landShade: 'rgba(160,120,50,.22)', coast: '#2B3E50', hill: '#BFA060',
  ink: '#16263A', ink2: '#3C4E63', magenta: '#C0177A', hull: '#C2352B', amber: '#F2A31D', paper: '#F4E8C8',
  chartBlue: '#2C5D7C', grat: 'rgba(44,93,124,.18)', sound: 'rgba(44,93,124,.6)', white: '#FFFFFF'
};

/* ---------- chart projection: 1 world unit ≈ 100 m ---------- */
const LON0 = 54.3, LON1 = 58.0, LAT0 = 24.5, LAT1 = 27.5, KX = 1000, KY = 1110;
const WW = (LON1 - LON0) * KX, WH = (LAT1 - LAT0) * KY;          // 3700 x 3330
const P_ = (lon, lat) => [(lon - LON0) * KX, (LAT1 - lat) * KY];
const toLL = (x, y) => [LON0 + x / KX, LAT1 - y / KY];
function fmtLL(x, y) {
  const [lo, la] = toLL(x, y);
  const f = (v, w) => { const d = Math.floor(v), m = Math.floor((v - d) * 60); return String(d).padStart(w, '0') + '°' + String(m).padStart(2, '0') + '′'; };
  return f(la, 2) + 'N ' + f(lo, 3) + 'E';
}

/* ---------- coastlines (lon, lat) ---------- */
const IRAN = [[54.0, 26.80], [54.3, 26.71], [54.45, 26.66], [54.60, 26.60], [54.75, 26.56], [54.88, 26.55], [54.95, 26.58], [55.05, 26.63], [55.15, 26.70], [55.27, 26.79], [55.40, 26.87], [55.58, 26.96], [55.75, 27.03], [55.90, 27.08], [56.05, 27.13], [56.20, 27.17], [56.30, 27.19], [56.45, 27.17], [56.60, 27.14], [56.75, 27.12], [56.88, 27.10], [56.98, 27.02], [57.03, 26.90], [57.04, 26.79], [57.08, 26.65], [57.10, 26.52], [57.14, 26.35], [57.20, 26.15], [57.27, 25.97], [57.35, 25.82], [57.50, 25.72], [57.65, 25.68], [57.75, 25.62], [57.82, 25.66], [57.95, 25.70], [58.10, 25.68], [58.30, 25.64], [58.30, 27.85], [54.0, 27.85]];
const ARABIA = [[54.0, 24.0], [54.0, 24.42], [54.30, 24.48], [54.45, 24.58], [54.60, 24.72], [54.75, 24.83], [54.90, 24.93], [55.03, 25.01], [55.14, 25.09], [55.25, 25.20], [55.32, 25.28], [55.39, 25.35], [55.46, 25.42], [55.56, 25.53], [55.70, 25.64], [55.83, 25.73], [55.95, 25.80], [56.03, 25.93], [56.08, 26.05], [56.15, 26.13], [56.22, 26.20], [56.28, 26.28], [56.33, 26.36], [56.38, 26.40], [56.44, 26.37], [56.47, 26.28], [56.45, 26.18], [56.48, 26.08], [56.42, 25.98], [56.38, 25.86], [56.34, 25.74], [56.29, 25.63], [56.35, 25.48], [56.36, 25.34], [56.36, 25.12], [56.38, 24.98], [56.47, 24.75], [56.62, 24.52], [56.75, 24.36], [56.95, 24.10], [57.05, 23.9], [54.0, 23.9]];
const QESHM = [[55.27, 26.62], [55.35, 26.70], [55.50, 26.78], [55.65, 26.84], [55.80, 26.90], [55.95, 26.95], [56.10, 26.99], [56.22, 27.00], [56.29, 26.96], [56.25, 26.90], [56.12, 26.84], [55.98, 26.77], [55.85, 26.71], [55.70, 26.67], [55.55, 26.63], [55.40, 26.59], [55.30, 26.58]];
const ISLANDS = [ // name, lon, lat, radius (world units)
  ['Hormuz', 56.46, 27.06, 40], ['Larak', 56.36, 26.86, 33], ['Hengam', 55.89, 26.64, 26], ['Greater Tunb', 55.30, 26.26, 30],
  ['Lesser Tunb', 55.14, 26.25, 19], ['Abu Musa', 55.03, 25.88, 36], ['Sirri', 54.53, 25.91, 30], ['Farur', 54.50, 26.29, 24]
];
const LAND_LABELS = [
  { t: 'IRAN', lon: 55.55, lat: 27.33, s: 54 }, { t: 'IRAN', lon: 57.62, lat: 26.62, s: 44 },
  { t: 'UNITED ARAB EMIRATES', lon: 55.15, lat: 24.72, s: 26 }, { t: 'MUSANDAM', lon: 56.24, lat: 26.0, s: 17, sub: '(OMAN)' },
  { t: 'OMAN', lon: 56.33, lat: 24.62, s: 26 }, { t: 'QESHM', lon: 55.78, lat: 26.835, s: 15 }
];
const CITIES = [ // name, lon, lat, side
  ['Bandar Abbas', 56.27, 27.18, 'n'], ['Bandar Lengeh', 54.88, 26.55, 'n'], ['Jask', 57.77, 25.64, 'n'], ['Sirik', 57.10, 26.52, 'e'],
  ['Khasab', 56.24, 26.19, 'w'], ['Dubai', 55.30, 25.25, 's'], ['Sharjah', 55.39, 25.35, 'e'], ['Ras al-Khaimah', 55.95, 25.79, 's'],
  ['Fujairah', 56.35, 25.12, 'w'], ['Dibba', 56.28, 25.62, 'w'], ['Khor Fakkan', 56.36, 25.34, 'w'], ['Minab', 57.08, 27.14, 'n']
];
const WATER_LABELS = [
  { t: 'THE  GULF', lon: 54.85, lat: 26.2, s: 40, r: -0.1 },
  { t: 'STRAIT OF HORMUZ', lon: 56.63, lat: 26.76, s: 22, r: -0.08 },
  { t: 'GULF  OF  OMAN', lon: 57.42, lat: 25.02, s: 36, r: -0.42 },
  { t: 'Clarence Strait', lon: 55.62, lat: 26.905, s: 11, r: -0.36 }
];

/* ---------- oil fields (inside) and buyers (outside) ---------- */
const PICKUPS = [
  { id: 'fateh', name: 'FATEH FIELD', kind: 'rig', lon: 54.55, lat: 25.62, r: 110 },
  { id: 'jebel', name: 'JEBEL ALI SPM', kind: 'spm', lon: 55.0, lat: 25.13, r: 110 },
  { id: 'mubarek', name: 'MUBAREK FIELD', kind: 'rig', lon: 55.18, lat: 25.78, r: 110 },
  { id: 'bukha', name: 'BUKHA FIELD', kind: 'rig', lon: 55.80, lat: 26.16, r: 110 },
  { id: 'convoy', name: 'GULF CONVOY', sub: 'Saudi · Kuwait · Iraq · Qatar crude', kind: 'edge', lon: 54.3, lat: 26.18, r: 150 }
];
const GATES = [
  { id: 'india', name: 'INDIA', mult: 1.0, lon: 58.0, lat: 25.36, r: 155, flag: 'in' },
  { id: 'china', name: 'CHINA', mult: 1.15, lon: 58.0, lat: 24.92, r: 155, flag: 'cn' },
  { id: 'japan', name: 'JAPAN', mult: 1.3, lon: 57.62, lat: 24.5, r: 155, flag: 'jp' },
  { id: 'europe', name: 'EUROPE', sub: 'via Suez', mult: 1.22, lon: 56.98, lat: 24.5, r: 155, flag: 'eu' }
];
for (const z of PICKUPS.concat(GATES)) { const p = P_(z.lon, z.lat); z.x = p[0]; z.y = p[1]; }

/* ---------- traffic separation scheme + routing waypoints ---------- */
const LANE_OUT = [[54.3, 26.02], [55.0, 26.08], [55.70, 26.25], [56.05, 26.42], [56.30, 26.53], [56.55, 26.52], [56.75, 26.35], [56.90, 26.10], [57.05, 25.75], [57.25, 25.35], [57.50, 24.90], [57.72, 24.5]].map(a => P_(a[0], a[1]));
const LANE_IN = [[58.0, 24.78], [57.62, 24.98], [57.36, 25.42], [57.17, 25.80], [57.02, 26.15], [56.85, 26.43], [56.60, 26.62], [56.30, 26.66], [56.00, 26.55], [55.62, 26.38], [55.2, 26.38], [54.3, 26.30]].map(a => P_(a[0], a[1]));
const WPS = [[55.70, 26.30], [56.10, 26.48], [56.42, 26.62], [56.75, 26.42], [56.95, 25.95], [57.30, 25.30]].map(a => P_(a[0], a[1]));

/* ---------- map build ---------- */
const CELL = 8, SEA_S = 3;
const MAP = { polys: [], landPath: null, gw: 0, gh: 0, grid: null, dist: null, inland: null, sea: null, mini: null, soundings: [], waves: [], hills: [], islands: [], wpl: null };

function roughen(pts, rng, levels, amp) {
  let p = pts;
  for (let l = 0; l < levels; l++) {
    const out = [], n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      out.push(a);
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < 10 || len > 2500) continue;
      const off = (rng() - 0.5) * 2 * amp * len;
      out.push([(a[0] + b[0]) / 2 - dy / len * off, (a[1] + b[1]) / 2 + dx / len * off]);
    }
    p = out;
  }
  return p;
}
function blob(cx, cy, R, rng) {
  const pts = [], n = 11;
  for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = R * (0.8 + rng() * 0.38); pts.push([cx + Math.cos(a) * rr * 1.15, cy + Math.sin(a) * rr * 0.88]); }
  return pts;
}
function bfs(srcTest) {
  const { gw, gh, grid } = MAP, n = gw * gh, out = new Uint8Array(n).fill(255), q = new Int32Array(n);
  let h = 0, t = 0;
  for (let i = 0; i < n; i++) if (srcTest(grid[i])) { out[i] = 0; q[t++] = i; }
  while (h < t) {
    const i = q[h++], d = out[i]; if (d >= 254) continue;
    const x = i % gw, y = (i / gw) | 0;
    if (x > 0 && out[i - 1] > d + 1) { out[i - 1] = d + 1; q[t++] = i - 1; }
    if (x < gw - 1 && out[i + 1] > d + 1) { out[i + 1] = d + 1; q[t++] = i + 1; }
    if (y > 0 && out[i - gw] > d + 1) { out[i - gw] = d + 1; q[t++] = i - gw; }
    if (y < gh - 1 && out[i + gw] > d + 1) { out[i + gw] = d + 1; q[t++] = i + gw; }
  }
  return out;
}
function isLand(x, y) {
  if (x < 0 || y < 0) return false;
  const gx = (x / CELL) | 0, gy = (y / CELL) | 0;
  if (gx >= MAP.gw || gy >= MAP.gh) return false;
  return MAP.grid[gy * MAP.gw + gx] === 1;
}
function coastDist(x, y) {
  const gx = clamp((x / CELL) | 0, 0, MAP.gw - 1), gy = clamp((y / CELL) | 0, 0, MAP.gh - 1);
  return MAP.dist[gy * MAP.gw + gx] * CELL;
}
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function depthAt(x, y) { // metres, for soundings and tint: shallow Gulf, deeper Strait, abyssal Gulf of Oman
  const d = coastDist(x, y);
  const gulf = 12 + d * 0.11, strait = 55 + d * 0.28, oman = 40 + Math.pow(d, 1.12) * 1.9;
  const wS = smooth(1450, 1950, x), wO = smooth(2000, 2600, x) * smooth(950, 1500, y);
  return Math.round(lerp(lerp(gulf, strait, wS), oman, wO));
}
function buildMap() {
  const rng = mulberry(20260);
  const conv = poly => poly.map(a => P_(a[0], a[1]));
  const polys = [roughen(conv(IRAN), rng, 3, 0.07), roughen(conv(ARABIA), rng, 3, 0.07), roughen(conv(QESHM), rng, 2, 0.06)];
  MAP.islands = [];
  for (const [name, lo, la, r] of ISLANDS) { const [x, y] = P_(lo, la); polys.push(roughen(blob(x, y, r, rng), rng, 2, 0.08)); MAP.islands.push({ name, x, y, r }); }
  MAP.polys = polys;
  const path = new Path2D();
  for (const p of polys) { path.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) path.lineTo(p[i][0], p[i][1]); path.closePath(); }
  MAP.landPath = path;

  // collision grid
  MAP.gw = Math.ceil(WW / CELL); MAP.gh = Math.ceil(WH / CELL);
  const oc = document.createElement('canvas'); oc.width = MAP.gw; oc.height = MAP.gh;
  const o = oc.getContext('2d', { willReadFrequently: true });
  o.scale(1 / CELL, 1 / CELL); o.fillStyle = '#000'; o.fill(path);
  const px = o.getImageData(0, 0, MAP.gw, MAP.gh).data;
  MAP.grid = new Uint8Array(MAP.gw * MAP.gh);
  for (let i = 0; i < MAP.grid.length; i++) MAP.grid[i] = px[i * 4 + 3] > 110 ? 1 : 0;
  MAP.dist = bfs(v => v === 1);      // water cells: distance to land
  MAP.inland = bfs(v => v === 0);    // land cells: distance to water

  buildSea();
  buildDecor(rng);
  buildMini();
  // waypoint visibility
  MAP.wpl = WPS.map((a, i) => WPS.map((b, j) => i !== j && los(a[0], a[1], b[0], b[1], 18)));
}
function boxBlur(d, w, h, r) { // separable running-sum blur on RGB, in place
  const tmp = new Float32Array(Math.max(w, h) * 3), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) tmp[x * 3 + k] = d[(y * w + x) * 4 + k];
    for (let k = 0; k < 3; k++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += tmp[clamp(i, 0, w - 1) * 3 + k];
      for (let x = 0; x < w; x++) { d[(y * w + x) * 4 + k] = s / n; s += tmp[Math.min(w - 1, x + r + 1) * 3 + k] - tmp[Math.max(0, x - r) * 3 + k]; }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) for (let k = 0; k < 3; k++) tmp[y * 3 + k] = d[(y * w + x) * 4 + k];
    for (let k = 0; k < 3; k++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += tmp[clamp(i, 0, h - 1) * 3 + k];
      for (let y = 0; y < h; y++) { d[(y * w + x) * 4 + k] = s / n; s += tmp[Math.min(h - 1, y + r + 1) * 3 + k] - tmp[Math.max(0, y - r) * 3 + k]; }
    }
  }
}
function buildSea() {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(WW / SEA_S); cv.height = Math.ceil(WH / SEA_S);
  const c = cv.getContext('2d');
  const img = c.createImageData(cv.width, cv.height), d = img.data;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = hex(C.seaGulf), B = hex(C.sea), D = hex(C.seaDeep);
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const wx = x * SEA_S, wy = y * SEA_S, m = depthAt(wx, wy);
    let col;
    if (m < 90) { const t = clamp(m / 90, 0, 1); col = [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]; }
    else { const t = clamp((m - 90) / 1900, 0, 1); col = [lerp(B[0], D[0], t), lerp(B[1], D[1], t), lerp(B[2], D[2], t)]; }
    const i = (y * cv.width + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  // the distance field is 4-neighbour (Manhattan), which leaves straight creases in the tint; blur them away
  for (let pass = 0; pass < 2; pass++) boxBlur(d, cv.width, cv.height, 14);
  c.putImageData(img, 0, 0);
  c.scale(1 / SEA_S, 1 / SEA_S); c.lineJoin = 'round';
  // depth areas, chart style: 20 m band then 10 m band, each edged by a thin contour
  c.strokeStyle = C.contour; c.lineWidth = 136; c.stroke(MAP.landPath);
  c.strokeStyle = C.shoal2; c.lineWidth = 128; c.stroke(MAP.landPath);
  c.strokeStyle = C.contour; c.lineWidth = 64; c.stroke(MAP.landPath);
  c.strokeStyle = C.shoal; c.lineWidth = 57; c.stroke(MAP.landPath);
  // land, with a soft inner rim so coasts read as relief
  c.fillStyle = C.land; c.fill(MAP.landPath);
  c.save(); c.clip(MAP.landPath);
  c.strokeStyle = C.landShade; c.lineWidth = 34; c.stroke(MAP.landPath); c.lineWidth = 14; c.stroke(MAP.landPath);
  c.restore();
  MAP.sea = cv;
}
function buildDecor(rng) {
  // soundings on a jittered grid
  MAP.soundings = [];
  for (let y = 90; y < WH; y += 215) for (let x = 80; x < WW; x += 230) {
    const sx = x + (rng() - 0.5) * 140, sy = y + (rng() - 0.5) * 120;
    if (isLand(sx, sy) || coastDist(sx, sy) < 50) continue;
    MAP.soundings.push({ x: sx, y: sy, v: depthAt(sx, sy) + Math.round((rng() - 0.5) * 8) });
  }
  MAP.waves = [];
  for (let i = 0; i < 900; i++) {
    const x = rng() * WW, y = rng() * WH;
    if (isLand(x, y) || coastDist(x, y) < 24) continue;
    MAP.waves.push({ x, y, p: rng() * TAU, s: 0.7 + rng() * 0.6 });
  }
  MAP.hills = [];
  for (let y = 20; y < WH; y += 52) for (let x = 20; x < WW; x += 60) {
    const hx = x + (rng() - 0.5) * 40, hy = y + (rng() - 0.5) * 34;
    const gx = (hx / CELL) | 0, gy = (hy / CELL) | 0;
    if (gx < 0 || gy < 0 || gx >= MAP.gw || gy >= MAP.gh) continue;
    const inl = MAP.inland[gy * MAP.gw + gx];
    if (!isLand(hx, hy) || inl < 6) continue;
    const flat = hx < 1650 && hy > 2000; // UAE coastal plain: no hills
    if (flat && rng() < 0.85) continue;
    MAP.hills.push({ x: hx, y: hy, s: clamp(inl / 10, 0.7, 1.6) * (0.8 + rng() * 0.4) });
  }
}
function buildMini() {
  const W = 360, H = 324, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.drawImage(MAP.sea, 0, 0, W, H);
  c.save(); c.scale(W / WW, H / WH);
  c.fillStyle = C.land; c.fill(MAP.landPath);
  c.lineWidth = 7; c.strokeStyle = C.coast; c.stroke(MAP.landPath);
  c.restore();
  MAP.mini = cv;
}
function los(x0, y0, x1, y1, pad) {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return true;
  const n = Math.ceil(L / 8), nx = -(y1 - y0) / L * pad, ny = (x1 - x0) / L * pad;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (isLand(x, y) || (pad && (isLand(x + nx, y + ny) || isLand(x - nx, y - ny)))) return false;
  }
  return true;
}
function planRoute(sx, sy, tx, ty) {
  if (los(sx, sy, tx, ty, 10)) return [[tx, ty]];
  const N = WPS.length, S = N, T = N + 1, pts = WPS.concat([[sx, sy], [tx, ty]]);
  const memo = {};
  const adj = (i, j) => {
    if (i < N && j < N) return MAP.wpl[i][j];
    const k = i < j ? i + '_' + j : j + '_' + i;
    if (memo[k] === undefined) memo[k] = los(pts[i][0], pts[i][1], pts[j][0], pts[j][1], 8);
    return memo[k];
  };
  const dist = new Array(N + 2).fill(Infinity), prev = new Array(N + 2).fill(-1), done = new Array(N + 2).fill(false);
  dist[S] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N + 2; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0 || u === T) break;
    done[u] = true;
    for (let v = 0; v < N + 2; v++) {
      if (done[v] || v === u || v === S || !adj(u, v)) continue;
      const w = Math.hypot(pts[u][0] - pts[v][0], pts[u][1] - pts[v][1]);
      if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
    }
  }
  if (dist[T] === Infinity) return [[tx, ty]];
  const path = []; let c = T;
  while (c !== S && c >= 0) { path.unshift(pts[c]); c = prev[c]; }
  return path;
}
function randomWater(minCoast, maxCoast, cx, cy, minR, maxR, tries) {
  for (let i = 0; i < (tries || 60); i++) {
    let x, y;
    if (cx !== undefined) { const a = rand(TAU), r = rand(minR, maxR); x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r; }
    else { x = rand(40, WW - 40); y = rand(40, WH - 40); }
    if (x < 30 || y < 30 || x > WW - 30 || y > WH - 30 || isLand(x, y)) continue;
    const cd = coastDist(x, y);
    if (cd < minCoast || cd > maxCoast) continue;
    return [x, y];
  }
  return null;
}

/* ---------- save ---------- */
const SAVE_KEY = 'strait-outta-hormuz-v1';
const defaultSave = () => ({
  v: 1, level: 1, maxLevel: 1, cash: 0, earned: 0, best: 0,
  up: { engine: 0, rudder: 0, hull: 0, tank: 0, pump: 0, flare: 0, ciws: 0, bubble: 0 },
  stars: {}, ach: {}, st: { honks: 0, near: 0, pizza: 0, deliv: 0, sunk: 0, kills: 0, ff: 0, mines: 0, dmg: 0 },
  sound: true, music: true
});
let save = defaultSave();
function loadSave(data) {
  let s = data && data.save ? data.save : null;
  if (!s) { try { const raw = localStorage.getItem(SAVE_KEY); if (raw) s = JSON.parse(raw); } catch (e) { s = null; } }
  if (s && typeof s === 'object') {
    const d = defaultSave();
    save = Object.assign(d, s);
    save.up = Object.assign(defaultSave().up, s.up || {});
    save.st = Object.assign(defaultSave().st, s.st || {});
    save.stars = s.stars || {}; save.ach = s.ach || {};
  }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable: progress lives for this visit */ } }

/* ---------- upgrades ---------- */
const UPS = [
  { id: 'engine', name: 'ENGINE', base: 40, vals: [320, 350, 385, 420, 455, 490], fmt: v => (v / 20).toFixed(1) + ' kn', what: 'top speed' },
  { id: 'rudder', name: 'RUDDER', base: 30, vals: [1.9, 2.2, 2.5, 2.85, 3.2, 3.6], fmt: v => Math.round(v / 1.9 * 100) + '%', what: 'turn rate' },
  { id: 'hull', name: 'HULL', base: 40, vals: [100, 130, 165, 205, 250, 300], fmt: v => v + ' hp', what: 'max hull' },
  { id: 'tank', name: 'TANKS', base: 55, vals: [1.0, 1.3, 1.6, 2.0, 2.5, 3.0], fmt: v => v.toFixed(1) + 'M bbl', what: 'cargo' },
  { id: 'pump', name: 'PUMPS', base: 25, vals: [0.4, 0.55, 0.75, 1.0, 1.3, 1.7], fmt: v => v.toFixed(2) + 'M bbl/s', what: 'loading' },
  { id: 'flare', name: 'FLARES', base: 30, vals: [2, 3, 4, 5, 6, 7], fmt: v => v + ' per level', what: 'decoys' },
  { id: 'ciws', name: 'CIWS GUN', base: 70, vals: [0, 1, 2, 3, 4, 5], fmt: v => v ? 'Mk ' + v : 'none', what: 'shoots drones and missiles' },
  { id: 'bubble', name: 'BUBBLE WRAP', base: 45, vals: [0, 1, 2, 3, 4, 5], fmt: v => v + ' free hits', what: 'per level' }
];
const upCost = (u, l) => Math.round(u.base * Math.pow(2.15, l));
const upVal = id => { const u = UPS.find(x => x.id === id); return u.vals[Math.min(save.up[id] || 0, u.vals.length - 1)]; };

/* ---------- levels ---------- */
const LEVELS = [
  { name: 'TRAINING DAY', tip: 'Load crude at an oil field, then sail out through the Strait to a buyer.', quota: 60, mines: 4, traffic: 4 },
  { name: 'MINE YOUR BUSINESS', tip: 'Someone dropped their sea mines. Do not pick them up.', quota: 110, mines: 16, drift: 5, traffic: 5, amb: 9 },
  { name: 'SPEEDBOAT PARTY', tip: 'Uninvited guests. Zig-zag hard or HONK to shake off boarders.', quota: 150, mines: 10, boat: 5, maxBoats: 3, traffic: 5, amb: 9 },
  { name: 'DRONE ZONE', tip: 'Drones dive at where you are. Be somewhere else.', quota: 190, mines: 10, boat: 10, maxBoats: 2, drone: 2.4, traffic: 5, pizza: true },
  { name: 'CRUISE CONTROL', tip: 'Missiles turn wide and you turn tight. Or pop FLARES.', quota: 230, mines: 10, drone: 4, cruise: 4, traffic: 6, pizza: true },
  { name: 'BALLISTIC TUESDAY', tip: 'A red circle means something heavy is falling. Leave the circle.', quota: 270, mines: 8, boat: 9, maxBoats: 2, drone: 4.5, ball: 3.2, traffic: 6, pizza: true },
  { name: 'NIGHT SHIFT', tip: 'Same strait, fewer lights. Follow the magenta course line.', quota: 310, mines: 14, drift: 5, boat: 7, maxBoats: 3, drone: 3.8, cruise: 5, traffic: 6, night: true, pizza: true },
  { name: 'SWARM SEASON', tip: 'The drones brought friends.', quota: 360, mines: 10, drone: 3.6, swarm: 13, cruise: 5.5, traffic: 6, pizza: true },
  { name: 'RUSH HOUR', tip: 'Everyone is shipping oil today. Mind the traffic.', quota: 410, mines: 12, boat: 6, maxBoats: 3, drone: 3.5, cruise: 5, ball: 5, traffic: 16, pizza: true },
  { name: 'STRAIT OUTTA HORMUZ', tip: 'Everything, everywhere, all at once.', quota: 470, mines: 16, drift: 6, boat: 6.5, maxBoats: 3, drone: 3.2, swarm: 15, cruise: 4.2, ball: 3.6, traffic: 8, pizza: true, barrage: true },
  { name: 'YELLOW SUBMARINE', tip: 'Periscope up means a torpedo is coming. Watch the dashed line.', quota: 530, mines: 12, drone: 3.8, cruise: 5, torp: 3.8, traffic: 7, pizza: true },
  { name: 'FULL HORMUZ', tip: 'The finale. After this it only gets weirder.', quota: 600, mines: 18, drift: 6, boat: 6, maxBoats: 4, drone: 3, swarm: 14, cruise: 3.8, ball: 3.3, torp: 5, traffic: 8, pizza: true, barrage: true }
];
const END_A = ['CRUDE', 'SPICY', 'TURBO', 'SAUCY', 'TOTALLY SAFE', 'EXTRA CRISPY', 'VERY NORMAL', 'UNHINGED', 'DEEP FRIED', 'BLACK GOLD', 'SLIPPERY', 'FULLY INSURED'];
const END_B = ['MONDAY', 'COMMUTE', 'REGATTA', 'BRUNCH', 'FIELD TRIP', 'PICNIC', 'FIESTA', 'TUESDAY', 'SHIFT', 'CRUISE', 'RUSH', 'SEMINAR'];
const END_TIPS = ['Analysts expect volatility. Analysts always expect volatility.', 'Your insurer has stopped answering the phone.', 'Head office says the quota is "aspirational".', 'The drones have a union now. Their demands are explosive.', 'Brent is up. Your blood pressure is up. Everything is up.'];
function levelCfg(n) {
  const base = { quota: 60, time: 95, mines: 0, drift: 0, boat: 0, maxBoats: 2, drone: 0, swarm: 0, cruise: 0, ball: 0, torp: 0, amb: 0, traffic: 5, night: false, fog: false, pizza: false, barrage: false };
  let c;
  if (n <= LEVELS.length) c = Object.assign({}, base, LEVELS[n - 1]);
  else {
    const k = n - LEVELS.length, r = mulberry(n * 7919);
    const pr = a => a[Math.floor(r() * a.length)];
    c = Object.assign({}, base, {
      name: pr(END_A) + ' ' + pr(END_B), tip: pr(END_TIPS), quota: Math.round(600 + 85 * k + 5 * Math.pow(k, 1.5)), time: 105,
      mines: 14 + Math.min(16, k), drift: 5, boat: Math.max(4, 6 - k * 0.15), maxBoats: Math.min(6, 3 + Math.floor(k / 3)),
      drone: Math.max(1.8, 3 - k * 0.08), swarm: Math.max(9, 14 - k * 0.4), cruise: Math.max(2.6, 3.8 - k * 0.08), ball: Math.max(2.2, 3.3 - k * 0.08),
      torp: Math.max(3, 5 - k * 0.15), traffic: 8, pizza: true, barrage: true, night: r() < 0.3
    });
    c.fog = !c.night && r() < 0.25;
  }
  c.time = c.time || 95;
  if (n >= 7 && n <= LEVELS.length) c.time = Math.max(c.time, 100);
  c.price = 78 + Math.min(32, n * 1.7);
  c.lvl = n;
  c.threat = 1 + Math.min(0.65, (n - 1) * 0.035);
  return c;
}
