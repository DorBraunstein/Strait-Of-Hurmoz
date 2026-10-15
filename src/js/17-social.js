
/* =========================================================
   FEATURE: GHOST RUNS + SHARED LEADERBOARD
   Ghosts live in this browser. The leaderboard uses the artifact's shared
   database when the game runs on claude.ai; elsewhere it shows local scores.
   ========================================================= */
feature({ id: 'social', group: 'ADDICTIVE', name: 'Leaderboard and ghost ships', desc: 'Race a ghost of your best run on every level (with an ahead/behind readout) and compare scores on a shared leaderboard for the Daily Strait and career earnings.' });

const GH_KEY = 'strait-outta-hormuz-ghosts-v1';
const SO = { rec: [], recT: 0, ghost: null, db: null, user: null, uid: null, ready: false, writable: null, boards: { daily: null, career: null }, unsub: [], chain: Promise.resolve(), last: '', tab: 'daily' };
let GHOSTS = {};
try { GHOSTS = JSON.parse(localStorage.getItem(GH_KEY) || '{}') || {}; } catch (e) { GHOSTS = {}; }
const soOn = () => G && !G.attract && feat('social');
const ghostKey = () => G.cfg.daily ? 'D' + G.cfg.dailyKey : 'L' + G.level;
const CALLSIGN_A = ['Barnacle', 'Crude', 'Sandbar', 'Wobbles', 'Ballast', 'Seagull', 'Kraken', 'Mayday', 'Bilge', 'Rudder', 'Anchovy', 'Driftwood'];

function callsign() {
  if (!save.callsign) { save.callsign = 'Captain ' + pick(CALLSIGN_A) + ' ' + randi(10, 99); persist(); }
  return save.callsign;
}

/* ---------- ghosts ---------- */
onEvt('levelStart', () => {
  SO.rec = []; SO.recT = 0; SO.ghost = null;
  if (soOn()) SO.ghost = GHOSTS[ghostKey()] || null;
});
onEvt('update', dt => {
  if (!soOn() || G.mode !== 'play') return;
  SO.recT -= dt;
  if (SO.recT <= 0) { SO.recT = 0.2; const P = G.P; SO.rec.push(Math.round(P.x), Math.round(P.y), Math.round(P.a * 100), Math.round(total() * 10)); }
});
onEvt('levelEnd', r => {
  if (!soOn() || SO.rec.length < 20) return;
  const key = ghostKey(), old = GHOSTS[key];
  const better = G.cfg.daily ? r.newBest : (r.win && (!old || G.t < old.t));
  if (!better) return;
  GHOSTS[key] = { t: Math.round(G.t * 10) / 10, score: Math.round(total() * 10) / 10, pts: SO.rec, n: Date.now() };
  for (const k of Object.keys(GHOSTS)) if (k[0] === 'D' && k !== key) delete GHOSTS[k];
  const keys = Object.keys(GHOSTS).sort((a, b) => GHOSTS[a].n - GHOSTS[b].n);
  while (keys.length > 24) delete GHOSTS[keys.shift()];
  try { localStorage.setItem(GH_KEY, JSON.stringify(GHOSTS)); } catch (e) { /* storage full or blocked: ghost lasts for this visit */ }
  r.newGhost = true;
});
function ghostAt(t) {
  const g = SO.ghost, n = g.pts.length / 4, f = clamp(t / 0.2, 0, n - 1), i = Math.floor(f), j = Math.min(n - 1, i + 1), u = f - i, p = g.pts;
  const a0 = p[i * 4 + 2] / 100, a1 = p[j * 4 + 2] / 100;
  return { x: lerp(p[i * 4], p[j * 4], u), y: lerp(p[i * 4 + 1], p[j * 4 + 1], u), a: a0 + angDiff(a0, a1) * u, money: lerp(p[i * 4 + 3], p[j * 4 + 3], u) / 10, done: f >= n - 1 };
}
onEvt('drawSea', V => {
  if (!soOn() || !SO.ghost || !SO.ghost.pts || SO.ghost.pts.length < 8) return;
  const s = ghostAt(G.t);
  if (!inView(V, s.x, s.y, 80)) return;
  ctx.save(); ctx.globalAlpha = 0.36;
  paintPlayerShip(s.x, s.y, s.a, { cargo: 0.5, deck: '#A5432F' });
  ctx.restore();
  const fs = Math.max(11, px(10)); setFont(800, fs, FONT_UI); ctx.textAlign = 'center'; ctx.lineWidth = px(3); ctx.strokeStyle = C.paper; ctx.fillStyle = C.ink2;
  spacedText(s.done ? 'GHOST · FINISHED' : G.cfg.daily ? "GHOST · TODAY'S BEST" : 'GHOST · BEST RUN ' + fmtTime(SO.ghost.t), s.x, s.y - 30, 1, true);
});
onEvt('chips', list => {
  if (!soOn() || !SO.ghost || G.mode !== 'play' || !SO.ghost.pts) return;
  const d = total() - ghostAt(G.t).money;
  list.push('<span class="chip ' + (d >= 0 ? 'good' : 'bad') + '">' + (d >= 0 ? 'AHEAD +' : 'BEHIND −') + fmtMoney(Math.abs(d)) + '</span>');
});

