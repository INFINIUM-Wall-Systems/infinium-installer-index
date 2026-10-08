# INFINIUM Installer Index — Acceptance Checks

**Date:** Tuesday, October 6, 2026; third version Thursday, October 8, 2026
**Owner:** Joe Lull
**Status:** third version, October 8, 2026. Joe gave GO on October 6, 2026, on draft 2 with
no changes, and the letters and numbers of the checks are fixed. The third version goes
with the specification's ninth revision, the redesign Joe ruled on October 8: V2, V5, V13,
M1, M4, M5, M6, M7, M8, M9 and M11 are reworded, V17 to V20 and M14 to M21 are added, and
one threshold is added. No check is dropped and no letter or number changes. Joe agrees
the third version by giving the page's third prompt to Claude Code. Draft 2 followed Joe's
rulings on the data path: the daily job runs on GitHub and saves the data files into the
repository; the test copy is on Netlify; protecting the test copy is not part of this
work.
**Goes with:** `claude/INSTALLER-INDEX-SPEC-2026-10-06.md`, ninth revision
**FinishLine:** `infinium-installer-index`
**In the repository this is:** `docs\ACCEPTANCE.md`

**Notes at agreement (October 6, 2026)**

- **R1.** "Its first commit is on GitHub" is what the check tests. A later commit that has
  not been pushed yet does not fail it.
