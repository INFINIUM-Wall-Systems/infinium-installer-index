/**
 * npm run check:selftest: shows each of checks R1 to R7 and J19 (scripts\checks.mjs) passing on
 * sound input and failing on broken input, so that a check that always passes, or always fails,
 * is caught. Where a check has more than one clause, each clause has its own broken case, and
 * the case also asks that the failure names that clause.
 *
 * It then runs every test of the job (scripts\job-tests.mjs): each passing on its sound cases
 * and failing on each broken input or broken stand-in. npm run check:job runs the sound cases
 * alone.
 *
 * It works on temporary git repositories and folders in the system temp folder, deleted at the
 * end, and on values held in memory. It never changes this repository, never loads the real
 * QuickBase key and never reaches QuickBase: fetch is replaced by a stand-in that refuses every
 * call. Strings git must not track, such as a real-looking installer id, are put together when
 * it runs.
 *
 * R8 reads QuickBase, so its failing case is shown by hand: npm run check:columns given a copy
 * of docs\quickbase\columns.json with one label changed.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as C from './checks.mjs';
import { makeClient } from '../job/lib/quickbase.mjs';
import { TESTS } from './job-tests.mjs';
import { removeTemps } from './job-standins.mjs';

globalThis.fetch = async () => { throw new Error('the self-test never reaches the network'); };

const temps = [];
function tempDir(tag) {
  const d = mkdtempSync(join(tmpdir(), `installer-index-selftest-${tag}-`));
  temps.push(d);
  return d;
}
function g(dir, ...args) {
  const r = C.git(dir, args);
  if (r.code !== 0) throw new Error(`git ${args.filter((a) => !a.includes('=')).join(' ')} failed in a temporary repository`);
  return r.out.trim();
}
const commit = (dir, message) => g(dir, '-c', 'user.name=Selftest', '-c', 'user.email=selftest@example.com',
  'commit', '-q', '--allow-empty', '-m', message);
function tempRepo(tag, { origin = C.ORIGIN, commits = 1, gitignore } = {}) {
  const d = tempDir(tag);
  g(d, 'init', '-q', '-b', 'main');
  if (origin) g(d, 'remote', 'add', 'origin', origin);
  if (gitignore !== undefined) writeFileSync(join(d, '.gitignore'), gitignore);
  for (let i = 0; i < commits; i++) commit(d, `selftest ${i + 1}`);
  return d;
}

const cases = [];
/** Record one case. A broken case can also ask that the reason names the clause it broke. */
function expect(id, label, wantPass, r, mustSay = null) {
  const right = r.ok === wantPass && (!mustSay || r.why.includes(mustSay));
  cases.push({ id, label, wantPass, got: r.ok, right, why: r.why, mustSay });
}

/* The listing section 3.4 of docs\SPEC.md draws, as a repository would track it. */
const CANON = ['.gitattributes', '.gitignore', 'CLAUDE.md', 'README.md', 'package.json', '.github/workflows/daily-data.yml',
  'docs/SPEC.md', 'docs/ACCEPTANCE.md', 'docs/HANDOFF.md', 'docs/quickbase/columns.json', 'job/quickbase-columns.mjs',
  'job/run.mjs', 'job/lib/quickbase.mjs', 'public/js/.gitkeep', 'public/css/.gitkeep', 'public/vendor/.gitkeep',
  'public/geo/counties.json', 'scripts/checks.mjs', 'scripts/fixtures/installers.json'];
const DATA = ['public/data/installers.json', 'public/data/territory.json', 'public/data/build.json'];

