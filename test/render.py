#!/usr/bin/env python3
"""Render a saved page fixture with the extension injected, via headless Chrome.

  test/render.py welcome --url https://atlanticsun.tintprogroup.com/trunk/welcome/ [-w 1600 -H 1100] [--original] [--extra-js file] [--dump]

The fixture's <base> is pointed at the live site so its own CSS/JS load; the
extension's css/js are chosen from manifest.json by matching --url, in the
same order the browser would inject them.
"""
import argparse, fnmatch, json, os, re, subprocess, sys, tempfile, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://atlanticsun.tintprogroup.com"
# Default URL per fixture (used when --url is omitted)
URLS = {
    "welcome":    SITE + "/trunk/welcome/?v=1.2",
    "dashboard":  SITE + "/trunk/welcome/dashboard.aspx?zz=1",
    "calendar":   SITE + "/trunk/calendar/calendar.aspx",
    "inbox":      SITE + "/trunk/cust_contact_sent.aspx?zz=1",
    "edit_cust":  SITE + "/trunk/edit_cust.aspx?j_id=54839&c_id=49977",
    "jo_details": SITE + "/trunk/jo_details.aspx?j_id=54839&c_id=49977",
    "referrals":  SITE + "/trunk/admin/referrals.aspx?zz=1",
    "employees":  SITE + "/trunk/admin/employees.aspx?zz=1",
    "calendar_mo":  SITE + "/trunk/calendar/calendar_mo.aspx?zz=1",
    "calendar_one": SITE + "/trunk/calendar/calendar_one.aspx?zz=1",
    "calendar_all": SITE + "/trunk/calendar/calendar.aspx?zz=1",
    "dashboard_day": SITE + "/trunk/welcome/dashboard.aspx?zz=1",
    "contact_display": SITE + "/trunk/cust_contact_display.aspx?cc_id=119272",
    "rpt_display":  SITE + "/trunk/admin/salesman_rpt_display.aspx",
    "rpt_inst":     SITE + "/trunk/admin/salesman_rpt_inst_display.aspx",
    "rpt_est":      SITE + "/trunk/admin/salesman_rpt_est_display.aspx",
    "rpt_track_est": SITE + "/trunk/admin/Tracking_rpt_est_display.aspx",
    "rpt_track_all": SITE + "/trunk/admin/Tracking_rpt_all.aspx",
    "rpt_wip":      SITE + "/trunk/admin/salesman_rpt_wip.aspx",
    "salesman_rpt": SITE + "/trunk/admin/salesman_rpt.aspx?zz=1",
    "mailing_list": SITE + "/trunk/admin/mailing_list.aspx",
    "ar_menu":      SITE + "/trunk/ar/menu_ar.aspx",
    "ar_list_open": SITE + "/trunk/ar/ar_list_open.aspx",
    "ar_default":   SITE + "/trunk/ar/default_ar.aspx?zz=1",
    "admin_hub":    SITE + "/trunk/admin/?zz=1",
    "admin_menu":   SITE + "/trunk/admin/admin_menu.aspx",
    "admin_welcome": SITE + "/trunk/admin/welcome.aspx",
    "inv_start":    SITE + "/Inv/start_admin.aspx?zz=1",
    "inv_menu":     SITE + "/Inv/T_menu.aspx",
    "inv_list":     SITE + "/Inv/inv_list_basic.aspx",
    "payroll_menu": SITE + "/payroll/menu.aspx?zz=1",
    "login":        SITE + "/",
    "set_areas":    SITE + "/trunk/admin/areas.aspx",
    "set_owner":    SITE + "/trunk/admin/owner.aspx",
    "set_email":    SITE + "/trunk/admin/email_options.aspx",
    "set_tax":      SITE + "/trunk/admin/tax.aspx",
    "set_holidays": SITE + "/trunk/admin/holidays.aspx",
    "set_tracking": SITE + "/trunk/admin/tracking.aspx",
    "set_proposal": SITE + "/trunk/admin/proposal_text.aspx",
    "set_biztypes": SITE + "/trunk/admin/biz_types.aspx",
}
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def pattern_matches(pat, url):
    if pat == "<all_urls>": return True
    m = re.match(r"^(\*|https?|file|ftp)://([^/]*)(/.*)$", pat)
    if not m: return False
    scheme, host, path = m.groups()
    u = urllib.parse.urlsplit(url)
    if scheme != "*" and scheme != u.scheme: return False
    if host != "*":
        if host.startswith("*."):
            if not (u.hostname == host[2:] or u.hostname.endswith(host[1:])): return False
        elif u.hostname != host: return False
    full = u.path + ("?" + u.query if u.query else "")
    # browser match patterns: only "*" is a wildcard (fnmatch would also treat ? and [ specially)
    rx = "^" + ".*".join(re.escape(part) for part in path.split("*")) + "$"
    return re.match(rx, full) is not None

