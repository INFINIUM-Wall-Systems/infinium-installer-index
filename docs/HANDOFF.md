# Handoff: state for the next Claude Code chat

**Written:** October 7, 2026, at the end of the page's second prompt (Joe's prompt "The page,
part 2", revision 1: the map, the State view, counties and ZIP codes).

## Where things stand

- **The map views are built**, as far as acceptance group M, on a desktop screen: the map on
  Home of the states and Ontario, with its legend and a list of every state; the State view,
  with its county map, its county box and its list; and ZIP lookup. Also the shape files and the
  ZIP list in `public\geo\`, and one repair to search (an email is matched by its words).
- **The desktop views of the first prompt** stand as they were, with the changes this prompt
  names: links to a state's view (ruling 8), the line under a search that names a state
  (ruling 7), ZIP codes named in the search box's hint, Home's line and the list of what can be
  searched, and the credits on About this data (ruling 5). Joe looked at them on the Netlify
  test copy with the real records and said to go on.
- **Checked four ways, on made-up installers or by counts only:** `npm run check:page` (46
  lines), `npm run page:pictures` and the new `npm run page:pictures:maps` (Microsoft Edge
  without a window, against a local server that serves made-up installers only), and
  `npm run check:page:published` (13 lines over the real files, counts only).
- **The page was never loaded, pictured or copied with the real records on the laptop.**
- **Next:** Joe goes through the layout of the whole page on the Netlify test copy, then the
  phone layout.
- **The daily job** runs on GitHub every day at 09:20 UTC. Nothing it runs or tests changed.

## What the repository holds

- `CLAUDE.md`, `docs\SPEC.md` (eighth revision) and `docs\ACCEPTANCE.md`: Joe's text,
  unchanged.
- `README.md`, for Kuna: now also how the maps are drawn and that nothing comes from another
  site; the files of `public\geo\`, what made each, how to make them again and where their
  sources lie; the credits; and `npm run page:pictures:maps`.
- `public\`: `index.html`; `css\fonts.css`, `css\site.css`; `js\app.js` (the only part that
  touches the browser), `data.js`, `routes.js`, `search.js`, `contacts.js`, `views.js`,
  `maps.js` (new: the maps), `format.js`, `html.js`; `img\`; `vendor\fonts\` (the fonts alone);
  `geo\counties.json` (unchanged), `geo\states-map.json`, `geo\counties\` (52 files) and
  `geo\zips\` (10 files), all new; `data\` (only the job writes it).
- `job\`: `build-shapes.mjs` and `build-zips.mjs` are new, run by hand, never by the daily job.
  Nothing the daily job loads changed.
- `scripts\`:
  - new: `map-tests.mjs` (the tests of the map work, in `check:page`), `page-browser.mjs` (what
    both picture commands share), `page-pictures-maps.mjs` (`npm run page:pictures:maps`).
  - changed: `check-page.mjs` (runs the map tests too), `page-tests.mjs` (V9 and V11 brought to
    the new rules; the email test), `check-page-published.mjs` (5 map lines),
    `page-published-tests.mjs` (their self-test cases), `page-pictures.mjs` (on the shared
    harness; its views wait for their maps), `check-selftest.mjs` (runs the map tests),
    `package.json` (`page:pictures:maps` added).
  - unchanged: `checks.mjs`, `check.mjs`, `job-tests.mjs`, `job-standins.mjs`, `check-job.mjs`,
    `published-tests.mjs`, `check-published.mjs`, `serve-made-up.mjs`, `page-standins.mjs`, the
    two job fixtures, `fixtures\page-installers.json`, `r5-allowed.json` (still empty).

## The map and ZIP files (public\geo)

Built by hand, by `node job/build-shapes.mjs` and `node job/build-zips.mjs`. The same sources
give the same bytes (built twice, same SHA-256).

| What | Files | Bytes |
|---|---|---|
| `states-map.json`, the Home map | 1 | 88,825 |
| `counties\<code>.json`, one county map for each of the 52 | 52 | 494,809 in all; the largest `ON.json`, 63,148; the smallest `DC.json`, 165 |
| `zips\0.json` to `zips\9.json`, the ZIP list by first digit | 10 | 1,387,970 in all; the largest `4.json`, 160,619 |
| In all | 63 | 1,971,604 |

- **Outlines:** `public/data/counties.topo.json` of `installer-application` at `a6fc6db`
  (990,334 bytes; 10,141 arcs; 3,193 county outlines and 52 state outlines, the states already
  joined; quantized TopoJSON in longitude and latitude), read with `git show` and held in
  memory. Its county ids are those of `counties.json`: each of the 3,193 has one shape, in its
  own state's file.
- **What was done to them:** each arc projected, put into its frame, rounded to whole units, and
  a point that repeats the one before dropped. No further thinning (the source is already
  simplified): the Home map keeps 14,887 of 15,414 points, the county maps 49,568 of 49,883.
  Paths are written `M x,y l dx,dy,... z`, whole numbers, a comma between every two, so that
  R5 reads no phone number in them.
- **Projections:** the Home map, 9,600 by 7,377 units: the 48 adjoining states, the District of
  Columbia and Ontario in one Albers equal-area conic (parallels 29.5 and 45.5 degrees north,
  centred on 96 west); Alaska (its own conic, parallels 55 and 65, at 0.35 of the main scale)
  and Hawaii (parallels 8 and 18, at 0.8) in the lower left, each below every state above it.
  Codes fit on 44 states; not on CT, DC, DE, HI, MA, MD, NJ and RI, which the list under the
  map covers. Each state's map: an Albers conic centred on the state, parallels at one sixth
  and five sixths of its span of latitude, north up, fitted into 6,400 by 5,600 units with a
  margin of 60, centred. For Alaska, 360 is taken from a longitude above zero (the source holds
  none: it was clipped at 180 west).
- **ZIP list:** `coverage-map\data\geo\zip-to-county.csv`, read where it lies: 2,437,863 bytes;
  46,969 rows; 33,791 ZIP codes; 3,233 county codes, 3,144 of them in the county list. Outside
  the map, by first digit: 0: 138 (PR 132, VI 6); 9: 11 (GU 7, MP 3, AS 1); every other digit
  0; none beginning 06. No ZIP has some counties in the list and some not.

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

- All four font files are variable fonts with a weight axis from 100 to 900 (read from each
  file's own axis table), so `css\fonts.css` declares `font-weight: 100 900` and every weight
  the look calls for (Montserrat 600, 700, 800; Roboto 400, 500, 700) is carried. No nearest
  weight was needed.
- The two SVG files carry only the fixed names that mark an SVG's kind
  (`http://www.w3.org/2000/svg`, `http://www.w3.org/1999/xlink`), and LF line endings.
