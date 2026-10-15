
/* =========================================================
   DEVELOPER SETTINGS — switch each optional feature on or off
   ========================================================= */
function openDev() {
  hideScreens();
  renderDev();
  $('sDev').hidden = false;
  setTimeout(() => { try { $('bDevDone').focus({ preventScroll: true }); } catch (e) { /* focus is optional */ } }, 30);
}
function closeDev() { $('sDev').hidden = true; showTitle(); }
function renderDev() {
  const box = $('devList');
  box.textContent = '';
  if (!FEATURES.length) {
    const p = document.createElement('p'); p.className = 'dev-empty'; p.textContent = 'No switchable features yet.'; box.append(p);
  }
  for (const f of FEATURES) {
    const row = document.createElement('label'); row.className = 'dev-row'; row.htmlFor = 'dev-' + f.id;
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'dev-' + f.id; cb.checked = feat(f.id);
    cb.addEventListener('change', () => { setFlag(f.id, cb.checked); Snd.init(); Snd.click(); devCount(); });
    const txt = document.createElement('span'); txt.className = 'dev-txt';
    const nm = document.createElement('b'); nm.textContent = f.name;
    const grp = document.createElement('i'); grp.textContent = f.group || 'FEATURE';
    const ds = document.createElement('span'); ds.textContent = f.desc;
    txt.append(grp, nm, ds); row.append(cb, txt); box.append(row);
  }
  devCount();
}
function devCount() {
  const on = FEATURES.filter(f => feat(f.id)).length;
  $('devCount').textContent = on + ' OF ' + FEATURES.length + ' ON';
}
function setAllFlags(on) { for (const f of FEATURES) setFlag(f.id, on); renderDev(); }
$('bDev').addEventListener('click', () => { Snd.init(); openDev(); });
$('bDevDone').addEventListener('click', closeDev);
$('bDevAll').addEventListener('click', () => setAllFlags(true));
$('bDevNone').addEventListener('click', () => setAllFlags(false));
