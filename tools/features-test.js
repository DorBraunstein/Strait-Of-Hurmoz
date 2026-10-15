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
