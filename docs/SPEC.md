# INFINIUM Installer Index — Specification for the New Lookup

**Date:** Tuesday, October 6, 2026; ninth revision Thursday, October 8, 2026
**Owner:** Joe Lull
**Status:** ninth revision, October 8, 2026. Joe agreed the eighth revision of October 6 by
giving the daily job's prompt to Claude Code. The ninth adds Joe's ruling of October 8 that
an installer's territory is what it chose as Tier 1, and writes in the eight rulings the
page's second prompt built on October 7. Joe agrees the ninth revision by giving the page's
third prompt to Claude Code.
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

**What changed in the ninth revision**

The views are redesigned. Joe reviewed the page as built on October 7, an outside review
of it, and Cowork's proposal, and ruled on October 8, 2026. The design record is
`claude/INSTALLER-INDEX-DESIGN-REVIEW-2026-10-08.md`; the screens Joe agreed are the
canvas "Installer Index Redesign". The job, the data files and their shapes, and the map
and ZIP files do not change.

- **Territory is Tier 1.** An installer's territory is the counties it chose as Tier 1. Its
  Tier 2 counties are where it is available for travel. Every list for a place shows the
  Tier 1 installers, and a button, "View Tier 2 Installers Available for Travel", lists the
  Tier 2 installers below them. Section 4.0.
- **Two tabs, two search boxes.** The tabs are Find installers and All installers. A
  project location (ZIP, county, state, city) goes in the box on Find installers or a
  place's view; a company or person goes in the box in the header, which opens All
  installers. Office city never counts as coverage. Sections 4.1, 4.3 and 4.7.
- **Find installers opens with the US and Ontario map drawn,** on the right half, beside
  the location box. Section 4.3.
- **A view switch: Estimating, Project management, Records.** It changes what a row
  shows and the order of an installer's page, never who is listed. Sections 4.2 and 4.5.
- **One layout for a place,** whether reached by state, county, ZIP or city: results first,
  the county map as a narrow column beside them. Section 4.4.
- **Which statuses a place lists:** CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED in
  the lists; DORMANT - NO RESPONSE below them; INACTIVE and HELD - BUSINESS DECISION only
  in All installers. Section 4.4.
- **The Installer view is one page in sections,** ordered by the view, with an overview
  at the top. Section 4.6.
- **All installers absorbs Search results and Not on the map,** with two toggles for the
  installers who did not respond and those inactive or on hold. Section 4.7.
- **City lookup** is built if the application form's place list carries each place's
  county. Section 4.10.
- **The look** is denser and puts results first. Section 5.
- **The eight rulings of the page's second prompt** (October 7) are written in: the maps
  are drawn by the page itself from the application form's outlines, with no map library;
  a list of every state and Ontario on Find installers; the ZIP list in ten files; the
  credits on About this data; how an email address is matched; a link to a state's view
  from a search that names it; and links to a state's view wherever a view names a state
  an installer covers.
- **Joe's other rulings:** rates are US dollars; INFINIUM's own crews are installers like
  any other; Joe is who staff tell about a wrong value, and his email address is shown.
- **What the data files held on October 7** is added to section 3.3, and three open items
  about installers whose map selections reach nearly the whole map are added to section 8.
- **Kept from the eighth revision:** every rule of sections 3, 4.8 and 4.9 not named here,
  the addresses that exist (section 4.1 says how old ones now open), and every check of
  sections 3.5 and 3.6.

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
and coverage by county: Tier 1, which is the installer's territory, and Tier 2, where it is
available for travel.

## 2. Joe's rulings (October 6 and 8, 2026)

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
| Territory | **October 8, 2026: what an installer chose as Tier 1 is its territory. What it chose as Tier 2 is where it is available for travel.** Every search for a place lists the Tier 1 installers, and a button, "View Tier 2 Installers Available for Travel", lists the Tier 2 installers below them. Section 4.0. |
| Views | **October 8, 2026:** two tabs, Find installers and All installers. "Not on the map" is no longer a view of its own; it is a choice in All installers. Search results are shown in All installers. Section 4. |
| Finding a place | **October 8, 2026:** both ways from the first page: type a ZIP, county, state or city, or use the US and Ontario map, which is drawn as soon as the page opens, at US level, on the right half. Sections 4.3 and 4.10. |
| The view switch | **October 8, 2026:** Estimating, Project management and Records. Estimating and Project management are for the two groups who use the Index; Records is for the person who keeps the records right. Section 4.2. |
| Statuses in a place's lists | **October 8, 2026:** CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED in the lists; DORMANT - NO RESPONSE below them, under "Did not respond to the August outreach"; INACTIVE and HELD - BUSINESS DECISION only in All installers, behind a toggle. Sections 4.4 and 4.7. |
| Rates on the estimating row | **October 8, 2026:** all four, always. Rates are US dollars. |
| The project management row | **October 8, 2026:** scheduling, field and receiving contacts, paperwork, and the travel note. |
| INFINIUM's own crews | **October 8, 2026:** loaded into QuickBase and read as any other installer. The first, INFINIUM Installs, was added that day. |
| A wrong value | **October 8, 2026:** staff tell Joe Lull, and his email address is shown on About this data and on every installer's page. |

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
| Installers with territory | 52 with a county at either tier. Without: 21 |
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

