/**
 * What the page's tests, npm run check:page:published and npm run page:pictures share:
 *
 *   - the made-up installers: the job's (scripts\fixtures\installers.json) and the page's own
 *     (scripts\fixtures\page-installers.json), turned into the three files by the job itself,
 *     the way the job's tests do, into a temporary folder whose name begins installer-index-;
 *   - ways to walk the tree of elements a view gives back, and to change a copy of it, for the
 *     broken cases;
 *   - what section 4.4 of docs\SPEC.md says the Installer view shows for an installer, written
 *     out here apart from the page's own code.
 *
 * Nothing here reads public\data, the real key or QuickBase.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { FIXTURE, ROOT, runJob, standInClock, toRecords } from './job-standins.mjs';
import { readData } from '../public/js/data.js';
import { isElement, textOf } from '../public/js/html.js';

export { ROOT };
export const PAGE_FIXTURE = JSON.parse(readFileSync(resolve(ROOT, 'scripts', 'fixtures', 'page-installers.json'), 'utf8'));
export const COUNTIES_TEXT = readFileSync(resolve(ROOT, 'public', 'geo', 'counties.json'), 'utf8');
export const DATA_FILES = ['installers.json', 'territory.json', 'build.json'];
/** builtAt of the made-up files in the tests, held fixed: 2026-10-07T09:20:31Z. */
export const TEST_BUILT_AT = Date.parse('2026-10-07T09:20:31Z');

/* ================================================================ temporary folders */

const temps = [];
const slashes = (p) => p.replace(/\\/g, '/');

/** A new temporary folder whose name begins installer-index-page-, deleted by removePageTemps. */
export function pageTemp(tag) {
  const d = mkdtempSync(join(tmpdir(), `installer-index-page-${tag}-`));
  temps.push(d);
  return d;
}

/**
 * Deletes a folder by its own full path, given with forward slashes, trying a few times, and
 * confirms it is gone. Returns true when it is gone.
 */
export async function removeFolder(path) {
  const p = slashes(path);
  for (let i = 0; i < 6 && existsSync(p); i++) {
    try { rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* tried again */ }
    if (existsSync(p)) await new Promise((ok) => setTimeout(ok, 500));
  }
  return !existsSync(p);
}

/** Deletes every folder pageTemp made. Returns those that would not go. */
export async function removePageTemps() {
  const left = [];
  for (const d of temps.splice(0)) if (!(await removeFolder(d))) left.push(slashes(d));
  return left;
}

/** The job's made-up installers with the page's own added. */
export function madeUpFixture() {
  return {
    master: [...FIXTURE.master, ...PAGE_FIXTURE.master],
    contacts: [...FIXTURE.contacts, ...PAGE_FIXTURE.contacts],
    territory: [...FIXTURE.territory, ...PAGE_FIXTURE.territory],
  };
}

/**
 * Runs the job on the made-up installers, writing the three files into a new temporary folder:
 * { dir, texts }. builtAt is the moment the job's stand-in clock gives.
 */
export async function writeMadeUp({ builtAt = TEST_BUILT_AT, tag = 'made' } = {}) {
  const dir = pageTemp(tag);
  const r = await runJob({ records: toRecords(madeUpFixture()), args: ['--out', dir], clock: standInClock(builtAt) });
  if (r.outcome.code !== 0) throw new Error('the job did not write the made-up files');
  const texts = Object.fromEntries(DATA_FILES.map((name) => [name, readFileSync(join(dir, name), 'utf8')]));
  return { dir, texts };
}

let made = null;
/** The made-up files' texts, made once: { 'installers.json', 'territory.json', 'build.json' }. */
export async function madeUpTexts() {
  if (!made) made = (await writeMadeUp()).texts;
  return made;
}

/** The page's model of the made-up files, as the page reads them. */
export async function madeUpModel() {
  const t = await madeUpTexts();
  const r = readData({ build: t['build.json'], installers: t['installers.json'], territory: t['territory.json'], counties: COUNTIES_TEXT });
  if (!r.ok) throw new Error(`the page could not read the made-up files: ${r.problem}`);
  return r.model;
}

/* ================================================================ walking a tree */

export const attr = (node, name) => (isElement(node) ? node.attrs[name] : undefined);
export const hasClass = (node, name) => isElement(node) && typeof node.attrs.class === 'string' && node.attrs.class.split(' ').includes(name);

/** Every element of a tree for which f is true, in document order. */
export function findAll(node, f, out = []) {
  if (Array.isArray(node)) { for (const n of node) findAll(n, f, out); return out; }
  if (!isElement(node)) return out;
  if (f(node)) out.push(node);
  for (const c of node.children) findAll(c, f, out);
  return out;
}
export const find = (node, f) => findAll(node, f)[0];
export const byAttr = (node, name, value) => findAll(node, (n) => (value === undefined ? n.attrs[name] !== undefined && n.attrs[name] !== null && n.attrs[name] !== false : n.attrs[name] === value));

/** A copy of a tree without what is closed: elements marked hidden, and a closed details but its summary. */
function closed(node) {
  if (Array.isArray(node)) return node.map(closed);
  if (!isElement(node)) return node;
  if (node.attrs.hidden) return '';
  const children = node.tag === 'details' && !node.attrs.open
    ? node.children.filter((c) => isElement(c) && c.tag === 'summary') : node.children;
  return { ...node, children: children.map(closed) };
}

/** The text a reader sees without opening anything. */
export const faceText = (node) => textOf(closed(node));

export const squash = (s) => String(s).replace(/\s+/g, ' ').trim();

