/**
 * The tests of npm run check:published (scripts\check-published.mjs), one for each of its
 * lines, and of the part of the rehearsal that sets this laptop's files beside the published
 * ones (compareWithPublished in job\rehearse.mjs). They work on the files the job writes from
 * the made-up installers, and on copies of them broken in one way each.
 *
 * Each test has sound cases, on which it must pass, and broken cases, on which it must fail and
 * say why (mustSay), in the shape of scripts\job-tests.mjs. npm run check:selftest runs them.
 * npm run check:job does not: they test checks made on the laptop, not the job, so a fault in
 * them can never stop the daily run on GitHub.
 *
 * Nothing here reads public\data, the real key or QuickBase. The files are written into
 * temporary folders whose names begin installer-index-, which removeTemps deletes.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkPublished, FILES, LINES } from './check-published.mjs';
import { compareWithPublished } from '../job/rehearse.mjs';
import { runJob, tempDir } from './job-standins.mjs';

export const PUBLISHED_TESTS = [];
const test = (line, label, sound, broken) => PUBLISHED_TESTS.push({ line, label, sound, broken });
const sha = (text) => createHash('sha256').update(text).digest('hex');

let made = null;
/** The three files the job writes from the made-up installers, as text, made once. */
async function madeUp() {
  if (!made) {
    const out = tempDir('published-made');
    const r = await runJob({ args: ['--out', out] });
    if (r.outcome.code !== 0) throw new Error('the job did not write the made-up files');
    made = Object.fromEntries(FILES.map((name) => [name, readFileSync(join(out, name), 'utf8')]));
  }
  return made;
}

/** installers.json and territory.json written the way the job writes them (section 3.6 of docs\SPEC.md). */
const lines = (items) => (items.length ? `\n${items.join(',\n')}\n` : '');
const installersText = (ins) => `{"schema":1,"installers":[${lines(ins.installers.map((i) => JSON.stringify(i)))}]}\n`;
const territoryText = (ter) => `{"schema":1,"states":[${lines(ter.states.map((s) => `${JSON.stringify({ state: s.state, country: s.country }).slice(0, -1)},"counties":[\n${s.counties.map((c) => JSON.stringify(c)).join(',\n')}\n]}`))}]}\n`;
const buildText = (build) => `${JSON.stringify(build, null, 2)}\n`;

/**
 * A copy of the made-up files with one change: change({ ins, ter, build }) edits the parsed
 * files, or puts new ones in their place. installers.json and territory.json are written again
 * the way the job writes them, and build.json's fingerprints follow them unless
 * keepFingerprints is set. The files written again unchanged must be the same bytes, or the copy
 * is not made.
 */
async function copyWith(change, { keepFingerprints = false } = {}) {
  const f = await madeUp();
  const p = { ins: JSON.parse(f['installers.json']), ter: JSON.parse(f['territory.json']), build: JSON.parse(f['build.json']) };
  if (installersText(p.ins) !== f['installers.json'] || territoryText(p.ter) !== f['territory.json'] || buildText(p.build) !== f['build.json']) {
    throw new Error('the copy could not be made: the files written again unchanged are not the same bytes');
  }
  change(p);
  const ins = installersText(p.ins);
  const ter = territoryText(p.ter);
  if (!keepFingerprints) p.build.files = { 'installers.json': sha(ins), 'territory.json': sha(ter) };
  return { 'installers.json': ins, 'territory.json': ter, 'build.json': buildText(p.build) };
}

/** The first entry of a list for which f is true, or an error that stops the case: the copy cannot be made. */
function first(list, f, what) {
  const x = list.find(f);
  if (x === undefined) throw new Error(`the copy could not be made: no made-up ${what}`);
  return x;
}

/** Writes files ({ name: text }; a name whose text is missing is not written) into a new temporary folder. */
function folderWith(files) {
  const dir = tempDir('published-copy');
  for (const [name, text] of Object.entries(files)) if (typeof text === 'string') writeFileSync(join(dir, name), text);
  return dir;
}

/**
 * A broken copy that passes is reported as wrong by the self-test, which expects a failure. So
 * a copy that fails, but not in the way it was meant to, is handed back as a pass, with the
 * reason.
 */
const notAsMeant = (why) => ({ ok: true, why: `the copy was not broken as it was meant to be: ${why}` });

