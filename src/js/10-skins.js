
/* =========================================================
   FEATURE: SHIP SKINS — goofy paint jobs unlocked by badges
   ========================================================= */
feature({ id: 'skins', group: 'FUNNY', name: 'Ship skins', desc: 'Unlock goofy tankers with badges (pink, dazzle camo, pirate, pool flamingo, rubber duck, tuna, gold) and pick one on the title screen.' });

const SKINS = [
  { id: 'classic', name: 'Classic', need: null },
  { id: 'pink', name: 'Barbie Crude', need: 'first' },
  { id: 'camo', name: 'Dazzle Camo', need: 'close10' },
  { id: 'pirate', name: 'Jolly Roger', need: 'shake' },
  { id: 'flamingo', name: 'Pool Flamingo', need: 'pizza' },
  { id: 'duck', name: 'Captain Quack', need: 'honk' },
  { id: 'fish', name: 'Big Tuna', need: 'sunk' },
  { id: 'gold', name: 'Midas Touch', need: 'billion' }
];
const skinUnlocked = s => !s.need || !!save.ach[s.need];
function currentSkin() {
  const s = SKINS.find(k => k.id === save.skin);
  return s && skinUnlocked(s) ? s.id : 'classic';
}
shipPainter = (x, y, a, o) => {
  if (!feat('skins')) return false;
  const id = currentSkin();
  if (id === 'classic') return false;
  drawSkin(id, x, y, a, o || {});
  return true;
};

