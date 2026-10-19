// Drives dist/dash.html in headless Chromium: plays the loop (load, sell, escort, caught) and prints any errors.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const dir = process.argv[2], shots = process.argv[3];
  const browser = await chromium.launch();
  const out = {};
  for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + dir + '/dist/dash.html');
    await page.waitForTimeout(900);
    if (shots) await page.screenshot({ path: shots + '/' + name + '-title.png' });
    await page.click('#bPlay');
    await page.waitForTimeout(1800);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowRight');
    const r = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const res = { moved: Math.round(G.p.x) };
      // load at the first site
      const s = G.sites[0]; G.p.x = s.x; G.p.y = s.y; G.p.inv = 5; await wait(200); res.cargo = G.p.cargo;
      // sell on the open sea
      G.p.x = SPOTS.export[0] - 100; G.p.y = SPOTS.export[1]; await wait(200); res.delivered = G.delivered; res.score = G.score;
      // escort and ram a boat
      spawnPower(); G.p.x = G.power.x; G.p.y = G.power.y; await wait(200); res.fright = G.fright > 0;
      const b = G.boats[0]; b.wait = 0; b.x = G.p.x + 10; b.y = G.p.y; await wait(200); res.eaten = b.dead > 0;
      // caught when the escort ends
      G.fright = 0.01; await wait(100); G.p.inv = 0; const b2 = G.boats[1]; b2.wait = 0; b2.dead = 0; b2.x = G.p.x; b2.y = G.p.y; await wait(150); res.died = G.state;
      await wait(2200); res.lives = G.lives;
      // boats find their way around the coast
      res.boatPos = G.boats.map(b => Math.round(b.x) + ',' + Math.round(b.y) + (isLand(b.x, b.y) ? ' LAND' : ''));
      return res;
    });
    await page.waitForTimeout(2500);
    if (shots) await page.screenshot({ path: shots + '/' + name + '-play.png' });
    // level clear + game over paths
    const r2 = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      G.delivered = G.need - 1; G.p.cargo = 'gas'; G.p.x = SPOTS.export[0] - 100; G.p.y = SPOTS.export[1]; await wait(200);
      const st = G.state; await wait(2800);
      const lvl = G.level, boats = G.boats.length, mines = G.mines.length;
      G.level = 4; startLevel(); await wait(1600);
      const mines4 = G.mines.length;
      G.lives = 1; G.p.inv = 0; G.state = 'play'; die(); await wait(2200);
      return { clear: st, level: lvl, boats, mines, mines4, over: !document.getElementById('sOver').hidden };
    });
    out[name] = { ...r, ...r2, errs };
    await page.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
