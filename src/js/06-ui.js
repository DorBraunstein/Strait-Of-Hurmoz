
/* =========================================================
   UI — input, HUD, screens, boot
   ========================================================= */
const $ = id => document.getElementById(id);
const UI = {
  hud: $('hud'), lvl: $('hLvl'), name: $('hName'), time: $('hTime'), quota: $('hQuota'), quotaFill: $('hQuotaFill'),
  price: $('hPrice'), priceD: $('hPriceD'), hot: $('hHot'), hull: $('hHull'), hullBar: $('hHullBar'), hullN: $('hHullN'),
  cargo: $('hCargo'), cargoN: $('hCargoN'), speed: $('hSpeed'), chips: $('hChips'), flares: $('hFlares'),
  bFlare: $('bFlare'), bHonk: $('bHonk'), hint: $('hint'), radio: $('radio'), radioText: $('radioText'),
  ticker: $('tickerText'), toast: $('toast'),
  sTitle: $('sTitle'), sPause: $('sPause'), sPort: $('sPort')
};
const Input = { keys: {}, mouse: { down: false, x: 0, y: 0 }, joy: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 } };
let portShown = false, wakeLock = null;

function readInput() {
  const k = Input.keys;
  let dx = 0, dy = 0;
  if (k.ArrowLeft || k.KeyA) dx -= 1;
  if (k.ArrowRight || k.KeyD) dx += 1;
  if (k.ArrowUp || k.KeyW) dy -= 1;
  if (k.ArrowDown || k.KeyS) dy += 1;
  if (dx || dy) { const l = Math.hypot(dx, dy); return { dx: dx / l, dy: dy / l, thr: 1 }; }
  const j = Input.joy;
  if (j.active) {
    const jx = j.x - j.ox, jy = j.y - j.oy, l = Math.hypot(jx, jy);
    return l > 10 ? { dx: jx / l, dy: jy / l, thr: clamp(l / 55, 0.35, 1) } : { dx: 0, dy: 0, thr: 0 };
  }
  if (Input.mouse.down) {
    const [sx, sy] = w2s(G.P.x, G.P.y), mx = Input.mouse.x - sx, my = Input.mouse.y - sy, l = Math.hypot(mx, my);
    if (l > 14) return { dx: mx / l, dy: my / l, thr: clamp(l / 160, 0.35, 1) };
  }
  return { dx: 0, dy: 0, thr: 0 };
}
const playing = () => G && !G.attract && G.mode === 'play';
const screenOpen = () => !UI.sTitle.hidden || !UI.sPause.hidden || !UI.sPort.hidden;