/* ======================================================================= check:published */

/**
 * check:published on a folder of files, as one result: ok when every line passed; why, the
 * lines that failed. With `target`, every line but that one must pass; the files line is the
 * exception, since without the files no other line can tell.
 */
function published(files, target = null) {
  const { results } = checkPublished(folderWith(files));
  const failing = results.filter((r) => !r.ok);
  const why = failing.length ? failing.map((r) => `${r.id} FAIL: ${r.text}`).join(' | ') : `every line passed (${results.length})`;
  if (results.length !== LINES.length || results.some((r, i) => r.id !== LINES[i])) return { ok: false, why: 'the lines are not those of check:published, in order', results };
  if (target && target !== 'files' && failing.some((r) => r.id !== target)) return { ...notAsMeant(why), results };
  return { ok: !failing.length, why, results };
}

const madeUpSound = { label: 'the three files the job wrote from the made-up installers', run: async () => published(await madeUp()) };
/** A broken case for line `target`: make() gives the files. */
const broken = (target, label, mustSay, make) => ({ label, mustSay, run: async () => published(await make(), target) });
const installerList = (p) => p.ins.installers;

test('files', 'the three files are there, and each reads as JSON',
  [madeUpSound],
  [
    broken('files', 'territory.json not there', 'files FAIL: territory.json is not there', async () => ({ ...(await madeUp()), 'territory.json': undefined })),
    broken('files', 'installers.json cut short', 'files FAIL: installers.json does not read as JSON', async () => { const f = await madeUp(); return { ...f, 'installers.json': f['installers.json'].slice(0, -10) }; }),
  ]);

test('build.json', 'build.json has the names of section 3.6, in order, and builtAt reads like 2026-10-07T09:20:31Z',
  [madeUpSound],
  [
    broken('build.json', 'builtAt left out', 'build.json FAIL: its names are not schema, builtAt, counts, gaps, checks and files, in that order',
      () => copyWith((p) => { delete p.build.builtAt; })),
    broken('build.json', 'builtAt written another way', 'build.json FAIL: builtAt does not read like 2026-10-07T09:20:31Z',
      () => copyWith((p) => { p.build.builtAt = p.build.builtAt.replace('T', ' '); })),
    broken('build.json', 'contacts before installers in counts', 'build.json FAIL: the names in counts are not those of section 3.6, in order',
      () => copyWith((p) => { const { installers, contacts, ...rest } = p.build.counts; p.build.counts = { contacts, installers, ...rest }; })),
    broken('build.json', 'gaps written before counts', 'build.json FAIL: its names are not schema, builtAt, counts, gaps, checks and files, in that order',
      () => copyWith((p) => { const { schema, builtAt, counts, gaps, ...rest } = p.build; p.build = { schema, builtAt, gaps, counts, ...rest }; })),
  ]);

const CHECK_1 = 'Counts have not fallen';
test('checks', 'the seven checks are there by number and name, and each passed; the first may be skipped',
  [
    madeUpSound,
    { label: 'the first check skipped, as a run with the box ticked writes it', run: async () => {
      const r = published(await copyWith((p) => { p.build.checks[0] = { check: 1, name: CHECK_1, skipped: true }; }));
      const line = r.results && r.results.find((x) => x.id === 'checks');
      return r.ok && line && line.text.endsWith('the first was skipped: yes') ? r : { ok: false, why: `${r.why}; the checks line does not say the first was skipped: yes` };
    } },
  ],
  [
    broken('checks', 'check 3 did not pass', 'checks FAIL: check 3 did not pass', () => copyWith((p) => { p.build.checks[2].passed = false; })),
    broken('checks', 'check 5 under another name', 'checks FAIL: check 5 is not there by its name', () => copyWith((p) => { p.build.checks[4].name = 'Every installer has a company'; })),
    broken('checks', 'six checks', 'checks FAIL: 6 checks, not seven', () => copyWith((p) => { p.build.checks.pop(); })),
    broken('checks', 'the second check skipped', 'checks FAIL: check 2 did not pass', () => copyWith((p) => { const c = p.build.checks[1]; p.build.checks[1] = { check: c.check, name: c.name, skipped: true }; })),
  ]);

