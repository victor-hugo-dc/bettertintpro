/* ==========================================================================
   TintPro Restyle — pages/reports.js
   Standalone report pages: classify data tables, add sticky headers, numeric
   alignment, total rows, and CSV / Excel export for each data table.
   ========================================================================== */
(() => {
  "use strict";
  if (window.ASC && window.ASC.off) return; // settings hub: leave the page alone
  const { el, clean } = window.ASC;
  if (document.getElementById("sideNav")) return; // pages with the app chrome are handled elsewhere
  document.body.classList.add("asc-report");

  const NUMERIC = /^\(?-?\$?[\d,]*\.?\d+\)?%?$/;

  function rowsOf(table) {
    return Array.from(table.querySelectorAll(":scope > thead > tr, :scope > tbody > tr, :scope > tr"));
  }
  function isHeaderRow(tr) {
    const cells = Array.from(tr.children);
    if (!cells.length) return false;
    if (cells.every((c) => c.tagName === "TH")) return true;
    if (cells.length >= 2 && cells.every((c) => c.classList.contains("header"))) return true; // AR lists
    const texty = cells.filter((c) => clean(c.textContent));
    // header cells are bold ("<b>Estimated</b><br>(Section 1)" counts too)
    return texty.length >= 2 && texty.every((c) => {
      const b = c.querySelector("b, strong");
      if (!b) return false;
      const bt = clean(b.textContent), ct = clean(c.textContent);
      return bt && (ct === bt || ct.startsWith(bt) || bt.length >= ct.length * 0.5);
    });
  }
  function isDataTable(table) {
    if (table.closest("table.asc-report-table")) return false;
    if (table.querySelector("table")) return false; // layout table
    const rows = rowsOf(table);
    if (rows.length < 1) return false;
    const cols = Math.max(...rows.map((r) => r.children.length));
    if (cols < 2) return false;
    const hasHeader = isHeaderRow(rows[0]);
    if (hasHeader && rows.length === 1) return cols >= 3; // empty report (header only) — still a data table
    if (rows.length < 2) return false;
    const inputs = table.querySelectorAll("input[type='text'], input[type='radio'], textarea").length;
    return hasHeader || (rows.length >= 4 && inputs === 0);
  }
  // Link lists like report_menu.aspx: few columns, nearly every cell is just a link
  function isMenuTable(table) {
    const rows = rowsOf(table);
    if (rows.length < 5 || isHeaderRow(rows[0])) return false;
    const cols = Math.max(...rows.map((r) => r.children.length));
    if (cols > 3) return false;
    const cells = Array.from(table.querySelectorAll("td")).filter((c) => clean(c.textContent));
    const linkOnly = cells.filter((c) => { const a = c.querySelector("a"); return a && clean(a.textContent) === clean(c.textContent); });
    return cells.length > 0 && linkOnly.length >= cells.length * 0.8;
  }

  function enhanceTable(table, n) {
    table.classList.add("asc-report-table");
    const rows = rowsOf(table);
    const head = rows[0];
    if (isHeaderRow(head)) head.classList.add("asc-head-row");
    const headers = Array.from(head.children).map((c) => clean(c.textContent));

    // numeric columns: majority of non-empty cells numeric
    const colCount = headers.length;
    const numericCols = [];
    for (let c = 0; c < colCount; c++) {
      let num = 0, tot = 0, links = 0;
      for (const tr of rows.slice(1)) {
        const td = tr.children[c];
        if (!td) continue;
        const t = clean(td.textContent);
        if (!t) continue;
        tot++;
        if (NUMERIC.test(t)) num++;
        if (td.querySelector("a")) links++;
      }
      if (tot >= 2 && num / tot >= 0.7 && links / tot < 0.5) numericCols.push(c);
    }
    const wideCols = headers.map((h, i) => (/name|address|customer|site|company|title|description/i.test(h) ? i : -1)).filter((i) => i >= 0);
    for (const tr of rows.slice(1)) {
      for (const c of numericCols) if (tr.children[c]) tr.children[c].classList.add("asc-num");
      for (const c of wideCols) if (tr.children[c]) tr.children[c].classList.add("asc-wide");
      const first = clean(tr.textContent).slice(0, 40);
      if (/^(grand )?total/i.test(first)) tr.classList.add("asc-total-row");
      // "Current" / "Over 30 Days" section rows: one cell spanning the table
      if (tr.children.length === 1 && tr.children[0].hasAttribute("colspan") && clean(tr.textContent)) {
        tr.classList.add("asc-group-row");
        tr.children[0].colSpan = Math.max(tr.children[0].colSpan, colCount);
      }
    }

    const wrap = el("div", { class: "asc-table-wrap" });
    table.parentNode.insertBefore(wrap, table);
    wrap.append(table);
    const dataRows = rows.length - (isHeaderRow(head) ? 1 : 0);
    const bar = el("div", { class: "asc-grid-head" }, [el("span", { class: "asc-grid-count", text: `${dataRows} row${dataRows === 1 ? "" : "s"}` })]);
    wrap.parentNode.insertBefore(bar, wrap);
    const title = clean(document.title).replace(/^tint\s*pro\s*\|\s*/i, "") || "report";
    window.ASC.addExportBar(table, n > 1 ? `${title}-${n}` : title, bar);

    // The text around the table (title, "For … Between …", salesman, totals)
    // sits loose in the same <div>: fold it into intro / outro cards.
    const box = wrap.parentNode;
    if (box && box.tagName === "DIV" && !box.classList.contains("asc-report-card") && box.querySelectorAll(".asc-table-wrap").length === 1) {
      const intro = el("div", { class: "asc-report-card asc-report-intro" });
      const outro = el("div", { class: "asc-report-card asc-report-outro" });
      let after = false;
      for (const node of Array.from(box.childNodes)) {
        if (node === bar) { after = true; continue; }
        if (node === wrap) continue;
        if (node.nodeType === Node.TEXT_NODE && !clean(node.textContent)) continue;
        if (node.nodeType === 1 && node.classList.contains("aspNetHidden")) continue;
        (after ? outro : intro).append(node);
      }
      if (intro.childNodes.length) box.insertBefore(intro, bar);
      if (outro.childNodes.length && clean(outro.textContent)) box.append(outro); else if (outro.childNodes.length) box.append(outro);
    }
    // Split layouts (mailing_list.aspx: search form | lists) → stack top/bottom
    const cell = table.closest("td");
    const layoutRow = cell && cell.parentElement;
    if (layoutRow && layoutRow.children.length > 1 && Array.from(layoutRow.children).some((c) => c !== cell && c.querySelector("input, select"))) {
      layoutRow.closest("table").classList.add("asc-stack");
    }
  }

  function enhanceTitle() {
    // Menu pages start with "<strong>Salesman Reports<br>" — promote to a heading
    const strong = document.querySelector("form > div > span > strong, form > div > strong, form > strong");
    if (strong && !document.querySelector(".asc-report-title")) {
      const text = clean(strong.firstChild && strong.firstChild.nodeType === Node.TEXT_NODE ? strong.firstChild.textContent : strong.textContent.split("\n")[0]);
      if (text) {
        const h = el("h1", { class: "asc-report-title", text });
        strong.parentNode.insertBefore(h, strong);
        if (strong.firstChild && strong.firstChild.nodeType === Node.TEXT_NODE) strong.firstChild.remove();
        else if (clean(strong.textContent) === text) strong.classList.add("asc-hidden-title");
      }
    }
  }

  function boot() {
    enhanceTitle();
    let n = 0;
    for (const table of Array.from(document.querySelectorAll("table"))) {
      if (table.classList.contains("asc-report-table") || table.classList.contains("asc-menu-table")) continue;
      if (isDataTable(table)) { enhanceTable(table, ++n); continue; }
      if (isMenuTable(table)) table.classList.add("asc-menu-table");
    }
    // ASP.NET GridViews with a pager row (Edit/Delete lists): export too
    for (const table of document.querySelectorAll("table[id*='GridView']:not(.asc-report-table)")) {
      if (rowsOf(table).length >= 2) enhanceTable(table, ++n);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
