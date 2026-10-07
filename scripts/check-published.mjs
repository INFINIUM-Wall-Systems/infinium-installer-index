/**
 * npm run check:published [-- <folder>]: checks the three files the job published, in
 * public\data, or in the folder given. Acceptance checks J2 and J10 to J14 on the files as they
 * were published, and the rules of section 3.6 of docs\SPEC.md.
 *
 * Each line prints its name and PASS or FAIL, with counts:
 *   files         the three files are there, and each reads as JSON
 *   build.json    the names section 3.6 gives build.json, in its order; builtAt reads like
 *                 2026-10-07T09:20:31Z
 *   checks        the seven checks are there by number and name, and each one passed. Whether
 *                 the first was skipped is printed as yes or no, and is not a failure
 *   fingerprints  the two fingerprints in build.json equal the SHA-256 of installers.json and
 *                 of territory.json
 *   counts        the counts in build.json equal the same counts made again from the other two
 *                 files: installers, contacts, each status, with and without territory,
 *                 counties covered
 *   J11           every county id in every file is text; how many begin with a zero
 *   J12           the three gap counts in build.json equal two counts made from
 *                 installers.json: one from each installer's contacts, departed left out, by
 *                 the roles they hold; one from the gap each installer's row carries
 *   J13           lastConfirmed is on no installer whose status is not CONFIRMED BY PARTNER
 *   J14           no row holds a contact marked departed
 *   empties       nothing is written as null, empty text, an empty list or an empty group,
 *                 apart from what section 3.6 says is always written
 *   dates         every date reads like 2026-10-06
 * Then builtAt, the counts of installers, contacts and territory rows build.json gives, and the
 * sizes of the three files in bytes.
 *
 * It prints counts, sizes, SHA-256 results, file names, the names of values and category labels
 * such as a record status. Never a company, a person, an email, a phone, an address, a rate or
 * an installer id. An error is printed by its kind and the step it came at, never by its own
 * text.
 *
 * It has its own code. The names, statuses and roles below are written out from section 3.6 of
 * docs\SPEC.md, not taken from the job, so that it checks the job's files and not the job's own
 * idea of them.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLISHED = join(ROOT, 'public', 'data');
export const FILES = ['installers.json', 'territory.json', 'build.json'];
/** The lines, in the order they are printed. */
export const LINES = ['files', 'build.json', 'checks', 'fingerprints', 'counts', 'J11', 'J12', 'J13', 'J14', 'empties', 'dates'];

const BUILD_NAMES = ['schema', 'builtAt', 'counts', 'gaps', 'checks', 'files'];
const COUNT_NAMES = ['installers', 'contacts', 'territoryRows', 'duplicateTerritoryRows', 'installersWithTerritory',
  'installersWithoutTerritory', 'countiesCovered', 'byStatus'];
const GAP_NAMES = ['noQuoting', 'noScheduling', 'neither'];
const FINGERPRINTED = ['installers.json', 'territory.json'];
const CHECK_NAMES = ['Counts have not fallen', 'Every contact and territory row has its installer',
  'Every county is in the county list', 'No installer id twice', 'Every installer has a company and a known status',
  'The same data gives the same files', 'Columns keep their label and type'];
const STATUSES = ['CONFIRMED BY PARTNER', 'DORMANT - NO RESPONSE', 'INACTIVE', 'PENDING - UPDATE EXPECTED',
  'HELD - BUSINESS DECISION'];
const CONFIRMED = 'CONFIRMED BY PARTNER';
const QUOTING = 'Quoting / Estimating';
const SCHEDULING = 'Scheduling / Coordination';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const BUILT_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const kindOfError = (e) => (e && e.constructor && e.constructor.name) || typeof e;
const isGroup = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const hasNames = (v, names) => isGroup(v) && JSON.stringify(Object.keys(v)) === JSON.stringify(names);
const whole = (v) => Number.isInteger(v) && v >= 0;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * Every line, worked out on the three files in `folder`: { results, facts }. results: one
 * { id, ok, text } for each of LINES, in order. facts: builtAt, the three counts build.json
 * gives, whether the first check was skipped (yes or no), and the sizes in bytes. Nothing in
 * either holds a value taken from a record. It never throws.
 */
