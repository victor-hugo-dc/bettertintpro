/* ==========================================================================
   TintPro Restyle — common/export.js
   Table → CSV / XLSX download. The XLSX is a minimal, dependency-free
   OOXML package (stored zip entries, inline strings, numeric cells).
   ========================================================================== */
(() => {
  "use strict";
  const ASC = (window.ASC = window.ASC || {});

  /* ---------- read a table into rows of strings ------------------------ */
  function cellText(cell) {
    const clone = cell.cloneNode(true);
    // hidden controls / icons / scripts aren't data
    for (const n of clone.querySelectorAll("script, style, i, svg, img, .noprint, .asc-export-bar")) n.remove();
    // form controls → their value / selected text
    for (const sel of clone.querySelectorAll("select")) {
      const o = sel.options[sel.selectedIndex];
      sel.replaceWith(document.createTextNode(o ? o.textContent : ""));
    }
    for (const inp of clone.querySelectorAll("input")) {
      const t = (inp.getAttribute("type") || "text").toLowerCase();
      if (t === "checkbox" || t === "radio") inp.replaceWith(document.createTextNode(inp.checked ? "Yes" : "No"));
      else if (t === "hidden" || t === "submit" || t === "button") inp.remove();
      else inp.replaceWith(document.createTextNode(inp.value || ""));
    }
    for (const ta of clone.querySelectorAll("textarea")) ta.replaceWith(document.createTextNode(ta.value || ""));
    for (const br of clone.querySelectorAll("br")) br.replaceWith(document.createTextNode("\n"));
    for (const p of clone.querySelectorAll("p, div, li, tr")) p.append(document.createTextNode("\n"));
    return clone.textContent.replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  }

  function tableRows(table) {
    const rows = [];
    const trs = table.querySelectorAll(":scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr, :scope > tr");
    for (const tr of trs) {
      if (tr.classList.contains("pager") || tr.classList.contains("asc-skip-export")) continue;
      if (tr.closest("table") !== table) continue;
      const cells = Array.from(tr.children).filter((c) => c.tagName === "TD" || c.tagName === "TH");
      if (!cells.length) continue;
      const out = [];
      for (const c of cells) {
        const txt = cellText(c);
        const span = Math.max(1, parseInt(c.getAttribute("colspan") || "1", 10));
        out.push(txt);
        for (let i = 1; i < span; i++) out.push("");
      }
      if (out.some((v) => v !== "")) rows.push(out);
    }
    // Drop pure action columns (empty header, only "Select"/"Edit"/… links)
    const ACTION = /^(select|edit|view details|resend|delete|view|remove)$/i;
    const width = Math.max(0, ...rows.map((r) => r.length));
    const keep = [];
    for (let c = 0; c < width; c++) {
      const head = rows[0] ? rows[0][c] || "" : "";
      const vals = rows.slice(1).map((r) => r[c] || "").filter(Boolean);
      const actionOnly = head === "" && vals.length > 0 && vals.every((v) => ACTION.test(v));
      if (!actionOnly) keep.push(c);
    }
    return rows.map((r) => keep.map((c) => r[c] || ""));
  }
  ASC.tableRows = tableRows;

  /* ---------- CSV ------------------------------------------------------ */
  function toCSV(rows) {
    const esc = (v) => (/[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
    return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  }

  /* ---------- XLSX ----------------------------------------------------- */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zipStore(files) {
    // files: [{name, data: Uint8Array}]
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
    const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
    for (const f of files) {
      const name = enc.encode(f.name);
      const crc = crc32(f.data);
      const local = new Uint8Array([
        ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0),
      ]);
      parts.push(local, name, f.data);
      central.push(new Uint8Array([
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
      ]), name);
      offset += local.length + name.length + f.data.length;
    }
    const cdStart = offset;
    let cdLen = 0;
    for (const c of central) cdLen += c.length;
    const end = new Uint8Array([
      ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
      ...u32(cdLen), ...u32(cdStart), ...u16(0),
    ]);
    return new Blob([...parts, ...central, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  const xmlEsc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  const colName = (i) => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const NUMERIC = /^-?\$?\(?-?[\d,]*\.?\d+\)?%?$/;

  function toXLSX(rows, sheetName) {
    const enc = new TextEncoder();
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    rows.forEach((r, ri) => {
      xml += `<row r="${ri + 1}">`;
      r.forEach((v, ci) => {
        const ref = colName(ci) + (ri + 1);
        if (ri > 0 && v !== "" && NUMERIC.test(v)) {
          const neg = /^\(.*\)$/.test(v) || v.startsWith("-");
          const n = parseFloat(v.replace(/[^0-9.]/g, "")) * (neg ? -1 : 1);
          if (!Number.isNaN(n)) { xml += `<c r="${ref}"><v>${n}</v></c>`; return; }
        }
        if (v !== "") xml += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
      });
      xml += "</row>";
    });
    xml += "</sheetData></worksheet>";
    const name = xmlEsc((sheetName || "Sheet1").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet1");
    const files = [
      { name: "[Content_Types].xml", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>') },
      { name: "_rels/.rels", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { name: "xl/workbook.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
      { name: "xl/_rels/workbook.xml.rels", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>') },
      { name: "xl/worksheets/sheet1.xml", data: enc.encode(xml) },
    ];
    return zipStore(files);
  }

  /* ---------- download ------------------------------------------------- */
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function safeName(s) {
    return (ASC.clean(s) || "export").replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").slice(0, 60);
  }

  ASC.exportTable = (table, kind, baseName) => {
    const rows = tableRows(table);
    if (!rows.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${safeName(baseName || document.title)}-${stamp}`;
    if (kind === "csv") download(new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" }), base + ".csv");
    else download(toXLSX(rows, baseName), base + ".xlsx");
  };

  /* Add a small "Export: CSV | Excel" bar before a table */
  ASC.addExportBar = (table, baseName, where) => {
    if (!table || table.dataset.ascExport) return null;
    table.dataset.ascExport = "1";
    const bar = ASC.el("div", { class: "asc-export-bar" }, [
      ASC.el("span", { class: "asc-export-label", text: "Export" }),
      ASC.el("button", { type: "button", class: "asc-export-btn", title: "Download as CSV" }, [ASC.icon("download"), document.createTextNode("CSV")]),
      ASC.el("button", { type: "button", class: "asc-export-btn", title: "Download as Excel (.xlsx)" }, [ASC.icon("sheet"), document.createTextNode("Excel")]),
    ]);
    const [, csvBtn, xlsBtn] = bar.children;
    csvBtn.addEventListener("click", (e) => { e.preventDefault(); ASC.exportTable(table, "csv", baseName); });
    xlsBtn.addEventListener("click", (e) => { e.preventDefault(); ASC.exportTable(table, "xlsx", baseName); });
    if (where) where.append(bar);
    else table.parentNode.insertBefore(bar, table);
    return bar;
  };
})();