/* ---------- shared leaderboard ---------- */
async function socialInit() {
  if (!feat('social') || !window.claude || typeof window.claude.use !== 'function') return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    Object.assign(SO, { db, user, uid, ready: true });
    const can = await user.can('data.write');
    if (can === false) SO.writable = false;
    subscribeBoards();
    pushScore();
    renderBoard();
  } catch (e) { console.warn('Shared leaderboard unavailable:', e && (e.code || e.message)); }
}
onEvt('boot', () => { socialInit(); });
function subscribeBoards() {
  SO.unsub.forEach(u => { try { u(); } catch (e) { /* already closed */ } });
  SO.unsub = [];
  const rows = s => s.docs.map(d => Object.assign({ id: d.id }, d.data()));
  const fail = e => { console.warn('Leaderboard subscription ended:', e && e.code); };
  SO.unsub.push(SO.db.collection('scores').orderBy('earned', 'desc').limit(25).onSnapshot(s => { SO.boards.career = rows(s); renderBoard(); }, fail));
  SO.unsub.push(SO.db.collection('scores').where('dailyKey', '==', dailyKey()).orderBy('dailyScore', 'desc').limit(25).onSnapshot(s => { SO.boards.daily = rows(s); renderBoard(); }, fail));
}
function pushScore() {
  if (!SO.ready || SO.writable === false || !feat('social')) return;
  const d = save.daily || {};
  const body = { callsign: callsign(), earned: Math.round(save.earned * 10) / 10, bestLevel: save.best || 0, dailyKey: d.key || '', dailyScore: d.key ? d.best : 0, updated: Date.now() };
  const sig = JSON.stringify([body.callsign, body.earned, body.bestLevel, body.dailyKey, body.dailyScore]);
  if (sig === SO.last) return;
  SO.last = sig;
  SO.chain = SO.chain.then(() => SO.db.doc('scores/' + SO.uid).set(body)).catch(e => {
    if (e && e.code === 'invalid_argument') { SO.writable = false; renderBoard(); }
    else SO.last = '';
  });
}
onEvt('levelEnd', () => setTimeout(pushScore, 60));
function boardRows(tab) {
  if (SO.ready) return (tab === 'daily' ? SO.boards.daily : SO.boards.career) || [];
  const d = save.daily || {};
  if (tab === 'daily') return d.key === dailyKey() && d.best ? [{ id: 'me', callsign: callsign(), dailyScore: d.best }] : [];
  return save.earned ? [{ id: 'me', callsign: callsign(), earned: save.earned, bestLevel: save.best }] : [];
}
function renderBoard() {
  const scr = $('sBoard');
  if (scr.hidden) return;
  const tab = SO.tab, list = $('boardList');
  $('tabDaily').setAttribute('aria-selected', tab === 'daily' ? 'true' : 'false');
  $('tabCareer').setAttribute('aria-selected', tab === 'career' ? 'true' : 'false');
  $('boardStatus').textContent = SO.ready ? (SO.writable === false ? 'SHARED · VIEW ONLY' : 'SHARED SCORES') : 'THIS BROWSER ONLY';
  $('boardNote').textContent = !SO.ready ? 'Shared scores appear when this game is played on claude.ai. Until then this list shows your own best runs.'
    : SO.writable === false ? 'Your access to this game is view-only, so your runs are not posted here.' : 'Everyone who plays this game on claude.ai shares this board.';
  list.textContent = '';
  const rows = boardRows(tab);
  if (!rows.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = tab === 'daily' ? 'No Daily Strait runs yet today. Be the first.' : 'No careers yet. Go earn something.'; list.append(li); return; }
  rows.forEach((r, i) => {
    const li = document.createElement('li'); li.className = (r.id === SO.uid || r.id === 'me') ? 'me' : '';
    const rk = document.createElement('b'); rk.textContent = '#' + (i + 1);
    const nm = document.createElement('span'); nm.textContent = String(r.callsign || 'Captain').slice(0, 24) + ((r.id === SO.uid || r.id === 'me') ? ' (you)' : '');
    const v = document.createElement('i'); v.textContent = tab === 'daily' ? fmtMoney(+r.dailyScore || 0) : fmtMoney(+r.earned || 0) + ' · best L' + (+r.bestLevel || 0);
    li.append(rk, nm, v); list.append(li);
  });
}
function openBoard(tab) {
  hideScreens();
  SO.tab = tab || SO.tab;
  $('callsignInput').value = callsign();
  $('sBoard').hidden = false;
  renderBoard();
  setTimeout(() => { try { $('bBoardDone').focus({ preventScroll: true }); } catch (e) { /* optional */ } }, 30);
}
function closeBoard() { $('sBoard').hidden = true; showTitle(); }
$('bBoard').addEventListener('click', () => { Snd.init(); openBoard(); });
$('bBoardDone').addEventListener('click', closeBoard);
$('tabDaily').addEventListener('click', () => { SO.tab = 'daily'; renderBoard(); });
$('tabCareer').addEventListener('click', () => { SO.tab = 'career'; renderBoard(); });
$('callsignInput').addEventListener('change', e => {
  const v = e.target.value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
  save.callsign = v || save.callsign; e.target.value = save.callsign; persist(); pushScore(); renderBoard();
});
onEvt('title', () => { $('bBoard').hidden = !feat('social'); });
onEvt('portLedger', (row, r) => {
  if (!soOn()) return;
  if (r.newGhost) row(G.cfg.daily ? 'Ghost saved' : 'New best time, ghost saved', G.cfg.daily ? 'today' : fmtTime(G.t));
  if (G.cfg.daily && SO.ready && SO.boards.daily) {
    const i = SO.boards.daily.findIndex(x => x.id === SO.uid);
    if (i >= 0) row("Today's shared rank", '#' + (i + 1) + ' of ' + SO.boards.daily.length);
  }
});
