/**
 * The daily job, from start to finish: read, shape, check, write. Sections 3.5 to 3.7 of
 * docs\SPEC.md.
 *
 *   node job/run.mjs --out <folder> [--skip-count-guard]
 *     Writes the three files into <folder>, which must already exist, be empty, sit inside the
 *     system temp directory, and have a name that begins installer-index- or sit inside a
 *     folder that does. This is how the rehearsal on the laptop runs it. The job deletes
 *     nothing. There is never a last good run, so the count guard asks only for at least one
 *     installer.
 *   node job/run.mjs --publish [--skip-count-guard]
 *     Writes public\data, making the folder if it is not there. Refused unless the
 *     environment value GITHUB_ACTIONS is "true": this is how GitHub runs it. The last good
 *     run is the counts in the build.json already in public\data.
 *   --skip-count-guard leaves the count guard out for that one run; at least one installer is
 *   still asked for, and build.json writes skipped in place of passed for the first check.
 *
 * It reads the three tables' fields and works out check 7 before it asks for any record. It
 * compares the rows it read with QuickBase's own totals and stops if they differ. It shapes
 * everything in memory, twice (check 6), runs the seven checks, and only then writes. When a
 * check fails it writes nothing, names the check (number, name and counts), and ends with an
 * error.
 *
 * What it prints: the time, where the key came from, the counts, each check with pass or fail,
 * and each call by method and address with how many times. Nothing taken from a record, never
 * the key, and never an error's own text: an error is reported by its kind, the step it came
 * at and, for a QuickBase refusal, the status number.
 *
 * main is handed its environment values and the repository's folder, with no default for
 * either. Only the command-line start at the foot of this file reads the real environment.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { tmpdir as systemTmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keyFrom, makeClient, makeRedactor } from './lib/quickbase.mjs';
import { TABLE_ORDER } from './fields.mjs';
import { readFields, readRecords } from './read.mjs';
import { shape as realShape } from './shape.mjs';
import { CHECK_NAMES, checkColumns, checkCompanyAndStatus, checkCounties, checkCounts, checkParents, checkSameFiles,
  checkUniqueIds, guardCounts } from './checks.mjs';
import { writeFiles } from './write.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PREFIX = 'installer-index-';

export const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** A time as UTC to the second, as 2026-10-07T09:20:31Z. Never the machine's own clock zone. */
export function utcSecond(ms) {
  return new Date(ms - (((ms % 1000) + 1000) % 1000)).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** { out, publish, skipCountGuard } from the command line, or { problem }. */
export function parseArgs(args) {
  const got = { out: undefined, publish: false, skipCountGuard: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out') {
      if (got.out !== undefined) return { problem: '--out was given twice.' };
      const folder = args[i + 1];
      if (!folder || folder.startsWith('--')) return { problem: '--out needs a folder.' };
      got.out = folder;
      i++;
    } else if (a === '--publish') {
      if (got.publish) return { problem: '--publish was given twice.' };
      got.publish = true;
    } else if (a === '--skip-count-guard') {
      got.skipCountGuard = true;
    } else {
      return { problem: `unknown argument ${JSON.stringify(a)}.` };
    }
  }
  return got;
}

/** Where this run writes: { mode, folder, skipCountGuard }, or { problem }. */
export function chooseTarget({ args, env, root, tmpdir }) {
  const a = parseArgs(args);
  if (a.problem) return a;
  if (a.out === undefined && !a.publish) return { problem: 'say where to write: --out <folder> or --publish.' };
  if (a.out !== undefined && a.publish) return { problem: 'choose one of --out and --publish, not both.' };
  if (a.publish) {
    if (env.GITHUB_ACTIONS !== 'true') return { problem: '--publish writes public/data, and runs only on GitHub.' };
    return { mode: 'publish', folder: join(root, 'public', 'data'), skipCountGuard: a.skipCountGuard };
  }
  const folder = resolve(a.out);
  try {
    if (!statSync(folder).isDirectory()) return { problem: 'the --out folder is not a folder.' };
  } catch {
    return { problem: 'the --out folder does not exist.' };
  }
  let real;
  let temp;
  try {
    real = realpathSync.native(folder).toLowerCase();
    temp = realpathSync.native(tmpdir).toLowerCase();
  } catch {
    return { problem: 'the --out folder could not be resolved.' };
  }
  const rel = relative(temp, real);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    return { problem: 'the --out folder is not inside the system temp directory.' };
  }
  if (!rel.split(sep).some((part) => part.startsWith(PREFIX))) {
    return { problem: `neither the --out folder nor a folder it sits in has a name that begins ${PREFIX}` };
  }
  if (readdirSync(folder).length) return { problem: 'the --out folder is not empty.' };
  return { mode: 'out', folder, skipCountGuard: a.skipCountGuard };
}

