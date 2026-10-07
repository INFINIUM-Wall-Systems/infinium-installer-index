/**
 * Stand-ins for the job's tests: the made-up installers turned into records shaped as
 * QuickBase's REST interface returns them, a stand-in QuickBase that answers the client's
 * calls from them, a stand-in clock, a made-up key, and a way to run the job with all of these
 * in place of the real ones. Nothing here reaches QuickBase, loads the real key or reads the
 * real environment.
 *
 * How QuickBase hands over an empty value was not known when this was written, so the
 * made-up records give empty values in three ways, in turn from one record to the next: as
 * an empty text, an empty list or an unticked box; as nothing (null); and left out of the
 * record altogether.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ID, REALM, TABLES } from '../job/lib/quickbase.mjs';
import { CONTACTS, MASTER, TERRITORY, ASKED } from '../job/fields.mjs';
import { main } from '../job/run.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const COLUMNS = JSON.parse(readFileSync(resolve(ROOT, 'docs', 'quickbase', 'columns.json'), 'utf8'));
export const COUNTIES = JSON.parse(readFileSync(resolve(ROOT, 'public', 'geo', 'counties.json'), 'utf8'));
export const FIXTURE = JSON.parse(readFileSync(resolve(ROOT, 'scripts', 'fixtures', 'installers.json'), 'utf8'));
export const FINGERPRINTS_PATH = resolve(ROOT, 'scripts', 'fixtures', 'fingerprints.json');
/** builtAt, held fixed for the fingerprints. */
export const FIXED_TIME = Date.parse('2026-10-07T09:20:31Z');

/** A made-up key, put together when the tests run, so that no tracked file holds it. */
export const FAKE_KEY = ['made', 'up', 'key', 'for', 'the', 'job', 'tests', 'q7'].join('-');

export const ROLE_NAMES = {
  Q: 'Quoting / Estimating', S: 'Scheduling / Coordination', L: 'Leadership / Ownership', F: 'Field / Installation',
  R: 'Receiving / Warehouse', O: 'Office / Billing / Compliance / Accounts payable', P: 'Primary contact', A: 'After-hours',
  E: 'Emergency dispatch',
};

const typeOf = (tableId, fieldId) => COLUMNS.tables.find((t) => t.id === tableId).columns.find((c) => c.fieldId === fieldId).type;

/** The empty value of a column's type, in the given way (0, 1 or 2). undefined means: left out. */
function emptyOf(type, way) {
  if (way === 2) return undefined;
  if (way === 1) return null;
  if (type === 'checkbox') return false;
  if (type === 'multitext') return [];
  if (type === 'currency' || type === 'numeric') return null;
  return '';
}

/** One record: { "<field id>": { value } } for every field asked for, empty ones in the given way. */
function record(tableId, values, way) {
  const r = {};
  for (const id of ASKED[tableId]) {
    const v = values.has(id) ? values.get(id) : emptyOf(typeOf(tableId, id), way);
    if (v !== undefined) r[String(id)] = { value: v };
  }
  return r;
}

/** Field ids and values from a made-up value laid out like `ids` (a group of field ids). */
function flatten(ids, given, into) {
  for (const [k, id] of Object.entries(ids)) {
    if (given === undefined || given[k] === undefined) continue;
    if (typeof id === 'number') into.set(id, given[k]);
    else flatten(id, given[k], into);
  }
}

/** { master, contacts, territory }: the made-up installers as QuickBase would hand them over. */
export function toRecords(fixture = FIXTURE) {
  const master = fixture.master.map((m, i) => {
    const values = new Map();
    flatten(MASTER, m, values);
    return record(TABLES.MASTER, values, i % 3);
  });
  const contacts = fixture.contacts.map((c, i) => {
    const values = new Map();
    flatten(CONTACTS, { ...c, roles: c.roles && c.roles.map((r) => ROLE_NAMES[r] || r) }, values);
    return record(TABLES.CONTACTS, values, i % 3);
  });
  const territory = fixture.territory.map((t, i) => {
    const values = new Map();
    flatten(TERRITORY, t, values);
    return record(TABLES.TERRITORY, values, i % 3);
  });
  return { master, contacts, territory };
}

/** Every column of a table as QuickBase's GET /v1/fields lists it: id, label, fieldType. */
export function fieldsOf(tableId, columns = COLUMNS) {
  return columns.tables.find((t) => t.id === tableId).columns.map((c) => ({ id: c.fieldId, label: c.label, fieldType: c.type }));
}

const KEY_OF = { [TABLES.MASTER]: 'master', [TABLES.CONTACTS]: 'contacts', [TABLES.TERRITORY]: 'territory' };

/**
 * A stand-in for fetch that answers the client's calls from made-up records.
 *   records    { master, contacts, territory }
 *   fields     { [tableId]: [...] } in place of the columns of docs\quickbase\columns.json
 *   pageCap    the most rows it hands over in one page, whatever was asked
 *   totalShift { master, contacts, territory }: added to the total it reports
 *   fail       (call) => a Response or a thrown error, in place of the answer, for that call
 * It keeps every request in `seen`.
 */
