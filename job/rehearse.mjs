/**
 * The rehearsal of the job on the laptop, with the real records (npm run job:rehearse).
 *
 *   a. Deletes the folder installer-index-rehearsal directly inside the system temp directory,
 *      by its full path, if an earlier run left it, and says whether there was one. It deletes
 *      nothing else. It counts, without opening them, the other folders there whose names
 *      begin installer-index-.
 *   b. Makes that folder and, from then on, deletes it whatever happens.
 *   c. Runs the job twice with --out, into run-1 and run-2 inside it, calling main in this
 *      process with an empty set of environment values and the repository's folder: on the
 *      laptop the key comes from .env.local in the folder above. Each run makes its own
 *      client. Before a run it stops, with a fixed message, if that run could take the calls
 *      past 100 (each client may send 60). Everything the runs print, and everything parts d,
 *      e and f work out, is held back until the leak scan.
 *   d. Works out J1, J2, J8, J10 (running the pair once more if the two runs differ), J11, J12,
 *      J13, J14 and J15 on the real records, with counts and SHA-256 only; how each of the 62
 *      columns asked for came back (text, a number, true or false, a list, nothing); the empty
 *      values in the three files; dates not written like 2026-10-06; office states not in the
 *      county list.
 *   e. Works out counts to set beside what QuickBase held on October 6.
 *   f. Sets the installers.json and territory.json the runs of part d looked at beside the two
 *      in public\data (compareWithPublished), after the rehearsal's own checks: for each file,
 *      SAME BYTES or DIFFERENT (by SHA-256), and when different, counts only: entries in one
 *      file and not the other, and entries in both written differently; whether the published
 *      file is IN ORDER by this laptop's own rule; and the counts of installers, contacts and
 *      territory rows, published beside now. A published file that is not in order fails the
 *      rehearsal. When public\data is not there it says so and goes on.
 *   g. The leak scan, on every ending: through everything held back, for every installer id,
 *      company, contact name, email and phone read; through every file in the repository
 *      (tracked or not, leaving out .git, public/data, node_modules and .env* files), for every
 *      installer id, email and phone. On a hit it prints the kind of value, where and the line
 *      number, never the value, and nothing held back. With no hit it prints what was held
 *      back.
 *   h. Deletes the folder, looks to see that it is gone, and says so. Counts the other
 *      installer-index- folders again.
 *
 * It reads the real environment nowhere. It prints no record, no value from one, never the
 * key and never an error's own text: an error is reported by its kind and the step it came at.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_CALLS_PER_CLIENT } from './lib/quickbase.mjs';
import { ASKED, CONTACTS, MASTER, TABLE_ORDER, WATCHED } from './fields.mjs';
import { CHECK_NAMES } from './checks.mjs';
import { CONFIRMED, STATUSES } from './shape.mjs';
import { FULL_ORDER, orderContacts } from './row-contacts.mjs';
import { compareText } from './lib/order.mjs';
import { ROOT, main } from './run.mjs';

const TEMP = tmpdir();
export const FOLDER = join(TEMP, 'installer-index-rehearsal');
export const PUBLISHED = join(ROOT, 'public', 'data');
const MOST_CALLS = 100;
const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const kindOfError = (e) => (e && e.constructor && e.constructor.name) || typeof e;
const say = (s) => console.log(s);

/** What QuickBase held on October 6, 2026 (section 3.3 of docs\SPEC.md), to set beside today's counts. */
const OCTOBER_6 = {
  installers: 73, contacts: 221, territoryRows: 17745, duplicateTerritoryRows: 0, installersWithTerritory: 52,
  installersWithoutTerritory: 21, countiesCovered: 3193, statesCovered: 52,
  byStatus: { 'CONFIRMED BY PARTNER': 54, 'DORMANT - NO RESPONSE': 14, INACTIVE: 2, 'PENDING - UPDATE EXPECTED': 2, 'HELD - BUSINESS DECISION': 1 },
  noQuoting: 25, noScheduling: 29, neither: 23,
  nonUnionST: 45, nonUnionOT: 46, unionST: 52, unionOT: 51, allFourRates: 34, noRates: 9, mobilization: 65, ratesValidThrough: 58,
};