export function checkPublished(folder = PUBLISHED) {
  const results = [];
  const facts = { builtAt: null, counts: null, skipped: null, sizes: {} };
  const raw = {};
  const doc = {};
  const line = (id, work) => {
    try {
      const [ok, text] = work();
      results.push({ id, ok, text });
    } catch (e) {
      results.push({ id, ok: false, text: `could not tell: an error of kind ${kindOfError(e)} at step "${id}"` });
    }
  };

  line('files', () => {
    const p = [];
    for (const name of FILES) {
      const path = join(folder, name);
      if (!existsSync(path)) { p.push(`${name} is not there`); continue; }
      raw[name] = readFileSync(path);
      facts.sizes[name] = raw[name].length;
      try { doc[name] = JSON.parse(raw[name].toString('utf8')); } catch { p.push(`${name} does not read as JSON`); }
    }
    return p.length ? [false, p.join('; ')] : [true, 'installers.json, territory.json and build.json are there, and each reads as JSON'];
  });
  if (!FILES.every((name) => doc[name] !== undefined)) {
    for (const id of LINES.slice(1)) results.push({ id, ok: false, text: 'could not tell: a file is not there or does not read as JSON' });
    return { results, facts };
  }
  const list = doc['installers.json'].installers;
  const states = doc['territory.json'].states;
  const build = doc['build.json'];
  try {
    facts.builtAt = typeof build.builtAt === 'string' && BUILT_AT.test(build.builtAt) ? build.builtAt : '(does not read like a time)';
    facts.counts = { installers: build.counts.installers, contacts: build.counts.contacts, territoryRows: build.counts.territoryRows };
  } catch { /* the build.json line says what is wrong */ }

  line('build.json', () => {
    const p = [];
    if (!hasNames(build, BUILD_NAMES)) p.push('its names are not schema, builtAt, counts, gaps, checks and files, in that order');
    if (build.schema !== 1) p.push('schema is not 1');
    if (typeof build.builtAt !== 'string' || !BUILT_AT.test(build.builtAt)) p.push('builtAt does not read like 2026-10-07T09:20:31Z');
    if (!hasNames(build.counts, COUNT_NAMES)) p.push('the names in counts are not those of section 3.6, in order');
    else {
      for (const k of COUNT_NAMES.slice(0, -1)) if (!whole(build.counts[k])) p.push(`counts.${k} is not a whole number`);
      const byStatus = build.counts.byStatus;
      if (!Array.isArray(byStatus) || byStatus.length !== STATUSES.length
        || byStatus.some((s, i) => !hasNames(s, ['status', 'installers']) || s.status !== STATUSES[i] || !whole(s.installers))) {
        p.push('byStatus is not the five statuses in order, each with status and installers');
      }
    }
    if (!hasNames(build.gaps, GAP_NAMES)) p.push('the names in gaps are not noQuoting, noScheduling and neither');
    else for (const k of GAP_NAMES) if (!whole(build.gaps[k])) p.push(`gaps.${k} is not a whole number`);
    if (!hasNames(build.files, FINGERPRINTED)) p.push('the names in files are not installers.json and territory.json');
    if (!Array.isArray(build.checks)) p.push('checks is not a list');
    return p.length ? [false, p.join('; ')] : [true, 'the names of section 3.6, in order; schema 1; builtAt reads like 2026-10-07T09:20:31Z'];
  });

  line('checks', () => {
    const checks = build.checks;
    if (!Array.isArray(checks)) return [false, 'checks is not a list'];
    const p = [];
    if (checks.length !== CHECK_NAMES.length) p.push(`${checks.length} checks, not seven`);
    CHECK_NAMES.forEach((name, i) => {
      const c = checks[i];
      if (!isGroup(c) || c.check !== i + 1 || c.name !== name) { p.push(`check ${i + 1} is not there by its name`); return; }
      const passed = hasNames(c, ['check', 'name', 'passed']) && c.passed === true;
      const skipped = i === 0 && hasNames(c, ['check', 'name', 'skipped']) && c.skipped === true;
      if (!passed && !skipped) p.push(`check ${i + 1} did not pass`);
    });
    facts.skipped = isGroup(checks[0]) && checks[0].skipped === true ? 'yes' : 'no';
    return p.length ? [false, p.join('; ')]
      : [true, `the seven checks are there by number and name, and each passed; the first was skipped: ${facts.skipped}`];
  });

  line('fingerprints', () => {
    const p = FINGERPRINTED.filter((name) => !isGroup(build.files) || build.files[name] !== sha256(raw[name]))
      .map((name) => `${name} does not match its fingerprint in build.json`);
    return p.length ? [false, p.join('; ')] : [true, 'installers.json and territory.json each match their fingerprint (SHA-256) in build.json'];
  });

  line('counts', () => {
    const k = build.counts;
    const statusCount = (s) => { const x = k.byStatus.find((y) => y.status === s); return x ? x.installers : undefined; };
    const pairs = [
      ['installers', k.installers, list.length],
      ['contacts', k.contacts, list.reduce((n, i) => n + i.contacts.length, 0)],
      ...STATUSES.map((s) => [s, statusCount(s), list.filter((i) => i.status === s).length]),
      ['with territory', k.installersWithTerritory, list.filter((i) => i.territory !== undefined).length],
      ['without territory', k.installersWithoutTerritory, list.filter((i) => i.territory === undefined).length],
      ['counties covered', k.countiesCovered, new Set(states.flatMap((s) => s.counties.map((c) => c.id))).size],
    ];
    const p = pairs.filter(([, a, b]) => a !== b).map(([label, a, b]) => `${label}: build.json ${a}, made again ${b}`);
    const other = list.filter((i) => !STATUSES.includes(i.status)).length;
    if (other) p.push(`${other} installer(s) with none of the five statuses`);
    return p.length ? [false, p.join('; ')]
      : [true, `${pairs.map(([label, a]) => `${label} ${a}`).join('; ')}: each equal in build.json and made again from installers.json and territory.json`];
  });

  line('J11', () => {
    const per = {};
    let notText = 0;
    let zero = 0;
    const walk = (v, name) => {
      if (Array.isArray(v)) { for (const x of v) walk(x, name); return; }
      if (!isGroup(v)) return;
      for (const [key, x] of Object.entries(v)) {
        if (key === 'counties' && Array.isArray(x)) {
          for (const c of x) {
            per[name]++;
            const id = isGroup(c) ? c.id : undefined;
            if (typeof id !== 'string') notText++;
            else if (id.startsWith('0')) zero++;
          }
        }
        walk(x, name);
      }
    };
    for (const name of FILES) { per[name] = 0; walk(doc[name], name); }
    const ids = FILES.reduce((n, name) => n + per[name], 0);
    return [notText === 0, `${ids} county ids (${FILES.map((name) => `${name} ${per[name]}`).join(', ')}); ${notText} not text; ${zero} begin with a zero`];
  });

  line('J12', () => {
    const fromContacts = { noQuoting: 0, noScheduling: 0, neither: 0 };
    const fromRows = { noQuoting: 0, noScheduling: 0, neither: 0 };
    const add = (n, q, s) => { n.noQuoting += q ? 1 : 0; n.noScheduling += s ? 1 : 0; n.neither += q && s ? 1 : 0; };
    for (const i of list) {
      const held = new Set(i.contacts.filter((c) => c.departed !== true).flatMap((c) => (Array.isArray(c.roles) ? c.roles : [])));
      add(fromContacts, !held.has(QUOTING), !held.has(SCHEDULING));
      const gap = i.row.gap;
      add(fromRows, gap === 'quoting' || gap === 'both', gap === 'scheduling' || gap === 'both');
    }
    const g = build.gaps;
    const three = (n) => `${n.noQuoting}, ${n.noScheduling}, ${n.neither}`;
    const same = (n) => GAP_NAMES.every((k) => n[k] === g[k]);
    const p = [];
    if (!same(fromContacts)) p.push("the count from the contacts' roles differs");
    if (!same(fromRows)) p.push("the count from the rows' gaps differs");
    const text = `gap counts in build.json ${three(g)}; from the contacts' roles, departed left out, ${three(fromContacts)}; from the gap each row carries ${three(fromRows)}`;
    return [p.length === 0, p.length ? `${p.join('; ')}: ${text}` : text];
  });

  line('J13', () => {
    const dated = list.filter((i) => i.lastConfirmed !== undefined);
    const other = dated.filter((i) => i.status !== CONFIRMED).length;
    return [other === 0, `lastConfirmed is written on ${dated.length} installer(s), ${other} of them with a status other than CONFIRMED BY PARTNER`];
  });

  line('J14', () => {
    let places = 0;
    let departed = 0;
    let nobody = 0;
    for (const i of list) {
      for (const k of ['quoting', 'scheduling']) {
        const place = i.row[k];
        if (!place) continue;
        places++;
        const c = Number.isInteger(place.contact) ? i.contacts[place.contact] : undefined;
        if (!c) nobody++;
        else if (c.departed === true) departed++;
      }
    }
    const marked = list.reduce((n, i) => n + i.contacts.filter((c) => c.departed === true).length, 0);
    return [departed === 0 && nobody === 0, `${places} row places filled; ${departed} hold a contact marked departed; ${nobody} point at no contact; ${marked} contacts are marked departed`];
  });

  line('empties', () => {
    const n = { null: 0, emptyText: 0, emptyList: 0, emptyGroup: 0 };
    const always = { noContacts: 0, emptyContact: 0, emptyRow: 0 };
    const walk = (v, path) => {
      if (v === null) { n.null++; return; }
      if (v === '') { n.emptyText++; return; }
      if (Array.isArray(v)) {
        if (!v.length) {
          if (/^installers\.installers\.\d+\.contacts$/.test(path)) always.noContacts++;
          else n.emptyList++;
        }
        v.forEach((x, i) => walk(x, `${path}.${i}`));
        return;
      }
      if (isGroup(v)) {
        if (!Object.keys(v).length) {
          if (/^installers\.installers\.\d+\.contacts\.\d+$/.test(path)) always.emptyContact++;
          else if (/^installers\.installers\.\d+\.row$/.test(path)) always.emptyRow++;
          else n.emptyGroup++;
        }
        for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
      }
    };
    for (const name of FILES) walk(doc[name], name.replace(/\.json$/, ''));
    const bad = n.null + n.emptyText + n.emptyList + n.emptyGroup;
    return [bad === 0, `null ${n.null}; empty text ${n.emptyText}; empty list ${n.emptyList}; empty group ${n.emptyGroup}; `
      + `always written: installers with no contact ${always.noContacts}, contacts with nothing filled ${always.emptyContact}, empty rows ${always.emptyRow}`];
  });

  line('dates', () => {
    const dates = [];
    for (const i of list) {
      for (const v of [i.lastConfirmed, i.ratesValidThrough, isGroup(i.paperwork) ? i.paperwork.coiValidThrough : undefined]) {
        if (v !== undefined) dates.push(v);
      }
    }
    const unlike = dates.filter((d) => typeof d !== 'string' || !DATE.test(d)).length;
    return [unlike === 0, `${dates.length} dates written (lastConfirmed, ratesValidThrough, paperwork.coiValidThrough); ${unlike} not written like 2026-10-06`];
  });

  return { results, facts };
}

