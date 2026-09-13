/* ==========================================================================
   TintPro Restyle — common/page-world.js   (runs in the page's own JS world)

   The app navigates to other screens by pointing a hidden <form> at a named
   window and calling form.submit() (see go_here() on the job page). A
   programmatic submit() fires no event, so the only way to keep those
   navigations in the current tab is to wrap the method itself.
   Postbacks (no target) are untouched.
   ========================================================================== */
(() => {
  "use strict";
  // login page: leave alone
  try { if (/^\/(default\.aspx)?$/i.test(location.pathname)) return; } catch (e) { /* ignore */ }
  // inside a menu|main frameset, "new window" targets go to the main pane
  const contentFrameName = () => {
    try {
      let w = window, fs = null;
      while (w !== w.parent) { w = w.parent; if (w.document && w.document.querySelector("frameset")) { fs = w; break; } }
      if (!fs) return null;
      const frames = Array.from(fs.frames);
      const byName = (n) => frames.find((f) => f.name === n);
      const pane = byName("main") || byName("right") || frames.filter((f) => f.name !== "menu").pop();
      return pane && pane !== window ? pane.name || null : null;
    } catch (e) { return null; }
  };
  // targets that name an existing frame (AR's "right" pane) are kept
  const frameExists = (name) => {
    const seen = new Set();
    const walk = (w) => {
      if (!w || seen.has(w)) return false;
      seen.add(w);
      try {
        for (let i = 0; i < w.frames.length; i++) {
          if (w.frames[i].name === name || walk(w.frames[i])) return true;
        }
      } catch (e) { /* cross-origin */ }
      return false;
    };
    try { return walk(window.top); } catch (e) { return false; }
  };
  const proto = HTMLFormElement.prototype;
  const origSubmit = proto.submit;
  if (origSubmit && !origSubmit.__ascWrapped) {
    const wrapped = function submit() {
      try {
        const t = this.getAttribute("target");
        if (t && t !== "_self" && t !== "_parent" && t !== "_top" && !frameExists(t)) this.setAttribute("target", contentFrameName() || "_self");
      } catch (e) { /* ignore */ }
      return origSubmit.apply(this, arguments);
    };
    wrapped.__ascWrapped = true;
    proto.submit = wrapped;
  }
})();
