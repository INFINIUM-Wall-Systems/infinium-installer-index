# INFINIUM Installer Index — Specification for the New Lookup

**Date:** Tuesday, October 6, 2026
**Owner:** Joe Lull
**Status:** eighth revision, October 6, 2026. Joe agreed the seventh revision the same day
with no changes. The eighth adds what the run that created the repository found (the
kickoff run) and what the daily job needs written down. Joe agrees the eighth revision by
giving the daily job's prompt to Claude Code.
**Name:** INFINIUM Installer Index. Joe renamed it on October 6, 2026; it was INFINIUM
Installer Intel from September 9. The page it replaces is INFINIUM Partner Finder.
**FinishLine:** `infinium-installer-index`
**Code:** `https://github.com/INFINIUM-Wall-Systems/infinium-installer-index.git`, with its
working folder at
`P:\IT\AI Initiatives\PartnerFinder (Installer Matrix)\infinium-installer-index`
**In the repository this is:** `docs\SPEC.md`
**Built on:** `claude/PARTNER-FINDER-LIVE-PAGE-REVIEW-2026-10-06.md` (the record of the page
staff use today) and `claude/INSTALLER-INDEX-INVENTORY-REPORT-2026-10-06.md` (the read-only
inventory of QuickBase and the P: folder)
**Checks the build must pass:** `claude/INSTALLER-INDEX-ACCEPTANCE-2026-10-06.md`
**Supersedes, where they conflict:** `claude/INSTALLER-INTEL-SPEC-AND-SCHEMA-2026-09-09.md`
and `claude/INSTALLER-INTEL-DECISIONS-2026-09-09.md`. Section 9 says what carries over.

**Notes at agreement (October 6, 2026)**

Joe's GO on the seventh revision came after Cowork named three points. None changes a
ruling. What the eighth revision adds is listed after them.

- **Empty folders.** Git keeps no empty folder. A folder of section 3.4 that has nothing in
  it yet holds a placeholder file named `.gitkeep`. `public\data\` holds none: only the job
  writes there, so that folder first appears when the job first runs. `review-screens\`
  holds none either: it is not committed, so it exists only on a computer where someone
  has made it. The repository also holds `.gitignore` and `.gitattributes`, which section
  3.4 does not draw.
- **When the Netlify test copy is made.** The table in section 7 lists it as step 8, after
  the phone layout. It is made earlier, as soon as there is a page to show, so that the
  desktop views, the map views and the phone layout are each shown to Joe on it.
- **Cowork's calls.** Every call marked "for Joe to overrule" stands as written.

**What changed in the eighth revision**

No ruling changes. No view is added or removed.

- **Counts from the kickoff run** of October 6 are added to section 3.3: the Tier 2 charge
  columns, the agreement column and the two certificate columns. Section 4.4 no longer
  says they have not been counted.
- **Two sentences corrected.** Section 3.1: MASTER's key column is required and unique.
  Section 3.2: which of the columns it names are watched but not asked for.
- **Receiving / Warehouse** is settled at 39 for the Index. Why the load report said 40
  stays with the outreach import (section 8).
- **What the daily job needs written down:** the shape of the data files (section 3.6);
  the hour, the name of the key on GitHub, the two steps by which the schedule is switched
  on, and what happens when a count has really fallen (section 3.7); where a run on the
  laptop writes (sections 3.4 and 3.7); and how the contact rules combine (section 4.8).
  Each is Cowork's call, for Joe to overrule.
- **Four of those calls settle what a row shows where the seventh revision was silent:**
  the job, not the page, chooses the people for a row; the two places show two different
  people whenever the contacts allow it; a contact who cannot be reached fills a place
  only when nobody who can be reached holds that role; and an entry whose only role is
  Emergency dispatch is set aside.
- **Whole records are read on the laptop.** A rehearsal of the job there reads every
  installer record under Joe's key and writes it to a temporary folder outside the
  repository, which is then deleted (section 3.4). Joe's agreeing this revision covers it.
- **Smaller additions:** four items for later and two closed items in section 8, a note
  under the step table in section 7, and three lines in section 10.

**What changed in the seventh revision**

- **The data path is ruled** (section 3.7). A scheduled job on GitHub reads QuickBase once
  a day and saves the data files into the repository. There is no live pull.
- **The data files are committed to the repository,** by that job. This reverses Joe's
  ruling of earlier the same day that they are never committed.
- **The test copy is on Netlify,** fed by the GitHub repository, showing real installer
  data. Once it checks out, Joe gives the repository to Kuna, who stands it up on the
  INFINIUM server with Microsoft Entra sign-in. The vercel.app address is dropped.
- **Protecting the test copy is not part of this work.** Joe will say when data security is
  to be considered. The items about it are removed.

**What changed in the sixth revision**

- The exact QuickBase columns, field ids and counts, read from QuickBase on October 6
  (section 3).
- Joe's rulings on how a row shows contacts when a role is missing, when the "Last
  confirmed" date shows, the folder structure, and ZIP lookup at launch (section 2).
- Facts corrected: the live address is already behind Microsoft Entra sign-in; mobilization
  is text, not a dollar amount; every county has at least one installer today.
- Calls by Cowork, each marked "for Joe to overrule".

---

## 1. What this is

A read-only lookup for INFINIUM staff: who installs where, who to call, what they charge,
and how current their record is. It replaces the INFINIUM Partner Finder page at
`partnerfinder.infiniumiq.ai`.

It keeps the old page's look. Its views are new, built around what QuickBase now holds and
the old page never had: 73 installers with a record status, contacts as people with roles,
and territory by county with Tier 1 and Tier 2.

## 2. Joe's rulings (October 6, 2026)

| Question | Ruling |
|---|---|
| Where the data comes from | The three installer tables in QuickBase. No pre-filled file. The installers are already there: imported and verified October 5, 2026. |
| Reading QuickBase | Joe authorized QuickBase API calls to read field ids and field types, and to count records. Read-only. Any write needs his approval every time. |
| How current | Once a day, overnight. A record changed in QuickBase shows the next morning. |
| The data path | A scheduled job on GitHub reads QuickBase once a day and saves the data files into the repository. No live pull. GitHub stays in the path for the long term. Section 3.7. |
| Dave's internal API | Not decided whether it sits between QuickBase and the page in the long term. |
| Testing and hosting | The test copy is on Netlify, fed by the GitHub repository, showing real installer data. Once everything checks out there, Joe gives the repository to Kuna, who stands it up on the INFINIUM server (Azure) with Microsoft Entra sign-in. |
| Protecting the test copy | Not part of this work. Joe: the information "has been openly shared without caveat by our partners," and he will say when data security is to be considered. |
| The QuickBase key for the test | Joe's own key, typed once by Joe into the GitHub repository's settings. |
| Web addresses | Live: `partnerfinder.infiniumiq.ai`, the same address as today. Test: a new Netlify site, named `infinium-installer-index` to match the repository (the name is Cowork's call). The old page's Netlify site is left alone. The vercel.app address ruled earlier the same day is dropped. |
| Where the code lives | GitHub: `INFINIUM-Wall-Systems/infinium-installer-index`. On the P: drive: a fresh folder named `infinium-installer-index` inside the PartnerFinder folder, beside `coverage-map` and `installer-application`. |
| Folder structure | As in section 3.4. Laid out like `installer-application`. Approved by Joe, with two changes since that follow from the data path: `.github\workflows\` is added and `public\data\` is committed. |
| Data files in GitHub | **Committed, by the scheduled job and by nothing else.** This reverses the ruling of earlier the same day that they are never committed. |
| Look | The old page's look is kept. |
| Views | Revised. Not a copy of the old page's views. |
| Who appears | All 73, each with its record status shown. |
| Regional Summary | Dropped. |
| Finding a county | A zoomed map of the state's counties, using the county map from the installer application form. Clicking a county lists the installers who serve it. |
| Search | Text search **and ZIP lookup** at launch. Street-address search is the second phase. |
| Address search | Wanted. Second phase. It uses the US Census Bureau's free address lookup. |
| Contacts on each row | By role: the Quoting / Estimating contact and the Scheduling / Coordination contact, with a "show all" control for the rest. **When a role is missing, the next-best contact is shown with their real role, plus a short marker such as "No quoting contact on record."** Section 4.8 has the rules. |
| "Last confirmed" date | **Shown only on records whose status is CONFIRMED BY PARTNER.** |

## 3. How it works

```
QuickBase installer tables  -->  the daily job  -->  data files  -->  the page
  (MASTER, Contacts,              reads, checks,      (plain files     reads the files;
   Territory)                     writes files         beside the page) never calls QuickBase
