# INFINIUM Installer Index

A read-only lookup for INFINIUM staff: who installs where, who to call, what they charge,
and how current each record is. It replaces the INFINIUM Partner Finder page at
`partnerfinder.infiniumiq.ai`.

**Status, October 8, 2026:** the daily job is built and runs on GitHub every day. The page's
desktop views are built to the specification's ninth revision (October 8): two tabs, Find
installers and All installers; a place's view for a state, a county, a ZIP code or a city, with
its Tier 1 installers first and a button for those available for travel (Tier 2); the view
switch (Estimating, Project management, Records); the Installer view in sections; and About this
data. The phone layout and address search come later. This file fills in as the build goes.

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
  index.html         the frame: the pinned header with the two tabs and the box "Find a company
                     or person", and the footer with the line saying how current the data is
  css\fonts.css      the Montserrat and Roboto font rules
  css\site.css       the look
  js\app.js          the one part that touches the browser: fetches the files, draws each view,
                     keeps the address in step, listens for clicks and keys, and remembers the
                     view of the view switch in the browser
  js\data.js         reads the four files and checks each one's schema; works out what territory
                     means on the page (Tier 1) and which installers a place lists
  js\routes.js       the addresses of the views
  js\search.js       the search of the box in the header
  js\places.js       the location box: ZIP codes, states, counties and cities as they are typed
  js\contacts.js     a row's contacts, as the job chose them, and the field and receiving contacts
  js\views.js        the words and layout of every view
  js\maps.js         the maps: the map on Find installers and each state's county map, drawn as SVG
  js\format.js       dates in Eastern time, money, counts, phone and email links
  js\html.js         builds the markup and makes everything taken from the data safe
  img\               the INFINIUM logo and the small icons
  vendor\fonts\      the Montserrat and Roboto font files
  geo\counties.json  the county list
  geo\states-map.json          the map on Find installers: each state's outline, and where its
                               code is written
  geo\counties\<code>.json     one county map for each of the 50 states, the District of
                               Columbia and Ontario (ON.json)
  geo\zips\0.json to 9.json    the ZIP list, one file for each first digit of a ZIP code
  geo\cities\<code>.json       the city list for city lookup, one file for each state (Ontario's
                               holds no city)
  data\              the three files the job writes
```

- **The page reads four files at the start, and never calls QuickBase:** `data/build.json`,
  `data/installers.json`, `data/territory.json` and `geo/counties.json`, by addresses
  relative to the page. If one is missing, is not JSON, or does not carry `"schema": 1`, the
  page says the installer data could not be loaded and to try again shortly. It never shows an
  empty directory.
- **A map, ZIP or city file is fetched only when it is needed, and kept:**
  `geo/states-map.json` for Find installers (beside the four files when the page opens there,
  so the map is drawn with the view), `geo/counties/<code>.json` for a place in that state,
  `geo/zips/<first digit>.json` when a ZIP code is opened, and `geo/cities/<code>.json` when a
  city is opened or the location box first holds two characters (only the state's file when what
  is typed ends with a state). A view shows its lists at once and its map when the file has come.
  If such a file cannot be loaded, the lists still show and one line says the map could not be
  drawn, or the ZIP code or city could not be looked up.
- **It asks the network for its own files and nothing else:** no font service, no script
  library, no map library, no map tiles, no counter.
- **Territory is Tier 1.** An installer's territory is the counties it chose as Tier 1; its Tier
  2 counties are where it is available for travel. A place's lists, its counts and the maps'
  shades hold only CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED installers; DORMANT - NO
  RESPONSE ones are listed apart under the lists; INACTIVE and HELD - BUSINESS DECISION ones only
  in All installers, behind a box. The data files do not change: the page works this out from
  what they carry (section 4.0 of `docs\SPEC.md`).
- **The maps are drawn by the page itself,** as plain SVG, using the outlines in `public\geo\`.
  Each state on the map of Find installers and each county on a state's map is a link with its
  own address, so a click, the Enter key and a pasted address all do the same thing. A state is
  shaded by how many installers have territory in it, a county by how many have it as Tier 1, on
  five steps of green.
- **Every view has its own address, written after a `#`**: `#/` (Find installers),
  `#/state/OH`, `#/state/OH?county=39153`, `#/zip/44221`, `#/city/OH-akron`,
  `#/installer/<installer id>`, `#/installers` and `#/about`. Choices ride on the address as
  items: `view=est`, `pm` or `rec` for the view switch; for All installers `q`, `office`,
  `territory`, `dormant=1`, `inactive=1` and `map=off`; and on an Installer view opened from a
  place, `from`. The first prompt's addresses (`#/search?q=`, `#/not-on-the-map`,
  `#/installers?set=`, `#/installers?status=`) still work: each opens its new address in its
  place. Everything after the `#` stays in the browser, so a host needs no settings or redirect
  rules for them: it serves `index.html` and the page does the rest. Pasting an address into a
  new tab shows the same view, and Back and Forward work.
