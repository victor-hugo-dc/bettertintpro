/* ==========================================================================
   TintPro Restyle — pages/admin.js
   Bill To's / Referrals and Employees: toolbar, table wrapper, export,
   employee type chips + calendar colour swatches.
   ========================================================================== */
(() => {
  "use strict";
  if (window.ASC && window.ASC.off) return; // settings hub: leave the page alone
  const { el, clean, norm } = window.ASC;
  document.body.classList.add("asc-admin");
  const isEmployees = /employees\.aspx$/.test(window.ASC.path());

  /* Move the loose controls that sit above the grid into one toolbar */
  function buildToolbar(grid) {
    if (document.querySelector(".asc-admin-toolbar")) return;
    const bar = el("div", { class: "asc-admin-toolbar" });

    if (isEmployees) {
      // Layout table: [title] [add button + note + counts + radio] [grid]
      const layout = grid.parentElement.closest("table");
      if (layout) layout.classList.add("asc-layout-table");
      const cells = layout ? Array.from(layout.querySelectorAll(":scope > tbody > tr > td")) : [];
      const anchorCell = cells.find((td) => td.querySelector("#content_bt_add_drone_plus, #content_rb_active"));
      if (!anchorCell) return;
      // the controls are spread over every cell of that row
      const controlsRow = anchorCell.closest("tr");
      const controlsCell = el("div");
      for (const td of Array.from(controlsRow.children)) while (td.firstChild) controlsCell.append(td.firstChild);
      const g1 = el("div", { class: "asc-tool-group" });
      const g2 = el("div", { class: "asc-tool-group" });
      const g3 = el("div", { class: "asc-tool-group" });
      for (const b of controlsCell.querySelectorAll("input[type='submit']")) g1.append(b);
      // "<b>Label:</b> <span>n</span>" pairs → stat tiles
      for (const b of Array.from(controlsCell.querySelectorAll("b"))) {
        const val = b.nextElementSibling && b.nextElementSibling.tagName === "SPAN" ? b.nextElementSibling : null;
        if (!val) continue;
        const tile = el("span", { class: "asc-stat" });
        const label = clean(b.textContent).replace(/:$/, "");
        tile.append(el("span", { text: label }));
        const strong = el("b"); strong.append(val); tile.append(strong);
        g2.append(tile);
        b.remove();
      }
      const rb = controlsCell.querySelector("#content_rb_active");
      if (rb) g3.append(rb);
      const over = controlsCell.querySelector("#content_l_over");
      bar.append(g1, g2, el("span", { class: "asc-tool-spacer" }), g3);
      if (over && clean(over.textContent)) bar.append(over);
      // Over-limit → mark the matching tiles
      if (over && /exceeded/i.test(over.textContent)) {
        for (const t of g2.querySelectorAll(".asc-stat")) if (/super users$/i.test(t.textContent)) t.classList.add("asc-stat--over");
      }
      controlsRow.remove();
      grid.parentElement.parentNode.insertBefore(bar, grid.parentElement);
    } else {
      // Referrals: <table width=100%> with the controls, sitting before the grid
      const ctlTable = Array.from(document.querySelectorAll("#content_div table[width='100%']")).find((t) => t.querySelector("#content_bt_add"));
      if (!ctlTable) return;
      // The grid itself lives in the last row of this table: only harvest the
      // direct cells that do not contain it.
      ctlTable.classList.add("asc-layout-table");
      for (const td of ctlTable.querySelectorAll(":scope > tbody > tr > td")) {
        if (td.contains(grid)) continue;
        const group = el("div", { class: "asc-tool-group" });
        for (const n of Array.from(td.childNodes)) {
          if (n.nodeType === Node.TEXT_NODE) {
            const t = clean(n.textContent);
            if (t) group.append(el("span", { class: "asc-tool-label", text: t }));
            continue;
          }
          if (n.nodeName === "BR") continue;
          group.append(n);
        }
        if (group.childNodes.length) bar.append(group);
        td.closest("tr").hidden = true;
      }
      ctlTable.parentNode.insertBefore(bar, ctlTable);
    }
  }

  function enhanceGrid() {
    const grid = document.getElementById("content_Gridview1");
    if (!grid || grid.dataset.ascEnhanced) return;
    grid.dataset.ascEnhanced = "1";

    buildToolbar(grid);

    // Wrap for horizontal scrolling + count/export header
    const wrap = el("div", { class: "asc-grid-wrap" });
    grid.parentNode.insertBefore(wrap, grid);
    wrap.append(grid);
    const rows = Array.from(grid.querySelectorAll(":scope > tbody > tr")).filter((tr) => !tr.querySelector("th") && !tr.querySelector("td[colspan]"));
    const head = el("div", { class: "asc-grid-head" }, [el("span", { class: "asc-grid-count", text: `${rows.length} row${rows.length === 1 ? "" : "s"} on this page` })]);
    wrap.parentNode.insertBefore(head, wrap);
    window.ASC.addExportBar(grid, isEmployees ? "employees" : "bill-to-contacts", head);

    // Column-specific touches
    const ths = Array.from(grid.querySelectorAll(":scope > tbody > tr:first-child > th"));
    const idx = (re) => ths.findIndex((th) => re.test(clean(th.textContent)));
    const colourIdx = idx(/calendar\s*color/i);
    const typeIdx = idx(/^type$/i);
    const inactiveIdx = idx(/inactive/i);
    const phoneIdx = ths.map((th, i) => (/phone/i.test(th.textContent) ? i : -1)).filter((i) => i >= 0);
    const wideIdx = idx(/company name|^title$/i);

    for (const tr of rows) {
      const tds = Array.from(tr.children);
      if (colourIdx >= 0 && tds[colourIdx]) {
        const c = clean(tds[colourIdx].textContent);
        if (c && !tds[colourIdx].querySelector(".asc-swatch")) {
          const sw = el("span", { class: "asc-swatch", text: c });
          sw.style.setProperty("--c", c);
          tds[colourIdx].replaceChildren(sw);
        }
      }
      if (typeIdx >= 0 && tds[typeIdx]) {
        const span = tds[typeIdx].querySelector("span") || tds[typeIdx];
        const t = clean(span.textContent);
        if (t && !tds[typeIdx].querySelector(".asc-type-chip")) {
          const chip = el("span", { class: "asc-type-chip", text: t });
          chip.dataset.type = norm(t);
          span.replaceChildren(chip);
        }
      }
      if (inactiveIdx >= 0 && tds[inactiveIdx]) tds[inactiveIdx].classList.add("asc-inactive-cell");
      if (wideIdx >= 0 && tds[wideIdx]) tds[wideIdx].classList.add("asc-wide-cell");
      for (const i of phoneIdx) if (tds[i]) tds[i].classList.add("asc-phone-cell");
    }
  }

  const target = document.getElementById("content_div") || document.body;
  window.ASC.watch(target, enhanceGrid);
})();