```

The daily job and the nightly job, both named below, are the same thing.

- **The daily job** reads the three tables, checks what it read, and writes a small set
  of data files. It is the only thing that talks to QuickBase. GitHub runs it once a day
  (section 3.7).
- **The page** is ordinary files: markup, styling, script and the data files. It holds no
  QuickBase key. If QuickBase is down, the page still works on the last good data.
- **The data is stored once.** Every view is drawn from the same files, so views cannot
  disagree with each other the way the old page's copies could.
- **Reading is by the REST interface.** The October 5 work measured that it returns text
  correctly, accents included. The client written for that work can be told to read only:
  it then refuses every write and every call that names Dave's table. The job uses a copy
  of that client, kept in this repository, so the two repositories do not depend on each
  other. (Cowork's call, for Joe to overrule.)
- **Columns are read by field id, and the label is checked.** The job keeps a list of the
  columns it reads: field id, exact label and type. On every run it confirms each field id
  still carries that label and type. A renamed or retyped column stops the job instead of
  quietly filling a view with the wrong value. (Cowork's call, for Joe to overrule.)

### 3.1 The three tables

Realm `infiniumwalls.quickbase.com`, app `bpkqi6uif` ("Project Manager - Infinium Walls").

| Table | Id | Columns | Key | Records |
|---|---|---|---|---|
| INFINIUM Installers MASTER | `bwegbya6s` | 338 (311 planned, 27 made by QuickBase) | field 6, Installer ID | 73 |
| INFINIUM Installers Contacts | `bwegb3582` | 15 (10 planned, 5 built in) | field 3, Record ID# | 221 |
| INFINIUM Installers Territory | `bwegb3vwv` | 12 (7 planned, 5 built in) | field 3, Record ID# | 17,745 |

Contacts and Territory are each tied to MASTER by a real QuickBase relationship: field 6,
"Parent reference", holds the installer id. They are not tied to each other. No table has a
lookup or summary column. One column is required: MASTER's key, Installer ID, which is
also unique. (Read in the inventory run of October 6; not read again since.)

The 73 existing installers fill only the 40 outreach columns of MASTER, field ids 6 to 63.
Field ids 64 to 334 are the 271 application-form columns and are blank on every existing
installer. They will fill only for installers approved through the application form.

### 3.2 The columns the Index reads

**MASTER** (`bwegbya6s`)

| Field id | Label | Type | Used for |
|---|---|---|---|
| 6 | Installer ID | text, the key | Ties contacts and territory to the installer. Never shown as a heading |
| 25 | Company | text | Company name |
| 13 | Record status | choice | Status. Choices: CONFIRMED BY PARTNER; DORMANT - NO RESPONSE; INACTIVE; PENDING - UPDATE EXPECTED; HELD - BUSINESS DECISION |
| 14 | Last confirmed | date | Shown only when status is CONFIRMED BY PARTNER |
| 27 to 33 | Base Address: Street 1, Street 2, City, State/Region, Postal Code, Country | address | Office address; office city and state on rows |
| 34 to 40, 60 | Shipping Address (if different than base), and its "Not applicable" box | address, checkbox | Installer view |
| 46 to 52, 61 | Second Shipping Address, and its "Not applicable" box | address, checkbox | Installer view |
| 41, 42, 43, 44 | Non-Union ST, Non-Union OT, Union ST, Union OT | currency | The four rate tiles |
| 21 | Mobilization / demobilization - Rate / basis | **text** | Mobilization, shown as written |
| 20 | Rates valid through | date | Shown; drives the "Rates expired" marker |
| 19 | Shop / labor status | choice | Union; Non-union / open shop; Both / varies by market |
| 63 | Outreach pricing notes | long text | Pricing notes |
| 54 to 58 | Tier 2 basis; Tier 2 charge unit; Tier 2 charge unit - other; Tier 2 charge amount; Tier 2 charge relation | choice, text, number | What Tier 2 costs. Installer view |
| 26 | Coverage Area | long text | The written coverage note, for installers with no map |
| 53, 62 | Travel note, and its "Not applicable" box | long text, checkbox | Installer view |
| 45, 59 | Warehousing Available; Warehousing at our addresses | choice, multiple choice | Installer view |
| 22, 23 | Current EMR, and its "Not applicable" box | text, checkbox | Installer view |
| 9, 10, 11 | Valid COI on File?; COI Valid Through; Installer Agreement on File? | choice, date, choice | Installer view, when filled |
| 12, 24 | Notes / Comments; Anything else | long text | Installer view |

Watched but not asked for: the three address columns 27, 34 and 46, whose parts are asked
for instead; and Territory's County name, State or province, Country and Boundary version
(8, 9, 10 and 12), because a county's name, state and country come from the county list
(section 3.6). The job still checks that all of them keep their label and type. Not read:
Region (7), Last Updated (8), Record source (15),
Application status (16), Received at (17), Source (18), every application-form column (64
to 334) and the four columns QuickBase made for the relationships (335 to 338).

**Contacts** (`bwegb3582`)

| Field id | Label | Type |
|---|---|---|
| 6 | Parent reference | text (the installer id) |
| 7 | Name | text |
| 8 | Title | text |
| 9 | Email | email |
| 10 | Second email | email |
| 11 | Phone | phone |
| 12 | Roles | multiple choice |
| 13 | Procedure | text |
| 14 | Departed | checkbox |
| 15 | Confirmed the record | checkbox |

Roles choices, in QuickBase's order: Primary contact; Leadership / Ownership; Quoting /
Estimating; Scheduling / Coordination; Field / Installation; Receiving / Warehouse; Office /
Billing / Compliance / Accounts payable; After-hours; Emergency dispatch.

**Territory** (`bwegb3vwv`)

| Field id | Label | Type |
|---|---|---|
| 6 | Parent reference | text (the installer id) |
| 7 | County id | text |
| 8 | County name | text |
| 9 | State or province | text |
| 10 | Country | text |
| 11 | Tier | choice: Tier 1; Tier 2 |
| 12 | Boundary version | text |

**County ids are text and stay text.** A US county id is its five-digit code; 318 of them
begin with a zero. An Ontario id is `CA-` and four digits. They are the same values the
application form's county map uses: 3,193 of 3,193 match.

### 3.3 What QuickBase held on October 6, 2026

Read by Claude Code in one read-only run and reported as numbers only. The last four rows
were read the same evening, in the kickoff run. Cowork did not see QuickBase. These
figures describe that day; the nightly job counts them again on every run and the page
shows the job's numbers, never these.

| What | Count |
|---|---|
| Installers | 73 |
| By status | CONFIRMED BY PARTNER 54; DORMANT - NO RESPONSE 14; INACTIVE 2; PENDING - UPDATE EXPECTED 2; HELD - BUSINESS DECISION 1 |
| With a "Last confirmed" date | 61: all 54 confirmed, plus 5 dormant, 1 inactive and 1 held. Why those 7 carry a date is not explained (section 8) |
| Contacts | 221. Departed 11. No name 7. Neither a phone nor an email 6. No role at all 47 |
| Contacts by role | Leadership / Ownership 69; Quoting / Estimating 66; Scheduling / Coordination 63; Field / Installation 44; Receiving / Warehouse 39; Office / Billing / Compliance / Accounts payable 39; Primary contact, After-hours and Emergency dispatch 0 each |
| Installers with no quoting contact | 25 |
| Installers with no scheduling contact | 29 |
| Installers with neither | 23 |
| Installers with both | 42 (worked out by Cowork from the three counts above); in 26 of them one person holds both roles |
| Installers with two or more people in one role | 14 for quoting, 15 for scheduling |
| Installers with no contact at all | 0 |
| Territory rows | 17,745: Tier 1 7,817, Tier 2 9,928; United States 17,599, Canada 146 |
| Installers with territory | 52. Without: 21 |
| States and provinces covered | 52: the 50 states, the District of Columbia and Ontario |
| Counties covered | 3,193 of the map's 3,193. Every county has at least one installer today |
| Rates filled | Non-Union ST 45; Non-Union OT 46; Union ST 52; Union OT 51. All four 34. None 9 |
| Mobilization filled | 65 |
| Rates valid through | 58 filled; 10 of those dates were before October 6, 2026 |
| Office city and state | 73 of 73 |
| Tier 2 charge columns filled | Basis 27; charge unit 6; charge unit - other 3; charge amount 4; charge relation 6. At least one of the five 27. None 46 |
| Installer Agreement on File? | Yes 36; No 28; blank 9 (the blank count worked out by Cowork) |
| Valid COI on File? | Yes 26; No 19; blank 28 (the blank count worked out by Cowork) |
| COI Valid Through | 0 filled |

Contact counts by installer leave out departed contacts.

### 3.4 The repository

```
infinium-installer-index\
  CLAUDE.md          rules and stop list for Claude Code
  README.md          written for Kuna: what this is, how it is published, what the job needs
  package.json       Node 22 or later; no packages to install
  .github\
    workflows\       the daily schedule that runs the job
  docs\
    SPEC.md          this specification
    ACCEPTANCE.md    the checks the build must pass, numbered
    HANDOFF.md       state for the next Claude Code chat
    quickbase\
      columns.json   every column of the three tables: field id, label, type, choices
  job\               the job: read QuickBase, check, write the data files
  public\            the page
    js\  css\  vendor\
    geo\             map shapes, the county list and the ZIP list. Fixed reference files
    data\            the files the job writes. Committed by the job and by nothing else
  scripts\           checks
  review-screens\    pictures for Joe. NOT committed
