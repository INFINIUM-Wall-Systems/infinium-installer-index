# INFINIUM Installer Index — Rules for Claude Code

Read this file in full at the start of every chat. Then read `docs\HANDOFF.md`.

## What this repository is

INFINIUM Installer Index is a read-only lookup for INFINIUM staff: who installs where, who
to call, what they charge, and how current each record is. It replaces the INFINIUM Partner
Finder page.

Once a day a job reads three QuickBase tables, checks what it read, and saves data files
into `public\data\`. The page in `public\` reads those files and never calls QuickBase.

## The two governing documents

- `docs\SPEC.md` says what is built.
- `docs\ACCEPTANCE.md` lists the checks the build must pass. A piece of work is done when
  every check in its group passes and Joe has seen the result.

Both are copies of documents Joe keeps outside this repository. Change neither one unless a
prompt from Joe carries the new text in full. If the two disagree with each other, or with
a prompt, stop and tell Joe. Do not pick one.

## Who does what

- Joe Lull is the architect and project manager. He is not a developer. Explain a technical
  tradeoff plainly and never dumb it down. Use plain English, and do not use a label of
  your own without saying what it means.
- Claude Code runs every command. Joe runs nothing. Never ask Joe to run a command.
- Joe types secrets into GitHub's or a host's settings himself, in his own browser. Never
  ask for a secret in a chat.
- Prompts come from Joe. Each one is complete on its own. Do the work it names, stop where
  it says to stop, and do not start the next piece of work.
- This work is tracked in FinishLine as `infinium-installer-index`. Joe's planning session
  records the checkpoints from your reports. Do not checkpoint FinishLine from a chat here
  unless a prompt says to.

## Every chat

- Start with `git pull`. Once the daily job exists it commits to `main` every day, and a
  working copy that has not pulled is behind.
- Never run two Claude Code chats in this repository at once.
- Commit and push to `origin main` as the work lands. Both are allowed without asking,
  because the stop list below is in force.
- End the work with one report. It carries counts, file names, column names and category
  labels, such as a record status or a contact role, and nothing else.
- If something you find contradicts a prompt or a governing document, do not fix it. Report
  it.

## Stop list

Each of these needs Joe's approval every time. Approval is Joe typing GO in the chat for
that one action. An earlier GO does not carry over to a later action.

1. Any call that writes to QuickBase.
2. Any QuickBase call to a table other than the three installer tables. Dave's table
   `bwcd37y2s` is never read, written or deleted.
3. Opening, printing, copying or committing the QuickBase key, or any `.env` file.
4. Creating, linking or changing a project on any host, or its settings.
5. Changing the GitHub repository's settings or its stored keys.
6. Editing a file under `public\data\` by hand. Only the job writes there.
7. Any remote other than origin, a force push, or deleting a branch on GitHub.
8. Writing anything outside the repository folder.
9. Sending email by any path.

Two standing exceptions to item 8:

- A check or a one-off script may make a temporary folder in the system temp directory,
  and deletes it when it is done.
- If git refuses to work in this folder because of "dubious ownership", adding this one
  folder to git's safe.directory list is allowed. Say so in the report.

## QuickBase

- Realm `infiniumwalls.quickbase.com`, app `bpkqi6uif`.
- The three installer tables: INFINIUM Installers MASTER `bwegbya6s`, INFINIUM Installers
  Contacts `bwegb3582`, INFINIUM Installers Territory `bwegb3vwv`.
- Reading those three tables through the read-only client in `job\lib\quickbase.mjs` is
  allowed. Joe authorized it on October 6, 2026.
- Use the REST interface. Stay under 100 calls in any 10 seconds.
- Access, roles, permissions and sharing in the QuickBase app belong to Dave. No script
  changes any of them.
- The key. On the P: drive a script reads it when it runs, from `.env.local` in the folder
  above this one. On GitHub the job reads it from the repository's secrets. It is never
  printed, logged or allowed into an error message.

## Data rules

- `public\data\` holds real installer records. Only the job writes there. Never edit those
  files by hand, and never print what they hold into a chat or a log.
- Everything else in the repository uses made-up installers: code, documents, tests,
  reports and commit messages.
  - A made-up installer id starts with `FAKE-`.
  - A made-up email address ends in `@example.com`.
  - A made-up phone number has `555-01` in the middle, such as `216-555-0142`.
- A report pasted into a chat carries counts, file names, column names and category labels.
  It never carries a company, a person, an email, a phone, a rate or an installer id.
- Nothing a script prints, to the screen or to a log, holds installer data or the key.
- Pictures for Joe go in `review-screens\`, which git ignores.

## The folders around this one

This repository sits inside `P:\IT\AI Initiatives\PartnerFinder (Installer Matrix)`, beside
other work.

- `installer-application\` is read only from here. It may have work in progress. Run no git
  command there that changes anything.
- `coverage-map\` and `current\` are read only. Run no git command of any kind inside
  `coverage-map`.
- `inventory-private\`, `_token-backups\` and every file whose name starts with `.env` are
  never opened.
- Search inside this repository only. Do not run a search across the parent folder.

## Not part of this work

- Protecting the test copy, sign-in, and who can see the test copy or its data. Joe ruled
  on October 6, 2026 that these are not part of this work and that he will say when data
  security is to be considered. Do not raise them and do not build for them.
- Editing installer records. The lookup only displays. Changes are made in QuickBase.

## How to build

- Node 22 or later. No packages: nothing is installed and `package.json` lists no
  dependencies. Ask Joe before adding one.
- A new check must be shown to fail when the thing it checks is broken. A check that cannot
  fail proves nothing.
- A check passes only when something shows it: a script that prints pass or fail, or a
  picture Joe opens.
- A test that needs a string git must not track, such as a real-looking installer id, puts
  the string together when it runs, so that no tracked file holds it.
- Text files use LF line endings and UTF-8 with no byte-order mark. Write files with a
  file-writing tool or with node, never with PowerShell redirection, which writes UTF-16.
- County ids are text and stay text. 318 of them begin with a zero.
- A host's own settings file is added when Joe sets that host up, not before.
