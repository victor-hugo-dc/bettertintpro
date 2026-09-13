/* ==========================================================================
   TintPro Restyle — pages/welcome.js (home page: /trunk/welcome/)

   Adds structure the CSS can hang off:
     • rebuilds each card header into a consistent bar (title, count, filters,
       collapse button)
     • wraps Job Order statuses in colour-coded badges
     • splits "Company- Last, First" customer cells into two lines
     • turns task assignees into chips and follow-up dates into
       overdue/today/soon pills
     • auto-collapses empty cards (e.g. Phone List), remembers collapse state
     • adds a drag handle to resize the Job Orders / Task List split

   The dashboard lives inside an ASP.NET UpdatePanel (#content_ctl00). Every
   filter change is a partial postback that replaces that panel's innerHTML,
   so everything here is idempotent and re-run from a MutationObserver.
   ========================================================================== */
(() => {
  "use strict";
  if (window.ASC && window.ASC.off) return; // settings hub: leave the page alone

  const STORE_PREFIX = "asc-restyle:";
  const CARD_KEYS = {
    content_div_web: "leads",
    content_div_jobs: "jobs",
    content_div_tasks: "tasks",
    content_div_phone: "phone",
  };

  /* ---------- small helpers ------------------------------------------- */
  const store = {
    get(k) {
      try { return localStorage.getItem(STORE_PREFIX + k); } catch { return null; }
    },
    set(k, v) {
      try { localStorage.setItem(STORE_PREFIX + k, v); } catch { /* ignore */ }
    },
    del(k) {
      try { localStorage.removeItem(STORE_PREFIX + k); } catch { /* ignore */ }
    },
  };

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const c of children) node.append(c);
    return node;
  };

  const chevronSvg = () => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    for (const [k, v] of Object.entries({
      viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5",
      "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true",
    })) svg.setAttribute(k, v);
    const line = document.createElementNS(ns, "polyline");
    line.setAttribute("points", "6 9 12 15 18 9");
    svg.append(line);
    return svg;
  };

  const clean = (s) => (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  const norm = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]/g, "");

  const titleCase = (s) =>
    clean(s)
      .toLowerCase()
      .replace(/(^|[\s\-'])([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());

  const initials = (s) =>
    clean(s)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");

  const hueFor = (s) => {
    let h = 0;
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % 360;
  };

  /* ---------- date helpers (Follow Up column, "M/DD/YY") --------------- */
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const parseShortDate = (s) => {
    const m = clean(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const d = new Date(y, Number(m[1]) - 1, Number(m[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const dayDiff = (date) => {
    const ms = startOfDay(date) - startOfDay(new Date());
    return Math.round(ms / 86400000);
  };

  const relLabel = (diff) => {
    if (diff === 0) return "today";
    if (diff === -1) return "1d late";
    if (diff < 0) return `${-diff}d late`;
    if (diff === 1) return "tomorrow";
    if (diff <= 14) return `in ${diff}d`;
    return "";
  };

  /* ---------- card header ---------------------------------------------- */
  function buildHead(card, key) {
    const header = card.querySelector(":scope > header");
    if (!header || header.querySelector(".asc-head")) return;

    const mediaBody = header.querySelector(".media-body") || header;
    const title = mediaBody.querySelector("h1, h2, h3, h4");
    if (!title) return;

    // Title text nodes contain trailing &nbsp;s → normalise
    for (const n of Array.from(title.childNodes)) {
      if (n.nodeType === Node.TEXT_NODE) n.textContent = clean(n.textContent) + (clean(n.textContent) ? " " : "");
    }
    // "+" add button: icon-font glyph sits off-centre → SVG
    const add = title.querySelector("a.add_button");
    if (add && window.ASC && ASC.icon) {
      add.replaceChildren(ASC.icon("plusSmall"));
      add.setAttribute("title", add.getAttribute("title") || "Add new");
    }

    const head = el("div", { class: "asc-head" });
    const titleWrap = el("div", { class: "asc-title-wrap" });
    titleWrap.append(title);
    const count = el("span", { class: "asc-count", text: "" });
    titleWrap.append(count);
    head.append(titleWrap);

    // Filters: any <select> in the header, using the text before its <br> as label.
    const tools = el("div", { class: "asc-tools" });

    // Leads: Open/All radio group
    const radios = mediaBody.querySelector("#content_rb_active");
    if (radios) tools.append(radios);

    const selects = Array.from(mediaBody.querySelectorAll("select"));
    for (const select of selects) {
      const col = select.parentElement;
      let label = "";
      for (const n of Array.from(col.childNodes)) {
        if (n.nodeType === Node.TEXT_NODE && clean(n.textContent)) { label = clean(n.textContent); break; }
      }
      // The label ("User", "Status", "Pipeline") is folded into the "All"
      // option so the control is self-describing without a separate caption.
      const plural = { user: "users", status: "statuses", pipeline: "pipelines" }[label.toLowerCase()] || label.toLowerCase();
      const allOpt = Array.from(select.options).find((o) => clean(o.textContent).toLowerCase() === "all");
      if (allOpt && label) allOpt.textContent = `All ${plural}`;
      if (label) select.setAttribute("aria-label", label);
      const field = el("label", { class: "asc-field" });
      field.append(select);
      tools.append(field);
    }

    if (selects.length > 1) head.classList.add("asc-head--stacked");
    head.append(tools);

    // Actions: refresh (Job Orders) + collapse toggle, pinned to the right
    const actions = el("div", { class: "asc-actions" });
    const refresh = mediaBody.querySelector(".pull-right a");
    if (refresh) {
      refresh.classList.add("asc-refresh");
      refresh.setAttribute("title", "Refresh dashboard");
      if (window.ASC && ASC.icon) refresh.replaceChildren(ASC.icon("refresh"));
      actions.append(refresh);
    }

    // Collapse toggle
    const btn = el("button", {
      type: "button",
      class: "asc-icon-btn asc-collapse-btn",
      title: "Collapse / expand",
      "aria-label": "Collapse or expand this list",
    }, [chevronSvg()]);
    btn.addEventListener("click", () => {
      const collapsed = card.classList.toggle("asc-collapsed");
      store.set("collapsed:" + key, collapsed ? "1" : "0");
      updateSingleColumn();
      fitLists();
    });
    actions.append(btn);
    head.append(actions);

    header.replaceChildren(head);
    return { count };
  }

  /* ---------- per-card enhancement ------------------------------------- */
  function countRows(table) {
    if (!table) return { rows: 0, hasMore: false };
    const trs = Array.from(table.querySelectorAll(":scope > tbody > tr, :scope > tr"));
    const data = trs.filter((tr) => !tr.classList.contains("pager") && !tr.querySelector("th"));
    const pager = trs.find((tr) => tr.classList.contains("pager"));
    const hasMore = !!(pager && /next/i.test(pager.textContent));
    return { rows: data.length, hasMore };
  }

  function enhanceCard(card, key) {
    if (!card || card.dataset.ascEnhanced) return;
    card.dataset.ascEnhanced = "1";

    const built = buildHead(card, key);

    // Body: the sibling <div> after <header> containing the grid table
    const header = card.querySelector(":scope > header");
    const body = header && header.nextElementSibling;
    if (body) body.classList.add("asc-body");

    const table = card.querySelector("table.gridvw");
    const { rows, hasMore } = countRows(table);

    if (built) {
      built.count.textContent = rows ? (hasMore ? `${rows}+` : String(rows)) : "0";
      built.count.classList.toggle("asc-count--zero", rows === 0);
    }

    // Collapse state: explicit user choice wins, otherwise empty → collapsed
    const saved = store.get("collapsed:" + key);
    const collapsed = saved === null ? rows === 0 : saved === "1";
    card.classList.toggle("asc-collapsed", collapsed);
    card.classList.toggle("asc-empty", rows === 0);
    if (rows === 0 && built) {
      built.count.replaceWith(el("span", { class: "asc-count asc-count--zero", text: "empty" }));
    }

    if (table) {
      if (key === "jobs") enhanceJobs(table);
      if (key === "tasks" || key === "phone") enhanceTasks(table);
      liftPager(card, table);
    }
  }

  // The "Next >>" pager is a sticky table row that rows scroll underneath.
  // Move its links into a real footer bar below the scroll area instead.
  function liftPager(card, table) {
    const pager = table.querySelector(":scope > tbody > tr.pager, :scope > tr.pager");
    if (!pager || card.querySelector(":scope > .asc-foot")) return;
    const foot = el("div", { class: "asc-foot" });
    const items = Array.from(pager.querySelectorAll("a, span")).filter((n) => clean(n.textContent) && !n.querySelector("a, span"));
    for (const n of items) {
      const t = clean(n.textContent);
      if (n.tagName === "A") {
        if (/^next/i.test(t)) { n.textContent = "Next"; n.classList.add("asc-page-next"); n.append(window.ASC.icon("right")); }
        else if (/^prev|^</i.test(t)) { n.textContent = "Previous"; n.classList.add("asc-page-prev"); n.prepend(window.ASC.icon("left")); }
        else n.textContent = t;
      } else n.classList.add("asc-page-current");
      foot.append(n);
    }
    pager.remove();
    if (foot.childNodes.length) card.append(foot);
  }

  /* ---------- Job Orders: status badges + customer split --------------- */
  function enhanceJobs(table) {
    const rows = Array.from(table.querySelectorAll(":scope > tbody > tr, :scope > tr"));
    const headRow = rows.find((tr) => tr.querySelector("th"));
    const ths = headRow ? Array.from(headRow.children) : [];
    const statusIdx = ths.findIndex((th) => /status/i.test(th.textContent));
    const custIdx = ths.findIndex((th) => /customer/i.test(th.textContent));
    if (statusIdx >= 0) ths[statusIdx].classList.add("asc-status-head");

    for (const tr of rows) {
      if (tr === headRow || tr.classList.contains("pager")) continue;
      const tds = Array.from(tr.children);

      if (statusIdx >= 0 && tds[statusIdx] && !tds[statusIdx].querySelector(".asc-badge")) {
        const td = tds[statusIdx];
        const text = clean(td.textContent);
        if (text) {
          const status = norm(text);
          td.classList.add("asc-status-cell");
          td.replaceChildren(el("span", { class: "asc-badge", "data-status": status, text }));
          tr.dataset.status = status;
        }
      }

      if (custIdx >= 0 && tds[custIdx]) {
        const a = tds[custIdx].querySelector("a");
        if (a && !a.classList.contains("asc-customer")) {
          const raw = clean(a.textContent);
          // Server format is "Company- Last, First": the separator is a dash glued
          // to the company followed by a space. Company names themselves may
          // contain " - ", so split on the LAST "X- ". No match → bare name.
          let company = raw, contact = "";
          const m = raw.match(/^(.*\S)-\s+(.*)$/);
          if (m) { company = clean(m[1]); contact = clean(m[2]); }
          contact = contact.replace(/^[,\s\-]+|[,\s\-]+$/g, "").replace(/\s*,\s*/g, ", ");
          company = company.replace(/[,\s\-]+$/g, "");
          if (!company && contact) { company = contact; contact = ""; }
          a.classList.add("asc-customer");
          a.title = raw;
          a.replaceChildren(el("span", { class: "asc-company", text: company || raw }));
          if (contact) a.append(el("span", { class: "asc-contact", text: contact }));
        }
      }
    }
  }

  /* ---------- Task / Phone lists: who chips + date pills --------------- */
  function enhanceTasks(table) {
    const rows = Array.from(table.querySelectorAll(":scope > tbody > tr, :scope > tr"));
    const headRow = rows.find((tr) => tr.querySelector("th"));
    const ths = headRow ? Array.from(headRow.children) : [];
    const whoIdx = ths.findIndex((th) => /^who$/i.test(clean(th.textContent)));
    const dateIdx = ths.findIndex((th) => /follow/i.test(th.textContent));
    const flagIdx = ths.findIndex((th) => clean(th.textContent) === "*");
    if (flagIdx >= 0) { ths[flagIdx].classList.add("asc-flag-head"); ths[flagIdx].title = "Flag"; }

    for (const tr of rows) {
      if (tr === headRow || tr.classList.contains("pager")) continue;
      const tds = Array.from(tr.children);

      if (whoIdx >= 0 && tds[whoIdx] && !tds[whoIdx].querySelector(".asc-who")) {
        const td = tds[whoIdx];
        const raw = clean(td.textContent);
        const chip = el("span", { class: "asc-who" });
        if (raw) {
          chip.textContent = titleCase(raw);
          chip.dataset.initials = initials(raw);
          chip.style.setProperty("--h", String(hueFor(raw.toUpperCase())));
          chip.title = raw;
        } else {
          chip.textContent = "Unassigned";
          chip.dataset.initials = "–";
          chip.classList.add("asc-who--unassigned");
        }
        td.replaceChildren(chip);
      }

      if (dateIdx >= 0 && tds[dateIdx] && !tds[dateIdx].querySelector(".asc-date")) {
        const td = tds[dateIdx];
        const raw = clean(td.textContent);
        const date = parseShortDate(raw);
        const pill = el("span", { class: "asc-date", text: raw });
        if (date) {
          const diff = dayDiff(date);
          if (diff < 0) pill.classList.add("asc-date--overdue");
          else if (diff === 0) pill.classList.add("asc-date--today");
          else if (diff <= 3) pill.classList.add("asc-date--soon");
          const rel = relLabel(diff);
          if (rel) pill.append(el("span", { class: "asc-date-rel", text: "· " + rel }));
          pill.title = date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        }
        td.replaceChildren(pill);
      }

      if (flagIdx >= 0 && tds[flagIdx]) {
        tds[flagIdx].classList.add("asc-flag-cell");
        if (!clean(tds[flagIdx].textContent)) tds[flagIdx].textContent = "";
      }
    }
  }

  /* ---------- layout: resizer + single-column fallback ----------------- */
  function mainRow() {
    const wrap = document.querySelector("#content_ctl00 > .g-pa-15");
    return wrap ? wrap.querySelector(":scope > .row:nth-child(2)") : null;
  }

  function applySplit(ratio) {
    const host = document.getElementById("content_div") || document.documentElement;
    if (ratio == null) {
      host.style.removeProperty("--asc-split-left");
      host.style.removeProperty("--asc-split-right");
    } else {
      host.style.setProperty("--asc-split-left", `${ratio}fr`);
      host.style.setProperty("--asc-split-right", `${1 - ratio}fr`);
    }
  }

  function updateSingleColumn() {
    const row = mainRow();
    if (!row) return;
    const jobs = document.getElementById("content_div_jobs");
    const tasks = document.getElementById("content_div_tasks");
    const usable = (c) => c && !c.querySelector(".card.asc-collapsed") && !c.classList.contains("asc-collapsed");
    row.classList.toggle("asc-single", !(usable(jobs) && usable(tasks)));
  }

  function ensureResizer() {
    const row = mainRow();
    if (!row || row.querySelector(".asc-resizer")) return;

    const handle = el("div", {
      class: "asc-resizer",
      role: "separator",
      "aria-orientation": "vertical",
      title: "Drag to resize · double-click to reset",
    });
    row.append(handle);

    let dragging = false;
    const onMove = (e) => {
      if (!dragging) return;
      const rect = row.getBoundingClientRect();
      const ratio = Math.min(0.75, Math.max(0.25, (e.clientX - rect.left) / rect.width));
      applySplit(ratio);
      store.set("split", ratio.toFixed(3));
    };
    const stop = () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove("is-dragging");
      document.body.classList.remove("asc-dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      handle.classList.add("is-dragging");
      document.body.classList.add("asc-dragging");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    });
    handle.addEventListener("dblclick", () => {
      applySplit(null);
      store.del("split");
    });
  }

  /* ---------- fit the two big lists to the viewport -------------------- */
  function fitLists() {
    // Only limit heights when the two lists sit side by side (see the
    // container query in dashboard.css); in one-column mode the page scrolls.
    const row = mainRow();
    const wide = !!row && getComputedStyle(row).gridTemplateColumns.trim().split(/\s+/).length > 1;
    const phone = document.getElementById("content_div_phone");
    const phoneCard = phone && phone.querySelector(".card");
    // Keep a small collapsed Phone List visible below the lists; a full one scrolls.
    const reserve = 28 + (phoneCard && phoneCard.classList.contains("asc-collapsed") ? phone.offsetHeight + 16 : 0);
    for (const id of ["content_div_jobs", "content_div_tasks"]) {
      const wrapper = document.getElementById(id);
      const body = wrapper && wrapper.querySelector(".card > .asc-body");
      if (!body) continue;
      if (!wide) { body.style.maxHeight = ""; continue; }
      const top = body.getBoundingClientRect().top + window.scrollY;
      const foot = wrapper.querySelector(".card > .asc-foot");
      const footH = foot ? foot.offsetHeight : 0;
      body.style.maxHeight = Math.max(260, window.innerHeight - top - reserve - footH) + "px";
    }
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitLists, 80);
  });

  /* ---------- toolbar tidy-up ------------------------------------------ */
  function tidyToolbar() {
    const wrap = document.querySelector("#content_ctl00 > .g-pa-15");
    const bar = wrap && wrap.querySelector(":scope > .row:first-child > .col-lg-6");
    if (!bar || bar.dataset.ascEnhanced) return;
    bar.dataset.ascEnhanced = "1";
    // Strip the literal &nbsp; runs the server puts between the toggles
    for (const n of Array.from(bar.childNodes)) {
      if (n.nodeType === Node.TEXT_NODE && !clean(n.textContent)) n.remove();
    }
  }

  /* ---------- main ------------------------------------------------------ */
  let scheduled = false;
  let observer;

  function enhance() {
    const panel = document.getElementById("content_ctl00");
    if (!panel) return;

    tidyToolbar();
    for (const [id, key] of Object.entries(CARD_KEYS)) {
      const wrapper = document.getElementById(id);
      if (!wrapper) continue;
      const card = wrapper.classList.contains("card") ? wrapper : wrapper.querySelector(":scope > .card");
      if (card) enhanceCard(card, key);
    }
    ensureResizer();
    updateSingleColumn();
    fitLists();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      observer.disconnect();
      try { enhance(); } finally { observe(); }
    });
  }

  function observe() {
    const target = document.getElementById("content_div") || document.body;
    observer.observe(target, { childList: true, subtree: true });
  }

  observer = new MutationObserver(schedule);

  const savedSplit = parseFloat(store.get("split"));
  if (!Number.isNaN(savedSplit)) applySplit(savedSplit);

  enhance();
  observe();
})();
