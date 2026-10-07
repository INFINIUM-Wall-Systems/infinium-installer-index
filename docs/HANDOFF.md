# Handoff: state for the next Claude Code chat

**Written:** October 7, 2026, at the end of the daily job's first prompt (Joe's prompt
revision 2: build the job and rehearse it on the laptop; nothing published).

## What the repository holds

- `CLAUDE.md` and `docs\SPEC.md` (eighth revision): Joe's text, carried in the prompt and
  checked by SHA-256 in a temporary folder, in place, and as committed. `docs\ACCEPTANCE.md`
  is unchanged; its header still says it goes with the seventh revision, which is known.
- `README.md`: filled in by this run, as the prompt asked: the secret's name, how to start
  the job by hand, and that the schedule is not on yet.
- `docs\quickbase\columns.json`: unchanged. R8 found 0 differences on October 7.
- `job\`, the job:
  - `run.mjs`: the job from start to finish (read, shape, check, write), and its command line.
  - `fields.mjs`: the one place that lists the field ids: the 69 watched, the 62 asked for.
  - `read.mjs`: reads the three tables' fields, then their records, through the client.
  - `shape.mjs`: turns what was read into installers.json and territory.json, and the counts
    and gap counts; no network and no files.
  - `row-contacts.mjs`: the people for a row (section 4.8).
  - `checks.mjs`: the seven checks of section 3.5.
  - `write.mjs`: writes the three files, all or nothing.
  - `rehearse.mjs`: the rehearsal on the laptop (`npm run job:rehearse`).
  - `build-counties.mjs`: builds `public\geo\counties.json` from installer-application's
    county list.
  - `lib\quickbase.mjs`: the read-only client. `lib\order.mjs`: the one way text is put in
    order, by character codes, never by the machine's language settings.
  - `quickbase-columns.mjs`: rewrites `columns.json` (unchanged).
- `public\geo\counties.json`: 3,193 counties (3,144 in the United States, 49 in Ontario), 52
  states, 318 ids that begin with a zero, every id text. Built from
  installer-application's `public/data/counties.meta.json` at commit `a6fc6db`, read with
  `git show`. The source writes states as two-letter codes, ON for Ontario; 3,020 of the
  3,193 names carry the word County.
- `.github\workflows\daily-data.yml`: runs the job on GitHub. Started by hand only; no
  schedule.
- `scripts\`: `checks.mjs` (R1 to R7, J19, and the workflow file's shape), `check.mjs`
  (`npm run check`), `check-selftest.mjs` (`npm run check:selftest`), `check-columns.mjs`
  (R8, `npm run check:columns`), `check-job.mjs` (`npm run check:job`), `job-tests.mjs` (the
  job's tests), `job-standins.mjs` (stand-ins for QuickBase, the clock and the key),
  `fixtures\installers.json` (27 made-up installers, 62 contacts, 14 territory rows) and
  `fixtures\fingerprints.json`, `r5-allowed.json` (still empty).
- `.gitkeep` is left only in `public\js`, `public\css` and `public\vendor`.
- `review-screens\` exists on the laptop and is ignored by git. `public\data\` does not exist.

## The job

- `node job/run.mjs --out <folder>`: writes into an existing, empty folder inside the system
  temp directory whose name, or that of a folder it sits in, begins `installer-index-`. On
  the laptop the key comes from `.env.local` in the folder above the repository.
- `node job/run.mjs --publish`: writes `public\data`; refused unless `GITHUB_ACTIONS` is
  "true". On GitHub the key, the realm and the app id come from `QB_USER_TOKEN`,
  `QB_REALM_HOSTNAME` and `QB_APP_ID`, and nowhere else.
- `--skip-count-guard`: leaves the count guard out for one run; at least one installer is
  still asked for; build.json writes `skipped` for the first check.
- Order of work: the three tables' fields (3 calls), check 7, the records (6 calls with 5,000
  rows to a page), the rows read compared with QuickBase's totals, shaping twice (check 6),
  checks 1 to 6, and only then the write. A failed check writes nothing and names the check,
  its number, its name and counts.
- It prints the time, where the key came from, the rows read and the rows to a page, the
  counts, each check, and each call by method and address with how many times. An error is
  printed by its kind and step and, for a QuickBase refusal, the status number; never its
  text.
- Only the command-line start of `job\run.mjs` reads the real environment. `main` is handed
  its environment values and the repository's folder, with no default for either.

## The client, changed in this run

- The limit of 60 requests counts for one client (it was one count for the whole process).
- `readAll` asks for 5,000 rows to a page and returns `{ rows, total }`. It stops at
  QuickBase's total, not at a short page, and stops with an error if the total is missing or
  changes between pages.
- The reading of an answer's body is inside the retry, under the same 60-second timer.
- `timeoutSignal` is a timer a test can stand in for; the Retry-After date is worked out from
  `now`. The client keeps `sentAt`. `ApiError` carries `status`.
- `keyFrom(env, path)`: where the key comes from, as above.
- Shown by tests, each working as written: at least 150 ms between calls; after a 429 it
  waits as Retry-After says, or backs off, up to six attempts; it tries again after a 5xx or
  a network error within the same six; an attempt with no answer after 60 seconds is tried
  again.

## The checks

On October 7, with the work staged, before the first commit:

- `npm run check`: R1 to R7 and J19 PASS. R6's GitHub half is NOT YET SHOWN.
- `npm run check:selftest`: PASS, 201 cases: 42 for R1 to R7 and J19, 159 for the job's tests.
- `npm run check:job`: PASS, 66 sound cases in 62 tests.
- `npm run check:columns` (R8): PASS, 0 differences.

## J1 to J19

| Check | Where it stands |
|---|---|
| J1 | Shown with made-up installers and on the real records: every call listed by method and address |
| J2 | Shown with made-up installers (a stand-in total that differs stops the job) and on the real records (73, 221, 17,745) |
| J3 | Shown with made-up installers: falls in each count, an unreadable build.json, the first run, `--skip-count-guard`. On GitHub the first run has no last good run |
| J4 to J7 | Shown with made-up installers (planted orphans, an unknown county, a second id, a blank company, a sixth status); passed on the real records |
| J8 | Shown with made-up installers (a changed label, a changed type) and on the real records |
| J9 | Shown with made-up installers in a made-up repository. Waits for GitHub for "nothing is saved into the repository" and "the run shows as failed" |
| J10 | Shown with made-up installers and on the real records (two runs, same SHA-256). Waits for GitHub for Linux and Node 22 writing the same bytes: the fingerprints test runs there first |
| J11 | Shown with made-up installers and on the real records: 3,193 ids, all text, 318 begin with a zero |
| J12 | Shown with made-up installers and on the real records: 25, 29, 23, equal to the second count |
| J13 | Shown with made-up installers and on the real records |
| J14 | Shown with made-up installers and on the real records |
| J15 | Shown with a stand-in clock and on the real records (at most 18 calls in any 10 seconds) |
| J16 | Shown with made-up installers: a clean run, each check failing in turn, an error thrown on purpose and a refusal whose text holds made-up values. The rehearsal's leak scan found nothing on the real records |
| J17 | Waits for GitHub: the schedule is not on yet |
| J18 | Waits for GitHub: Joe's first run by hand |
| J19 | Shown in a temporary repository; in `npm run check`, passes with `public\data` not there |

## What the rehearsal counted (October 7)

One rehearsal: two runs, 9 calls each, 18 in all. Every check passed in both runs, and both
runs wrote the same installers.json and territory.json. The leak scan looked for 702 values,
skipped 5, and found nothing. The folder `installer-index-rehearsal` was deleted.

Every count equals what QuickBase held on October 6: installers 73; contacts 221; territory
rows 17,745; counted twice 0; with territory 52, without 21; counties covered 3,193; states
covered 52; CONFIRMED BY PARTNER 54, DORMANT - NO RESPONSE 14, INACTIVE 2, PENDING - UPDATE
EXPECTED 2, HELD - BUSINESS DECISION 1; no quoting contact 25, no scheduling contact 29,
neither 23; rates written Non-Union ST 45, Non-Union OT 46, Union ST 52, Union OT 51, all four
34, none 9; mobilization 65; rates valid through 58.

Counted for the first time:

- Quoting place: a quoting contact 48, a stand-in 25, nobody 0.
- Scheduling place: a scheduling contact 44, a stand-in 13, nobody 16.
- One person fills both places on 12 rows. A contact who cannot be reached fills a place on
  0 rows.
- Sizes: installers.json 119,198 bytes; territory.json 358,681; build.json 1,745.
- Rows to a page: MASTER 73; Contacts 221; Territory 5,000, 5,000, 5,000, 2,745.
- In the files: no null, empty text, empty list or empty group; 0 installers with no
  contact; 0 contacts with nothing filled. 112 dates, all written like 2026-10-06. 73 office
  states, all among the county list's two-letter codes.

How QuickBase hands over a blank: as an empty text for text, long text, choice, date, email
and phone; as nothing (null) for currency and number; as false for a box; as an empty list
for several choices. No column came back with a value left out of a record or of another
kind.

How each of the 62 columns asked for came back (run 1):

| Table | Field | Label | Type | Came back as |
|---|---|---|---|---|
| MASTER | 6 | Installer ID | text | text 73 |
| MASTER | 25 | Company | text | text 73 |
| MASTER | 13 | Record status | choice | text 73 |
| MASTER | 14 | Last confirmed | date | text 61, empty text 12 |
| MASTER | 28 | Street 1 | text | text 72, empty text 1 |
| MASTER | 29 | Street 2 | text | text 7, empty text 66 |
| MASTER | 30 | City | text | text 73 |
| MASTER | 31 | State/Region | choice | text 73 |
| MASTER | 32 | Postal Code | text | text 72, empty text 1 |
| MASTER | 33 | Country | text | text 2, empty text 71 |
| MASTER | 35 | Street 1 | text | text 47, empty text 26 |
| MASTER | 36 | Street 2 | text | text 5, empty text 68 |
| MASTER | 37 | City | text | text 44, empty text 29 |
| MASTER | 38 | State/Region | choice | text 43, empty text 30 |
| MASTER | 39 | Postal Code | text | text 44, empty text 29 |
| MASTER | 40 | Country | text | text 1, empty text 72 |
| MASTER | 60 | Shipping Address - Not applicable | box | true 15, false 58 |
| MASTER | 47 | Street 1 | text | text 4, empty text 69 |
| MASTER | 48 | Street 2 | text | text 3, empty text 70 |
| MASTER | 49 | City | text | text 4, empty text 69 |
| MASTER | 50 | State/Region | choice | text 4, empty text 69 |
| MASTER | 51 | Postal Code | text | text 3, empty text 70 |
| MASTER | 52 | Country | text | empty text 73 |
| MASTER | 61 | Second Shipping Address - Not applicable | box | true 46, false 27 |
| MASTER | 41 | Non-Union ST | currency | number 45, null 28 |
| MASTER | 42 | Non-Union OT | currency | number 46, null 27 |
| MASTER | 43 | Union ST | currency | number 52, null 21 |
| MASTER | 44 | Union OT | currency | number 51, null 22 |
| MASTER | 21 | Mobilization / demobilization - Rate / basis | text | text 65, empty text 8 |
| MASTER | 20 | Rates valid through | date | text 58, empty text 15 |
| MASTER | 19 | Shop / labor status | choice | text 64, empty text 9 |
| MASTER | 63 | Outreach pricing notes | long text | text 6, empty text 67 |
| MASTER | 54 | Tier 2 basis | choice | text 27, empty text 46 |
| MASTER | 55 | Tier 2 charge unit | choice | text 6, empty text 67 |
| MASTER | 56 | Tier 2 charge unit - other | text | text 3, empty text 70 |
| MASTER | 57 | Tier 2 charge amount | number | number 4, null 69 |
| MASTER | 58 | Tier 2 charge relation | choice | text 6, empty text 67 |
| MASTER | 26 | Coverage Area | long text | text 16, empty text 57 |
| MASTER | 53 | Travel note | long text | text 14, empty text 59 |
| MASTER | 62 | Travel note - Not applicable | box | true 13, false 60 |
| MASTER | 45 | Warehousing Available | choice | text 56, empty text 17 |
| MASTER | 59 | Warehousing at our addresses | several choices | list 46, empty list 27 |
| MASTER | 22 | Current EMR | text | text 35, empty text 38 |
| MASTER | 23 | Current EMR - Not applicable | box | true 10, false 63 |
| MASTER | 9 | Valid COI on File? | choice | text 45, empty text 28 |
| MASTER | 10 | COI Valid Through | date | empty text 73 |
| MASTER | 11 | Installer Agreement on File? | choice | text 64, empty text 9 |
| MASTER | 12 | Notes / Comments | long text | text 50, empty text 23 |
| MASTER | 24 | Anything else | long text | text 8, empty text 65 |
| Contacts | 6 | Parent reference | text | text 221 |
| Contacts | 7 | Name | text | text 214, empty text 7 |
| Contacts | 8 | Title | text | empty text 221 |
| Contacts | 9 | Email | email | text 207, empty text 14 |
| Contacts | 10 | Second email | email | text 20, empty text 201 |
| Contacts | 11 | Phone | phone | text 188, empty text 33 |
| Contacts | 12 | Roles | several choices | list 174, empty list 47 |
| Contacts | 13 | Procedure | text | empty text 221 |
| Contacts | 14 | Departed | box | true 11, false 210 |
| Contacts | 15 | Confirmed the record | box | true 54, false 167 |
| Territory | 6 | Parent reference | text | text 17,745 |
| Territory | 7 | County id | text | text 17,745 |
| Territory | 11 | Tier | choice | text 17,745 |

## Not built

The page; the daily schedule; `public\data\`, which the first run on GitHub writes; the
county shapes, the state map and the ZIP list of `public\geo\`; the Netlify test copy.

## What comes next

1. Joe types the QuickBase key into the repository's settings on GitHub as the repository
   secret `QB_USER_TOKEN`, if he has not already.
2. Joe starts the job by hand from the repository's Actions page (`README.md` says where).
   That run is the first to write `public\data\` and save installer records into the
   repository.
3. A prompt that checks the files that run published (J2 and J10 to J14) and adds the daily
   schedule.

## Worth knowing

- `scripts\fixtures\fingerprints.json` holds the SHA-256 of the three files the made-up
  installers give with builtAt held fixed. If the files' shape is changed on purpose, by a
  new revision of the specification, it is written again; otherwise a change there means the
  job no longer writes the same bytes.
- The workflow runs `npm run check:job` before the job, so a machine that writes different
  bytes stops before it reads QuickBase.
- The office state (MASTER 31) holds two-letter codes on all 73 installers, though the choice
  list `columns.json` records for State/Region holds full state names.
- Title and Procedure are empty on all 221 contacts.
- 7 installers that are not CONFIRMED BY PARTNER carry a "Last confirmed" date; the job
  leaves it out of their entries, as ruled.
- The rehearsal reads the real records only through `npm run job:rehearse`, holds back all
  it prints until its leak scan has found nothing, and deletes its folder whatever happens.
