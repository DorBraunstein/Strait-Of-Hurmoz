
/* =========================================================
   FEATURE: MISSIONS — three optional goals per level
   ========================================================= */
feature({ id: 'missions', group: 'ADDICTIVE', name: 'Missions', desc: 'Three optional goals per level with cash rewards, tracked in the HUD and remembered between attempts.' });

const MISSION_POOL = [
  { id: 'honk', text: n => 'Honk ' + n + ' times', n: r => 3 + Math.floor(r() * 4), ok: () => true },
  { id: 'gate', text: (n, g) => 'Deliver to ' + g.name, n: () => 1, ok: () => true },
  { id: 'noflare', text: () => 'Win without firing a flare', end: true, ok: c => c.cruise || c.drone },
  { id: 'pizza', text: () => 'Catch a pizza drone', n: () => 1, ok: c => c.pizza },
  { id: 'combo', text: n => 'Pull off a ×' + n + ' close-call combo', n: r => 2 + Math.floor(r() * 2), ok: c => c.drone || c.cruise || c.ball || c.torp },
  { id: 'shake', text: () => 'Shake off a boarding party', n: () => 1, ok: c => c.boat },
  { id: 'hot', text: () => 'Deliver a HOT contract', n: () => 1, ok: () => true },
  { id: 'hull', text: () => 'Win with the hull above 70%', end: true, ok: () => true },
  { id: 'crates', text: n => 'Grab ' + n + ' crates', n: r => 2 + Math.floor(r() * 2), ok: () => true },
  { id: 'full', text: n => 'Deliver ' + n + ' full tanks', n: () => 2, ok: c => c.quota >= 150 },
  { id: 'fast', text: n => 'Win with ' + n + '+ seconds left', end: true, n: () => 30, ok: () => true },
  { id: 'noground', text: () => 'Never run aground', end: true, ok: () => true },
  { id: 'chain', text: () => 'Chain-detonate a mine', n: () => 1, ok: c => c.mines >= 8 && (c.drone || c.cruise || c.ball) },
  { id: 'ff', text: () => 'Get a friendly-fire hit', n: () => 1, ok: c => (c.cruise || c.drone) && (c.boat || c.swarm || c.drone) }
];
const MS = { list: [], level: 0, flares: 0, aground: false, dirty: true };
const msOn = () => G && !G.attract && feat('missions') && !G.cfg.daily;
const msReward = () => 6 + G.level * 2;

