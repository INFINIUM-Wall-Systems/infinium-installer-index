/**
 * npm run check: checks R1 to R7 of group R (docs\ACCEPTANCE.md), all seven every time. It
 * never calls QuickBase. R8 reads QuickBase and is npm run check:columns.
 *
 * Each check prints its id and PASS or FAIL. When one fails, the run still does the rest, then
 * ends with an error.
 *
 * R6 loads the QuickBase key, when it can, only to compare it in memory with the tracked files.
 * It is never printed.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, checkR1, checkR2, checkR3, checkR4, checkR5, checkR6, checkR7, trackedPaths, trackedFiles,
  isIgnored, loadAllowed } from './checks.mjs';
import { makeClient, readEnv, makeRedactor } from '../job/lib/quickbase.mjs';

let key = null;
try {
  const env = readEnv();
  if (!env.problem) key = env.token;
} catch {
  key = null;
}
const redact = makeRedactor([key]);
const say = (s) => console.log(redact(s));

let paths = [];
let files = [];
let listing = null;
try {
  paths = trackedPaths(ROOT);
  files = trackedFiles(ROOT);
} catch (e) {
  listing = `could not list the tracked files: ${e.message}`;
}
const fromListing = (f) => (listing ? Promise.resolve({ ok: false, why: listing }) : f());
const claude = (() => { try { return readFileSync(resolve(ROOT, 'CLAUDE.md'), 'utf8'); } catch { return ''; } })();
const allowed = (() => { try { return loadAllowed(ROOT); } catch { return null; } })();

const results = [
  await checkR1(ROOT),
  { id: 'R2', ...(await fromListing(() => checkR2(paths))) },
  await checkR3(claude),
  await checkR4(ROOT),
  { id: 'R5', ...(allowed === null ? { ok: false, why: 'scripts/r5-allowed.json could not be read' } : await fromListing(() => checkR5(files, allowed))) },
  { id: 'R6', ...(await fromListing(() => checkR6({ paths, files, ignored: (n) => isIgnored(ROOT, n), key }))) },
  await checkR7(makeClient),
];
for (const r of results) {
  say(`${r.id} ${r.ok ? 'PASS' : 'FAIL'}${r.id === 'R6' && r.ok ? ' (repository half)' : ''}: ${r.why}`);
  if (r.id === 'R6') say('R6 NOT YET SHOWN (GitHub half): the key read from the repository\'s secrets can be shown only once the job exists');
}
const failed = results.filter((r) => !r.ok).map((r) => r.id);
say(failed.length ? `check: ${failed.length} failed (${failed.join(', ')})` : 'check: R1 to R7 PASS');
process.exitCode = failed.length ? 1 : 0;
