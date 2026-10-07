/**
 * The job's tests, on made-up installers: each line of step 6 of the daily job's prompt, the
 * client's tests of step 3, and the check of the workflow file.
 *
 * Each test has sound cases, on which it must pass, and broken cases (a broken input or a
 * broken stand-in), on which it must fail. npm run check:job (scripts\check-job.mjs) runs the
 * sound cases. npm run check:selftest runs both, so that a test that cannot fail is caught. A
 * broken case may carry mustSay: the self-test then also asks that the failure says it, so
 * that a case fails for the reason it was broken.
 *
 * Nothing here reaches QuickBase, loads the real key, reads the real environment or changes
 * the repository. Temporary folders are made in the system temp directory with names that
 * begin installer-index-, and removeTemps deletes them.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { ApiError, keyFrom, makeClient, MAX_CALLS_PER_CLIENT, PAGE_SIZE, readAll, Refused, REALM, APP_ID, TABLES } from '../job/lib/quickbase.mjs';
import { ASKED, WATCHED } from '../job/fields.mjs';
import { chooseRow } from '../job/row-contacts.mjs';
import { shape, STATUSES } from '../job/shape.mjs';
import { CHECK_NAMES } from '../job/checks.mjs';
import { main } from '../job/run.mjs';
import { hitsIn, valuesToFind } from '../job/rehearse.mjs';
import { checkWorkflow } from './checks.mjs';
import {
  COLUMNS, FAKE_KEY, FINGERPRINTS_PATH, FIXED_TIME, FIXTURE, ROOT, fieldsOf, madeUpGitHub, madeUpRepo, madeUpValues,
  runJob, standInClock, standInQuickBase, tempDir, toRecords,
} from './job-standins.mjs';

export const TESTS = [];
const test = (line, label, sound, broken) => TESTS.push({ line, label, sound, broken });
const ok = (why) => ({ ok: true, why });
const no = (why) => ({ ok: false, why });
const sha = (text) => createHash('sha256').update(text).digest('hex');
const DATA_FILES = ['installers.json', 'territory.json', 'build.json'];

/** Every file directly in a folder: { name: text }. */
function readFolder(dir) {
  if (!existsSync(dir)) return {};
  return Object.fromEntries(readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile()).map((n) => [n, readFileSync(join(dir, n), 'utf8')]));
}

/** A run of the job with --out into a fresh temporary folder. */
async function runOut({ args = [], ...opts } = {}) {
  const out = tempDir('out');
  const r = await runJob({ args: ['--out', out, ...args], ...opts });
  return { ...r, out, files: readFolder(out) };
}

/** A run of the job with --publish on a made-up GitHub, into a made-up repository folder. */
async function runPublish({ args = [], before, ...opts } = {}) {
  const root = madeUpRepo('publish');
  const data = join(root, 'public', 'data');
  if (before) {
    mkdirSync(data, { recursive: true });
    for (const [name, text] of Object.entries(before)) writeFileSync(join(data, name), text);
  }
  const r = await runJob({ args: ['--publish', ...args], env: madeUpGitHub(), root, ...opts });
  return { ...r, root, data, files: readFolder(data) };
}

/** The made-up records with a change made to a copy. */
function changed(mutate) {
  const records = structuredClone(toRecords());
  mutate(records);
  return records;
}
const set = (record, id, value) => { record[String(id)] = { value }; };

let baseRun = null;
/** The run of the job on the made-up installers that most tests look at, made once. */
const base = () => (baseRun ||= runOut());

const installersOf = (files) => JSON.parse(files['installers.json']).installers;
const byIdOf = (files) => new Map(installersOf(files).map((i) => [i.id, i]));

/* ======================================================= section 4.8, one installer each */

/** A row as the tags of the contacts in it, laid out like an expected row of the fixture. */
function describeRow(inst) {
  const place = (p) => {
    if (!p) return undefined;
    const c = inst.contacts[p.contact];
    const tag = c ? (c.title ?? '(no title)') : '(no such contact)';
    if (!p.standIn) return tag;
    return p.role !== undefined ? { standIn: tag, role: p.role } : { standIn: tag };
  };
  const extra = Object.keys(inst.row).filter((k) => !['quoting', 'scheduling', 'gap'].includes(k));
  return JSON.stringify({ quoting: place(inst.row.quoting), scheduling: place(inst.row.scheduling), gap: inst.row.gap, ...(extra.length ? { extra } : {}) });
}

function rowTest(m, files) {
  const inst = byIdOf(files).get(m.id);
  if (!inst) return no(`${m.id} is not in installers.json`);
  const want = JSON.stringify({ quoting: m.expect.quoting, scheduling: m.expect.scheduling, gap: m.expect.gap });
  const got = describeRow(inst);
  if (got !== want) return no(`${m.id}: the row is ${got}, the rules say ${want}`);
  if (m.contactOrder) {
    const order = JSON.stringify(inst.contacts.map((c) => c.title ?? null));
    if (order !== JSON.stringify(m.contactOrder)) return no(`${m.id}: the contacts are in the order ${order}`);
  }
  return ok(`${m.id}: ${got}`);
}

/** A stand-in that chooses the wrong row: the real choice with the quoting place moved one contact on. */
const wrongRow = (entries) => {
  const r = chooseRow(entries);
  const row = { ...r.row, quoting: r.row.quoting ? { ...r.row.quoting, contact: r.row.quoting.contact + 1 } : { contact: 0 } };
  return { ...r, row };
};
let wrongRun = null;
const wrong = () => (wrongRun ||= runOut({ io: { shape: (a) => shape({ ...a, chooseRow: wrongRow }) } }));

for (const m of FIXTURE.master.filter((x) => x.expect)) {
  test('4.8', m.case,
    [{ label: 'the row the job chose', run: async () => rowTest(m, (await base()).files) }],
    [{ label: 'a stand-in that chooses the wrong row', run: async () => rowTest(m, (await wrong()).files) }]);
}

/* ============================================= an accented letter, a digit first, a rate of 0 */

function namesTest(text) {
  const list = JSON.parse(text).installers;
  const problems = [];
  if (!text.includes('"company":"Éclat Interiors"')) problems.push('the accented company is not written as plain UTF-8');
  if (list[list.length - 1]?.company !== 'Éclat Interiors') problems.push('the accented company is not last');
  if (!/^\d/.test(list[0]?.company || '')) problems.push('the company that starts with a digit is not first');
  const zero = list.find((i) => i.id === 'FAKE-024');
  if (!zero || !zero.rates || zero.rates.nonUnionST !== 0) problems.push('the rate of 0 is not written');
  return problems.length ? no(problems.join('; ')) : ok('accented letter kept and last, digit first, rate of 0 written');
}
test('made-up installers', 'a name with an accented letter, a name that starts with a digit, and a rate of 0',
  [{ label: 'installers.json as the job wrote it', run: async () => namesTest((await base()).files['installers.json']) }],
  [
    { label: 'the accented letter written as \\u00c9', run: async () => namesTest((await base()).files['installers.json'].replace('"Éclat', '"\\u00c9clat')) },
    { label: 'the installers in a different order', run: async () => {
      const lines = (await base()).files['installers.json'].split('\n');
      const body = lines.slice(1, -2).map((l) => l.replace(/,$/, ''));
      body.push(body.shift());
      return namesTest(`${lines[0]}\n${body.join(',\n')}\n]}\n`);
    } },
    { label: 'the rate of 0 left out', run: async () => namesTest((await base()).files['installers.json'].replace('"nonUnionST":0,', '')) },
  ]);

/* ================================================================ the shape of the files */

const INSTALLER_KEYS = ['id', 'company', 'status', 'lastConfirmed', 'office', 'shipping', 'shippingNotApplicable',
  'secondShippingNotApplicable', 'rates', 'mobilization', 'ratesValidThrough', 'shopStatus', 'pricingNotes', 'tier2Charge',
  'coverageNote', 'travelNote', 'travelNoteNotApplicable', 'warehousing', 'emr', 'emrNotApplicable', 'paperwork', 'notes',
  'anythingElse', 'contacts', 'row', 'territory'];
const ADDRESS_KEYS = ['street1', 'street2', 'city', 'state', 'postalCode', 'country'];
const KEYS = {
  office: ADDRESS_KEYS, shipping: [...ADDRESS_KEYS, 'which'], rates: ['nonUnionST', 'nonUnionOT', 'unionST', 'unionOT'],
  tier2Charge: ['basis', 'unit', 'unitOther', 'amount', 'relation'], warehousing: ['available', 'at'],
  paperwork: ['coiOnFile', 'coiValidThrough', 'agreementOnFile'],
  contact: ['name', 'title', 'email', 'email2', 'phone', 'roles', 'procedure', 'departed', 'confirmedRecord'],
  row: ['quoting', 'scheduling', 'gap'], place: ['contact', 'standIn', 'role'], territory: ['states', 'countyCount'],
  territoryState: ['state', 'country', 'tier1Counties', 'tier2Counties'],
};
const COUNT_KEYS = ['installers', 'contacts', 'territoryRows', 'duplicateTerritoryRows', 'installersWithTerritory',
  'installersWithoutTerritory', 'countiesCovered', 'byStatus'];