try {
  /* R1 */
  {
    const d = tempRepo('r1-sound');
    const head = g(d, 'rev-parse', 'HEAD');
    expect('R1', 'sound: one commit, the right origin, GitHub at that commit', true, await C.checkR1(d, () => head));
  }
  {
    const d = tempRepo('r1-later');
    const first = g(d, 'rev-parse', 'HEAD');
    commit(d, 'selftest later, not pushed');
    expect('R1', 'sound: a later commit not pushed yet', true, await C.checkR1(d, () => first));
  }
  {
    const d = tempRepo('r1-origin', { origin: 'https://github.com/INFINIUM-Wall-Systems/some-other-repository.git' });
    const head = g(d, 'rev-parse', 'HEAD');
    expect('R1', 'a different origin address', false, await C.checkR1(d, () => head), 'origin');
  }
  {
    const d = tempRepo('r1-empty', { commits: 0 });
    expect('R1', 'a repository with no commit', false, await C.checkR1(d, () => null), 'no commit');
  }
  {
    const d = tempRepo('r1-notheld');
    g(d, 'checkout', '-q', '--orphan', 'unrelated');
    commit(d, 'selftest unrelated');
    const other = g(d, 'rev-parse', 'HEAD');
    g(d, 'checkout', '-q', 'main');
    expect('R1', 'a remote answer that does not hold the first commit', false, await C.checkR1(d, () => other), 'not in GitHub');
  }
  {
    const d = tempRepo('r1-pull');
    expect('R1', "GitHub's main is not in the local repository", false, await C.checkR1(d, () => 'f'.repeat(40)), 'pull first');
  }
  {
    const d = tempRepo('r1-nomain');
    expect('R1', 'GitHub has no main branch', false, await C.checkR1(d, () => null), 'no main');
  }

  /* R2 */
  expect('R2', 'sound: the listing section 3.4 draws', true, await C.checkR2(CANON));
  expect('R2', 'sound: the same, with public/data as the job writes it', true, await C.checkR2([...CANON, ...DATA]));
  expect('R2', 'a required file missing (docs/HANDOFF.md)', false, await C.checkR2(CANON.filter((p) => p !== 'docs/HANDOFF.md')), 'docs/HANDOFF.md is missing');
  expect('R2', 'a required folder with nothing tracked (public/geo)', false, await C.checkR2(CANON.filter((p) => p !== 'public/geo/counties.json')), 'public/geo/');
  expect('R2', 'a required folder with nothing tracked (.github/workflows), public/data there', false,
    await C.checkR2([...CANON, ...DATA].filter((p) => p !== '.github/workflows/daily-data.yml')), '.github/workflows/');
  expect('R2', 'an unexpected file at the top level', false, await C.checkR2([...CANON, 'notes.txt']), 'unexpected at the top level');
  expect('R2', 'a tracked file under review-screens', false, await C.checkR2([...CANON, 'review-screens/home.png']), 'review-screens/ is tracked');

  /* R3 */
  const claude = readFileSync(resolve(C.ROOT, 'CLAUDE.md'), 'utf8');
  expect('R3', 'sound: CLAUDE.md as it is', true, await C.checkR3(claude));
  expect('R3', 'a copy with stop-list item 5 removed', false,
    await C.checkR3(claude.split('\n').filter((l) => !l.startsWith('5. ')).join('\n')), 'stop-list item 5');
  expect('R3', 'a copy that does not name docs\\SPEC.md', false,
    await C.checkR3(claude.split('`docs\\SPEC.md`').join('`docs\\OTHER.md`')), 'docs\\SPEC.md');
  expect('R3', 'a copy with a data rule removed', false,
    await C.checkR3(claude.split('\n').filter((l) => !l.includes('`FAKE-`')).join('\n')), 'data rule');
  expect('R3', 'a copy without the rule that the laptop never writes public\\data', false,
    await C.checkR3(claude.split('\n').filter((l) => !l.startsWith('- On the laptop the job never writes')).join('\n')), 'data rule 2');
  expect('R3', 'a copy without the rule that a temporary folder of real records is deleted', false,
    await C.checkR3(claude.split('\n').filter((l) => !l.startsWith('- A temporary folder that holds real installer records')).join('\n')), 'data rule 3');

  /* R4 */
  const gitignore = readFileSync(resolve(C.ROOT, '.gitignore'), 'utf8');
  const withoutLine = (start) => gitignore.split('\n').filter((l) => !l.startsWith(start)).join('\n');
  expect('R4', 'sound: a repository with this .gitignore', true,
    await C.checkR4(tempRepo('r4-sound', { origin: null, commits: 0, gitignore })));
  expect('R4', 'a .gitignore without the review-screens line', false,
    await C.checkR4(tempRepo('r4-broken', { origin: null, commits: 0, gitignore: withoutLine('review-screens') })), 'would be committed');

  /* R5 */
  const allowed = C.loadAllowed(C.ROOT);
  const real = C.trackedFiles(C.ROOT);
  const sample = { path: 'docs/sample.md', text: 'Made up: FAKE-001, pat@example.com, 216-555-0142.\n' };
  expect('R5', 'sound: the tracked files, plus made-up values of all three kinds', true, await C.checkR5([...real, sample], allowed));
  const planted = {
    'an installer id': ['IN', 'S-', '04', '2'].join(''),
    'an email address': ['pat.jones', ['acme-installs', 'com'].join('.')].join('@'),
    'a phone number': ['216', '867', '5309'].join('-'),
  };
  for (const [what, value] of Object.entries(planted)) {
    const r = await C.checkR5([...real, sample, { path: 'docs/planted.md', text: `line one\nPlanted: ${value}\n` }], allowed);
    expect('R5', `a planted line holding ${what}`, false, r, 'docs/planted.md:2');
    if (r.why.includes(value)) cases.push({ id: 'R5', label: `the planted ${what} was printed`, wantPass: true, got: false, right: false, why: 'a value reached the output' });
  }

  /* R6 */
  const fakeKey = ['made', 'up', 'key', 'for', 'tests', '7f3k'].join('-');
  const ignoreOk = tempRepo('r6-ignore', { origin: null, commits: 0, gitignore });
  const ignoreBad = tempRepo('r6-noignore', { origin: null, commits: 0, gitignore: withoutLine('.env') });
  const base = { paths: CANON, files: [...real, sample], ignored: (n) => C.isIgnored(ignoreOk, n), key: fakeKey };
  expect('R6', 'sound: nothing named .env, .env ignored, no token, a made-up key held in memory', true, await C.checkR6(base));
  const token = ['k3j9xq', 'ab12', '0', 'q7w8e9r0t1y2u3i4o5p6a7s8'].join('_');
  expect('R6', 'a made-up token-shaped string planted', false,
    await C.checkR6({ ...base, files: [...base.files, { path: 'docs/planted.md', text: `x\n${token}\n` }] }), 'token-shaped');
  const r6key = await C.checkR6({ ...base, files: [...base.files, { path: 'job/planted.mjs', text: `const k = '${fakeKey}';\n` }] });
  expect('R6', 'a made-up key held in memory, the same key planted in a file', false, r6key, 'holds the QuickBase key');
  if (r6key.why.includes(fakeKey)) cases.push({ id: 'R6', label: 'the planted key was printed', wantPass: true, got: false, right: false, why: 'the key reached the output' });
  expect('R6', 'a tracked file named .env.local', false, await C.checkR6({ ...base, paths: [...CANON, '.env.local'] }), 'named .env');
  expect('R6', 'a .gitignore without the .env* line', false,
    await C.checkR6({ ...base, ignored: (n) => C.isIgnored(ignoreBad, n) }), 'would not ignore');

  /* R7 */
  expect('R7', 'sound: the real client, a made-up key and a counting stand-in', true, await C.checkR7(makeClient));
  const passThrough = (opts) => ({
    send: (method, url) => opts.fetch(url, { method }),
    getFields: (id) => opts.fetch(`https://api.quickbase.com/v1/fields?tableId=${id}`, { method: 'GET' }),
  });
  expect('R7', 'a stand-in client that passes every call through', false, await C.checkR7(passThrough), 'reached the stand-in');

  /* J19, in a temporary repository with made-up data files */
  {
    const d = tempRepo('j19', { origin: null, commits: 0, gitignore });
    writeFileSync(join(d, '.gitattributes'), '* text=auto eol=lf\n');
    g(d, 'add', '--', '.gitignore', '.gitattributes');
    commit(d, 'selftest: the rules');
    expect('J19', 'sound: public/data is not there', true, await C.checkJ19(d));
    const sha = (t) => createHash('sha256').update(t).digest('hex');
    const installers = '{"schema":1,"installers":[\n{"id":"FAKE-001","company":"Made-up Walls","contacts":[],"row":{"gap":"both"}}\n]}\n';
    const territory = '{"schema":1,"states":[\n]}\n';
    const build = `${JSON.stringify({ schema: 1, files: { 'installers.json': sha(installers), 'territory.json': sha(territory) } }, null, 2)}\n`;
    const data = join(d, 'public', 'data');
    const put = (name, text) => writeFileSync(join(data, name), text);
    mkdirSync(data, { recursive: true });
    put('installers.json', installers);
    put('territory.json', territory);
    put('build.json', build);
    g(d, 'add', '--', 'public/data');
    commit(d, 'selftest: the job wrote public/data');
    expect('J19', 'sound: public/data as the job wrote and committed it', true, await C.checkJ19(d));
    put('installers.json', installers.replace('Made-up Walls', 'Made-up Walls Inc'));
    expect('J19', 'a hand edit to installers.json, not staged: the fingerprint', false, await C.checkJ19(d), 'installers.json does not match its fingerprint');
    expect('J19', 'a hand edit to installers.json, not staged: git', false, await C.checkJ19(d), 'git shows 1 changed');
    g(d, 'add', '--', 'public/data');
    expect('J19', 'the same hand edit, staged', false, await C.checkJ19(d), 'git shows 1 changed, staged');
    commit(d, 'selftest: a hand edit committed');
    expect('J19', 'the same hand edit, committed, so git is clean: the fingerprint alone', false, await C.checkJ19(d), 'installers.json does not match its fingerprint');
    put('installers.json', installers);
    g(d, 'add', '--', 'public/data');
    commit(d, 'selftest: put back');
    expect('J19', 'sound: put back as the job wrote it', true, await C.checkJ19(d));
    put('notes.txt', 'made up\n');
    expect('J19', 'an untracked file under public/data', false, await C.checkJ19(d), 'git shows 1 changed, staged or untracked');
    rmSync(join(data, 'notes.txt'));
    put('territory.json', territory.replace('[\n]', '[\n{"state":"OH","country":"US","counties":[]}\n]'));
    expect('J19', 'a hand edit to territory.json', false, await C.checkJ19(d), 'territory.json does not match its fingerprint');
  }

  /* The job's tests: each passing on its sound cases and failing on each broken one */
  for (const t of TESTS) {
    for (const [cs, want] of [[t.sound, true], [t.broken, false]]) {
      for (const c of cs) {
        let r;
        try { r = await c.run(); } catch (e) { r = { ok: false, why: `stopped: ${e && e.constructor ? e.constructor.name : 'error'}: ${e && e.message}` }; }
        expect(`job ${t.line}`, `${t.label}: ${want ? 'sound' : 'broken'}: ${c.label}`, want, r);
      }
    }
  }
} catch (e) {
  cases.push({ id: 'selftest', label: 'the self-test itself', wantPass: true, got: false, right: false, why: `stopped: ${e.message}` });
} finally {
  for (const d of temps) {
    try { rmSync(d, { recursive: true, force: true, maxRetries: 3 }); } catch { /* reported below */ }
  }
  for (const d of removeTemps()) temps.push(d);
}

for (const c of cases) {
  console.log(`${c.right ? 'ok ' : 'BAD'} ${c.id} ${c.label}: ${c.got ? 'PASS' : 'FAIL'}, expected ${c.wantPass ? 'PASS' : 'FAIL'}`
    + `${c.mustSay && !c.right && c.got === c.wantPass ? ` (the reason does not name "${c.mustSay}")` : ''}${c.right ? '' : ` — ${c.why}`}`);
}
const left = temps.filter((d) => existsSync(d));
if (left.length) console.log(`Temporary folders not deleted: ${left.join(', ')}`);
const bad = cases.filter((c) => !c.right);
const ids = [...new Set(cases.map((c) => c.id))].filter((id) => id !== 'selftest');
console.log(bad.length ? `check:selftest: ${bad.length} case(s) wrong` : `check:selftest: PASS, ${cases.length} cases, each of ${ids.join(', ')} shown passing and failing`);
process.exitCode = bad.length || left.length ? 1 : 0;
