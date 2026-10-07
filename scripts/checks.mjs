/**
 * The checks of group R in docs\ACCEPTANCE.md, R1 to R7. R8 reads QuickBase and is in
 * scripts\check-columns.mjs. Also J19 of group J (a hand edit to public\data is caught), and
 * checkWorkflow, the one shape .github\workflows\daily-data.yml may have, which
 * npm run check:job runs.
 *
 * Each check returns { id, ok, why } and never throws: when it cannot tell, it returns ok
 * false and says why. Each takes what it checks as an argument (a folder, a list of paths, a
 * text, a list of files, a client maker), so that scripts\check-selftest.mjs can hand it sound
 * and broken input without touching this repository, the real key or QuickBase.
 *
 * Nothing a check returns holds a value it found: a hit is named by file and line only.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Refused, TABLES, REALM, APP_ID, DAVE_TABLE } from '../job/lib/quickbase.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ORIGIN = 'https://github.com/INFINIUM-Wall-Systems/infinium-installer-index.git';
/** A git command that talks to GitHub fails rather than ask anyone to sign in. */
export const NO_SIGN_IN = { GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };

export function git(dir, args, { input, env } = {}) {
  const r = spawnSync('git', ['-C', dir, ...args], { input, env: { ...process.env, ...(env || {}) }, maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw r.error;
  return { code: r.status, out: r.stdout ? r.stdout.toString('utf8') : '', raw: r.stdout };
}

const result = (id, ok, why) => ({ id, ok, why });
async function guarded(id, f) {
  try {
    return await f();
  } catch (e) {
    return result(id, false, `could not tell: ${String((e && e.message) || e).split('\n')[0]}`);
  }
}

/* ===================================================================== R1 */

/** The tip of main on GitHub, as git ls-remote reports it, or null when GitHub has no main. */
export function lsRemoteMain(dir) {
  const r = git(dir, ['ls-remote', 'origin', 'refs/heads/main'], { env: NO_SIGN_IN });
  if (r.code !== 0) throw new Error(`git ls-remote ended with exit code ${r.code}`);
  const line = r.out.split('\n').find((l) => l.endsWith('\trefs/heads/main'));
  return line ? line.split('\t')[0] : null;
}

/**
 * R1: a git repository whose origin is the repository's address, and whose first commit is on
 * GitHub: GitHub's main is that commit or a later one. A later local commit not yet pushed
 * does not fail it.
 */
export function checkR1(dir = ROOT, lsRemote = lsRemoteMain) {
  return guarded('R1', () => {
    if (git(dir, ['rev-parse', '--git-dir']).code !== 0) return result('R1', false, 'not a git repository');
    const origin = git(dir, ['remote', 'get-url', 'origin']);
    if (origin.code !== 0) return result('R1', false, 'there is no origin');
    if (origin.out.trim() !== ORIGIN) return result('R1', false, 'origin is not the address of the GitHub repository');
    const roots = git(dir, ['rev-list', '--max-parents=0', 'HEAD']);
    const first = roots.code === 0 ? roots.out.trim().split('\n').filter(Boolean) : [];
    if (!first.length) return result('R1', false, 'the repository has no commit');
    if (first.length > 1) return result('R1', false, 'the history has more than one first commit');
    const tip = lsRemote(dir);
    if (!tip) return result('R1', false, 'GitHub has no main branch');
    if (git(dir, ['cat-file', '-e', `${tip}^{commit}`]).code !== 0) return result('R1', false, "GitHub's main is not in this repository: pull first");
    if (tip !== first[0] && git(dir, ['merge-base', '--is-ancestor', first[0], tip]).code !== 0) {
      return result('R1', false, "the first commit is not in GitHub's main");
    }
    return result('R1', true, 'origin is the GitHub repository, and the first commit is on GitHub');
  });
}

/* ===================================================================== R2 */

/** Section 3.4 of docs\SPEC.md, read with the notes at the top of both governing documents. */
export const REQUIRED_FILES = ['CLAUDE.md', 'README.md', 'package.json', 'docs/SPEC.md', 'docs/ACCEPTANCE.md',
  'docs/HANDOFF.md', 'docs/quickbase/columns.json'];
export const REQUIRED_FOLDERS = ['.github/workflows', 'docs/quickbase', 'job', 'public/js', 'public/css',
  'public/vendor', 'public/geo', 'scripts'];
export const TOP_LEVEL = ['CLAUDE.md', 'README.md', 'package.json', '.github', 'docs', 'job', 'public', 'scripts',
  '.gitignore', '.gitattributes'];

/** Every path git tracks or has staged. */
export function trackedPaths(dir = ROOT) {
  const r = git(dir, ['ls-files', '-z', '--cached']);
  if (r.code !== 0) throw new Error(`git ls-files ended with exit code ${r.code}`);
  return r.out.split('\0').filter(Boolean);
}

/** R2: the folders and files of section 3.4 are there, and git tracks nothing else at the top level or under review-screens. */
export function checkR2(paths) {
  return guarded('R2', () => {
    const problems = [];
    for (const f of REQUIRED_FILES) if (!paths.includes(f)) problems.push(`${f} is missing`);
    for (const d of REQUIRED_FOLDERS) if (!paths.some((p) => p.startsWith(`${d}/`))) problems.push(`nothing is tracked in ${d}/`);
    for (const t of [...new Set(paths.map((p) => p.split('/')[0]))]) {
      if (t !== 'review-screens' && !TOP_LEVEL.includes(t)) problems.push(`unexpected at the top level: ${t}`);
    }
    if (paths.some((p) => p.startsWith('review-screens/'))) problems.push('a file under review-screens/ is tracked');
    return problems.length ? result('R2', false, problems.join('; '))
      : result('R2', true, `${paths.length} tracked files; the folders and files of section 3.4 are there`);
  });
}

/* ===================================================================== R3 */

export const STOP_LIST = [
  'Any call that writes to QuickBase.',
  'Any QuickBase call to a table other than the three installer tables.',
  'Opening, printing, copying or committing the QuickBase key, or any `.env` file.',
  'Creating, linking or changing a project on any host, or its settings.',
  "Changing the GitHub repository's settings or its stored keys.",
  'Editing a file under `public\\data\\` by hand.',
  'Any remote other than origin, a force push, or deleting a branch on GitHub.',
  'Writing anything outside the repository folder.',
  'Sending email by any path.',
];
export const DATA_RULES = [
  '`public\\data\\` holds real installer records.',
  'On the laptop the job never writes `public\\data\\`. A run there puts its files in a temporary folder, checks them, and deletes them. Only a run on GitHub\'s scheduler writes `public\\data\\` and commits it.',
  'A temporary folder that holds real installer records is deleted before the work ends, and the report says so.',
  'Everything else in the repository uses made-up installers',
  'A made-up installer id starts with `FAKE-`.',
  'A made-up email address ends in `@example.com`.',
  'A made-up phone number has `555-01` in the middle',
  'It never carries a company, a person, an email, a phone, a rate or an installer id.',
  'Nothing a script prints, to the screen or to a log, holds installer data or the key.',
];

function section(text, heading) {
  const lines = text.replace(/\r/g, '').split('\n');
  const at = lines.indexOf(`## ${heading}`);
  if (at < 0) return null;
  const end = lines.findIndex((l, i) => i > at && l.startsWith('## '));
  return lines.slice(at + 1, end < 0 ? undefined : end).join('\n');
}

/** R3: CLAUDE.md holds the nine stop-list items and the data rules, and names the two governing documents. */
export function checkR3(text) {
  return guarded('R3', () => {
    const problems = [];
    const stop = section(text, 'Stop list');
    if (stop === null) problems.push('there is no "Stop list" section');
    else STOP_LIST.forEach((item, i) => {
      if (!stop.split('\n').some((l) => l.startsWith(`${i + 1}. ${item}`))) problems.push(`stop-list item ${i + 1} is missing`);
    });
    const data = section(text, 'Data rules');
    if (data === null) problems.push('there is no "Data rules" section');
    else {
      const flat = data.replace(/\s+/g, ' ');
      DATA_RULES.forEach((rule, i) => { if (!flat.includes(rule)) problems.push(`data rule ${i + 1} is missing`); });
    }
    const gov = section(text, 'The two governing documents');
    if (gov === null) problems.push('there is no "The two governing documents" section');
    else for (const d of ['`docs\\SPEC.md`', '`docs\\ACCEPTANCE.md`']) if (!gov.includes(d)) problems.push(`${d} is not named as a governing document`);
    return problems.length ? result('R3', false, problems.join('; '))
      : result('R3', true, 'the nine stop-list items, the data rules, and docs\\SPEC.md and docs\\ACCEPTANCE.md as the governing documents');
  });
}

/* ===================================================================== R4 */

/** Whether git would ignore `name` in `dir`. The file need not exist. */
export function isIgnored(dir, name) {
  const r = git(dir, ['check-ignore', '-q', '--no-index', name]);
  if (r.code !== 0 && r.code !== 1) throw new Error(`git check-ignore ended with exit code ${r.code}`);
  return r.code === 0;
}

/** R4: a file placed in review-screens\ is ignored by git. */
export function checkR4(dir = ROOT) {
  return guarded('R4', () => (isIgnored(dir, 'review-screens/probe.png')
    ? result('R4', true, 'a file placed in review-screens/ is ignored')
    : result('R4', false, 'a file placed in review-screens/ would be committed')));
}

/* ===================================================================== R5 */

export const SCAN_PATTERNS = [
  { kind: 'an installer id', re: /(?<!FAKE-)INS-[A-Za-z0-9]/g, allowed: () => false },
  { kind: 'an email address', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
    allowed: (m) => /@example\.com$/i.test(m) },
  { kind: 'a phone number', re: /(?<![\w.])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}(?!\w)/g,
    allowed: (m) => { const d = m.replace(/\D/g, '').slice(-10); return d.slice(3, 6) === '555' && d.slice(6, 8) === '01'; } },
];

/** The short list of exact strings R5 lets through, each with its reason. */
export function loadAllowed(dir = ROOT) {
  return JSON.parse(readFileSync(resolve(dir, 'scripts', 'r5-allowed.json'), 'utf8')).allowed;
}

/** Every file git tracks or has staged, as git has it in the index: [{ path, text }]. */
export function trackedFiles(dir = ROOT) {
  const ls = git(dir, ['ls-files', '-s', '-z']);
  if (ls.code !== 0) throw new Error(`git ls-files ended with exit code ${ls.code}`);
  const entries = ls.out.split('\0').filter(Boolean).map((l) => {
    const tab = l.indexOf('\t');
    return { sha: l.slice(0, tab).split(' ')[1], path: l.slice(tab + 1) };
  });
  if (!entries.length) return [];
  const r = git(dir, ['cat-file', '--batch'], { input: `${entries.map((e) => e.sha).join('\n')}\n` });
  if (r.code !== 0) throw new Error(`git cat-file ended with exit code ${r.code}`);
  const buf = r.raw;
  let at = 0;
  return entries.map((e) => {
    const nl = buf.indexOf(10, at);
    const size = Number(buf.subarray(at, nl).toString('utf8').split(' ')[2]);
    const text = buf.subarray(nl + 1, nl + 1 + size).toString('utf8');
    at = nl + 1 + size + 1;
    return { path: e.path, text };
  });
}

/** R5: outside public/data/, no file holds an installer id, an email address or a phone number. */
export function checkR5(files, allowed = []) {
  return guarded('R5', () => {
    const exact = new Set(allowed.map((a) => a.text));
    const hits = [];
    let scanned = 0;
    for (const f of files) {
      if (f.path.startsWith('public/data/')) continue;
      scanned++;
      f.text.split('\n').forEach((line, i) => {
        for (const p of SCAN_PATTERNS) {
          for (const m of line.matchAll(p.re)) if (!p.allowed(m[0]) && !exact.has(m[0])) hits.push(`${f.path}:${i + 1} (${p.kind})`);
        }
      });
    }
    return hits.length ? result('R5', false, `${hits.length} hit(s): ${hits.slice(0, 20).join('; ')}`)
      : result('R5', true, `${scanned} files scanned; no installer id, email address or phone number`);
  });
}

/* ===================================================================== R6 */

export const TOKEN_SHAPES = [
  /\b[a-z0-9]{6}_[a-z0-9]{3,5}_[a-z0-9]{1,3}_[a-z0-9]{20,}\b/i,
  /QB-USER-TOKEN\s+[A-Za-z0-9_]{20,}/,
];

/**
 * R6, the repository half: no file named .env* is tracked or staged, git ignores such a file,
 * no file holds a string shaped like a QuickBase user token, and, when `key` is given, no file
 * holds the key. The key is compared in memory and never printed.
 */
export function checkR6({ paths, files, ignored, key }) {
  return guarded('R6', () => {
    const problems = [];
    const named = paths.filter((p) => basename(p).startsWith('.env'));
    if (named.length) problems.push(`${named.length} tracked or staged file(s) named .env*: ${named.join(', ')}`);
    for (const name of ['.env', '.env.local', 'job/.env.test']) if (!ignored(name)) problems.push(`git would not ignore ${name}`);
    for (const f of files) {
      f.text.split('\n').forEach((line, i) => {
        if (TOKEN_SHAPES.some((re) => re.test(line))) problems.push(`${f.path}:${i + 1} holds a token-shaped string`);
      });
    }
    if (key) for (const f of files) if (f.text.includes(key)) problems.push(`${f.path} holds the QuickBase key`);
    return problems.length ? result('R6', false, problems.join('; '))
      : result('R6', true, key ? 'the key was compared in memory and is in no file' : 'the key could not be loaded here, so that clause was not run');
  });
}

/* ===================================================================== R7 */

/**
 * R7: a client made by `makeClientFn` with a made-up key and a counting stand-in for fetch
 * refuses a write, Dave's table and a table that is not one of the three, and the stand-in
 * counts no call.
 */
export function checkR7(makeClientFn) {
  return guarded('R7', async () => {
    let sent = 0;
    const standIn = async () => { sent++; return new Response('{}', { status: 200 }); };
    const client = makeClientFn({ realm: REALM, appId: APP_ID, token: ['made', 'up', 'key'].join('-'), fetch: standIn,
      sleep: async () => {}, now: () => 0 });
    const asks = [
      ['a record write (POST /v1/records)', () => client.send('POST', 'https://api.quickbase.com/v1/records', { json: { to: TABLES.MASTER, data: [] } })],
      [`a read of Dave's table ${DAVE_TABLE}`, () => client.getFields(DAVE_TABLE)],
      ['a read of a table that is not one of the three', () => client.getFields('bwzzzzzzz')],
    ];
    const through = [];
    for (const [what, ask] of asks) {
      try {
        await ask();
        through.push(what);
      } catch (e) {
        if (!(e instanceof Refused)) through.push(`${what} (failed, but not refused)`);
      }
    }
    if (through.length || sent) {
      return result('R7', false, `${through.length ? `not refused: ${through.join('; ')}. ` : ''}${sent} request(s) reached the stand-in`);
    }
    return result('R7', true, "a write, Dave's table and another table were each refused, and no request was sent");
  });
}

/* ==================================================================== J19 */

/**
 * J19: only the job changes public/data. It passes when public/data is not there and git
 * tracks nothing under it. Otherwise it fails when git shows a changed, staged or untracked
 * file under public/data, or when installers.json or territory.json no longer matches its
 * fingerprint in build.json. It names files, never what they hold.
 */
export function checkJ19(dir = ROOT) {
  return guarded('J19', () => {
    const status = git(dir, ['status', '--porcelain=v1', '--untracked-files=all', '--', 'public/data']);
    if (status.code !== 0) throw new Error(`git status ended with exit code ${status.code}`);
    const changed = status.out.split('\n').filter(Boolean).length;
    const data = resolve(dir, 'public', 'data');
    if (!existsSync(data)) {
      return changed ? result('J19', false, `public/data is not there, and git shows ${changed} change(s) under it`)
        : result('J19', true, 'public/data is not there yet: nothing to compare');
    }
    const problems = [];
    if (changed) problems.push(`git shows ${changed} changed, staged or untracked file(s) under public/data`);
    let files = null;
    try {
      files = JSON.parse(readFileSync(resolve(data, 'build.json'), 'utf8')).files;
    } catch {
      problems.push('public/data/build.json is missing or cannot be read');
    }
    if (files) {
      for (const name of ['installers.json', 'territory.json']) {
        const path = resolve(data, name);
        if (!existsSync(path)) { problems.push(`public/data/${name} is missing`); continue; }
        const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
        if (sha !== files[name]) problems.push(`public/data/${name} does not match its fingerprint in build.json`);
      }
    }
    return problems.length ? result('J19', false, problems.join('; '))
      : result('J19', true, 'public/data matches the fingerprints in build.json, and git shows no change under it');
  });
}

/* ========================================================= the workflow file */

/** The bot's address, put together when the check runs, so that the workflow file is the only file holding it. */
const BOT_ADDRESS = ['41898282+github-actions', '[bot]@users.noreply.github.com'].join('');

/**
 * The one shape .github/workflows/daily-data.yml may have, line by line, comments and blank
 * lines aside: started by hand only, with one box to tick; contents: write and no other
 * permission; ubuntu-latest, never two at once, at most 10 minutes; actions/checkout@v6 and
 * actions/setup-node@v6 on Node 22 and no other action; the tests, then the job, then
 * public/data staged and committed as github-actions[bot] and pushed, with no force.
 */
export const WORKFLOW_SHAPE = [
  'name: Daily data',
  'on:',
  '  workflow_dispatch:',
  '    inputs:',
  '      skip_count_guard:',
  '        description: Skip the count guard for this one run, when a count has really fallen',
  '        type: boolean',
  '        default: false',
  'permissions:',
  '  contents: write',
  'concurrency:',
  '  group: daily-data',
  '  cancel-in-progress: false',
  'jobs:',
  '  refresh:',
  '    runs-on: ubuntu-latest',
  '    timeout-minutes: 10',
  '    steps:',
  '      - name: Check the repository out',
  '        uses: actions/checkout@v6',
  '      - name: Set up Node 22',
  '        uses: actions/setup-node@v6',
  '        with:',
  '          node-version: 22',
  '      - name: Tests with made-up installers',
  '        run: npm run check:job',
  '      - name: Run the job',
  "        run: node job/run.mjs --publish ${{ inputs.skip_count_guard && '--skip-count-guard' || '' }}",
  '        env:',
  '          QB_USER_TOKEN: ${{ secrets.QB_USER_TOKEN }}',
  '          QB_REALM_HOSTNAME: infiniumwalls.quickbase.com',
  '          QB_APP_ID: bpkqi6uif',
  '      - name: Save the data files',
  '        run: |',
  '          git add -- public/data',
  '          if git diff --cached --quiet; then',
  '            echo "Nothing changed in public/data, so there is nothing to commit."',
  '            exit 0',
  '          fi',
  `          git -c user.name="github-actions[bot]" -c user.email="${BOT_ADDRESS}" commit -q -m "Daily data refresh"`,
  '          git push origin HEAD:main',
];

/** The workflow file has the one shape it is allowed, comments and blank lines aside. */
export function checkWorkflow(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim() && !l.trim().startsWith('#'));
  const n = Math.max(lines.length, WORKFLOW_SHAPE.length);
  for (let i = 0; i < n; i++) {
    if (lines[i] !== WORKFLOW_SHAPE[i]) {
      const where = i >= lines.length ? `line ${i + 1} of the shape is missing` : i >= WORKFLOW_SHAPE.length ? `line ${i + 1} is more than the shape allows` : `line ${i + 1} differs from the shape`;
      return result('workflow', false, `${where} (comments and blank lines aside)`);
    }
  }
  return result('workflow', true, `${lines.length} lines, the one shape allowed: started by hand only, contents: write, two actions, public/data alone staged`);
}