test('fingerprints', 'the fingerprints in build.json equal the SHA-256 of installers.json and territory.json',
  [madeUpSound],
  [
    broken('fingerprints', 'installers.json with one character changed, build.json left as it was', 'fingerprints FAIL: installers.json does not match its fingerprint in build.json',
      () => copyWith((p) => { const i = first(installerList(p), (x) => x.office && x.office.city, 'installer with an office city'); i.office.city = `${i.office.city.slice(0, -1)}x`; }, { keepFingerprints: true })),
    broken('fingerprints', 'territory.json with a space added at the end', 'fingerprints FAIL: territory.json does not match its fingerprint in build.json',
      async () => { const f = await madeUp(); return { ...f, 'territory.json': f['territory.json'].replace(/\n$/, ' \n') }; }),
  ]);

const countsPlus = (change) => () => copyWith((p) => change(p.build.counts));
test('counts', 'the counts in build.json equal the same counts made again from installers.json and territory.json',
  [madeUpSound],
  [
    broken('counts', 'installers one more in build.json', 'counts FAIL: installers: build.json ', countsPlus((c) => { c.installers += 1; })),
    broken('counts', 'contacts one more in build.json', 'counts FAIL: contacts: build.json ', countsPlus((c) => { c.contacts += 1; })),
    broken('counts', 'DORMANT - NO RESPONSE one more in build.json', 'counts FAIL: DORMANT - NO RESPONSE: build.json ', countsPlus((c) => { c.byStatus.find((s) => s.status === 'DORMANT - NO RESPONSE').installers += 1; })),
    broken('counts', 'with territory one more in build.json', 'counts FAIL: with territory: build.json ', countsPlus((c) => { c.installersWithTerritory += 1; })),
    broken('counts', 'without territory one more in build.json', 'counts FAIL: without territory: build.json ', countsPlus((c) => { c.installersWithoutTerritory += 1; })),
    broken('counts', 'counties covered one fewer in build.json', 'counts FAIL: counties covered: build.json ', countsPlus((c) => { c.countiesCovered -= 1; })),
    broken('counts', 'an installer in installers.json with a sixth status', '1 installer(s) with none of the five statuses',
      () => copyWith((p) => { first(installerList(p), (x) => x.status === 'DORMANT - NO RESPONSE' && x.lastConfirmed === undefined, 'DORMANT installer').status = 'ON HOLD'; })),
  ]);

test('J11', 'every county id in every file is text, and how many begin with a zero is counted',
  [madeUpSound],
  [
    broken('J11', 'a county id written as a number', '; 1 not text;',
      () => copyWith((p) => { const c = first(p.ter.states.flatMap((s) => s.counties), (x) => x.id.startsWith('0'), 'county id that begins with a zero'); c.id = Number(c.id); })),
  ]);

const withRole = (c, role) => { c.roles = [role, ...(c.roles || [])]; };
test('J12', "the gap counts in build.json equal a count from the contacts' roles, departed left out, and a count from the rows' gaps",
  [madeUpSound],
  [
    broken('J12', 'build.json with one gap counted wrong', "J12 FAIL: the count from the contacts' roles differs; the count from the rows' gaps differs: gap counts",
      () => copyWith((p) => { p.build.gaps.noScheduling += 1; })),
    broken('J12', "a row whose gap is left out", "J12 FAIL: the count from the rows' gaps differs: gap counts",
      () => copyWith((p) => { delete first(installerList(p), (x) => x.row.gap === 'scheduling', 'installer whose row says scheduling is missing').row.gap; })),
    broken('J12', 'a contact given the quoting role at an installer whose row says quoting is missing', "J12 FAIL: the count from the contacts' roles differs: gap counts",
      () => copyWith((p) => {
        const i = first(installerList(p), (x) => x.row.gap === 'quoting' && x.contacts.some((c) => c.departed !== true), 'installer missing quoting, with a contact who has not departed');
        withRole(i.contacts.find((c) => c.departed !== true), 'Quoting / Estimating');
      })),
  ]);