function drawSkin(id, x, y, a, o) {
  if (id === 'pink') { drawShipShape('tanker', x, y, a, Object.assign({}, o, { hull: '#B5126E', deck: '#F59BC8', band: '#FFFFFF' })); return; }
  if (id === 'gold') {
    drawShipShape('tanker', x, y, a, Object.assign({}, o, { hull: '#6E520E', deck: '#E9B825', band: '#FFF2B0' }));
    const k = Math.floor((G ? G.t : 0) * 2.5), sx = ((k * 37) % 50) - 22, sy = ((k * 13) % 10) - 5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#FFFBE6';
    ctx.beginPath(); ctx.moveTo(sx, sy - 5); ctx.lineTo(sx + 1.2, sy - 1.2); ctx.lineTo(sx + 5, sy); ctx.lineTo(sx + 1.2, sy + 1.2); ctx.lineTo(sx, sy + 5); ctx.lineTo(sx - 1.2, sy + 1.2); ctx.lineTo(sx - 5, sy); ctx.lineTo(sx - 1.2, sy - 1.2); ctx.closePath(); ctx.fill();
    ctx.restore(); return;
  }
  if (id === 'pirate') {
    drawShipShape('tanker', x, y, a, Object.assign({}, o, { hull: '#14171C', deck: '#6B4A2B', band: '#C2352B' }));
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = 'rgba(40,25,10,.45)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (const ly of [-4.5, -1.5, 1.5, 4.5]) { ctx.moveTo(-14, ly); ctx.lineTo(24, ly); }
    ctx.stroke();
    ctx.fillStyle = '#111316'; ctx.beginPath(); ctx.moveTo(3, -14); ctx.quadraticCurveTo(14, 0, 3, 14); ctx.lineTo(-1, 14); ctx.quadraticCurveTo(9, 0, -1, -14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5A3A1C'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(1, -15); ctx.lineTo(1, 15); ctx.stroke();
    ctx.fillStyle = '#F4F1E8'; ctx.beginPath(); ctx.arc(7.5, 0, 2.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#F4F1E8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4.5, -4); ctx.lineTo(10.5, 4); ctx.moveTo(10.5, -4); ctx.lineTo(4.5, 4); ctx.stroke();
    ctx.fillStyle = '#111316'; ctx.beginPath(); ctx.arc(6.7, -0.9, 0.7, 0, TAU); ctx.arc(6.7, 0.9, 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111316'; ctx.fillRect(-36, -2, 7, 5); ctx.fillStyle = '#F4F1E8'; ctx.beginPath(); ctx.arc(-32.5, 0.5, 1.2, 0, TAU); ctx.fill();
    ctx.restore(); return;
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.save(); ctx.translate(3, 4); ctx.fillStyle = 'rgba(22,38,58,.2)';
  if (id === 'camo') { hullPath(64, 16); ctx.fill(); } else { ctx.beginPath(); ctx.ellipse(-2, 0, 30, 13, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  if (id === 'camo') {
    hullPath(64, 16); ctx.fillStyle = '#F1F1EA'; ctx.fill();
    ctx.save(); hullPath(64, 16); ctx.clip();
    ctx.fillStyle = '#1B1F26';
    for (let i = -6; i < 8; i++) { const x0 = i * 9; ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + 4.5, -10); ctx.lineTo(x0 - 3, 10); ctx.lineTo(x0 - 7.5, 10); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#5E7E9E'; ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(14, 9); ctx.lineTo(2, 9); ctx.closePath(); ctx.moveTo(18, -9); ctx.lineTo(30, 4); ctx.lineTo(26, -9); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#1B1F26'; ctx.lineWidth = 1.2; hullPath(64, 16); ctx.stroke();
    ctx.fillStyle = '#F1F1EA'; ctx.fillRect(-30.5, -6.5, 11, 13); ctx.fillStyle = '#1B1F26'; ctx.fillRect(-28, -6.5, 2.5, 13); ctx.fillRect(-23.5, -6.5, 2.5, 13);
  } else if (id === 'flamingo') {
    ctx.fillStyle = '#F48FB5'; ctx.strokeStyle = '#C2457A'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-36, -7); ctx.lineTo(-33, 0); ctx.lineTo(-36, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-6, 0, 24, 13, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F9BDD3'; ctx.beginPath(); ctx.ellipse(-9, -5.5, 13, 4, -0.18, 0, TAU); ctx.ellipse(-9, 5.5, 13, 4, 0.18, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#F48FB5'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.quadraticCurveTo(26, 10, 27, -1); ctx.stroke();
    ctx.strokeStyle = '#C2457A'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, 3.5); ctx.quadraticCurveTo(25, 13, 30.5, -1); ctx.stroke();
    ctx.fillStyle = '#F48FB5'; ctx.beginPath(); ctx.arc(28, -3, 5.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#F4F1E8'; ctx.beginPath(); ctx.moveTo(32, -5.5); ctx.lineTo(38, -3); ctx.lineTo(32, -0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1B1F26'; ctx.beginPath(); ctx.moveTo(36, -4); ctx.lineTo(39, -3); ctx.lineTo(36, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(28.5, -5.2, 1, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(-10, -2, 15, -2.6, -1.7); ctx.stroke();
  } else if (id === 'duck') {
    ctx.fillStyle = '#F7CF3B'; ctx.strokeStyle = '#B98A12'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-24, -5); ctx.lineTo(-34, -9); ctx.lineTo(-26, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-5, 0, 23, 15, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(16, 0, 11, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F07B1C'; ctx.beginPath(); ctx.moveTo(25, -4); ctx.quadraticCurveTo(34, -2, 35, 0); ctx.quadraticCurveTo(34, 2, 25, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(19, -5, 1.8, 0, TAU); ctx.arc(19, 5, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-8, -6, 11, 3.4, -0.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(13, -4, 2.4, 0, TAU); ctx.fill();
  } else if (id === 'fish') {
    ctx.fillStyle = '#4D6E8D'; ctx.strokeStyle = '#22384E'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-40, -12); ctx.lineTo(-35, 0); ctx.lineTo(-40, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 0); ctx.quadraticCurveTo(22, -12, -4, -11); ctx.quadraticCurveTo(-22, -9, -28, 0); ctx.quadraticCurveTo(-22, 9, -4, 11); ctx.quadraticCurveTo(22, 12, 32, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9FB8CC'; ctx.beginPath(); ctx.ellipse(0, -7, 20, 2.6, 0, 0, TAU); ctx.ellipse(0, 7, 20, 2.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#22384E'; ctx.beginPath(); ctx.ellipse(-2, 0, 22, 2.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#F2C230';
    for (let i = 0; i < 5; i++) { const fx = -24 + i * 4; ctx.beginPath(); ctx.moveTo(fx, -2); ctx.lineTo(fx + 2.5, 0); ctx.lineTo(fx, 2); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(34,56,78,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(14, 0, 10, -1.1, 1.1); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(22, -6, 2.6, 0, TAU); ctx.arc(22, 6, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111316'; ctx.beginPath(); ctx.arc(22.6, -6, 1.3, 0, TAU); ctx.arc(22.6, 6, 1.3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- title screen picker ---------- */
function renderSkinPicker() {
  const box = $('tSkins'), row = $('tSkinRow');
  box.hidden = !feat('skins');
  if (box.hidden) return;
  row.textContent = '';
  const cur = currentSkin();
  for (const s of SKINS) {
    const ok = skinUnlocked(s), b = document.createElement('button');
    b.type = 'button'; b.className = 'skin' + (s.id === cur ? ' sel' : '') + (ok ? '' : ' locked');
    b.setAttribute('aria-pressed', s.id === cur ? 'true' : 'false');
    const cv = document.createElement('canvas'); cv.width = 168; cv.height = 84; cv.setAttribute('aria-hidden', 'true');
    const c = cv.getContext('2d');
    c.fillStyle = C.sea; c.fillRect(0, 0, 168, 84);
    c.setTransform(2, 0, 0, 2, 84, 42);
    withCtx(c, () => {
      if (s.id === 'classic') drawShipShape('tanker', 0, 0, -0.18, { cargo: 0.6, deck: '#A5432F' });
      else drawSkin(s.id, 0, 0, -0.18, { cargo: 0.6, deck: '#A5432F' });
    });
    if (!ok) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgba(244,232,200,.55)'; c.fillRect(0, 0, 168, 84); }
    const nm = document.createElement('span'); nm.textContent = s.name;
    b.append(cv, nm);
    if (!ok) { const lk = document.createElement('small'); lk.textContent = 'Badge: ' + ACH[s.need][0]; b.append(lk); b.title = 'Unlock with the badge "' + ACH[s.need][0] + '": ' + ACH[s.need][1]; }
    b.setAttribute('aria-label', s.name + (ok ? (s.id === cur ? ', selected' : '') : ', locked. Unlock with the badge ' + ACH[s.need][0]));
    b.addEventListener('click', () => {
      Snd.init();
      if (!ok) { Snd.nope(); showToast('LOCKED SKIN', s.name, 'Earn the badge "' + ACH[s.need][0] + '": ' + ACH[s.need][1]); return; }
      save.skin = s.id; persist(); Snd.buy(); renderSkinPicker();
    });
    row.append(b);
  }
}
onEvt('title', renderSkinPicker);
onEvt('badge', id => {
  if (!feat('skins')) return;
  const s = SKINS.find(k => k.need === id);
  if (s) showToast('NEW SKIN UNLOCKED', s.name, 'Pick it on the title screen.');
});