/** A copy of a tree with f applied to every element, from the leaves up. f returns an element, a list, or null to drop it. */
export function mapTree(node, f) {
  if (Array.isArray(node)) return node.map((n) => mapTree(n, f)).flat().filter((n) => n !== null && n !== undefined);
  if (!isElement(node)) return node;
  const copy = { ...node, attrs: { ...node.attrs }, children: node.children.map((c) => mapTree(c, f)).flat().filter((n) => n !== null && n !== undefined) };
  return f(copy);
}

/** A render function whose output tree is changed by f(node): a broken page, for a broken case. */
export const transformed = (render, f) => (route, model, opts) => {
  const out = render(route, model, opts);
  return { ...out, node: mapTree(out.node, f) };
};

/* ================================================================ section 4.4, written out apart */

const CONFIRMED = 'CONFIRMED BY PARTNER';
const filled = (v) => v !== undefined && v !== null && v !== '';
const group = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/**
 * The fields section 4.4 names that the Installer view must show for an installer, by the
 * name each has in installers.json, with the value and its kind: [{ name, value }]. With the
 * rulings: "Last confirmed" only for CONFIRMED BY PARTNER; a ticked "Not applicable" box shows
 * for an empty field (ruling 5); whichever Tier 2 parts are filled (ruling 4); the paperwork as
 * QuickBase has it (ruling 3); the coverage note whenever it is filled (ruling 10).
 */
export function expectedFields(i) {
  const out = [];
  const add = (name, value) => out.push({ name, value });
  if (i.status === CONFIRMED && filled(i.lastConfirmed)) add('lastConfirmed', i.lastConfirmed);
  if (Object.keys(group(i.office)).length) add('office', i.office);
  const ship = (which) => (Array.isArray(i.shipping) ? i.shipping.find((s) => s && s.which === which) : undefined);
  if (ship(1)) add('shipping', ship(1)); else if (i.shippingNotApplicable === true) add('shipping', 'Not applicable');
  if (ship(2)) add('secondShipping', ship(2)); else if (i.secondShippingNotApplicable === true) add('secondShipping', 'Not applicable');
  for (const k of ['nonUnionST', 'nonUnionOT', 'unionST', 'unionOT']) if (typeof group(i.rates)[k] === 'number') add(`rates.${k}`, i.rates[k]);
  for (const k of ['mobilization', 'ratesValidThrough', 'shopStatus', 'pricingNotes']) if (filled(i[k])) add(k, i[k]);
  for (const k of ['basis', 'unit', 'unitOther', 'amount', 'relation']) if (filled(group(i.tier2Charge)[k])) add(`tier2Charge.${k}`, i.tier2Charge[k]);
  if (filled(i.coverageNote)) add('coverageNote', i.coverageNote);
  for (const k of ['agreementOnFile', 'coiOnFile', 'coiValidThrough']) if (filled(group(i.paperwork)[k])) add(`paperwork.${k}`, i.paperwork[k]);
  if (filled(group(i.warehousing).available)) add('warehousing.available', i.warehousing.available);
  if (Array.isArray(group(i.warehousing).at) && i.warehousing.at.length) add('warehousing.at', i.warehousing.at);
  if (filled(i.travelNote)) add('travelNote', i.travelNote); else if (i.travelNoteNotApplicable === true) add('travelNote', 'Not applicable');
  if (filled(i.emr)) add('emr', i.emr); else if (i.emrNotApplicable === true) add('emr', 'Not applicable');
  for (const k of ['notes', 'anythingElse']) if (filled(i[k])) add(k, i[k]);
  return out;
}

/** Every field name expectedFields can give. */
export const FIELD_NAMES = ['lastConfirmed', 'office', 'shipping', 'secondShipping', 'rates.nonUnionST', 'rates.nonUnionOT', 'rates.unionST',
  'rates.unionOT', 'mobilization', 'ratesValidThrough', 'shopStatus', 'pricingNotes', 'tier2Charge.basis', 'tier2Charge.unit',
  'tier2Charge.unitOther', 'tier2Charge.amount', 'tier2Charge.relation', 'coverageNote', 'paperwork.agreementOnFile',
  'paperwork.coiOnFile', 'paperwork.coiValidThrough', 'warehousing.available', 'warehousing.at', 'travelNote', 'emr', 'notes',
  'anythingElse'];

/** The kind of a value, for a failing line: text, number, list, group, true, false or nothing. */
export function kindOf(v) {
  if (v === undefined || v === null) return 'nothing';
  if (typeof v === 'string') return 'text';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return 'list';
  return 'group';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November',
  'December'];
/** 2026-10-07 as October 7, 2026, written out apart from the page. */
export const spelledDate = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : d;
};
/** 87.35 as $87.35, written out apart from the page. */
export const dollars = (n) => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

/**
 * The pieces of text a field's value must show, as the view writes them, each with the name of
 * the value in the file it comes from: each part of an address, a date spelled out, a rate in
 * dollars, each entry of a list, the text as written. [{ name, piece, value }]
 */
export function valueChecks(name, value) {
  if (value === 'Not applicable') return [{ name, piece: 'Not applicable', value }];
  if (['office', 'shipping', 'secondShipping'].includes(name)) {
    return ['street1', 'street2', 'city', 'state', 'postalCode', 'country'].filter((k) => filled(value[k]))
      .map((k) => ({ name: `${name}.${k}`, piece: String(value[k]), value: value[k] }));
  }
  if (name.startsWith('rates.')) return [{ name, piece: dollars(value), value }];
  if (['lastConfirmed', 'ratesValidThrough', 'paperwork.coiValidThrough'].includes(name)) return [{ name, piece: spelledDate(value), value }];
  if (Array.isArray(value)) return value.map((v) => ({ name, piece: String(v), value: v }));
  return [{ name, piece: String(value), value }];
}