/** Whether the names of `obj` come in the order `order` gives, with none that is not in it. */
function inOrder(obj, order) {
  const keys = Object.keys(obj);
  let at = -1;
  for (const k of keys) {
    const i = order.indexOf(k);
    if (i <= at) return false;
    at = i;
  }
  return true;
}

/** Every null, empty text, empty list and empty group in a parsed file, by path. */
function empties(value, path = '', out = []) {
  if (value === null) out.push(`${path} null`);
  else if (value === '') out.push(`${path} empty text`);
  else if (Array.isArray(value)) {
    if (!value.length) out.push(`${path} empty list`);
    value.forEach((v, i) => empties(v, `${path}[${i}]`, out));
  } else if (typeof value === 'object') {
    if (!Object.keys(value).length) out.push(`${path} empty group`);
    for (const [k, v] of Object.entries(value)) empties(v, `${path}.${k}`, out);
  }
  return out;
}

/** The empties section 3.6 allows: an installer's contacts when it has none, and a contact with nothing filled. */
const allowedEmpty = (e) => /^\.installers\[\d+\]\.contacts empty list$/.test(e) || /^\.installers\[\d+\]\.contacts\[\d+\] empty group$/.test(e);

function lineShape(text, open, what) {
  const lines = text.split('\n');
  if (lines[0] !== open || lines[lines.length - 1] !== '' || lines[lines.length - 2] !== ']}') return `${what} does not start and end as it should`;
  return null;
}

function shapeTest(files) {
  const p = [];
  for (const name of DATA_FILES) {
    const t = files[name];
    if (typeof t !== 'string') { p.push(`${name} is missing`); continue; }
    if (t.includes('\r')) p.push(`${name} has a CR line ending`);
    if (t.charCodeAt(0) === 0xfeff) p.push(`${name} starts with a byte-order mark`);
    if (!t.endsWith('\n') || t.endsWith('\n\n')) p.push(`${name} does not end with one LF`);
  }
  if (p.length) return no(p.join('; '));
  let ins;
  let ter;
  let bld;
  try {
    ins = JSON.parse(files['installers.json']);
    ter = JSON.parse(files['territory.json']);
    bld = JSON.parse(files['build.json']);
  } catch { return no('a file does not parse'); }
  if (JSON.stringify(Object.keys(ins)) !== '["schema","installers"]' || ins.schema !== 1) p.push('installers.json: not "schema": 1 then "installers"');
  if (JSON.stringify(Object.keys(ter)) !== '["schema","states"]' || ter.schema !== 1) p.push('territory.json: not "schema": 1 then "states"');
  if (JSON.stringify(Object.keys(bld)) !== '["schema","builtAt","counts","gaps","checks","files"]' || bld.schema !== 1) p.push('build.json: the names are not those of section 3.6, in order');
  const l1 = lineShape(files['installers.json'], '{"schema":1,"installers":[', 'installers.json');
  if (l1) p.push(l1);
  else {
    const lines = files['installers.json'].split('\n').slice(1, -2);
    if (lines.length !== ins.installers.length) p.push('installers.json: not one installer to a line');
  }
  const l2 = lineShape(files['territory.json'], '{"schema":1,"states":[', 'territory.json');
  if (l2) p.push(l2);
  else {
    const countyLines = files['territory.json'].split('\n').filter((l) => l.startsWith('{"id":')).length;
    if (countyLines !== ter.states.reduce((n, s) => n + s.counties.length, 0)) p.push('territory.json: not one county to a line');
  }
  ins.installers.forEach((i, n) => {
    if (!inOrder(i, INSTALLER_KEYS)) p.push(`installer ${n}: names out of order`);
    if (!Array.isArray(i.contacts)) p.push(`installer ${n}: contacts not written`);
    if (!i.row || typeof i.row !== 'object') p.push(`installer ${n}: row not written`);
    for (const k of ['office', 'rates', 'tier2Charge', 'warehousing', 'paperwork', 'territory']) if (i[k] && !inOrder(i[k], KEYS[k])) p.push(`installer ${n}: ${k} names out of order`);
    for (const s of i.shipping || []) if (!inOrder(s, KEYS.shipping)) p.push(`installer ${n}: shipping names out of order`);
    for (const c of i.contacts || []) if (!inOrder(c, KEYS.contact)) p.push(`installer ${n}: contact names out of order`);
    if (i.row && !inOrder(i.row, KEYS.row)) p.push(`installer ${n}: row names out of order`);
    for (const k of ['quoting', 'scheduling']) if (i.row && i.row[k] && !inOrder(i.row[k], KEYS.place)) p.push(`installer ${n}: ${k} place names out of order`);
    for (const s of (i.territory && i.territory.states) || []) if (!inOrder(s, KEYS.territoryState)) p.push(`installer ${n}: territory state names out of order`);
  });
  for (const s of ter.states) {
    if (JSON.stringify(Object.keys(s)) !== '["state","country","counties"]') p.push(`territory.json state ${s.state}: names not state, country, counties`);
    for (const c of s.counties) if (!inOrder(c, ['id', 'tier1Installers', 'tier2Installers'])) p.push(`territory.json county ${c.id}: names out of order`);
  }
  if (JSON.stringify(Object.keys(bld.counts || {})) !== JSON.stringify(COUNT_KEYS)) p.push('build.json counts: names not those of section 3.6, in order');
  if (JSON.stringify((bld.counts?.byStatus || []).map((s) => s.status)) !== JSON.stringify(STATUSES)) p.push('build.json byStatus: not every line of the five statuses, in order');
  if (JSON.stringify(Object.keys(bld.gaps || {})) !== '["noQuoting","noScheduling","neither"]') p.push('build.json gaps: names not in order');
  if (!Array.isArray(bld.checks) || bld.checks.length !== 7 || bld.checks.some((c, i) => c.check !== i + 1 || c.name !== CHECK_NAMES[i])) p.push('build.json checks: not the seven, in order, with their names');
  if (JSON.stringify(Object.keys(bld.files || {})) !== '["installers.json","territory.json"]') p.push('build.json files: not the two fingerprints');
  const bad = [...empties(ins).filter((e) => !allowedEmpty(e)), ...empties(ter), ...empties(bld)];
  if (bad.length) p.push(`${bad.length} empty value(s) written: ${bad.slice(0, 3).join(', ')}`);
  // FAKE-024 and county 39153 are in Territory twice, and so are FAKE-024 and county 01005.
  const twice = ter.states.flatMap((s) => s.counties).filter((c) => c.id === '39153' || c.id === '01005');
  const listed = twice.flatMap((c) => [...(c.tier1Installers || []), ...(c.tier2Installers || [])]).filter((id) => id === 'FAKE-024').length;
  if (twice.length !== 2 || listed !== 2) p.push('an installer and county covered twice is not written once');
  if (bld.counts?.duplicateTerritoryRows !== 2) p.push('the two extra territory rows are not counted');
  return p.length ? no(p.join('; ')) : ok('names and order of section 3.6; empties left out; contacts, row and byStatus written; a county covered twice written once and counted');
}

const editLine = (text, id, f) => text.split('\n').map((l) => (l.includes(`"id":"${id}"`) ? f(l) : l)).join('\n');
test('the shape', 'the names of section 3.6 in order, empties left out, what is always written, a county covered twice',
  [{ label: 'the three files as the job wrote them', run: async () => shapeTest((await base()).files) }],
  [
    { label: 'company and status the other way round', run: async () => {
      const f = (await base()).files;
      return shapeTest({ ...f, 'installers.json': editLine(f['installers.json'], 'FAKE-001', (l) => {
        const i = JSON.parse(l.replace(/,$/, ''));
        const { id, company, status, ...rest } = i;
        return `${JSON.stringify({ id, status, company, ...rest })}${l.endsWith(',') ? ',' : ''}`;
      }) });
    } },
    { label: 'an empty value written', run: async () => {
      const f = (await base()).files;
      return shapeTest({ ...f, 'installers.json': f['installers.json'].replace('"anythingElse":"Made-up remark."', '"anythingElse":""') });
    } },
    { label: 'contacts left out of an installer with none', run: async () => {
      const f = (await base()).files;
      return shapeTest({ ...f, 'installers.json': f['installers.json'].replace('"contacts":[],', '') });
    } },
    { label: 'a line of byStatus left out', run: async () => {
      const f = (await base()).files;
      const b = JSON.parse(f['build.json']);
      b.counts.byStatus.pop();
      return shapeTest({ ...f, 'build.json': `${JSON.stringify(b, null, 2)}\n` });
    } },
    { label: 'a county covered twice written twice', run: async () => {
      const f = (await base()).files;
      return shapeTest({ ...f, 'territory.json': f['territory.json'].replace('{"id":"39153","tier1Installers":["FAKE-024"],"tier2Installers":["FAKE-001"]}', '{"id":"39153","tier1Installers":["FAKE-024"],"tier2Installers":["FAKE-001","FAKE-024"]}') });
    } },
    { label: 'CR LF line endings', run: async () => {
      const f = (await base()).files;
      return shapeTest({ ...f, 'territory.json': f['territory.json'].replace(/\n/g, '\r\n') });
    } },
  ]);