```

- **Only the job writes `public\data\`.** No person and no Claude Code chat edits those
  files by hand.
- **On the laptop the job never writes `public\data\`.** A run there reads whole installer
  records under Joe's key, puts its files in a temporary folder outside the repository,
  checks them, and deletes them. Joe's agreeing the eighth revision covers that read of
  whole records. Only a run on GitHub's scheduler writes `public\data\` and saves it into
  the repository. (Cowork's call, for Joe to overrule.)
- **Everything else in the repository uses made-up installers:** code, documents, tests,
  reports and commit messages. The real data changes every day; a test built on it would
  pass one day and fail the next.
- **`public\geo\` is committed.** It holds public map and postal data and nothing about
  any installer.
- **`vendor\`** holds the two map libraries the application form already uses, copied in.
  The page loads nothing from another site.
- **A host's own settings file** is added when that host is set up, not before.

### 3.5 The nightly job's checks

If any of these fails, the job keeps the files already there, saves nothing into the
repository, and its run shows as failed:

1. It read at least one installer, and no count has fallen by more than a set amount since
   the last good run. The amounts are in the acceptance checks.
2. Every contact row and every territory row points at an installer that exists.
3. Every county id on a territory row exists in the county list.
4. No installer id appears twice.
5. Every installer has a company name and a record status, and the status is one of the
   five allowed values.
6. Running the job twice on unchanged data writes identical installer and territory
   files. Only the run time in `build.json` differs.
7. Every column the job reads still has the field id, label and type in `columns.json`.

### 3.6 The data files

Written by the job into `public\data\`, and saved into the repository by it:

| File | Holds |
|---|---|
| `installers.json` | One entry per installer: its details, its contacts, and a summary of its territory |
| `territory.json` | Which installers cover each county and at which tier, grouped by state |
| `build.json` | When the files were made; how many installers, contacts and territory rows; the gap counts of section 4.8; and the result of each check |

Fixed reference files in `public\geo\`, built once from files that already exist on the P:
drive and rebuilt only when boundaries change:

| File | Holds | Built from |
|---|---|---|
| County shapes, one file per state or province | The county outlines for one state | `installer-application\public\data\counties.topo.json` (US Census Bureau 2025 county boundaries; Statistics Canada 2021 census divisions for Ontario) |
| `counties.json` | Every county: id, name, state, country | `installer-application\public\data\counties.meta.json` |
| The state map | The US map on Home | The old page's own state map |
| The ZIP list | Each ZIP code and the county or counties it falls in | `coverage-map\data\geo\zip-to-county.csv` (US Census Bureau 2020 ZIP-to-county file, aligned to the 2025 county boundaries) |

The county shapes are split by state because the whole-country file is 990,334 bytes, too
heavy to send to a phone to draw one state. (Cowork's call, for Joe to overrule.)

**The shape of the files.** (Cowork's call, for Joe to overrule.) The page is built on this
shape, so it changes only by a new revision of this specification. A file is a set of
named values. "Name" below means the name of a value inside a file.

Rules for the three files the job writes:

- **Plain text that keeps accented letters** (UTF-8). Every line ends the way GitHub's
  computers end a line (LF), and the file ends with one such ending.
- **A value that is empty in QuickBase is left out.** It is never written as a blank, as
  the word null, or as a dash. A box that is not ticked is left out. A group with nothing
  in it and a list with nothing in it are left out too. Four things are always written:
  an installer's `contacts`, every contact in it even when nothing in the contact is
  filled, the installer's `row`, and every line of `byStatus`.
- **A value is written as QuickBase returns it,** with spaces at either end dropped. A
  value of nothing but spaces is empty. A choice is written as QuickBase's own text, such
  as Yes or No.
- **Text is written inside quotation marks and numbers without.** Installer ids, county
  ids and dates are text; a date reads `2026-10-06`. The four rates and the Tier 2 charge
  amount are numbers. A rate of 0 is written. A blank rate is left out.
- **The same data always gives the same bytes.** Names are written in the order shown
  here. Wherever things are put in order, text is compared with capitals lowered, one
  character at a time, in the fixed order computers give characters: digits, then
  letters, then accented letters. Where that ties, the text as written decides; and where
  that still ties, the order of QuickBase's own record numbers, which is the order the
  job asks QuickBase for.
- **One installer to a line** in `installers.json`, and one county to a line in
  `territory.json`, so a change shows as a changed line.
- Each file starts with `"schema": 1`. The number rises when the shape changes. A page
  that meets a number it does not know says the data could not be loaded.

`installers.json` holds `"schema"` and `"installers"`, a list in order of company name and
then installer id. Each installer has:

| Name | Holds | From |
|---|---|---|
| `id` | The installer id | MASTER 6 |
| `company` | The company name | 25 |
| `status` | One of the five record statuses | 13 |
| `lastConfirmed` | The date. Written only when the status is CONFIRMED BY PARTNER | 14 |
| `office` | `street1`, `street2`, `city`, `state`, `postalCode`, `country`. The state is as QuickBase writes it, a two-letter code | 28 to 33 |
| `shipping` | A list of the shipping addresses that have something in them, at most two. Each has the same six names as `office`, then `which`: the number 1 for the shipping address, 2 for the second | 35 to 40; 47 to 52 |
| `shippingNotApplicable`, `secondShippingNotApplicable` | true when that address's "Not applicable" box is ticked | 60, 61 |
| `rates` | `nonUnionST`, `nonUnionOT`, `unionST`, `unionOT` | 41 to 44 |
| `mobilization` | The text as written | 21 |
| `ratesValidThrough` | The date | 20 |
| `shopStatus` | Shop or labor status | 19 |
| `pricingNotes` | Outreach pricing notes | 63 |
| `tier2Charge` | `basis`, `unit`, `unitOther`, `amount`, `relation` | 54 to 58 |
| `coverageNote` | The written coverage note | 26 |
| `travelNote`, `travelNoteNotApplicable` | The note; true when its box is ticked | 53, 62 |
| `warehousing` | `available`; and `at`, a list in the order QuickBase lists the choices | 45, 59 |
| `emr`, `emrNotApplicable` | The EMR as written; true when its box is ticked | 22, 23 |
| `paperwork` | `coiOnFile`, `coiValidThrough`, `agreementOnFile` | 9, 10, 11 |
| `notes`, `anythingElse` | The two notes | 12, 24 |
| `contacts` | A list of the installer's contacts, departed ones included. Each has `name`, `title`, `email`, `email2`, `phone`, `roles`, `procedure`, `departed` and `confirmedRecord` | Contacts 6 to 15 |
| `row` | The people for a row. See below | Worked out by the job |
| `territory` | `states`, a list in order of state; and `countyCount`, how many counties in all. Each state has `state`, `country`, `tier1Counties` and `tier2Counties`, the last two being how many counties the installer covers there at each tier. Left out for an installer with no territory rows | Territory 6, 7 and 11, with the county list |

- **The order of `contacts`.** A contact's `roles` are a list in the full-listing order of
  section 4.8. The contacts themselves are in order of each one's first role in that
  order, then by name. A contact with no role comes last, and a contact with no name comes
  after those with one. Departed contacts are in the list like the others.
- **`row`** has up to three names. `quoting` and `scheduling` each hold `contact`, a number
  saying which contact fills the place. The number is the contact's position in the
  installer's `contacts` list as written: 0 is the first contact, 1 the second. The page
  must not put the list in another order before using the number. For a stand-in the
  place also holds `standIn`, written as true, and `role`, the role the stand-in is
  labeled with; `role` is left out for a stand-in that has no role. A place with nobody in
  it is left out. `gap` is `quoting`, `scheduling` or `both` when a role is missing. When
  one person fills both places the two numbers are the same, and the page shows that
  person once.
- **A state** in `territory` is the two-letter code the county list gives for the county,
  ON for Ontario. A country is the code the county list gives.

`territory.json` holds `"schema"` and `"states"`, a list in order of state code. Each state
has `state`, `country`, and `counties`, a list in order of county id. Each county has `id`,
then `tier1Installers` and `tier2Installers`: the ids of the installers that cover it at
each tier, in text order. Only states and counties that at least one installer covers are
listed. A county's name is not repeated here; it is in `counties.json`.

- **A county covered twice.** If Territory holds two rows for the same installer and
  county, the installer is written once for that county, at Tier 1 if either row says
  Tier 1. The number of such extra rows is in `build.json`. There were none on October 6.
- **What is asked for.** The job asks QuickBase for the parts of an address and not for
  the address column itself. It asks Territory for the installer, the county id and the
  tier, and takes a county's name, state and country from the county list, so that there
  is one source for them.

`build.json` holds:

| Name | Holds |
|---|---|
| `schema` | 1 |
| `builtAt` | When the files were made, in UTC and to the second, as `2026-10-07T09:20:31Z`. The only value that differs between two runs on unchanged data. The page shows it as a date in Eastern time |
| `counts` | `installers`; `contacts`, departed ones included; `territoryRows`, as QuickBase counts them; `duplicateTerritoryRows`; `installersWithTerritory`; `installersWithoutTerritory`; `countiesCovered`; and `byStatus`, a list of the five statuses in QuickBase's order, each with `status` and `installers` |
| `gaps` | `noQuoting`, `noScheduling`, `neither`: the gap counts of section 4.8. An installer counted in `neither` is counted in the other two as well |
| `checks` | A list of the seven checks of section 3.5, in its order. Each has `check`, its number; `name`; and `passed`. In a published file every check reads passed, because a failed run publishes nothing. The one exception: when the count guard was skipped for a run, the first check has `skipped` in place of `passed` |
| `files` | A group of two named values, `installers.json` and `territory.json`, each holding that file's fingerprint: a short code (SHA-256, in lower-case letters) that changes if one character of the file changes |

The seven names in `checks` are fixed: "Counts have not fallen"; "Every contact and
territory row has its installer"; "Every county is in the county list"; "No installer id
twice"; "Every installer has a company and a known status"; "The same data gives the same
files"; "Columns keep their label and type".

`counties.json`, in `public\geo\`, is not written by the job. It is built once, by its own
script, from the application form's county list, and follows the same rules of plain text
and order. It holds `"schema"`; `"boundaryVersions"`, a list of the names of the boundary
files the counties were drawn from, which on October 6 were `cb_2025_us_county_500k` and
`lcd_000a21a_e`; `"states"`, a list of `code`, `name` and `country` for
the 50 states, the District of Columbia and Ontario, in order of code; and `"counties"`,
one to a line in order of id, each with `id`, `name` as the application form's list has it,
`state` (the two-letter code) and `country`.

### 3.7 The data path, now and later

Joe's rulings of October 6: QuickBase is the source of truth; the page is refreshed once a
day; GitHub stays in the path for the long term.

```
QuickBase  -->  the job, run by   -->  data files saved  -->  the host         -->  the page
tables          GitHub's scheduler     into the repository    republishes
                once a day                                    (Netlify now,
                                                               Azure later)