/** The fixed text the job and the rehearsal print whatever the records hold, for the leak scan's skip rule. */
const HEADINGS = [
  'Installer Index job, started', 'Key: from the environment (GitHub)', 'the .env.local file in the folder above the repository',
  "Rows read: of QuickBase's", 'Rows to a page', 'Counts: installers contacts territory rows counted twice with territory without counties covered',
  'By status', 'Gaps: no quoting contact no scheduling contact neither', 'Check PASS FAIL SKIPPED for this run at least one installer not run',
  'STOPPED: check failed an error of kind at step QuickBase answered with status Nothing was written The write did not finish',
  'Wrote installers.json, territory.json and build.json, built at to the folder given with --out public/data',
  'QuickBase calls retries rate-limited refused GET POST https api quickbase com v1 fields tableId records query',
  'REHEARSAL rehearsal run held back leak scan shape of what QuickBase handed over by column kind of column how a blank came back',
  'text empty text number true false list empty list null absent other date currency numeric choice several choices box checkbox email phone long text',
  'J1 J2 J8 J10 J11 J12 J13 J14 J15 every call is listed by method and address the counts in build.json equal totals columns watched still match',
  'the two runs wrote the same installers.json territory.json county ids are text begin with a zero gap counts second count',
  'lastConfirmed written on no installer with another status every CONFIRMED BY PARTNER installer whose date is filled no row holds a departed contact',
  'calls stayed under 100 in any 10 seconds all seven checks passed in both runs empties in the three files dates not written like office states not in the county list',
  'October 6 today rates written all four none mobilization rates valid through quoting place scheduling place holds a quoting contact stand-in nobody',
  'one person fills both places contact who cannot be reached fills a place size in bytes calls each run made rows to a page',
  'Role not recorded', 'INFINIUM Installers MASTER Contacts Territory', 'territory rows whose tier is neither Tier 1 nor Tier 2',
  'run 1 run 2 run 3 run 4 the pair is run once more a record may have changed between them',
  "this laptop beside the files published in public/data SHA-256 and counts only SAME BYTES DIFFERENT installers counties",
  "only in the published file this laptop's file in both but written differently every entry is written the same so the difference is outside the entries",
  "the published file is IN ORDER NOT IN ORDER by this laptop's own rule counts published beside now territory rows",
  'public/data is not there so there is nothing to set beside it the runs did not both write their files',
];

/* ------------------------------------------------------------------ the shape of what was read */

/** How a value came back: absent (no cell), null, empty text, text, number, true, false, empty list, list, other. */
function cellKind(record, id) {
  const cell = record[String(id)];
  if (cell === undefined || cell === null || typeof cell !== 'object' || !('value' in cell)) return 'absent';
  const v = cell.value;
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return v.trim() ? 'text' : 'empty text';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.length ? 'list' : 'empty list';
  return 'other';
}
const KINDS = ['text', 'empty text', 'number', 'true', 'false', 'list', 'empty list', 'null', 'absent', 'other'];
const BLANK_KINDS = new Set(['empty text', 'false', 'empty list', 'null', 'absent']);
const GROUP_OF_TYPE = { text: 'text', 'text-multi-line': 'long text', date: 'date', currency: 'currency', numeric: 'number',
  'text-multiple-choice': 'choice', multitext: 'several choices', checkbox: 'box', email: 'email', phone: 'phone' };

function shapeTable(rows, columns) {
  const lines = [];
  const byGroup = new Map();
  for (const t of TABLE_ORDER) {
    const table = columns.tables.find((x) => x.id === t.id);
    for (const id of ASKED[t.id]) {
      const col = table.columns.find((c) => c.fieldId === id) || { label: '(not in columns.json)', type: '?' };
      const n = Object.fromEntries(KINDS.map((k) => [k, 0]));
      for (const r of rows[t.key]) n[cellKind(r, id)]++;
      lines.push(`  ${t.name} ${id} "${col.label}" (${col.type}): ${KINDS.filter((k) => n[k]).map((k) => `${k} ${n[k]}`).join(', ') || 'no rows'}`);
      const group = GROUP_OF_TYPE[col.type] || col.type;
      if (!byGroup.has(group)) byGroup.set(group, Object.fromEntries(KINDS.map((k) => [k, 0])));
      for (const k of KINDS) byGroup.get(group)[k] += n[k];
    }
  }
  const summary = [...byGroup].map(([group, n]) => {
    const blanks = KINDS.filter((k) => BLANK_KINDS.has(k) && n[k]).map((k) => `${k} ${n[k]}`);
    const filled = KINDS.filter((k) => !BLANK_KINDS.has(k) && n[k]).map((k) => `${k} ${n[k]}`);
    return `  ${group}: a blank came back as ${blanks.join(', ') || '(no blank)'}; filled values came back as ${filled.join(', ') || '(none)'}`;
  });
  return { lines, summary };
}

/* -------------------------------------------------------------------- the files' contents */