/* ======================================================================= fingerprints */

const frozen = () => ({ now: () => FIXED_TIME, sleep: async () => {} });
async function fingerprintTest(io = {}) {
  if (!existsSync(FINGERPRINTS_PATH)) return no('scripts/fixtures/fingerprints.json is missing');
  const kept = JSON.parse(readFileSync(FINGERPRINTS_PATH, 'utf8'));
  const r = await runOut({ clock: frozen(), io });
  if (r.outcome.code !== 0) return no('the job did not write the files');
  const differ = DATA_FILES.filter((n) => sha(r.files[n]) !== kept.files[n]);
  return differ.length ? no(`no longer gives the kept fingerprint: ${differ.join(', ')}`) : ok('the three files have the kept fingerprints');
}
test('fingerprints', 'the made-up installers, with builtAt held fixed, give the SHA-256 kept in the repository',
  [{ label: 'the job as it is', run: () => fingerprintTest() }],
  [{ label: 'a stand-in that writes one character more', run: () => fingerprintTest({ shape: (a) => { const s = shape(a); return { ...s, territoryText: `${s.territoryText.slice(0, -1)} \n` }; } }) }]);

/* ================================================================ rule 19's banned words */

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]));
}
const jobFiles = () => filesUnder(resolve(ROOT, 'job')).filter((f) => f.endsWith('.mjs'))
  .map((f) => ({ path: relative(ROOT, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }));
const BANNED = /localeCompare|\bIntl\b|toLocale/;
function bannedTest(files) {
  const hits = files.filter((f) => BANNED.test(f.text)).map((f) => f.path);
  return hits.length ? no(`banned words in ${hits.join(', ')}`) : ok(`${files.length} files in job/, none uses localeCompare, Intl or toLocale`);
}
test('banned words', 'nothing in job/ sorts or formats by the machine\'s language settings',
  [{ label: 'job/ as it is', run: async () => bannedTest(jobFiles()) }],
  [
    { label: 'a planted localeCompare', run: async () => bannedTest([...jobFiles(), { path: 'job/planted.mjs', text: `list.sort((a, b) => a.${'locale'}Compare(b));\n` }]) },
    { label: 'a planted Intl collator', run: async () => bannedTest([...jobFiles(), { path: 'job/planted.mjs', text: `const c = new ${'In'}tl.Collator();\n` }]) },
    { label: 'a planted toLocaleDateString', run: async () => bannedTest([...jobFiles(), { path: 'job/planted.mjs', text: `d.to${'Locale'}DateString();\n` }]) },
  ]);

/* ===================================================== the made-up key, put together when run */

function repoTextFiles() {
  const skip = new Set(['.git', 'node_modules', 'review-screens', 'data']);
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return skip.has(e.name) ? [] : walk(join(dir, e.name));
    return e.name.startsWith('.env') ? [] : [join(dir, e.name)];
  });
  return walk(ROOT).map((f) => ({ path: relative(ROOT, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }));
}
function keyTest(files) {
  const hits = files.filter((f) => f.text.includes(FAKE_KEY)).map((f) => f.path);
  return hits.length ? no(`the made-up key is written in ${hits.join(', ')}`) : ok(`${files.length} files; none holds the made-up key, which is put together when the tests run`);
}
test('made-up key', 'the made-up key is put together when the tests run, and no file holds it',
  [{ label: 'the repository as it is', run: async () => keyTest(repoTextFiles()) }],
  [{ label: 'a file holding the made-up key', run: async () => keyTest([...repoTextFiles(), { path: 'scripts/planted.mjs', text: `const key = '${FAKE_KEY}';\n` }]) }]);

/* ========================================================================= where it writes */

/** runner(args, env, root, tmpdir) => { refused, wrote }. */
async function whereTest(runner) {
  const top = tempDir('where');
  const sysTemp = join(top, 'system-temp');
  mkdirSync(sysTemp);
  const make = (...parts) => { const d = join(...parts); mkdirSync(d, { recursive: true }); return d; };
  const full = make(sysTemp, 'installer-index-full');
  writeFileSync(join(full, 'already-here.txt'), 'x');
  const cases = [
    ['a folder that is missing', ['--out', join(sysTemp, 'installer-index-missing')], {}, true],
    ['a folder that is not empty', ['--out', full], {}, true],
    ['a folder outside the temp directory', ['--out', make(top, 'installer-index-outside')], {}, true],
    ['a folder without installer-index- in its name or above it', ['--out', make(sysTemp, 'plain-folder')], {}, true],
    ['no choice', [], {}, true],
    ['both choices', ['--out', make(sysTemp, 'installer-index-both'), '--publish'], madeUpGitHub(), true],
    ['--publish off GitHub', ['--publish'], {}, true],
    ['a folder inside one named installer-index-', ['--out', make(sysTemp, 'installer-index-parent', 'run-1')], {}, false],
    ['a folder named installer-index-', ['--out', make(sysTemp, 'installer-index-direct')], {}, false],
  ];
  const wrong = [];
  for (const [what, args, env, refuse] of cases) {
    const r = await runner(args, env, madeUpRepo('where'), sysTemp);
    if (r.refused !== refuse) wrong.push(`${what}: ${r.refused ? 'refused' : 'not refused'}`);
  }
  return wrong.length ? no(wrong.join('; ')) : ok(`${cases.length} cases: each refused or allowed as it should be`);
}
const realWhere = async (args, env, root, tmp) => {
  const { outcome } = await runJob({ args, env, root, io: { tmpdir: tmp } });
  return { refused: outcome.code === 2 && outcome.calls.length === 0 };
};
test('where it writes', '--out refuses a folder missing, not empty, outside temp or without installer-index-; no choice, both, and --publish off GitHub are refused',
  [{ label: 'the job as it is', run: () => whereTest(realWhere) }],
  [{ label: 'a stand-in job that refuses nothing', run: () => whereTest(async () => ({ refused: false })) }]);

async function publishTest(env) {
  const root = madeUpRepo('publish-ok');
  const { outcome } = await runJob({ args: ['--publish'], env, root });
  const files = readFolder(join(root, 'public', 'data'));
  const okRun = outcome.code === 0 && DATA_FILES.every((n) => typeof files[n] === 'string');
  return okRun ? ok('on a made-up GitHub, --publish wrote the three files into public/data of a made-up repository folder')
    : no(`--publish did not write the three files (exit ${outcome.code})`);
}
test('where it writes', '--publish on a made-up GitHub writes into a made-up repository folder',
  [{ label: 'a made-up GitHub', run: () => publishTest(madeUpGitHub()) }],
  [{ label: 'no GitHub', run: () => publishTest({}) }]);

/* ============================================================================ check 6 */

async function sameFilesTest(shapeFn) {
  const r = await runOut(shapeFn ? { io: { shape: shapeFn } } : {});
  const c6 = r.outcome.checks.find((c) => c.check === 6);
  return c6 && c6.passed && r.outcome.code === 0 ? ok('check 6 passed') : no(`check 6 ${c6 ? 'failed' : 'was not run'}; exit ${r.outcome.code}`);
}
function shapesDifferently() {
  let n = 0;
  return (a) => { const s = shape(a); n++; return n === 2 ? { ...s, installersText: s.installersText.replace('"schema":1', '"schema": 1') } : s; };
}
test('check 6', 'the same data gives the same files',
  [{ label: 'the job as it is', run: () => sameFilesTest() }],
  [{ label: 'a stand-in that shapes the same input differently the second time', run: () => sameFilesTest(shapesDifferently()) }]);

/* ================================================================================ J1 */

function callsTest(lines, outcome) {
  const counts = new Map();
  for (const c of outcome.calls) counts.set(c, (counts.get(c) || 0) + 1);
  const missing = [...counts].filter(([c, n]) => !lines.includes(`  ${c} x${n}`));
  const tables = new Set(Object.values(TABLES));
  const strange = outcome.calls.filter((c) => {
    const m = /^(GET|POST) https:\/\/api\.quickbase\.com\/v1\/(?:fields\?tableId=(\w+)|records\/query)$/.exec(c);
    return !m || (m[2] && !tables.has(m[2]));
  });
  const p = [];
  if (!outcome.calls.length) p.push('no call was made');
  if (missing.length) p.push(`${missing.length} call(s) not listed`);
  if (!lines.includes(`QuickBase calls: ${outcome.calls.length}`)) p.push('the total is not listed');
  if (strange.length) p.push(`${strange.length} call(s) not to the three tables by the REST interface`);
  return p.length ? no(p.join('; ')) : ok(`${outcome.calls.length} calls, each listed by method and address with how many times`);
}
test('J1', 'the job\'s report lists each call by method and address',
  [{ label: 'what the job printed', run: async () => { const b = await base(); return callsTest(b.lines, b.outcome); } }],
  [{ label: 'a report with the calls left out', run: async () => { const b = await base(); return callsTest(b.lines.filter((l) => !l.startsWith('  ')), b.outcome); } }]);

