'use strict';
/* =========================================================
   FEATURES — switchable features (developer settings) and an event bus.
   Each optional feature registers itself with feature({...}) and listens to
   game events with onEvt(). The core game only calls emit(); with every
   feature switched off it plays exactly like the original game.
   ========================================================= */
const FEATURES = [];
const FLAG_KEY = 'strait-outta-hormuz-flags-v1';
let FLAGS = {};
try { FLAGS = JSON.parse(localStorage.getItem(FLAG_KEY) || '{}') || {}; } catch (e) { FLAGS = {}; }

function feature(def) { if (!FEATURES.some(f => f.id === def.id)) FEATURES.push(def); }
/** Is a feature switched on? Everything defaults to on. */
function feat(id) { return FLAGS[id] !== false; }
function setFlag(id, on) {
  FLAGS[id] = !!on;
  try { localStorage.setItem(FLAG_KEY, JSON.stringify(FLAGS)); } catch (e) { /* storage unavailable: flags last for this visit */ }
  emit('flags', id, !!on);
}

const BUS = {};
function onEvt(name, fn) { (BUS[name] || (BUS[name] = [])).push(fn); }
function emit(name, a, b, c, d) {
  const list = BUS[name];
  if (!list) return;
  for (let i = 0; i < list.length; i++) {
    try { list[i](a, b, c, d); } catch (err) { console.error('[' + name + ']', err); }
  }
}
