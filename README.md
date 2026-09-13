# TintPro Restyle

A Chrome/Firefox extension (Manifest V3) that restyles the TintPro app at
`https://atlanticsun.tintprogroup.com/`. It only runs on that host, sends
nothing anywhere, and needs no permissions.

## What it changes

**Everywhere** (`common/`)
- Sidebar: compact rows with modern SVG icons; fits a 768px-high screen. Rarely
  used items (Social Media, Messages, To-Do Lists) live under a collapsible
  **More** group.
  The site's own collapse-to-icons toggle keeps working.
- Top bar: tidier search box and menu button.
- Links open in the **current tab** instead of new windows (`target` attributes
  are removed, and the hidden-form navigation the job page uses — `go_here()` —
  is redirected to `_self` by a small page-world script). Targets that name a
  real frame (the AR "right" pane) are kept. Ctrl/Cmd-click still opens a new
  tab. Popup windows the app opens with `window.open` (e.g. edit appointment)
  are left alone because those pages rely on `window.close()`.
- **Sidebar on standalone pages** (`common/shell.js`): report output pages,
  the report menus and the Accounts Receivable area have no app chrome; the
  shell adds the same sidebar (collapsible, remembered) so you can get back to
  Home / Dashboard / … without the Back button. Inside the AR frameset the
  sidebar lives in the menu frame (the frameset's left column is widened) and
  its links navigate the top window.
- Consistent buttons, inputs, selects, data tables and modals.
- **Login page is left alone.** `common/gate.js` runs at `document_start`
  in every frame and marks the login page "off": every module returns early
  and all stylesheets are wrapped in `html:not(.asc-off) { … }`, so nothing
  of ours applies there (no flash — it runs before first paint).
- **Frameset areas** (Settings `/trunk/admin/`, Accounts Receivable
  `/trunk/ar/`, Inventory `/Inv/`) are all `menu | main` framesets. The menu
  column is widened by the sidebar width, the app sidebar is injected into the
  menu frame (links navigate the top window), the menu itself is restyled
  (`pages/menus.*`), and every page loaded into the main pane gets the
  standalone-page styling below. Links in a menu frame that used to open a
  new window now open in the main pane instead.
- **Settings home** (`pages/settings-home.*`): the hub's empty main pane
  becomes a card grid of every settings page, built live from the menu frame.
  A full-chrome page (Bill To's, Employees) loaded into a frameset pane hides
  its own sidebar/header so there is only ever one sidebar on screen.
- **CSV / Excel export** helper (`common/export.js`) — a dependency-free `.xlsx`
  writer; used by every table below.

**Home** `/trunk/welcome/` (`pages/welcome.*`)
- Leads / Job Orders / Task List / Phone List as cards; resizable split between
  Job Orders and Task List (always the same height); the pager ("Next") sits in
  a solid card footer below the scrolling list; empty cards auto-collapse;
  colour-coded status badges; overdue-date pills; assignee chips. Works down to
  tablet widths (single column below ~900px of content width).

**Dashboard day view, Calendar day / week / month** (`pages/schedule.*`)
- The server renders the schedule as a table where every simultaneous
  appointment adds a column, which is what caused the horizontal overflow.
  The extension takes that table apart and rebuilds it as an agenda:
  day view (`dashboard.aspx`, `calendar_one.aspx`) = one row per time slot
  with appointment cards wrapping in a grid; week view (`calendar.aspx`) =
  **one horizontal strip** of 260px day columns for every day on the page
  (two weeks → 14 columns) that scrolls sideways — ‹ › buttons, Shift+wheel or
  trackpad — with its own vertical scroll and sticky day headers.
- Month view (`calendar_mo.aspx`): the grid and appointment chips are restyled
  in place; hover an appointment for the details popover.
- Cards show time · duration, site, address, phone, assignee chip, job chip,
  status badge, install stats and the action icons. Drag-and-drop to another
  time still works (the drop targets and drag handles are the original
  elements, moved not copied). A **Show: All slots / Hourly / Busy only**
  control sets how many empty slots (= drop targets) are visible.
- Not yet restyled: the calendar **Month** view (untested — markup not captured).

**Job pages** (`pages/jobs.*`)
- `edit_cust.aspx`: the two boxes share the full page width (stacking below
  ~860px), form rows aligned (label / field), phone fields grouped, sections as
  cards, Save as primary button.
- `jo_details.aspx`: header card with a status badge, wrapped button rows,
  labelled Terms/Status/Pipeline selects, items table scrolls inside its card.

**Inbox / Sent** (`pages/inbox.*`, `pages/message.*`)
- Filter bar, tabs, table with View Details / Resend buttons, export.
- The **View Details** modal loads `cust_contact_display.aspx` in an iframe;
  that page is rebuilt as an email view: subject, From/To/CC chips, date, the
  message body in its own card, and the raw calendar/page payload folded into
  an "Attachment / page content" section.

**Bill To's & Employees** (`pages/admin.*`)
- Toolbar (find, filters, bulk update / add, user-count tiles, Active toggle),
  sticky header, colour swatches for calendar colours, type chips, export.

**Reports, Settings pages, Accounts Receivable, Inventory, Payroll**
(`pages/reports.*`) — every standalone page under `/trunk/admin/`,
`/trunk/ar/`, `/trunk/claims/`, `/Inv/`; `/payroll/` gets the CSS only
- Report output pages (Salesman / Pipeline / Up-charge / WIP …) get an intro
  card (title, date range, salesman), a totals card, and every data table gets
  a sticky header, numeric alignment, section/total rows and **Export CSV /
  Excel** buttons. Action-only columns ("Select", "Edit") are dropped from
  exports. `mailing_list.aspx`'s side-by-side layout is stacked: search on
  top, lists below.
- Accounts Receivable: the menu frame is restyled next to the sidebar; every
  list in the right frame (aging, WIP, invoices …) is styled and exportable.

## Layout

```
extension/
  manifest.json
  common/  gate.js common.css common.js icons.js export.js shell.css shell.js page-world.js
  pages/   welcome.* schedule.* jobs.* inbox.* message.* admin.* reports.* menus.* settings-home.* cssonly.js
  icons/
scripts/package.sh       → dist/tintpro-restyle-<version>.zip
test/render.py           renders a saved page with the extension in headless Chrome
test/fixtures/*.html     snapshots of live pages (real customer data — gitignored)
```

## Install for yourself

**Chrome / Edge / Brave:** `chrome://extensions` → *Developer mode* →
*Load unpacked* → pick `extension/`. After editing files, press ↻ on the
extension card and reload the page.

**Firefox:** `about:debugging#/runtime/this-firefox` → *Load Temporary
Add-on…* → pick `extension/manifest.json` (gone after restart; see below for
permanent). Or: `npx web-ext run --source-dir extension`.

## Make it installable for someone else

```sh
scripts/package.sh          # → dist/tintpro-restyle-0.4.1.zip
```
Bump `"version"` in `extension/manifest.json` for each release.

- **Chrome:** send the zip and have them *Load unpacked* (unzip somewhere
  permanent first), or upload it to the Chrome Web Store as **Unlisted**
  ($5 one-time developer fee) so installs and updates are automatic. Chrome
  blocks sideloaded `.crx` files, so those are the two options.
- **Firefox:** must be signed by Mozilla even when self-hosted (free):
  ```sh
  npx web-ext sign --source-dir extension --channel unlisted \
    --api-key "$AMO_JWT_ISSUER" --api-secret "$AMO_JWT_SECRET"
  ```
  (API keys from <https://addons.mozilla.org/developers/addon/api/key/>).
  Send the resulting `web-ext-artifacts/*.xpi`; anyone installs it by dragging
  it onto Firefox or via `about:addons` → gear → *Install Add-on From File…*.
  Keep the `gecko.id` in the manifest unchanged so updates replace the
  previous install.

## Testing without the site

```sh
test/render.py welcome                  # restyled, 1600x1100 → test/out-welcome-1600.png
test/render.py dashboard_day --original # the untouched page for comparison
test/render.py calendar_all -w 1600 -H 1300
test/render.py contact_display --url https://atlanticsun.tintprogroup.com/trunk/cust_contact_display.aspx?cc_id=1 -w 860 -H 720
test/render.py ar_default --frames menu=ar_menu,right=ar_list_open       # AR frameset with both frames
test/render.py admin_hub --frames menu=admin_menu,main=admin_welcome     # Settings hub
test/render.py inv_start --frames menu=inv_menu,main=inv_list           # Inventory
```
Fixtures are matched to extension modules by URL exactly as the browser
would. Icon fonts don't load from `file://`, so icon glyphs show as boxes in
screenshots only. To refresh a fixture, save the page's HTML into
`test/fixtures/<name>.html`.

## Known limits / next steps

- The "Show Map" mode of the dashboard is unstyled (not captured).
- `window.open` popups (edit appointment, edit item, payments) keep opening
  windows — converting them needs the popup pages to stop calling
  `window.close()`.
- Dark theme: all colours are CSS variables in `common/common.css`; a
  `prefers-color-scheme: dark` block overriding the `--asc-*` tokens would do it.