/* ---------- input wiring ---------- */
window.addEventListener('keydown', e => {
  const c = e.code;
  Snd.init();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  if (c === 'KeyM') { toggleSound(); return; }
  if (screenOpen()) {
    if (c === 'Enter' && e.target.tagName !== 'BUTTON') { if (!UI.sTitle.hidden) $('bPlay').click(); else if (!UI.sPort.hidden) $('bNext').click(); else if (!UI.sPause.hidden) resumeGame(); }
    else if ((c === 'Escape' || c === 'KeyP') && !UI.sPause.hidden) { e.preventDefault(); resumeGame(); }
    else if (c === 'KeyR' && !UI.sPause.hidden) startLevel(G.level);
    return;
  }
  Input.keys[c] = true;
  if (!playing()) return;
  if (c === 'Space') fireFlares();
  else if (c === 'KeyH' || c === 'KeyE') honk();
  else if (c === 'Escape' || c === 'KeyP') pauseGame();
});
window.addEventListener('keyup', e => { Input.keys[e.code] = false; });
window.addEventListener('blur', () => { Input.keys = {}; Input.mouse.down = false; Input.joy.active = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  Snd.init();
  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
    if (!Input.joy.active) { Input.joy = { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY }; }
  } else {
    Input.mouse.x = e.clientX; Input.mouse.y = e.clientY;
    if (e.button === 2) { if (playing()) fireFlares(); }
    else if (e.button === 0) Input.mouse.down = true;
  }
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => {
  if (Input.joy.active && e.pointerId === Input.joy.id) { Input.joy.x = e.clientX; Input.joy.y = e.clientY; }
  else if (e.pointerType === 'mouse') { Input.mouse.x = e.clientX; Input.mouse.y = e.clientY; }
});
const endPointer = e => {
  if (Input.joy.active && e.pointerId === Input.joy.id) Input.joy.active = false;
  if (e.pointerType === 'mouse' && e.button === 0) Input.mouse.down = false;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') Input.mouse.down = false; });
function actButton(el, fn) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); fn(); });
  el.addEventListener('click', e => { if (e.detail === 0) fn(); });
}
actButton(UI.bFlare, () => { if (playing()) fireFlares(); });
actButton(UI.bHonk, () => { if (playing()) honk(); });
$('bPause').addEventListener('click', () => { if (playing()) pauseGame(); });
$('bMute').addEventListener('click', toggleSound);
$('bPlay').addEventListener('click', () => { Snd.init(); startLevel(save.level); });
$('bResume').addEventListener('click', resumeGame);
$('bRestart').addEventListener('click', () => startLevel(G.level));
$('bQuit').addEventListener('click', showTitle);
$('bSound').addEventListener('click', toggleSound);
$('bMusic').addEventListener('click', () => { save.music = !save.music; Snd.setMusic(save.music); persist(); syncSoundLabels(); });
$('bMenu').addEventListener('click', showTitle);
$('bNext').addEventListener('click', () => { Snd.init(); startLevel(G && G.result && !G.result.win ? G.level : save.level); });
let resetArm = 0;
$('bReset').addEventListener('click', () => {
  const b = $('bReset');
  if (Date.now() - resetArm < 3000) {
    const keep = { sound: save.sound, music: save.music };
    save = Object.assign(defaultSave(), keep); persist(); resetArm = 0; showTitle();
    showToast('LOGBOOK', 'Fresh career', 'Upgrades and cash wiped. Badges too.');
  } else { resetArm = Date.now(); b.textContent = 'Tap again to wipe all progress'; setTimeout(() => { b.textContent = 'New career'; }, 3000); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && playing()) pauseGame(); });
window.addEventListener('resize', () => { resize(); });

/* ---------- sound toggles ---------- */
function toggleSound() { save.sound = !save.sound; Snd.setEnabled(save.sound); persist(); syncSoundLabels(); }
function syncSoundLabels() {
  $('bSound').textContent = 'SOUND: ' + (save.sound ? 'ON' : 'OFF');
  $('bMusic').textContent = 'MUSIC: ' + (save.music ? 'ON' : 'OFF');
  const m = $('bMute'); m.setAttribute('aria-pressed', save.sound ? 'false' : 'true'); m.textContent = save.sound ? 'SND' : 'MUTED';
}