```

- **GitHub's scheduler** (GitHub calls it "Actions") runs the job once a day, overnight.
  It can also be started by hand from the repository's Actions page. That is how a refresh
  is forced, and how the job is first tested.
- **The job is the only thing that changes `public\data\`.** When the checks pass, it
  saves the new files into the repository. When a check fails, it saves nothing and the run
  shows as failed.
- **A host republishes when the repository changes.** The page needs nothing from a host
  except to be served.
- **Moving from Netlify to the INFINIUM server changes nothing in this path.** Kuna points
  the Azure site at the same repository.
- **The QuickBase key** is typed by Joe into the GitHub repository's settings, where the
  scheduler reads it. It is in no file. For the test it is Joe's own key. Another key can
  be put in its place later without changing anything else.
- **The freshness line** shows when the job last ran and passed. `build.json` therefore
  changes every day, even when no installer record has changed.
- **The hour.** The schedule is 09:20 UTC every day. That is 5:20 AM Eastern in summer and
  4:20 AM in winter. Twenty past, because GitHub is busiest on the hour and may start a
  run late. (Cowork's call, for Joe to overrule.)
- **The key's name on GitHub** is `QB_USER_TOKEN`. GitHub stores it hidden and hands it
  only to the job; GitHub calls this a repository secret. The realm and the app id are
  written in the file in `.github\workflows\` that tells GitHub how to run the job. Neither
  is a secret.
- **The schedule is switched on in two steps.** First Joe starts the job by hand on
  GitHub. The next prompt checks the files that run published, by acceptance checks J2 and
  J10 to J14, and only then adds the daily schedule. (Cowork's call, for Joe to overrule.)
- **The first run and the count guard.** On the first run there is no last good run, and
  the first check asks only for at least one installer. After that the last good run is
  the `counts` in the `build.json` already in `public\data\`. An earlier `build.json` that
  cannot be read fails the check. A run on the laptop has no last good run.
- **When a count has really fallen.** A run started by hand has a box to tick that skips
  the count guard for that one run. The job must still read at least one installer. The
  scheduled run never skips the guard. Ticking the box is Joe's call. (Cowork's call, for
  Joe to overrule.)
- **The sixth check** is made from one read of QuickBase: what was read is turned into the
  contents of the files twice, and the two results are compared.
- **On the laptop the job reads the key the way the other scripts do,** from `.env.local`
  in the folder above the repository. That file is outside the repository, so the key is
  still in no file the repository holds. On GitHub the job reads the key from the secret
  and never looks for that file.
- **A change by hand to `public\data\`** is caught two ways. A check refuses any change
  there that a person makes on the laptop. And the fingerprints in `build.json` show a
  file that no longer matches.
- **A live pull was considered and not chosen.** It would need a server program on each
  host, rebuilt for Azure at the move, and it would leave the page with nothing new to show
  when QuickBase is down. Next-morning freshness does not need it.
- **Dave's internal API** may or may not sit between QuickBase and the job in the long
  term. That is not decided. The job's reading of QuickBase is kept in one place, so the
  source can be changed to Dave's API without touching the data files or the page.

## 4. The views

Every view has its own web address, so a view can be bookmarked or sent to a colleague.

### 4.1 Home

- Header as today: logo, title, one line of description. The title reads "Installer Index".
- Search box, pinned at the top. It takes a name, a place or a ZIP code (sections 4.5 and
  4.9).
- **A line saying how current the data is:** "Installer records from QuickBase, refreshed
  October 6, 2026." The date comes from `build.json`.
- **The map.** US states plus Ontario, shaded by how many installers cover each. Clicking a
  state opens the State view.
- **Two buttons under the map:** "All installers" and "Not on the map".
- Footer as today.

### 4.2 State

Reached by clicking a state, or by its address.

- Heading: "Installers in Ohio". With a county chosen: "Installers in Summit County, Ohio".
- **A county map of the state.** The same county map the application form uses, showing
  only this state and shaded by how many installers serve each county. Clicking a county
  outlines it and narrows the list to the installers who serve it. "Show all of Ohio" clears
  the choice.
- **A box to type a county name,** beside the map. It does the same thing as a click, for
  people using a keyboard or a phone, where a small county is hard to tap.
- **The list.** One entry per installer serving the state, or the chosen county:
  - Company (opens the Installer view)
  - Tier (see "How tier is shown" below)
  - Counties covered in this state, as a count
  - Office city and state
  - Contacts, by role, as in section 4.8
  - Four hourly rates and mobilization
  - Record status, and a "Rates expired" marker when the valid-through date has passed
- **How tier is shown and ordered.** Tier belongs to an installer in a county, so one
  installer can be Tier 1 in some counties of a state and Tier 2 in others.
  - With a county chosen, the entry shows the tier for that county. Tier 1 installers come
    first, then Tier 2, alphabetical within each.
  - With no county chosen, the entry shows both counts, such as "Tier 1 in 40 counties,
    Tier 2 in 12". Installers with any Tier 1 county in the state come first, alphabetical
    within each group. (Cowork's call, for Joe to overrule.)
- **A fixed line at the foot of every list:** "21 installers have no mapped territory and
  may also serve this area," linking to "Not on the map". It always shows, so a list of
  three never hides a fourth installer. **The number comes from the data, never typed in.**
- A county with no installers says so plainly. No county is in that position today, and
  the page must still handle it.
- **On a phone** the list and the county box come first, and the map is drawn when asked
  for. The page loads one state's shapes at a time.

### 4.3 All installers

One directory, replacing the old contact table, rate table and unreachable master table.

- Every installer, alphabetical.
- **Two column sets, switched by the same two buttons the old page has:**
  - "Contact info": Company · Status · Office city and state · Contacts by role, as in
    section 4.8 · States covered
  - "Rates": Company · Status · Non-union ST · Non-union OT · Union ST · Union OT ·
    Mobilization · Rates valid through · Shop or labor status
- **Mobilization is text in QuickBase, not a dollar amount.** It is shown as written and
  wraps inside its column.
- A filter for record status.
- Column titles stay visible while scrolling and are never hidden by the search bar.
- On a phone each installer is a card, not a row.

### 4.4 Installer

A full view for one installer, replacing the pop-up.

- **Top:** company name and record status. The date last confirmed is shown only when the
  status is CONFIRMED BY PARTNER (Joe's ruling).
- **Contacts:** every contact, one block per person with name, title, roles, phone, email
  and second email. They are listed in the order of section 4.8. A person marked departed
  is shown as departed. The person who confirmed the record is marked. A contact with no
  role says "Role not recorded".
- **Addresses:** office, and shipping addresses where held.
- **Rates:** four tiles as today, then mobilization, rates valid through, shop or labor
  status, and any pricing notes.
- **Tier 2 charge:** what the installer charges for Tier 2 work, from the five Tier 2
  columns, when filled. (Cowork's call, for Joe to overrule.)
- **Territory:** each state covered, with its county count by tier. A state opens to list its
  counties. For an installer with no mapped territory, the written coverage note is shown
  instead, labeled as not confirmed on the map.
- **Paperwork:** installer agreement on file, valid certificate of insurance on file, and
  the date the certificate is valid through, when filled. (Cowork's call, for Joe to
  overrule. On October 6, 64 records answered the agreement question, 45 answered the
  certificate question, and none had a certificate date. How current those answers are is
  not known. See section 8.)
- **Other:** warehousing, travel note, EMR, notes.
- A field with no value is left out rather than shown as a dash.

### 4.5 Search results

- Typing in the box lists matching installers in the same layout as the State view,
  contacts included.
- When the match is on a contact who is not one of the two on the row, that contact is
  shown as well, so the reason for the match is visible.
- It matches on company name, contact name, email, phone, office city, and state.
  - A state is matched as a whole name or a whole two-letter code, never as letters inside
    another word.
  - A company name, contact name or city is matched from the start of any word in it, so
    "in" does not find "Martin". (Cowork's call, for Joe to overrule.)
  - An email is matched anywhere in the address. A phone is matched on its digits.
  - Exactly five digits is treated as a ZIP code (section 4.9).
- It matches only what a view shows. Nothing hidden is searched.
- No match says so and lists what can be searched.

### 4.6 Not on the map

The installers with no territory rows: those who never confirmed, and those who confirmed
without marking a map. Each shows its status and any written coverage note. 21 today.

### 4.7 About this data

When the data was refreshed, the counts, the gap counts of section 4.8, and the result of
each nightly check. Reached from the freshness line on Home.

### 4.8 How contacts are shown

Joe's rulings of October 6: contacts are shown by role, not by "primary contact"; and when
a role is missing, the next-best contact is shown with their real role, plus a short
marker.

**Why by role.** None of the 73 existing installers has a primary contact. The August
outreach never asked for one. What every installer has, and what new installers will have,
is people with roles.

**Why the missing role is filled.** On October 6, 25 installers had no quoting contact, 29
had no scheduling contact and 23 had neither. A gap line alone would leave 31 of 73 rows
with a blank where staff need a person to call.

**On a row** (State view, Search results, ZIP results, and the "Contact info" columns of
All installers) there are two places:

1. **Quoting / Estimating**
2. **Scheduling / Coordination**

Each place shows the role, then name, title, phone and email. A **"Show all contacts"**
control opens the rest, each with its roles.

**Joe's rule for a missing role:**

- The place shows the **next-best contact, labeled with that person's real role**, and a
  short marker: "No quoting contact on record" or "No scheduling contact on record".
- When both roles are missing, the two places show the two next-best contacts, and one
  marker reads "No quoting or scheduling contact on record".

**Calls Cowork made, for Joe to overrule:**

- **Next-best order:** Primary contact; Leadership / Ownership; Field / Installation;
  Receiving / Warehouse; Office / Billing / Compliance / Accounts payable; After-hours;
  then a contact with no role, labeled "Role not recorded". Within one role, first by name.
- **A stand-in must be reachable.** A contact with neither a phone nor an email is never
  used to fill a missing role. 6 contacts are in that position.
- **Nobody is shown twice on a row.** A person already in one place is not used to fill
  the other.
- **If no stand-in exists,** the place shows the marker alone.
- **Emergency dispatch** is a phone number and a procedure, not a person, and never fills
  a place.
- **One person in both roles** is shown once, with both roles on the label.
- **Two people in the same role:** the row shows the first by name; the other is under
  "show all."
- **A person marked departed** never appears on a row. They appear only in the Installer
  view, marked departed.
- **Order everywhere contacts are listed in full:** Quoting / Estimating; Scheduling /
  Coordination; Leadership / Ownership; Field / Installation; Receiving / Warehouse;
  Office / Billing / Compliance / Accounts payable; Primary contact; After-hours; Emergency
  dispatch; then contacts with no role.
- **The nightly job counts** how many installers have no quoting contact, no scheduling
  contact, and neither. "About this data" shows all three.

**How the rules combine.** Added in the eighth revision, so that the job and the page
choose the same people. Each is Cowork's call, for Joe to overrule. Where these lines and
the bullets above differ, these lines say how the bullets are applied.

- **The job chooses the people for a row** and writes the choice into `installers.json`.
  The page shows what the job chose. The rules are tested on made-up installers when the
  job is built.
- **Three steps, in this order.** First, set aside every contact marked departed and every
  entry whose only role is Emergency dispatch. Second, fill the two places from the
  contacts who hold the two roles. Third, fill a place whose role is missing with a
  stand-in.
- **A role is missing** when no contact left after the first step holds it. It is not
  missing because the contact who holds it cannot be reached.
- **"First by name"** means by the Name column, ignoring capital letters and spaces at
  either end. A contact with no name comes after those with one. Names that are the same,
  capitals aside, are put in order by the name as written, and after that by QuickBase's
  record numbers.
- **A contact who cannot be reached fills a place only when nobody who can be reached
  holds that role.** A contact can be reached when it has a phone, an email or a second
  email. So the people considered for a role are its holders who can be reached, or, when
  there are none, its holders who cannot.
- **Two different people whenever the contacts allow it.** Among the people considered,
  the quoting place takes the first quoting contact. The scheduling place takes the first
  scheduling contact who is not that person. If the person in the quoting place is the
  only one considered for scheduling, and someone else is also considered for quoting,
  the first of those others takes the quoting place and this person takes the scheduling
  place. Only when one person is the only one considered for both roles does that person
  cover both, shown once with both roles on the label.
- **A person who fills one place** is labeled with that place's role, whatever other roles
  the person holds.
- **A stand-in** is the highest-ranked contact who can be reached and is not already on
  the row. Contacts are ranked by the best of their roles in the next-best order, then by
  name. A contact stands in only by a role in the next-best order, or by having no role
  at all. So a contact whose only role is Scheduling / Coordination is never the stand-in
  for quoting, and the other way round. A stand-in is labeled with the role that ranked
  it.
- **When both roles are missing,** the quoting place takes the highest-ranked stand-in
  and the scheduling place the next. With only one stand-in to be had, the scheduling
  place is empty. One marker covers both.
- **The gap counts** count a role as missing whether or not a stand-in was found. An
  installer with neither role is counted in all three.

### 4.9 ZIP lookup

At launch, by Joe's ruling of October 6.

- Typing exactly five digits in the search box looks the ZIP up in the ZIP list. Nothing is
  sent anywhere; the list is a file beside the page.
- **One county:** the page opens that state with the county chosen, under a heading such as
  "Installers serving ZIP 44221 — Summit County, Ohio".
- **More than one county:** a ZIP can cross a county line. The page names every county the
  ZIP touches, largest share of the ZIP first, and lists the installers who serve any of
  them. An installer is listed once, at its best tier among those counties, with the
  counties it serves named. (Cowork's call, for Joe to overrule.)
- **Not found:** the page says so, and says what the list leaves out: ZIP codes that are
  only post office boxes, ZIP codes belonging to a single organization, military ZIP codes,
  and Canadian postal codes.
- **A ZIP outside the map:** the ZIP list covers Puerto Rico and the US island areas, which
  the county map leaves out. The page says the ZIP is outside the mapped area.
- The ZIP list is loaded only when a ZIP is typed.

**How sure the ZIP list is.** It is the Census Bureau's 2020 ZIP-to-county file: 46,969
rows, 33,791 ZIP codes. A Census ZIP area is close to, but not exactly, the area the Postal
Service delivers to. For a job site near a county line, the street-address search of the
second phase is the exact answer.

## 5. The look

Taken from the review, with five changes that fix defects it measured.

**Kept:** the INFINIUM greens and grays, Montserrat for headings and Roboto for text, the
white header with its green bar and rule, the pinned search box, the white rounded panels
with a soft shadow, the dark table header, the four rate tiles, the US state map and its
shading.

**Changed:**

| Old page | New lookup | Why |
|---|---|---|
| Green `#76A134` used for company names, emails and phones | Links are charcoal `#444444`, underlined, with green kept for accents, focus rings and the map | Green on white measured 3.04 to 1; text needs 4.5 to 1 |
| Column titles at 9px, 8px on a phone | No text under 12px | The titles are what tell Union OT from Mobilization |
| Tables wider than the screen, cells that never wrap | Tables fit their panel on a desktop; cards on a phone | Rates were off the right edge until scrolled |
| Pinch-to-zoom turned off | Zoom allowed | People need to enlarge text |
| Names, map and pop-up not usable from a keyboard | Everything reachable by Tab; Escape closes anything that opens | Measured: no keyboard access at all |

