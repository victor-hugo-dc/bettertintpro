/* ==========================================================================
   TintPro Restyle — pages/message.js
   Rebuilds cust_contact_display.aspx (the "View Details" iframe) as a
   readable email view: subject, header block, message body, and the raw
   "page sent" payload folded into a collapsible section.
   ========================================================================== */
(() => {
  "use strict";
  if (window.ASC && window.ASC.off) return; // settings hub: leave the page alone
  const { el, clean } = window.ASC;
  const $ = (id) => document.getElementById(id);
  const table = document.querySelector("form > div > table");
  if (!table) return;

  const addrList = (text) => {
    // "NAME (email);NAME (email);" → chips
    const dd = el("dd");
    const parts = clean(text).split(";").map((p) => clean(p)).filter((p) => p && p !== "()");
    if (!parts.length) { dd.textContent = "—"; return dd; }
    for (const p of parts) {
      const m = /^(.*?)\s*\(([^)]*)\)$/.exec(p);
      const chip = el("span", { class: "asc-addr" });
      if (m && clean(m[1])) { chip.append(document.createTextNode(m[1] + " ")); if (clean(m[2])) chip.append(el("small", { text: `<${clean(m[2])}>` })); }
      else chip.textContent = p;
      dd.append(chip);
    }
    return dd;
  };

  const view = el("div", { class: "asc-msg" });

  // Toolbar: Resend + read-by
  const toolbar = el("div", { class: "asc-msg-toolbar" });
  const resend = $("bt_reply");
  if (resend) toolbar.append(resend);
  const readBy = $("l_read_by");
  if (readBy) toolbar.append(readBy);
  view.append(toolbar);

  // Subject
  const subject = $("l_subject");
  view.append(el("h1", { class: "asc-msg-subject", text: subject ? clean(subject.textContent) || "(no subject)" : "Message" }));

  // Headers
  const dl = el("dl", { class: "asc-msg-headers" });
  const add = (label, node) => { if (!node) return; dl.append(el("dt", { text: label }), node); };
  const from = $("l_from"), to = $("l_to"), cc = $("l_cc"), bcc = $("l_bcc"), date = $("l_date"), ccid = $("l_cc_id");
  if (from) add("From", addrList(from.textContent));
  if (to) add("To", addrList(to.textContent));
  if (cc && clean(cc.textContent).replace(/[();\s]/g, "")) add("CC", addrList(cc.textContent));
  if (bcc && clean(bcc.textContent).replace(/[();\s]/g, "")) add("BCC", addrList(bcc.textContent));
  if (date) add("Date", el("dd", { text: clean(date.textContent) }));
  if (ccid) add("ID", el("dd", { text: clean(ccid.textContent) }));
  view.append(dl);

  // Body
  const message = $("l_message");
  const body = el("div", { class: "asc-msg-body" });
  body.append(el("span", { class: "asc-msg-body-label", text: "Message" }));
  if (message) body.append(message);
  view.append(body);

  // Raw page/attachment content (calendar payload, invoice HTML, …)
  const sent = $("l_page_sent");
  if (sent && clean(sent.textContent)) {
    const det = el("details", { class: "asc-msg-extra" });
    det.append(el("summary", { text: "Attachment / page content" }));
    const inner = el("div", { class: "asc-msg-extra-body" });
    // Plain-text payloads (e.g. VCALENDAR) keep their line breaks
    if (!sent.querySelector("*")) inner.append(el("pre", { text: sent.textContent.trim() }));
    else inner.append(sent);
    det.append(inner);
    view.append(det);
  }

  // Email history
  const hist = $("l_history");
  if (hist) {
    const h = el("div", { class: "asc-msg-history" });
    if (clean(hist.textContent)) h.append(el("span", { class: "asc-msg-section-title", text: "Email history" }));
    h.append(hist);
    view.append(h);
    // hide the original "Email History:" label + <br>s that sat before it
    for (const n of Array.from(table.parentNode.childNodes)) {
      if (n.nodeType === Node.ELEMENT_NODE && n.tagName === "B" && /history/i.test(n.textContent)) n.classList.add("asc-message-hidden");
      if (n.nodeName === "BR") n.remove();
    }
  }

  table.parentNode.insertBefore(view, table);
  document.body.classList.add("asc-message-ready");
})();