- R5 and R6 read the fonts and the PNGs as text and found nothing; neither check nor
  `r5-allowed.json` was changed.

## How the page works

- `app.js` fetches the four files (`data/build.json`, `data/installers.json`,
  `data/territory.json`, `geo/counties.json`), by addresses relative to the page, and hands
  them to `data.js`, which checks that each reads as JSON with `"schema": 1`. Otherwise the page
  shows only "The installer data could not be loaded" and "Please try again shortly."
- Every view is a plain function in `views.js` that takes the route, the data and the time, and
  gives back a tree of elements. `html.js` turns the tree into markup in one place and makes
  every value taken from the data safe there.
- Addresses: `#/`, `#/installers`, `#/installers?set=rates`, `#/installers?status=<status>`
  (joined with `set` as `?set=rates&status=...`), `#/installer/<installer id>`,
  `#/search?q=<text>`, `#/not-on-the-map`, `#/about`. Anything else, an unknown status, or an
  installer id not in the file gives the not-found view. Typing in the search box shows results
  as you type; the first letter adds one step to Back, the rest replace it.
- Eastern time is worked out from the United States daylight-time rule, not the machine's
  settings. It agrees with node's own time-zone data at every 90 minutes of 2026 and 2027
  (11,680 times, in `check:page`).
- The map work adds `#/state/<code>`, `#/state/<code>?county=<id>` and `#/zip/<five digits>`;
  `#/search?q=<five digits>` shows what the ZIP's own address shows. A code or a county id not
  in the county list, a county of another state, and a ZIP that is not five digits give the
  not-found view. The search box gives a ZIP's address for five digits, spaces around them
  aside, and a search's for anything else (`boxAddress` in `routes.js`); typing a ZIP adds one
  step to Back.
