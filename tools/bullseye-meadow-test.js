// Plays dist/bullseye-meadow.html in headless Chromium (software WebGL): title, a full 12-arrow game with
// solved aim at full pull, one weak shot, end cards and results; then a phone round with touch.
// Usage: node tools/archery-test.js <repo dir> <path to three.min.js r128> [screenshot dir]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const [dir, threePath, shots] = process.argv.slice(2);
  const three = fs.readFileSync(threePath, 'utf8');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let failed = false;
  const shot = async (page, name) => { if (shots) await page.screenshot({ path: shots + '/' + name + '.png' }); };
  for (const [name, vp, touch] of [['desktop', { width: 1024, height: 640 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await page.route('**/three.min.js', r => r.fulfill({ body: three, contentType: 'application/javascript' }));
    await page.route('https://fonts.googleapis.com/**', r => r.abort());
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errs.push(m.text()); }); // fonts are blocked on purpose
    await page.goto('file://' + dir + '/dist/bullseye-meadow.html');
    await page.waitForFunction(() => typeof G !== 'undefined' && G && G.state === 'title', null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await shot(page, name + '-title');
    await page.click('#bStart');
    if (!touch) await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.waitForTimeout(500);
    // headless Chromium can't lock the mouse, so aim the way browsers without pointer lock do
    await page.evaluate(() => { swayAt = () => [0, 0]; noLock = true; });
    const solve = (power, missBy) => page.evaluate(([p, missBy]) => {
      const c = mainTarget.face.getWorldPosition(new THREE.Vector3());
      for (let it = 0; it < 12; it++) {
        camera.position.copy(EYE_POS); camera.rotation.set(G.pitch, G.yaw, 0, 'YXZ'); setString(ease(p));
        const tip = arrowTipWorld();
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const v = camera.position.clone().addScaledVector(fwd, G.D / -fwd.z).sub(tip).normalize().multiplyScalar(22 + 48 * p), pos = tip.clone();
        while (pos.z > c.z) { v.y -= GRAV * 0.001; v.x += G.wind.x * WIND_K * 0.001; v.y += G.wind.y * WIND_K * 0.001; pos.addScaledVector(v, 0.001); }
        G.yaw += (pos.x - c.x - missBy) / G.D; G.pitch += (c.y - pos.y) / G.D;
      }
      return [G.yaw, G.pitch];
    }, [power, missBy || 0]);
    // the software renderer is slow, so hold until the pull reaches the wanted strength
    const waitDraw = target => page.waitForFunction(t => G.draw >= t, target, { timeout: 30000, polling: 16 })
      .catch(async err => { console.log('stuck', JSON.stringify(await page.evaluate(() => ({ state: G.state, drawing: G.drawing, draw: G.draw, canPlay: canPlay(), at: document.elementFromPoint(innerWidth / 2, innerHeight * 0.6).id })))); throw err; });
    const press = async ms => {
      if (touch) {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vp.width / 2, y: vp.height * 0.6 }] });
        await waitDraw(ms);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else { await page.mouse.down(); await waitDraw(ms); await page.mouse.up(); }
    };
    const results = [];
    const ends = touch ? 1 : 4;
    for (let e = 0; e < ends; e++) {
      for (let a = 0; a < 3; a++) {
        await page.waitForFunction(() => G.state === 'aim', null, { timeout: 120000 });
        const weak = e === 1 && a === 2, miss = e === 2 && a === 1 ? 0.3 : 0;
        if (!weak) await solve(1, miss);
        await page.evaluate(() => { G.holdFull = 0; });
        if (e === 0 && a === 0) await page.waitForTimeout(300);
        if (e === 0 && a === 0) await shot(page, name + '-aim');
        if (e === 0 && a === 0 && !touch) { await page.mouse.down(); await waitDraw(0.6); await shot(page, name + '-draw'); await waitDraw(1); await page.mouse.up(); }
        else await press(weak ? 0.4 : 1);
        if (e === 3 && a === 0) { await page.waitForTimeout(350); await shot(page, name + '-flight'); }
        await page.waitForFunction(() => G.state === 'hitcam', null, { timeout: 120000 });
        if (a === 0 && (e === 0 || e === 3)) { await page.waitForTimeout(900); await shot(page, name + '-hit' + e); }
        await page.waitForFunction(() => G.state !== 'hitcam' && G.state !== 'return', null, { timeout: 120000 });
        results.push(await page.evaluate(() => { const r = G.ends[G.end][G.ends[G.end].length - 1]; return r.label + ':' + r.kind; }));
      }
      if (touch) break;
      if (e < 3) { await page.waitForSelector('#endcard:not([hidden])'); if (e === 0) await shot(page, name + '-endcard'); await page.click('#bNext'); await page.mouse.move(vp.width / 2, vp.height / 2); }
    }
    let total = null;
    if (!touch) { await page.waitForSelector('#results:not([hidden])'); await page.waitForTimeout(300); await shot(page, name + '-results'); total = await page.evaluate(() => G.total); }
    const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
    const solved = results.filter((r, i) => !(i === 5 || i === 7));
    const ok = !errs.length && solved.every(r => /^(10|X|9):target$/.test(r)) && (touch || total > 0);
    if (!ok) failed = true;
    console.log(name, ok ? 'OK' : 'FAIL', JSON.stringify({ results, total, fps, errs }));
    await ctx.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
