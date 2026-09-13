/* ==========================================================================
   TintPro Restyle — pages/jobs.js
   edit_cust.aspx (customer form) and jo_details.aspx (job details).
   Mostly CSS-driven; this adds a few structural hooks and re-applies them
   after UpdatePanel refreshes.
   ========================================================================== */
(() => {
  "use strict";
  if (window.ASC && window.ASC.off) return; // settings hub: leave the page alone
  const { el, clean, norm } = window.ASC;
  const path = window.ASC.path();
  const isEdit = /edit_cust\.aspx$/.test(path);
  const isJo = /jo_details\.aspx$/.test(path);
  document.body.classList.add(isEdit ? "asc-edit-cust" : "asc-jo");

  function enhanceEditCust() {
    const site = document.getElementById("content_p_site");
    if (!site) return;
    // Phone fields: three inputs (area / 3 / 4) → group them with dashes
    for (const p of site.querySelectorAll("p")) {
      if (p.dataset.ascEnhanced) continue;
      const parts = Array.from(p.querySelectorAll(":scope > input[maxlength='3'], :scope > input[maxlength='4']"));
      if (parts.length === 3) {
        p.dataset.ascEnhanced = "1";
        const group = el("span", { class: "asc-phone" });
        parts[0].before(group);
        group.append(parts[0], el("span", { class: "asc-dash", text: "–" }), parts[1], el("span", { class: "asc-dash", text: "–" }), parts[2]);
      }
    }
    // Empty section headings (the right column has a placeholder one)
    for (const h of document.querySelectorAll("#content_div p.heading")) h.classList.toggle("asc-empty", !clean(h.textContent));
    // Keep checkbox + its label together
    for (const cb of document.querySelectorAll("#content_div p > input[type='checkbox'], #content_div .g-mb-15 > input[type='checkbox']")) {
      if (cb.closest(".asc-check")) continue;
      const lab = cb.nextElementSibling && cb.nextElementSibling.tagName === "LABEL" ? cb.nextElementSibling : null;
      const wrap = el("span", { class: "asc-check" });
      cb.before(wrap); wrap.append(cb); if (lab) wrap.append(lab);
    }
    // Save button → primary
    const save = document.querySelector("#content_p_buttons input[value='Save']");
    if (save) save.classList.add("asc-primary");
  }

  function enhanceJo() {
    // Refresh icon in the card header
    const refresh = document.querySelector("#content_div .card-header .pull-right a i.fa-refresh");
    if (refresh && !refresh.dataset.ascIcon) {
      refresh.dataset.ascIcon = "1";
      refresh.replaceWith(window.ASC.icon("refresh"));
    }
    // Status pill next to "Job ID"
    const h6 = document.querySelector("#content_div .card-header h6");
    const status = document.getElementById("content_dd_j_status");
    if (h6 && status) {
      const text = clean(status.options[status.selectedIndex] ? status.options[status.selectedIndex].textContent : "");
      let pill = h6.querySelector(".asc-status-pill");
      if (!pill) { pill = el("span", { class: "asc-status-pill" }); h6.append(pill); }
      pill.textContent = text;
      pill.dataset.status = norm(text);
    }
  }

  const run = () => { if (isEdit) enhanceEditCust(); if (isJo) enhanceJo(); };
  const target = document.getElementById("content_div") || document.body;
  window.ASC.watch(target, run);
})();