- Which files an address needs beyond the four is `filesFor` in `views.js`: Home the Home map;
  a State view its own shape file; a ZIP its ZIP file, then, for a ZIP in one county, that
  state's shape file. `app.js` fetches each once and keeps it. The list shows at once; when a
  map's file comes, only the map's part (`[data-map-slot]`) is filled in, and marked
  `data-map="drawn"`, or `"failed"` with one line saying the map could not be drawn.
- `maps.js` draws the maps as plain SVG markup (svg, g, a, path, text, title): each state or
  county a link to its address, shaded on the five steps (1; 2 to 3; 4 to 6; 7 to 10; 11 up)
  in the old page's greens, white with a line-coloured border for none. The border and green
  ring of the shape under the pointer or the focus are drawn by `app.js` on two empty paths at
  the end of the map, so no neighbour hides them. The chosen county's heavy outline is drawn
  again over the map last, not a link.

## The rulings of the second prompt, as built

1. The county maps are drawn as plain SVG from the application form's county outlines, not
   with its map library. `public\vendor\` holds only the fonts.
2. The Home map is drawn from the same outlines. Ontario is a shape in its true place, above the
   Great Lakes.
3. Under the Home map, "Every state and Ontario": all 52 by name with their code, each with its
   number of installers ("3 installers", "1 installer", "no installer") and a link to its view.
4. The ZIP list is ten files by first digit; only the one needed is loaded.
5. About this data has a part "Where the maps come from" with the three lines of step 4f.
6. An email is matched from the start of any word before the @ (a period, hyphen, underscore
   or plus sign parts the words), from the start of the part after the @, or anywhere when
   what is typed holds an @ or a period.
7. A search that names a state shows, above its results, "Open the map of <state>".
8. In States covered the codes are links; in the Installer view, the first line inside each
   state is "Open the map of <state>", and the line that opens it holds no link; a search
   result found by territory links the state's name to its view.

## The rulings of the first prompt, as built

1. Search by state finds an installer whose office is in that state and one whose territory
   includes it. A result found by territory shows "Territory includes <state>: Tier 1 in N
   counties, Tier 2 in M".
2. A departed contact is searched; a result that matched one shows that contact under
   "Matched contact", marked "Departed". Departed contacts never appear on a row.
3. Paperwork is a panel headed "Paperwork, as recorded in QuickBase": installer agreement on
   file; valid certificate of insurance on file; certificate valid through, when filled.
4. The Tier 2 charge panel shows whichever of basis, charge unit, charge unit as described,
   charge amount and charge relation are filled; none filled, no panel.
5. A ticked "Not applicable" box with its field empty shows "Not applicable" for the shipping
   address, the second shipping address, the travel note and the EMR. A value is shown when
   there is one.
6. A contact's procedure shows under that contact, labeled "Procedure", wherever the contact
   is shown.
7. "Rates expired" compares the valid-through date with today's date in Eastern time.
8. More than 36 hours after builtAt, the line reads "Installer records from QuickBase. Not
   refreshed since <date>." with the label "Out of date".
9. The logo and the icons are in `public\img\`.
10. The coverage note: for an installer with no territory it stands in the territory panel,
    labeled "Coverage note, not confirmed on the map"; with territory it follows the states,
    labeled "Coverage note".

## V1 to V16

| Check | Where it stands |
|---|---|
| V1 | Shown by test (`check:page` V1: 12 addresses give their view and give back the same address; 10 unknown addresses give not-found; 152 links lead to a view) and by measure in a browser (10 addresses opened fresh; Back and Forward; typing adds one step to Back). Waits for Joe's eye on the Netlify test copy |
| V2 | Shown by test: every installer in the file's order (the job's order: company, then id), both column sets with the columns of section 4.3, the status filter for each status. On the real files every installer has a row in both sets (73) |
| V3 | Shown by measure in a browser at 1440 and 1280, both column sets; shown failing on a copy with a broken style |
| V4 | Shown by measure in a browser in 15 views at both widths, made-up installers; shown failing on a copy with a broken style. Waits for Joe's eye on the Netlify test copy with the real records |
| V5 | Shown by test on a made-up installer with everything filled (27 fields) and one with as little as the files allow, and every made-up installer; on the real files, 73 Installer views show every filled field and no empty one |
| V6 | Shown by test, one made-up installer for each case the check names (13 rows) |
| V7 | Shown by test, including a hand-made DORMANT entry carrying a date; on the real files, shown on 54, all CONFIRMED BY PARTNER |
| V8 | Shown by test |
| V9 | Shown by test |
| V10 | Shown by test |
| V11 | Shown by test |
| V12 | Shown by test, today handed in: a date of today is not expired, the day before is, in all three places; mobilization as written |
| V13 | Shown by test; on the real files, 21 listed, as build.json counts |
| V14 | Shown by test, including 03:30 UTC as the day before in Eastern time, and ruling 8 at 35 and 37 hours; on the real files, About shows all 15 counts and gap counts and the 7 checks |
| V15 | Shown by measure in a browser on made-up installers: no script error in any view. Waits for Joe's eye on the Netlify test copy with the real records |
| V16 | Shown by test (a file missing, not JSON, schema not 1: 7 cases) and in a browser picture with `installers.json` missing |

## M1 to M13

Each waits as well for Joe's eye on the Netlify test copy with the real records, which is how
group M's milestone is met.

| Check | Where it stands |
|---|---|
| M1 | Shown by test: all 52 shaded at the step for the installers territory.json gives them; the steps at their edges; the five colours; a code on every step at least 4.5 to 1. On the real files: 52 at their step (`home map`). In a browser: every code at least 13px and 9.8 to 1 as drawn |
| M2 | Shown by test: every state and Ontario links to its view, on the map and in the list. In a browser: a click on Ohio opens it; Enter on five states of the map |
| M3 | Shown by test: each of the 52 State views asks for its own shape file alone. In a browser: Ohio, Texas, Ontario and the District of Columbia each fetched their own file alone |
| M4 | Shown by test for all 3,193 counties. On the real files: 3,193 at their step (`county maps`) |
| M5 | Shown by test for all 3,193 counties chosen in turn, 01001 and the Ontario divisions among them; 3,178 of them served by none of the made-up installers. On the real files: each county, chosen, lists as many installers as territory.json gives it |
| M6 | Shown by test for all 3,193 names: the box gives the same address as the county's link; matched from the start of a word, capitals aside; "Show all of Ohio" gives Ohio's address |
| M7 | Shown by test on a model changed by hand, so that the file's order and the tiers' differ; the file's order is alphabetical by company |
| M8 | Shown by test: the number from the data (25, then 1 with its own wording); a number written in fails. On the real files: 21, build.json's number (`foot line`) |
| M9 | Shown by test: Adams County, Ohio; El Paso County, Texas; the District of Columbia. On the real files no county is unserved today |
| M10 | Shown by test: 50 ZIP codes by a fixed rule, 12 crossing a county line and 5 beginning with a zero |
| M11 | Shown by test on a model changed by hand: ZIP 44203, three counties, each installer once at its best tier |
| M12 | Shown by test, in section 4.9's words; pictured in a browser (49999, 00601) |
| M13 | Shown by test (11 addresses ask for no ZIP file; a ZIP for the one file of its first digit), and by measure in a browser |

## npm run check:page:published, on the real files (October 7)

| Line | Result |
|---|---|
| views | PASS: 73 installers: 73 with a row in both column sets, 73 found by a search for the company, 73 Installer views; 0 errors |
| fields | PASS: 73 Installer views checked: every filled field of section 4.4 shown, and no empty one (1,029 fields shown) |
| words | PASS: 295 views and rows checked: none holds undefined, null, NaN or [object Object] |
| counties | PASS: 52 installers with territory, 408 states and provinces: each lists as many counties at each tier as the file's two counts |
| last confirmed | PASS: shows on 54; 54 are CONFIRMED BY PARTNER with a date; 0 wrong |
| not on the map | PASS: lists 21; build.json counts 21 without territory |
| about | PASS: the 15 counts and gap counts build.json holds, and its 7 checks |
| rows | PASS: rows showing a stand-in 30, beside 30 from the file; nobody in a place 16, beside 16; one person in both places 12, beside 12 |
| home map | PASS: 52 states, each at the step for its number of installers |
| state views | PASS: 3,245 State views drawn, 52 with no county chosen and 3,193 with one |
| county maps | PASS: 3,193 counties, each at the step for its number of installers, and each listing as many when chosen |
| foot line | PASS: the foot line carries 21; build.json counts 21 without territory |
| steps | PASS: counties none 0, step 1 0, step 2 96, step 3 2,499, step 4 551, step 5 47; states none 0, step 1 0, step 2 2, step 3 13, step 4 30, step 5 7; the same from the file |

## In a browser

Microsoft Edge 154.0.4258.62, without a window, with a throwaway profile, against
`http://127.0.0.1` only, and told it could resolve no other host. Both commands share
`scripts\page-browser.mjs`; each waits, for a view with a map, until the map's part is marked.

