/* ==========================================================================
   TintPro Restyle — common/shell.js
   Standalone pages (report output, Accounts Receivable) have no app chrome,
   so getting back to where you came from meant the browser Back button.
   This adds the same left sidebar those pages lack.

   Applies when: the page has no #sideNav, is not a frameset or the login
   page, is not a popup window, and is either the top window or the *menu*
   frame of a menu|main frameset (Settings, Accounts Receivable, Inventory —
   links there navigate the top window). Those framesets get their menu
   column widened to fit the sidebar next to the original menu.
   ========================================================================== */
(() => {
  "use strict";
  const ASC = window.ASC || {};
  if (ASC.off) return;
  const { el, icon, path, store } = ASC;

  const NAV = [
    ["Home", "/trunk/welcome/", "home"],
    ["Dashboard", "/trunk/welcome/dashboard.aspx?zz=1", "dashboard"],
    ["Inbox & Sent", "/trunk/cust_contact_sent.aspx?zz=1", "mail"],
    ["More", null, "more", [
      ["Social Media", "/trunk/admin/photo_library.aspx", "megaphone"],
      ["Messages", "/trunk/text_list.aspx?zz=1", "message"],
      ["To-Do Lists", "/trunk/todo_list.aspx?zz=1", "checks"],
    ]],
    ["Calendar", "/trunk/calendar/calendar.aspx?zz=1", "calendar"],
    ["New Job", "/trunk/edit_cust.aspx?zz=1", "plus"],
    ["Sales Reports", "/trunk/admin/salesman_rpt.aspx?zz=1", "chart"],
    ["Admin Reports", "/trunk/admin/report_menu.aspx?zz=1", "file"],
    ["Accounts Receivable", "/trunk/ar/default_ar.aspx?zz=1", "dollar"],
    ["Inventory", "/Inv/start_admin.aspx?zz=1", "package"],
    ["Payroll", "/payroll/menu.aspx?zz=1", "banknote"],
    ["Settings", "/trunk/admin/?zz=1", "settings"],
    ["Bill To", "/trunk/admin/referrals.aspx?zz=1", "building"],
    ["Employees", "/trunk/admin/employees.aspx?zz=1", "users"],
    ["Tutorials", "/portal/help_videos.aspx?zz=1", "play"],
    ["Help", "/trunk/admin/help.aspx?zz=1", "help"],
    ["Support", "/trunk/em_handler.aspx?stype=support&zz=1", "lifebuoy"],
  ];

  // Settings / AR / Inventory are "menu,*" framesets: widen the menu column
  // by the sidebar width so the sidebar can live inside the menu frame.
  function widenFrameset() {
    const fs = document.querySelector("frameset[cols]");
    if (!fs || fs.dataset.ascWidened) return;
    const frames = Array.from(fs.querySelectorAll("frame"));
    if (!frames.length || frames[0].getAttribute("name") !== "menu") return;
    const cols = (fs.getAttribute("cols") || "").split(",");
    const first = parseInt(cols[0], 10);
    if (!Number.isFinite(first)) return;
    cols[0] = String(Math.max(first, 250) + 224);
    fs.setAttribute("cols", cols.join(","));
    fs.dataset.ascWidened = "1";
  }

  function wantsShell() {
    if (document.getElementById("sideNav")) return false;
    if (document.querySelector("frameset")) return false;
    if (document.getElementById("login") || document.getElementById("content_ctpwd")) return false; // login page
    if (window.opener) return false;                // popup windows (edit appointment etc.)
    if (window.top === window) return true;
    return !!ASC.frameset && window.name === "menu"; // AR menu frame
  }

  function build() {
    const inFrame = window.top !== window;
    const here = path();
    const aside = el("aside", { class: "asc-shell-nav", "aria-label": "TintPro navigation" });
    const brand = el("div", { class: "asc-shell-brand" });
    const logo = el("a", { href: "/trunk/welcome/", class: "asc-shell-logo", title: "Home" });
    if (inFrame) logo.setAttribute("target", "_top");
    const img = el("img", { src: "/framework/assets/img/logo/tint_pro_logo_trans.png", alt: "TintPro" });
    logo.append(img);
    brand.append(logo);
    if (!inFrame) {
      const toggle = el("button", { type: "button", class: "asc-shell-toggle", title: "Toggle sidebar", "aria-label": "Toggle sidebar" }, [icon("menu")]);
      toggle.addEventListener("click", () => {
        const mini = document.body.classList.toggle("asc-shell-mini");
        store.set("shell-mini", mini ? "1" : "0");
      });
      brand.append(toggle);
    }
    aside.append(brand);

    const list = el("ul", { class: "asc-shell-list" });
    const link = ([label, href, ic]) => {
      const a = el("a", { href, class: "asc-shell-link", title: label }, [
        el("span", { class: "asc-shell-icon" }, [icon(ic, "asc-nav-icon")]),
        el("span", { class: "asc-shell-label", text: label }),
      ]);
      if (inFrame) a.setAttribute("target", "_top");
      const p = href.split("?")[0].toLowerCase();
      if (here === p || (p.endsWith("/") && here === p + "default.aspx")) a.classList.add("asc-active");
      return el("li", {}, [a]);
    };
    let openGroup = store.get("nav-more") === "1";
    for (const item of NAV) {
      if (item[3]) {
        const group = el("li", { class: "asc-shell-group" + (openGroup ? " is-open" : "") });
        const btn = el("button", { type: "button", class: "asc-shell-link asc-shell-group-toggle", "aria-expanded": openGroup ? "true" : "false" }, [
          el("span", { class: "asc-shell-icon" }, [icon(item[2], "asc-nav-icon")]),
          el("span", { class: "asc-shell-label", text: item[0] }),
          icon("chevron", "asc-nav-caret"),
        ]);
        const sub = el("ul");
        for (const child of item[3]) sub.append(link(child));
        btn.addEventListener("click", () => {
          const now = group.classList.toggle("is-open");
          btn.setAttribute("aria-expanded", now ? "true" : "false");
          store.set("nav-more", now ? "1" : "0");
        });
        group.append(btn, sub);
        list.append(group);
      } else {
        list.append(link(item));
      }
    }
    aside.append(list);
    document.body.prepend(aside);
    document.body.classList.add("asc-shell");
    if (inFrame) document.body.classList.add("asc-shell-in-frame");
    else if (store.get("shell-mini") === "1") document.body.classList.add("asc-shell-mini");
  }

  function boot() {
    widenFrameset();
    if (!document.body || document.body.classList.contains("asc-shell")) return;
    if (wantsShell()) build();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