/* ---------- screens ---------- */
function hideScreens() { UI.sTitle.hidden = true; UI.sPause.hidden = true; UI.sPort.hidden = true; }
function showTitle() {
  hideScreens(); portShown = false;
  newGame(1, true);
  G.P.cargo = 0; G.cam.x = G.P.x; G.cam.y = G.P.y;
  UI.hud.hidden = true; UI.sTitle.hidden = false;
  const lvl = save.level;
  $('bPlay').textContent = lvl > 1 ? 'CONTINUE · LEVEL ' + lvl : 'SET SAIL';
  $('bReset').hidden = !(lvl > 1 || save.cash > 0);
  const nb = Object.keys(save.ach).length, total = Object.keys(ACH).length;
  const bests = $('tBests'); bests.textContent = '';
  const items = [['BEST LEVEL', save.best ? String(save.best) : '—'], ['TOTAL EARNED', fmtMoney(save.earned)], ['CARGOES', String(save.st.deliv)], ['HONKS', String(save.st.honks)], ['BADGES', nb + '/' + total]];
  for (const [k, v] of items) { const s = document.createElement('span'); s.append(k + ' '); const b = document.createElement('b'); b.textContent = v; s.append(b); bests.append(s); }
  const badges = $('tBadges'); badges.textContent = '';
  for (const id of Object.keys(ACH)) { const s = document.createElement('span'); s.className = 'badge' + (save.ach[id] ? '' : ' off'); s.textContent = save.ach[id] ? ACH[id][0] : '?'; s.title = ACH[id][1]; badges.append(s); }
  keepAwake(false);
  setTimeout(() => { try { $('bPlay').focus({ preventScroll: true }); } catch (e) { /* focus is optional */ } }, 30);
}
function startLevel(n) {
  hideScreens(); portShown = false;
  Snd.init(); Snd.startMusic();
  newGame(Math.max(1, n | 0), false);
  UI.hud.hidden = false;
  resize();
  for (const k in lastHud) delete lastHud[k];
  hudT = 0; hudTick(0);
  Input.keys = {}; Input.mouse.down = false; Input.joy.active = false;
  keepAwake(true);
  try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (e) { /* ignore */ }
}
function pauseGame() {
  if (!playing()) return;
  G.mode = 'paused';
  $('pzLevel').textContent = 'LEVEL ' + G.level + ' · ' + G.cfg.name;
  syncSoundLabels();
  UI.sPause.hidden = false;
  setTimeout(() => { try { $('bResume').focus({ preventScroll: true }); } catch (e) { /* optional */ } }, 30);
}
function resumeGame() {
  if (!G || G.mode !== 'paused') return;
  G.mode = 'play'; UI.sPause.hidden = true;
  Input.keys = {};
  try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (e) { /* ignore */ }
}
function starSVG(on) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="' + (on ? '#F2A31D' : 'none') + '" stroke="#16263A" stroke-width="1.6" stroke-linejoin="round"/></svg>';
}
function showPort() {
  portShown = true;
  const r = G.result, c = G.cfg;
  UI.hud.hidden = true;
  $('pEyebrow').textContent = 'LEVEL ' + G.level + ' · ' + c.name;
  const title = $('pTitle');
  title.textContent = r.win ? 'QUOTA MET' : r.reason === 'sunk' ? 'SUNK' : "TIME'S UP";
  title.className = 'port-title' + (r.win ? '' : ' bad');
  $('pStars').innerHTML = r.win ? [0, 1, 2].map(i => starSVG(i < r.stars)).join('') : '';
  $('pStars').setAttribute('aria-label', r.win ? r.stars + ' of 3 stars' : 'No stars');
  $('pHeadline').textContent = r.headline;
  $('pPremium').textContent = 'WAR RISK PREMIUM +' + Math.round(35 + G.dmg * 2.5 + G.hits * 12 + G.level * 6) + '%';
  $('pMeta').textContent = r.win ? 'PORT OF FUJAIRAH · DRY DOCK 3' : 'SALVAGE YARD · KHOR FAKKAN';
  const L = $('pLedger'); L.textContent = '';
  const row = (k, v, cls) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; if (cls) { dt.className = cls; dd.className = cls; } L.append(dt, dd); };
  row('Crude sold (' + G.deliveries + (G.deliveries === 1 ? ' cargo' : ' cargoes') + ')', fmtMoney(G.earned));
  row('Close calls, shoot-downs, lucky finds', fmtMoney(G.bonus));
  if (r.win) {
    row('Time bonus (' + Math.ceil(G.timeLeft) + 's left)', fmtMoney(r.timeBonus));
    if (r.perfect) row('Not-a-scratch bonus', fmtMoney(r.perfect));
    row('Banked', fmtMoney(r.sum), 'tot');
  } else {
    row('Insurance pays 50%', fmtMoney(r.payout), 'tot');
  }
  renderUpgrades();
  const nb = $('bNext');
  nb.innerHTML = '';
  nb.append(r.win ? 'LEVEL ' + save.level + ' ▶ ' : 'RETRY LEVEL ' + G.level + ' ');
  const kb = document.createElement('kbd'); kb.textContent = 'ENTER'; nb.append(kb);
  UI.sPort.hidden = false; UI.sPort.scrollTop = 0;
  keepAwake(false);
  setTimeout(() => { try { nb.focus({ preventScroll: true }); } catch (e) { /* optional */ } }, 40);
}
function renderUpgrades() {
  const box = $('pUps');
  if (!box.childElementCount) {
    for (const u of UPS) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.id = u.id;
      const nm = document.createElement('span'); nm.className = 'up-name'; nm.textContent = u.name;
      const pips = document.createElement('span'); pips.className = 'up-pips';
      for (let i = 0; i < u.vals.length - 1; i++) pips.append(document.createElement('i'));
      const eff = document.createElement('span'); eff.className = 'up-eff';
      const cs = document.createElement('span'); cs.className = 'up-cost';
      b.append(nm, pips, eff, cs);
      b.addEventListener('click', e => buyUpgrade(u, b, e.detail > 0));
      box.append(b);
    }
  }
  $('pCash').textContent = fmtMoney(save.cash);
  for (const b of box.children) {
    const u = UPS.find(x => x.id === b.dataset.id), lvl = save.up[u.id] || 0, max = u.vals.length - 1, maxed = lvl >= max;
    const cost = maxed ? 0 : upCost(u, lvl), can = !maxed && save.cash >= cost;
    b.className = 'up' + (maxed ? ' maxed' : can ? ' buyable' : ' cant');
    b.setAttribute('aria-disabled', maxed ? 'true' : 'false');
    [...b.querySelectorAll('.up-pips i')].forEach((p, i) => { p.className = i < lvl ? 'on' : ''; });
    b.querySelector('.up-eff').textContent = maxed ? u.fmt(u.vals[lvl]) + ' · ' + u.what : u.fmt(u.vals[lvl]) + ' → ' + u.fmt(u.vals[lvl + 1]) + ' · ' + u.what;
    b.querySelector('.up-cost').textContent = maxed ? 'MAXED' : fmtMoney(cost);
    b.setAttribute('aria-label', u.name + ', level ' + lvl + ' of ' + max + (maxed ? ', maxed' : ', costs ' + fmtMoney(cost)));
  }
}
function buyUpgrade(u, b, byPointer) {
  Snd.init();
  const lvl = save.up[u.id] || 0;
  if (lvl >= u.vals.length - 1) return;
  const cost = upCost(u, lvl);
  if (save.cash < cost) { Snd.nope(); if (b.animate) b.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 180 }); }
  else { save.cash -= cost; save.up[u.id] = lvl + 1; persist(); Snd.buy(); renderUpgrades(); }
  if (byPointer) b.blur();
}