**What the data files held on October 7, 2026,** for the ninth revision. Cowork read the
published files once, by script, and kept counts only. Like the table above, these
describe that day; the page counts again from the files.

| What | Count |
|---|---|
| Installers with territory: at least one Tier 1 county | 51 |
| Installers with Tier 2 counties and no Tier 1 county | 1. It marked 348 counties in 12 states, its home state among them, all as Tier 2 |
| Installers with no county at either tier | 21 |
| Counties with at least one Tier 1 installer | 3,193 of 3,193 |
| Installers whose counties, at either tier, number 3,000 or more | 4. The next most is 1,207 |
| Of those four, all Tier 1 | 2. One has every US county as Tier 1 and no Ontario division; the other every county on the map but 9 in Alaska |
| Of those four, mostly Tier 2 | 2. One is Tier 1 in 2 counties, the other in 24, each in its own home state |
| Counties whose only Tier 1 installers are the two that are all Tier 1 | 2,225 |
| Counties by number of Tier 1 installers | 1: 9; 2 to 3: 2,943; 4 to 6: 206; 7 to 10: 35; 11 or more: 0 |
| States and Ontario by number of installers with territory there | 1: 0; 2 to 3: 32; 4 to 6: 17; 7 to 10: 2; 11 or more: 1 |

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
- **`vendor\`** holds the fonts and nothing else. The maps are drawn by the page's own code
  as plain SVG, from the files in `public\geo\`, with no map library (the second prompt's
  ruling 1). The page loads nothing from another site.
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
| `counties\<code>.json`, one file per state or province | The county outlines for one state, drawn north up in a frame of its own | `installer-application\public\data\counties.topo.json` (US Census Bureau 2025 county boundaries; Statistics Canada 2021 census divisions for Ontario) |
| `counties.json` | Every county: id, name, state, country | `installer-application\public\data\counties.meta.json` |
| `states-map.json` | The map on Find installers: the states, the District of Columbia and Ontario | The state outlines in the same `counties.topo.json` (the second prompt's ruling 2). Ontario is a shape in its true place; Alaska and Hawaii are drawn smaller in the lower left |
| `zips\0.json` to `zips\9.json` | Each ZIP code and the county or counties it falls in, split by the ZIP code's first digit | `coverage-map\data\geo\zip-to-county.csv` (US Census Bureau 2020 ZIP-to-county file, aligned to the 2025 county boundaries) |

The county shapes are split by state because the whole-country file is 990,334 bytes, too
heavy to send to a phone to draw one state. (Cowork's call, for Joe to overrule.) The ZIP
list is split by first digit for the same reason, and only the file a ZIP needs is fetched
(ruling 4). Two scripts in `job\`, `build-shapes.mjs` and `build-zips.mjs`, make these
files. They are run by hand when boundaries change, never by the daily job.

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
- **Territory in the files, and on the page.** In the data files, `territory` and the
  counts `installersWithTerritory`, `installersWithoutTerritory` and `countiesCovered` in
  `build.json` mean county rows at either tier. Those names stay as they are. On the page,
  territory means Tier 1 (section 4.0), and the page works out its own counts from the two
  tiers the files carry.

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

### 4.0 Territory and travel

Joe's ruling, October 8, 2026.

- **An installer's territory is the counties it chose as Tier 1.** Wherever a view speaks of
  territory, counts it, shades a map by it, or lists the installers who serve a place, it
  means Tier 1.
- **The counties it chose as Tier 2 are where it is available for travel.** A view says so
  in those words, "available for travel", and never counts them as territory.
- **Every list of the installers for a place** (a state, a county, a ZIP code, a city, and a
  search that names a state) shows the Tier 1 installers only. Under them is a button that
  reads "View Tier 2 Installers Available for Travel". Pressing it lists, below the Tier 1
  installers and under a heading of their own, those that have the place as Tier 2 and not
  as Tier 1. Pressing it again hides them; while they show, it reads "Hide Tier 2
  Installers". Every place opens with them hidden. The button is not part of the view's
  address. (The second label, and that the button is not part of the address, are
  Cowork's calls, for Joe to overrule.)
- **No installer is listed twice for one place.** An installer with at least one of the
  place's counties as Tier 1 is in the Tier 1 list, even if it has others there as Tier 2.
- **When no installer has the place as Tier 2,** there is no button, and one line says "No
  Tier 2 installer lists this area for travel."
- **When no installer has the place as Tier 1,** the list says "No Tier 1 installer serves
  Summit County, Ohio." and the button follows. When no installer has the place at either
  tier, the list says "No installer serves Summit County, Ohio." and there is no button.
- **An installer with Tier 2 counties and no Tier 1 county** has no territory. It is in the
  Tier 2 lists of its places, in All installers and in its Installer view. It is not "not
  on the map": that choice holds the installers with no county at either tier.
- **Statuses.** The Tier 1 and Tier 2 lists of a place hold installers whose status is
  CONFIRMED BY PARTNER or PENDING - UPDATE EXPECTED, and every count and map shade of a
  place counts those same installers. Section 4.4 says where the others go.
- **The data files do not change.** The page works out territory, travel and status from
  what the files already carry (section 3.6).

### 4.1 Every view: the frame, the tabs and the addresses

- **Header,** on every view, pinned at the top: the INFINIUM logo, the title "Installer
  Index", two tabs, **Find installers** and **All installers**, and at the right a box
  labeled "Find a company or person" (section 4.7). The tab of the view you are on is
  marked.
- **Footer,** on every view: the freshness line ("Installer records from QuickBase,
  refreshed October 9, 2026.", with the date from `build.json` and the out-of-date wording
  of the first prompt's ruling 8) and a link to About this data.
- **Every view has its own address,** so it can be bookmarked or sent. The addresses:

| Address | View |
|---|---|
| `#/` | Find installers |
| `#/state/<code>` | A state, by its two-letter code; ON for Ontario |
| `#/state/<code>?county=<id>` | That state with one county chosen |
| `#/zip/<five digits>` | A ZIP code |
| `#/city/<id>` | A city, when city lookup is built (section 4.10) |
| `#/installer/<installer id>` | One installer |
| `#/installers` | All installers |
| `#/about` | About this data |