**npm run page:pictures** (22 seconds; October 7, after the last change to the page). Every
measure passed: V1, V3, V4, V15, no request left 127.0.0.1 (1,037 requests), text size and
contrast (4,158 pieces of text: smallest 12px, lowest 4.98 to 1), Tab and Escape (297 links,
buttons and fields in 6 views, the 52 states of the Home map among them, reached in order with
a ring). V3 and V4 shown failing on a copy with a broken style. Pictures, each at 1440 and 1280:
`home`, `all-installers-contact-info`, `all-installers-rates`, `all-installers-one-status`,
`installer-everything-filled`, `installer-state-open`, `installer-least-filled`,
`show-all-contacts-open`, `search-contact-not-on-row`, `search-no-match`, `search-state`,
`not-on-the-map`, `about-this-data`, `out-of-date-line`, `data-not-loaded`.

**npm run page:pictures:maps** (96 seconds). Every measure passed, and each was shown failing on
a copy of the page broken for it:

| Measure | Result | Shown failing on |
|---|---|---|
| addresses | 10 new addresses opened fresh, each its view; a mouse click on Ohio and on Summit County, Back twice and Forward; typing a ZIP gives its address, one Back returns to Home | a copy whose router sends a state's address to not-found |
| requests | a State view fetched its own shape file alone (Ohio, Texas, Ontario, the District of Columbia); no ZIP file before a ZIP; a ZIP the one file of its first digit; 2,589 requests, all to 127.0.0.1 | a copy that fetches a ZIP file on Home |
| width | 19 views at both widths, every map drawn: no map wider than its panel, no sideways scroll | a copy whose map is 2,600px wide |
| errors | no script error in any view | a copy whose map stops with an error |
| text | every piece of text at least 12px and 4.5 to 1; 176 codes on maps measured as drawn, smallest 13px, lowest 9.80 to 1 against their own state | a copy whose codes are 6px and pale (44 codes caught) |
| keyboard | all 52 states, and every county of Ohio, Texas, the District of Columbia and Ontario, reached with Tab in order, the green ring drawn on the shape; Enter on the first, the last and three between; the skip links move the focus past the map and leave the address alone | a copy whose states cannot be reached with Tab |