function emptiesIn(installers, territory, build) {
  const n = { null: 0, emptyText: 0, emptyList: 0, emptyGroup: 0, installersWithNoContact: 0, contactsWithNothingFilled: 0, emptyRows: 0 };
  const walk = (v, path) => {
    if (v === null) { n.null++; return; }
    if (v === '') { n.emptyText++; return; }
    if (Array.isArray(v)) {
      if (!v.length) {
        if (/^installers\.\d+\.contacts$/.test(path)) n.installersWithNoContact++;
        else n.emptyList++;
      }
      v.forEach((x, i) => walk(x, `${path}.${i}`));
      return;
    }
    if (typeof v === 'object') {
      if (!Object.keys(v).length) {
        if (/^installers\.\d+\.contacts\.\d+$/.test(path)) n.contactsWithNothingFilled++;
        else if (/^installers\.\d+\.row$/.test(path)) n.emptyRows++;
        else n.emptyGroup++;
      }
      for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
    }
  };
  walk(installers, '');
  walk(territory, 'territory');
  walk(build, 'build');
  return n;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const reachable = (c) => Boolean(c && (c.phone || c.email || c.email2));

/** Part e, and the counts of part d that come from the files. */
function countsFrom(installers, territory, build, counties) {
  const list = installers.installers;
  const has = (i, k) => Boolean(i.rates && i.rates[k] !== undefined);
  const rateKeys = ['nonUnionST', 'nonUnionOT', 'unionST', 'unionOT'];
  const placeKinds = (name) => {
    const k = { holder: 0, standIn: 0, nobody: 0 };
    for (const i of list) {
      const p = i.row[name];
      if (!p) k.nobody++;
      else if (p.standIn) k.standIn++;
      else k.holder++;
    }
    return k;
  };
  const dates = [];
  for (const i of list) {
    for (const v of [i.lastConfirmed, i.ratesValidThrough, i.paperwork && i.paperwork.coiValidThrough]) if (v !== undefined) dates.push(v);
  }
  const codes = new Set(counties.states.map((s) => s.code));
  const names = new Set(counties.states.map((s) => s.name.toLowerCase()));
  const officeStates = list.map((i) => i.office && i.office.state).filter((s) => s !== undefined);
  return {
    statesCovered: territory.states.length,
    nonUnionST: list.filter((i) => has(i, 'nonUnionST')).length,
    nonUnionOT: list.filter((i) => has(i, 'nonUnionOT')).length,
    unionST: list.filter((i) => has(i, 'unionST')).length,
    unionOT: list.filter((i) => has(i, 'unionOT')).length,
    allFourRates: list.filter((i) => rateKeys.every((k) => has(i, k))).length,
    noRates: list.filter((i) => rateKeys.every((k) => !has(i, k))).length,
    mobilization: list.filter((i) => i.mobilization !== undefined).length,
    ratesValidThrough: list.filter((i) => i.ratesValidThrough !== undefined).length,
    quotingPlace: placeKinds('quoting'),
    schedulingPlace: placeKinds('scheduling'),
    onePersonBoth: list.filter((i) => i.row.quoting && i.row.scheduling && i.row.quoting.contact === i.row.scheduling.contact).length,
    unreachableFills: list.filter((i) => ['quoting', 'scheduling'].some((k) => i.row[k] && !reachable(i.contacts[i.row[k].contact]))).length,
    datesWritten: dates.length,
    datesNotLikeIso: dates.filter((d) => !DATE.test(d)).length,
    officeStates: officeStates.length,
    officeStatesNotInList: officeStates.filter((s) => !codes.has(s)).length,
    officeStatesWrittenAsName: officeStates.filter((s) => !codes.has(s) && names.has(String(s).toLowerCase())).length,
    countyIds: territory.states.reduce((n, s) => n + s.counties.length, 0),
    countyIdsNotText: territory.states.reduce((n, s) => n + s.counties.filter((c) => typeof c.id !== 'string').length, 0),
    countyIdsWithZero: territory.states.reduce((n, s) => n + s.counties.filter((c) => typeof c.id === 'string' && c.id.startsWith('0')).length, 0),
    departedOnRow: list.reduce((n, i) => n + ['quoting', 'scheduling'].filter((k) => i.row[k] && i.contacts[i.row[k].contact] && i.contacts[i.row[k].contact].departed).length, 0),
    gaps: build ? build.gaps : null,
  };
}

/** J12's second count: from the contacts as read, leaving out departed contacts. */
function secondGapCount(rows) {
  const text = (r, id) => { const v = r[String(id)] && r[String(id)].value; return typeof v === 'string' ? v.trim() : ''; };
  const held = new Map();
  for (const r of rows.contacts) {
    if (r[String(CONTACTS.departed)] && r[String(CONTACTS.departed)].value === true) continue;
    const roles = r[String(CONTACTS.roles)] && Array.isArray(r[String(CONTACTS.roles)].value) ? r[String(CONTACTS.roles)].value : [];
    const parent = text(r, CONTACTS.parent);
    if (!held.has(parent)) held.set(parent, new Set());
    for (const role of roles) held.get(parent).add(String(role).trim());
  }
  const n = { noQuoting: 0, noScheduling: 0, neither: 0 };
  for (const m of rows.master) {
    const roles = held.get(text(m, MASTER.id)) || new Set();
    const q = !roles.has(FULL_ORDER[0]);
    const s = !roles.has(FULL_ORDER[1]);
    n.noQuoting += q ? 1 : 0;
    n.noScheduling += s ? 1 : 0;
    n.neither += q && s ? 1 : 0;
  }
  return n;
}

/** J13 on the real records: lastConfirmed on no installer with another status, and on every CONFIRMED BY PARTNER one whose date is filled. */
function lastConfirmedCheck(rows, installers) {
  const text = (r, id) => { const v = r[String(id)] && r[String(id)].value; return typeof v === 'string' ? v.trim() : ''; };
  const written = new Map(installers.installers.map((i) => [i.id, i]));
  let otherStatusWritten = 0;
  let confirmedDatedMissing = 0;
  let confirmedDated = 0;
  for (const m of rows.master) {
    const i = written.get(text(m, MASTER.id));
    const confirmed = text(m, MASTER.status) === CONFIRMED;
    const dated = Boolean(text(m, MASTER.lastConfirmed));
    if (confirmed && dated) confirmedDated++;
    if (!confirmed && i && i.lastConfirmed !== undefined) otherStatusWritten++;
    if (confirmed && dated && !(i && i.lastConfirmed !== undefined)) confirmedDatedMissing++;
  }
  return { otherStatusWritten, confirmedDatedMissing, confirmedDated };
}

function mostInTenSeconds(times) {
  const t = [...times].sort((a, b) => a - b);
  let most = 0;
  for (let i = 0, j = 0; i < t.length; i++) {
    while (t[i] - t[j] >= 10_000) j++;
    most = Math.max(most, i - j + 1);
  }
  return most;
}

/* ------------------------------------------------------------------------------ leak scan */

const ALNUM = /[\p{L}\p{N}]/u;
const FIXED_WORDS = (() => {
  const columns = JSON.parse(readFileSync(join(ROOT, 'docs', 'quickbase', 'columns.json'), 'utf8'));
  const labels = TABLE_ORDER.flatMap((t) => WATCHED[t.id].map((id) => (columns.tables.find((x) => x.id === t.id).columns.find((c) => c.fieldId === id) || {}).label || ''));
  const words = new Set();
  for (const s of [...STATUSES, ...FULL_ORDER, ...CHECK_NAMES, ...labels, ...HEADINGS]) {
    for (const w of s.toLowerCase().split(/[^\p{L}\p{N}]+/u)) if (w) words.add(w);
  }
  return words;
})();
const allFixed = (v) => {
  const words = v.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return words.length > 0 && words.every((w) => FIXED_WORDS.has(w));
};

/** The values to look for, from every record read: { kind, value, digits? }. Also how many were skipped. */
export function valuesToFind(reads) {
  const out = new Map();
  let skipped = 0;
  const add = (kind, raw, inFiles) => {
    if (typeof raw !== 'string') return;
    const v = raw.trim();
    if (!v) return;
    const key = `${kind}\u0000${v.toLowerCase()}`;
    if (out.has(key)) return;
    if (v.length < 5 || allFixed(v)) { skipped++; out.set(key, null); return; }
    let digits = null;
    if (kind === 'a phone') {
      digits = v.replace(/\D/g, '');
      if (digits.length >= 11 && digits[0] === '1') digits = digits.slice(1);
      if (digits.length > 10) digits = digits.slice(0, 10);
      if (digits.length < 7) { skipped++; out.set(key, null); return; }
    }
    out.set(key, { kind, value: v.toLowerCase(), digits, inFiles });
  };
  for (const read of reads) {
    if (!read || !read.rows) continue;
    for (const r of read.rows.master) {
      add('an installer id', r[String(MASTER.id)] && r[String(MASTER.id)].value, true);
      add('a company', r[String(MASTER.company)] && r[String(MASTER.company)].value, false);
    }
    for (const r of read.rows.contacts) {
      add('a contact name', r[String(CONTACTS.name)] && r[String(CONTACTS.name)].value, false);
      add('an email', r[String(CONTACTS.email)] && r[String(CONTACTS.email)].value, true);
      add('an email', r[String(CONTACTS.email2)] && r[String(CONTACTS.email2)].value, true);
      add('a phone', r[String(CONTACTS.phone)] && r[String(CONTACTS.phone)].value, true);
    }
  }
  const values = [...out.values()].filter(Boolean).map((x) => (x.digits
    ? { ...x, re: new RegExp(`(?<![\\p{L}\\p{N}])${x.digits.split('').join('[\\s().\\-+/]{0,3}')}(?![\\p{L}\\p{N}])`, 'u') }
    : x));
  return { values, skipped };
}

/** Every hit in one text, as { kind, line }. fakeAware: a value directly after FAKE- is not a hit. */
export function hitsIn(text, values, fakeAware) {
  const hits = [];
  const lines = text.split('\n');
  lines.forEach((line, n) => {
    const low = line.toLowerCase();
    for (const v of values) {
      if (v.re) {
        if (v.re.test(line)) hits.push({ kind: v.kind, line: n + 1 });
        continue;
      }
      for (let at = low.indexOf(v.value); at >= 0; at = low.indexOf(v.value, at + 1)) {
        const before = at > 0 ? low[at - 1] : '';
        const after = low[at + v.value.length] || '';
        if ((before && ALNUM.test(before)) || (after && ALNUM.test(after))) continue;
        if (fakeAware && low.slice(Math.max(0, at - 5), at) === 'fake-') continue;
        hits.push({ kind: v.kind, line: n + 1 });
        break;
      }
    }
  });
  return hits;
}

/** Every file in the repository, tracked or not, but .git, public/data, node_modules and .env* files. */
function repositoryFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, e.name);
      const rel = relative(ROOT, path).split(sep).join('/');
      if (e.isDirectory()) {
        if (e.name === '.git' || e.name === 'node_modules' || rel === 'public/data') continue;
        walk(path);
      } else if (!e.name.startsWith('.env')) {
        out.push({ rel, path });
      }
    }
  };
  walk(ROOT);
  return out;
}