/** The last good run, for the count guard: the counts in the build.json already in `folder`. */
export function previousRun(folder) {
  const path = join(folder, 'build.json');
  if (!existsSync(path)) return { kind: 'none' };
  try {
    const counts = guardCounts(JSON.parse(readFileSync(path, 'utf8')).counts);
    return counts ? { kind: 'counts', counts } : { kind: 'unreadable' };
  } catch {
    return { kind: 'unreadable' };
  }
}

/** The text of build.json. */
export function buildJson({ builtAt, counts, gaps, checks, installersText, territoryText }) {
  const doc = {
    schema: 1,
    builtAt,
    counts,
    gaps,
    checks: checks.map((c) => (c.skipped ? { check: c.check, name: c.name, skipped: true } : { check: c.check, name: c.name, passed: c.passed })),
    files: { 'installers.json': sha256(installersText), 'territory.json': sha256(territoryText) },
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** "METHOD address" and how many times, in the order first sent. */
export function tally(calls) {
  const n = new Map();
  for (const c of calls) n.set(c, (n.get(c) || 0) + 1);
  return [...n];
}

const countsText = (c) => Object.entries(c).map(([k, v]) => `${k} ${v}`).join(', ');
const checkLine = (c) => `Check ${c.check} "${c.name}": ${c.skipped ? `SKIPPED for this run (at least one installer: ${c.passed ? 'PASS' : 'FAIL'})` : (c.passed ? 'PASS' : 'FAIL')}`;
const stopLine = (c) => `STOPPED: check ${c.check} "${c.name}" failed: ${countsText(c.counts)}`;
const kindOfError = (e) => (e && e.constructor && e.constructor.name) || typeof e;

/**
 * One run of the job. args: the command-line arguments. env: the environment values it may
 * read (GITHUB_ACTIONS, and on GitHub QB_USER_TOKEN, QB_REALM_HOSTNAME, QB_APP_ID). root: the
 * repository's folder. io: stand-ins a test or the rehearsal may hand over: log, now, fetch,
 * sleep, timeoutSignal, tmpdir, loadKey (in place of keyFrom), shape (in place of shape).
 *
 * Returns { code, lines, target, read, shaped, checks, calls, sentAt, stats, error }: code 0
 * when the files were written, 1 when it stopped, 2 when it refused where to write. read is
 * what QuickBase handed over, kept even when a check fails, so that the rehearsal can scan
 * for leaks whatever happened.
 */
export async function main({ args, env, root, io = {} }) {
  if (!Array.isArray(args) || !env || typeof env !== 'object' || typeof root !== 'string' || !root) {
    throw new TypeError('main needs args, env and root; it has no default for any of them.');
  }
  const outcome = { code: 1, lines: [], target: null, read: null, shaped: null, checks: [], calls: [], sentAt: [], stats: null, error: null };
  const log = io.log || ((s) => console.log(s));
  const now = io.now || (() => Date.now());
  let redact = (s) => s;
  const say = (s) => {
    const t = redact(String(s));
    outcome.lines.push(t);
    log(t);
  };
  let step = 'start';
  let client = null;
  try {
    step = 'choose where to write';
    say(`Installer Index job, started ${utcSecond(now())}`);
    const target = chooseTarget({ args, env, root, tmpdir: io.tmpdir || systemTmpdir() });
    if (target.problem) {
      say(`REFUSED: ${target.problem} Nothing was read or written.`);
      outcome.code = 2;
      return outcome;
    }
    outcome.target = target;

    step = 'find the key';
    const key = (io.loadKey || keyFrom)(env, join(root, '..', '.env.local'));
    if (key.problem) {
      say(`STOPPED: ${key.problem}`);
      return outcome;
    }
    redact = makeRedactor([key.token]);
    say(`Key: from ${key.source === 'environment' ? 'the environment (GitHub)' : 'the .env.local file in the folder above the repository'}`);
    client = makeClient({ realm: key.realm, appId: key.appId, token: key.token, fetch: io.fetch, sleep: io.sleep,
      now: io.now, timeoutSignal: io.timeoutSignal });

    step = 'load the column list and the county list';
    const columns = JSON.parse(readFileSync(join(root, 'docs', 'quickbase', 'columns.json'), 'utf8'));
    const counties = JSON.parse(readFileSync(join(root, 'public', 'geo', 'counties.json'), 'utf8'));

    step = 'read the fields';
    const fields = await readFields(client);
    outcome.read = { fields };
    const columnsCheck = checkColumns(fields, columns);
    if (!columnsCheck.passed) {
      // Check 7 is worked out before any record is asked for. A column that has changed stops
      // the job here, before anything is shaped.
      outcome.checks = [columnsCheck];
      for (let n = 1; n <= 6; n++) say(`Check ${n} "${CHECK_NAMES[n - 1]}": not run`);
      say(checkLine(columnsCheck));
      say(stopLine(columnsCheck));
      return outcome;
    }

    step = 'read the records';
    const { rows, totals, pages } = await readRecords(client);
    outcome.read = { fields, rows, totals, pages };
    say(`Rows read: ${TABLE_ORDER.map((t) => `${t.name} ${rows[t.key].length} of QuickBase's ${totals[t.key]}`).join('; ')}`);
    say(`Rows to a page: ${TABLE_ORDER.map((t) => `${t.name} ${pages[t.key].join(', ')}`).join('; ')}`);
    const differ = TABLE_ORDER.filter((t) => rows[t.key].length !== totals[t.key]);
    if (differ.length) {
      say(`STOPPED: the rows read differ from QuickBase's own total for ${differ.map((t) => t.name).join(', ')}.`);
      return outcome;
    }

    step = 'shape';
    const shapeFn = io.shape || realShape;
    const first = shapeFn({ rows, columns, counties });
    const second = shapeFn({ rows, columns, counties });
    outcome.shaped = { ...first };

    step = 'check';
    const previous = target.mode === 'publish' ? previousRun(target.folder) : { kind: 'none' };
    const checks = [
      checkCounts(first.counts, previous, target.skipCountGuard),
      checkParents(rows),
      checkCounties(rows, counties),
      checkUniqueIds(rows),
      checkCompanyAndStatus(rows),
      checkSameFiles(first, second),
      columnsCheck,
    ];
    outcome.checks = checks;
    const k = first.counts;
    say(`Counts: installers ${k.installers}; contacts ${k.contacts}; territory rows ${k.territoryRows}; counted twice ${k.duplicateTerritoryRows}; `
      + `with territory ${k.installersWithTerritory}; without ${k.installersWithoutTerritory}; counties covered ${k.countiesCovered}`);
    say(`By status: ${k.byStatus.map((s) => `${s.status} ${s.installers}`).join('; ')}`);
    say(`Gaps: no quoting contact ${first.gaps.noQuoting}; no scheduling contact ${first.gaps.noScheduling}; neither ${first.gaps.neither}`);
    for (const c of checks) say(checkLine(c));
    const failed = checks.filter((c) => !c.passed);
    if (failed.length) {
      for (const c of failed) say(stopLine(c));
      return outcome;
    }

    step = 'write';
    const builtAt = utcSecond(now());
    const buildText = buildJson({ builtAt, counts: first.counts, gaps: first.gaps, checks, installersText: first.installersText, territoryText: first.territoryText });
    outcome.shaped = { ...first, builtAt, buildText };
    if (target.mode === 'publish') mkdirSync(target.folder, { recursive: true });
    writeFiles(target.folder, { 'installers.json': first.installersText, 'territory.json': first.territoryText, 'build.json': buildText });
    say(`Wrote installers.json, territory.json and build.json, built at ${builtAt}, to ${target.mode === 'publish' ? 'public/data' : 'the folder given with --out'}.`);
    outcome.code = 0;
    return outcome;
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : undefined;
    outcome.error = { kind: kindOfError(e), step, status };
    say(`STOPPED: an error of kind ${outcome.error.kind} at step "${step}"${status !== undefined ? `; QuickBase answered with status ${status}` : ''}. `
      + `${step === 'write' ? 'The write did not finish.' : 'Nothing was written.'}`);
    outcome.code = 1;
    return outcome;
  } finally {
    if (client) {
      outcome.calls = [...client.calls];
      outcome.sentAt = [...client.sentAt];
      outcome.stats = { ...client.stats };
      say(`QuickBase calls: ${client.calls.length}`);
      for (const [call, n] of tally(client.calls)) say(`  ${call} x${n}`);
      say(`  retries ${client.stats.retries}; rate-limited ${client.stats.rateLimited}; refused ${client.stats.refused}`);
    }
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) {
  const outcome = await main({ args: process.argv.slice(2), env: process.env, root: ROOT });
  process.exitCode = outcome.code;
}