/* ================================================================================ J2 */

async function totalsTest(quickbase) {
  const records = toRecords();
  const r = await runOut({ records, quickbase });
  if (r.outcome.code !== 0) return no(`the job stopped (exit ${r.outcome.code})${r.lines.some((l) => l.includes("differ from QuickBase's own total")) ? ': rows read differ from the total' : ''}`);
  const counts = JSON.parse(r.files['build.json']).counts;
  const same = counts.installers === records.master.length && counts.contacts === records.contacts.length && counts.territoryRows === records.territory.length;
  return same ? ok('the counts in build.json equal the totals the stand-in reported') : no('the counts in build.json differ from the totals');
}
test('J2', 'the counts in build.json equal QuickBase\'s totals',
  [{ label: 'totals that match the rows', run: () => totalsTest({}) }],
  [
    { label: 'a stand-in reporting one contact more than it hands over', run: () => totalsTest({ totalShift: { contacts: 1 } }) },
    { label: 'a stand-in reporting one territory row fewer than it hands over', run: () => totalsTest({ totalShift: { territory: -1 } }) },
  ]);

/* ================================================================================ J3 */

const counted = toRecords();
const N = { installers: counted.master.length, contacts: counted.contacts.length, territoryRows: counted.territory.length };
const plantedBuild = (counts) => `${JSON.stringify({ schema: 1, builtAt: '2026-10-06T09:20:31Z', counts: { ...counts, duplicateTerritoryRows: 0 } }, null, 2)}\n`;