/* ---------- HUD ---------- */
const lastHud = {};
let hudT = 0;
function setText(el, key, txt) { if (lastHud[key] !== txt) { lastHud[key] = txt; el.textContent = txt; } }
function setWidth(el, key, pct) { const v = pct.toFixed(1) + '%'; if (lastHud[key] !== v) { lastHud[key] = v; el.style.width = v; } }
function hudTick(dt) {
  hudT -= dt;
  if (hudT > 0 || !G || G.attract || UI.hud.hidden) return;
  hudT = 0.1;
  const P = G.P, c = G.cfg, tot = total();
  setText(UI.lvl, 'lvl', 'LVL ' + G.level);
  setText(UI.name, 'name', c.name);
  setText(UI.time, 'time', fmtTime(G.timeLeft));
  const low = G.timeLeft < 15 && G.mode === 'play';
  if (lastHud.low !== low) { lastHud.low = low; UI.time.classList.toggle('low', low); }
  setText(UI.quota, 'quota', fmtMoney(tot) + ' / ' + fmtMoney(c.quota));
  setWidth(UI.quotaFill, 'qf', clamp(tot / c.quota * 100, 0, 100));
  setText(UI.price, 'price', '$' + G.price.toFixed(2));
  const d = G.price - G.priceAgo;
  setText(UI.priceD, 'pd', (d >= 0 ? '▲ +' : '▼ ') + d.toFixed(2));
  const dc = 'delta ' + (d >= 0 ? 'rise' : 'fall'); if (lastHud.dc !== dc) { lastHud.dc = dc; UI.priceD.className = dc; }
  const hotTxt = G.hot ? 'HOT ' + G.hot.g.name + ' ×2 · ' + Math.ceil(G.hot.t) + 's' : '';
  setText(UI.hot, 'hot', hotTxt); if (lastHud.hotH !== !G.hot) { lastHud.hotH = !G.hot; UI.hot.hidden = !G.hot; }
  const hp = P.hull / P.maxHull;
  setWidth(UI.hull, 'hull', hp * 100); setText(UI.hullN, 'hullN', Math.ceil(P.hull) + '/' + P.maxHull);
  const hc = 'bar hull' + (hp < 0.3 ? ' crit' : hp < 0.6 ? ' warn' : ''); if (lastHud.hc !== hc) { lastHud.hc = hc; UI.hullBar.className = hc; }
  setWidth(UI.cargo, 'cargo', P.cargo / P.cap * 100); setText(UI.cargoN, 'cargoN', fmtBbl(P.cargo));
  setText(UI.speed, 'spd', (Math.hypot(P.vx, P.vy) / 20).toFixed(1) + ' kn');
  let chips = '';
  if (P.bubble > 0) chips += '<span class="chip">BUBBLE WRAP ×' + P.bubble + '</span>';
  if (P.nitro > 0) chips += '<span class="chip bad">NITRO ' + Math.ceil(P.nitro) + 's</span>';
  if (P.boarders > 0) chips += '<span class="chip bad">BOARDED ×' + P.boarders + '</span>';
  if (P.loading && P.cargo < P.cap - 1e-4) chips += '<span class="chip warn">LOADING</span>';
  else if (P.cargo >= P.cap - 1e-4) chips += '<span class="chip good">FULL</span>';
  if (G.combo > 1) chips += '<span class="chip warn">COMBO ×' + G.combo + '</span>';
  if (lastHud.chips !== chips) { lastHud.chips = chips; UI.chips.innerHTML = chips; }
  setText(UI.flares, 'fl', String(P.flares));
  const fc = P.flares <= 0; if (lastHud.fc !== fc) { lastHud.fc = fc; UI.bFlare.classList.toggle('cool', fc); }
  const hcd = P.honkCD > 0; if (lastHud.hcd !== hcd) { lastHud.hcd = hcd; UI.bHonk.classList.toggle('cool', hcd); }
  const hint = G.hint ? G.hint.html : '';
  if (lastHud.hint !== hint) { lastHud.hint = hint; UI.hint.innerHTML = hint; UI.hint.hidden = !hint; }
  const rt = G.radioT > 0 && G.radio ? G.radio : '';
  if (lastHud.radio !== rt) { lastHud.radio = rt; UI.radioText.textContent = rt; UI.radio.hidden = !rt; }
}