- **Choices ride on the address** as `?` items, in this order where more than one applies:
  on a state's view `county` (a county id); then `view` (`est`, `pm` or `rec`); then for
  All installers `q` (what was typed), `office` and `territory` (a state code),
  `dormant=1`, `inactive=1` and `map=off`; and on an Installer view `from` (the place it
  was opened from, written as the place's own address without its `#`, encoded as an
  address item's value is encoded, so that its own `?` and `=` survive). An item that is
  not one of these, or a value that does not fit it, gives the not-found view.
- **Dates** on rows, signals and lists are written short, as "Feb 28, 2027"; the
  freshness line writes the month in full, as "October 9, 2026".
- **Old addresses keep working.** `#/search?q=<text>` opens `#/installers?q=<text>`, and
  five digits open the ZIP's address; `#/not-on-the-map` opens
  `#/installers?dormant=1&inactive=1&map=off`; `#/installers?set=rates` and `?set=contact` open All installers
  in the Estimating view; `#/installers?status=<status>` opens All installers with the
  toggle that status needs ticked. Each is replaced in the browser's history, not added.

### 4.2 The view switch

- **Three views: Estimating, Project management and Records.** A switch of three buttons
  shows them, on a place's view, on the Installer view and on All installers. The view you
  are in is marked.
- **A view changes what a row shows** (section 4.5) **and the order of an installer's
  page** (section 4.6). It never changes who is listed, nor in what order.
- **The view is remembered** in that browser, and carried in the address as `view=`. An
  address with `view=` opens that view and remembers it. An address without it opens the
  remembered view, or Estimating when nothing is remembered. (Estimating as the first view
  is Cowork's call, for Joe to overrule.) If the browser will not keep it, the page still
  works and opens in Estimating.
- **Changing the view** replaces the address in the browser's history; it does not add a
  step to Back. The focus stays on the switch.

### 4.3 Find installers

Address `#/`. The page the Index opens on.

- **Heading** "Find installers for a project", and one line: "Type where the job is, or
  open a state on the map."
- **Two halves, side by side,** each about half the width on a desktop screen:
  - **Left: the location box,** labeled "Project location", with the hint "ZIP code,
    county, state or city." Section 4.3.1 says how it works. Under it, three counts from the
    files: installers in all, a link to `#/installers?dormant=1&inactive=1`; installers
    with counties on the map at either tier, not a link; and installers not on the map, a
    link to `#/installers?dormant=1&inactive=1&map=off`.
  - **Right: the map** of the United States and Ontario, the one built on October 7, **drawn
    as soon as the page opens,** at US level, filling the half's width. Each state is
    shaded by how many installers have territory there (section 4.0) and is a link to that
    state's view. Its legend sits under it. Nothing must be pressed to show it.
- **Under both halves:** "Every state and Ontario", every state by name with its number
  of installers with territory there, each a link to its view (ruling 3). It is closed by
  default and opens with one click.

#### 4.3.1 The location box

The same box is on Find installers and, as "Change location", at the top of a place's view.

- **What it takes:** a ZIP code, a county, a state, or a city (section 4.10).
- **Suggestions show as you type,** from the second letter, at most 10, each labeled with
  its kind: "County", "ZIP", "State" or "City". A county reads "Cuyahoga County, Ohio"; a
  city reads "Cuyahoga Falls, Ohio · Summit County". Typing the word "county" is not
  needed. A county or city name used in several states is offered once per state.
- **A state after the name narrows it.** What is typed may end with a state's name or
  two-letter code, with or without a comma: "washington oh" and "Washington County, Ohio"
  offer only Ohio's. When more than 10 match, the list shows the first 10 and one line:
  "More match. Add the state, as in Washington OH."
- **Matching** is from the start of any word of the name, capitals and accents aside, and
  a state also by its whole two-letter code. Five digits offer the ZIP and nothing else.
- **Order:** ZIP first, then states, then counties, then cities; within each, by name, then
  by state.
- **Each suggestion is a link** to its address. Enter takes the first. The arrow keys move
  through them and Escape closes them. A suggestion list is announced to a screen reader
  as it changes.
- **Nothing matches:** one line says so and names what can be typed.
- **Office city is never a match here.** The location box finds places, never companies.

### 4.4 Installers for a place

Reached from the location box, the map, a link, or an address: a state, a state with one
county chosen, a ZIP code, or a city. One layout for all of them, results first.

From the top:

1. **The location bar:** the place's name as the heading ("Summit County, Ohio",
   "Ohio", "ZIP 44149"), a tag saying its kind, a link to the whole state when a county is
   chosen ("All of Ohio"), and the "Change location" box (section 4.3.1).
2. **One summary line:** "6 installers with territory in Summit County, Ohio · 3 more
   available for travel", the two numbers being the two lists' lengths. A ZIP or city in
   several counties lists those counties here instead, each a link to that county's view,
   the largest share first.
3. **The view switch** (section 4.2), on the same line as the summary on a wide screen.
4. **Two columns on a screen 1100 pixels wide or more:** the lists, taking the width; and
   the county map of the state, in a column at most 320 pixels wide on the right, with
   the box "Find a county in Ohio" under it. The map is shaded by how many installers have
   each county as Tier 1, and the chosen county is outlined. A button "Hide map" folds the
   column away and gives the lists the full width; "Show map" brings it back. On a
   narrower screen the map starts folded. For a ZIP or city in several counties the map
   shows the state of the first county, with each of the ZIP's counties outlined.

The lists, in this order:

1. **Tier 1,** under the heading "Tier 1 · territory includes Summit County", in the
   columns of the view (section 4.5).
2. **The Tier 2 button,** with one line beside it: "3 installers list Summit County as
   Tier 2." When pressed, **Tier 2,** under the heading "Tier 2 · available for travel to
   Summit County", in the same columns, with the Tier 2 charge added in the Estimating
   view.
3. **"Did not respond to the August outreach"**: installers whose status is DORMANT - NO
   RESPONSE and who have the place at either tier. One line each: company (a link), its
   tier for the place, its office city and state. Left out when there are none.
4. **"Not on the map, with an office in Ohio"**: installers with no county at either tier
   whose office is in the place's state, other than INACTIVE and HELD - BUSINESS DECISION.
   One line each: company (a link), office city, and the coverage note, labeled, when there
   is one. Left out when there are none.
5. **The foot line,** always, last: "21 installers are not on the map and may also serve
   this area." (or "1 installer is not on the map…"), the number taken from the data, a
   link to `#/installers?dormant=1&inactive=1&map=off`, which lists exactly those.

- **INACTIVE and HELD - BUSINESS DECISION installers are never in a place's view.**
- **A PENDING - UPDATE EXPECTED installer** carries a "Pending update" tag beside its
  company name.
- **Each list is in the order of the installers file,** which is alphabetical by company.
- **The tier line,** under the company in every row (Cowork's wording, for Joe to
  overrule):
  - In a Tier 1 list: "Tier 1 · 40 counties in Ohio", and when it also has Tier 2 counties
    in the state, "Tier 1 · 40 counties in Ohio, and available for travel to 12 more". The
    count is for the whole state, with or without a county chosen.
  - In a Tier 2 list: "Tier 2 · available for travel to 12 counties in Ohio".
  - For a ZIP or city in several counties, it names the counties instead: "Tier 1 ·
    territory in Summit County and Portage County", with ", and available for travel to
    Stark County" when it has another of them as Tier 2; in the Tier 2 list, "Tier 2 ·
    available for travel to Stark County".
  - One county is "1 county".
- **On a phone** the lists and the location bar come first, and the map is drawn when
  asked for (group P, later).

### 4.5 What a row shows, by view

The same rows serve a place's lists (section 4.4) and All installers (section 4.7). Rates
are US dollars per hour, shown with two decimals and right-aligned in figures of equal
width; a blank rate reads "Not given". Long text is clipped to two lines and shown whole
on hover and in the Installer view. Every row's company name is a link to the Installer
view, carrying `from=` when the row is in a place's list.

**Estimating**

| Column | What it shows |
|---|---|
| Installer | Company; "Pending update" tag when it applies; the tier line in a place's list; office city and state |
| Quote contact | The quoting place of the row (section 4.8): role, name, title, phone, email; a stand-in labeled with its own role and the marker; "Show all contacts" |
| Non-union ST / OT | The two non-union rates |
| Union ST / OT | The two union rates |
| Mobilization | As written |
| Rates valid through | The date, and "Expired" when it has passed |
| Tier 2 charge | In a Tier 2 list only: whichever of the five Tier 2 parts are filled, joined with " · "; "Not given" when none is |

**Project management**

| Column | What it shows |
|---|---|
| Installer | As in Estimating |
| Scheduling contact | The scheduling place of the row (section 4.8), shown as the quote contact is; "Show all contacts" |
| Field contact | The field contact (section 4.8): name, title, phone; "No field contact on record" when there is none |
| Receiving | "Warehousing: Yes", "Warehousing: No" or "Warehousing: Not recorded", with where when given; then the receiving contact (section 4.8) by name and phone, or "No receiving contact on record" |
| Paperwork | "No agreement on file" when the agreement answer is No; "No certificate of insurance on file" when the certificate answer is No; each shown, never one for both. A blank answer reads "Agreement not recorded" or "Insurance not recorded". Both Yes: "Agreement and insurance on file" |
| Travel note | As written; "Not applicable" when its box is ticked and it is empty |

**Records**

| Column | What it shows |
|---|---|
| Installer | Company, a status tag, and "Last confirmed" with its date for a CONFIRMED BY PARTNER record |
| Rates valid through | The date, and "Expired"; "Not given" |
| Agreement | Yes, No, or Not recorded |
| Certificate of insurance | "On file", with "valid through" and the date when given; No; or Not recorded |
| EMR | As written; "Not applicable" when its box is ticked; "Not given" |
| Contact gaps | "No quoting contact" and "No scheduling contact", from the row's gap; "None" |
| Territory | "Tier 1 in 40 counties", with "· travel to 12" when it has Tier 2 counties; "Travel only (Tier 2)"; or "Not on the map" |

Amber, always with words, marks what is missing or expired: "Expired", the paperwork
markers, the contact markers and the contact gaps. Nothing is marked by color alone.

### 4.6 Installer

Address `#/installer/<installer id>`, with `view=` and `from=` when they apply.

- **A back link,** "Back to Summit County, Ohio", when the address carries `from=`, going
  to that place's address. Without `from=`, no back link; the browser's Back still works.
- **The overview,** at the top, always first:
  - Company, a status tag, and the view switch.
  - One line: office city and state; "Last confirmed" and its date when the status is
    CONFIRMED BY PARTNER; shop or labor status.
  - **Three signals,** each always shown, each in words: **Rates** ("Valid through Feb 28,
    2027", "Expired Sep 1, 2026", or "Not given"); **Installer agreement** ("On file",
    "Not on file", or "Not recorded"); **Certificate of insurance** ("On file", with "valid
    through" and the date when given; "Not on file"; or "Not recorded").
  - With `from=`: "From your search: Tier 1 in Summit County, Ohio" (or "Tier 2 · available
    for travel to Summit County, Ohio"; or "Did not respond to the August outreach").
- **A jump bar** under the overview, pinned under the header as the page scrolls: one link
  to each section, in the section order of the view.
- **The sections, one page, no tabs,** in this order:
  - Estimating: Contacts · Rates and travel · Coverage · Logistics and locations ·
    Documents and record.
  - Project management: Contacts · Logistics and locations · Coverage · Documents and
    record · Rates and travel.
  - Records: Documents and record · Contacts · Rates and travel · Coverage · Logistics and
    locations.
- **Contacts.** One card per current contact: roles, name, title, phone, email, second
  email, procedure, and "Confirmed this record" when ticked; "Role not recorded" for a
  contact with no role. Order: in Estimating, the quoting contacts first; in Project
  management, scheduling, then field, then receiving; then everyone else in the full order
  of section 4.8. In Records, the full order of section 4.8. One person in several roles is
  one card with every role on it. Departed contacts are under "Former contacts", closed by
  default, each marked "Departed".
- **Rates and travel.** The four rate tiles, labeled "USD per hour"; then mobilization,
  rates valid through (with "Expired"), shop or labor status, outreach pricing notes, the
  Tier 2 charge (whichever parts are filled, ruling 4), and the travel note.
- **Coverage.** Two columns: **Territory (Tier 1)** and **Available for travel (Tier 2)**,
  each with its county total, then each state with its count, opening to "Open the map of
  Ohio" (ruling 8) and the counties by name. A column with no counties says "None". The
  coverage note follows, labeled "Coverage note"; for an installer with no county at either
  tier the note stands alone, labeled "Coverage note, not confirmed on the map".
- **Logistics and locations.** Office address; shipping address and second shipping
  address, or "Not applicable" when the box is ticked and the address is empty;
  warehousing, and where; the receiving contact.
- **Documents and record.** Installer agreement on file; certificate of insurance on file;
  certificate valid through; EMR (or "Not applicable"); record status; last confirmed
  (CONFIRMED BY PARTNER only); notes; anything else. Last, always: "Something wrong here?
  Tell Joe Lull, joe.lull@infiniumwalls.com", the address a mail link.
- **A field with no value is left out,** except the three signals of the overview, which
  always show.

### 4.7 All installers

Address `#/installers`, with the items of section 4.1.

- **Heading** "All installers".
- **Filters,** in one row above the table:
  - **Office in:** any state, or one state. Matches the office state.
  - **Territory in:** any state, or one state. Matches an installer with Tier 1 counties
    there.
  - **Also show:** two boxes, both unticked when the page opens: "Did not respond to the
    August outreach" (DORMANT - NO RESPONSE) and "Inactive or on hold" (INACTIVE and HELD -
    BUSINESS DECISION). Each shows its count beside it.
  - **Narrow to:** one box, "Not on the map": only installers with no county at either tier.
    It shows its count beside it.
- **With no box ticked,** the table holds CONFIRMED BY PARTNER and PENDING - UPDATE
  EXPECTED installers. Ticking a box adds its installers; "Not on the map" then narrows
  what is shown.
- **The view switch,** and a count line: "Showing 57 of 74".
- **The table:** every installer that passes, in the order of the installers file, in the
  columns of the view (section 4.5). In Estimating and Project management a last column,
  **Territory in**, lists the state codes where it has Tier 1 counties, each a link to that
  state's view (ruling 8); "Travel only (Tier 2)" or "Not on the map" otherwise. Column
  titles stay visible while the table scrolls.
- **Search.** What is typed in the header box opens All installers with `q=`. The search
  rules of the eighth revision's section 4.5 stand, with ruling 6 for email addresses: a
  company name, contact name or office city from the start of a word; a phone by its
  digits; a state by its whole name or code, finding an installer with its office there or
  territory there. A match shows the value that matched and "Matched on …", and a match on
  a contact not on the row shows that contact. A search that names a state shows "Open the
  map of Ohio" above the table (ruling 7). A result found by territory says "Territory
  includes Ohio: 40 counties", with ", and available for travel to 12 more". Exactly five
  digits go to the ZIP's view instead.
- **While a search is typed, every status is searched,** whatever the boxes say; each
  result carries its status tag.
- **No match** says so and lists what can be searched.
- **On a phone** each installer is a card (group P, later).

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

**On a row** (a place's lists and All installers, in the Estimating and Project management
views) there are two places:

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

**The field contact and the receiving contact.** Added in the ninth revision for the Project
management row. The page, not the job, chooses them from the installer's `contacts`, so
neither the job nor the files change. (Cowork's call, for Joe to overrule.)

- The **field contact** is the first current contact, by the "first by name" rule above,
  who holds Field / Installation and can be reached; when none can be reached, the first
  who holds it. None holds it: "No field contact on record". No stand-in is used.
- The **receiving contact** is chosen the same way from Receiving / Warehouse. None holds
  it: "No receiving contact on record".
- A departed contact is never chosen. One person may be the scheduling, field and receiving
  contact at once; each column shows them.

### 4.9 ZIP lookup

At launch, by Joe's ruling of October 6.

- Five digits in the location box, or in the company box, go to the ZIP's address. Nothing
  is sent anywhere; the ZIP list is ten files beside the page, by a ZIP code's first digit,
  and only the one a ZIP needs is fetched, when its address is opened (ruling 4).
- **One county:** that county's view (section 4.4), under the heading "ZIP 44221 · Summit
  County, Ohio".
- **More than one county:** a place view whose summary names every county the ZIP touches,
  largest share first, each a link to that county's view; its lists hold the installers
  with territory in any of them, each once, as section 4.4 says. (Cowork's call, for Joe
  to overrule.)
- **Not found:** the page says so, and says what the list leaves out: ZIP codes that are
  only post office boxes, ZIP codes belonging to a single organization, military ZIP codes,
  and Canadian postal codes.
- **A ZIP outside the map:** the ZIP list covers Puerto Rico and the US island areas, which
  the county map leaves out. The page says the ZIP is outside the mapped area.

**How sure the ZIP list is.** It is the Census Bureau's 2020 ZIP-to-county file: 46,969
rows, 33,791 ZIP codes. A Census ZIP area is close to, but not exactly, the area the Postal
Service delivers to. For a job site near a county line, the street-address search of the
second phase is the exact answer.

### 4.10 City lookup

Built now if the place list allows it; otherwise it waits, and nothing else changes.

- **The source:** the application form's place list, `places.json`, 6,242 places
  (`installer-application`, read at a fixed commit). It is built into the Index only if
  its places carry the county or counties they lie in, by the ids of `counties.json`, or
  carry what the build can turn into them without another source, and at least 95 of
  every 100 places resolve to a county that way. Places that do not resolve are left out
  and counted. If the list does not allow it, city lookup is not built in this revision, the location box offers ZIP, county and state, and
  its hint does not mention cities.
- **When built:** a script in `job\`, run by hand like the map scripts, writes the cities
  into `public\geo\`, fetched only when the location box first holds two characters; each city
  has an id, its name, its state and its counties. A city in one county opens that
  county's view under the heading "Cuyahoga Falls, Ohio · Summit County". A city in
  several counties is a place view like a ZIP in several counties.
- **What it will not do:** the 6,242 places are not every place, so a small town or an
  unincorporated area may be missing; the location box's hint then says to try the ZIP.
  Ontario cities are not in the list.

### 4.11 About this data

Reached from the footer of every view.

- When the data was refreshed, the counts, the gap counts of section 4.8, and the result of
  each nightly check.
- The counts are labeled as the files mean them (section 3.6): "Installers with counties
  on the map, at either tier" for `installersWithTerritory`, "Installers not on the map" for
  `installersWithoutTerritory`, and "Counties with an installer, at either tier" for
  `countiesCovered`. Beside them, three counts the page works out: "Installers with
  territory (Tier 1)", "Installers available for travel only (Tier 2)", and installers by
  status.
- **Where the maps come from,** in exactly these three lines (the second prompt's ruling 5):
  - County and state outlines: U.S. Census Bureau, 2025 cartographic boundary files.
  - Ontario census divisions: adapted from Statistics Canada, 2021 Census boundary files.
    This does not constitute an endorsement by Statistics Canada of this product.
  - ZIP codes: U.S. Census Bureau, 2020 ZIP Code Tabulation Area to county relationship
    file. A Census ZIP area is close to, but not exactly, the area the Postal Service
    delivers to.
- When city lookup is built, a fourth line, exactly: "Cities: the place list of
  INFINIUM's installer application form."
- **"Something wrong in a record? Tell Joe Lull, joe.lull@infiniumwalls.com."** The address
  is a mail link.

## 5. The look

Taken from the review, with five changes that fix defects it measured.

**Kept:** the INFINIUM greens and grays, Montserrat for headings and Roboto for text, the
white header with its green bar and rule, the pinned header, the white panels, the dark
table header, the four rate tiles, a US state map and its shading.

**The ninth revision's look** (Joe, October 8, 2026, from the agreed screens):

- **Results first.** On a place's view, the header and the location bar together are at
  most 150 pixels tall at 1440 by 900 and at 1280 by 800, and the first row of the Tier 1 list starts
  within 360 pixels of the top of the page at 1440 by 900 and at 1280 by 800. No map, banner
  or large heading stands above a list.
- **Denser and quieter.** Panels with a light gray border (`#D9D9D9`), corners of 8 pixels,
  no shadow; the page ground `#F4F5F2`. Body text 15 pixels, table text 14, labels 12 to 13,
  nothing under 12. Company and contact names in bold; titles and labels in gray under
  them.
- **Numbers line up.** Rates right-aligned, two decimals, in figures of equal width.
- **Color means one thing each.** Green (`#76A134`) for the brand bar, the selected tab,
  focus rings, the map, and the outline of the Tier 2 button; charcoal (`#282828`) for the
  selected view in the view switch and the table header; amber text (`#6E4300`) on a pale
  amber ground (`#FFF1D6`) for anything missing or expired, always with words; status tags
  in gray, "Pending update" in amber.
- **Width.** Content at most 1,400 pixels wide, so the Estimating row fits at 1280 without
  scrolling sideways.
- **Buttons and switches** are at least 44 pixels tall where they are the main control of
  a view (the Tier 2 button, the view switch, the location box).

**Changed:**

| Old page | New lookup | Why |
|---|---|---|
| Green `#76A134` used for company names, emails and phones | Links are charcoal `#444444`, underlined, with green kept for accents, focus rings and the map | Green on white measured 3.04 to 1; text needs 4.5 to 1 |
| Column titles at 9px, 8px on a phone | No text under 12px | The titles are what tell Union OT from Mobilization |
| Tables wider than the screen, cells that never wrap | Tables fit their panel on a desktop; cards on a phone | Rates were off the right edge until scrolled |
| Pinch-to-zoom turned off | Zoom allowed | People need to enlarge text |
| Names, map and pop-up not usable from a keyboard | Everything reachable by Tab; Escape closes anything that opens | Measured: no keyboard access at all |

**The state map's origin.** The map on Find installers is no longer the old page's drawing. The page
draws it from the US Census Bureau's state outlines and Statistics Canada's for Ontario,
credited on About this data (the second prompt's rulings 2 and 5). The old page's map
appeared to come from Simplemaps; nothing of it is used.

## 6. Launch and second phase

**At launch:** everything in section 4. A place is found by clicking the state and then the
county, by typing a county name, or by typing a ZIP code.

**Second phase: address search.** A street address is typed, on Find installers or in a place's view.
The county it falls in is outlined on the map and its installers are listed as section 4.0
says: Tier 1, with the button for Tier 2.
From Find installers, the lookup jumps to the right state.

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

**City lookup:** settled in the ninth revision, section 4.10.

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

**As of the ninth revision.** Steps 4, 5 and 6 were built on October 7 on a desktop screen
and are on the Netlify test copy. The ninth revision redesigns the views of steps 5 and 6,
as section 4 says, and adds city lookup to step 6 when the place list allows it.

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

- **Closed in the ninth revision (section 4.5).** Whether the paperwork lines are shown as QuickBase has them. 26 installers say a
  valid certificate is on file and none has a date. 36 say an agreement is on file and 28
  say it is not. How current those answers are is not known.

**For Joe and the outreach import, raised October 8 (section 3.3):**

- **Two installers have Tier 1 across nearly the whole map.** Since territory is Tier 1,
  both are in the Tier 1 list of nearly every place, and in 2,225 counties they are the
  only Tier 1 installers. Whether each truly works everywhere at Tier 1, or marked the
  whole map by mistake, is for the outreach import to confirm. The page shows what
  QuickBase holds.
- **One installer chose no Tier 1 county.** It marked 348 counties in 12 states, its home
  state among them, all as Tier 2, so it is in no Tier 1 list, even where its office is.
  Whether it meant some of them as Tier 1 is for the outreach import to confirm.
- **Two more installers marked nearly the whole map, almost all as Tier 2.** They are in
  the Tier 2 list of nearly every place. One of them left out Alaska, Hawaii and 37 other
  counties and divisions scattered across the map, which looks accidental rather than
  chosen.

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

- Whether city lookup is added: settled in the ninth revision, section 4.10.
- Whether the 16 company names the old page splits by market match how QuickBase lists
  those installers.
- What staff should do when they find a wrong value: settled in the ninth revision, they
  tell Joe (section 2). Who corrects QuickBase is still to decide.

**Closed in the ninth revision:**

- What territory means on the page: Tier 1 (Joe, October 8). Tier 2 is where an installer
  is available for travel.
- How the maps are drawn, where the Home map comes from, and how the ZIP list is split:
  as the page's second prompt built them on October 7.
- Which views the Index has, what each row shows by view, and which statuses a place lists
  (Joe, October 8; section 4).
- Whether the paperwork lines are shown as QuickBase has them: yes, as words, with "Not
  recorded" for a blank (section 4.5).
- Currency: US dollars (Joe, October 8).

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
- City search at launch. It was undecided; the ninth revision settles it (section 4.10).

## 10. What is not verified

- **Everything in section 3 is Claude Code's reading of QuickBase on October 6,** relayed
  as a report. Cowork checked that the report's figures agree with each other. It did not
  see QuickBase. The exception is the October 7 table in section 3.3, which is Cowork's
  own count of the published data files, not of QuickBase.
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
