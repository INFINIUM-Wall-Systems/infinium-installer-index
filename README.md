# INFINIUM Installer Index

A read-only lookup for INFINIUM staff: who installs where, who to call, what they charge,
and how current each record is. It replaces the INFINIUM Partner Finder page at
`partnerfinder.infiniumiq.ai`.

**Status, October 6, 2026:** this repository has just been created. The daily job and the
page are not built yet. This file fills in as the build goes.

## How it works

```
QuickBase  -->  the job, run by   -->  data files saved  -->  the host         -->  the page
tables          GitHub's scheduler     into the repository    republishes
                once a day
```

- **QuickBase is the source of truth.** Installer records are changed there and nowhere
  else.
- **The job** is in `job\`. GitHub's scheduler (GitHub Actions) runs it once a day,
  overnight. It reads three QuickBase tables, checks what it read, and saves three data
  files into `public\data\`. If a check fails it saves nothing, and the page keeps showing
  the last good data.
- **The page** is plain files in `public\`. It has no build step and no server code. It
  holds no QuickBase key and never calls QuickBase.
- **A change in QuickBase shows the next morning.** A refresh can also be started by hand
  from the repository's Actions page.

## What a host needs to do

Serve the `public\` folder as it is, and republish when this repository changes. There is
nothing to install and nothing to build.

On the INFINIUM server the page sits behind Microsoft Entra sign-in, which is set up on
that server and not in this repository.

## What the job needs

- A QuickBase key, stored in this GitHub repository's secrets. It is in no file. The name
  of the secret is written here when the job is built.
- The QuickBase realm, `infiniumwalls.quickbase.com`, and the app id, `bpkqi6uif`. Neither
  is a secret.
- Read access to three tables: INFINIUM Installers MASTER `bwegbya6s`, INFINIUM Installers
  Contacts `bwegb3582` and INFINIUM Installers Territory `bwegb3vwv`. It never writes.
- Node 22 or later. No packages are installed.

## Folders

```
CLAUDE.md          rules for Claude Code, which builds this repository
README.md          this file
package.json       Node 22 or later; no packages to install
.github\workflows\ the daily schedule that runs the job
docs\              the specification, the acceptance checks, and the QuickBase column list
job\               the job: read QuickBase, check, write the data files
public\            the page, and in public\data\ the files the job writes
scripts\           checks
```

## Where to read more

- `docs\SPEC.md`: what is being built, view by view.
- `docs\ACCEPTANCE.md`: the checks each piece must pass.
- `docs\quickbase\columns.json`: every column of the three tables.

## Who to ask

Joe Lull, AI and Automation Engineer, INFINIUM Wall Systems.
