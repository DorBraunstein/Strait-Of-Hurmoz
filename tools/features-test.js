// Feature checks for the optional features (developer settings).
// Usage: ./build.sh && node tools/features-test.js [repoDir] [nameFilter]
// Each check runs in a fresh browser context against dist/index.html and fails on any page error.
const path = require('path');
const pw = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();

const dir = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const only = process.argv[3] || '';
const url = 'file://' + path.join(dir, 'dist', 'index.html');
const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ---------------------------------------------------------------------------
check('dev settings: every feature listed, on by default, switches persist', async page => {
  await page.click('#bDev');
  const rows = await page.$$eval('#devList input[type=checkbox]', els => els.map(e => ({ id: e.id, on: e.checked })));
  const n = await page.evaluate(() => FEATURES.length);
  assert(rows.length === n, 'expected ' + n + ' switches, got ' + rows.length);
  assert(rows.every(r => r.on), 'all features should default to on');
  if (n) {
    await page.click('#' + rows[0].id);
    assert(await page.evaluate(id => !feat(id.slice(4)), rows[0].id), 'switch did not turn the feature off');
    await page.reload(); await sleep(400);
    assert(await page.evaluate(id => !feat(id.slice(4)), rows[0].id), 'switch did not persist across reload');
    await page.click('#bDev'); await page.click('#bDevAll');
    assert(await page.evaluate(() => FEATURES.every(f => feat(f.id))), 'ALL ON did not re-enable everything');
    await page.click('#bDevNone');
    assert(await page.evaluate(() => FEATURES.every(f => !feat(f.id))), 'ALL OFF did not disable everything');
  }
  await page.click('#bDevDone');
  assert(await page.evaluate(() => !document.getElementById('sTitle').hidden), 'DONE should return to the title screen');
});

check('all features off: game still plays a level', async page => {
  await page.evaluate(() => setAllFlags(false));
  await page.click('#bPlay'); await sleep(300);
  await page.evaluate(() => { G.P.cargo = G.P.cap; G.P.x = GATES[0].x - 60; G.P.y = GATES[0].y; });
  await sleep(2600);
  assert(await page.evaluate(() => !document.getElementById('sPort').hidden), 'port screen should show after delivering the quota');
});

check('all features on: hazard-heavy level runs without errors', async page => {
  await page.click('#bPlay'); await sleep(200);
  await page.evaluate(() => { startLevel(10); G.P.hull = G.P.maxHull = 99999; });
  await sleep(6000);
  assert(await page.evaluate(() => G.mode === 'play'), 'level should still be running');
});

check('captain: portrait shows in the HUD and reacts to events', async page => {
  await page.click('#bPlay'); await sleep(300);
  assert(await page.evaluate(() => !document.getElementById('captain').hidden), 'portrait should be visible during a level');
  await page.evaluate(() => { G.mines = []; G.missiles = []; emit('pizza'); });
  await sleep(150);
  assert(await page.evaluate(() => CAP.mood === 'chew'), 'pizza should make the captain chew');
  await page.evaluate(() => { spawnBallistic(G.P.x, G.P.y, 0, 130); });
  await sleep(1200);
  assert(await page.evaluate(() => CAP.mood === 'scream'), 'incoming ballistic should make the captain scream');
  await page.evaluate(() => { setFlag('captain', false); startLevel(1); });
  await sleep(200);
  assert(await page.evaluate(() => document.getElementById('captain').hidden), 'portrait should hide when the feature is off');
});

check('events: special order pays extra, ducks fine you', async page => {
  await page.click('#bPlay'); await sleep(200);
  await page.evaluate(() => { startLevel(2); G.mines = []; G.traffic = []; G.cfg.quota = 1e9; });
  const r = await page.evaluate(async () => {
    const g = GATES[0];
    EV.order = { o: ORDERS.find(o => o.id === 'scratch'), g, t: 40, hits0: G.hits, honks0: 0 };
    const P = G.P; P.cargo = 1; const price = G.price;
    P.x = g.x - 60; P.y = g.y; P.vx = P.vy = 0;
    await new Promise(r => setTimeout(r, 250));
    const paid = G.earned, expect = 1 * price * g.mult * 3;
    // ducks right in front of the ship
    P.x = 1200; P.y = 1600; P.vx = P.vy = 0; P.a = 0; G.bonus = 0;
    EV.ducks = [{ x: 1214, y: 1600, a: 0, big: true, t: 0, hit: false, z: 0, spin: 0, vx: 0, vy: 0, life: 0 }];
    await new Promise(r => setTimeout(r, 200));
    return { ratio: paid / expect, bonus: G.bonus, hit: EV.ducks.length === 0 || EV.ducks[0].hit };
  });
  assert(Math.abs(r.ratio - 1) < 0.08, 'NOT A SCRATCH order should pay ×3 (got ratio ' + r.ratio.toFixed(2) + ')');
  assert(r.hit && r.bonus <= -3, 'hitting mother duck should cost $3M (bonus ' + r.bonus + ')');
  await page.evaluate(() => { startLevel(2); EV.orderT = 0.01; EV.duckT = 0.01; });
  await sleep(500);
  assert(await page.evaluate(() => !!EV.order), 'an order should start when its timer runs out');
});

