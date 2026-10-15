
/* =========================================================
   FEATURE: CAPTAIN PORTRAIT — a cartoon captain in the HUD reacts to everything
   ========================================================= */
feature({ id: 'captain', group: 'FUNNY', name: 'Captain portrait', desc: 'A cartoon captain in the HUD who sweats near mines, screams at missiles, chews pizza and salutes buyers.' });

const CAP = { cv: document.getElementById('captain'), c: null, react: null, reactT: 0, mood: 'idle', t: 0, blinkT: 2, blink: 0, still: 0, lookX: 0, lookY: 0, drawT: 0 };
CAP.c = CAP.cv.getContext('2d');

function capReact(mood, secs) { CAP.react = mood; CAP.reactT = secs; }
function capShow() {
  const on = feat('captain') && G && !G.attract;
  CAP.cv.hidden = !on;
  document.querySelector('.plate-ship').classList.toggle('has-captain', on);
  if (on) drawCaptain();
}
onEvt('levelStart', () => { CAP.react = null; CAP.reactT = 0; CAP.still = 0; CAP.t = 0; capShow(); });
onEvt('deliver', () => capReact('salute', 1.8));
onEvt('pizza', () => capReact('chew', 2.4));
onEvt('hurt', () => capReact('hurt', 1.3));
onEvt('aground', () => capReact('hurt', 1.2));
onEvt('nearMiss', () => { if (CAP.react !== 'hurt') capReact('cool', 1.5); });
onEvt('shaken', () => capReact('cool', 1.2));
onEvt('honk', () => { if (!CAP.react) capReact('honk', 0.9); });
onEvt('levelEnd', r => capReact(r.win ? 'party' : 'sad', 999));

onEvt('update', dt => {
  if (!G || G.attract || !feat('captain') || CAP.cv.hidden) return;
  CAP.t += dt;
  if (CAP.reactT > 0 && CAP.reactT < 500) { CAP.reactT -= dt; if (CAP.reactT <= 0) CAP.react = null; }
  const P = G.P, spd = Math.hypot(P.vx, P.vy);
  CAP.still = spd < 12 && !P.loading && G.mode === 'play' ? CAP.still + dt : 0;
  let danger = false, best = 900, lx = Math.cos(P.a) * 0.4, ly = Math.sin(P.a) * 0.4;
  const look = (x, y) => { const d = Math.hypot(x - P.x, y - P.y); if (d < best) { best = d; lx = (x - P.x) / (d || 1); ly = (y - P.y) / (d || 1); } return d; };
  for (const m of G.missiles) if (look(m.x, m.y) < 480 && !m.target) danger = true;
  for (const d of G.drones) if (!d.pizza && d.st !== 'approach' && look(d.x, d.y) < 420) danger = true;
  for (const b of G.balls) if (b.t > 0 && Math.hypot(b.x - P.x, b.y - P.y) < b.r + 170) { danger = true; look(b.x, b.y); }
  for (const t of G.torps) if (look(t.x, t.y) < 360) danger = true;
  let nearMine = false;
  for (const m of G.mines) if (look(m.x, m.y) < 230) nearMine = true;
  let mood;
  if (CAP.react === 'hurt' || CAP.react === 'party' || CAP.react === 'sad') mood = CAP.react;
  else if (danger && !P.dead && G.mode === 'play') mood = 'scream';
  else if (CAP.react) mood = CAP.react;
  else if (P.boarders > 0) mood = 'angry';
  else if (nearMine || P.hull / P.maxHull < 0.35) mood = 'sweat';
  else if (CAP.still > 6) mood = 'sleep';
  else mood = 'idle';
  CAP.mood = mood;
  CAP.lookX = lerp(CAP.lookX, lx, 0.15); CAP.lookY = lerp(CAP.lookY, ly, 0.15);
  CAP.blinkT -= dt;
  if (CAP.blinkT <= 0) { CAP.blink = 0.13; CAP.blinkT = rand(2, 5); }
  CAP.blink = Math.max(0, CAP.blink - dt);
  CAP.drawT -= dt;
  if (CAP.drawT <= 0) { CAP.drawT = 1 / 30; drawCaptain(); }
});

