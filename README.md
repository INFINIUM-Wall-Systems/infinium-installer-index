# INFINIUM Installer Index

A read-only lookup for INFINIUM staff: who installs where, who to call, what they charge,
and how current each record is. It replaces the INFINIUM Partner Finder page at
`partnerfinder.infiniumiq.ai`.

**Status, October 7, 2026:** the daily job is built. Its first run, started by hand on GitHub,
passed and published the three data files into `public\data\`, and they were checked on the
laptop. The daily schedule is on from October 8. The page's desktop views are built: Home with
its map of the states and Ontario, All installers, Installer, Search results, Not on the map,
About this data, the State view with its county map and county box, and ZIP lookup. The phone
layout and address search come later. This file fills in as the build goes.

## How it works

```
QuickBase  -->  the job, run by   -->  data files saved  -->  the host         -->  the page
tables          GitHub's scheduler     into the repository    republishes
                once a day
```

- **QuickBase is the source of truth.** Installer records are changed there and nowhere
  else.
- **The job** is in `job\`. GitHub's scheduler (GitHub Actions) runs it, from
  `.github\workflows\daily-data.yml`. It reads three QuickBase tables, checks what it read,
  and saves three data files into `public\data\`. If a check fails it saves nothing, and
  the page keeps showing the last good data.
- **The job runs by itself every day** (below), and can also be started by hand.
- **The page** is plain files in `public\`. It has no build step and no server code. It
  holds no QuickBase key and never calls QuickBase.
- **A change in QuickBase shows the next morning.** A refresh can also be started by hand
  from the repository's Actions page.

## When the job runs

- **By itself, every day at 09:20 UTC.** That is 5:20 AM Eastern in summer and 4:20 AM in
  winter. GitHub may start it some minutes late; it is busiest on the hour, which is why the
  time is twenty past.
- **A scheduled run never skips the count guard.** It has no box to tick, so the first
  check, "Counts have not fallen", always runs.
- **GitHub runs a schedule only from the `main` branch.** A schedule on any other branch
  does nothing.
- **GitHub ties the schedule to the GitHub account that last changed the schedule** in
  `.github\workflows\daily-data.yml`. If that account leaves the organization, GitHub
  switches the schedule off, and it stays off until someone changes that file again.

## Starting the job by hand

1. Open the repository's Actions page:
   `https://github.com/INFINIUM-Wall-Systems/infinium-installer-index/actions`
2. In the list on the left, choose **Daily data**. (Its own page is
   `https://github.com/INFINIUM-Wall-Systems/infinium-installer-index/actions/workflows/daily-data.yml`.)
3. Press **Run workflow**, leave the branch as `main`, and press the green **Run workflow**
   button.

The box **skip_count_guard** stays unticked. Tick it only when a count has really fallen in
QuickBase and the run stopped at its first check, "Counts have not fallen": it leaves that
check out for that one run (section 3.7 of `docs\SPEC.md`). The job must still read at least
one installer. Ticking the box is Joe's call. A run started by hand with the box unticked
does exactly what the scheduled run does.

A run first runs the tests on made-up installers, then the job. When every check passes it
saves the three files into `public\data\` and commits them as "Daily data refresh". When a
check fails, nothing is saved and the run shows as failed, naming the check.

## Seeing the runs

Every run, scheduled or by hand, is listed on the Actions page under **Daily data**:
`https://github.com/INFINIUM-Wall-Systems/infinium-installer-index/actions/workflows/daily-data.yml`

- **A green run** passed: the files were checked and saved, as a commit by
  github-actions[bot] named "Daily data refresh".