/* -------------------------------------------------------------- beside the published files */

/** Whether `list`, put in order again by `cmp` with ties left as they are, comes out as it is. */
function staysInOrder(list, cmp) {
  const at = list.map((_, i) => i).sort((i, j) => cmp(list[i], list[j]) || i - j);
  return at.every((v, k) => v === k);
}

/**
 * installers.json in the order of section 3.6, by the job's own rule (job\lib\order.mjs): the
 * installers by company, then installer id; within each, its contacts (orderContacts) and its
 * territory's states. A tie is left in the order it was published in, which is the order of
 * QuickBase's record numbers.
 */
export function installersInOrder(doc) {
  if (!staysInOrder(doc.installers, (a, b) => compareText(a.company ?? '', b.company ?? '') || compareText(a.id ?? '', b.id ?? ''))) return false;
  return doc.installers.every((i) => orderContacts((i.contacts || []).map((contact, rec) => ({ contact, rec }))).every((e, k) => e.rec === k)
    && staysInOrder((i.territory && i.territory.states) || [], (a, b) => compareText(a.state, b.state)));
}

/** territory.json in the order of section 3.6: states by code, counties by id, the installer ids of each tier in text order. */
export function territoryInOrder(doc) {
  if (!staysInOrder(doc.states, (a, b) => compareText(a.state, b.state))) return false;
  return doc.states.every((s) => staysInOrder(s.counties, (a, b) => compareText(a.id, b.id))
    && s.counties.every((c) => staysInOrder(c.tier1Installers || [], compareText) && staysInOrder(c.tier2Installers || [], compareText)));
}

