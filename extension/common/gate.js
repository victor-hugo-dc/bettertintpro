/* ==========================================================================
   TintPro Restyle — common/gate.js   (document_start, every frame)

   Decides whether the extension should touch this page at all, before first
   paint. Off = ASC.off is true (modules return early) and <html> carries the
   class "asc-off", which disables every stylesheet (they are wrapped in
   `html:not(.asc-off) { … }`).

   Currently off: the login page only. It also records ASC.frameset (the
   ancestor frameset window, if any) so modules know they sit inside a frame
   layout (Settings, Accounts Receivable, Inventory).
   ========================================================================== */
(() => {
  "use strict";
  const ASC = (window.ASC = window.ASC || {});
  let off = false;
  ASC.frameset = null;
  try {
    const path = location.pathname;
    if (/^\/(default\.aspx)?$/i.test(path) || /^\/login\.aspx$/i.test(path)) off = true; // login page
    if (window.top !== window) {
      let w = window;
      while (w !== w.parent) {
        w = w.parent;
        if (w.document && w.document.querySelector("frameset")) { ASC.frameset = w; break; }
      }
    }
  } catch (e) { /* cross-origin ancestor → leave it on */ }
  ASC.off = off;
  if (off) document.documentElement.classList.add("asc-off");
})();