export function standInQuickBase({ records, fields = {}, pageCap = Infinity, totalShift = {}, fail } = {}) {
  const seen = [];
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const fetch = async (url, init = {}) => {
    const u = new URL(url);
    const call = { method: init.method, path: u.pathname, search: u.search, body: init.body ? JSON.parse(init.body) : undefined, signal: init.signal };
    seen.push(call);
    if (fail) {
      const f = await fail(call, seen.length);
      if (f) return f;
    }
    if (call.method === 'GET' && u.pathname === '/v1/fields') {
      const id = u.searchParams.get('tableId');
      return json(fields[id] || fieldsOf(id));
    }
    if (call.method === 'POST' && u.pathname === '/v1/records/query') {
      const key = KEY_OF[call.body.from];
      const rows = records[key] || [];
      const skip = (call.body.options && call.body.options.skip) || 0;
      const top = Math.min((call.body.options && call.body.options.top) || 100, pageCap);
      const select = new Set((call.body.select || []).map(String));
      const data = rows.slice(skip, skip + top).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => select.has(k))));
      return json({ data, fields: [], metadata: { totalRecords: rows.length + (totalShift[key] || 0), numRecords: data.length, numFields: select.size, skip } });
    }
    return json({ message: 'Not found' }, 404);
  };
  return { fetch, seen };
}

/** A clock that moves only when the client sleeps. */
export function standInClock(start = FIXED_TIME) {
  const clock = { t: start };
  clock.now = () => clock.t;
  clock.sleep = async (ms) => { clock.t += Math.max(0, ms); };
  return clock;
}

/** Hands the job a made-up key, as keyFrom would from the .env.local file. */
export const fakeKeyLoader = () => ({ realm: REALM, appId: APP_ID, token: FAKE_KEY, source: 'file' });

/* ------------------------------------------------------------------ temporary folders */

const temps = [];
/** A temporary folder whose name begins installer-index-, deleted by removeTemps. */
export function tempDir(tag) {
  const d = mkdtempSync(join(tmpdir(), `installer-index-test-${tag}-`));
  temps.push(d);
  return d;
}
/** Deletes every temporary folder tempDir made, by its own path, with retries. Returns those left. */
export function removeTemps() {
  for (const d of temps) {
    for (let i = 0; i < 5 && existsSync(d); i++) {
      try { rmSync(d, { recursive: true, force: true, maxRetries: 3 }); } catch { /* tried again */ }
    }
  }
  const left = temps.filter((d) => existsSync(d));
  temps.length = 0;
  return left;
}

/** A made-up repository folder holding what the job reads from one: the column list and the county list. */
export function madeUpRepo(tag) {
  const root = join(tempDir(tag), 'repo');
  mkdirSync(join(root, 'docs', 'quickbase'), { recursive: true });
  mkdirSync(join(root, 'public', 'geo'), { recursive: true });
  cpSync(resolve(ROOT, 'docs', 'quickbase', 'columns.json'), join(root, 'docs', 'quickbase', 'columns.json'));
  cpSync(resolve(ROOT, 'public', 'geo', 'counties.json'), join(root, 'public', 'geo', 'counties.json'));
  return root;
}

/** The environment values of a made-up run on GitHub. */
export const madeUpGitHub = () => ({ GITHUB_ACTIONS: 'true', QB_USER_TOKEN: FAKE_KEY, QB_REALM_HOSTNAME: REALM, QB_APP_ID: APP_ID });

/**
 * One run of the job with stand-ins in place of QuickBase, the clock and the key.
 *   records  made-up records (toRecords())      args  the command line
 *   env      made-up environment values ({})    root  a repository folder (this one by default;
 *                                                     the job only reads from it with --out)
 *   quickbase  options for standInQuickBase     io    more stand-ins for main
 * The real key is never loaded: with no GITHUB_ACTIONS in env, the key comes from
 * fakeKeyLoader; with a made-up GitHub, keyFrom reads the made-up values.
 */
export async function runJob({ records = toRecords(), args, env = {}, root = ROOT, quickbase = {}, io = {}, clock = standInClock() } = {}) {
  const qb = standInQuickBase({ records, ...quickbase });
  const lines = [];
  const outcome = await main({
    args, env, root,
    io: { log: (s) => lines.push(s), now: clock.now, sleep: clock.sleep, fetch: qb.fetch,
      timeoutSignal: () => new AbortController().signal,
      ...(env.GITHUB_ACTIONS === 'true' ? {} : { loadKey: fakeKeyLoader }), ...io },
  });
  return { outcome, lines, seen: qb.seen, clock };
}

/** Every value of a made-up kind the job must never print: ids, companies, names, emails, phones, rates. */
export function madeUpValues(fixture = FIXTURE) {
  const out = [];
  for (const m of fixture.master) {
    out.push(['an installer id', m.id], ['a company', m.company]);
    for (const v of Object.values(m.rates || {})) if (v) out.push(['a rate', String(v)]);
    if (m.tier2Charge && m.tier2Charge.amount) out.push(['a rate', String(m.tier2Charge.amount)]);
  }
  for (const c of fixture.contacts) {
    if (c.name && c.name.trim()) out.push(['a name', c.name.trim()]);
    for (const k of ['email', 'email2']) if (c[k]) out.push(['an email', c[k]]);
    if (c.phone) out.push(['a phone', c.phone]);
  }
  return out;
}