**The state map's origin.** The old page's US map appears to come from Simplemaps: a file
beside it, `installer-lookup\dev\assets\us.svg`, has the same frame and carries the note
"Free for Commercial Use". That is inferred from the file, not stated in the page. The
note is kept with the map.

## 6. Launch and second phase

**At launch:** everything in section 4. A place is found by clicking the state and then the
county, by typing a county name, or by typing a ZIP code.

**Second phase: address search.** A street address is typed, on Home or in a State view.
The county it falls in is outlined on the map and its installers are listed, Tier 1 first.
From Home, the lookup jumps to the right state.

- **The service:** the US Census Bureau's address lookup (Joe's ruling). It is free, needs
  no account, and returns the county for an address. Its documentation was last updated in
  February 2026.
- **What it means for the page:** the address typed is sent to the Census Bureau. This is
  the one place the lookup talks to anything outside INFINIUM while someone is using it.
- **It covers** the United States, Puerto Rico and the US island areas. **It does not cover
  Ontario.** An Ontario address is found by the map.
- **A technical limit, from its own documentation:** it cannot be called the ordinary way
  from a web page. It offers an older calling method that works from a page, or a server
  can pass the request along. Which one is used is decided when the phase starts.
- **If the service is down or cannot place an address,** the page says so and the map still
  works.

