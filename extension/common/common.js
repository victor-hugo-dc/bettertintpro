/* ==========================================================================
   TintPro Restyle — common/common.js  (runs on every page)

   • shared helpers on window.ASC (el, clean, store, watch, sameTabLinks…)
   • sidebar: modern SVG icons, compact rows, "More" group for rarely used
     items (Messages, To-Do Lists), active item highlight
   • top bar: SVG menu toggler
   • links open in the current tab instead of new windows/tabs
   ========================================================================== */
(() => {
  "use strict";
  const ASC = (window.ASC = window.ASC || {});
  const STORE_PREFIX = "asc-restyle:";

  /* ---------- helpers shared with page scripts ------------------------- */
  ASC.store = {
    get(k) { try { return localStorage.getItem(STORE_PREFIX + k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(STORE_PREFIX + k, v); } catch { /* ignore */ } },
    del(k) { try { localStorage.removeItem(STORE_PREFIX + k); } catch { /* ignore */ } },
  };

  ASC.el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
      else node.setAttribute(k, v);
    }
    for (const c of children) if (c != null) node.append(c);
    return node;
  };

  // Path of the current page. document.baseURI equals the page URL on the
  // live site and honours <base> in the local test harness.
  ASC.path = () => { try { return new URL(document.baseURI).pathname.toLowerCase(); } catch { return location.pathname.toLowerCase(); } };

  ASC.clean = (s) => (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  ASC.norm = (s) => ASC.clean(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  ASC.titleCase = (s) => ASC.clean(s).toLowerCase().replace(/(^|[\s\-'/(])([a-z])/g, (m, p, c) => p + c.toUpperCase());
  ASC.hue = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 360; };

  /* Re-run fn whenever the DOM under target changes (ASP.NET UpdatePanels
     replace whole subtrees). fn must be idempotent. */
  ASC.watch = (target, fn) => {
    let scheduled = false;
    const obs = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        obs.disconnect();
        try { fn(); } finally { obs.observe(target, { childList: true, subtree: true }); }
      });
    });
    fn();
    obs.observe(target, { childList: true, subtree: true });
    return obs;
  };

  /* ---------- same-tab navigation -------------------------------------- */
  // The app opens most things in new windows (target="_blank" and named
  // targets like "Edit_Job"). Strip those so links replace the current page;
  // Ctrl/Cmd-click still opens a new tab as usual.
  // A target that names a real frame in this window tree (e.g. the "right"
  // pane of Accounts Receivable) must be kept; only "new window" targets go.
  function frameExists(name) {
    if (!name || name.startsWith("_")) return name === "_parent" || name === "_top";
    const seen = new Set();
    const walk = (w) => {
      if (!w || seen.has(w)) return false;
      seen.add(w);
      try {
        for (let i = 0; i < w.frames.length; i++) {
          const f = w.frames[i];
          if (f.name === name) return true;
          if (walk(f)) return true;
        }
      } catch (e) { /* cross-origin */ }
      return false;
    };
    try { return walk(window.top); } catch (e) { return false; }
  }
  ASC.frameExists = frameExists;

  // Inside a menu|main frameset a link that used to open a new window should
  // load in the main pane, not replace the menu. Returns the pane's frame
  // name, or null when we are the pane (or not in a frameset).
  function contentFrameName() {
    const fs = ASC.frameset;
    if (!fs) return null;
    try {
      const frames = Array.from(fs.frames);
      const byName = (n) => frames.find((f) => f.name === n);
      const pane = byName("main") || byName("right") || frames.filter((f) => f.name !== "menu").pop();
      if (!pane || pane === window) return null;
      return pane.name || null;
    } catch (e) { return null; }
  }
  ASC.contentFrameName = contentFrameName;

  function retarget(elm) {
    const t = elm.getAttribute("target");
    if (t === "_self" || frameExists(t)) return;
    const pane = contentFrameName();
    if (pane) elm.setAttribute("target", pane);
    else elm.removeAttribute("target");
  }
  function sameTabLinks(root) {
    for (const a of root.querySelectorAll("a[target]")) retarget(a);
    for (const f of root.querySelectorAll("form[target]")) retarget(f);
  }
  ASC.sameTabLinks = sameTabLinks;

  /* ---------- sidebar -------------------------------------------------- */
  const ICON_BY_TITLE = {
    "home": "home", "dashboard": "dashboard", "inbox & sent": "mail", "social media": "megaphone",
    "messages": "message", "to-do lists": "checks", "calendar": "calendar", "new job": "plus",
    "sales reports": "chart", "admin reports": "file", "accounts receivable": "dollar",
    "inventory": "package", "payroll": "banknote", "settings": "settings", "bill to": "building",
    "employees": "users", "tutorials": "play", "help instructions": "help", "help": "help",
    "support": "lifebuoy", "log out": "logout",
  };
  const GROUPED = ["social media", "messages", "to-do lists"]; // moved under "More"

  function enhanceSidebar() {
    const menu = document.getElementById("sideNavMenu");
    if (!menu || menu.dataset.ascEnhanced) return;
    menu.dataset.ascEnhanced = "1";

    const here = ASC.path();
    const groupItems = [];

    for (const li of Array.from(menu.children)) {
      const link = li.querySelector("a.u-side-nav--top-level-menu-link");
      if (!link) continue;
      const i = link.querySelector("i");
      const label = ASC.clean((link.querySelector(".media-body") || link).textContent);
      const key = (i && i.getAttribute("title") ? i.getAttribute("title") : label).toLowerCase();
      const iconName = ICON_BY_TITLE[key] || ICON_BY_TITLE[label.toLowerCase()] || "help";

      const holder = link.querySelector("span.d-flex") || link.firstElementChild;
      if (holder) {
        holder.replaceChildren(ASC.icon(iconName, "asc-nav-icon"));
        holder.setAttribute("title", label);
      }
      link.setAttribute("title", label);

      // Active state: match on pathname (ignore query)
      const href = (link.getAttribute("href") || "").split("?")[0].toLowerCase();
      if (href && href !== "#" && !href.startsWith("javascript:")) {
        const path = href.replace(/\/default\.aspx$/, "/");
        if (here === path || (path.endsWith("/") && here === path + "default.aspx")) link.classList.add("asc-active");
        if (path === "/trunk/welcome/" && (here === "/trunk/welcome/" || here === "/trunk/welcome/default.aspx")) link.classList.add("asc-active");
        if (path.endsWith("edit_cust.aspx") && here.endsWith("edit_cust.aspx")) link.classList.add("asc-active");
      }

      if (GROUPED.includes(label.toLowerCase())) groupItems.push(li);
    }

    // Build the "More" group where the first grouped item was, then move the
    // grouped items into it.
    if (groupItems.length) {
      const group = ASC.el("li", { class: "asc-nav-group u-sidebar-navigation-v1-menu-item" });
      const toggle = ASC.el("button", { type: "button", class: "asc-nav-group-toggle", title: "More", "aria-expanded": "false" }, [
        ASC.el("span", {}, [ASC.icon("more", "asc-nav-icon")]),
        ASC.el("span", { class: "media-body hide-mini", text: "More" }),
        ASC.icon("chevron", "asc-nav-caret"),
      ]);
      const list = ASC.el("ul");
      group.append(toggle, list);
      menu.insertBefore(group, groupItems[0]);
      for (const li of groupItems) list.append(li);

      const open = ASC.store.get("nav-more") === "1";
      group.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.addEventListener("click", () => {
        const now = group.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", now ? "true" : "false");
        ASC.store.set("nav-more", now ? "1" : "0");
      });
      // If the current page is inside the group, keep it open
      if (list.querySelector(".asc-active")) group.classList.add("is-open");
    }

    // A separator before Log Out
    const logout = Array.from(menu.querySelectorAll("a")).find((a) => /log out/i.test(a.textContent));
    if (logout && logout.closest("li")) {
      menu.insertBefore(ASC.el("li", { class: "asc-nav-sep", "aria-hidden": "true" }), logout.closest("li"));
    }
  }

  function enhanceHeader() {
    const toggler = document.querySelector("#js-header .u-header__nav-toggler");
    if (toggler && !toggler.dataset.ascEnhanced) {
      toggler.dataset.ascEnhanced = "1";
      toggler.replaceChildren(ASC.icon("menu"));
      toggler.setAttribute("title", "Toggle sidebar");
    }
    const search = document.querySelector("#js-header #btn_search");
    if (search && !search.dataset.ascEnhanced) {
      search.dataset.ascEnhanced = "1";
      search.replaceChildren(ASC.icon("search"));
    }
  }

  /* ---------- boot ----------------------------------------------------- */
  function boot() {
    if (ASC.off) return; // login page (see gate.js)
    // A full-chrome page (Bill To's, Employees…) loaded into the main pane of
    // a frameset would show its own sidebar next to the frameset's: hide it,
    // the sidebar in the menu frame is the one to use.
    if (ASC.frameset && document.getElementById("sideNav")) document.documentElement.classList.add("asc-in-pane");
    enhanceSidebar();
    enhanceHeader();
    sameTabLinks(document);
    // keep links same-tab after partial postbacks / dynamic content
    const obs = new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) sameTabLinks(n);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