async function guardTest({ before, args = [], records, expectSkipped = false }) {
  const r = await runPublish({ before: before === undefined ? undefined : { 'build.json': before }, args, records });
  const c1 = r.outcome.checks.find((c) => c.check === 1);
  if (!c1) return no('check 1 was not run');
  if (r.outcome.code !== 0 || !c1.passed) return no(`check 1 failed (${Object.entries(c1.counts).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  const first = JSON.parse(r.files['build.json']).checks[0];
  if (expectSkipped && !(first.skipped === true && !('passed' in first))) return no('build.json does not write skipped in place of passed');
  if (!expectSkipped && first.passed !== true) return no('build.json does not write passed');
  return ok(expectSkipped ? 'check 1 skipped, and build.json says so' : 'check 1 passed');
}
test('J3', 'the count guard',
  [
    { label: 'a first run: no build.json yet', run: () => guardTest({}) },
    { label: 'the same counts as the last good run', run: () => guardTest({ before: plantedBuild(N) }) },
    { label: 'installers down by 5, contacts and territory rows down by just under 10 percent', run: () => guardTest({ before: plantedBuild({ installers: N.installers + 5, contacts: 68, territoryRows: 15 }) }) },
    { label: '--skip-count-guard with installers down by 6', run: () => guardTest({ before: plantedBuild({ ...N, installers: N.installers + 6 }), args: ['--skip-count-guard'], expectSkipped: true }) },
  ],
  [
    { label: 'installers down by 6', run: () => guardTest({ before: plantedBuild({ ...N, installers: N.installers + 6 }) }) },
    { label: 'contacts down by more than 10 percent', run: () => guardTest({ before: plantedBuild({ ...N, contacts: 69 }) }) },
    { label: 'territory rows down by more than 10 percent', run: () => guardTest({ before: plantedBuild({ ...N, territoryRows: 16 }) }) },
    { label: 'an earlier build.json that cannot be read', run: () => guardTest({ before: '{ "schema": 1, "counts": ' }) },
    { label: 'an earlier build.json without the counts', run: () => guardTest({ before: '{"schema":1}\n' }) },
    { label: '--skip-count-guard with no installer', run: () => guardTest({ args: ['--skip-count-guard'], records: { master: [], contacts: [], territory: [] }, expectSkipped: true }) },
  ]);

/* ============================================================================= J4 to J8 */

async function checkTest(n, opts = {}) {
  const r = await runOut(opts);
  const c = r.outcome.checks.find((x) => x.check === n);
  if (!c) return no(`check ${n} was not run`);
  if (!c.passed) return no(`check ${n} failed (${Object.entries(c.counts).map(([k, v]) => `${k} ${v}`).join(', ')})${r.outcome.code !== 0 && Object.keys(r.files).length === 0 ? '; nothing was written' : ''}`);
  return r.outcome.code === 0 ? ok(`check ${n} passed`) : no(`check ${n} passed but the run ended with exit ${r.outcome.code}`);
}
const orphanContact = () => changed((r) => { const c = structuredClone(r.contacts[0]); set(c, 6, 'FAKE-999'); r.contacts.push(c); });
const orphanTerritory = () => changed((r) => { const t = structuredClone(r.territory[0]); set(t, 6, 'FAKE-998'); r.territory.push(t); });
test('J4', 'every contact row and territory row points at an installer',
  [{ label: 'the made-up installers', run: () => checkTest(2) }],
  [
    { label: 'a planted contact row pointing at no installer', run: () => checkTest(2, { records: orphanContact() }) },
    { label: 'a planted territory row pointing at no installer', run: () => checkTest(2, { records: orphanTerritory() }) },
  ]);
test('J5', 'every county id is in the county list',
  [{ label: 'the made-up installers', run: () => checkTest(3) }],
  [{ label: 'a planted county id that is not in the list', run: () => checkTest(3, { records: changed((r) => { const t = structuredClone(r.territory[0]); set(t, 7, '99999'); r.territory.push(t); }) }) }]);
test('J6', 'no installer id twice',
  [{ label: 'the made-up installers', run: () => checkTest(4) }],
  [{ label: 'a planted second copy of an installer id', run: () => checkTest(4, { records: changed((r) => { const m = structuredClone(r.master[1]); set(m, 6, 'FAKE-001'); r.master.push(m); }) }) }]);
test('J7', 'every installer has a company and a known status',
  [{ label: 'the made-up installers', run: () => checkTest(5) }],
  [
    { label: 'a planted blank company', run: () => checkTest(5, { records: changed((r) => set(r.master[1], 25, '   ')) }) },
    { label: 'a planted sixth status', run: () => checkTest(5, { records: changed((r) => set(r.master[1], 13, 'ON HOLD')) }) },
  ]);
const fieldsWith = (tableId, id, change) => ({ [tableId]: fieldsOf(tableId).map((f) => (f.id === id ? { ...f, ...change } : f)) });
test('J8', 'every column the job reads keeps its label and type',
  [{ label: 'the columns of columns.json', run: () => checkTest(7) }],
  [
    { label: 'a changed label', run: () => checkTest(7, { quickbase: { fields: fieldsWith(TABLES.MASTER, 25, { label: 'Company name' }) } }) },
    { label: 'a changed type', run: () => checkTest(7, { quickbase: { fields: fieldsWith(TABLES.CONTACTS, 14, { fieldType: 'text' }) } }) },
  ]);

/* ================================================================================ J9 */

/** runner(opts) runs the job; J9 asks that after a failed check the files are as they were. */
async function asItWasTest(runner, failing) {
  const before = { 'installers.json': '{"schema":1,"installers":[\n]}\n', 'territory.json': '{"schema":1,"states":[\n]}\n', 'build.json': plantedBuild(N), 'notes.txt': 'made up\n' };
  const r = await runner({ before, ...failing.opts });
  const p = [];
  if (r.outcome.code === 0) p.push('the run did not end with an error');
  const names = Object.keys(r.files).sort().join(',');
  if (names !== Object.keys(before).sort().join(',')) p.push('the folder no longer holds the same files');
  for (const [n, t] of Object.entries(before)) if (r.files[n] !== undefined && sha(r.files[n]) !== sha(t)) p.push(`${n} changed`);
  if (!r.lines.some((l) => l.startsWith(`STOPPED: check ${failing.check} "${CHECK_NAMES[failing.check - 1]}" failed`))) p.push(`what it printed does not name check ${failing.check}`);
  return p.length ? no(p.join('; ')) : ok(`check ${failing.check} failed; every file is byte for byte as it was; the run ended with an error and named the check`);
}
const failing2 = { check: 2, opts: { records: orphanContact() } };
const failing7 = { check: 7, opts: { quickbase: { fields: fieldsWith(TABLES.MASTER, 25, { label: 'Company name' }) } } };
test('J9', 'after a failed check every file is as it was, the run ends with an error, and the check is named',
  [
    { label: 'check 2 failing', run: () => asItWasTest(runPublish, failing2) },
    { label: 'check 7 failing', run: () => asItWasTest(runPublish, failing7) },
  ],
  [{ label: 'a stand-in job that writes whether or not a check fails', run: () => asItWasTest(async (opts) => {
    const r = await runPublish(opts);
    writeFileSync(join(r.data, 'installers.json'), '{"schema":1,"installers":[\n{"id":"FAKE-001"}\n]}\n');
    return { ...r, files: readFolder(r.data) };
  }, failing2) }]);

/* =============================================================================== J10 */

async function twiceTest(shapeFor) {
  const clock = standInClock();
  const a = await runOut({ clock, io: shapeFor ? { shape: shapeFor(1) } : {} });
  clock.t += 3_600_000;
  const b = await runOut({ clock, io: shapeFor ? { shape: shapeFor(2) } : {} });
  if (a.outcome.code !== 0 || b.outcome.code !== 0) return no('a run did not write its files');
  const p = [];
  for (const n of ['installers.json', 'territory.json']) if (sha(a.files[n]) !== sha(b.files[n])) p.push(`${n} differs`);
  const ba = JSON.parse(a.files['build.json']);
  const bb = JSON.parse(b.files['build.json']);
  if (ba.builtAt === bb.builtAt) p.push('builtAt is the same an hour later');
  delete ba.builtAt;
  delete bb.builtAt;
  if (JSON.stringify(ba) !== JSON.stringify(bb)) p.push('build.json differs in more than builtAt');
  return p.length ? no(p.join('; ')) : ok('the same bytes in installers.json and territory.json; in build.json only builtAt differs');
}
test('J10', 'two runs on the same input write the same bytes',
  [{ label: 'the job as it is, run twice an hour apart', run: () => twiceTest() }],
  [{ label: 'a stand-in whose second run writes territory.json differently', run: () => twiceTest((run) => (a) => { const s = shape(a); return run === 2 ? { ...s, territoryText: s.territoryText.replace('"schema":1', '"schema":1 ') } : s; }) }]);

/* =============================================================================== J11 */

function countyIdsTest(files) {
  const ter = JSON.parse(files['territory.json']);
  const counties = JSON.parse(readFileSync(resolve(ROOT, 'public', 'geo', 'counties.json'), 'utf8'));
  const ids = ter.states.flatMap((s) => s.counties.map((c) => c.id));
  const p = [];
  if (ids.some((id) => typeof id !== 'string')) p.push('territory.json has a county id that is not text');
  const leading = FIXTURE.territory.map((t) => t.county).filter((c) => c.startsWith('0'));
  if (!leading.length || leading.some((c) => !ids.includes(c))) p.push('a county id that begins with a zero lost it in territory.json');
  if (counties.counties.some((c) => typeof c.id !== 'string')) p.push('counties.json has a county id that is not text');
  const zeros = counties.counties.filter((c) => c.id.startsWith('0')).length;
  if (zeros !== 318) p.push(`counties.json has ${zeros} ids that begin with a zero`);
  return p.length ? no(p.join('; ')) : ok(`county ids are text in territory.json and counties.json; ${leading.length} made-up ids and 318 listed ids keep their zero`);
}
test('J11', 'county ids are text in every file, and a leading zero is kept',
  [{ label: 'the files as the job wrote them', run: async () => countyIdsTest((await base()).files) }],
  [{ label: 'territory.json with a county id written as a number', run: async () => { const f = (await base()).files; return countyIdsTest({ ...f, 'territory.json': f['territory.json'].replace('"id":"01001"', '"id":1001') }); } }]);

/* =============================================================================== J12 */

/** The gap counts made a different way: from the contacts as read, leaving out departed ones. */
export function secondGapCount(records) {
  const held = new Map();
  for (const r of records.contacts) {
    if (r['14'] && r['14'].value === true) continue;
    const parent = typeof r['6']?.value === 'string' ? r['6'].value.trim() : '';
    const roles = Array.isArray(r['12']?.value) ? r['12'].value.map((x) => String(x).trim()) : [];
    if (!held.has(parent)) held.set(parent, new Set());
    for (const role of roles) held.get(parent).add(role);
  }
  let noQuoting = 0;
  let noScheduling = 0;
  let neither = 0;
  for (const m of records.master) {
    const roles = held.get(typeof m['6']?.value === 'string' ? m['6'].value.trim() : '') || new Set();
    const q = !roles.has('Quoting / Estimating');
    const s = !roles.has('Scheduling / Coordination');
    noQuoting += q ? 1 : 0;
    noScheduling += s ? 1 : 0;
    neither += q && s ? 1 : 0;
  }
  return { noQuoting, noScheduling, neither };
}
function gapsTest(buildText) {
  const gaps = JSON.parse(buildText).gaps;
  const second = secondGapCount(toRecords());
  return JSON.stringify(gaps) === JSON.stringify(second) ? ok(`gaps ${JSON.stringify(gaps)} equal the second count`) : no(`build.json says ${JSON.stringify(gaps)}, the second count ${JSON.stringify(second)}`);
}
test('J12', 'the gap counts equal a second count made a different way',
  [{ label: 'build.json as the job wrote it', run: async () => gapsTest((await base()).files['build.json']) }],
  [{ label: 'build.json with one gap counted wrong', run: async () => { const b = JSON.parse((await base()).files['build.json']); b.gaps.noScheduling += 1; return gapsTest(JSON.stringify(b)); } }]);

/* =============================================================================== J13 */

function lastConfirmedTest(text) {
  const written = new Map(JSON.parse(text).installers.map((i) => [i.id, i]));
  const p = [];
  for (const m of FIXTURE.master) {
    const i = written.get(m.id);
    const want = m.status === 'CONFIRMED BY PARTNER' && Boolean(m.lastConfirmed);
    if (Boolean(i && i.lastConfirmed) !== want) p.push(`${m.id}: lastConfirmed ${i && i.lastConfirmed ? 'written' : 'not written'}`);
  }
  const dated = FIXTURE.master.filter((m) => m.lastConfirmed && m.status !== 'CONFIRMED BY PARTNER').length;
  return p.length ? no(p.join('; ')) : ok(`written only for CONFIRMED BY PARTNER with a date; ${dated} dated installer(s) with another status left without it`);
}
test('J13', 'lastConfirmed only when the status is CONFIRMED BY PARTNER, and then only when the date is filled',
  [{ label: 'installers.json as the job wrote it', run: async () => lastConfirmedTest((await base()).files['installers.json']) }],
  [
    { label: 'lastConfirmed written on a DORMANT installer with a date', run: async () => lastConfirmedTest(editLine((await base()).files['installers.json'], 'FAKE-003', (l) => l.replace('"status":"DORMANT - NO RESPONSE"', '"status":"DORMANT - NO RESPONSE","lastConfirmed":"2026-05-02"'))) },
    { label: 'lastConfirmed left off a CONFIRMED installer with a date', run: async () => lastConfirmedTest((await base()).files['installers.json'].replace('"lastConfirmed":"2026-08-14",', '')) },
  ]);

/* =============================================================================== J14 */

function departedTest(text) {
  const written = new Map(JSON.parse(text).installers.map((i) => [i.id, i]));
  const p = [];
  let departed = 0;
  for (const c of FIXTURE.contacts.filter((x) => x.departed)) {
    const i = written.get(c.parent);
    const k = i && i.contacts.findIndex((x) => x.title === c.title);
    if (k === undefined || k < 0) { p.push(`${c.title} is not written`); continue; }
    departed++;
    if (i.contacts[k].departed !== true) p.push(`${c.title} is not marked departed`);
    for (const place of ['quoting', 'scheduling']) if (i.row[place] && i.row[place].contact === k) p.push(`${c.title} is on a row`);
  }
  return p.length ? no(p.join('; ')) : ok(`${departed} departed contacts marked departed, none on a row`);
}
const keepsDeparted = (entries) => chooseRow(entries.map((e) => ({ ...e, contact: { ...e.contact, departed: undefined } })));
test('J14', 'a departed contact is marked departed and is never on a row',
  [{ label: 'installers.json as the job wrote it', run: async () => departedTest((await base()).files['installers.json']) }],
  [
    { label: 'a stand-in that does not set departed contacts aside', run: async () => departedTest((await runOut({ io: { shape: (a) => shape({ ...a, chooseRow: keepsDeparted }) } })).files['installers.json']) },
    { label: 'installers.json without the departed mark', run: async () => departedTest((await base()).files['installers.json'].replace(/,"departed":true/g, '')) },
  ]);

/* =============================================================================== J15 */

/** A stand-in client with none of the real one's waiting: one call, sent at once. */
export function makeHastyClient({ token, fetch }) {
  const calls = [];
  const send = async (method, url, json) => {
    calls.push(`${method} ${url}`);
    const res = await fetch(url, { method, headers: { Authorization: `QB-USER-TOKEN ${token}` }, body: json ? JSON.stringify(json) : undefined });
    const out = await res.json();
    if (!res.ok) throw new ApiError(`${method} ${url}: ${res.status}`, res.status);
    return out;
  };
  const query = (id, body) => send('POST', 'https://api.quickbase.com/v1/records/query', { from: id, ...body });
  return { calls, sentAt: [], stats: { calls: 0, attempts: 0, rateLimited: 0, retries: 0, refused: 0 }, send,
    getFields: (id) => send('GET', `https://api.quickbase.com/v1/fields?tableId=${id}`), query, queryRecords: query };
}

async function rateTest(makeClientFn) {
  const clock = standInClock();
  const times = [];
  const qb = standInQuickBase({ records: toRecords() });
  const fetch = async (url, init) => { times.push(clock.now()); return qb.fetch(url, init); };
  const tables = Object.values(TABLES);
  for (let c = 0; c < 3; c++) {
    const client = makeClientFn({ realm: REALM, appId: APP_ID, token: FAKE_KEY, fetch, sleep: clock.sleep, now: clock.now, timeoutSignal: () => new AbortController().signal });
    for (let i = 0; i < 40; i++) await client.getFields(tables[i % 3]);
  }
  let most = 0;
  for (let i = 0, j = 0; i < times.length; i++) {
    while (times[i] - times[j] >= 10_000) j++;
    most = Math.max(most, i - j + 1);
  }
  return most < 100 ? ok(`${times.length} calls from three clients; at most ${most} in any 10 seconds`) : no(`${most} calls in 10 seconds`);
}
test('J15', 'with a stand-in clock, the client stays under 100 calls in any 10 seconds',
  [{ label: 'the real client', run: () => rateTest(makeClient) }],
  [{ label: 'a stand-in client that does not wait', run: () => rateTest(makeHastyClient) }]);

/* =============================================================================== J16 */

const VALUES = madeUpValues();
/** Every made-up value of the job's input found in what was printed, by kind; the values are not returned. */
function leaksIn(lines) {
  const text = lines.join('\n').toLowerCase();
  const digits = lines.map((l) => l.replace(/\D/g, ''));
  const found = [];
  for (const [kind, v] of VALUES) {
    if (kind === 'a phone') {
      const d = v.replace(/\D/g, '');
      if (digits.some((l) => l.includes(d))) found.push(kind);
    } else if (text.includes(v.toLowerCase())) found.push(kind);
  }
  if (text.includes(FAKE_KEY.toLowerCase())) found.push('the key');
  return found;
}
async function quietTest(runner) {
  const scenarios = [
    ['a clean run', { }],
    ['check 1 failing', { publish: true, before: { 'build.json': plantedBuild({ ...N, installers: N.installers + 6 }) } }],
    ['check 2 failing', { records: orphanContact() }],
    ['check 3 failing', { records: changed((r) => { const t = structuredClone(r.territory[0]); set(t, 7, '99999'); r.territory.push(t); }) }],
    ['check 4 failing', { records: changed((r) => { const m = structuredClone(r.master[1]); set(m, 6, 'FAKE-001'); r.master.push(m); }) }],
    ['check 5 failing', { records: changed((r) => set(r.master[1], 13, 'ON HOLD')) }],
    ['check 6 failing', { io: { shape: shapesDifferently() } }],
    ['check 7 failing', { quickbase: { fields: fieldsWith(TABLES.MASTER, 25, { label: 'Company name' }) } }],
    ['an error thrown on purpose, its text holding made-up values', { quickbase: { fail: (call) => { if (call.path === '/v1/records/query') throw new Error(`boom ${FIXTURE.contacts[0].email} ${FIXTURE.contacts[0].name} ${FAKE_KEY}`); } } }],
    ['a refusal from QuickBase whose text holds made-up values', { quickbase: { fail: (call) => (call.path === '/v1/records/query' ? new Response(JSON.stringify({ message: FIXTURE.master[0].company, description: FIXTURE.contacts[0].email }), { status: 403 }) : null) } }],
  ];
  const leaked = [];
  for (const [what, s] of scenarios) {
    const r = await runner(s);
    if (what !== 'a clean run' && r.outcome.code === 0) leaked.push(`${what}: the run did not fail`);
    const found = leaksIn(r.lines);
    if (found.length) leaked.push(`${what}: ${[...new Set(found)].join(', ')}`);
  }
  return leaked.length ? no(leaked.join('; ')) : ok(`${scenarios.length} runs; nothing printed holds a made-up name, email, phone, id, rate or the key`);
}
const quietRunner = async ({ publish, before, ...opts }) => (publish ? runPublish({ before, ...opts }) : runOut(opts));
test('J16', 'nothing the job prints holds installer data or the key: a clean run, each check failing in turn, an error thrown on purpose',
  [{ label: 'the job as it is', run: () => quietTest(quietRunner) }],
  [{ label: 'a stand-in job that also prints a contact\'s name', run: () => quietTest(async (s) => { const r = await quietRunner(s); return { ...r, lines: [...r.lines, `Contact: ${FIXTURE.contacts[1].name}`] }; }) }]);

/* ==================================================================== the client, step 3 */

/** A stand-in for fetch that answers each attempt with what `answers` says, by attempt number. */
function scripted(answers, clock) {
  const log = [];
  const fetch = async (url, init) => {
    const n = log.length;
    log.push({ at: clock.now(), signal: init.signal });
    const a = answers[Math.min(n, answers.length - 1)];
    if (a === 'network') throw new TypeError('fetch failed');
    if (a === 'hang' || a === 'stall') {
      if (!init.signal) throw new Error('no timer was set');
      if (a === 'hang') return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
      return { status: 200, ok: true, headers: new Headers(), arrayBuffer: () => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))) };
    }
    const [status, headers] = Array.isArray(a) ? a : [a, {}];
    return new Response(status === 200 ? '[]' : '{"message":"made up"}', { status, headers });
  };
  return { fetch, log };
}
/** A timer that fires as soon as it is set, and notes how long it was set for. */
function instantTimer(seen) {
  return (ms) => { seen.push(ms); const c = new AbortController(); setImmediate(() => c.abort(new DOMException('timed out', 'TimeoutError'))); return c.signal; };
}
const clientWith = (makeClientFn, fetch, clock, extra = {}) => makeClientFn({ realm: REALM, appId: APP_ID, token: FAKE_KEY, fetch, sleep: clock.sleep, now: clock.now, timeoutSignal: () => new AbortController().signal, ...extra });
async function settle(p) { try { return { value: await p }; } catch (e) { return { error: e }; } }

