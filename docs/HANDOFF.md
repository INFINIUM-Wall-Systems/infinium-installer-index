# Handoff: state for the next Claude Code chat

**Written:** October 6, 2026, at the end of the repository kickoff (Joe's prompt revision 1).

## What the repository holds

- `CLAUDE.md`, `README.md`, `docs\SPEC.md`, `docs\ACCEPTANCE.md`: Joe's text, carried in the
  kickoff prompt and checked by SHA-256 before and after they were written. Edit none of them
  unless a prompt from Joe carries the new text in full.
- `docs\HANDOFF.md`: this file.
- `docs\quickbase\columns.json`: every column of the three installer tables, read from
  QuickBase: field id, label, type, choices, and for an address part the field id of its
  Address column. No record and no date of reading.
- `job\lib\quickbase.mjs`: the read-only QuickBase client.
- `job\quickbase-columns.mjs`: rewrites `columns.json` (`npm run quickbase:columns`).
- `scripts\checks.mjs`: checks R1 to R7. `scripts\check.mjs` runs them (`npm run check`).
  `scripts\check-selftest.mjs` shows each passing and failing (`npm run check:selftest`).
  `scripts\check-columns.mjs` is R8 (`npm run check:columns`). `scripts\r5-allowed.json` is
  R5's allowed list; it is empty.
- `package.json` (no dependencies), `.gitignore`, `.gitattributes` (LF line endings), and
  `.gitkeep` in `.github\workflows`, `public\js`, `public\css`, `public\vendor`, `public\geo`.
- `review-screens\` exists on the laptop and is ignored by git.

## The QuickBase client

Copied from `installer-application`, commit `a6fc6db`: `makeClient`, `readEnv`,
`makeRedactor` and `partsOf` from `scripts\quickbase-create-tables.mjs`; `readAll` and `canon`
from `scripts\quickbase-backfill.mjs`. `makeRedactor`, `partsOf`, `readAll` and `canon` are
unchanged. `readEnv` changed in one line: its path defaults to `.env.local` in the folder
above this repository. `makeClient` changed: it sends only four reads (a table, its fields,
its relationships, a records query), only for the three installer tables, refuses anything
else before any network call, keeps a list of the requests it sends, and stops at 60 requests
in one run. Left out: the XML interface, every function that writes, and the guards the fixed
four reads and three tables replace. The comment at the top of the file has the full list.

## What QuickBase showed on October 6

- Columns: MASTER 338, Contacts 15, Territory 12. No choice list was withheld.
- Section 3.2 of the specification: all 69 field ids are in `columns.json`; the 53 labels it
  writes out all match. The 16 it describes (address parts of the two shipping addresses and
  four "Not applicable" boxes) carry QuickBase's own labels.
- Tier 2 charge columns, installers with each filled: Tier 2 basis 27, charge unit 6, charge
  unit - other 3, charge amount 4, charge relation 6. At least one: 27. None: 46.
- Installer Agreement on File?: 64 filled (Yes 36, No 28). Valid COI on File?: 45 filled
  (Yes 26, No 19). COI Valid Through: 0 filled.
- Role marks, all 221 contacts: Leadership / Ownership 69; Quoting / Estimating 66;
  Scheduling / Coordination 63; Field / Installation 44; Receiving / Warehouse 39; Office /
  Billing / Compliance / Accounts payable 39; Primary contact, After-hours, Emergency dispatch
  0; no role 47. Leaving out the 11 departed: the same, except Field / Installation 43 and no
  role 37. Receiving / Warehouse is 39 either way, not 40.

## The checks

Results, after the first push (commit `30b9f9a`):

- R1 PASS: origin is the GitHub repository, and the first commit is on GitHub.
- R2 PASS: 21 tracked files; the folders and files of section 3.4 are there.
- R3 PASS. R4 PASS.
- R5 PASS: 21 files scanned. The allowed list is empty.
- R6 PASS for the repository half: the key was compared in memory and is in no file. The
  GitHub half is NOT YET SHOWN.
- R7 PASS.
- R8 PASS: 0 differences; 338, 15 and 12 columns.
- `npm run check:selftest`: PASS, 29 cases, each as expected.

How each was shown to fail (`npm run check:selftest`, 29 cases):

- R1: a different origin, no commit, a GitHub answer that does not hold the first commit,
  GitHub's main not in the local repository, and no main on GitHub.
- R2: a required file missing, a required folder with nothing tracked, an unexpected file at
  the top level, and a tracked file under `review-screens`.
- R3: a stop-list item removed, `docs\SPEC.md` not named, and a data rule removed.
- R4: a `.gitignore` without the `review-screens` line.
- R5: a planted installer id, email address and phone number, each named by file and line.
- R6: a planted token-shaped string, a made-up key planted in a file, a tracked `.env.local`,
  and a `.gitignore` without the `.env*` line. The GitHub half of R6, the key read from the
  repository's secrets, is NOT YET SHOWN: it can be shown only once the job exists.
- R7: a stand-in client that passes calls through.
- R8, shown by hand: `npm run check:columns` given a copy of `columns.json` with one label
  changed reported 1 difference and ended with an error.

## Exceptions of the rules used

Temporary folders in the Windows temp folder, each deleted: one for the four files, one for
the two source files read through `git show`, one for the R8 copy, and the self-test's
repositories. git's safe.directory list was not changed.

## Not built

The daily job and its schedule, the page, `public\data\`, and the reference files of
`public\geo\`.

## What comes next

The daily job, from a prompt Joe will bring.

## Worth knowing

- The client's 60-request limit counts every request one script sends, retries included.
- Field 325 "Send people to training" holds the word "people", and a first version of the
  choice-withholding rule in `job\quickbase-columns.mjs` withheld its choices. The rule now
  looks at whole labels; its choices are written.
- The 7 contacts with no name, the 6 with neither a phone nor an email, and the 7 installers
  outside CONFIRMED BY PARTNER with a "Last confirmed" date were not re-read in this run.
