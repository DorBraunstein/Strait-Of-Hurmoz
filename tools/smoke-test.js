const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const dir = process.argv[2];
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.goto('file://' + dir + '/dist/index.html');
  await page.waitForTimeout(600);
  await page.click('#bPlay');
  await page.waitForTimeout(300);
  // every sound function
  const snd = await page.evaluate(async () => {
    const names = ['boom', 'splash', 'hit', 'kaching', 'glug', 'horn', 'launch', 'beep', 'whistle', 'buzz', 'flare', 'brrt', 'near', 'power', 'pop', 'ping', 'alarm', 'click', 'buy', 'nope', 'achieve', 'fanfare', 'trombone'];
    const bad = [];
    for (const n of names) { try { Snd.last = {}; Snd[n](1, G.P.x, G.P.y); } catch (e) { bad.push(n + ': ' + e.message); } }
    await new Promise(r => setTimeout(r, 1200));
    return { state: Snd.ctx && Snd.ctx.state, music: !!Snd.timer, bad };
  });
  console.log('sound', JSON.stringify(snd));
  // power-ups + CIWS + diplomacy
  const pw = await page.evaluate(async () => {
    save.up.ciws = 3; startLevel(5); const P = G.P;
    const out = {};
    for (const k of ['repair', 'bubble', 'nitro', 'flares', 'cash', 'dove']) { G.crates.push({ x: P.x, y: P.y, kind: k, t: 0, life: 18, dead: false }); await new Promise(r => setTimeout(r, 120)); }
    out.bubble = P.bubble; out.nitro = P.nitro > 0; out.flares = P.flares; out.bonus = G.bonus;
    spawnMissile(); spawnMissile(); spawnDrone(P.x + 300, P.y); spawnDrone(P.x - 300, P.y);
    await new Promise(r => setTimeout(r, 2500));
    out.kills = G.kills; out.tracers = save.st.kills;
    // flares decoy
    spawnMissile(); spawnMissile(); await new Promise(r => setTimeout(r, 600)); fireFlares();
    out.decoyed = G.missiles.filter(m => m.target).length + '/' + G.missiles.length;
    honk(); out.honks = save.st.honks;
    // boarding + shake-off
    G.boats.push({ x: P.x + 5, y: P.y + 10, a: 0, v: 0, st: 'chase', t: 0, ox: 0, oy: 0, tries: 0, flee: 0, say: null, sayT: 0, trail: [], dead: false });
    await new Promise(r => setTimeout(r, 300));
    out.boarded = P.boarders;
    P.shakeAcc = 3; await new Promise(r => setTimeout(r, 200));
    out.afterShake = P.boarders;
    // ballistic on top of the player
    P.bubble = 0; P.inv = 0; const h0 = P.hull; spawnBallistic(P.x, P.y, 0, 120); await new Promise(r => setTimeout(r, 3000)); out.ballDmg = h0 - P.hull;
    // torpedo
    G.subs.push({ x: P.x + 400, y: P.y, t: 0, aa: Math.PI, tv: 420, fired: false, dead: false });
    await new Promise(r => setTimeout(r, 2600)); out.torpHits = G.hits;
    // swarm + pizza + barrage
    spawnSwarm(); spawnPizza(); spawnBarrage(); out.swarm = G.drones.length; out.balls = G.balls.length;
    return out;
  });
  console.log('powerups', JSON.stringify(pw));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: dir + '/shots/17-chaos.png' });
  // pause / resume via keyboard
  await page.keyboard.press('KeyP');
  const paused = await page.evaluate(() => G.mode + ' ' + !document.getElementById('sPause').hidden);
  await page.keyboard.press('Escape');
  const resumed = await page.evaluate(() => G.mode + ' ' + document.getElementById('sPause').hidden);
  console.log('pause', paused, '| resume', resumed);
  // sink
  await page.evaluate(() => { G.P.bubble = 0; G.P.inv = 0; G.P.hull = 5; G.mines.push({ x: G.P.x, y: G.P.y, vx: 0, vy: 0, ph: 0, dead: false, fuse: 0 }); });
  await page.waitForTimeout(3200);
  const sunk = await page.evaluate(() => ({ mode: G.mode, port: !document.getElementById('sPort').hidden, title: document.getElementById('pTitle').textContent, next: document.getElementById('bNext').textContent }));
  console.log('sunk', JSON.stringify(sunk));
  await page.screenshot({ path: dir + '/shots/18-sunk-port.png' });
  await page.click('#bNext');
  await page.waitForTimeout(300);
  console.log('retry ->', await page.evaluate(() => G.level + ' ' + G.mode));
  // time out
  await page.evaluate(() => { G.timeLeft = 0.3; });
  await page.waitForTimeout(3300);
  console.log('timeout', await page.evaluate(() => G.mode + ' ' + document.getElementById('pTitle').textContent));
  // title after progress, endless config
  await page.click('#bMenu');
  await page.waitForTimeout(400);
  console.log('title btn', await page.evaluate(() => document.getElementById('bPlay').textContent + ' | reset visible ' + !document.getElementById('bReset').hidden));
  console.log('endless', await page.evaluate(() => [13, 20, 40].map(n => { const c = levelCfg(n); return n + ':' + c.name + ' q' + c.quota + ' d' + c.drone.toFixed(1) + ' night' + c.night; }).join(' | ')));
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