/** Each installer, by its id, as written. */
const installerEntries = (doc) => new Map(doc.installers.map((i) => [String(i.id), JSON.stringify(i)]));
/** Each county, by its state and id, as written. */
const countyEntries = (doc) => new Map(doc.states.flatMap((s) => s.counties.map((c) => [`${s.state}\u0000${c.id}`, JSON.stringify([s.state, s.country, c])])));

/** Counts only: entries only in the published file, only in this laptop's, and in both but written differently. */
function entryDifferences(published, now) {
  const d = { onlyPublished: 0, onlyNow: 0, written: 0 };
  for (const [k, v] of published) {
    if (!now.has(k)) d.onlyPublished++;
    else if (now.get(k) !== v) d.written++;
  }
  for (const k of now.keys()) if (!published.has(k)) d.onlyNow++;
  return d;
}

/**
 * Part f. now: the three files a run of the rehearsal wrote, { name: text }. folder: where the
 * published files are, public\data unless a test gives another. Returns { there, lines,
 * notInOrder }: the lines to hold back, and the names of the published files that are not in
 * the order this laptop's own rule gives. The files are compared by SHA-256 and by counts,
 * never by showing what differs, and nothing returned holds an id or anything else a file
 * holds.
 */
export function compareWithPublished(now, folder = PUBLISHED) {
  const lines = ['--- this laptop beside the files published in public/data (SHA-256 and counts only)'];
  const notInOrder = [];
  const names = ['installers.json', 'territory.json', 'build.json'];
  if (!names.every((name) => existsSync(join(folder, name)))) {
    lines.push('  public/data is not there, so there is nothing to set beside it');
    return { there: false, lines, notInOrder };
  }
  const published = Object.fromEntries(names.map((name) => [name, readFileSync(join(folder, name))]));
  for (const [name, what, entriesOf, inOrder] of [
    ['installers.json', 'installers', installerEntries, installersInOrder],
    ['territory.json', 'counties', countyEntries, territoryInOrder],
  ]) {
    const doc = JSON.parse(published[name].toString('utf8'));
    if (sha(published[name]) === sha(now[name])) {
      lines.push(`  ${name}: SAME BYTES`);
    } else {
      const d = entryDifferences(entriesOf(doc), entriesOf(JSON.parse(now[name])));
      const none = !d.onlyPublished && !d.onlyNow && !d.written;
      lines.push(`  ${name}: DIFFERENT: ${what} only in the published file ${d.onlyPublished}, only in this laptop's file ${d.onlyNow}, `
        + `in both but written differently ${d.written}${none ? '; every entry is written the same, so the difference is outside the entries' : ''}`);
    }
    const ordered = inOrder(doc);
    if (!ordered) notInOrder.push(name);
    lines.push(`  ${name}: the published file is ${ordered ? 'IN ORDER' : 'NOT IN ORDER'} by this laptop's own rule`);
  }
  const p = JSON.parse(published['build.json'].toString('utf8')).counts;
  const n = JSON.parse(now['build.json']).counts;
  lines.push(`  counts, published beside now: installers ${p.installers} beside ${n.installers}; contacts ${p.contacts} beside ${n.contacts}; `
    + `territory rows ${p.territoryRows} beside ${n.territoryRows}`);
  return { there: true, lines, notInOrder };
}

/* ------------------------------------------------------------------------------- folders */