async function gapTest(makeClientFn) {
  const clock = standInClock();
  const s = scripted([200], clock);
  const client = clientWith(makeClientFn, s.fetch, clock);
  for (let i = 0; i < 5; i++) await client.getFields(TABLES.MASTER);
  const gaps = s.log.slice(1).map((x, i) => x.at - s.log[i].at);
  return gaps.length === 4 && gaps.every((g) => g >= 150) ? ok('at least 150 ms between one call and the next') : no(`gaps between calls: ${gaps.join(', ')} ms`);
}
async function tooManyTest(makeClientFn) {
  const p = [];
  {
    const clock = standInClock();
    const sleeps = [];
    const s = scripted([[429, { 'retry-after': '2' }], 200], clock);
    const client = clientWith(makeClientFn, s.fetch, clock, { sleep: async (ms) => { sleeps.push(ms); await clock.sleep(ms); } });
    const r = await settle(client.getFields(TABLES.MASTER));
    if (r.error || s.log.length !== 2 || !sleeps.includes(2000)) p.push('a 429 with Retry-After 2 was not waited out and tried again');
  }
  {
    const clock = standInClock();
    const s = scripted([429, 200], clock);
    const client = clientWith(makeClientFn, s.fetch, clock);
    const r = await settle(client.getFields(TABLES.MASTER));
    if (r.error || s.log.length !== 2 || s.log[1].at - s.log[0].at < 1000) p.push('a 429 without Retry-After was not backed off and tried again');
  }
  {
    const clock = standInClock();
    const s = scripted([429], clock);
    const client = clientWith(makeClientFn, s.fetch, clock);
    const r = await settle(client.getFields(TABLES.MASTER));
    if (!r.error || s.log.length !== 6 || r.error.status !== 429) p.push(`429 every time: ${s.log.length} attempts, ${r.error ? `status ${r.error.status}` : 'no error'}; six attempts and an error were expected`);
  }
  return p.length ? no(p.join('; ')) : ok('after a 429 it waits as Retry-After says, or backs off, and tries again, six attempts in all');
}
async function serverErrorTest(makeClientFn) {
  const p = [];
  const cases = [
    ['503 twice, then an answer', [503, 503, 200], 3, false],
    ['a network error, then an answer', ['network', 200], 2, false],
    ['503 every time', [503], 6, true],
    ['a network error every time', ['network'], 6, true],
    ['429, 503, a network error, 500, 502, 504', [429, 503, 'network', 500, 502, 504], 6, true],
  ];
  for (const [what, answers, attempts, fails] of cases) {
    const clock = standInClock();
    const s = scripted(answers, clock);
    const r = await settle(clientWith(makeClientFn, s.fetch, clock).getFields(TABLES.MASTER));
    if (Boolean(r.error) !== fails || s.log.length !== attempts) p.push(`${what}: ${s.log.length} attempts, ${r.error ? 'an error' : 'an answer'}`);
  }
  return p.length ? no(p.join('; ')) : ok('it tries again after a 5xx answer or a network error, within the same six attempts');
}
async function timeoutTest(makeClientFn) {
  const p = [];
  for (const [what, first] of [['no answer', 'hang'], ['a body that stalls', 'stall']]) {
    const clock = standInClock();
    const seen = [];
    const s = scripted([first, 200], clock);
    const r = await settle(clientWith(makeClientFn, s.fetch, clock, { timeoutSignal: instantTimer(seen) }).getFields(TABLES.MASTER));
    if (r.error || s.log.length !== 2 || seen[0] !== 60_000) p.push(`${what}: ${s.log.length} attempt(s), timer ${seen[0] ?? 'not set'}, ${r.error ? 'an error' : 'an answer'}`);
  }
  return p.length ? no(p.join('; ')) : ok('an attempt with no answer after 60 seconds, or whose body stalls, is given up and tried again');
}
test('client', 'at least 150 ms between one call and the next',
  [{ label: 'the real client', run: () => gapTest(makeClient) }], [{ label: 'a stand-in client that does not wait', run: () => gapTest(makeHastyClient) }]);
