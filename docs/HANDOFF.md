# Handoff: state for the next Claude Code chat

**Written:** October 8, 2026, at the end of the page's third prompt (Joe's prompt "The page,
part 3. The redesign.", revision 1).

## Where things stand

- **The redesign of the ninth revision is built**, on a desktop screen: `docs\SPEC.md` (ninth
  revision) and `docs\ACCEPTANCE.md` (third version) are in the repository, byte for byte as the
  prompt carried them.
- **Territory is Tier 1.** A place (a state, a county, a ZIP code, a city) lists its Tier 1
  installers, then the button "View Tier 2 Installers Available for Travel" and, hidden until
  pressed, the Tier 2 ones. Its lists, counts and map shades hold only CONFIRMED BY PARTNER and
  PENDING - UPDATE EXPECTED; DORMANT - NO RESPONSE ones are under "Did not respond to the August
  outreach"; installers not on the map with an office in the place's state under their own
  heading; INACTIVE and HELD - BUSINESS DECISION only in All installers, behind a box.
- **Two tabs**, Find installers and All installers; the box "Find a company or person" in the
  header opens All installers; the location box finds places. Find installers draws its map as
  it opens, in the right half. The view switch (Estimating, Project management, Records) changes
  the columns of a row and the order of the Installer view, which is one page in five sections
  with an overview and a jump bar.
- **City lookup is built:** the place list carries each place's county; 6,242 of 6,242 resolve.
- **Checked four ways, on made-up installers or by counts only:** `npm run check:page` (56
  lines), `npm run page:pictures` and `npm run page:pictures:maps` (Microsoft Edge without a
  window, against a local server that serves made-up installers only), and
  `npm run check:page:published` (17 lines over the real files, counts only).
- **The page was never loaded, pictured or copied with the real records on the laptop.**
- **Next:** Joe goes through the redesign on the Netlify test copy, then the phone layout.
- **The daily job** runs on GitHub every day at 09:20 UTC. Nothing it runs or tests changed.

## What the repository holds

- `CLAUDE.md` (unchanged), `docs\SPEC.md` (ninth revision) and `docs\ACCEPTANCE.md` (third
  version): Joe's text.
- `README.md`, for Kuna: now the views of the redesign, the addresses and their items, what
  territory means on the page, the files the page reads, the city files and their script, and
  the fourth credit.