check('skins: badge unlocks a skin, picker selects it, game paints it', async page => {
  assert(await page.evaluate(() => !document.getElementById('tSkins').hidden), 'skin picker should show on the title screen');
  const locked = await page.$$eval('#tSkinRow .skin.locked', els => els.length);
  assert(locked === 7, 'all skins but Classic should start locked (got ' + locked + ')');
  await page.evaluate(() => { save.ach.first = Date.now(); renderSkinPicker(); });
  await page.click('#tSkinRow .skin:nth-child(2)');
  assert(await page.evaluate(() => save.skin === 'pink' && currentSkin() === 'pink'), 'clicking an unlocked skin should select it');
  await page.click('#tSkinRow .skin:nth-child(3)');
  assert(await page.evaluate(() => save.skin === 'pink'), 'locked skins must not be selectable');
  await page.click('#bPlay'); await sleep(200);
  assert(await page.evaluate(() => shipPainter(0, 0, 0, {}) === true), 'skinned ship should be painted by the skin painter');
  await page.evaluate(() => setFlag('skins', false));
  assert(await page.evaluate(() => shipPainter(0, 0, 0, {}) === false), 'feature off should fall back to the classic tanker');
});

check('absurd: lost carrier, seagulls scatter on honk, decoy pulls missiles', async page => {
  await page.click('#bPlay'); await sleep(200);
  const r = await page.evaluate(async () => {
    startLevel(9); G.P.hull = G.P.maxHull = 99999; G.cfg.quota = 1e9;
    const out = { carrier: !!AB.carrier };
    spawnGulls(); out.gulls = AB.gulls.length;
    const P = G.P; for (const g of AB.gulls) { g.x = P.x + rand(-150, 150); g.y = P.y + rand(-150, 150); }
    P.honkCD = 0; honk(); out.fled = AB.gulls.filter(g => g.flee).length;
    AB.decoys = []; spawnDecoy(); out.decoy = AB.decoys.length;
    const d = AB.decoys[0]; G.missiles = [];
    G.missiles.push({ x: d.x + 500, y: d.y, a: Math.PI, v: 300, t: 0, fuel: 9, target: null, lost: false, armed: true, min: 1e9, nm: false, trail: [], dead: false });
    await new Promise(r => setTimeout(r, 300));
    out.targeted = G.missiles.length ? G.missiles[0].target === d : 'gone';
    return out;
  });
  assert(r.carrier, 'level 9 should always have the lost carrier');
  assert(r.gulls >= 20, 'a seagull swarm should have 20+ gulls');
  assert(r.fled === r.gulls, 'honking should scatter every nearby gull (' + r.fled + '/' + r.gulls + ')');
  assert(r.decoy === 1 && (r.targeted === true || r.targeted === 'gone'), 'decoy should attract a nearby missile (' + r.targeted + ')');
  await page.evaluate(() => { setFlag('absurd', false); startLevel(9); });
  assert(await page.evaluate(() => !AB.carrier), 'feature off should not spawn the carrier');
});

check('replay: a near miss is replayed on the results screen', async page => {
  await page.click('#bPlay'); await sleep(200);
  await page.evaluate(async () => {
    startLevel(5); G.cfg.quota = 1e9; G.mines = [];
    const P = G.P;
    G.missiles.push({ x: P.x + 600, y: P.y + 40, a: Math.PI, v: 420, t: 0, fuel: 9, target: null, lost: true, armed: true, min: 1e9, nm: true, trail: [], dead: false });
    await new Promise(r => setTimeout(r, 1300));
    nearMiss(P.x + 30, P.y + 20);
    await new Promise(r => setTimeout(r, 1100));
    winLevel();
  });
  assert(await page.evaluate(() => !!RP.best), 'the near miss should be kept as the best clip');
  await sleep(2600);
  const shown = await page.evaluate(() => !document.getElementById('replayBox').hidden && document.getElementById('replayLine').textContent.startsWith('MISSED BY'));
  assert(shown, 'replay should show on the results screen with a commentator line');
  await sleep(400);
  const drawn = await page.evaluate(() => { const c = document.getElementById('replayCv'); const d = c.getContext('2d').getImageData(c.width / 2, c.height / 2, 1, 1).data; return c.width > 100 && d[3] === 255; });
  assert(drawn, 'replay canvas should be drawn');
});