test('client', 'after a 429 it waits as Retry-After says, or backs off, and tries again, up to six attempts',
  [{ label: 'the real client', run: () => tooManyTest(makeClient) }], [{ label: 'a stand-in client that does not try again', run: () => tooManyTest(makeHastyClient) }]);
test('client', 'it tries again after a 5xx answer or a network error, within the same six attempts',
  [{ label: 'the real client', run: () => serverErrorTest(makeClient) }], [{ label: 'a stand-in client that does not try again', run: () => serverErrorTest(makeHastyClient) }]);
test('client', 'an attempt with no answer after 60 seconds is given up and tried again',
  [{ label: 'the real client, with a stand-in timer', run: () => timeoutTest(makeClient) }], [{ label: 'a stand-in client with no timer', run: () => timeoutTest(makeHastyClient) }]);

async function pagesTest(readAllFn) {
  const sizes = [PAGE_SIZE, 1200, 4800];
  const total = sizes.reduce((a, b) => a + b, 0);
  const rows = Array.from({ length: total }, (_, i) => ({ 3: { value: i + 1 } }));
  const asked = [];
  let at = 0;
  const api = { query: async (id, body) => {
    asked.push(body);
    const n = sizes[asked.length - 1] ?? 0;
    const data = rows.slice(at, at + n);
    at += n;
    return { data, metadata: { totalRecords: total, numRecords: data.length, skip: body.options.skip } };
  } };
  const r = await readAllFn(api, TABLES.TERRITORY, [3]);
  const p = [];
  const got = r && Array.isArray(r.rows) ? r.rows : [];
  if (asked.length !== 3) p.push(`${asked.length} page(s) asked for, three expected`);
  if (asked.some((b) => JSON.stringify(b.sortBy) !== '[{"fieldId":3,"order":"ASC"}]')) p.push('a page was not asked for in the order of the record numbers');
  if (asked.some((b) => b.options.top !== PAGE_SIZE)) p.push('a page did not ask for 5,000 rows');
  if (JSON.stringify(asked.map((b) => b.options.skip)) !== JSON.stringify([0, PAGE_SIZE, PAGE_SIZE + 1200])) p.push('the pages did not start where the last one ended');
  if (got.length !== total || got.some((row, i) => row[3].value !== i + 1)) p.push('the rows are not each there once, in order');
  if (!r || r.total !== total) p.push('QuickBase\'s total is not handed back');
  return p.length ? no(p.join('; ')) : ok(`three pages (5,000, 1,200 shorter than asked, 4,800); ${total} rows once each, in order; stopped at the total`);
}
async function readAllStoppingShort(api, id, select) {
  const rows = [];
  for (let skip = 0; ;) {
    const res = await api.query(id, { select, sortBy: [{ fieldId: 3, order: 'ASC' }], options: { skip, top: PAGE_SIZE } });
    rows.push(...res.data);
    skip += res.data.length;
    if (res.data.length < PAGE_SIZE) break;
  }
  return { rows, total: rows.length };
}
test('client', 'readAll: three pages, one shorter than asked; every row once, in order; stops at QuickBase\'s total, which it hands back',
  [{ label: 'readAll', run: () => pagesTest(readAll) }],
  [
    { label: 'a stand-in that stops when a page comes back short', run: () => pagesTest(readAllStoppingShort) },
    { label: 'a stand-in that hands back the rows only', run: () => pagesTest(async (api, id, select) => ({ rows: (await readAll(api, id, select)).rows })) },
  ]);

async function limitTest(makeClientFn) {
  const clock = standInClock();
  const qb = standInQuickBase({ records: toRecords() });
  const first = clientWith(makeClientFn, qb.fetch, clock);
  for (let i = 0; i < MAX_CALLS_PER_CLIENT; i++) await first.getFields(TABLES.MASTER);
  const over = await settle(first.getFields(TABLES.MASTER));
  const second = await settle(clientWith(makeClientFn, qb.fetch, clock).getFields(TABLES.MASTER));
  const p = [];
  if (!(over.error instanceof Refused)) p.push(`request ${MAX_CALLS_PER_CLIENT + 1} of one client was not refused`);
  if (second.error) p.push('a second client in the same process was stopped');
  if (qb.seen.length !== MAX_CALLS_PER_CLIENT + 1) p.push(`${qb.seen.length} requests reached the stand-in`);
  return p.length ? no(p.join('; ')) : ok(`no more than ${MAX_CALLS_PER_CLIENT} requests leave one client; another client is not stopped by it`);
}
/** A stand-in for makeClient whose limit is one count shared by every client, as it was before. */
function sharedLimitClients() {
  let shared = 0;
  return (opts) => {
    const c = makeClient(opts);
    const getFields = async (id) => {
      if (shared >= MAX_CALLS_PER_CLIENT) throw new Refused('the shared limit was reached');
      shared++;
      return c.getFields(id);
    };
    return { ...c, getFields };
  };
}
test('client', 'the limit of 60 requests counts for one client',
  [{ label: 'the real client', run: () => limitTest(makeClient) }],
  [{ label: 'a stand-in with one count for the whole process', run: () => limitTest(sharedLimitClients()) }]);

/** keyFn(env, path): where the key comes from. Checks true or false; no value is ever part of a reason. */
function keySourceTest(keyFn) {
  const dir = tempDir('key');
  const file = join(dir, 'made-up-key-file.txt');
  const fileKey = ['made', 'up', 'file', 'key', 'k2'].join('-');
  const envKey = ['made', 'up', 'environment', 'key', 'k3'].join('-');
  writeFileSync(file, `QB_REALM_HOSTNAME=${REALM}\nQB_APP_ID=${APP_ID}\nQB_USER_TOKEN=${fileKey}\n`);
  const gh = { GITHUB_ACTIONS: 'true', QB_USER_TOKEN: envKey, QB_REALM_HOSTNAME: REALM, QB_APP_ID: APP_ID };
  const p = [];
  const a = keyFn(gh, file);
  if (!(a.source === 'environment' && a.token === envKey && a.realm === REALM && a.appId === APP_ID)) p.push('on GitHub the key, realm and app id did not come from the environment values');
  for (const name of ['QB_USER_TOKEN', 'QB_REALM_HOSTNAME', 'QB_APP_ID']) {
    for (const [how, env] of [['missing', (() => { const e = { ...gh }; delete e[name]; return e; })()], ['empty', { ...gh, [name]: '' }]]) {
      const r = keyFn(env, file);
      const named = typeof r.problem === 'string' && r.problem.includes(name);
      const shows = typeof r.problem === 'string' && (r.problem.includes(envKey) || r.problem.includes(fileKey));
      if (!named || r.token !== undefined || shows) p.push(`on GitHub, ${name} ${how}: not refused with its name alone`);
    }
  }
  const laptop = keyFn({ QB_USER_TOKEN: envKey, QB_REALM_HOSTNAME: REALM, QB_APP_ID: APP_ID }, file);
  if (!(laptop.source === 'file' && laptop.token === fileKey)) p.push('on the laptop the key did not come from the file');
  const noFile = keyFn({ QB_USER_TOKEN: envKey, QB_REALM_HOSTNAME: REALM, QB_APP_ID: APP_ID }, join(dir, 'not-there.txt'));
  if (!noFile.problem || noFile.token !== undefined) p.push('on the laptop with no file, environment values took its place');
  return p.length ? no(p.join('; ')) : ok('GitHub: the three environment values and nowhere else, a missing or empty one named; laptop: the file, environment values not looked at');
}
const prefersEnvironment = (env, path) => (env.QB_USER_TOKEN ? { realm: env.QB_REALM_HOSTNAME, appId: env.QB_APP_ID, token: env.QB_USER_TOKEN, source: 'environment' } : keyFrom(env, path));
test('client', 'where the key comes from, on GitHub and on the laptop',
  [{ label: 'keyFrom', run: async () => keySourceTest(keyFrom) }],
  [{ label: 'a stand-in that takes environment values on the laptop', run: async () => keySourceTest(prefersEnvironment) }]);

/* ===================================================== the environment, read as text */