- `public\`: `index.html` (the header with the two tabs and the box, the footer with the
  freshness line); `css\site.css` (the look of section 5); `js\app.js` (the only part that touches
  the browser, and the only one that reads or writes its storage), `data.js`, `routes.js`,
  `search.js`, `places.js` (new: the location box), `contacts.js`, `views.js`, `maps.js`,
  `format.js`, `html.js`; `geo\cities\` (new, 52 files); the rest of `geo\`, `img\` and
  `vendor\fonts\` unchanged; `data\` (only the job writes it).
- `job\build-cities.mjs` (new): run by hand, never by the daily job. Nothing the daily job loads
  changed.
- `scripts\`:
  - changed: `page-tests.mjs` and `map-tests.mjs` (the tests of `check:page`, brought to the
    ninth revision), `page-standins.mjs`, `fixtures\page-installers.json` (five made-up
    installers added), `check-page-published.mjs` and `page-published-tests.mjs` (17 lines),
    `page-browser.mjs`, `page-pictures.mjs`, `page-pictures-maps.mjs`, `r5-allowed.json` (one entry:
    Joe's own work address, which the page shows on About this data and every Installer view).
  - unchanged: `checks.mjs`, `check.mjs`, `check-selftest.mjs`, `check-page.mjs`, `job-tests.mjs`,
    `job-standins.mjs`, `check-job.mjs`, `published-tests.mjs`, `check-published.mjs`,
    `serve-made-up.mjs`, the two job fixtures.

## The map, ZIP and city files (public\geo)

Built by hand, by `node job/build-shapes.mjs`, `node job/build-zips.mjs` and
`node job/build-cities.mjs`. The same sources give the same bytes (built twice, same SHA-256).

| What | Files | Bytes |
|---|---|---|
| `states-map.json`, the map on Find installers | 1 | 88,825 |
| `counties\<code>.json`, one county map for each of the 52 | 52 | 494,809 in all; the largest `ON.json`, 63,148; the smallest `DC.json`, 165 |
| `zips\0.json` to `zips\9.json`, the ZIP list by first digit | 10 | 1,387,970 in all; the largest `4.json`, 160,619 |
| `cities\<code>.json`, the city list by state | 52 | 476,225 in all; the largest `TX.json`, 37,100; `ON.json` holds no city |

- **Outlines and ZIP codes:** as the second prompt built them, unchanged (`counties.topo.json`
  of `installer-application` at `a6fc6db`; `coverage-map\data\geo\zip-to-county.csv`).
- **Cities:** `public/data/places.json` of `installer-application` at `a6fc6db`, read with
  `git --no-optional-locks -C ..\installer-application show` and held in memory: 148,060 bytes;
  the fields `generated`, `source`, `min_population`, `rule`, `order`, `place_count`,
  `county_count`, `labelled`, `labelled_note`, `names` (6,242), `counties` (6,242, one
  five-digit county id each), `lat` and `lon` (1,500 each). 6,242 places, 6,242 resolve to a
  county of `counties.json` and 0 do not; 3,134 counties; 51 states (the 50 and the District of
  Columbia). One id was given "-2" (two places of one name in one state). As one file the list is
  474,274 bytes, over 400,000, so it is split by state, one file for each of the 52 codes; the
  page asks only for the files of the states that could match what is typed.
- **Each city:** `id` (the state code, a hyphen, and the name in lower case with every run of
  characters other than a to z and 0 to 9 one hyphen), `name` as the list writes it, `state`,
  `counties`. In order of state, then name, then county id. No number in the files, so R5 reads
  none as a phone.
- Four names in the place list hold characters that read as an accent written twice over (an
  "Ã" followed by another character). They are written as the list has them.
- **The map's codes:** the map on Find installers is half the page wide now, so the page writes
  a state's code at 220 units of the map (the file's own size, 130, was chosen for a map twice as
  wide) and only where it fits at that size, by the build's own rule: 42 of the 52 (VT and NH no
  longer fit). Nothing in the map files changed.

## The logo and the fonts

Copied byte for byte from `installer-application` at commit `a6fc6db`, by node running
`git --no-optional-locks -C ..\installer-application show` and writing its raw output.
`fonts.css` there was read, not copied.

| File | Bytes | SHA-256 |
|---|---|---|
| `public\img\infinium-logo-tagline.svg` | 12,999 | `6b306fec7326df0cd90db6b65bd45882059dec6b3bd48478c041c2f21c0229a0` |
| `public\img\favicon.svg` | 951 | `db5e0829208fcf5eda1997ae307eafbcd3bce7c814bd14e659b610ff496ce839` |
| `public\img\favicon-32.png` | 766 | `ccb8e335c51890d61443c4fee2479d6a0d54e191ca5949532b8da99d882a7a36` |
| `public\img\apple-touch-icon.png` | 4,252 | `02b56312f6ecd206fb8d57abfc1c3b7ac8bd29892fa45ef9ff7bddf86dded814` |
| `public\vendor\fonts\montserrat-latin.woff2` | 37,956 | `06b16db7a969135d48d38c49183be7fb88d4452e2a3011957c7851941f4e4879` |
| `public\vendor\fonts\montserrat-latin-ext.woff2` | 70,688 | `54d9a78b7ff60b689ad9f3017ffac8547b5d871afec733f6c1c3ae36577ee504` |
| `public\vendor\fonts\roboto-latin.woff2` | 43,136 | `1404ca348bd75ef836f4dd8b6f2cc719458642d1237c368296b2fc652dca47dc` |
| `public\vendor\fonts\roboto-latin-ext.woff2` | 29,392 | `cedb374b05a35034cf96db185db4eeb8f8ce49e1a56197673702ff11b5533d6e` |

## How the page works

- `app.js` fetches the four files (`data/build.json`, `data/installers.json`,
  `data/territory.json`, `geo/counties.json`) and hands them to `data.js`, which checks that each
  reads as JSON with `"schema": 1`. Otherwise the page shows only "The installer data could not be
  loaded" and "Please try again shortly." When the page starts at `#/`, `geo/states-map.json` is
  fetched beside them, so the map is drawn with the view.
