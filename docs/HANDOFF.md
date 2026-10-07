# Handoff: state for the next Claude Code chat

**Written:** October 7, 2026, at the end of the page's first prompt (Joe's prompt "The page,
part 1", revision 1: the frame and the desktop views).

## Where things stand

- **The page's desktop views are built**, as far as acceptance group V: the frame, Home
  without its map, All installers, Installer, Search results, Not on the map, About this data,
  a not-found view, and the view for data that cannot be loaded. Plain files in `public\`,
  nothing to build.
- **They were checked three ways, all on made-up installers or by counts only:**
  `npm run check:page` (24 lines, the page's plain functions on made-up installers),
  `npm run page:pictures` (Microsoft Edge without a window, against a local server that
  serves made-up installers only: 30 pictures and 9 measures), and
  `npm run check:page:published` (the same functions over the real files, counts only).
- **The page was never loaded, pictured or copied with the real records on the laptop.** The
  local server cannot serve `public\data\`.
- **Next:** Joe ties a Netlify site to the GitHub repository, serving the `public` folder with
  no build step. That is where he sees the page with the real records.
- **The daily job** runs on GitHub every day at 09:20 UTC. Nothing the job runs or tests
  changed in this run. The first scheduled runs are on the mornings of October 8 and 9 (J17).

## What the repository holds

- `CLAUDE.md`, `docs\SPEC.md` (eighth revision) and `docs\ACCEPTANCE.md`: Joe's text,
  unchanged in this run.
- `README.md`, for Kuna: now also how the page is laid out, that it is plain files served from
  `public\`, that the addresses after the `#` need no settings on a host, that the page reads
  four files and never calls QuickBase, the page's three commands, and where the fonts and the
  logo came from.
- `public\index.html`; `public\css\fonts.css` and `site.css`; `public\js\app.js` (the only part
  that touches the browser), `data.js`, `routes.js`, `search.js`, `contacts.js`, `views.js`,
  `format.js`, `html.js`; `public\img\` (logo and icons); `public\vendor\fonts\` (four font
  files). The `.gitkeep` files of `public\js`, `public\css` and `public\vendor` are gone.
- `public\geo\counties.json` and `public\data\`: unchanged by this run.
- `job\` and `.github\workflows\daily-data.yml`: unchanged.
- `scripts\`:
  - new: `check-page.mjs` (`npm run check:page`), `page-tests.mjs` (its tests),
    `check-page-published.mjs` (`npm run check:page:published`), `page-published-tests.mjs`
    (its self-test cases), `page-standins.mjs` (made-up data, tree helpers, section 4.4 written
    out), `serve-made-up.mjs` (the local server), `page-pictures.mjs` (`npm run page:pictures`),
    `fixtures\page-installers.json` (6 made-up installers, 11 contacts, 7 territory rows, for
    cases the job's fixtures lack).
  - changed: `check-selftest.mjs` (runs the page's tests and cleans their temporary folders),
    `package.json` (three scripts added).
  - unchanged: `checks.mjs`, `check.mjs`, `job-tests.mjs`, `job-standins.mjs`, `check-job.mjs`,
    `published-tests.mjs`, `check-published.mjs`, `fixtures\installers.json`,
    `fixtures\fingerprints.json`, `r5-allowed.json` (still empty).

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

## The rulings, as built

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

## In a browser (npm run page:pictures)

Microsoft Edge 154.0.4258.62, without a window, with a throwaway profile, against
`http://127.0.0.1` only, and told it could resolve no other host. Every measure passed: V1,
V3, V4, V15, no request left 127.0.0.1 (976 requests), text size and contrast (3,516 pieces
of text: smallest 12px, lowest 4.98 to 1), Tab and Escape (179 links, buttons and fields in 6
views reached in the page's order with a green focus ring; Escape closes "Show all contacts"
and an open state). V3 and V4 were shown failing on a copy of the page with a broken style.

Pictures, each at 1440 and 1280, in `review-screens\` (not committed): `home`,
`all-installers-contact-info`, `all-installers-rates`, `all-installers-one-status`,
`installer-everything-filled`, `installer-state-open`, `installer-least-filled`,
`show-all-contacts-open`, `search-contact-not-on-row`, `search-no-match`, `search-state`,
`not-on-the-map`, `about-this-data`, `out-of-date-line`, `data-not-loaded`.

## The checks

On October 7, with the work staged, before commit `93a3dc7`:

- `npm run check`: R1 to R7 and J19 PASS (65 tracked files; R5 scanned 62); R6's GitHub half is
  still printed as NOT YET SHOWN.
- `npm run check:selftest`: PASS, 343 cases (259 before this run): 73 cases of the page's
  tests (25 sound, 48 broken) and 11 of `check:page:published` (1 sound, 10 broken) are new.
- `npm run check:job`: PASS, 66 cases in 62 tests (unchanged).
- `npm run check:published`: PASS, 11 lines (unchanged).
- `npm run check:page`: PASS, 24 lines, 25 cases.
- `npm run check:page:published`: PASS, 8 lines (above).

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

- `22eeaba`: the handoff of the job's second prompt. No commit came after it before this run.
- `93a3dc7` "The page: frame, All installers, Installer, Search, Not on the map, About this
  data", pushed to `origin main` on October 7. GitHub answered the first two pushes with
  "Internal Server Error" and took the third, three minutes later; its main had not moved in
  between. Nothing under `public/data` in it.
- This file's final results are the commit after `93a3dc7`.

## Not built

The map on Home; the State view; the county map; ZIP lookup (five digits in the search box say
"ZIP code lookup comes with the map views."); the phone layout; address search; the county
shapes, the state map and the ZIP list of `public\geo\`; the Netlify test copy.

## What comes next

1. Joe ties a Netlify site to the GitHub repository, serving the `public` folder with no build
   step, and looks at the page with the real records (V4, V15 and V1 there, and the look).
2. The first two scheduled runs of the job, on the mornings of October 8 and 9 (J17, J18).
3. Then the map, the State view, the county map and ZIP lookup (group M).

## Worth knowing

- Every chat starts with `git pull`: the job commits to `main` every day.
- The page is never opened on the laptop with the real records. `npm run page:pictures` builds
  made-up data in temporary folders and its server has no way to serve `public\data\`;
  `npm run check:page:published` reads the real files with node and prints counts only.
- The page's tests and pictures make their temporary folders as `installer-index-page-*`,
  `installer-index-browser-*` and `installer-index-broken-style-*`, and delete each by its own
  path.
- A broken case in `scripts\page-tests.mjs` hands the test a broken stand-in for one of the
  page's functions, or a changed copy of what a view gave back, and carries `mustSay`.
- An email is matched from the start of any word of the part before the @ (a period, a hyphen,
  an underscore or a plus sign parts the words), from the start of the part after the @, or
  anywhere once what is typed holds an @ or a period (the page's second prompt, step 3). Two
  letters such as "co" no longer find every address ending ".com".
- Title and Procedure are empty on all 221 real contacts, so those lines will not show on the
  test copy until QuickBase holds them.