const TEST_FILES = ['scripts/check-job.mjs', 'scripts/job-tests.mjs', 'scripts/job-standins.mjs', 'scripts/check-selftest.mjs',
  'scripts/published-tests.mjs'];
// Written so that this line does not match itself.
const ENV_READ = /process\s*\.\s*env|process\s*\[|from\s+['"](?:node:)?process(?=['"])/;
const ENV_READS = new RegExp(ENV_READ.source, 'g');
function environmentTest(jobs, tests) {
  const p = [];
  const reads = jobs.flatMap((f) => [...f.text.matchAll(ENV_READS)].map((m) => ({ path: f.path, at: m.index, text: f.text })));
  const allowed = reads.filter((r) => r.path === 'job/run.mjs' && r.text.lastIndexOf('if (isMain)', r.at) > r.text.lastIndexOf('export async function main', r.at));
  if (reads.length !== 1 || allowed.length !== 1) p.push(`${reads.length} read(s) of the real environment in job/, ${allowed.length} in the command-line start of job/run.mjs; one there and none elsewhere expected`);
  const handed = tests.filter((f) => ENV_READ.test(f.text));
  if (handed.length) p.push(`a test reads the real environment: ${handed.map((f) => f.path).join(', ')}`);
  return p.length ? no(p.join('; ')) : ok('only the command-line start of job/run.mjs reads the real environment; no test hands it to the job');
}
const testFiles = () => TEST_FILES.map((f) => ({ path: f, text: readFileSync(resolve(ROOT, f), 'utf8') }));
test('environment', 'nothing else in job/ reads the real environment, and no test hands the job the real one',
  [{ label: 'job/ and the tests as they are', run: async () => environmentTest(jobFiles(), testFiles()) }],
  [
    { label: 'a planted read in job/', run: async () => environmentTest([...jobFiles(), { path: 'job/planted.mjs', text: `const gh = process.${'env'}.GITHUB_ACTIONS;\n` }], testFiles()) },
    { label: 'a test that hands the job the real environment', run: async () => environmentTest(jobFiles(), [...testFiles(), { path: 'scripts/planted.mjs', text: `await main({ args, env: process.${'env'}, root });\n` }]) },
  ]);

/* ============================================================= the workflow file, step 8 */

const WORKFLOW = resolve(ROOT, '.github', 'workflows', 'daily-data.yml');
const workflowText = () => (existsSync(WORKFLOW) ? readFileSync(WORKFLOW, 'utf8') : '');
/**
 * A broken copy of the workflow file: `find` replaced by `replace`. mustSay asks that the check
 * fails at the line that was changed, named by its number in the copy (`changed` is that line's
 * text), and that it says what the shape has there (`want`). A copy that could not be made has
 * no such line, so its failure cannot pass for the right one.
 */
const breakWorkflow = (label, find, replace, changed, want) => {
  const t = workflowText();
  const copy = t.includes(find) ? t.replace(find, replace) : null;
  const at = copy === null ? 0 : copy.replace(/\r/g, '').split('\n').indexOf(changed) + 1;
  return {
    label,
    run: async () => (copy === null ? no('the copy could not be made: the text to change is not in the file') : checkWorkflow(copy)),
    mustSay: `line ${at} of the file differs from the shape, which has here: "${want}"`,
  };
};
test('workflow', '.github/workflows/daily-data.yml has the one shape it is allowed',
  [{ label: 'the file as it is', run: async () => checkWorkflow(workflowText()) }],
  [
    breakWorkflow('a copy with no schedule', "  schedule:\n    - cron: '20 9 * * *'\n", '', '  workflow_dispatch:', '  schedule:'),
    breakWorkflow('a copy with a second time added', "    - cron: '20 9 * * *'\n", "    - cron: '20 9 * * *'\n    - cron: '20 21 * * *'\n", "    - cron: '20 21 * * *'", '  workflow_dispatch:'),
    breakWorkflow('a copy with a different time', "    - cron: '20 9 * * *'\n", "    - cron: '0 9 * * *'\n", "    - cron: '0 9 * * *'", "    - cron: '20 9 * * *'"),
    breakWorkflow('a copy with a second permission', '  contents: write\n', '  contents: write\n  actions: read\n', '  actions: read', 'concurrency:'),
    breakWorkflow('a copy with an action from someone else', 'uses: actions/setup-node@v6', 'uses: someone-else/setup-node@v6', '        uses: someone-else/setup-node@v6', '        uses: actions/setup-node@v6'),
    breakWorkflow('a copy with a step that runs always', '      - name: Save the data files\n', '      - name: Save the data files\n        if: always()\n', '        if: always()', '        run: |'),
    breakWorkflow('a copy that stages a second path', 'git add -- public/data', 'git add -- public/data docs', '          git add -- public/data docs', '          git add -- public/data'),
    breakWorkflow('a copy with the key written out', '${{ secrets.QB_USER_TOKEN }}', FAKE_KEY, `          QB_USER_TOKEN: ${FAKE_KEY}`, '          QB_USER_TOKEN: ${{ secrets.QB_USER_TOKEN }}'),
  ]);

/* ============================================================ the rehearsal's leak scan */

/** A real-looking installer id, put together when the test runs, so that no tracked file holds it. */
const LOOKS_REAL = ['IN', 'S-0', '42'].join('');
const leakReads = () => [{ rows: changed((r) => {
  set(r.master[0], 6, LOOKS_REAL);
  // Two names the scan must skip: one shorter than 5 characters, one made only of words the job prints anyway.
  for (const name of ['Ana', 'Quoting Estimating']) {
    const c = structuredClone(r.contacts[0]);
    set(c, 7, name);
    r.contacts.push(c);
  }
}) }];
async function leakTest({ extraHeld = [], files = [] } = {}) {
  const { values, skipped } = valuesToFind(leakReads());
  const held = [...(await base()).lines, ...extraHeld].join('\n');
  const heldHits = hitsIn(held, values, false);
  const fileHits = files.flatMap((f) => hitsIn(f, values.filter((v) => v.inFiles), true));
  const shown = [...heldHits, ...fileHits].some((h) => Object.keys(h).some((k) => !['kind', 'line'].includes(k)));
  if (shown) return no('a hit carries more than its kind and line');
  if (skipped < 2) return no('the short name and the fixed-text name were looked for, not skipped');
  return heldHits.length || fileHits.length ? no(`${heldHits.length + fileHits.length} hit(s): ${[...heldHits, ...fileHits].map((h) => `${h.kind} at line ${h.line}`).join('; ')}`)
    : ok(`${values.length} made-up values looked for, ${skipped} skipped; no hit in what the job printed, and an id directly after FAKE- is not one`);
}
test('leak scan', 'the rehearsal\'s leak scan finds a value whole, a phone by its digits, and passes over an id directly after FAKE-',
  [{ label: 'what the job printed, and a file with the id after FAKE-', run: () => leakTest({ files: [`Made up: FAKE-${LOOKS_REAL} in a test.\n`] }) }],
  [
    { label: 'a planted email in what was held back', run: () => leakTest({ extraHeld: [`Contact: ${FIXTURE.contacts[0].email}`] }) },
    { label: 'a planted phone, written another way', run: () => leakTest({ extraHeld: [`Call ${FIXTURE.contacts[0].phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '$1.$2.$3')} today`] }) },
    { label: 'a planted company, in capitals', run: () => leakTest({ extraHeld: [`Seen: ${FIXTURE.master[3].company.toUpperCase()}.`] }) },
    { label: 'a file with the id, not after FAKE-', run: () => leakTest({ files: [`line one\nid ${LOOKS_REAL}, made up\n`] }) },
  ]);

/* ===================================================================== the watched columns */

function columnsTest(watched, asked) {
  const w = Object.values(watched).reduce((n, ids) => n + new Set(ids).size, 0);
  const a = Object.values(asked).reduce((n, ids) => n + new Set(ids).size, 0);
  const inFile = Object.entries(watched).every(([t, ids]) => ids.every((id) => COLUMNS.tables.find((x) => x.id === t).columns.some((c) => c.fieldId === id)));
  const within = Object.entries(asked).every(([t, ids]) => ids.every((id) => watched[t].includes(id)));
  return w === 69 && a === 62 && inFile && within ? ok('69 watched, 62 asked for, all in columns.json')
    : no(`${w} watched, ${a} asked for${inFile ? '' : ', some not in columns.json'}${within ? '' : ', some asked for and not watched'}`);
}
test('columns', 'the job watches the 69 columns of section 3.2 and asks for 62 of them',
  [{ label: 'job/fields.mjs', run: async () => columnsTest(WATCHED, ASKED) }],
  [
    { label: 'Territory\'s County name asked for as well', run: async () => columnsTest(WATCHED, { ...ASKED, [TABLES.TERRITORY]: [...ASKED[TABLES.TERRITORY], 8] }) },
    { label: 'MASTER\'s Region watched as well', run: async () => columnsTest({ ...WATCHED, [TABLES.MASTER]: [...WATCHED[TABLES.MASTER], 7] }, ASKED) },
  ]);
