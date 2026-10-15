
/* =========================================================
   START — runs last, after every feature has registered its listeners
   ========================================================= */
try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save })); } catch (e) { /* viewer hook unavailable */ }
(function start() {
  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});
})();
