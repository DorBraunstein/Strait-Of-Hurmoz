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
