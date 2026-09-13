/* ==========================================================================
   TintPro Restyle — pages/schedule.js
   Dashboard day view (/trunk/welcome/dashboard.aspx) and Calendar week view
   (/trunk/calendar/calendar.aspx).

   The server renders the schedule as a <table> with one row per half hour
   and one extra <td rowspan=N> per appointment. With many simultaneous
   appointments the table grows sideways and overflows the screen. We take
   the table apart and rebuild it as an agenda:

     day view  → one row per time slot, appointments wrap in a grid
     week view → one column per day, appointments stack vertically

   Everything interactive is MOVED, not copied: the .droptarget time cells
   (the page's drop handler checks className === "droptarget" and posts the
   cell id "date|HH:MM"), the draggable move handles, links, tooltips.
   ========================================================================== */
(() => {
  "use strict";
  if (window.ASC && window.ASC.off) return; // settings hub: leave the page alone
  const { el, clean, store, norm } = window.ASC;

  const page = window.ASC.path();
  const isDashboard = /dashboard\.aspx/i.test(page);
  const isDay = isDashboard || /calendar_one\.aspx/i.test(page);
  const isMonth = /calendar_mo\.aspx/i.test(page);
  const viewKey = isDay ? "day" : "week";

  /* ---------- small helpers ------------------------------------------- */
  const parseSlot = (id) => {
    const m = /^(.+)\|(\d{1,2}):(\d{2})$/.exec(id || "");
    return m ? { date: m[1], h: Number(m[2]), m: Number(m[3]), time: `${m[2]}:${m[3]}` } : null;
  };
  const clock = (h, m) => `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "a" : "p"}`;
  const duration = (span) => {
    const mins = span * 30, h = Math.floor(mins / 60), mm = mins % 60;
    return `${h ? h + "h" : ""}${mm ? (h ? " " : "") + mm + "m" : ""}` || "30m";
  };
  const colourOf = (td) => {
    for (const c of td.classList) if (c.startsWith("borderit-") && c.length > 9) return c.slice(9);
    return "";
  };

  /* ---------- turn an appointment <td> into a card ------------------- */
  function buildCard(td, slot, span) {
    const card = el("div", { class: "asc-appt" });
    const colour = colourOf(td);
    if (colour) { card.style.setProperty("--c", colour); card.dataset.colour = colour; }
    if (td.classList.contains("tdblockout")) card.classList.add("asc-appt--blockout");
    card.dataset.span = String(span);

    // Move all content across, then organise it
    const content = el("div", { class: "asc-appt-content" });
    while (td.firstChild) content.append(td.firstChild);

    // Drag handle (keeps its id → the page's dragstart reads event.target.id)
    const handle = content.querySelector("i[draggable]");
    const top = el("div", { class: "asc-appt-top" });
    top.append(el("span", { class: "asc-appt-time", text: `${clock(slot.h, slot.m)} · ${duration(span)}` }));
    if (handle) {
      handle.classList.add("asc-appt-drag");
      handle.replaceChildren(window.ASC.icon("move"));
      top.append(handle);
    }

    // Title = everything before the first <br>, minus the handle
    const head = el("div", { class: "asc-appt-head" });
    const body = el("div", { class: "asc-appt-body" });
    let seenBr = false;
    for (const n of Array.from(content.childNodes)) {
      if (!seenBr && n.nodeName === "BR") { seenBr = true; n.remove(); continue; }
      // the action-icon block (and anything after it) always belongs to the body,
      // even when the server emitted no <br> at all (calendar_one.aspx)
      if (!seenBr && n.nodeType === 1 && n.matches("div.g-pt-2")) seenBr = true;
      (seenBr ? body : head).append(n);
    }
    // Inside the title link there is often "Title<br>address … NAME": split it
    const info = head.querySelector("a.info");
    let meta = null;
    if (info) {
      let br = info.querySelector("br");
      // calendar_one.aspx glues "Site - Customer7327 Street…" together: split
      // where the street number starts and pretend there was a <br>
      if (!br && info.childNodes.length === 1 && info.firstChild.nodeType === Node.TEXT_NODE) {
        const m = /^(.*?[A-Za-z.)'"])(\d{2,}\s+\S.*)$/.exec(info.textContent);
        if (m) {
          // "City - NameName" → the server repeats the customer after the site name
          let title = m[1];
          const d = /^(.*?\s-\s)(.+?)\2$/.exec(title);
          if (d) title = d[1] + d[2];
          info.replaceChildren(document.createTextNode(title), (br = document.createElement("br")), document.createTextNode(m[2]));
        }
      }
      if (br) {
        meta = el("span", { class: "asc-appt-meta" });
        let after = false;
        for (const n of Array.from(info.childNodes)) {
          if (n === br) { after = true; n.remove(); continue; }
          if (after) meta.append(n);
        }
        info.append(meta);
      }
      info.classList.add("asc-appt-title");
      // The HTML parser splits nested <a> (phone links) out of a.info, so the
      // rest of the address line follows as siblings: pull them back in.
      if (meta) for (const n of Array.from(head.childNodes)) if (n !== info) meta.append(n);
    }

    card.append(top, head);
    if (body.childNodes.length) card.append(body);

    // Text nodes: "&nbsp; EMPLOYEE NAME &nbsp; Section(s) 21 $3,959.00 20 Panes …"
    // → assignee chip + stats line; other text stays as plain text.
    const NAME_RUN = /^(.*?)(?:^|\s)([A-Z][A-Z'.\-]+(?:\s+[A-Z][A-Z'.\-]+)+)\s*(Section\(s\).*)?$/s;
    const isName = (t) => t.length > 2 && /^[A-Z][A-Z .'\-]+$/.test(t);
    const stats = (t) => el("span", { class: "asc-appt-stats", text: clean(t).replace(/\s{2,}/g, " · ").replace(/Section\(s\)/, "Sections") });
    const who = (t) => { const w = el("span", { class: "asc-appt-who", text: t }); w.style.setProperty("--h", String(window.ASC.hue(t))); return w; };
    for (const holder of [head, meta, body]) {
      if (!holder) continue;
      for (const n of Array.from(holder.childNodes)) {
        if (n.nodeType !== Node.TEXT_NODE) continue;
        const t = clean(n.textContent);
        if (!t) { n.remove(); continue; }
        if (isName(t)) { n.replaceWith(who(t)); continue; }
        const m = NAME_RUN.exec(t);
        if (m && m[2]) {
          const frag = document.createDocumentFragment();
          if (clean(m[1])) frag.append(el("span", { class: "asc-appt-text", text: clean(m[1]) + " " }));
          frag.append(who(m[2]));
          if (m[3]) frag.append(stats(m[3]));
          n.replaceWith(frag);
        } else if (/^Section\(s\)/.test(t)) {
          n.replaceWith(stats(t));
        } else {
          n.replaceWith(el("span", { class: "asc-appt-text", text: t }));
        }
      }
    }
    for (const a of card.querySelectorAll("a[title='View Job']")) a.classList.add("asc-job");
    for (const sp of card.querySelectorAll("span.sttus")) { sp.classList.add("asc-badge"); sp.dataset.status = norm(sp.textContent); }
    for (const a of card.querySelectorAll("a[href^='tel:']")) a.classList.add("asc-tel");
    const actions = body.querySelector("div.g-pt-2");
    if (actions) actions.classList.add("asc-appt-actions");

    // Chips row: assignee · job · status ; stats line after it
    const chips = el("div", { class: "asc-appt-chips" });
    for (const n of card.querySelectorAll(".asc-appt-who, .asc-job, .asc-badge")) chips.append(n);
    if (chips.childNodes.length) head.after(chips);
    const statLines = card.querySelectorAll(".asc-appt-stats");
    if (statLines.length) {
      const wrap = el("div", { class: "asc-appt-statline" });
      for (const st of statLines) wrap.append(st);
      (chips.parentNode ? chips : head).after(wrap);
    }

    // Icon-only links left in the body (calendar: payment "$", notes star) → actions
    const loose = Array.from(body.children).filter((n) => n.tagName === "A" && !clean(n.textContent));
    if (loose.length) {
      let act = body.querySelector(".asc-appt-actions");
      if (!act) { act = el("div", { class: "asc-appt-actions" }); body.append(act); }
      for (const a of loose) act.append(a);
    }
    if (!clean(body.textContent) && !body.querySelector("a, img, i")) body.remove();

    return card;
  }

  /* ---------- parse a schedule table ---------------------------------- */
  // Returns { days: Map(date → {label, extra, slots: Map(time → {slot, target, cards[]})}), order: [dates] }
  function parseTable(table) {
    const days = new Map();
    const order = [];
    const dayFor = (date) => {
      if (!days.has(date)) { days.set(date, { date, slots: new Map(), slotOrder: [] }); order.push(date); }
      return days.get(date);
    };
    const rows = Array.from(table.querySelectorAll(":scope > tbody > tr, :scope > tr"));
    for (const tr of rows) {
      let current = null;
      for (const td of Array.from(tr.children)) {
        const target = td.querySelector(".droptarget");
        if (target) {
          const slot = parseSlot(target.id);
          if (!slot) continue;
          const day = dayFor(slot.date);
          const entry = { slot, target, cards: [], off: false };
          day.slots.set(slot.time, entry);
          day.slotOrder.push(slot.time);
          current = entry;
          continue;
        }
        if (td.classList.contains("tdtime") || td.classList.contains("tdblockout") || td.hasAttribute("rowspan")) {
          if (!current || !clean(td.textContent)) continue;
          const span = Math.max(1, parseInt(td.getAttribute("rowspan") || "1", 10));
          current.cards.push(buildCard(td, current.slot, span));
          continue;
        }
        // grey "off-hours" filler: mark the current slot as off
        if (current && /f2f2f2/i.test(td.getAttribute("style") || "") && !current.cards.length) current.off = true;
      }
    }
    return { days, order };
  }

  /* ---------- render ---------------------------------------------------- */
  function slotRow(entry, compact) {
    const row = el("div", { class: "asc-slot" + (entry.cards.length ? "" : " asc-slot--empty") + (entry.slot.m === 0 ? " asc-slot--hour" : " asc-slot--half") + (entry.off ? " asc-slot--off" : "") });
    row.dataset.time = entry.slot.time;
    const label = el("div", { class: "asc-slot-time" });
    label.append(entry.target); // the droptarget itself (div on the dashboard, <a> on the calendar)
    row.append(label);
    const body = el("div", { class: "asc-slot-body" + (compact ? " asc-slot-body--stack" : "") });
    for (const c of entry.cards) body.append(c);
    row.append(body);
    return row;
  }

  function densityControl(host) {
    const saved = store.get(`sched-density:${viewKey}`) || (isDay ? "all" : "hours");
    const sel = el("select", { class: "asc-density custom-select", title: "Which empty time slots to show (drop targets for drag & drop)" });
    for (const [v, t] of [["all", "All slots"], ["hours", "Hourly slots"], ["busy", "Busy only"]]) {
      sel.append(el("option", { value: v, text: t }));
    }
    sel.value = saved;
    const apply = () => {
      host.classList.remove("asc-density-all", "asc-density-hours", "asc-density-busy");
      host.classList.add("asc-density-" + sel.value);
      store.set(`sched-density:${viewKey}`, sel.value);
    };
    sel.addEventListener("change", apply);
    apply();
    return el("label", { class: "asc-density-wrap" }, [el("span", { text: "Show" }), sel]);
  }

  function renderDay(parsed, table) {
    const host = el("div", { class: "asc-agenda asc-agenda--day" });
    const toolbar = el("div", { class: "asc-agenda-toolbar" });
    const count = [...parsed.days.values()].reduce((n, d) => n + [...d.slots.values()].reduce((m, s) => m + s.cards.length, 0), 0);
    toolbar.append(el("span", { class: "asc-agenda-count", text: `${count} appointment${count === 1 ? "" : "s"}` }));
    toolbar.append(densityControl(host));
    host.append(toolbar);
    for (const date of parsed.order) {
      const day = parsed.days.get(date);
      const list = el("div", { class: "asc-slots" });
      for (const t of day.slotOrder) list.append(slotRow(day.slots.get(t), false));
      host.append(list);
    }
    table.parentNode.insertBefore(host, table);
    table.hidden = true;
    table.classList.add("asc-reflowed");
  }

  // All weeks/tables → ONE horizontal strip of day columns. Scrolls sideways
  // (and vertically inside itself) instead of stacking weeks down the page.
  function renderStrip(entries) {
    const host = el("div", { class: "asc-agenda asc-agenda--week" });
    const toolbar = el("div", { class: "asc-agenda-toolbar" });
    let count = 0;
    for (const { parsed } of entries) for (const d of parsed.days.values()) for (const sl of d.slots.values()) count += sl.cards.length;
    toolbar.append(el("span", { class: "asc-agenda-count", text: `${count} appointment${count === 1 ? "" : "s"}` }));
    const nav = el("div", { class: "asc-strip-nav" }, [
      el("button", { type: "button", class: "asc-icon-btn", title: "Scroll left" }, [window.ASC.icon("left")]),
      el("button", { type: "button", class: "asc-icon-btn", title: "Scroll right" }, [window.ASC.icon("right")]),
    ]);
    toolbar.append(nav, densityControl(host));
    host.append(toolbar);

    const strip = el("div", { class: "asc-week" });
    for (const { parsed, table } of entries) {
      const heads = new Map();
      Array.from(table.querySelectorAll(":scope > thead th")).forEach((th, i) => {
        heads.set(i, { name: clean(th.querySelector("b") ? th.querySelector("b").textContent : th.textContent.split("\n")[0]), link: th.querySelector("a"), holiday: th.querySelector(".holiday") });
      });
      parsed.order.forEach((date, i) => {
        const day = parsed.days.get(date);
        const head = heads.get(i) || {};
        const col = el("section", { class: "asc-day" });
        col.dataset.date = date;
        const n = [...day.slots.values()].reduce((m, sl) => m + sl.cards.length, 0);
        const h = el("header", { class: "asc-day-head" });
        h.append(el("span", { class: "asc-day-name", text: head.name || "" }));
        if (head.link) { head.link.classList.add("asc-day-date"); h.append(head.link); }
        else h.append(el("span", { class: "asc-day-date", text: date }));
        h.append(el("span", { class: "asc-day-count", text: String(n) }));
        if (head.holiday) { head.holiday.classList.add("asc-day-holiday"); h.append(head.holiday); }
        col.append(h);
        if (n === 0) col.classList.add("asc-day--empty");
        const list = el("div", { class: "asc-slots" });
        for (const t of day.slotOrder) list.append(slotRow(day.slots.get(t), true));
        col.append(list);
        strip.append(col);
      });
      table.hidden = true;
      table.classList.add("asc-reflowed");
    }
    host.append(strip);
    const first = entries[0].table;
    first.parentNode.insertBefore(host, first);

    const [prev, next] = nav.querySelectorAll("button");
    const step = () => Math.max(240, Math.round(strip.clientWidth * 0.8));
    prev.addEventListener("click", () => strip.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => strip.scrollBy({ left: step(), behavior: "smooth" }));
    // Shift+wheel is the native way; also let a plain vertical wheel over the
    // strip scroll it sideways when it has no vertical room left.
    strip.addEventListener("wheel", (e) => {
      if (e.deltaY && !e.deltaX && strip.scrollHeight <= strip.clientHeight + 1) { strip.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });

    const fit = () => {
      const top = strip.getBoundingClientRect().top + window.scrollY;
      strip.style.maxHeight = Math.max(320, window.innerHeight - top - 24) + "px";
    };
    fit();
    window.addEventListener("resize", fit);
    // scroll to today (or the first day with appointments)
    const today = new Date();
    const key = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const target = strip.querySelector(`.asc-day[data-date="${key}"]`) || strip.querySelector(".asc-day:not(.asc-day--empty)");
    if (target) strip.scrollLeft = Math.max(0, target.offsetLeft - 8);
  }

  /* ---------- month view (calendar_mo.aspx): light touch ---------------- */
  function enhanceMonth() {
    const grid = document.querySelector("#content_div table");
    const cells = document.querySelectorAll("#content_div td.month, #content_div td.blank");
    if (!cells.length) return;
    const table = cells[0].closest("table");
    table.classList.add("asc-month");
    for (const br of table.querySelectorAll("td.month > br, td.blank > br")) br.remove();
    for (const td of table.querySelectorAll("td.month")) {
      const head = td.querySelector("strong");
      if (head) head.classList.add("asc-mo-daynum");
      for (const appt of td.querySelectorAll("div.tdtime")) {
        appt.classList.add("asc-mo-appt");
        const colour = colourOf(appt);
        if (colour) appt.style.setProperty("--c", colour);
        const info = appt.querySelector("a.info");
        if (info) {
          const pop = info.querySelector("span");
          if (pop) pop.classList.add("asc-mo-pop");
          // "6 - 2PM  Title" → time chip + title
          const first = info.firstChild;
          if (first && first.nodeType === Node.TEXT_NODE) {
            const m = /^\s*([\d:]+\s*-\s*[\d:]+\s*(?:AM|PM)?)\s+(.*)$/i.exec(first.textContent);
            if (m) {
              first.replaceWith(el("span", { class: "asc-mo-time", text: m[1].replace(/\s+/g, " ") }), el("span", { class: "asc-mo-title", text: " " + clean(m[2]) }));
            }
          }
        }
        for (const a of appt.querySelectorAll("a[title='View Job']")) a.classList.add("asc-job");
        for (const sp of appt.querySelectorAll("span.sttus")) { sp.classList.add("asc-badge"); sp.dataset.status = norm(sp.textContent); }
        const loose = Array.from(appt.children).filter((n) => n.tagName === "A" && !clean(n.textContent));
        if (loose.length) { const act = el("span", { class: "asc-mo-actions" }); for (const a of loose) act.append(a); appt.append(act); }
      }
    }
    // Day-name header row and the month title row
    const rows = Array.from(table.querySelectorAll(":scope > tbody > tr"));
    if (rows[0]) rows[0].classList.add("asc-mo-title-row");
    if (rows[1]) rows[1].classList.add("asc-mo-dow-row");
  }

  /* ---------- page chrome ---------------------------------------------- */
  function tidyDashboardChrome() {
    // Filter bar buttons: swap icon-font glyphs for SVGs so they don't show as boxes
    const map = { bt_goback: "left", bt_goforward: "right" };
    for (const [id, icon] of Object.entries(map)) {
      const b = document.getElementById("content_" + id);
      if (b && !b.dataset.ascIcon) { b.dataset.ascIcon = "1"; b.replaceChildren(window.ASC.icon(icon)); }
    }
    for (const b of document.querySelectorAll("#content_div button[title='Add Appointment']")) {
      if (!b.dataset.ascIcon) { b.dataset.ascIcon = "1"; b.replaceChildren(window.ASC.icon("plusSmall"), document.createTextNode(" Add")); }
    }
    for (const b of document.querySelectorAll("#content_div button[title='View Map']")) {
      if (!b.dataset.ascIcon) { b.dataset.ascIcon = "1"; b.replaceChildren(window.ASC.icon("map"), document.createTextNode(" Map")); }
    }
  }

  function boot() {
    document.body.classList.add(isDay ? "asc-sched-day" : isMonth ? "asc-sched-month" : "asc-sched-week");
    tidyDashboardChrome();
    if (isMonth) { enhanceMonth(); return; }
    const tables = isDay
      ? Array.from(document.querySelectorAll("#content_panel_calendar table"))
      : Array.from(document.querySelectorAll("#content_div table.table-fixed"));
    const entries = [];
    for (const table of tables) {
      if (table.classList.contains("asc-reflowed") || !table.querySelector(".droptarget")) continue;
      const parsed = parseTable(table);
      if (!parsed.order.length) continue;
      if (isDay && parsed.order.length === 1) renderDay(parsed, table);
      else entries.push({ parsed, table });
    }
    if (entries.length) renderStrip(entries);
  }

  if (!window.ASC.ICONS.move) {
    window.ASC.ICONS.move = [["polyline", { points: "5 9 2 12 5 15" }], ["polyline", { points: "9 5 12 2 15 5" }], ["polyline", { points: "15 19 12 22 9 19" }], ["polyline", { points: "19 9 22 12 19 15" }], ["line", { x1: 2, x2: 22, y1: 12, y2: 12 }], ["line", { x1: 12, x2: 12, y1: 2, y2: 22 }]];
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