- **A red run** means nothing was saved. `public\data\` still holds the last good files, and
  the page keeps showing them. Open the run to see which step stopped it: the tests on
  made-up installers, or the job, whose report names the check that failed, with counts.
  Nothing a run prints holds installer data or the key.

## Checking the published files

On a copy of the repository, after `git pull`:

```
npm run check:published
```

It reads the three files in `public\data\` (or in another folder, given as
`npm run check:published -- <folder>`) and prints one line for each thing it checks, with PASS or FAIL and counts: the three files are there and
read as JSON; `build.json` has the names the specification gives it, and its seven checks
each passed; the fingerprints in `build.json` match the other two files; the counts in
`build.json` match the same counts made again from the files; county ids are text; the gap
counts match two other counts; "Last confirmed" is only on CONFIRMED BY PARTNER installers;
no row holds a departed contact; nothing is written empty; every date reads like
2026-10-06. Then the build time, the main counts and the files' sizes. It prints counts and
names only, never installer data, and calls nothing on the network.

## The page

The page is plain files in `public\`: markup, styling, scripts the browser loads as they are,
pictures and fonts. There is no framework, nothing to install and nothing to build. A host
serves the `public\` folder as it is.

```
public\
  index.html         the frame: header, pinned search bar, the line saying how current the data is, footer
  css\fonts.css      the Montserrat and Roboto font rules
  css\site.css       the look
  js\app.js          the one part that touches the browser: fetches the files, draws each view,
                     keeps the address in step, listens for clicks and keys
  js\data.js         reads the four files and checks each one's schema
  js\routes.js       the addresses of the views
  js\search.js       search
  js\contacts.js     a row's contacts, as the job chose them
  js\views.js        the words and layout of every view
  js\maps.js         the maps: the Home map and each state's county map, drawn as SVG
  js\format.js       dates in Eastern time, money, counts, phone and email links
  js\html.js         builds the markup and makes everything taken from the data safe
  img\               the INFINIUM logo and the small icons
  vendor\fonts\      the Montserrat and Roboto font files
  geo\counties.json  the county list
  geo\states-map.json          the Home map: each state's outline, and where its code is written
  geo\counties\<code>.json     one county map for each of the 50 states, the District of
                               Columbia and Ontario (ON.json)
  geo\zips\0.json to 9.json    the ZIP list, one file for each first digit of a ZIP code
  data\              the three files the job writes
```

- **The page reads four files at the start, and never calls QuickBase:** `data/build.json`,
  `data/installers.json`, `data/territory.json` and `geo/counties.json`, by addresses
  relative to the page. If one is missing, is not JSON, or does not carry `"schema": 1`, the
  page says the installer data could not be loaded and to try again shortly. It never shows an
  empty directory.
- **A map file or a ZIP file is fetched only when a view needs it, and kept:**
  `geo/states-map.json` for Home, `geo/counties/<code>.json` for one state's view, and
  `geo/zips/<first digit>.json` when a ZIP code is opened. A view shows its list at once and
  its map when the file has come. If such a file cannot be loaded, the list still shows and one
  line says the map could not be drawn, or the ZIP code could not be looked up.
- **It asks the network for its own files and nothing else:** no font service, no script
  library, no map library, no map tiles, no counter.
- **The maps are drawn by the page itself,** as plain SVG, using the outlines in `public\geo\`.
  Each state on the Home map and each county on a state's map is a link with its own address,
  so a click, the Enter key and a pasted address all do the same thing. A state is shaded by
  how many installers have territory in it, a county by how many serve it, on five steps of
  green.
- **Every view has its own address, written after a `#`**, such as `#/installers`,
  `#/installers?set=rates`, `#/installer/<installer id>`, `#/search?q=akron`,
  `#/not-on-the-map`, `#/about`, `#/state/OH`, `#/state/OH?county=39153` and `#/zip/44221`. Everything after the `#` stays in the browser, so a host
  needs no settings or redirect rules for them: it serves `index.html` and the page does the
  rest. Pasting an address into a new tab shows the same view, and Back and Forward work.
