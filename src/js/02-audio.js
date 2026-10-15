
/* =========================================================
   AUDIO — everything synthesized with WebAudio
   ========================================================= */
const Snd = {
  ctx: null, master: null, sfx: null, mus: null, noise: null,
  enabled: true, musicEnabled: true, intensity: 0.2, target: 0.2, timer: null, step: 0, nextT: 0, bpm: 116, last: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.enabled ? 0.9 : 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.85; this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = this.musicEnabled ? 0.17 : 0; this.mus.connect(this.master);
    const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  },
  setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05); },
  setMusic(on) { this.musicEnabled = on; if (this.mus) this.mus.gain.setTargetAtTime(on ? 0.17 : 0, this.ctx.currentTime, 0.1); },
  ok(name, gap) {
    if (!this.ctx || !this.enabled) return false;
    const t = this.ctx.currentTime;
    if (gap && this.last[name] && t - this.last[name] < gap) return false;
    this.last[name] = t; return true;
  },
  att(x, y) { if (!G) return 1; const d = Math.hypot(x - G.cam.x, y - G.cam.y); return clamp(1 - d / 1900, 0.06, 1); },
  tone(f, dur, type, vol, slide, delay, dest) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  },
  hiss(dur, ftype, freq, vol, q, slide, delay, dest) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = ftype; f.frequency.setValueAtTime(freq, t); if (q) f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(Math.max(0.0002, vol), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx);
    s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
  },
  /* ---- effects ---- */
  boom(size, x, y) {
    if (!this.ok('boom', 0.04)) return;
    const v = (x === undefined ? 1 : this.att(x, y)) * clamp(0.45 + size * 0.35, 0.3, 1);
    this.hiss(0.35 + size * 0.5, 'lowpass', 2600, 0.8 * v, 0.6, 50);
    this.tone(120, 0.3 + size * 0.25, 'sine', 0.7 * v, 30);
    if (size > 1.2) this.tone(60, 0.9, 'sine', 0.55 * v, 24, 0.02);
  },
  splash(x, y) { if (this.ok('splash', 0.08)) this.hiss(0.55, 'lowpass', 1500, 0.3 * this.att(x, y), 0.5, 180); },
  hit() { if (!this.ok('hit', 0.08)) return; this.tone(230, 0.32, 'square', 0.14, 80); this.hiss(0.25, 'highpass', 2500, 0.35); this.tone(140, 0.4, 'triangle', 0.25, 60); },
  kaching() {
    if (!this.ok('kaching', 0.2)) return;
    this.hiss(0.05, 'highpass', 5000, 0.25);
    this.tone(1318.5, 0.1, 'square', 0.1); this.tone(1760, 0.45, 'square', 0.1, null, 0.08);
    this.tone(2637, 0.3, 'triangle', 0.08, null, 0.16); this.tone(3136, 0.3, 'triangle', 0.06, null, 0.22);
  },
  glug() { if (this.ok('glug', 0.26)) this.tone(rand(170, 260), 0.14, 'sine', 0.22, rand(80, 120)); },
  horn() {
    if (!this.ok('horn', 0.3)) return;
    const c = this.ctx, t = c.currentTime, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.06); g.gain.setValueAtTime(0.3, t + 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
    f.connect(g); g.connect(this.sfx);
    for (const fr of [98, 123.5, 147]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fr * 0.94, t); o.frequency.linearRampToValueAtTime(fr, t + 0.12);
      o.connect(f); o.start(t); o.stop(t + 1.1);
    }
  },
  launch(x, y) { if (this.ok('launch', 0.15)) { const v = this.att(x, y); this.hiss(0.9, 'bandpass', 500, 0.5 * Math.max(0.35, v), 1.4, 2600); } },
  beep(f) { if (this.ok('beep' + (f || 880), 0.09)) this.tone(f || 880, 0.07, 'square', 0.07); },
  whistle(dur) { if (this.ok('whistle', 0.25)) this.tone(2000, dur, 'sine', 0.09, 320); },
  buzz() { if (this.ok('buzz', 0.4)) { this.tone(150, 0.6, 'sawtooth', 0.035, 175); this.tone(152, 0.6, 'sawtooth', 0.03, 170); } },
  flare() { if (!this.ok('flare', 0.2)) return; for (let i = 0; i < 4; i++) this.tone(1500 - i * 120, 0.22, 'triangle', 0.1, 420, i * 0.06); this.hiss(0.4, 'highpass', 3000, 0.15); },
  brrt(x, y) { if (!this.ok('brrt', 0.12)) return; const v = this.att(x, y); this.hiss(0.26, 'bandpass', 1100, 0.45 * v, 2.5); this.tone(64, 0.26, 'square', 0.1 * v); },
  near() { if (!this.ok('near', 0.15)) return; this.hiss(0.32, 'bandpass', 1400, 0.3, 1, 300); this.tone(1568, 0.28, 'triangle', 0.12, null, 0.06); this.tone(2093, 0.3, 'triangle', 0.1, null, 0.12); },
  power() { if (!this.ok('power', 0.1)) return; [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.12, null, i * 0.055)); },
  pop() { if (!this.ok('pop', 0.08)) return; for (let i = 0; i < 6; i++) this.hiss(0.05, 'bandpass', rand(1500, 3200), 0.45, 3, null, i * rand(0.03, 0.07)); },
  ping() { if (this.ok('ping', 0.9)) this.tone(1240, 0.7, 'sine', 0.05); },
  alarm() { if (!this.ok('alarm', 0.5)) return; this.tone(740, 0.12, 'square', 0.06); this.tone(988, 0.12, 'square', 0.06, null, 0.14); },
  click() { if (this.ok('click', 0.03)) this.tone(640, 0.04, 'square', 0.05); },
  buy() { if (!this.ok('buy', 0.05)) return; this.tone(880, 0.08, 'square', 0.08); this.tone(1320, 0.18, 'square', 0.08, null, 0.07); },
  nope() { if (this.ok('nope', 0.1)) this.tone(160, 0.18, 'square', 0.08, 110); },
  achieve() { if (!this.ok('achieve', 0.2)) return; [880, 1175, 1568, 2349].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.1, null, i * 0.08)); },
  fanfare() {
    if (!this.ok('fanfare', 0.5)) return;
    [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36], [1047, 0.52]].forEach(([f, d]) => { this.tone(f, d > 0.5 ? 0.7 : 0.16, 'square', 0.07, null, d); this.tone(f / 2, d > 0.5 ? 0.7 : 0.16, 'triangle', 0.1, null, d); });
  },
  trombone() {
    if (!this.ok('trombone', 0.5)) return;
    const c = this.ctx, notes = [[233, 0, 0.35], [220, 0.4, 0.35], [207.6, 0.8, 0.35], [196, 1.2, 1.3]];
    for (const [f, d, len] of notes) {
      const t = c.currentTime + d, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
      if (len > 1) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = 5; l.connect(lg); lg.connect(o.frequency); l.start(t + 0.2); l.stop(t + len); }
      fl.type = 'lowpass'; fl.frequency.value = 1100;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.04); g.gain.setValueAtTime(0.16, t + len * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(fl); fl.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + len + 0.05);
    }
  },
  /* ---- music: maqsum groove in D Hijaz ---- */
  startMusic() {
    if (!this.ctx || this.timer) return;
    this.nextT = this.ctx.currentTime + 0.12; this.step = 0;
    this.timer = setInterval(() => this.sched(), 25);
  },
  stopMusic() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  sched() {
    const c = this.ctx; if (!c) return;
    this.intensity = lerp(this.intensity, this.target, 0.02);
    const spb = 60 / this.bpm / 4;
    if (this.nextT < c.currentTime - 0.3) this.nextT = c.currentTime + 0.05; // tab was asleep
    while (this.nextT < c.currentTime + 0.12) { if (this.musicEnabled && this.enabled) this.playStep(this.step, this.nextT); this.nextT += spb; this.step = (this.step + 1) % 64; }
  },
  note(f, t, dur, type, vol, cut) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    let out = o;
    if (cut) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut, t); fl.frequency.exponentialRampToValueAtTime(cut * 0.35, t + dur); o.connect(fl); out = fl; }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(g); g.connect(this.mus); o.start(t); o.stop(t + dur + 0.02);
  },
  perc(t, kind) {
    const c = this.ctx;
    if (kind === 'doum') {
      const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.2);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(this.mus); o.start(t); o.stop(t + 0.32);
    } else {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise;
      f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : (kind === 'ka' ? 2600 : 3400); f.Q.value = kind === 'hat' ? 0.7 : 1.6;
      const v = kind === 'tek' ? 0.55 : kind === 'ka' ? 0.25 : 0.14, dur = kind === 'hat' ? 0.03 : 0.07;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.mus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
    }
  },
  playStep(s, t) {
    const I = this.intensity, bar = (s / 16) | 0, b = s % 16;
    if (b === 0 || b === 8) this.perc(t, 'doum');
    if (b === 2 || b === 6 || b === 12) this.perc(t, 'tek');
    if (I > 0.3 && (b === 14 || b === 10)) this.perc(t, 'ka');
    if (I > 0.55 && (b % 2 === 1)) this.perc(t, 'hat');
    if (I > 0.8 && (b === 4)) this.perc(t, 'doum');
    const BASS = [
      { 0: 73.42, 3: 73.42, 6: 146.8, 8: 73.42, 10: 77.78, 12: 73.42 },
      { 0: 73.42, 3: 73.42, 6: 146.8, 8: 73.42, 10: 77.78, 12: 92.5 },
      { 0: 98, 3: 98, 6: 196, 8: 98, 10: 110, 12: 98 },
      { 0: 110, 4: 116.5, 8: 110, 10: 98, 12: 92.5, 14: 77.78 }
    ];
    const bn = BASS[bar][b];
    if (bn) this.note(bn, t, 0.22, 'sawtooth', 0.32, 700 + I * 900);
    if (I > 0.34) {
      const LEAD = [
        { 0: 293.7, 2: 311.1, 4: 370, 6: 392, 8: 440, 11: 392, 12: 370, 14: 311.1 },
        { 0: 293.7, 6: 220, 8: 233.1, 10: 220, 12: 196, 14: 185 },
        { 0: 392, 2: 440, 4: 466.2, 6: 440, 8: 392, 10: 370, 12: 392, 14: 440 },
        { 0: 440, 3: 392, 4: 370, 6: 311.1, 8: 293.7 }
      ];
      const ln = LEAD[bar][b];
      if (ln) this.note(ln * (I > 0.75 ? 2 : 1), t, 0.2, 'triangle', 0.16, null);
    }
  }
};
