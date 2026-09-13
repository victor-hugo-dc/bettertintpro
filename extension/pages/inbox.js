/* ==========================================================================
   TintPro Restyle — pages/inbox.js
   Inbox / Sent Items list: filter bar, grid wrapper, export.
   ========================================================================== */
(() => {
  "use strict";
  if (window.ASC && window.ASC.off) return; // settings hub: leave the page alone
  const { el, clean } = window.ASC;
  document.body.classList.add("asc-inbox");

  function enhance() {
    const grid = document.getElementById("content_GridView1");
    if (!grid || grid.dataset.ascEnhanced) return;
    grid.dataset.ascEnhanced = "1";

    // Filter controls: the two .col-lg-6 blocks above the grid
    const cols = Array.from(document.querySelectorAll("#content_div .row > .col-lg-6"));
    if (cols.length && !document.querySelector(".asc-inbox-filters")) {
      const bar = el("div", { class: "asc-inbox-filters" });
      for (const col of cols) {
        const group = el("div", { class: "asc-tool-group" });
        for (const n of Array.from(col.childNodes)) {
          if (n.nodeType === Node.TEXT_NODE) {
            const t = clean(n.textContent).replace(/:$/, "");
            if (t) group.append(el("span", { class: "asc-tool-label", text: t }));
            continue;
          }
          if (n.nodeName === "BR") continue;
          group.append(n);
        }
        bar.append(group);
      }
      const row = cols[0].parentElement;
      row.parentNode.insertBefore(bar, row);
      for (const col of cols) col.hidden = true;
    }

    // Grid wrapper + export
    const wrap = el("div", { class: "asc-grid-wrap" });
    grid.parentNode.insertBefore(wrap, grid);
    wrap.append(grid);
    const head = el("div", { class: "asc-grid-head" });
    wrap.parentNode.insertBefore(head, wrap);
    const rows = Array.from(grid.querySelectorAll(":scope > tbody > tr")).filter((tr) => !tr.querySelector("th"));
    head.append(el("span", { class: "asc-grid-count", text: `${rows.length} message${rows.length === 1 ? "" : "s"}` }));
    window.ASC.addExportBar(grid, "messages", head);

    const ths = Array.from(grid.querySelectorAll(":scope > tbody > tr:first-child > th"));
    const idx = (re) => ths.findIndex((th) => re.test(clean(th.textContent)));
    const subj = idx(/subject/i), date = idx(/^date$/i), id = idx(/^id$/i);
    for (const tr of rows) {
      const tds = Array.from(tr.children);
      if (subj >= 0 && tds[subj]) tds[subj].classList.add("asc-subject");
      if (date >= 0 && tds[date]) tds[date].classList.add("asc-date");
      if (id >= 0 && tds[id]) tds[id].classList.add("asc-id");
    }
  }

  window.ASC.watch(document.getElementById("content_div") || document.body, enhance);
})();