**Still to decide:** whether typing only a city should also work. A list of 6,242 places
already exists in the application form (`places.json`), so it needs no new data.

**Not planned:** editing anything. The lookup only displays. Changes are made in QuickBase.

## 7. Steps and difficulty

| # | Step | Difficulty | Why |
|---|---|---|---|
| 1 | Read the exact QuickBase columns and counts, and find what was built since September 9 | **Done October 6** | Nothing had been built. Columns match the plan with 0 differences |
| 2 | Create the repository folder, its rules, and the column list | Easy | The GitHub repository exists and is empty |
| 3 | The nightly job: read QuickBase, check, write the data files | Moderate | The reading code was written and proven on October 5. The checks and file shapes are new |
| 4 | The page frame with the old look and the five fixes | Easy | The old styling is about 140 lines and is fully recorded |
| 5 | All installers, Installer, Search results, Not on the map, About | Moderate | Plain views over one data file. The contact rules of section 4.8 are the fiddly part |
| 6 | Map, State view, county map and ZIP lookup | Moderate | The county map and the ZIP list both exist and match QuickBase's county ids. The county map needs a mode where a click chooses one county, and a view of one state |
| 7 | Phone layout | Moderate | Cards in place of tables, a map that is usable by touch |
| 8 | The Netlify test copy, republishing from the GitHub repository | Easy | A new Netlify site tied to the repository. Joe sets it up by hand in his browser |
| 9 | Kuna stands the repository up on the INFINIUM server with Entra sign-in | Depends on Kuna | He points the Azure site at the repository. The data path does not change |
| 10 | Replace the old page | Easy | Same address as today |
| 11 | Second phase: address search | Moderate | The Census lookup cannot be called the ordinary way from a web page, so it needs a workaround or a small relay |