def scripts_for(url):
    man = json.load(open(os.path.join(ROOT, "extension", "manifest.json")))
    css, js = [], []
    for cs in man["content_scripts"]:
        if not any(pattern_matches(p, url) for p in cs["matches"]): continue
        if any(pattern_matches(p, url) for p in cs.get("exclude_matches", [])): continue
        css += cs.get("css", []); js += cs.get("js", [])
    return css, js

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fixture")
    ap.add_argument("--url")
    ap.add_argument("-w", type=int, default=1600); ap.add_argument("-H", type=int, default=1100)
    ap.add_argument("-o", "--out"); ap.add_argument("--original", action="store_true")
    ap.add_argument("--extra-js"); ap.add_argument("--dump", action="store_true")
    ap.add_argument("--frameset", action="store_true", help="load the page inside a <frameset> (simulates the Settings hub)")
    ap.add_argument("--frames", help="name=fixture,name=fixture: build a 2-column frameset from fixtures (AR simulation); --url is the frameset's URL")
    a = ap.parse_args()
    a.url = a.url or URLS[a.fixture]
    def prepare(fixture, url, extra_js=None):
        fx = os.path.join(ROOT, "test", "fixtures", fixture + ".html")
        html = open(fx, encoding="utf-8", errors="replace").read()
        html = html.replace("<head>", f'<head><base href="{url}">', 1)
        if a.original: return html
        css, js = scripts_for(url)
        html = html.replace("</head>", "".join(f'<link rel="stylesheet" href="file://{ROOT}/extension/{c}">' for c in css) + "</head>", 1)
        errs = '<script>window.__ascErrors=[];window.addEventListener("error",e=>{window.__ascErrors.push((e.filename||"").split("/").pop()+":"+e.lineno+" "+e.message)});</script>'
        tail = errs + "".join(f'<script src="file://{ROOT}/extension/{j}"></script>' for j in js)
        tail += '<script>setTimeout(()=>{if(window.__ascErrors.length)document.title="ERRORS "+window.__ascErrors.join(" | ")},2500)</script>'
        if extra_js:
            tail += f'<script>setTimeout(()=>{{const s=document.createElement("script");s.src="file://{os.path.abspath(extra_js)}";(document.body||document.documentElement).append(s)}},1500)</script>'
        if "</body>" in html: return html.replace("</body>", tail + "</body>", 1)
        # frameset documents: the parser drops anything after </frameset>, so inject into <head>
        return html.replace("</head>", tail + "</head>", 1)
    tmp = tempfile.mkdtemp(); page = os.path.join(tmp, "page.html")
    if a.frames:
        # frameset page = the "fixture" argument (e.g. ar_default), frames from --frames
        fs_html = prepare(a.fixture, a.url, a.extra_js)
        frames = [f.split("=") for f in a.frames.split(",")]
        for name, fix in frames:
            open(os.path.join(tmp, name + ".html"), "w", encoding="utf-8").write(prepare(fix, URLS[fix]))
            local = "file://" + os.path.join(tmp, name + ".html")
            def swap(mt, name=name, local=local):
                tag = mt.group(0)
                if not re.search(r'\bname=["\']?' + re.escape(name) + r'\b', tag): return tag
                return re.sub(r'\bsrc=(["\'][^"\']*["\']|[^\s>]+)', 'src="' + local + '"', tag, count=1)
            fs_html = re.sub(r'<frame\b[^>]*>', swap, fs_html)
        open(page, "w", encoding="utf-8").write(fs_html)
    else:
        open(page, "w", encoding="utf-8").write(prepare(a.fixture, a.url, a.extra_js))
    if a.frameset:
        outer = os.path.join(tmp, "frameset.html")
        open(outer, "w").write('<html><frameset cols="*"><frame name="main" src="page.html"></frameset></html>')
        page = outer
    out = a.out or os.path.join(ROOT, "test", f"out-{a.fixture}{'-orig' if a.original else ''}-{a.w}.png")
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
           "--virtual-time-budget=8000", f"--window-size={a.w},{a.H}"]
    cmd += ["--dump-dom"] if a.dump else [f"--screenshot={out}"]
    cmd.append("file://" + page)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if a.dump:
        m = re.search(r"<title>([^<]*)", r.stdout); print(m.group(1) if m else r.stdout[:2000])
        fs = re.search(r"<frameset[^>]*>", r.stdout)
        if fs: print(fs.group(0))
    else:
        print(out)

if __name__ == "__main__": main()