- **R2.** Git keeps no empty folder, so a folder with nothing in it yet holds a placeholder
  file named `.gitkeep`. Two folders hold none. `public\data\` is not expected until the
  job has run once. `review-screens\` is not committed, so the check asks only that git
  tracks nothing in it. `.gitignore` and `.gitattributes` are allowed beside the files
  section 3.4 of the specification draws.
- **R6.** Its GitHub half can be shown only once the job exists. Until then it is reported
  as not yet shown, never as passed.
- **The thresholds at the foot of this document** stand as Cowork proposed them.

This is the list of things that must be true before a piece of the Installer Index is
called done. The specification says what is built. This says how anyone can tell it was
built right.

---

## How to read this

- **Each check has a letter and a number that never change** once Joe agrees the list. A
  check that is dropped keeps its number and is marked dropped.
- **A check passes only when something shows it:** a script that prints pass or fail, or a
  picture Joe opens. "It looks right to Claude Code" is not a pass.
- **A new check must first be shown to fail** when the thing it checks is broken. A check
  that cannot fail proves nothing.
- **No check prints installer data.** A check reports counts, file names and column names.
  It never prints a company, a person, an email, a phone, a rate or an installer id.
- **The groups follow the FinishLine milestones.** A milestone is done when every check in
  its group passes and Joe has seen the result.
- **Counts quoted here are from October 6, 2026.** A check compares the page with the data
  files, and the data files with QuickBase. It never compares with a number typed here.

---

## R. The repository and its rules

Set up by the first prompt that creates the folder. No FinishLine milestone of its own.

| # | Check |
|---|---|
| R1 | The folder `infinium-installer-index` exists inside the PartnerFinder folder, is tied to the GitHub repository of the same name, and its first commit is on GitHub. |
| R2 | The folders and files match section 3.4 of the specification. |
| R3 | `CLAUDE.md` holds the stop list and the data rules, and names this document and the specification as the two governing documents. |
| R4 | `review-screens\` is ignored by git. Shown to fail: a file placed there does not appear as something git would commit. |
| R5 | Outside `public\data\`, no file that git tracks holds an installer id, an email address or a phone number, apart from a short allowed list. Code, documents and tests use made-up installers. A script scans every tracked file. Shown to fail on a planted line. |
| R6 | No QuickBase key is in any file in the repository. Files whose names start with `.env` are ignored by git. On the P: drive the key is read when a script runs, from `.env.local` in the parent folder. On GitHub it is read from the repository's secrets. It is never printed in either place. |
| R7 | The QuickBase client in the repository can only read. Shown to fail: a test asks it to write a record, and to read Dave's table `bwcd37y2s`; it refuses both without calling QuickBase. |
| R8 | `docs\quickbase\columns.json` lists every column of the three tables with field id, label, type and choices: 338, 15 and 12 columns. A script compares it with QuickBase and reports 0 differences. Shown to fail on a changed label in a copy of the file. |

## J. The nightly job

FinishLine milestone: **Nightly data files building from QuickBase with checks.**

| # | Check |
|---|---|
| J1 | The job reads the three installer tables through the REST interface and no other table. Every call it makes is listed in its report, by method and address. |
| J2 | The counts in `build.json` equal QuickBase's own totals for the three tables at the time of the run. |
| J3 | Count guard. The job stops if installers fall by more than 5, or contacts or territory rows fall by more than 10 percent, since the last good run. Shown to fail on planted input. |
| J4 | Every contact row and every territory row points at an installer that exists. Shown to fail on a planted orphan row. |
| J5 | Every county id on a territory row exists in the county list. Shown to fail on a planted id. |
| J6 | No installer id appears twice. Shown to fail on a planted duplicate. |
| J7 | Every installer has a company name and one of the five allowed record statuses. Shown to fail on a planted blank and a planted sixth status. |
| J8 | Every column the job reads still has the field id, label and type in `columns.json`. Shown to fail on a changed label. |
| J9 | When any check fails, nothing under `public\data\` changes, nothing is saved into the repository, the run ends with an error and shows as failed, and its report names the check that failed. |
| J10 | Running the job twice on unchanged data writes byte-identical installer and territory files. Only the run time in `build.json` differs. |
| J11 | County ids are text in every file. The 318 ids that begin with a zero keep the zero. |
| J12 | The gap counts in `build.json` (installers with no quoting contact, no scheduling contact, and neither, leaving out departed contacts) equal a second count made a different way. |
| J13 | "Last confirmed" is written only for installers whose status is CONFIRMED BY PARTNER. |
| J14 | A departed contact is marked departed in the file and is never chosen for a row. |
| J15 | The job stays under 100 calls in any 10 seconds and reports how many calls it made. |
| J16 | Nothing the job prints, to the screen or to a log, holds installer data or the key. Numbers and names of checks only. |
| J17 | GitHub runs the job once a day with nobody doing anything: the run time in `build.json` moves forward on two mornings in a row. |
| J18 | The job can be started by hand from the repository's Actions page, and that run does the same thing as the scheduled one. |
| J19 | Only the job changes `public\data\`. Shown to fail: a hand edit to a file there is caught by a check before it can be committed. |

## V. Directory, search and installer views on a desktop

FinishLine milestone: **Directory, search and installer views working on a desktop.**

Checked at 1440 and 1280 pixels wide.

| # | Check |
|---|---|
| V1 | Every view has its own address. Pasting an address into a new tab shows the same view. |
| V2 | "All installers" lists every installer in `installers.json` that its filters and boxes let through, in the order of the file (alphabetical), in the columns of each of the three views (section 4.5 of the specification). With both "Also show" boxes ticked, "Not on the map" unticked and no filter, it lists all of them. |
| V3 | Column titles stay visible while scrolling and are never under the search bar. |
| V4 | No table is wider than its panel. No text is cut off without a way to read it. |
| V5 | The Installer view shows every filled field named in section 4.6 of the specification and leaves out every empty one, apart from the three signals of its overview, which always show. Checked on the record with the most filled fields and the record with the fewest, in all three views. |
| V6 | Contacts on a row follow section 4.8. One made-up installer per rule: both roles held; one person in both; quoting missing with a stand-in; scheduling missing with a stand-in; both missing; no stand-in available; a departed contact; a contact with no phone or email; two people in one role; a contact with no role. Each shows what the rule says. |
| V7 | The "Last confirmed" date shows only on a record whose status is CONFIRMED BY PARTNER. |
| V8 | Search by state matches whole names and whole two-letter codes only. Typing "oh" returns no installer whose only match is those letters inside another word. |
| V9 | Search by company, contact or city matches from the start of a word. Typing "in" does not return an installer whose only match is "in" inside a longer word. |
| V10 | Every search result shows on screen the value that matched. Nothing hidden is searched. |
| V11 | A search with no match says so and lists what can be searched. |
| V12 | The "Rates expired" marker shows when, and only when, the valid-through date is before today. Mobilization is shown as written. |
| V13 | "Not on the map" in All installers, with both "Also show" boxes ticked, lists exactly the installers with no territory rows. |
| V14 | The freshness line shows the date in `build.json`. "About this data" shows the counts, the three gap counts and the result of every check. |
| V15 | No script error in any view. |
| V16 | With the data files missing or unreadable, the page says the data could not be loaded. It does not show an empty directory as if no installers existed. |
| V17 | Every old address that section 4.1 of the specification names opens the view it says, and replaces its step in the browser's history. |
| V18 | The view switch shows Estimating, Project management and Records on a place's view, the Installer view and All installers. Each view changes the columns of section 4.5 or the order of section 4.6, and never who is listed or in what order. The view is carried in the address and remembered in the browser; with nothing remembered, or a browser that keeps nothing, the page opens in Estimating. |
| V19 | All installers with no box ticked lists exactly the CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED installers. Each "Also show" box adds exactly its statuses, "Not on the map" narrows to the installers with no territory rows, and the count beside each box is the data's. A search lists matches of every status, each with its status tag. |
| V20 | In every view, every Installer view has its sections in the order section 4.6 gives, a jump bar with a link to each, the three signals of its overview in words, and the line naming Joe with his email address as a mail link. About this data carries the same line. |

## M. Map, state, county and ZIP views

FinishLine milestone: **Map, state and county views working.**

| # | Check |
|---|---|
| M1 | On Find installers, each state's shade matches the number of CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED installers with territory in that state: at least one Tier 1 county there. Checked for every state and Ontario by script. |
| M2 | Clicking a state opens its State view. Ontario can be reached. |
| M3 | The State view draws only that state's counties and loads only that state's shapes. The whole-country file is never requested. |
| M4 | Each county's shade matches the number of installers in that county's Tier 1 list. Checked for every county by script. |
| M5 | Clicking a county outlines it and narrows the Tier 1 list to exactly the CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED installers that have the county as Tier 1. The Tier 2 button then lists exactly those that have it as Tier 2 and not as Tier 1. Checked for every county by script, including one whose id begins with a zero and one Ontario division. |
| M6 | Typing a county name in the box does exactly what a click does. "All of Ohio" (the state's name) clears the choice. |
| M7 | The Tier 1 list is alphabetical, and so is the Tier 2 list below it once the button is pressed. The tier line of each entry follows section 4.4, with and without a county chosen and for a ZIP in several counties. |
| M8 | The line at the foot of every place's list shows the number of installers with no territory rows, taken from the data, and opens All installers listing exactly those installers ("Not on the map" and both "Also show" boxes ticked). Shown to fail if the number is typed into the page. |
| M9 | A county with no installer says so. A county with no Tier 1 installer says so, and still offers the Tier 2 button when a Tier 2 installer lists it. Checked with made-up data, since no county is in either position today. |
| M10 | Five digits in the search box gives the county or counties for that ZIP. Checked against the ZIP list for 50 ZIP codes, including ones that cross a county line and ones that begin with a zero. |
| M11 | A ZIP that crosses a county line names every county it touches. Its Tier 1 list holds each installer with territory in any of them, once; its Tier 2 list holds each of the rest that has any of them as Tier 2, once. |
| M12 | A ZIP that is not in the list, and a ZIP outside the mapped area, each say so in the words of section 4.9. |
| M13 | The ZIP list is loaded only when a ZIP is typed. |
| M14 | Every list of the installers for a place (a state, a county, a ZIP code, a city) first shows only the Tier 1 installers, with a button under them that reads "View Tier 2 Installers Available for Travel". Pressing it lists the Tier 2 installers below the Tier 1 list, no installer in both; pressing it again hides them; every place opens with them hidden. A place that no Tier 2 installer lists shows no button and says so. Checked for every state and every county by script, and with the mouse and the keyboard in a browser. |
| M15 | Wherever a view gives an installer's territory (the Installer view, the Territory in and Territory columns, a search result found by territory, the counts a map shows) it counts Tier 1 counties only, and shows any Tier 2 counties apart, as available for travel. Checked on every made-up installer, and by counts on the real files. |
| M16 | Find installers draws the map of the United States and Ontario as soon as it opens, at US level, with nothing pressed, on the right half of the page beside the location box. Shown at 1440 and 1280 in a browser. |
| M17 | The location box offers every county typed as its name followed by its state's code, and a county typed by its name alone when nine or fewer states share that name, a ZIP, and a state by name or code (and a city, when city lookup is built), each labeled with its kind, a county name used in several states once per state, and never an office city. Each suggestion leads to the same view as the map does. Checked for every county and state by script. |
| M18 | A place's view holds in its Tier 1 and Tier 2 lists only CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED installers; puts DORMANT - NO RESPONSE installers that have the place at either tier under "Did not respond to the August outreach"; lists installers not on the map with an office in the place's state under their own heading; and never lists INACTIVE or HELD - BUSINESS DECISION installers. Checked for every state and county by script. |
| M19 | On the Project management row the field contact and the receiving contact follow section 4.8 of the specification, and each missing paperwork item is shown on its own. One made-up installer per case. |
| M20 | Results come first: on a place's view at 1440 by 900 and at 1280 by 800, the header and the location bar together are at most 150 pixels tall and the first row of the Tier 1 list starts within 360 pixels of the top. Measured in a browser. |
| M21 | City lookup, when built: for 50 cities taken from the city files by a fixed rule, ones in several counties among them when the files hold any, the view names exactly the counties the files give. When not built: the location box offers no city and its hint does not mention cities. |

## P. Phone layout and readability

FinishLine milestone: **Phone layout and readability checks passing.**

Checked at 390 pixels wide, and on Joe's own phone.

| # | Check |
|---|---|
| P1 | No view scrolls sideways. |
| P2 | Every table becomes cards. |
| P3 | No text anywhere is smaller than 12 pixels, measured from the rendered page. |
| P4 | Every piece of text measures at least 4.5 to 1 against its background, including text drawn on the map. |
| P5 | Everything that can be clicked can be reached with the Tab key and shows where the focus is. Escape closes anything that opens. |
| P6 | Pinch-to-zoom works. |
| P7 | Every button and link in a list is at least 44 pixels tall. |
| P8 | In a State view the list and the county box come first, and the map is drawn when asked for. |
| P9 | Joe opens the test copy on his own phone and goes from Home to a state, to a county, to an installer, and back. This one is Joe's check. |

## N. The Netlify test copy

No FinishLine milestone of its own. It is where groups V, M and P are shown to Joe.

| # | Check |
|---|---|
| N1 | A new Netlify site is tied to the GitHub repository and serves the `public\` folder. |
| N2 | A change pushed to the repository shows on the test copy within a few minutes, with nobody doing anything on Netlify. |
| N3 | The date on the freshness line moves forward on two mornings in a row. |
| N4 | A value Joe changes in QuickBase one day shows on the test copy the next morning. This one is Joe's check. |

## T. The INFINIUM server

FinishLine milestone: **Test copy on the INFINIUM server, refreshing nightly.** This is
Kuna's stand-up of the repository, after everything checks out on Netlify.

| # | Check |
|---|---|
| T1 | Kuna has the repository and its README, and has stood the page up on the INFINIUM server with Microsoft Entra sign-in. |
| T2 | The server copy shows the same build as the Netlify test copy: same freshness date, same counts on "About this data". |
| T3 | The date on the server copy's freshness line moves forward on two mornings in a row with nobody doing anything. |
| T4 | With QuickBase unreachable, the copy keeps showing the last good data and "About this data" shows the failed run. |
| T5 | Every check in groups V, M and P passes against the server copy. |

## X. Replacing the old page

FinishLine milestone: **Old page replaced at partnerfinder.infiniumiq.ai.**

| # | Check |
|---|---|
| X1 | A copy of the old page as it was on the day of replacement is saved, with its size and SHA-256 recorded. |
| X2 | `partnerfinder.infiniumiq.ai` shows the Installer Index. |
| X3 | Which QuickBase key the scheduled job uses from go-live on is decided and in place. This one is Joe's. |
| X4 | Whether the Netlify test copy is kept or retired is decided. This one is Joe's. |
| X5 | Staff who use the page have been told. This one is Joe's. |

## A. Address search

FinishLine milestone: **Address search added.**

| # | Check |
|---|---|
| A1 | A street address typed on Home opens the right state with the right county outlined. Checked for 20 addresses whose county is known, at least one per region. |
| A2 | An address the service cannot place says so, and the map still works. |
| A3 | With the service unreachable, the page says so within 10 seconds, and everything else still works. |
| A4 | An Ontario address is answered with a line saying address search covers the United States, and pointing to the map. |
| A5 | The page says, beside the box, that the address typed is sent to the US Census Bureau. |

---

## Thresholds Cowork proposed, for Joe to overrule

- **J3:** 5 installers; 10 percent of contacts; 10 percent of territory rows.
- **P7:** 44 pixels.
- **A3:** 10 seconds.
- **M10 and A1:** 50 ZIP codes; 20 addresses.
- **M20:** 150 pixels for the header and location bar; 360 pixels to the first row.