- `data.js` works out, once, what territory means on the page: the five statuses are written
  there and nowhere else in the page's code (`STATUS`); `LISTED` is CONFIRMED BY PARTNER and
  PENDING - UPDATE EXPECTED; `placeLists` gives a place's Tier 1, Tier 2, DORMANT and
  not-on-the-map lists; the state and county counts for the maps count LISTED Tier 1 only.
- Every view is a plain function in `views.js` that takes the route, the data, the time, the
  files fetched so far and the view of the switch (`mode`: `est`, `pm` or `rec`), and gives back
  a tree of elements and the tab to mark. `html.js` turns the tree into markup in one place and
  makes every value taken from the data safe there.
- **Addresses** (`routes.js`): `#/`, `#/state/<code>`, `#/state/<code>?county=<id>`,
  `#/zip/<five digits>`, `#/city/<id>`, `#/installer/<id>`, `#/installers`, `#/about`. Items, in
  this order: `county`; `view`; for All installers `q`, `office`, `territory`, `dormant=1`,
  `inactive=1`, `map=off`; on an Installer view `from` (a place's own address, encoded). Anything
  else gives the not-found view. The first prompt's addresses parse to their new routes marked
  `old`; `app.js` puts the address the page writes in place of any address written another way,
  with `history.replaceState`, so an old address leaves no step of its own.
- **The view switch:** three links to the same address with `view=` changed. `app.js` replaces
  the history entry, remembers the choice in local storage (inside try/catch), draws the view
  again and keeps the focus on the switch. An address without `view=` opens the remembered view,
  or Estimating.
- **The Tier 2 button** is drawn with the Tier 2 list hidden; `app.js` turns it in place (label,
  `aria-expanded`, the list's `hidden`), keeps the focus on it, does not scroll and does not touch
  the address. A new address draws the view afresh, so a place always opens with Tier 2 hidden;
  when a map's file comes, only the map's part (`[data-map-slot]`) is filled in.
- **The map column** of a place: 300 pixels wide on a screen 1,100 wide or more, folded on a
  narrower one; "Hide map" and "Show map" are a button `app.js` turns, remembered only while the
  page is open, never in the address.
- **The location box** (`places.js`): suggestions from the second letter, at most 10, ZIP, then
  states, counties, cities, each with its kind; a state at the end of what is typed narrows it.
  `app.js` fetches the city files a typed text needs, moves through the suggestions with the
  arrow keys, takes the first with Enter, and closes them with Escape.
- **The box in the header**: what is typed opens All installers with `q=`, keeping its other
  choices; five digits the ZIP's view. The first letter adds one step to Back, the rest replace it.
- **All installers**: "Office in" and "Territory in" (Tier 1) are lists of the states; "Also show"
  has two boxes, "Narrow to" one; each choice replaces the address and keeps the focus. While a
  search is typed every status is searched and each result carries its status tag.
- **The field and receiving contacts** of the Project management row are chosen by the page in
  `contacts.js`, by the job's "first by name" rule written out again there.
- Eastern time is worked out from the United States daylight-time rule, not the machine's
  settings, as before.

## The rulings of the second prompt, as built now

1. The maps are drawn as plain SVG from the application form's outlines, with no map library.
2. The map on Find installers is drawn from the same outlines; Ontario in its true place.
3. "Every state and Ontario", under the two halves of Find installers, closed by default: all 52,
   each with its number of installers with territory (Tier 1) there and a link to its view.
4. The ZIP list is ten files by first digit; only the one needed is loaded.
5. About this data, "Where the maps come from": the three lines, and the fourth for cities.
6. An email is matched by its words, as before.
7. A search that names a state shows "Open the map of <state>" above the results in All
   installers.
8. "Territory in" holds links to the states' views; in the Installer view the first line inside
   each state is "Open the map of <state>"; a result found by territory links the state's name.

## The rulings of the first prompt, as built now

1. A search by state finds an installer whose office is there and one whose territory (Tier 1)
   is there; a result found by territory says "Territory includes Ohio: 40 counties", with ",
   and available for travel to 12 more".
2. A departed contact is searched; a result that matched one shows it under "Matched contact",
   marked "Departed". Departed contacts never appear on a row; in the Installer view they are
   under "Former contacts".
3. The paperwork is in "Documents and record" as QuickBase has it; the Project management row
   and the overview's signals say it in words.
4. The Tier 2 charge shows whichever of its five parts are filled.
5. A ticked "Not applicable" box with its field empty shows "Not applicable".
6. A contact's procedure shows under that contact, labeled "Procedure".
7. "Expired" compares the valid-through date with today's date in Eastern time.
8. More than 36 hours after builtAt, the freshness line reads "Installer records from QuickBase.
   Not refreshed since <date>." with the label "Out of date". It is in the footer now.
9. The logo and the icons are in `public\img\`.
10. The coverage note: for an installer with no county at either tier it stands alone, labeled
    "Coverage note, not confirmed on the map"; with counties it follows the Tier 1 and Tier 2
    columns, labeled "Coverage note".

## V1 to V20

Each waits as well for Joe's eye on the Netlify test copy with the real records, which is how
group V's milestone is met.

| Check | Where it stands |
|---|---|
| V1 | By test (15 addresses give their view and give back the same address; 18 unknown addresses, items and values give not-found; every link leads to a view, in the three views) and by measure in a browser (10 addresses opened fresh; a click on a tab, Back and Forward; typing in the header adds one step to Back) |
| V2 | By test: with both boxes ticked every installer in the file's order, in the columns of each view; six sets of choices list exactly what they let through. On the real files: every installer has a row in the three views; the 8 ways of ticking the boxes list as many as the files give |
| V3 | By measure in a browser at 1440 and 1280, in the three views; shown failing on a copy with a broken style |
| V4 | By measure in a browser, 34 views at both widths, made-up installers; long text clipped to two lines has its whole text on hover; shown failing on a broken style. Waits for Joe's eye with the real records |
| V5 | By test on FAKE-102 (most filled) and FAKE-103 (fewest) and every made-up installer, in all three views; on the real files every Installer view in all three views |
| V6 | By test: one made-up installer per case (13), in Estimating and in Project management |
| V7 | By test, a hand-made DORMANT entry carrying a date among them; on the real files 54, all CONFIRMED BY PARTNER |
| V8 | By test: whole names and codes only; territory is Tier 1 (an installer with only Tier 2 there is not found by territory) |
| V9 | By test |
| V10 | By test, in the three views |
| V11 | By test |
| V12 | By test: "Expired" on the rows, in the Installer view and its Rates signal; mobilization as written |
| V13 | By test; on the real files 21 listed, as build.json counts |
| V14 | By test; on the real files About this data shows the 15 counts and gap counts and the 7 checks |
| V15 | By measure in a browser on made-up installers. Waits for Joe's eye with the real records |
| V16 | By test (7 cases) and the picture `data-not-loaded` |
| V17 | By test (13 old addresses) and by measure in a browser (4 old addresses replaced in history); shown failing on a copy that does not replace them |
| V18 | By test (six views in three views each) and by measure in a browser (clicks, Back, a fresh tab, nothing remembered); shown failing on a copy whose switch adds a step to Back |
| V19 | By test and by measure in a browser (a click, Space, the focus kept); shown failing on a copy whose boxes do nothing; on the real files, as many as the files give for every way of ticking |
| V20 | By test: every made-up installer in every view; About this data |

## M1 to M21

Each waits as well for Joe's eye on the Netlify test copy with the real records.

| Check | Where it stands |
|---|---|
| M1 | By test: all 52 at the step for their LISTED Tier 1 installers; colours; a code on every step at least 4.5 to 1. On the real files: 52 at their step. In a browser: every code at least 13px and 7.00 to 1 as drawn |
| M2 | By test; in a browser a click on Ohio opens it |
| M3 | By test (52 State views) and by measure in a browser (Ohio, Texas, Ontario, the District of Columbia) |
| M4 | By test, all 3,193 counties; on the real files, 3,193 at their step |
| M5 | By test, all 3,193 counties chosen in turn (Tier 1 and Tier 2 exactly); on the real files each county's Tier 1 list as many as the files give |
| M6 | By test (all 3,193 names; "All of Ohio") |
| M7 | By test on a model changed by hand: with and without a county chosen, and a ZIP in several counties |
| M8 | By test: the number from the data, in its two wordings; its link lists exactly those installers. On the real files 21 |
| M9 | By test with made-up data: Adams County, Ohio, El Paso County, Texas, the District of Columbia (nobody); Portage County, Ohio (Tier 2 only). Pictured: `place-county-nobody`, `place-county-no-tier1` |
| M10 | By test, 50 ZIP codes |
| M11 | By test on a model changed by hand: ZIP 44203, three counties |
| M12 | By test; pictured (49999, 00601) |
| M13 | By test and by measure in a browser |
| M14 | By test for every state and county, and by measure in a browser with the mouse and the keyboard (Tab, Enter, Space); shown failing on a copy whose button keeps its label. On the real files, the Tier 1 and Tier 2 lists of every place as many as the files give |
| M15 | By test on every made-up installer; on the real files 51 with Tier 1 territory and 1 available for travel only, beside the files |
| M16 | By measure in a browser at 1440 and 1280; shown failing on a copy whose map is below the box |
| M17 | By test for every county (3,193 with their state's code; 2,669 by name alone) and state; by measure in a browser (typing, the arrow keys, Escape, Enter); shown failing on a copy whose arrow keys do nothing |
| M18 | By test for every state and county; on the real files "Did not respond" and "Not on the map, with an office in" hold as many as the files give everywhere |
| M19 | By test, one made-up installer per case (7) |
| M20 | By measure in a browser at both sizes: the header and the location bar end at 138px at most, the first Tier 1 row at 316px at most (made-up installers). Waits for Joe's eye with the real records |
| M21 | By test (when built): 50 cities by a fixed rule; the files hold no city in several counties |

## npm run check:page:published, on the real files (October 8)

| Line | Result |
|---|---|
| views | PASS: 73 installers: 73 with a row in All installers in all three views, 73 found by a search for the company, 73 with an Installer view in all three views; 0 errors |
| fields | PASS: 73 Installer views in each of the three views: every filled field of section 4.6 shown, and no empty one (1,156 fields shown in Estimating) |
| words | PASS: 515 views and rows checked |
| counties | PASS: 52 installers with counties on the map, 408 states and provinces: each lists as many counties at each tier as the file's two counts |
| last confirmed | PASS: shows on 54; 54 are CONFIRMED BY PARTNER with a date; 0 wrong |
| not on the map | PASS: lists 21; build.json counts 21 without territory |
| about | PASS: the 15 counts and gap counts build.json holds, and its 7 checks |
| rows | PASS: a stand-in 30, beside 30; nobody in a place 16, beside 16; one person in both 12, beside 12 |
| home map | PASS: 52 states, each at the step for its number of installers with territory there |
| state views | PASS: 3,245 State views drawn |
| county maps | PASS: 3,193 counties, each at its step and its Tier 1 list as many when chosen |
| foot line | PASS: 21; build.json counts 21 |
| steps | PASS: counties none 0, step 1 9, step 2 2,943, step 3 206, step 4 35, step 5 0; states none 0, step 1 0, step 2 32, step 3 17, step 4 2, step 5 1; the same from the files |
| tier lists | PASS: 3,245 places; 8,005 Tier 1 entries and 10,148 Tier 2 entries, as many as the files give |
| side lists | PASS: 3,245 places; 0 "Did not respond" entries and 1,302 "Not on the map, with an office in" entries, as many as the files give |
| boxes | PASS: listed/from the files, no box 56/56; M 4/4; I 59/59; I M 7/7; D 70/70; D M 18/18; D I 73/73; D I M 21/21 |
| territory | PASS: About this data: 51 with territory (Tier 1), 1 available for travel only (Tier 2), beside the same from the files |

## In a browser

Microsoft Edge 154.0.4258.62, without a window, with a throwaway profile, against
`http://127.0.0.1` only, and told it could resolve no other host.

**npm run page:pictures** (about 110 seconds): V1, V3, V4, V15, V17, V18, V19, no request left
127.0.0.1, text size and contrast (smallest 12px, lowest 4.87 to 1), Tab and Escape (266 links,
buttons and fields in 5 views). V3, V4, V17, V18 and V19 shown failing on copies broken for
each. Pictures, each at 1440 and 1280: `installer-estimating`, `installer-pm`,
`installer-records`, `installer-state-open`, `installer-least-filled`, `installer-from-a-place`,
`all-installers-default`, `all-installers-pm`, `all-installers-records`,
`all-installers-all-boxes`, `all-installers-not-on-map`, `all-installers-search`,
`all-installers-search-contact`, `all-installers-no-match`, `show-all-contacts-open`,
`about-this-data`, `out-of-date-line`, `data-not-loaded`.

**npm run page:pictures:maps** (about 105 seconds): M16, M20, M14, the location box, addresses,
requests, width, errors, text, keyboard, no request left 127.0.0.1; each shown failing on a copy
broken for it. Pictures, each at 1440 and 1280: `find-installers`, `find-installers-typing`,
`place-county-estimating`, `place-county-pm`, `place-county-records`, `place-county-tier2-open`,
`place-state`, `place-state-TX`, `place-state-ON`, `place-zip-several`, `place-zip-one`,
`place-zip-not-in-list`, `place-zip-outside-map`, `place-county-no-tier1`, `place-county-nobody`,
`place-city`. All in `review-screens\`, not committed; the pictures of the old views were deleted.

## The checks

Before anything changed in this run, all passed: `npm run check`, `npm run check:selftest` (421
cases), `npm run check:job` (66 cases in 62 tests), `npm run check:published` (11 lines),
`npm run check:page` (46 lines) and `npm run check:page:published` (13 lines).

With all the work staged, before commit `9f01cb8`, all passed:

- `npm run check`: R1 to R7 and J19 PASS (188 tracked files; R5 scanned 185, the city files and
  the one allowed address among them); R6's GitHub half still printed as NOT YET SHOWN.
- `npm run check:selftest`: PASS, 483 cases (421 before this run).
- `npm run check:job`: PASS, 66 cases in 62 tests (unchanged).
- `npm run check:published`: PASS, 11 lines (unchanged).
- `npm run check:page`: PASS, 56 lines, 57 cases (46 lines before this run).
- `npm run check:page:published`: PASS, 17 lines (above; 13 before this run).

No QuickBase call was made in this run.

## J1 to J19

| Check | Where it stands |
|---|---|
| J1 | Shown with made-up installers and on the real records: every call listed by method and address |
| J2 | Shown with made-up installers and on the real records (73, 221, 17,745). The published build.json gives the same three counts, and the job on GitHub stops if the rows read differ from QuickBase's totals |
| J3 | Shown with made-up installers. On GitHub the first run had no last good run and passed with at least one installer; the scheduled run of October 8 is the first with a last good run |
| J4 to J7 | Shown with made-up installers; passed on the real records and in the published build.json (checks 2 to 5 passed) |
| J8 | Shown with made-up installers and on the real records; check 7 passed in the published build.json; R8 0 differences |
| J9 | Shown with made-up installers in a made-up repository. Waits for GitHub for "nothing is saved into the repository" and "the run shows as failed": no run on GitHub has failed |
| J10 | Shown with made-up installers and on the real records (two runs, same SHA-256). Now also across machines: GitHub (Linux, Node 22) and this laptop (Windows, Node 24.15.0) wrote the same bytes from the same records |
| J11 | Shown with made-up installers, and on the published files: 3,193 ids, all text, 318 begin with a zero |
| J12 | Shown with made-up installers, and on the published files: 25, 29, 23, equal to both other counts |
| J13 | Shown with made-up installers, and on the published files: on 54 installers, 0 with another status |
| J14 | Shown with made-up installers, and on the published files: 0 row places hold a departed contact |
| J15 | Shown with a stand-in clock and on the real records (at most 18 calls in any 10 seconds) |
| J16 | Shown with made-up installers. The rehearsal's leak scan found nothing on the real records |
| J17 | Waits for GitHub: the first two scheduled runs, on the mornings of October 8 and 9; builtAt must move forward on both |
| J18 | Started by hand: shown, the run of `404141f` passed and published. "Does the same thing as the scheduled one": waits for the first scheduled run; the workflow's shape check allows one job for both ways to start |
| J19 | Shown in a temporary repository; in `npm run check`, passes on the published files: both match their fingerprint and git shows no change under `public/data` |

R6: the repository half passes. The GitHub half is printed as NOT YET SHOWN. The run on GitHub
read QuickBase, so it read the key from the secret; that nothing it printed holds the key is
not yet shown by a check.

## The job, the workflow file and check:published

Unchanged in this run. As written at commit `22eeaba`:

### The job

- `node job/run.mjs --out <folder>`: writes into an existing, empty folder inside the system
  temp directory whose name, or that of a folder it sits in, begins `installer-index-`. On
  the laptop the key comes from `.env.local` in the folder above the repository.
- `node job/run.mjs --publish`: writes `public\data`; refused unless `GITHUB_ACTIONS` is
  "true". On GitHub the key, the realm and the app id come from `QB_USER_TOKEN`,
  `QB_REALM_HOSTNAME` and `QB_APP_ID`, and nowhere else.
- `--skip-count-guard`: leaves the count guard out for one run; at least one installer is
  still asked for; build.json writes `skipped` for the first check. Only a run started by
  hand with the box ticked passes it.
- Order of work: the three tables' fields (3 calls), check 7, the records (6 calls with 5,000
  rows to a page), the rows read compared with QuickBase's totals, shaping twice (check 6),
  checks 1 to 6, and only then the write. A failed check writes nothing and names the check,
  its number, its name and counts.

### The workflow file

- Starts two ways: `schedule` with one time, `cron: '20 9 * * *'` (09:20 UTC every day), and
  `workflow_dispatch` with the box `skip_count_guard`. Nothing else it does changed.
- On a scheduled run there is no box: `inputs.skip_count_guard` is empty, the line that runs
  the job adds nothing, and the scheduled run never skips the count guard. A comment on a
  line of its own above that line says so.
- `checkWorkflow` in `scripts\checks.mjs` holds the one shape the file may have, now with the
  two ways to start and that one time. A failure names the first line of the file that is not
  as the shape has it, by its line number in the file, and what the shape has there; it never
  repeats a line of the file.

### check:published

`node scripts/check-published.mjs [folder]` reads the three files in `public\data`, or in the
folder given. It has its own code: the names, the seven check names, the five statuses and the
two roles are written out from section 3.6 of `docs\SPEC.md`, not taken from the job. Each line
prints PASS or FAIL with counts: `files`, `build.json`, `checks`, `fingerprints`, `counts`,
`J11`, `J12`, `J13`, `J14`, `empties`, `dates`; then builtAt, the counts of installers,
contacts and territory rows build.json gives, whether the first check was skipped, and the
three sizes. An error is printed by its kind and step only.

On the published files, October 8 (builtAt 2026-10-08T16:29:39Z): every line PASS; installers
73, contacts 221, territory rows 17,745; CONFIRMED BY PARTNER 54, DORMANT - NO RESPONSE 14,
INACTIVE 2, PENDING - UPDATE EXPECTED 2, HELD - BUSINESS DECISION 1; with territory 52, without
21; counties covered 3,193. Sizes: installers.json 119,198 bytes; territory.json 358,681;
build.json 1,745. The files held 73 installers in this run.

## Git

- `a6cc628` "Daily data refresh" by github-actions[bot], `public/data/build.json` alone, came in
  with the pull at the start.
- `25cfd7d` "Specification revision 9 and acceptance checks version 3: the redesign".
- `d7fa2f2` "City lookup's files: public/geo/cities, built from the place list".
- `6187b87` "The page: the views of the ninth revision, and their tests".
- `9f01cb8` "The page: the redesign of the ninth revision": the picture commands and their
  measures, the last changes after looking at the pictures, README.md and this file.
- Each pushed to `origin main` with the five checks passing. Nothing under `public/data` in any
  of them. No "Daily data refresh" came in between. This file's final results are the commit
  after `9f01cb8`.

## Not built

The phone layout (group P); address search (group A); the server copy (group T).

## What comes next

1. Joe goes through the redesign on the Netlify test copy with the real records: Find
   installers, a place in each of the three views with Tier 2 opened, the Installer view, All
   installers with its boxes, and the location box (groups V and M, and V1, V4, V15, M16 and M20
   with the real records).
2. Then the phone layout (group P).

## Worth knowing

- Every chat starts with `git pull`: the job commits to `main` every day.
- The page is never opened on the laptop with the real records. The picture commands build
  made-up data in temporary folders and their server has no way to serve `public\data\`;
  `npm run check:page:published` reads the real files with node and prints counts only.
- The view switch is remembered in the browser's local storage under `installer-index-view`.
  A picture or measure that must not depend on it puts `view=` in its address.
- The page's tests and pictures make their temporary folders as `installer-index-page-*`,
  `installer-index-browser-*`, `installer-index-broken-*` and `installer-index-fresh-*` (and the
  like), and delete each by its own path.
- `npm run page:pictures` and `npm run page:pictures:maps` each run within Claude Code's ten
  minutes (about 110 and 105 seconds); run them one after the other, never in the background.
- Chrome and Edge keep at most 50 steps of history, so a measure counts a step to Back by going
  Back, not by the length of the history.
- The made-up installers now number 38 (27 of the job's, 11 of the page's). FAKE-107 to FAKE-111
  were added for the redesign: Tier 2 only (and the only installer of Portage County, Ohio, at
  Tier 2); DORMANT with territory in Summit County; INACTIVE with Tier 1 in Summit County; not on
  the map with an office in Ohio; PENDING with an unreachable field contact, two receiving
  contacts and agreement Yes with certificate No.
- A broken case in `scripts\page-tests.mjs` or `map-tests.mjs` hands the test a broken stand-in
  for one of the page's functions, or a changed copy of what a view gave back, and carries
  `mustSay`.
- Title and Procedure are empty on all 221 real contacts, so those lines will not show on the
  test copy until QuickBase holds them.
- On the real files no DORMANT - NO RESPONSE installer has a county at either tier, so "Did not
  respond to the August outreach" shows nowhere on the test copy today.