function drawCaptain() {
  const c = CAP.c, s = CAP.cv.width / 100, t = CAP.t, m = CAP.mood;
  c.setTransform(s, 0, 0, s, 0, 0);
  c.clearRect(0, 0, 100, 100);
  c.fillStyle = { scream: '#F6C9C0', angry: '#F3B9A8', sweat: '#DCEBF2', party: '#FBE3A0', sad: '#C9D9E4', hurt: '#F2D6CF', chew: '#E4F1DD' }[m] || '#F4E8C8';
  c.beginPath(); c.arc(50, 50, 50, 0, TAU); c.fill();
  c.save();
  c.beginPath(); c.arc(50, 50, 48.5, 0, TAU); c.clip();
  let ox = 0, oy = 0;
  if (m === 'scream') { ox = Math.sin(t * 60) * 1.6; oy = Math.cos(t * 47) * 1.2; }
  else if (m === 'angry') ox = Math.sin(t * 40) * 1;
  else if (m === 'sad') oy = 3;
  else if (m === 'sleep') oy = Math.sin(t * 2) * 1.2;
  c.translate(ox, oy);
  const skin = m === 'angry' ? '#E58E74' : m === 'scream' ? '#F0B7A0' : m === 'sad' ? '#E2BFA4' : '#EDBE95';
  // coat, shirt, epaulettes
  c.fillStyle = '#1E2C44'; c.beginPath(); c.ellipse(50, 106, 46, 30, 0, 0, TAU); c.fill();
  c.fillStyle = '#F4F1E8'; c.beginPath(); c.moveTo(40, 78); c.lineTo(50, 93); c.lineTo(60, 78); c.closePath(); c.fill();
  c.fillStyle = '#E2A72E'; c.fillRect(12, 86, 17, 5); c.fillRect(71, 86, 17, 5);
  c.beginPath(); c.arc(50, 97, 1.9, 0, TAU); c.fill();
  // neck, ears, head
  c.fillStyle = skin; c.fillRect(43, 70, 14, 12);
  c.beginPath(); c.arc(26, 56, 5, 0, TAU); c.arc(74, 56, 5, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(50, 55, 23, 25, 0, 0, TAU); c.fill();
  // beard
  c.fillStyle = '#ECEAE4'; c.strokeStyle = 'rgba(22,38,58,.22)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(27, 54);
  c.quadraticCurveTo(25, 79, 40, 83); c.quadraticCurveTo(50, 89, 60, 83); c.quadraticCurveTo(75, 79, 73, 54);
  c.quadraticCurveTo(68, 67, 60, 67); c.quadraticCurveTo(50, 63, 40, 67); c.quadraticCurveTo(32, 67, 27, 54);
  c.closePath(); c.fill(); c.stroke();
  capMouth(c, m, t);
  c.fillStyle = '#DAD6CC';
  c.beginPath(); c.ellipse(43, 65.5, 8, 3.4, 0.25, 0, TAU); c.ellipse(57, 65.5, 8, 3.4, -0.25, 0, TAU); c.fill();
  c.fillStyle = m === 'angry' ? '#C9573E' : '#D9876A'; c.beginPath(); c.ellipse(50, 59.5, 5, 4.2, 0, 0, TAU); c.fill();
  capEyes(c, m, skin);
  capBrows(c, m);
  capHat(c, m, t);
  capExtras(c, m, t);
  c.restore();
  c.strokeStyle = 'rgba(22,38,58,.55)'; c.lineWidth = 2; c.beginPath(); c.arc(50, 50, 49, 0, TAU); c.stroke();
}
function capEyes(c, m, skin) {
  c.lineCap = 'round';
  if (m === 'cool' || m === 'party') {
    c.fillStyle = '#121A24';
    c.beginPath(); c.moveTo(30, 45); c.lineTo(47, 45); c.lineTo(45, 54); c.lineTo(32, 54); c.closePath();
    c.moveTo(53, 45); c.lineTo(70, 45); c.lineTo(68, 54); c.lineTo(55, 54); c.closePath(); c.fill();
    c.strokeStyle = '#121A24'; c.lineWidth = 2; c.beginPath(); c.moveTo(46, 47); c.lineTo(54, 47); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(34, 47); c.lineTo(38, 51); c.moveTo(57, 47); c.lineTo(61, 51); c.stroke();
    return;
  }
  c.strokeStyle = '#2A2420'; c.lineWidth = 2.2;
  if (m === 'hurt') {
    c.beginPath();
    for (const x of [40, 60]) { c.moveTo(x - 4, 46); c.lineTo(x + 4, 54); c.moveTo(x + 4, 46); c.lineTo(x - 4, 54); }
    c.stroke(); return;
  }
  if (m === 'chew' || m === 'salute' || m === 'honk') {
    c.beginPath(); c.arc(40, 52, 4.5, Math.PI * 1.1, Math.PI * 1.9); c.moveTo(64.3, 50.6); c.arc(60, 52, 4.5, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); return;
  }
  if (CAP.blink > 0 || m === 'sleep') {
    c.beginPath(); c.moveTo(35, 51); c.quadraticCurveTo(40, 54, 45, 51); c.moveTo(55, 51); c.quadraticCurveTo(60, 54, 65, 51); c.stroke(); return;
  }
  const r = m === 'scream' ? 7 : m === 'sweat' ? 5.6 : 5;
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.ellipse(40, 50, r, r * 1.15, 0, 0, TAU); c.ellipse(60, 50, r, r * 1.15, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(42,36,32,.6)'; c.lineWidth = 1; c.stroke();
  const pr = m === 'scream' ? 1.6 : 2.5, dx = CAP.lookX * (r - 2.6), dy = CAP.lookY * (r - 2.4);
  c.fillStyle = '#1C2530';
  c.beginPath(); c.arc(40 + dx, 50.5 + dy, pr, 0, TAU); c.arc(60 + dx, 50.5 + dy, pr, 0, TAU); c.fill();
  if (m === 'sad' || m === 'angry') {
    c.fillStyle = skin; c.beginPath();
    if (m === 'sad') { c.rect(34, 43, 12, 5); c.rect(54, 43, 12, 5); }
    else { c.moveTo(34, 43); c.lineTo(46, 43); c.lineTo(46, 49); c.closePath(); c.moveTo(66, 43); c.lineTo(54, 43); c.lineTo(54, 49); c.closePath(); }
    c.fill();
  }
}
function capBrows(c, m) {
  c.strokeStyle = '#B5B0A5'; c.lineWidth = 3.2; c.lineCap = 'round';
  let L = [34, 42, 46, 41], R = [54, 41, 66, 42];
  if (m === 'scream') { L = [33, 36, 45, 34]; R = [55, 34, 67, 36]; }
  else if (m === 'angry') { L = [33, 39, 46, 45]; R = [54, 45, 67, 39]; }
  else if (m === 'sweat' || m === 'sad') { L = [33, 44, 45, 39]; R = [55, 39, 67, 44]; }
  else if (m === 'cool' || m === 'party') { L = [33, 41, 45, 41]; R = [55, 39, 67, 37]; }
  c.beginPath(); c.moveTo(L[0], L[1]); c.lineTo(L[2], L[3]); c.moveTo(R[0], R[1]); c.lineTo(R[2], R[3]); c.stroke();
}
function capMouth(c, m, t) {
  c.fillStyle = '#7A2C22'; c.strokeStyle = '#5A2018'; c.lineWidth = 2; c.lineCap = 'round';
  if (m === 'scream') {
    const h = 9 + Math.sin(t * 30) * 1.5;
    c.beginPath(); c.ellipse(50, 75, 7, h, 0, 0, TAU); c.fill();
    c.fillStyle = '#E27B83'; c.beginPath(); c.ellipse(50, 75 + h * 0.55, 4.5, 3, 0, 0, TAU); c.fill();
  } else if (m === 'angry') {
    c.fillStyle = '#FFFFFF'; c.fillRect(42, 70, 16, 6); c.strokeRect(42, 70, 16, 6);
    c.lineWidth = 1; c.beginPath(); for (const x of [46, 50, 54]) { c.moveTo(x, 70); c.lineTo(x, 76); } c.stroke();
  } else if (m === 'chew') {
    const k = Math.abs(Math.sin(t * 12));
    c.beginPath(); c.ellipse(50, 74, 5, 1.5 + k * 2.6, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(226,120,120,.45)'; c.beginPath(); c.arc(34, 64, 4.5, 0, TAU); c.arc(66, 64, 4.5, 0, TAU); c.fill();
  } else if (m === 'salute' || m === 'party') {
    c.beginPath(); c.arc(50, 69, 9, 0.12 * Math.PI, 0.88 * Math.PI); c.closePath(); c.fill();
    c.fillStyle = '#FFFFFF'; c.fillRect(43, 69.5, 14, 2.6);
  } else if (m === 'sweat') {
    c.beginPath(); c.moveTo(42, 74); for (let i = 0; i < 4; i++) c.quadraticCurveTo(44 + i * 4, 71 + (i % 2) * 6, 46 + i * 4, 74); c.stroke();
  } else if (m === 'sad' || m === 'hurt') {
    c.beginPath(); c.arc(50, 81, 8, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
  } else if (m === 'sleep') {
    c.beginPath(); c.ellipse(50, 74, 2.5, 3 + Math.sin(t * 2) * 0.6, 0, 0, TAU); c.fill();
  } else if (m === 'honk') {
    c.beginPath(); c.ellipse(50, 74, 4.5, 5.5, 0, 0, TAU); c.fill();
  } else if (m === 'cool') {
    c.beginPath(); c.moveTo(43, 73); c.quadraticCurveTo(52, 77, 58, 70); c.stroke();
  } else {
    c.beginPath(); c.arc(50, 68, 7, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    // the pipe
    c.strokeStyle = '#5A3A1C'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(55, 73); c.lineTo(64, 76); c.stroke();
    c.fillStyle = '#7A4E1E'; c.beginPath(); c.moveTo(62, 72); c.lineTo(70, 72); c.lineTo(69, 80); c.lineTo(63, 80); c.closePath(); c.fill();
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.6 + i / 3) % 1;
      c.fillStyle = 'rgba(160,160,160,' + (0.5 * (1 - k)).toFixed(3) + ')';
      c.beginPath(); c.arc(66 + Math.sin(k * 6 + i) * 3, 70 - k * 22, 2 + k * 3, 0, TAU); c.fill();
    }
  }
}
function capHat(c, m, t) {
  const hy = m === 'scream' ? -6 - Math.abs(Math.sin(t * 20)) * 3 : m === 'party' ? -2 : 0;
  const tilt = m === 'sad' ? -0.18 : m === 'cool' ? 0.12 : m === 'sleep' ? 0.08 : 0;
  c.save(); c.translate(50, 28.5 + hy); c.rotate(tilt);
  c.fillStyle = '#F7F5EE'; c.strokeStyle = '#1E2C44'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-27, 3); c.quadraticCurveTo(-30, -16, 0, -19); c.quadraticCurveTo(30, -16, 27, 3); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#1E2C44'; c.fillRect(-25, -2, 50, 7);
  c.fillStyle = '#10161F'; c.beginPath(); c.moveTo(-23, 5); c.quadraticCurveTo(0, 15, 23, 5); c.quadraticCurveTo(0, 9, -23, 5); c.fill();
  c.strokeStyle = '#E2A72E'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-20, 6.5); c.quadraticCurveTo(0, 12, 20, 6.5); c.stroke();
  c.fillStyle = '#E2A72E'; c.beginPath(); c.ellipse(0, -8, 6.5, 5.5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#1E2C44'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(0, -11.5); c.lineTo(0, -4.5); c.moveTo(-2.5, -9.5); c.lineTo(2.5, -9.5); c.moveTo(-3.5, -6.5); c.quadraticCurveTo(0, -3, 3.5, -6.5); c.stroke();
  c.restore();
}
function capExtras(c, m, t) {
  if (m === 'sweat') {
    c.fillStyle = '#6FB6E8';
    for (const [x, ph] of [[29, 0], [70, 0.5]]) { const k = (t * 1.3 + ph) % 1, y = 42 + k * 16; c.beginPath(); c.moveTo(x, y - 4); c.quadraticCurveTo(x + 3, y, x, y + 2.5); c.quadraticCurveTo(x - 3, y, x, y - 4); c.fill(); }
  } else if (m === 'chew') {
    c.fillStyle = '#E8B04A'; c.strokeStyle = '#C48A44'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(60, 77); c.lineTo(80, 69); c.lineTo(78, 86); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(80, 69); c.lineTo(78, 86); c.stroke();
    c.fillStyle = '#C2352B'; c.beginPath(); c.arc(71, 75, 1.8, 0, TAU); c.arc(74, 80, 1.6, 0, TAU); c.fill();
  } else if (m === 'salute') {
    c.strokeStyle = '#1E2C44'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(88, 96); c.lineTo(76, 46); c.stroke();
    c.fillStyle = '#EDBE95'; c.beginPath(); c.ellipse(73, 38, 7, 5, -0.6, 0, TAU); c.fill();
  } else if (m === 'hurt') {
    c.fillStyle = '#FFFFFF'; c.save(); c.translate(36, 38); c.rotate(-0.5); c.fillRect(-7, -2.5, 14, 5); c.rotate(1.1); c.fillRect(-7, -2.5, 14, 5); c.restore();
    c.fillStyle = '#F2C230';
    for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; capStar(c, 50 + Math.cos(a) * 20, 20 + Math.sin(a) * 5, 3.2); }
  } else if (m === 'angry') {
    for (const sx of [21, 79]) for (let i = 0; i < 2; i++) {
      const k = (t * 1.8 + i * 0.5) % 1;
      c.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - k)).toFixed(3) + ')';
      c.beginPath(); c.arc(sx + (sx < 50 ? -k * 8 : k * 8), 52 - k * 18, 2.5 + k * 4, 0, TAU); c.fill();
    }
  } else if (m === 'sleep') {
    c.fillStyle = '#2C5D7C'; c.font = '700 12px ' + FONT_UI;
    for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; c.fillText('Z', 70 + k * 16, 40 - k * 26); }
    c.globalAlpha = 1;
  } else if (m === 'sad') {
    c.fillStyle = '#6FB6E8';
    for (const x of [37, 63]) { const k = (t * 1.1 + (x > 50 ? 0.5 : 0)) % 1; c.beginPath(); c.ellipse(x, 56 + k * 18, 1.8, 2.6, 0, 0, TAU); c.fill(); }
  } else if (m === 'party') {
    const cols = ['#C0177A', '#F2A31D', '#2E9E6A', '#2C5D7C', '#C2352B'];
    for (let i = 0; i < 14; i++) { const k = (t * 0.35 + i * 0.137) % 1; c.fillStyle = cols[i % 5]; c.fillRect((i * 37) % 100, k * 100, 3, 4); }
  } else if (m === 'honk') {
    c.strokeStyle = '#C0177A'; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const r = 8 + i * 6 + (t * 20) % 6; c.beginPath(); c.arc(56, 74, r, -0.5, 0.5); c.stroke(); }
  }
}
function capStar(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = i / 10 * TAU - Math.PI / 2; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