function missionsFor(level, cfg) {
  const r = mulberry(level * 977 + 13);
  let pool = MISSION_POOL.filter(m => m.ok(cfg));
  if (level === 1) pool = MISSION_POOL.filter(m => m.id === 'honk' || m.id === 'gate' || m.id === 'noground');
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const pickd = [];
  for (const m of pool) { if (pickd.length < 3 && (!m.end || pickd.filter(p => p.end).length < 2)) pickd.push(m); }
  return pickd.map(def => {
    const n = def.n ? (level === 1 && def.id === 'honk' ? 3 : def.n(r)) : 1;
    const gate = def.id === 'gate' ? GATES[Math.floor(r() * GATES.length)] : null;
    return { def, n, gate, text: def.text(n, gate), prog: 0, done: false, failed: false, now: false };
  });
}
onEvt('levelStart', () => {
  MS.list = []; MS.flares = 0; MS.aground = false; MS.dirty = true;
  const box = $('hMissions');
  if (!msOn()) { box.hidden = true; return; }
  MS.level = G.level;
  MS.list = missionsFor(G.level, G.cfg);
  const before = (save.ms && save.ms[G.level]) || [];
  MS.list.forEach((m, i) => { m.before = !!before[i]; });
  box.hidden = false;
  renderMissionsHud();
});
function msProgress(id, amount, test) {
  if (!msOn() || G.mode !== 'play') return;
  for (const m of MS.list) {
    if (m.def.id !== id || m.done || m.failed || m.def.end) continue;
    if (test && !test(m)) continue;
    m.prog = Math.min(m.n, m.prog + amount);
    MS.dirty = true;
    if (m.prog >= m.n) completeMission(m);
  }
}
function completeMission(m) {
  m.done = true; m.now = true; MS.dirty = true;
  const P = G.P, v = msReward();
  G.bonus += v;
  popup(P.x, P.y - 84, 'MISSION ✓ ' + m.text.toUpperCase() + ' +' + fmtMoney(v), '#1F7A50', 20);
  say('MISSION COMPLETE', m.text.toUpperCase(), '#1F7A50', 1.6);
  Snd.achieve();
  checkQuota();
}
onEvt('honk', () => msProgress('honk', 1));
onEvt('pizza', () => msProgress('pizza', 1));
onEvt('shaken', () => msProgress('shake', 1));
onEvt('crate', () => msProgress('crates', 1));
onEvt('chain', () => msProgress('chain', 1));
onEvt('ff', () => msProgress('ff', 1));
onEvt('nearMiss', () => {
  if (!msOn() || G.mode !== 'play') return;
  for (const m of MS.list) if (m.def.id === 'combo' && !m.done) { m.prog = Math.min(m.n, Math.max(m.prog, G.combo)); MS.dirty = true; if (G.combo >= m.n) completeMission(m); }
});
onEvt('deliver', (g, val, info) => {
  msProgress('gate', 1, m => m.gate === g);
  if (info.hot) msProgress('hot', 1);
  if (info.full) msProgress('full', 1);
});
onEvt('flare', () => { MS.flares++; for (const m of MS.list) if (m.def.id === 'noflare' && !m.failed) { m.failed = true; MS.dirty = true; } });
onEvt('aground', () => { MS.aground = true; for (const m of MS.list) if (m.def.id === 'noground' && !m.failed) { m.failed = true; MS.dirty = true; } });
onEvt('levelEnd', r => {
  if (!msOn() || !MS.list.length) return;
  let endCash = 0;
  if (r.win) {
    const P = G.P;
    for (const m of MS.list) {
      if (!m.def.end || m.done || m.failed) continue;
      const id = m.def.id;
      const ok = id === 'noflare' ? MS.flares === 0 : id === 'hull' ? P.hull / P.maxHull > 0.7 : id === 'fast' ? G.timeLeft >= m.n : id === 'noground' ? !MS.aground : false;
      if (ok) { m.done = true; m.now = true; endCash += msReward(); }
      else m.failed = true;
    }
    if (endCash) { r.sum += endCash; r.missionCash = endCash; save.cash += endCash; save.earned += endCash; }
  }
  save.ms = save.ms || {};
  const rec = save.ms[MS.level] || [];
  MS.list.forEach((m, i) => { rec[i] = !!(rec[i] || m.done); });
  save.ms[MS.level] = rec;
  persist();
  MS.dirty = true; renderMissionsHud();
});

/* ---------- HUD + port ---------- */
onEvt('update', () => { if (MS.dirty && msOn()) renderMissionsHud(); });
function renderMissionsHud() {
  MS.dirty = false;
  const box = $('hMissions');
  if (box.hidden) return;
  box.textContent = '';
  const sum = document.createElement('div'); sum.className = 'ms-sum';
  sum.textContent = 'MISSIONS ' + MS.list.filter(m => m.done).length + '/' + MS.list.length;
  box.append(sum);
  for (const m of MS.list) {
    const row = document.createElement('div'); row.className = 'ms' + (m.done ? ' done' : m.failed ? ' fail' : '');
    const box2 = document.createElement('i'); box2.setAttribute('aria-hidden', 'true');
    const t = document.createElement('span'); t.textContent = m.text;
    row.append(box2, t);
    if (!m.done && !m.failed && m.n > 1) { const b = document.createElement('b'); b.textContent = m.prog + '/' + m.n; row.append(b); }
    box.append(row);
  }
}
onEvt('portLedger', (row, r) => { if (msOn() && r.missionCash) row('End-of-level missions', fmtMoney(r.missionCash)); });
onEvt('port', r => {
  const box = $('pMissions');
  box.hidden = !(msOn() && MS.list.length);
  if (box.hidden) return;
  box.textContent = '';
  const h = document.createElement('h3'); h.className = 'sec'; h.textContent = 'MISSIONS · LEVEL ' + MS.level; box.append(h);
  for (const m of MS.list) {
    const row = document.createElement('div'); row.className = 'pm' + (m.done ? ' done' : m.before ? ' before' : '');
    const mark = document.createElement('b'); mark.textContent = m.done ? '✓' : m.before ? '✓' : '✗';
    const t = document.createElement('span'); t.textContent = m.text;
    const st = document.createElement('i'); st.textContent = m.now ? 'DONE +' + fmtMoney(msReward()) : m.before ? 'DONE BEFORE' : 'NOT YET';
    row.append(mark, t, st); box.append(row);
  }
});
onEvt('title', () => {
  if (!feat('missions') || !save.ms) return;
  let n = 0; for (const k in save.ms) for (const v of save.ms[k]) if (v) n++;
  if (!n) return;
  const s = document.createElement('span'); s.append('MISSIONS '); const b = document.createElement('b'); b.textContent = String(n); s.append(b);
  $('tBests').append(s);
});
