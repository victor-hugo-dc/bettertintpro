/* ==========================================================================
   TintPro Restyle — pages/menus.js
   The left "menu" frame of the three menu|main framesets:
     Settings   /trunk/admin/admin_menu.aspx   (table of sections + links)
     Inventory  /Inv/T_menu.aspx               (link list with two sections)
     AR         /trunk/ar/menu_ar.aspx         (buttons + report box)
   Marks the body so menus.css can restyle each; the sidebar itself comes from
   common/shell.js.
   ========================================================================== */
(() => {
  "use strict";
  if (window.ASC && window.ASC.off) return;
  const { el, clean } = window.ASC;
  const p = window.ASC.path();
  const kind = /admin_menu\.aspx$/i.test(p) ? "settings" : /t_menu\.aspx$/i.test(p) ? "inv" : "ar";
  document.body.classList.add("asc-menu", "asc-menu-" + kind);

  if (kind === "settings") {
    // <tr class="header"><td class="head"><strong>Section</strong> … <tr><td><a>
    const table = document.querySelector("#Panel1 table");
    if (!table) return;
    const list = el("nav", { class: "asc-menu-list" });
    let section = null;
    for (const tr of Array.from(table.querySelectorAll(":scope > tbody > tr"))) {
      if (tr.classList.contains("header")) {
        section = el("section", { class: "asc-menu-section" });
        section.append(el("h3", { text: clean(tr.textContent) }));
        list.append(section);
        continue;
      }
      const a = tr.querySelector("a");
      if (!a) continue;
      if (!section) { section = el("section", { class: "asc-menu-section" }); list.append(section); }
      a.classList.add("asc-menu-link");
      section.append(a);
    }
    table.replaceWith(list);
  }

  if (kind === "inv") {
    // "<span id=L_inv> … <div id=P_inv> links" and the same for admin
    for (const [labelId, panelId] of [["L_inv", "P_inv"], ["L_admin", "P_admin"]]) {
      const panel = document.getElementById(panelId);
      if (!panel) continue;
      const label = document.getElementById(labelId);
      const section = el("section", { class: "asc-menu-section" });
      section.append(el("h3", { text: clean(label ? label.textContent : "") || (panelId === "P_inv" ? "Inventory" : "Admin") }));
      for (const a of Array.from(panel.querySelectorAll("a"))) { a.classList.add("asc-menu-link"); section.append(a); }
      panel.replaceChildren(section);
      if (label) label.hidden = true;
    }
    // links that sit outside the two panels (exports, relogin) → their own section
    const loose = Array.from(document.querySelectorAll("form a")).filter((a) => !a.closest(".asc-menu-section"));
    if (loose.length) {
      const section = el("section", { class: "asc-menu-section" });
      section.append(el("h3", { text: "More" }));
      for (const a of loose) { a.classList.add("asc-menu-link"); section.append(a); }
      const admin = document.getElementById("P_admin");
      (admin || document.querySelector("form div")).after(section);
    }
    for (const hr of document.querySelectorAll("form hr")) hr.remove();
  }
})();