test('J13', 'lastConfirmed is on no installer whose status is not CONFIRMED BY PARTNER',
  [madeUpSound],
  [
    broken('J13', 'lastConfirmed written on a DORMANT installer', ', 1 of them with a status other than CONFIRMED BY PARTNER',
      () => copyWith((p) => {
        const list = installerList(p);
        const k = list.indexOf(first(list, (x) => x.status === 'DORMANT - NO RESPONSE' && x.lastConfirmed === undefined, 'DORMANT installer with no date'));
        const { id, company, status, ...rest } = list[k];
        list[k] = { id, company, status, lastConfirmed: '2026-05-02', ...rest };
      })),
  ]);

test('J14', 'no row holds a contact marked departed',
  [madeUpSound],
  [
    broken('J14', 'a row place pointed at a departed contact', '; 1 hold a contact marked departed;',
      () => copyWith((p) => {
        const i = first(installerList(p), (x) => x.row.quoting && x.contacts.some((c) => c.departed === true), 'installer with a quoting place and a departed contact');
        i.row.quoting.contact = i.contacts.findIndex((c) => c.departed === true);
      })),
    broken('J14', 'a row place pointing at no contact', '; 1 point at no contact;',
      () => copyWith((p) => { const i = first(installerList(p), (x) => x.row.quoting, 'installer with a quoting place'); i.row.quoting.contact = i.contacts.length + 5; })),
  ]);

test('empties', 'nothing is written as null, empty text, an empty list or an empty group, apart from what section 3.6 always writes',
  [
    { label: 'the made-up files, which hold an installer with no contact and a contact with nothing filled', run: async () => {
      const r = published(await madeUp());
      const line = r.results && r.results.find((x) => x.id === 'empties');
      const allowed = line && !line.text.includes('installers with no contact 0,') && !line.text.includes('contacts with nothing filled 0,');
      return r.ok && allowed ? r : { ok: false, why: `${r.why}; the made-up files were meant to hold both things section 3.6 always writes` };
    } },
  ],
  [
    broken('empties', 'a value written as empty text', 'empties FAIL: null 0; empty text 1; empty list 0; empty group 0;', () => copyWith((p) => { installerList(p)[1].anythingElse = ''; })),
    broken('empties', 'a value written as null', 'empties FAIL: null 1; empty text 0; empty list 0; empty group 0;', () => copyWith((p) => { installerList(p)[1].notes = null; })),
    broken('empties', 'an empty list written', 'empties FAIL: null 0; empty text 0; empty list 1; empty group 0;', () => copyWith((p) => { installerList(p)[1].shipping = []; })),
    broken('empties', 'an empty group written', 'empties FAIL: null 0; empty text 0; empty list 0; empty group 1;', () => copyWith((p) => { installerList(p)[1].rates = {}; })),
    broken('empties', 'an empty list of installers for a county in territory.json', 'empties FAIL: null 0; empty text 0; empty list 1; empty group 0;',
      () => copyWith((p) => { const c = first(p.ter.states.flatMap((s) => s.counties), (x) => x.tier1Installers && !x.tier2Installers, 'county with Tier 1 installers only'); c.tier2Installers = []; })),
  ]);

test('dates', 'every date reads like 2026-10-06',
  [madeUpSound],
  [
    broken('dates', 'a date written another way', '; 1 not written like 2026-10-06',
      () => copyWith((p) => { const i = first(installerList(p), (x) => x.lastConfirmed, 'installer with a lastConfirmed date'); i.lastConfirmed = i.lastConfirmed.replace(/-0(\d)/g, '-$1').replace(/^(\d{4})-(\d+)-(\d+)$/, '$2/$3/$1'); })),
  ]);

/* ============================================ the rehearsal, beside the published files */

/**
 * compareWithPublished, as one result: ok when both files are the same bytes and in order;
 * why, the lines it would hold back. publishedFiles null: public\data is not there. inOrder:
 * the published copy is meant to stay in order, so a copy that comes out of order was not
 * broken as it was meant to be.
 */
function beside(now, publishedFiles, { inOrder = false } = {}) {
  const folder = publishedFiles === null ? join(tempDir('published-none'), 'public', 'data') : folderWith(publishedFiles);
  const c = compareWithPublished(now, folder);
  const why = c.lines.join(' | ');
  if (inOrder && c.notInOrder.length) return notAsMeant(why);
  const same = c.lines.filter((l) => l.endsWith(': SAME BYTES')).length === 2;
  return { ok: c.there && same && !c.notInOrder.length, why, c };
}
const besideCase = (label, mustSay, make, opts) => ({ label, mustSay, run: async () => beside(await madeUp(), await make(), opts) });
const counties = (p) => p.ter.states.flatMap((s) => s.counties);
const swap = (list, a, b) => { [list[a], list[b]] = [list[b], list[a]]; };

