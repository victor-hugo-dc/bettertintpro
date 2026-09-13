/* ==========================================================================
   TintPro Restyle — common/icons.js
   Small inline SVG icon set (24x24 outline, Lucide-style geometry). Icons are
   built with DOM APIs (no innerHTML) so they pass add-on review.
   ========================================================================== */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  // Each icon: list of [tag, {attrs}]
  const ICONS = {
    home: [["path", { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }], ["polyline", { points: "9 22 9 12 15 12 15 22" }]],
    dashboard: [["rect", { width: 7, height: 9, x: 3, y: 3, rx: 1 }], ["rect", { width: 7, height: 5, x: 14, y: 3, rx: 1 }], ["rect", { width: 7, height: 9, x: 14, y: 12, rx: 1 }], ["rect", { width: 7, height: 5, x: 3, y: 16, rx: 1 }]],
    mail: [["rect", { width: 20, height: 16, x: 2, y: 4, rx: 2 }], ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }]],
    megaphone: [["path", { d: "m3 11 18-5v12L3 14v-3z" }], ["path", { d: "M11.6 16.8a3 3 0 1 1-5.8-1.6" }]],
    message: [["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }]],
    checks: [["path", { d: "m3 17 2 2 4-4" }], ["path", { d: "m3 7 2 2 4-4" }], ["path", { d: "M13 6h8" }], ["path", { d: "M13 12h8" }], ["path", { d: "M13 18h8" }]],
    calendar: [["rect", { width: 18, height: 18, x: 3, y: 4, rx: 2, ry: 2 }], ["line", { x1: 16, x2: 16, y1: 2, y2: 6 }], ["line", { x1: 8, x2: 8, y1: 2, y2: 6 }], ["line", { x1: 3, x2: 21, y1: 10, y2: 10 }]],
    plusSmall: [["path", { d: "M12 5v14" }], ["path", { d: "M5 12h14" }]],
    plus: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "M8 12h8" }], ["path", { d: "M12 8v8" }]],
    chart: [["path", { d: "M3 3v18h18" }], ["path", { d: "M18 17V9" }], ["path", { d: "M13 17V5" }], ["path", { d: "M8 17v-3" }]],
    file: [["path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }], ["polyline", { points: "14 2 14 8 20 8" }], ["line", { x1: 16, x2: 8, y1: 13, y2: 13 }], ["line", { x1: 16, x2: 8, y1: 17, y2: 17 }], ["line", { x1: 10, x2: 8, y1: 9, y2: 9 }]],
    dollar: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" }], ["path", { d: "M12 18V6" }]],
    package: [["path", { d: "m7.5 4.27 9 5.15" }], ["path", { d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" }], ["path", { d: "m3.3 7 8.7 5 8.7-5" }], ["path", { d: "M12 22V12" }]],
    banknote: [["rect", { width: 20, height: 12, x: 2, y: 6, rx: 2 }], ["circle", { cx: 12, cy: 12, r: 2 }], ["path", { d: "M6 12h.01M18 12h.01" }]],
    settings: [["path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }], ["circle", { cx: 12, cy: 12, r: 3 }]],
    building: [["path", { d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" }], ["path", { d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" }], ["path", { d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" }], ["path", { d: "M10 6h4" }], ["path", { d: "M10 10h4" }], ["path", { d: "M10 14h4" }], ["path", { d: "M10 18h4" }]],
    users: [["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }], ["circle", { cx: 9, cy: 7, r: 4 }], ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }], ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }]],
    play: [["circle", { cx: 12, cy: 12, r: 10 }], ["polygon", { points: "10 8 16 12 10 16 10 8" }]],
    help: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }], ["path", { d: "M12 17h.01" }]],
    lifebuoy: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "m4.93 4.93 4.24 4.24" }], ["path", { d: "m14.83 9.17 4.24-4.24" }], ["path", { d: "m14.83 14.83 4.24 4.24" }], ["path", { d: "m9.17 14.83-4.24 4.24" }], ["circle", { cx: 12, cy: 12, r: 4 }]],
    logout: [["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }], ["polyline", { points: "16 17 21 12 16 7" }], ["line", { x1: 21, x2: 9, y1: 12, y2: 12 }]],
    more: [["circle", { cx: 12, cy: 12, r: 1 }], ["circle", { cx: 19, cy: 12, r: 1 }], ["circle", { cx: 5, cy: 12, r: 1 }]],
    chevron: [["polyline", { points: "6 9 12 15 18 9" }]],
    menu: [["line", { x1: 4, x2: 20, y1: 12, y2: 12 }], ["line", { x1: 4, x2: 20, y1: 6, y2: 6 }], ["line", { x1: 4, x2: 20, y1: 18, y2: 18 }]],
    search: [["circle", { cx: 11, cy: 11, r: 8 }], ["path", { d: "m21 21-4.3-4.3" }]],
    download: [["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }], ["polyline", { points: "7 10 12 15 17 10" }], ["line", { x1: 12, x2: 12, y1: 15, y2: 3 }]],
    sheet: [["rect", { width: 18, height: 18, x: 3, y: 3, rx: 2 }], ["path", { d: "M3 9h18" }], ["path", { d: "M3 15h18" }], ["path", { d: "M9 3v18" }], ["path", { d: "M15 3v18" }]],
    refresh: [["path", { d: "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }], ["path", { d: "M3 3v5h5" }], ["path", { d: "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" }], ["path", { d: "M16 16h5v5" }]],
    x: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
    map: [["polygon", { points: "3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" }], ["line", { x1: 9, x2: 9, y1: 3, y2: 18 }], ["line", { x1: 15, x2: 15, y1: 6, y2: 21 }]],
    left: [["path", { d: "m15 18-6-6 6-6" }]],
    right: [["path", { d: "m9 18 6-6-6-6" }]],
    eye: [["path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }], ["circle", { cx: 12, cy: 12, r: 3 }]],
    eyeOff: [["path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }], ["path", { d: "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" }], ["path", { d: "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" }], ["line", { x1: 2, x2: 22, y1: 2, y2: 22 }]],
  };

  function icon(name, cls) {
    const spec = ICONS[name] || ICONS.help;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    if (cls) svg.setAttribute("class", cls);
    for (const [tag, attrs] of spec) {
      const el = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
      svg.append(el);
    }
    return svg;
  }

  window.ASC = window.ASC || {};
  window.ASC.icon = icon;
  window.ASC.ICONS = ICONS;
})();