- **The work is kept apart from the browser.** Everything in `js\` except `app.js` is plain
  functions that take data and give back text or markup, so node can load and test them.
- **The fonts and the logo** were copied, byte for byte, from the installer application's
  repository beside this one (`installer-application`, commit `a6fc6db`): the logo
  `infinium-logo-tagline.svg`, the icons `favicon.svg`, `favicon-32.png` and
  `apple-touch-icon.png`, and the four font files. The fonts are Montserrat and Roboto, two
  free fonts, as variable fonts carrying every weight from 100 to 900. Their sizes and SHA-256
  values are in `docs\HANDOFF.md`.

### The map and ZIP files, and how to make them again

The files in `public\geo\` are fixed reference files, made once by scripts in `job\` and
committed. The daily job never runs them. Run them again only when boundaries or ZIP codes
change, then commit what they write; the same sources always give the same bytes.

```
node job/build-shapes.mjs
node job/build-zips.mjs [path to zip-to-county.csv]
```

- `job\build-shapes.mjs` writes `geo\states-map.json` and the 52 files of `geo\counties\`. Its
  source is the application form's outlines, `public/data/counties.topo.json` in the
  `installer-application` repository beside this one, at commit `a6fc6db`, read with
  `git show`. The Home map puts the 48 adjoining states, the District of Columbia and Ontario
  in one equal-area conic projection, with Alaska and Hawaii drawn smaller in the lower left;
  each state's map is drawn in a projection centred on that state, north up. Points are
  rounded to whole units of the map's frame.
- `job\build-zips.mjs` writes the ten files of `geo\zips\`. Its source is
  `coverage-map\data\geo\zip-to-county.csv` beside this repository (or the path given); the
  `PROVENANCE.md` beside that file says how the list was made.
- `geo\counties.json`, the county list, is made by `job\build-counties.mjs`, as before.

**Credits,** shown on About this data:

- County and state outlines: U.S. Census Bureau, 2025 cartographic boundary files.
- Ontario census divisions: adapted from Statistics Canada, 2021 Census boundary files. This
  does not constitute an endorsement by Statistics Canada of this product.
- ZIP codes: U.S. Census Bureau, 2020 ZIP Code Tabulation Area to county relationship file. A
  Census ZIP area is close to, but not exactly, the area the Postal Service delivers to.

### Checking the page

```
npm run check:page
```

Runs the page's own functions on made-up installers and prints one line per check, PASS or
FAIL: every address gives its view; All installers in the file's order with both column sets
and the status filter; the Installer view shows every filled field and no empty one; a row's
contacts; "Last confirmed"; search by state, by the start of a word, email and phone; the
matched value on each result; a search with no match; "Rates expired"; Not on the map; the
date line and About this data; the page when the data cannot be loaded; text made safe; no
address of another site in `public\`; the rulings; the map and ZIP files themselves; and the
shading, links, lists, county box, foot line and ZIP lookup of the map views (M1 to M13). It
needs no browser and never reads `public\data\`.

```
npm run check:page:published
```

Runs the same functions over the real files in `public\data\` and prints counts and PASS or
FAIL only, never a record.

```
npm run page:pictures
```

Starts a small web server on this computer (127.0.0.1 only) that serves the page with
made-up installers and cannot serve `public\data\`, starts Microsoft Edge or Google Chrome
without a window, saves pictures of every view at 1440 and 1280 pixels wide into
`review-screens\` (which git ignores), and measures: each address shows its view, the column
titles stay in view below the search bar, nothing is wider than its panel or cut off, no
script error, no request leaves the computer, no text under 12 pixels or under 4.5 to 1
contrast, and every link and button can be reached with Tab. It needs no package. Add
`-- --first-screens` to also save what the window shows first.

```
npm run page:pictures:maps
```

The same, for the map views: Home with its map, nine State views, a county chosen, ZIP lookup,
and each map's panel alone. It measures that each new address shows its view; that a State
view asks for its own shape file alone and no ZIP file is fetched before a ZIP is opened; that
no map is wider than its panel; that every code written on a map is at least 12 pixels and 4.5
to 1 against its own state; and that every state, and every county of four states, can be
reached with Tab and opened with Enter. Each measure is also shown failing on a copy of the
page broken for it.

## What a host needs to do

Serve the `public\` folder as it is, and republish when this repository changes. There is
nothing to install and nothing to build.

On the INFINIUM server the page sits behind Microsoft Entra sign-in, which is set up on
that server and not in this repository.

## What the job needs

- A QuickBase key, stored in this GitHub repository's secrets as `QB_USER_TOKEN`. It is in
  no file. GitHub hands it only to the step that runs the job.
- The QuickBase realm, `infiniumwalls.quickbase.com`, and the app id, `bpkqi6uif`. Neither
  is a secret.
- Read access to three tables: INFINIUM Installers MASTER `bwegbya6s`, INFINIUM Installers
  Contacts `bwegb3582` and INFINIUM Installers Territory `bwegb3vwv`. It never writes.
- Node 22 or later. No packages are installed.

## Folders

```
CLAUDE.md          rules for Claude Code, which builds this repository
README.md          this file
package.json       Node 22 or later; no packages to install
.github\workflows\ daily-data.yml, which runs the job on GitHub, every day and by hand
docs\              the specification, the acceptance checks, and the QuickBase column list
job\               the job: read QuickBase, check, write the data files
public\            the page, and in public\data\ the files the job writes
public\geo\        the county list, the map shapes and the ZIP list
scripts\           checks, the job's and the page's tests on made-up installers, and the
                   pictures of the page
```

## Where to read more

- `docs\SPEC.md`: what is being built, view by view.
- `docs\ACCEPTANCE.md`: the checks each piece must pass.
- `docs\quickbase\columns.json`: every column of the three tables.

## Who to ask

Joe Lull, AI and Automation Engineer, INFINIUM Wall Systems.