check('daily: seeded course, rental tanker, score attack, best and streak', async page => {
  assert(await page.evaluate(() => !document.getElementById('bDaily').hidden), 'daily button should show on the title');
  await page.click('#bDaily'); await sleep(300);
  const a = await page.evaluate(() => ({ daily: G.cfg.daily, label: document.getElementById('hLvl').textContent, spd: G.P.maxSpd, mines: G.mines.map(m => Math.round(m.x) + ',' + Math.round(m.y)).join(' ') }));
  assert(a.daily && a.label === 'DAILY', 'daily run should be flagged and labelled');
  assert(a.spd === 385, 'daily should use the fixed rental loadout (engine level 2), got ' + a.spd);
  await page.evaluate(() => restartRun()); await sleep(200);
  const b = await page.evaluate(() => G.mines.map(m => Math.round(m.x) + ',' + Math.round(m.y)).join(' '));
  assert(a.mines === b && a.mines.length > 0, 'every daily attempt should get the same mine field');
  await page.evaluate(() => { G.bonus = 123; G.timeLeft = 0.2; });
  await sleep(2400);
  const r = await page.evaluate(() => ({ port: !document.getElementById('sPort').hidden, title: document.getElementById('pTitle').textContent, best: save.daily.best, streak: save.daily.streak, next: document.getElementById('bNext').textContent }));
  assert(r.port && r.title === 'NEW DAILY BEST', 'time out should end the daily with a result screen (' + r.title + ')');
  assert(r.best >= 123 && r.streak === 1, 'best score and streak should be saved');
  assert(r.next.startsWith('TRY AGAIN'), 'daily result should offer TRY AGAIN');
  await page.click('#bNext'); await sleep(200);
  assert(await page.evaluate(() => G.cfg.daily && G.mode === 'play'), 'TRY AGAIN should restart the daily');
  assert(await page.evaluate(() => save.level === 1), 'the daily must not advance the career level');
});

check('missions: three per level, progress, rewards, remembered', async page => {
  await page.click('#bPlay'); await sleep(300);
  const m = await page.evaluate(() => ({ n: MS.list.length, ids: MS.list.map(x => x.def.id), hud: document.querySelectorAll('#hMissions .ms').length }));
  assert(m.n === 3 && m.hud === 3, 'level 1 should have 3 missions in the HUD');
  assert(m.ids.includes('honk'), 'level 1 should include the honk mission');
  const r = await page.evaluate(async () => {
    G.cfg.quota = 1e9; const b0 = G.bonus;
    for (let i = 0; i < 3; i++) { G.P.honkCD = 0; honk(); }
    await new Promise(r => setTimeout(r, 150));
    const honkM = MS.list.find(x => x.def.id === 'honk');
    return { done: honkM.done, bonus: G.bonus - b0, text: document.getElementById('hMissions').textContent };
  });
  assert(r.done && r.bonus >= 8, 'honking 3 times should complete the mission and pay (bonus ' + r.bonus + ')');
  await page.evaluate(() => { G.cfg.quota = 0.001; G.P.cargo = 0.5; G.P.x = MS.list.find(x => x.def.id === 'gate').gate.x - 40; G.P.y = MS.list.find(x => x.def.id === 'gate').gate.y; });
  await sleep(2600);
  const p = await page.evaluate(() => ({ port: !document.getElementById('pMissions').hidden, rows: document.querySelectorAll('#pMissions .pm').length, saved: JSON.stringify(save.ms[1]) }));
  assert(p.port && p.rows === 3, 'the result screen should list the 3 missions');
  assert(p.saved.startsWith('[') && p.saved.split('true').length >= 3, 'completed missions should be remembered (' + p.saved + ')');
  await page.evaluate(() => startDaily()); await sleep(200);
  assert(await page.evaluate(() => document.getElementById('hMissions').hidden), 'missions should not run in the Daily Strait');
});

check('legend: full meter doubles pay for 10 seconds', async page => {
  await page.click('#bPlay'); await sleep(300);
  assert(await page.evaluate(() => !document.getElementById('hLegendRow').hidden), 'legend bar should show in the HUD');
  const r = await page.evaluate(async () => {
    G.cfg.quota = 1e9; G.mines = [];
    for (let i = 0; i < 10; i++) lgAdd(12);
    const on = LG.t > 0 && G.payMult === 2 && document.getElementById('hLegendRow').classList.contains('on');
    const g = GATES[0], P = G.P; P.cargo = 1; const price = G.price;
    P.x = g.x - 60; P.y = g.y; P.vx = P.vy = 0;
    await new Promise(r => setTimeout(r, 250));
    const ratio = G.earned / (price * g.mult * 2);
    LG.t = 0.05; await new Promise(r => setTimeout(r, 200));
    return { on, ratio, after: G.payMult };
  });
  assert(r.on, 'a full meter should switch Legend mode on');
  assert(Math.abs(r.ratio - 1) < 0.1, 'deliveries should pay double in Legend mode (ratio ' + r.ratio.toFixed(2) + ')');
  assert(r.after === 1, 'pay should return to normal after Legend mode');
});

// ---------------------------------------------------------------------------
(async () => {
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let failed = 0;
  for (const c of checks) {
    if (only && !c.name.includes(only)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    try {
      await page.goto(url); await sleep(500);
      await c.fn(page);
      if (errs.length) throw new Error('page errors: ' + errs.join(' | '));
      console.log('PASS', c.name);
    } catch (e) { failed++; console.log('FAIL', c.name, '\n    ', e.message); }
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? failed + ' check(s) failed' : 'all checks passed');
  process.exit(failed ? 1 : 0);
})();