- **The view switch is remembered** in the browser that chose it (its local storage). With
  nothing remembered, or a browser that keeps nothing, the page opens in Estimating.
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
node job/build-cities.mjs
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
- `job\build-cities.mjs` writes the 52 files of `geo\cities\`. Its source is the application
  form's place list, `public/data/places.json` in the `installer-application` repository, at
  commit `a6fc6db`, read with `git show`: 6,242 places of 5,000 people or more, each with the
  county it lies in. Each city has an id (the state code, a hyphen, and its name in lower case
  with every run of other characters one hyphen), its name, its state and its counties. As one
  file the list is over 400,000 bytes, so it is split by state, and the page fetches only the
  files of the states that could match what is typed.
- `geo\counties.json`, the county list, is made by `job\build-counties.mjs`, as before.

**Credits,** shown on About this data:

- County and state outlines: U.S. Census Bureau, 2025 cartographic boundary files.
- Ontario census divisions: adapted from Statistics Canada, 2021 Census boundary files. This
  does not constitute an endorsement by Statistics Canada of this product.
- ZIP codes: U.S. Census Bureau, 2020 ZIP Code Tabulation Area to county relationship file. A
  Census ZIP area is close to, but not exactly, the area the Postal Service delivers to.
- Cities: the place list of INFINIUM's installer application form.

### Checking the page

```
npm run check:page
```

Runs the page's own functions on made-up installers and prints one line per check, PASS or
FAIL: every address gives its view, and old addresses open their new ones; All installers with
its filters and boxes, in the three views; the Installer view's fields, sections, signals and the
line naming who to tell about a wrong value; a row's contacts; "Last confirmed"; search; "Expired";
the freshness line and About this data; the page when the data cannot be loaded; text made safe;
no address of another site in `public\`; the rulings; the map, ZIP and city files themselves;
and, for every state and county, the shading, the Tier 1 and Tier 2 lists, the statuses each
place lists, the location box, and city lookup (groups V and M of `docs\ACCEPTANCE.md`). It
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
titles stay in view below the header, nothing is wider than its panel or cut off without a way
to read it, no script error, no request leaves the computer, no text under 12 pixels or under
4.5 to 1 contrast, every link, button and field can be reached with Tab, old addresses are
replaced, the view switch and the boxes of All installers work. It pictures the Installer view,
All installers and About this data. It needs no package. Add `-- --first-screens` to also save
what the window shows first.

```
npm run page:pictures:maps
```

The same, for Find installers and the views of places: a state, a county in each of the three
views, the Tier 2 list open, a ZIP code, a city. It measures that Find installers draws its map
as it opens, in the right half; that on a place's view the lists start near the top; the Tier 2
button by the mouse and the keyboard; the location box; that each place's address shows its
view; that each view asks only for the files it needs; that no map is wider than its panel;
that every code written on a map is at least 12 pixels and 4.5 to 1 against its own state; and
that every state, and every county of four states, can be reached with Tab and opened with
Enter. Each measure is also shown failing on a copy of the page broken for it.

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