function otherFolders() {
  return readdirSync(TEMP, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.toLowerCase().startsWith('installer-index-') && e.name.toLowerCase() !== 'installer-index-rehearsal').length;
}
function removeFolder() {
  for (let i = 0; i < 5 && existsSync(FOLDER); i++) {
    try { rmSync(FOLDER, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* tried again */ }
  }
  return !existsSync(FOLDER);
}

/* ---------------------------------------------------------------------------------- main */

/**
 * The rehearsal. io: stand-ins handed on to the job's main, for a dry run on made-up installers
 * (a stand-in fetch and key); npm run job:rehearse hands none, so the job reads QuickBase with
 * the key from .env.local.
 */
export async function rehearse({ io = {} } = {}) {
  let step = 'look for an earlier rehearsal folder';
  const earlier = existsSync(FOLDER);
  if (earlier && !removeFolder()) {
    say(`REHEARSAL STOPPED: an earlier rehearsal folder could not be deleted: ${FOLDER}`);
    return 1;
  }
  say(`An earlier rehearsal folder: ${earlier ? 'there was one, and it is deleted' : 'there was none'}.`);
  say(`Other folders in the temp directory whose names begin installer-index-: ${otherFolders()}.`);

  const held = [];
  const hold = (s) => held.push(String(s));
  const failed = [];
  const runs = [];
  let calls = 0;
  let code = 1;
  try {
    step = 'make the rehearsal folder';
    mkdirSync(FOLDER);
    say(`Rehearsal folder: ${FOLDER}`);
    try {
      const columns = JSON.parse(readFileSync(join(ROOT, 'docs', 'quickbase', 'columns.json'), 'utf8'));
      const counties = JSON.parse(readFileSync(join(ROOT, 'public', 'geo', 'counties.json'), 'utf8'));
      const runOnce = async (n) => {
        step = `run ${n}`;
        if (calls + MAX_CALLS_PER_CLIENT > MOST_CALLS) {
          hold(`REHEARSAL: run ${n} not started: with ${calls} calls sent, it could take the rehearsal past ${MOST_CALLS}.`);
          failed.push(`run ${n} not started (call limit)`);
          return null;
        }
        const out = join(FOLDER, `run-${n}`);
        mkdirSync(out);
        hold(`--- run ${n}: what the job printed`);
        const outcome = await main({ args: ['--out', out], env: {}, root: ROOT, io: { ...io, log: (s) => hold(`  run ${n} | ${s}`) } });
        calls += outcome.calls.length;
        const files = {};
        for (const name of ['installers.json', 'territory.json', 'build.json']) {
          const p = join(out, name);
          if (existsSync(p)) files[name] = readFileSync(p, 'utf8');
        }
        const r = { n, outcome, files };
        runs.push(r);
        if (outcome.code !== 0) failed.push(`run ${n} ended with an error`);
        return r;
      };

      let a = await runOnce(1);
      let b = a ? await runOnce(2) : null;
      const sameFiles = (x, y) => x && y && ['installers.json', 'territory.json'].every((k) => x.files[k] !== undefined && y.files[k] !== undefined && sha(x.files[k]) === sha(y.files[k]));
      let pairs = 1;
      if (a && b && a.outcome.code === 0 && b.outcome.code === 0 && !sameFiles(a, b)) {
        hold('J10: the two runs differ; a record may have changed between them, so the pair is run once more.');
        pairs = 2;
        a = await runOnce(3);
        b = a ? await runOnce(4) : null;
      }

      step = 'work out the shape of what was read';
      const first = runs[0];
      if (first && first.outcome.read && first.outcome.read.rows) {
        const table = shapeTable(first.outcome.read.rows, columns);
        hold('--- how each of the 62 columns asked for came back (run 1), by column');
        for (const l of table.lines) hold(l);
        hold('--- how a blank came back, by kind of column');
        for (const l of table.summary) hold(l);
      } else {
        hold('--- the records were not read, so the shape of what was read cannot be worked out');
      }

      step = 'work out J1 to J15';
      hold('--- J1 to J15 on the real records');
      const both = [a, b].filter(Boolean);
      const okRuns = both.length === 2 && both.every((r) => r.outcome.code === 0);
      const result = (id, ok, text) => { hold(`${id} ${ok ? 'PASS' : 'FAIL'}: ${text}`); if (!ok) failed.push(id); };
      for (const r of runs) {
        const tally = new Map();
        for (const c of r.outcome.calls) tally.set(c, (tally.get(c) || 0) + 1);
        const listed = [...tally].every(([c, k]) => r.outcome.lines.includes(`  ${c} x${k}`)) && r.outcome.lines.includes(`QuickBase calls: ${r.outcome.calls.length}`);
        result('J1', listed && r.outcome.calls.length > 0, `run ${r.n}: ${r.outcome.calls.length} calls, ${tally.size} kinds, every call listed by method and address`);
      }
      if (okRuns) {
        for (const r of both) {
          const build = JSON.parse(r.files['build.json']);
          const totals = r.outcome.read.totals;
          const same = build.counts.installers === totals.master && build.counts.contacts === totals.contacts && build.counts.territoryRows === totals.territory;
          result('J2', same, `run ${r.n}: the counts in build.json equal QuickBase's own totals (${totals.master}, ${totals.contacts}, ${totals.territory})`);
        }
      } else result('J2', false, 'both runs must write their files to compare build.json with the totals');
      for (const r of runs) {
        const c7 = r.outcome.checks.find((c) => c.check === 7);
        result('J8', Boolean(c7 && c7.passed), `run ${r.n}: the ${c7 ? c7.counts.columnsWatched : 69} columns watched ${c7 && c7.passed ? 'still match' : 'do not all match'} columns.json`);
      }
      result('J10', Boolean(okRuns && sameFiles(a, b)), `the two runs${pairs === 2 ? ' of the second pair' : ''} wrote the same installers.json and the same territory.json (SHA-256)`);
      if (okRuns) {
        const ins = JSON.parse(a.files['installers.json']);
        const ter = JSON.parse(a.files['territory.json']);
        const build = JSON.parse(a.files['build.json']);
        const k = countsFrom(ins, ter, build, counties);
        result('J11', k.countyIdsNotText === 0, `${k.countyIds} county ids in territory.json, ${k.countyIdsNotText} not text; ${k.countyIdsWithZero} begin with a zero`);
        const second = secondGapCount(a.outcome.read.rows);
        result('J12', JSON.stringify(second) === JSON.stringify(build.gaps), `gap counts ${build.gaps.noQuoting}, ${build.gaps.noScheduling}, ${build.gaps.neither}; second count ${second.noQuoting}, ${second.noScheduling}, ${second.neither}`);
        const lc = lastConfirmedCheck(a.outcome.read.rows, ins);
        result('J13', lc.otherStatusWritten === 0 && lc.confirmedDatedMissing === 0, `lastConfirmed written on ${lc.otherStatusWritten} installer(s) with another status; missing on ${lc.confirmedDatedMissing} of ${lc.confirmedDated} CONFIRMED BY PARTNER installers whose date is filled`);
        result('J14', k.departedOnRow === 0, `${k.departedOnRow} row place(s) hold a departed contact`);
      } else {
        for (const id of ['J11', 'J12', 'J13', 'J14']) result(id, false, 'both runs must write their files to work this out');
      }
      const most = mostInTenSeconds(runs.flatMap((r) => r.outcome.sentAt));
      result('J15', most < 100, `at most ${most} calls in any 10 seconds, across all runs`);
      for (const r of runs) {
        const passed = r.outcome.checks.length === 7 && r.outcome.checks.every((c) => c.passed);
        result('checks', passed, `run ${r.n}: ${r.outcome.checks.filter((c) => c.passed).length} of the seven checks passed${r.outcome.error ? `; the run stopped with an error of kind ${r.outcome.error.kind} at step "${r.outcome.error.step}"${r.outcome.error.status !== undefined ? `, QuickBase status ${r.outcome.error.status}` : ''}` : ''}`);
      }

      step = 'work out what the files hold';
      const source = first && (first.files['installers.json'] ? first.files : (first.outcome.shaped ? { 'installers.json': first.outcome.shaped.installersText, 'territory.json': first.outcome.shaped.territoryText } : null));
      if (source && source['installers.json']) {
        const ins = JSON.parse(source['installers.json']);
        const ter = JSON.parse(source['territory.json']);
        const build = source['build.json'] ? JSON.parse(source['build.json']) : null;
        const e = emptiesIn(ins, ter, build || {});
        hold('--- empties in the three files (run 1)');
        hold(`  null ${e.null}; empty text ${e.emptyText}; empty list ${e.emptyList}; empty group ${e.emptyGroup}`);
        hold(`  always written: installers with no contact (contacts []) ${e.installersWithNoContact}; contacts with nothing filled ({}) ${e.contactsWithNothingFilled}; empty rows ${e.emptyRows}`);
        if (e.null || e.emptyText || e.emptyList || e.emptyGroup) failed.push('empties');
        const k = countsFrom(ins, ter, build, counties);
        hold(`  dates written ${k.datesWritten}, not written like 2026-10-06: ${k.datesNotLikeIso}`);
        hold(`  office states written ${k.officeStates}, not among the county list's state codes: ${k.officeStatesNotInList}, of which written as a state's full name: ${k.officeStatesWrittenAsName}`);
        if (k.datesNotLikeIso) failed.push('dates');

        step = 'work out the counts beside October 6';
        const c = (build && build.counts) || first.outcome.shaped.counts;
        const g = (build && build.gaps) || first.outcome.shaped.gaps;
        const beside = (label, today, then) => hold(`  ${label}: ${today} (October 6: ${then})`);
        hold('--- counts, beside what QuickBase held on October 6 (a difference is reported, not fixed)');
        beside('installers', c.installers, OCTOBER_6.installers);
        beside('contacts', c.contacts, OCTOBER_6.contacts);
        beside('territory rows', c.territoryRows, OCTOBER_6.territoryRows);
        beside('counted twice', c.duplicateTerritoryRows, OCTOBER_6.duplicateTerritoryRows);
        beside('installers with territory', c.installersWithTerritory, OCTOBER_6.installersWithTerritory);
        beside('installers without territory', c.installersWithoutTerritory, OCTOBER_6.installersWithoutTerritory);
        beside('counties covered', c.countiesCovered, OCTOBER_6.countiesCovered);
        beside('states covered', k.statesCovered, OCTOBER_6.statesCovered);
        for (const s of c.byStatus) beside(`status ${s.status}`, s.installers, OCTOBER_6.byStatus[s.status]);
        beside('no quoting contact', g.noQuoting, OCTOBER_6.noQuoting);
        beside('no scheduling contact', g.noScheduling, OCTOBER_6.noScheduling);
        beside('neither', g.neither, OCTOBER_6.neither);
        for (const [key, label] of [['nonUnionST', 'rates written: Non-Union ST'], ['nonUnionOT', 'rates written: Non-Union OT'], ['unionST', 'rates written: Union ST'],
          ['unionOT', 'rates written: Union OT'], ['allFourRates', 'rates written: all four'], ['noRates', 'rates written: none'],
          ['mobilization', 'mobilization written'], ['ratesValidThrough', 'rates valid through written']]) beside(label, k[key], OCTOBER_6[key]);
        hold('--- counts not made before');
        hold(`  quoting place holds a quoting contact ${k.quotingPlace.holder}, a stand-in ${k.quotingPlace.standIn}, nobody ${k.quotingPlace.nobody}`);
        hold(`  scheduling place holds a scheduling contact ${k.schedulingPlace.holder}, a stand-in ${k.schedulingPlace.standIn}, nobody ${k.schedulingPlace.nobody}`);
        hold(`  rows where one person fills both places ${k.onePersonBoth}`);
        hold(`  rows where a contact who cannot be reached fills a place ${k.unreachableFills}`);
        hold(`  size in bytes: installers.json ${Buffer.byteLength(source['installers.json'])}; territory.json ${Buffer.byteLength(source['territory.json'])}; build.json ${source['build.json'] ? Buffer.byteLength(source['build.json']) : 'not written'}`);
        if (first.outcome.shaped && first.outcome.shaped.extra) hold(`  territory rows whose tier is neither Tier 1 nor Tier 2: ${first.outcome.shaped.extra.tierNotOneOrTwo}`);
      } else {
        hold('--- nothing was shaped, so the files and counts cannot be worked out');
        failed.push('nothing shaped');
      }
      for (const r of runs) {
        const pages = r.outcome.read && r.outcome.read.pages;
        hold(`  run ${r.n}: ${r.outcome.calls.length} calls; rows to a page: ${pages ? TABLE_ORDER.map((t) => `${t.name} ${(pages[t.key] || []).join(', ')}`).join('; ') : 'none read'}`);
      }
      hold(`  calls in all, across the rehearsal: ${calls}`);

      step = 'set this laptop beside the published files';
      try {
        if (okRuns) {
          const beside = compareWithPublished(a.files);
          for (const l of beside.lines) hold(l);
          if (beside.notInOrder.length) failed.push(`not in this laptop's order: ${beside.notInOrder.join(', ')}`);
        } else {
          hold('--- this laptop beside the files published in public/data: the runs did not both write their files, so there is nothing to set beside it');
        }
      } catch (e) {
        hold(`REHEARSAL: an error of kind ${kindOfError(e)} at step "${step}"`);
        failed.push(`an error at step "${step}"`);
      }
    } catch (e) {
      hold(`REHEARSAL: an error of kind ${kindOfError(e)} at step "${step}"`);
      failed.push(`an error at step "${step}"`);
    }

    step = 'leak scan';
    try {
      const { values, skipped } = valuesToFind(runs.map((r) => r.outcome.read));
      const heldHits = hitsIn(held.join('\n'), values, false);
      const fileHits = [];
      const files = repositoryFiles();
      const inFiles = values.filter((v) => v.inFiles);
      for (const f of files) {
        for (const h of hitsIn(readFileSync(f.path, 'utf8'), inFiles, true)) fileHits.push({ ...h, where: f.rel });
      }
      say(`--- leak scan: ${values.length} values looked for, ${skipped} skipped (shorter than 5 characters, or made only of words the job and the rehearsal print anyway); ${held.length} lines held back; ${files.length} repository files`);
      if (heldHits.length || fileHits.length) {
        for (const h of heldHits) say(`LEAK: ${h.kind} in what was held back, line ${h.line}`);
        for (const h of fileHits) say(`LEAK: ${h.kind} in ${h.where}, line ${h.line}`);
        say('REHEARSAL FAILED: the leak scan found the hits above. Nothing held back is printed.');
        code = 1;
      } else {
        say('--- leak scan: no hit. What was held back:');
        for (const l of held) say(l);
        if (failed.length) {
          say(`REHEARSAL FAILED: ${[...new Set(failed)].join('; ')}.`);
          code = 1;
        } else {
          say(`REHEARSAL PASSED: ${runs.length} runs, ${calls} calls.`);
          code = 0;
        }
      }
    } catch (e) {
      say(`REHEARSAL FAILED: an error of kind ${kindOfError(e)} at step "${step}". Nothing held back is printed.`);
      code = 1;
    }
  } catch (e) {
    say(`REHEARSAL FAILED: an error of kind ${kindOfError(e)} at step "${step}".`);
    code = 1;
  } finally {
    const gone = removeFolder();
    say(gone ? `The rehearsal folder is deleted, and gone: ${FOLDER}` : `REHEARSAL: THE REHEARSAL FOLDER COULD NOT BE DELETED: ${FOLDER}`);
    if (!gone) code = 1;
    say(`Other folders in the temp directory whose names begin installer-index-: ${otherFolders()}.`);
  }
  return code;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) process.exitCode = await rehearse();