test('beside', "the rehearsal sets this laptop's files beside the published ones: SAME BYTES or DIFFERENT with counts, IN ORDER or not, and the counts beside each other",
  [
    { label: 'the published files the same as this laptop\'s', run: async () => beside(await madeUp(), await madeUp()) },
    { label: 'public/data not there: it says so and goes on', run: async () => {
      const c = compareWithPublished(await madeUp(), join(tempDir('published-none'), 'public', 'data'));
      const said = !c.there && c.lines.includes('  public/data is not there, so there is nothing to set beside it') && !c.notInOrder.length;
      return said ? { ok: true, why: c.lines.join(' | ') } : { ok: false, why: `it did not say public/data is not there and go on: ${c.lines.join(' | ')}` };
    } },
    { label: 'the counts beside each other read from each side', run: async () => {
      const f = await madeUp();
      const n = JSON.parse(f['build.json']).counts;
      const c = compareWithPublished(f, folderWith(await copyWith((p) => { p.build.counts.contacts += 1; })));
      const want = `  counts, published beside now: installers ${n.installers} beside ${n.installers}; contacts ${n.contacts + 1} beside ${n.contacts}; territory rows ${n.territoryRows} beside ${n.territoryRows}`;
      return c.lines.includes(want) ? { ok: true, why: want } : { ok: false, why: `the counts line is not as expected: ${c.lines.join(' | ')}` };
    } },
  ],
  [
    besideCase('one installer written differently', "installers.json: DIFFERENT: installers only in the published file 0, only in this laptop's file 0, in both but written differently 1",
      () => copyWith((p) => { const i = first(installerList(p), (x) => x.office && x.office.city, 'installer with an office city'); i.office.city = `${i.office.city}x`; }), { inOrder: true }),
    besideCase('one county written differently', "territory.json: DIFFERENT: counties only in the published file 0, only in this laptop's file 0, in both but written differently 1",
      () => copyWith((p) => { const c = counties(p)[0]; c.tier2Installers = [...(c.tier2Installers || []), 'FAKE-999']; }), { inOrder: true }),
    besideCase('one installer more in the published file', "installers.json: DIFFERENT: installers only in the published file 1, only in this laptop's file 0, in both but written differently 0",
      () => copyWith((p) => { const list = installerList(p); list.splice(1, 0, { ...list[0], id: `FAKE-9${list[0].id.slice(-2)}` }); }), { inOrder: true }),
    besideCase('one county fewer in the published file', "territory.json: DIFFERENT: counties only in the published file 0, only in this laptop's file 1, in both but written differently 0",
      () => copyWith((p) => { first(p.ter.states, (s) => s.counties.length > 1, 'state with two counties').counties.pop(); }), { inOrder: true }),
    besideCase('two installers swapped', 'installers.json: the published file is NOT IN ORDER', () => copyWith((p) => { swap(installerList(p), 0, 1); })),
    besideCase('two contacts of one installer swapped', 'installers.json: the published file is NOT IN ORDER',
      () => copyWith((p) => {
        const i = first(installerList(p), (x) => x.contacts.length > 1 && (x.contacts[0].name !== x.contacts[1].name || (x.contacts[0].roles || [])[0] !== (x.contacts[1].roles || [])[0]), 'installer with two contacts that are not tied');
        swap(i.contacts, 0, 1);
      })),
    besideCase('two states swapped', 'territory.json: the published file is NOT IN ORDER', () => copyWith((p) => { swap(p.ter.states, 0, 1); })),
    besideCase('two counties of one state swapped', 'territory.json: the published file is NOT IN ORDER',
      () => copyWith((p) => { swap(first(p.ter.states, (s) => s.counties.length > 1, 'state with two counties').counties, 0, 1); })),
    besideCase('the installer ids of one county out of text order', 'territory.json: the published file is NOT IN ORDER',
      () => copyWith((p) => { counties(p)[0].tier2Installers = ['FAKE-900', 'FAKE-001']; })),
  ]);