Pictures, each at 1440 and 1280: `home-map`, `home-state-by-tab`, `state-OH`, `state-TX`,
`state-AK`, `state-HI`, `state-MI`, `state-VA`, `state-LA`, `state-DC`, `state-ON`,
`state-county-chosen` (Summit County, Ohio), `state-county-nobody-serves` (Adams County, Ohio),
`zip-one-county` (44056), `zip-several-counties` (44203), `zip-not-in-list` (49999),
`zip-outside-map` (00601), `about-this-data-maps`, `search-names-state`; and at 1440 each map's
panel alone (`map-panel-*`, 13 pictures). All in `review-screens\`, not committed.

## The checks

Before anything changed in this run, all passed: `npm run check` (R1 to R7 and J19),
`npm run check:selftest` (343 cases), `npm run check:job` (66 cases in 62 tests),
`npm run check:published` (11 lines), `npm run check:page` (24 lines) and
`npm run check:page:published` (8 lines).

With all the work staged, before commit `62fda86`, all passed:

- `npm run check`: R1 to R7 and J19 PASS (134 tracked files; R5 scanned 131); R6's GitHub half
  still printed as NOT YET SHOWN.
- `npm run check:selftest`: PASS, 421 cases (343 before this run; 78 new: 15 for the built
  files, 6 for the email repair, 52 for M1 to M13, the addresses, the unloadable files, the four
  rulings and the words, and 5 for the map lines of `check:page:published`).
- `npm run check:job`: PASS, 66 cases in 62 tests (unchanged).
- `npm run check:published`: PASS, 11 lines (unchanged).
- `npm run check:page`: PASS, 46 lines, 47 cases.
- `npm run check:page:published`: PASS, 13 lines (above).

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

On the published files, October 7:

| Line | Result |
|---|---|
| files | PASS: the three files are there, each reads as JSON |
| build.json | PASS: the names of section 3.6 in order, schema 1, builtAt reads as it should |
| checks | PASS: the seven checks by number and name, each passed; the first was skipped: no |
| fingerprints | PASS: installers.json and territory.json match their SHA-256 in build.json |
| counts | PASS: installers 73; contacts 221; CONFIRMED BY PARTNER 54; DORMANT - NO RESPONSE 14; INACTIVE 2; PENDING - UPDATE EXPECTED 2; HELD - BUSINESS DECISION 1; with territory 52; without 21; counties covered 3,193 |
| J11 | PASS: 3,193 county ids, all in territory.json, 0 not text, 318 begin with a zero |
| J12 | PASS: gap counts 25, 29, 23; from the contacts' roles 25, 29, 23; from the rows' gaps 25, 29, 23 |
| J13 | PASS: lastConfirmed on 54 installers, 0 with another status |
| J14 | PASS: 130 row places filled, 0 hold a departed contact, 0 point at no contact; 11 contacts marked departed |
| empties | PASS: null 0, empty text 0, empty list 0, empty group 0 |
| dates | PASS: 112 dates, 0 not written like 2026-10-06 |

builtAt 2026-10-07T13:31:41Z. build.json gives installers 73, contacts 221, territory rows
17,745. Sizes: installers.json 119,198 bytes; territory.json 358,681; build.json 1,745.

## Git

- `6bd89ba`: the handoff of the page's first prompt. No commit came after it before this run.
- `decdda8` "Map shapes and the ZIP list in public/geo, their two scripts and their test".
- `57cd85d` "Search: an email is matched by its words, not anywhere in it".
- `62fda86` "The page: the Home map, the State view, county maps and ZIP lookup".
- All three pushed to `origin main` on October 7, each with the five checks passing. Nothing
  under `public/data` in any of them. No "Daily data refresh" came in between.
- This file's final results are the commit after `62fda86`.

## Not built

The phone layout (group P); address search (group A); the server copy (group T).

## What comes next

1. Joe goes through the layout of the whole page on the Netlify test copy, the map views with
   the real records among it (group M's look, and V1, V4 and V15 with the real records).
2. Then the phone layout (group P).

## Worth knowing

- Every chat starts with `git pull`: the job commits to `main` every day.
- The page is never opened on the laptop with the real records. `npm run page:pictures` builds
  made-up data in temporary folders and its server has no way to serve `public\data\`;
  `npm run check:page:published` reads the real files with node and prints counts only.
- The page's tests and pictures make their temporary folders as `installer-index-page-*`,
  `installer-index-browser-*`, `installer-index-broken-style-*` and
  `installer-index-broken-<measure>-*`, and delete each by its own path.
- `npm run page:pictures` and `npm run page:pictures:maps` each run within Claude Code's ten
  minutes (22 and 96 seconds); run them one after the other, never in the background.
- Chrome and Edge keep at most 50 steps of history, so a measure counts a step to Back by going
  Back, not by the length of the history.
- The made-up installers cover 15 counties; 3,178 counties and most states have none of them,
  which is what the tests of a county nobody serves use. On the real files every county is
  served today.
- A broken case in `scripts\page-tests.mjs` hands the test a broken stand-in for one of the
  page's functions, or a changed copy of what a view gave back, and carries `mustSay`.
- An email is matched from the start of any word of the part before the @ (a period, a hyphen,
  an underscore or a plus sign parts the words), from the start of the part after the @, or
  anywhere once what is typed holds an @ or a period (the page's second prompt, step 3). Two
  letters such as "co" no longer find every address ending ".com".
- Title and Procedure are empty on all 221 real contacts, so those lines will not show on the
  test copy until QuickBase holds them.