**As of the eighth revision.** Step 2 was done on October 6: checks R1 to R8 pass, and the
GitHub half of R6 waits for the job. The job now chooses the contacts for a row, so the
contact rules of section 4.8 are built and tested in step 3, and step 5 shows the result.
The county list, `counties.json`, is built in step 3 as well, because the job's third check
needs it. The other map files stay in step 6.

**The QuickBase feed is not the hard part.** Reading three tables once a day is the
simplest piece here. The real work is the views and the phone layout.

## 8. Open items

**For Kuna, when the test copy checks out:**

- **How `partnerfinder.infiniumiq.ai` is published today, and how he points it at this
  repository.** It is an Azure Static Web App behind Microsoft Entra sign-in. Nothing on
  the P: drive deploys it, and a repository named `infinium-platform` could not be found on
  September 9. The August kickoff said Azure deployment goes through GitHub and that Kuna
  would supply the instructions.

**For Dave:**

- Whether his internal API is meant to sit between QuickBase and the page in the long term
  (section 3.7). Not decided.
- For the second phase: whether a server can pass address lookups to the Census Bureau, if
  that route is chosen.

**For Joe, at go-live:**

- Which QuickBase key the scheduled job uses once the page is live. For the test it is
  Joe's own.

**Before the first installer is approved through the application form:**