/* ---------- ticker + toast ---------- */
function nextHeadline() {
  const dyn = [];
  if (G && !G.attract) dyn.push('Brent at $' + G.price.toFixed(2) + '. Analysts blame "a boat".', 'Head office reminds captain the quota is ' + fmtMoney(G.cfg.quota) + '. No pressure.');
  if (save.st.deliv > 0) dyn.push('M/T Big Crude Energy has delivered ' + save.st.deliv + ' cargoes and honked ' + save.st.honks + ' times.');
  return pick(Math.random() < 0.3 && dyn.length ? dyn : TICKER) + '   ◆   ' + pick(TICKER);
}
UI.ticker.addEventListener('animationiteration', () => { UI.ticker.textContent = nextHeadline(); });
if (REDUCED) setInterval(() => { UI.ticker.textContent = nextHeadline(); }, 9000);
const toastQ = [];
let toastBusy = false;
function showToast(kind, title, desc) {
  toastQ.push([kind, title, desc]);
  if (!toastBusy) runToast();
}
function runToast() {
  const item = toastQ.shift();
  if (!item) { toastBusy = false; UI.toast.hidden = true; return; }
  toastBusy = true;
  const t = UI.toast; t.textContent = '';
  const a = document.createElement('span'); a.className = 't-k'; a.textContent = item[0];
  const b = document.createElement('span'); b.className = 't-n'; b.textContent = item[1];
  const c = document.createElement('span'); c.className = 't-d'; c.textContent = item[2];
  t.append(a, b, c); t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  setTimeout(runToast, 2800);
}

/* ---------- misc ---------- */
async function keepAwake(on) {
  try {
    if (on && navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    else if (!on && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
  } catch (e) { wakeLock = null; }
}
let last = performance.now(), miniT = 0, errCount = 0;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  try {
    if (G) {
      if (G.mode !== 'paused') update(dt);
      render();
      miniT -= dt;
      if (miniT <= 0 && !UI.hud.hidden) { miniT = 0.08; drawMini(); }
      hudTick(dt);
      if ((G.mode === 'won' || G.mode === 'lost') && !portShown && G.endT > (G.mode === 'won' ? 1.7 : 2.6)) showPort();
    }
  } catch (err) { if (errCount++ < 5) console.error(err); }
  requestAnimationFrame(frame);
}
function boot(data) {
  loadSave(data || {});
  Snd.enabled = save.sound; Snd.musicEnabled = save.music;
  syncSoundLabels();
  if (document.fonts && document.fonts.load) for (const f of ['800 16px "Saira Condensed"', '16px "Saira Stencil One"', '500 16px "IBM Plex Mono"', 'italic 500 16px "IBM Plex Serif"']) document.fonts.load(f).catch(() => {});
  buildMap();
  resize();
  showTitle();
  UI.ticker.textContent = nextHeadline();
  requestAnimationFrame(frame);
}
try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save })); } catch (e) { /* viewer hook unavailable */ }
(function start() {
  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});
})();
