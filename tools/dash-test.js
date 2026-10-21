// Drives dist/dash.html in headless Chromium: controls, loading, selling, each threat, sinking, game over.
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
    const t0 = Date.now();
    await page.goto('file://' + dir + '/dist/dash.html');
    await page.waitForFunction(() => typeof G !== 'undefined' && G && G.attract, null, { timeout: 60000 });
    const bootMs = Date.now() - t0;
    await page.waitForTimeout(800);
    if (shots) await page.screenshot({ path: shots + '/' + name + '-title.png' });
    await page.click('#bPlay');
    await page.waitForTimeout(1500);
    // controls
    const snap = () => page.evaluate(() => ({ v: Math.round(G.p.v), gear: document.getElementById('hGear').textContent }));
    const ctl = {};
    await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); ctl.w = await snap(); await page.keyboard.up('KeyW');
    await page.waitForTimeout(800); ctl.coast = await snap();
    await page.keyboard.down('KeyS'); await page.waitForTimeout(2200); ctl.reverse = await snap(); await page.keyboard.up('KeyS');
    if (shots) await page.screenshot({ path: shots + '/' + name + '-start.png' });
    const r = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const res = { terminals: SPOTS.terminals.map(t => t.short + ' ' + fmtM(t.pay) + (isLand(t.x, t.y) ? ' ON LAND' : '') + (t.anchor || t.offshore ? '' : ' NO ANCHOR')) };
      // load at Ras Tanura
      const t = SPOTS.terminals[2]; G.p.x = t.x; G.p.y = t.y; G.p.v = 0; G.p.inv = 99; await wait(3000); res.cargo = G.p.cargo && G.p.cargo.kind;
      // sell
      G.p.x = SELL_X + 200; G.p.y = P(0, 24.5)[1]; await wait(300); res.cash = G.cash; res.sold = G.sold;
      // each threat near the strait
      const [sx, sy] = SPOTS.strait; G.p.x = sx; G.p.y = sy + 150; G.p.a = 0; G.p.v = 0; G.p.inv = 0; G.p.hull = 100;
      res.launched = ['cruise', 'drone', 'ball'].map(k => k + ':' + launch(k));
      await wait(200); res.threats = G.threats.map(m => m.k);
      await wait(7000); res.hullAfterSitting = Math.round(G.p.hull);
      return res;
    });
    await page.waitForTimeout(300);
    if (shots) await page.screenshot({ path: shots + '/' + name + '-play.png' });
    // dodge a cruise missile by turning hard at full speed
    const dodge = {};
    for (const how of ['KeyA', 'KeyD', 'KeyS', 'none']) dodge[how] = await page.evaluate(async how => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      let dodged = 0, hit = 0, lastLost = false; const why = [];
      for (let n = 0; n < 4; n++) { lastLost = false;
        G.threats = []; G.state = 'play';
        [G.p.x, G.p.y] = P(53.9, 25.55); G.p.a = 0; G.p.v = 650; G.p.hull = 100; G.p.inv = 0; G.dirT = 999;
        const s = SPOTS.sites.find(q => q.n === 'Kish');
        const tti = Math.hypot(G.p.x - s.x, G.p.y - s.y) / 780, ix = G.p.x + 650 * tti, iy = G.p.y;
        G.threats.push({ k: 'cruise', x: s.x, y: s.y, a: Math.atan2(iy - s.y, ix - s.x), v: 420, t: 0, fuel: 8, lost: false, trail: [], trailT: 0, site: s.n });
        let turned = false;
        for (let i = 0; i < 100; i++) {
          await wait(50);
          const m = G.threats[0]; if (!m) break; lastLost = m.lost;
          if (how !== 'KeyS') G.p.v = Math.max(G.p.v, how === 'none' ? 650 : 0);
          if (!turned && Math.hypot(m.x - G.p.x, m.y - G.p.y) < 1100) { turned = true; if (how !== 'none') Input.keys[how] = true; }
        }
        Input.keys[how] = false;
        if (G.p.hull < 100) hit++; else dodged++;
        why.push(G.p.hull < 100 ? 'hit' : lastLost ? 'lost' : 'other');
      }
      return { dodged, hit, why: why.join(',') };
    }, how);
    // drones and ballistic missiles: how often each reaction escapes
    const esc = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const res = {};
      for (const kind of ['drone', 'ball']) for (const how of ['none', 'KeyA', 'KeyS']) {
        let ok = 0;
        for (let n = 0; n < 4; n++) {
          G.threats = []; G.state = 'play'; G.dirT = 999;
          [G.p.x, G.p.y] = P(53.0, 25.6); G.p.a = 0; G.p.v = 600; G.p.hull = 100; G.p.inv = 0;
          if (kind === 'drone') { const s = SPOTS.sites.find(q => q.n === 'Kish'); G.threats.push({ k: 'drone', x: G.p.x + 1500, y: G.p.y - 350, a: Math.PI - 0.2, v: 300, t: 0, fuel: 40, st: 'fly', alt: 1, site: 'test', buzz: 0 }); }
          else { const sv = SPOTS.sites; sv.push({ n: 'test', k: 'b', x: G.p.x, y: G.p.y - 2000 }); while (!launch('ball')); sv.pop(); G.threats = G.threats.slice(0, 1); }
          let reacted = false;
          for (let i = 0; i < 160 && G.threats.length; i++) {
            await wait(50);
            const m = G.threats[0];
            if (!m) break;
            const go = kind === 'drone' ? m.st === 'dive' : true;
            if (go && !reacted) { reacted = true; if (how !== 'none') Input.keys[how] = true; }
            if (how !== 'KeyS') G.p.v = Math.max(G.p.v, 600);
            if (reacted && how === 'KeyS' && G.p.v <= 0) Input.keys.KeyS = false;
          }
          Input.keys.KeyA = false; Input.keys.KeyS = false;
          if (G.p.hull >= 100) ok++;
        }
        res[kind + ':' + how] = ok + '/4';
      }
      return res;
    });
    // sink + game over
    const end = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      G.threats = []; G.lives = 1; G.state = 'play'; G.p.inv = 0; hurt(200, 'test'); await wait(3200);
      return { over: !document.getElementById('sOver').hidden };
    });
    out[name] = { bootMs, ctl, ...r, dodge, esc, ...end, errs };
    await page.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
