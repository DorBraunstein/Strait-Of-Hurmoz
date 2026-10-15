
/* =========================================================
   FEATURE: DAILY STRAIT — one seeded score-attack run per day, same course for everyone
   ========================================================= */
feature({ id: 'daily', group: 'ADDICTIVE', name: 'Daily Strait', desc: 'One 90-second score-attack run per day with a daily twist, the same course for everyone, a rental tanker, a best score and a day streak.' });

const DAILY_TWISTS = [
  { id: 'night', name: 'Night shift', tip: 'No moon tonight, plenty of missiles.', apply: c => { c.night = true; } },
  { id: 'fog', name: 'Pea-soup fog', tip: 'Visibility is one tanker length. Trust the magenta line.', apply: c => { c.fog = true; } },
  { id: 'swarm', name: 'Drone wedding', tip: 'The drones are celebrating. Loudly.', apply: c => { c.swarm = 9; c.drone = 2.6; } },
  { id: 'mines', name: 'Mine buffet', tip: 'All-you-can-avoid sea mines.', apply: c => { c.mines = 34; c.drift = 3; } },
  { id: 'rain', name: 'Ballistic drizzle', tip: 'Forecast: a 100% chance of red circles.', apply: c => { c.ball = 2.2; c.barrage = true; } },
  { id: 'pizza', name: 'Pizza party', tip: 'Pizza drones everywhere, and extra missiles to work up an appetite.', apply: c => { c.pizzaRate = 0.35; c.cruise = 3.8; } },
  { id: 'traffic', name: 'Gridlock', tip: 'Every tanker on Earth is here today.', apply: c => { c.traffic = 18; } },
  { id: 'subs', name: 'Submarine Sunday', tip: 'Periscopes up. Watch the dashed lines.', apply: c => { c.torp = 3; } },
  { id: 'boats', name: 'Boarding bonanza', tip: 'Speedboats galore. Keep the horn warm.', apply: c => { c.boat = 3.5; c.maxBoats = 5; } }
];
const DAILY_HEADLINES = ['Daily captain sets the Strait on fire, metaphorically', 'Locals report "the same tanker as yesterday, but angrier"', 'Rental tanker returned with 4 new dents and a smile', 'Captain clocks out, clocks back in, clocks out again'];
const DAILY_LOADOUT = { engine: 2, rudder: 2, hull: 2, tank: 2, pump: 2, flare: 2, ciws: 1, bubble: 1 };

function dailyKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function dailyTwist(key) { const r = mulberry(hashStr('twist-' + key)); return DAILY_TWISTS[Math.floor(r() * DAILY_TWISTS.length)]; }
function dailyDate(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(); }
function dailyState() { return save.daily || (save.daily = { key: '', best: 0, streak: 0, last: '' }); }
function dailyCfg(key) {
  const tw = dailyTwist(key), c = levelCfg(8), d = dailyState();
  Object.assign(c, {
    name: tw.name.toUpperCase(), label: 'DAILY', tip: '<b>Daily Strait · ' + tw.name + '.</b> ' + tw.tip + ' Earn as much as you can in 90 seconds.',
    quota: Infinity, time: 90, scoreAttack: true, daily: true, dailyKey: key, twist: tw.id,
    mines: 12, drift: 0, boat: 8, maxBoats: 3, drone: 4, cruise: 5.5, ball: 5, swarm: 0, torp: 0, traffic: 7,
    pizza: true, barrage: false, night: false, fog: false, price: 95, threat: 1.3, best: d.key === key ? d.best : 0
  });
  tw.apply(c);
  return c;
}
function startDaily() {
  const key = dailyKey();
  startLevel(8, { cfg: dailyCfg(key), seed: hashStr('setup-' + key), loadout: DAILY_LOADOUT });
}
function dailyEnd(completed, reason) {
  const key = G.cfg.dailyKey, d = dailyState(), score = Math.round(total() * 10) / 10;
  const yesterday = dailyKey(new Date(Date.now() - 86400000));
  if (d.last !== key) { d.streak = d.last === yesterday ? d.streak + 1 : 1; d.last = key; }
  if (d.key !== key) { d.key = key; d.best = 0; }
  const prevBest = d.best;
  d.best = Math.max(d.best, score);
  const reward = Math.round(Math.max(0, score) * 0.25 * 10) / 10;
  save.cash += reward; save.earned += reward;
  persist();
  G.result = { win: completed, daily: true, reason, score, best: d.best, prevBest, newBest: score > prevBest, streak: d.streak, reward, sum: reward, stars: 0, headline: completed ? pick(DAILY_HEADLINES) : pick(HEADLINES.sunk) };
}
function untilTomorrow() {
  const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), m = Math.max(1, Math.round((next - now) / 60000));
  return Math.floor(m / 60) + 'H ' + String(m % 60).padStart(2, '0') + 'M';
}
function showDailyPort() {
  const r = G.result, c = G.cfg;
  UI.hud.hidden = true;
  $('pEyebrow').textContent = 'DAILY STRAIT · ' + dailyDate(c.dailyKey) + ' · ' + c.name;
  const title = $('pTitle');
  title.textContent = r.newBest ? 'NEW DAILY BEST' : r.reason === 'sunk' ? 'SUNK' : 'TIME!';
  title.className = 'port-title' + (r.reason === 'sunk' && !r.newBest ? ' bad' : '');
  $('pStars').innerHTML = ''; $('pStars').setAttribute('aria-label', 'Daily run');
  $('pHeadline').textContent = r.headline;
  $('pMeta').textContent = 'SAME COURSE FOR EVERYONE TODAY';
  $('pPremium').textContent = 'NEXT DAILY IN ' + untilTomorrow();
  const L = $('pLedger'); L.textContent = '';
  const row = (k, v, cls) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; if (cls) { dt.className = cls; dd.className = cls; } L.append(dt, dd); };
  row('Score (' + G.deliveries + (G.deliveries === 1 ? ' cargo' : ' cargoes') + ', bonuses included)', fmtMoney(r.score));
  row("Today's best", fmtMoney(r.best));
  row('Day streak', r.streak + (r.streak === 1 ? ' day' : ' days'));
  emit('portLedger', row, r);
  row('Career cash reward (25%)', fmtMoney(r.reward), 'tot');
  renderUpgrades();
  const nb = $('bNext'); nb.innerHTML = ''; nb.append('TRY AGAIN '); const kb = document.createElement('kbd'); kb.textContent = 'ENTER'; nb.append(kb);
  emit('port', r);
  UI.sPort.hidden = false; UI.sPort.scrollTop = 0;
  keepAwake(false);
  setTimeout(() => { try { nb.focus({ preventScroll: true }); } catch (e) { /* optional */ } }, 40);
}
function renderDailyTitle() {
  const b = $('bDaily'), line = $('tDaily'), on = feat('daily');
  b.hidden = !on; line.hidden = !on;
  if (!on) return;
  const key = dailyKey(), tw = dailyTwist(key), d = dailyState(), played = d.key === key;
  b.textContent = 'DAILY STRAIT · ' + dailyDate(key);
  line.textContent = '';
  line.append("Today's twist: ");
  const tb = document.createElement('b'); tb.textContent = tw.name; line.append(tb);
  line.append(played ? ' · Your best today: ' + fmtMoney(d.best) : ' · Not played yet today');
  const alive = d.last === key || d.last === dailyKey(new Date(Date.now() - 86400000));
  if (d.streak > 0 && alive) { const s = document.createElement('span'); s.className = 'streak'; s.textContent = ' · Streak: ' + d.streak + (d.streak === 1 ? ' day' : ' days'); line.append(s); }
}
$('bDaily').addEventListener('click', () => { Snd.init(); startDaily(); });
onEvt('title', renderDailyTitle);