- **Where a new installer's rates come from.** The four rate tiles read four columns the
  outreach filled. The application form stores rates in a different place: a grid of five
  job roles, each with straight time, overtime and double time. An approved applicant would
  show four blank tiles unless a rule says which role's rates fill them, or the Installer
  view shows the grid. No such installer exists today.

**To explain, belonging to the outreach import:**

- **Seven installers who did not confirm carry a "Last confirmed" date:** 5 dormant, 1
  inactive, 1 held. By ruling the Index does not show the date on them. What filled it is
  not known.
- **Receiving / Warehouse role marks:** QuickBase holds 39, counted again on October 6
  with and without departed contacts. The 40 in the handoff came from the report written
  when the outreach records were loaded into QuickBase.

**For Joe, before the Installer view is built:**

- **Whether the paperwork lines are shown as QuickBase has them.** 26 installers say a
  valid certificate is on file and none has a date. 36 say an agreement is on file and 28
  say it is not. How current those answers are is not known.

**To settle when the page is built:**

- **How a failed refresh shows.** Acceptance check T4 expects "About this data" to show a
  failed run, and a failed run saves nothing, so T4 cannot be met as it is worded. Joe
  rules on new wording before group T. One way: the page says the data is out of date
  when the last good run is more than a day and a half old.
- **Whether the Tier 2 charge line is worth showing as it stands.** 27 installers give a
  basis and only 4 give an amount.
- **What the Installer view shows for a ticked "Not applicable" box, and for a contact's
  procedure.** The files carry both.

**To decide later:**

- Whether city lookup is added (section 6).
- Whether the 16 company names the old page splits by market match how QuickBase lists
  those installers.
- What staff should do when they find a wrong value: who they tell, and who corrects
  QuickBase.

**Closed in the eighth revision:**

- How many installers have the Tier 2 charge columns, the agreement column and the two
  certificate columns filled: counted (section 3.3).
- Whether the repository folder exists: it does. It was created on October 6, and checks
  R1 to R8 pass. The GitHub half of R6 waits for the job.

**Closed in the sixth and seventh revisions:**

- The column names and field ids: read from QuickBase, 0 differences from the plan.
- What was built since September 9: nothing.
- Whether QuickBase holds "installer agreement on file": it does, field 11.
- Whether the county map can be reused: it can, and its county ids match.
- Whether data files are stored in GitHub: they are, saved there by the scheduled job
  (Joe, reversing his ruling of earlier the same day).
- The data path between QuickBase and the page: a daily snapshot through GitHub (Joe).
- Where the test copy lives: Netlify (Joe).
- Whether the GitHub repository exists: it does, and it is empty.

## 9. What carries over from September 9, and what does not

**Carries over:**

- A page that reads prepared data files and never calls QuickBase while in use.
- The three kinds of installer for coverage: mapped, confirmed without a map, and never
  confirmed. The fixed line at the foot of every list comes from that reasoning.
- The readability and keyboard rules.
- A test copy before the old page is replaced.
- "No matching on names when looking up a place." A place is always resolved to a county
  first.
- ZIP lookup at launch, restored by Joe's ruling of October 6.

**Does not carry over:**

- "Territory never comes from QuickBase." It does now.
- Reading the MASTER workbook as a source. QuickBase is the only source.
- The rules for cleaning up dates, rates and yes/no values. QuickBase columns are already
  typed.
- The old page as "a reference for visual identity only." Its look is kept by ruling.
- Reading installer records through Dave's internal API. Nothing has decided that; the job
  reads the tables Joe created.
- City search at launch. It is undecided.

## 10. What is not verified

- **Everything in section 3 is Claude Code's reading of QuickBase on October 6,** relayed
  as a report. Cowork checked that the report's figures agree with each other. It did not
  see QuickBase.
- How `partnerfinder.infiniumiq.ai` is published. Claude Code saw only that it sends a
  visitor to Microsoft sign-in.
- That the live page and the `dev` copy on the P: drive are the same generation. They
  differ by 2 bytes and list the same 66 installers; what the 2 bytes are is not known.
- Real phone behavior. The review used a test browser at phone size.
- The Census address lookup in practice. Its documentation was read; no address was sent
  to it.
- GitHub's scheduler. As far as Cowork knows it can start a scheduled run late when
  GitHub is busy. Not measured.
- **Sections 3.6 and 3.7 hold Cowork's design for the job,** and the two blank counts in
  section 3.3 are worked out by Cowork. They are not Claude Code's reading of QuickBase.
- Reading more than one batch of records with the repository's own QuickBase client.
  QuickBase hands records over in batches, which it calls pages. The kickoff run read
  MASTER and Contacts, one page each. Territory needs several.
- That GitHub's scheduler is switched on for the INFINIUM organization's repositories, and
  that QuickBase accepts Joe's key from GitHub's computers. Either would show as a failed
  first run that publishes nothing.
- That Netlify's connection to GitHub is allowed to reach the INFINIUM repository. It is
  set up when there is a page to show.