function main() {
  const given = process.argv[2];
  const folder = given ? resolve(given) : PUBLISHED;
  const { results, facts } = checkPublished(folder);
  console.log(`Checking the three published files in ${given ? 'the folder given' : 'public/data'}.`);
  for (const r of results) console.log(`${r.id} ${r.ok ? 'PASS' : 'FAIL'}: ${r.text}`);
  console.log(`builtAt: ${facts.builtAt ?? 'not read'}`);
  console.log(`build.json gives: installers ${facts.counts ? facts.counts.installers : 'not read'}; contacts ${facts.counts ? facts.counts.contacts : 'not read'}; territory rows ${facts.counts ? facts.counts.territoryRows : 'not read'}`);
  console.log(`the first check was skipped: ${facts.skipped ?? 'not read'}`);
  console.log(`sizes in bytes: ${FILES.map((name) => `${name} ${facts.sizes[name] ?? 'not there'}`).join('; ')}`);
  const failed = results.filter((r) => !r.ok).map((r) => r.id);
  console.log(failed.length ? `check:published: ${failed.length} failed (${failed.join(', ')})` : `check:published: PASS, ${results.length} lines`);
  return failed.length ? 1 : 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) {
  try {
    process.exitCode = main();
  } catch (e) {
    console.log(`check:published FAIL: an error of kind ${kindOfError(e)} at step "main"`);
    process.exitCode = 1;
  }
}
