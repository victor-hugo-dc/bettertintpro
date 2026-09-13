/* ==========================================================================
   TintPro Restyle — pages/settings-home.js   (/trunk/admin/welcome.aspx)
   The Settings hub's main pane starts as an empty grey page. Build a card
   for every section of the menu frame (read live from that frame, so the
   list always matches what the user can see) with links that open in this
   pane.
   ========================================================================== */
(() => {
  "use strict";
  if (window.ASC && window.ASC.off) return;
  const { el, clean } = window.ASC;
  document.body.classList.add("asc-settings-home");

  function menuDoc() {
    try {
      const fs = window.ASC.frameset;
      if (!fs) return null;
      const f = Array.from(fs.frames).find((w) => w.name === "menu");
      return f && f.document && f.document.readyState !== "loading" ? f.document : null;
    } catch (e) { return null; }
  }

  function sectionsFrom(doc) {
    const out = [];
    let cur = null;
    // menus.js may already have rebuilt the table into sections
    const built = doc.querySelectorAll(".asc-menu-section");
    if (built.length) {
      for (const s of built) {
        const h = s.querySelector("h3");
        out.push({ title: clean(h ? h.textContent : ""), links: Array.from(s.querySelectorAll("a")).map((a) => ({ text: clean(a.textContent), href: a.href, target: a.getAttribute("target") })) });
      }
      return out;
    }
    for (const tr of doc.querySelectorAll("#Panel1 table tr")) {
      if (tr.classList.contains("header")) { cur = { title: clean(tr.textContent), links: [] }; out.push(cur); continue; }
      const a = tr.querySelector("a");
      if (!a) continue;
      if (!cur) { cur = { title: "Settings", links: [] }; out.push(cur); }
      cur.links.push({ text: clean(a.textContent), href: a.href, target: a.getAttribute("target") });
    }
    return out;
  }

  const ICON_FOR = [[/product/i, "package"], [/customer|job/i, "building"], [/pric/i, "dollar"], [/communic|message|email/i, "mail"], [/calendar|schedul/i, "calendar"], [/user|employee|log/i, "users"], [/integration|api|quickbooks|zapier/i, "settings"], [/social/i, "megaphone"], [/report/i, "chart"]];

  function render(sections) {
    const host = el("div", { class: "asc-settings-grid" });
    for (const s of sections) {
      if (!s.links.length) continue;
      const card = el("section", { class: "asc-settings-card" });
      const icon = (ICON_FOR.find(([re]) => re.test(s.title)) || [null, "settings"])[1];
      card.append(el("header", {}, [el("span", { class: "asc-settings-icon" }, [window.ASC.icon(icon)]), el("h2", { text: s.title || "Settings" })]));
      const list = el("ul");
      for (const l of s.links) {
        const a = el("a", { href: l.href, text: l.text });
        // open in this pane unless the menu itself opens a new tab/window
        if (l.target && !/^(main|_self)$/i.test(l.target)) a.setAttribute("target", l.target === "_top" ? "_top" : "_self");
        list.append(el("li", {}, [a]));
      }
      card.append(list);
      host.append(card);
    }
    const wrap = el("div", { class: "asc-settings-home" });
    wrap.append(el("h1", { text: "Settings" }), el("p", { class: "asc-settings-lead", text: "Everything you can configure, grouped the same way as the menu on the left." }), host);
    const center = document.querySelector("center");
    const form = document.querySelector("form") || document.body;
    if (center) center.replaceWith(wrap); else form.append(wrap);
  }

  let tries = 0;
  const attempt = () => {
    const doc = menuDoc();
    const sections = doc ? sectionsFrom(doc) : [];
    if (sections.length) { render(sections); return; }
    if (++tries < 40) setTimeout(attempt, 250);
  };
  attempt();
})();
