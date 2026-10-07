# Handoff: state for the next Claude Code chat

**Written:** October 7, 2026, at the end of the daily job's second prompt (Joe's prompt
revision 1: check what was published, then switch the daily schedule on).

## Where things stand

- **The first run on GitHub, started by hand, passed and published.** It ended green in 19
  seconds and saved `build.json`, `installers.json` and `territory.json` into `public\data\`
  in commit `404141f`, by github-actions[bot], "Daily data refresh". That commit changed
  those three files and nothing else. It was pulled to the laptop in this run.
- **The published files were checked on the laptop** by the new `npm run check:published`:
  every line passed (below).
- **This laptop writes the same bytes as GitHub.** The rehearsal read the same records and
  wrote `installers.json` and `territory.json` byte for byte the same as the published ones
  (SHA-256), and both published files are in the order this laptop's own rule gives.
- **The daily schedule is on:** `.github\workflows\daily-data.yml` now starts the job every day
  at 09:20 UTC, as well as by hand. The first scheduled run is on the morning of October 8.
- The page is not built.

## What the repository holds

- `CLAUDE.md`, `docs\SPEC.md` (eighth revision) and `docs\ACCEPTANCE.md`: Joe's text,
  unchanged in this run.
- `README.md`, for Kuna: the schedule and its hour in Eastern time, starting the job by hand
  and what the box does, where the runs are and what a red run means, `npm run check:published`,
  and how GitHub ties a schedule to the main branch and to the account that last changed it.
- `docs\quickbase\columns.json`: unchanged. R8 found 0 differences on October 7.
- `public\data\`: the three files the first run on GitHub wrote. Only the job writes there.
- `job\`, the job: `run.mjs`, `fields.mjs`, `read.mjs`, `shape.mjs`, `row-contacts.mjs`,
  `checks.mjs`, `write.mjs`, `lib\quickbase.mjs`, `lib\order.mjs`, all unchanged in this run;
  `quickbase-columns.mjs` and `build-counties.mjs`, unchanged; and `rehearse.mjs`, the
  rehearsal on the laptop (`npm run job:rehearse`), which gained one part in this run (below).
- `public\geo\counties.json`: 3,193 counties, 52 states, 318 ids that begin with a zero.
- `.github\workflows\daily-data.yml`: runs the job on GitHub, every day and by hand.
- `scripts\`:
  - `checks.mjs` (R1 to R7, J19, and the one shape the workflow file may have), `check.mjs`
    (`npm run check`), `check-columns.mjs` (R8, `npm run check:columns`), `check-job.mjs`
    (`npm run check:job`), `check-selftest.mjs` (`npm run check:selftest`).
  - `check-published.mjs`: new, `npm run check:published`.
  - `job-tests.mjs`: the job's tests. `published-tests.mjs`: new, the tests of
    `check:published` and of the rehearsal's new part.
  - `job-standins.mjs`, `fixtures\installers.json` (27 made-up installers, 62 contacts, 14
    territory rows), `fixtures\fingerprints.json`, `r5-allowed.json` (still empty).

## The job

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

## The workflow file

- Starts two ways: `schedule` with one time, `cron: '20 9 * * *'` (09:20 UTC every day), and
  `workflow_dispatch` with the box `skip_count_guard`. Nothing else it does changed.
- On a scheduled run there is no box: `inputs.skip_count_guard` is empty, the line that runs
  the job adds nothing, and the scheduled run never skips the count guard. A comment on a
  line of its own above that line says so.
- `checkWorkflow` in `scripts\checks.mjs` holds the one shape the file may have, now with the
  two ways to start and that one time. A failure names the first line of the file that is not
  as the shape has it, by its line number in the file, and what the shape has there; it never
  repeats a line of the file.

## check:published

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

## The rehearsal's new part: this laptop beside the published files

After its own checks, and held back with the rest until the leak scan has found nothing,
`job\rehearse.mjs` sets the `installers.json` and `territory.json` the rehearsal wrote beside
the two in `public\data` (`compareWithPublished`). For each file it prints SAME BYTES or
DIFFERENT (by SHA-256); when different, counts only: installers or counties in one file and not
the other, and those in both written differently; and whether the published file is IN ORDER
by this laptop's own rule (`job\lib\order.mjs`: installers by company then id, each one's
contacts and territory states; states by code, counties by id, the installer ids of each
tier). Then the counts of installers, contacts and territory rows, published beside now. A
published file that is not in order fails the rehearsal. With no `public\data` it says so and
goes on.

October 7, one rehearsal: installers.json SAME BYTES, IN ORDER; territory.json SAME BYTES,
IN ORDER; installers 73 beside 73, contacts 221 beside 221, territory rows 17,745 beside
17,745. Two runs, 9 calls each; every check passed in both; the two runs wrote the same files;
every count equal to October 6's. The leak scan looked for 702 values, skipped 5, and found
nothing. The folder `installer-index-rehearsal` was deleted.

## The checks

On October 7, before the work was staged:

- `npm run check`: R1 to R7 and J19 PASS; J19 now runs on the published files. R6's GitHub half
  is still printed as NOT YET SHOWN.
- `npm run check:selftest`: PASS, 259 cases (201 before this run): the workflow file's
  broken copies are now eight, and 56 cases are new for `check:published` and the rehearsal's
  new part.
- `npm run check:job`: PASS, 66 cases in 62 tests.
- `npm run check:columns` (R8): PASS, 0 differences.
- `npm run check:published`: PASS, 11 lines.

With the work staged, before commit `eeeaa1d`, all five passed again: `npm run check` (R1 to R7
and J19, 41 tracked files, R6's GitHub half NOT YET SHOWN), `npm run check:selftest` (259
cases), `npm run check:job` (66 cases in 62 tests), `npm run check:columns` (0 differences)
and `npm run check:published` (11 lines).

QuickBase calls in the whole run: 30, all reads, no refusal, no retry: R8 twice (6 each) and
one rehearsal (two runs of 9).

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

## Git

- `404141f` "Daily data refresh", by github-actions[bot]: the first run on GitHub, started by
  hand; `public/data/build.json`, `installers.json` and `territory.json`, nothing else.
- `eeeaa1d` "Daily schedule on at 09:20 UTC; check of the published files", pushed to
  `origin main` on October 7. Nothing under `public/data` in it.
- This file's final results are the commit after `eeeaa1d`.
- From October 8 the job adds a "Daily data refresh" commit to `main` every morning.

## Not built

The page; the county shapes, the state map and the ZIP list of `public\geo\`; the Netlify test
copy.

## What comes next

1. The first two scheduled runs, on the mornings of October 8 and 9, at 09:20 UTC or some
   minutes later. Each should end green and commit "Daily data refresh" with a later builtAt
   (J17). A run that ends red saved nothing; its report names the step or check.
2. A prompt that checks those two runs (J17, J18), with `git pull` and
   `npm run check:published`.
3. Then the page.

## Worth knowing

- Every chat starts with `git pull`: the job now commits to `main` every day, and a push from
  the laptop can meet a main that has moved. Only "Daily data refresh" commits by
  github-actions[bot], changing `public/data` alone, are expected there.
- `npm run check:job` does not run `scripts\published-tests.mjs`: those tests check what is
  done on the laptop, not the job, so a fault in them can never stop the daily run on GitHub.
  `npm run check:selftest` runs them.
- A broken case in the job's tests or in `published-tests.mjs` may carry `mustSay`: the
  self-test then also asks that the failure says it. The workflow file's eight broken copies
  each ask that the failure names the line that was changed.
- `scripts\fixtures\fingerprints.json` holds the SHA-256 of the three files the made-up
  installers give with builtAt held fixed. A change there means the job no longer writes the
  same bytes.
- The office state (MASTER 31) holds two-letter codes on all 73 installers, though the choice
  list `columns.json` records for State/Region holds full state names.
- Title and Procedure are empty on all 221 contacts.
- 7 installers that are not CONFIRMED BY PARTNER carry a "Last confirmed" date in QuickBase;
  the job leaves it out of their entries, as ruled.
- The rehearsal reads the real records only through `npm run job:rehearse`, holds back all
  it prints until its leak scan has found nothing, and deletes its folder whatever happens.
- How each of the 62 columns asked for came back from QuickBase, how a blank comes back by
  kind of column, and the client's changes of the first prompt are in this file as it was at
  commit `8c3f17b`. The rehearsal of October 7 in this run found the same.
