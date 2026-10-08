/**
 * The tests of the map work, in npm run check:page beside scripts\page-tests.mjs: the files of
 * public\geo that job\build-shapes.mjs, job\build-zips.mjs and job\build-cities.mjs write, and the
 * views that draw them: Find installers, a place's view (a state, a county, a ZIP code or a city)
 * and the location box. Brought to the ninth revision by the page's third prompt: territory is
 * Tier 1, a place lists Tier 1 with a button for Tier 2, and a place's lists, counts and shades
 * hold only CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED installers (section 4.0).
 *
 * Same shape as the page's tests: sound cases that must pass and broken cases that must fail and
 * say why (mustSay); npm run check:selftest runs both. What a view must show is worked out here
 * apart from the page, from the files.
 *
 * Nothing here reads public\data, the real key, QuickBase or the network. A phone-shaped run of
 * digits that a broken case needs is put together when it runs.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCAN_PATTERNS } from './checks.mjs';
import {
  byAttr, cityDocs, COUNTIES_TEXT, find, findAll, geoFiles, hasClass, madeUpModel, madeUpTexts, mapTree, ROOT, squash, transformed,
} from './page-standins.mjs';
import { bannedIn, cellOf, filesApart, LISTED_SPEC, rowsOf, ST, VIEW_NAMES, VIEWS, withInstaller } from './page-tests.mjs';
import { countyMapPath, HOME_MAP, loadExtra, makeModel, zipPath } from '../public/js/data.js';
import { textOf, toHtml } from '../public/js/html.js';
import { countySuggestions, shadeStep } from '../public/js/maps.js';
import { boxAddress, parseHash, stateHash, toHash } from '../public/js/routes.js';
import { citiesNeeded, LOCATION_HINT, suggest } from '../public/js/places.js';
import { filesFor, mapPart, renderView, TIER2_HIDE, TIER2_SHOW } from '../public/js/views.js';

export { geoFiles };
export const MAP_TESTS = [];
const test = (line, label, sound, broken) => MAP_TESTS.push({ line, label, sound, broken });
const ok = (why) => ({ ok: true, why });
const no = (why) => ({ ok: false, why });
const sound = (label, run) => ({ label, run });
const broken = (label, mustSay, run) => ({ label, mustSay, run });

export const GEO = join(ROOT, 'public', 'geo');
const COUNTY_LIST = () => JSON.parse(readFileSync(join(GEO, 'counties.json'), 'utf8'));

/* ================================================================== the built files */

/** The map, ZIP and city files as they are on disk: { counties, zips, cities: [names], texts: { name: text } }. */
export function builtFiles() {
  const counties = readdirSync(join(GEO, 'counties')).sort();
  const zips = readdirSync(join(GEO, 'zips')).sort();
  const cities = readdirSync(join(GEO, 'cities')).sort();
  const texts = { 'states-map.json': readFileSync(join(GEO, 'states-map.json'), 'utf8') };
  for (const n of counties) texts[`counties/${n}`] = readFileSync(join(GEO, 'counties', n), 'utf8');
  for (const n of zips) texts[`zips/${n}`] = readFileSync(join(GEO, 'zips', n), 'utf8');
  for (const n of cities) texts[`cities/${n}`] = readFileSync(join(GEO, 'cities', n), 'utf8');
  return { counties, zips, cities, texts };
}

/** A path as rule 16 allows it: M x,y, then l dx,dy,... and z, for each ring; whole numbers, commas between. */
export const PATH_SHAPE = /^(?:M\d+,\d+(?:l-?\d+,-?\d+(?:,-?\d+,-?\d+)*)?z)+$/;

/** The points of a path that keeps to PATH_SHAPE, in the frame's units. */
export function pathPoints(path) {
  const out = [];
  for (const m of path.matchAll(/M(\d+),(\d+)(?:l([-\d,]+))?z/g)) {
    let x = Number(m[1]);
    let y = Number(m[2]);
    out.push([x, y]);
    if (m[3]) {
      const n = m[3].split(',').map(Number);
      for (let i = 0; i < n.length; i += 2) { x += n[i]; y += n[i + 1]; out.push([x, y]); }
    }
  }
  return out;
}

/** The box of a path, and its centre. */
export function pathBox(path) {
  const p = pathPoints(path);
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of p) { b.minX = Math.min(b.minX, x); b.minY = Math.min(b.minY, y); b.maxX = Math.max(b.maxX, x); b.maxY = Math.max(b.maxY, y); }
  return { ...b, cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, w: b.maxX - b.minX };
}

/** Places written out by hand, that show a map the right way up and not mirrored. */
const PLACES = [
  ['states-map.json', 'Washington lies left of Maine', (s) => s.WA.cx < s.ME.cx],
  ['states-map.json', 'Washington lies above Florida', (s) => s.WA.cy < s.FL.cy],
  ['states-map.json', 'Ontario lies above Ohio', (s) => s.ON.cy < s.OH.cy],
  ['states-map.json', 'Alaska lies left of Texas', (s) => s.AK.cx < s.TX.cx],
  ['states-map.json', 'Hawaii lies left of Texas', (s) => s.HI.cx < s.TX.cx],
  ['counties/OH.json', 'Lake County (39085) lies above Lawrence County (39087)', (s) => s['39085'].cy < s['39087'].cy],
  ['counties/OH.json', 'Williams County (39171) lies left of Columbiana County (39029)', (s) => s['39171'].cx < s['39029'].cx],
  ['counties/TX.json', 'El Paso County (48141) lies left of Bowie County (48037)', (s) => s['48141'].cx < s['48037'].cx],
  ['counties/TX.json', 'Dallam County (48111) lies above Cameron County (48061)', (s) => s['48111'].cy < s['48061'].cy],
  ['counties/AK.json', 'the Aleutians West area (02016) lies left of Ketchikan Gateway (02130)', (s) => s['02016'].cx < s['02130'].cx],
  ['counties/AK.json', 'the Aleutians West area (02016) is less than half the frame wide', (s, f) => s['02016'].w < f.width / 2],
  ['counties/ON.json', 'Kenora (CA-3560) lies left of Ottawa (CA-3506)', (s) => s['CA-3560'].cx < s['CA-3506'].cx],
  ['counties/ON.json', 'Kenora (CA-3560) lies above Essex (CA-3537)', (s) => s['CA-3560'].cy < s['CA-3537'].cy],
];

/** A city's id as job\build-cities.mjs writes it, written out apart. */
const cityIdOf = (state, name) => `${state}-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const byText = (a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : a < b ? -1 : a > b ? 1 : 0);

/** The built files, against step 2g of the page's second prompt and step 3d of the third. */
export function builtFilesProblems(files, countyList = COUNTY_LIST()) {
  const p = [];
  const codes = countyList.states.map((s) => s.code);
  const wantStateFiles = codes.map((c) => `${c}.json`).sort();
  const wantZips = Array.from({ length: 10 }, (_, d) => `${d}.json`);
  if (files.counties.join('|') !== wantStateFiles.join('|')) p.push(`the folder of county files holds ${files.counties.length} files, not the ${wantStateFiles.length} state files and nothing else`);
  if (files.zips.join('|') !== wantZips.join('|')) p.push(`the folder of ZIP files holds ${files.zips.length} files, not 0.json to 9.json and nothing else`);
  if (files.cities.join('|') !== wantStateFiles.join('|')) p.push(`the folder of city files holds ${files.cities.length} files, not one for each of the ${wantStateFiles.length} state codes and nothing else`);
  const docs = {};
  for (const [name, text] of Object.entries(files.texts)) {
    try { docs[name] = JSON.parse(text); } catch { p.push(`${name} does not read as JSON`); continue; }
    if (docs[name].schema !== 1) p.push(`${name} does not carry schema 1`);
  }
  if (p.length) return p;
  // Every county in the list, one shape, in its state's file; no shape that is not in the list.
  const listed = new Map(countyList.counties.map((c) => [c.id, c]));
  const shapes = new Map();
  for (const code of codes) {
    const doc = docs[`counties/${code}.json`];
    if (doc.state !== code) p.push(`counties/${code}.json says it is the map of ${doc.state}`);
    for (const c of doc.counties) {
      if (!listed.has(c.id)) { p.push(`counties/${code}.json holds a shape that is not in the county list (${c.id})`); continue; }
      if (listed.get(c.id).state !== code) p.push(`county ${c.id} is drawn in ${code}'s file, not its own state's`);
      shapes.set(c.id, (shapes.get(c.id) || 0) + 1);
    }
  }
  for (const id of listed.keys()) if (shapes.get(id) !== 1) p.push(`county ${id} has ${shapes.get(id) || 0} shapes, not one`);
  // The Home map: the 52 codes once each.
  const home = docs['states-map.json'];
  const homeCodes = home.states.map((s) => s.code);
  if (homeCodes.slice().sort().join('|') !== codes.slice().sort().join('|')) p.push(`the Home map holds the codes ${homeCodes.length} times, not the 52 once each`);
  // Every path keeps to rule 16 and is drawn inside its frame.
  const frames = [['states-map.json', home, home.states.map((s) => [s.code, s.path])],
    ...codes.map((code) => [`counties/${code}.json`, docs[`counties/${code}.json`], docs[`counties/${code}.json`].counties.map((c) => [c.id, c.path])])];
  let paths = 0;
  for (const [name, doc, list] of frames) {
    for (const [key, path] of list) {
      paths++;
      if (typeof path !== 'string' || !PATH_SHAPE.test(path)) { p.push(`${name}: the path of ${key} does not keep to rule 16`); continue; }
      const b = pathBox(path);
      if (b.minX < 0 || b.minY < 0 || b.maxX > doc.width || b.maxY > doc.height) p.push(`${name}: the path of ${key} is drawn outside its frame`);
    }
  }
  for (const s of home.states) {
    if (!Array.isArray(s.label) || s.label.length !== 2 || !s.label.every(Number.isInteger) || typeof s.fits !== 'boolean') p.push(`states-map.json: ${s.code} has no point for its code, or no word on whether it fits`);
  }
  // Every ZIP five digits, every county it names in the list.
  let zipCount = 0;
  for (let d = 0; d <= 9; d++) {
    for (const z of docs[`zips/${d}.json`].zips) {
      zipCount++;
      if (typeof z.zip !== 'string' || !/^\d{5}$/.test(z.zip) || z.zip[0] !== String(d)) p.push(`zips/${d}.json: a ZIP code is not five digits beginning ${d}`);
      if (z.outside === true ? z.counties !== undefined : !Array.isArray(z.counties) || !z.counties.length) p.push(`zips/${d}.json: ${z.zip} is neither outside the map nor given its counties`);
      for (const id of z.counties || []) if (typeof id !== 'string' || !listed.has(id)) p.push(`zips/${d}.json: ${z.zip} names a county that is not in the county list`);
    }
  }
  // Every city: its id as step 3d writes it, told apart from a second of the same id; its name;
  // its state, the file's; its counties in the list and in that state; in order of state and name.
  let cityCount = 0;
  const ids = new Set();
  for (const code of codes) {
    const doc = docs[`cities/${code}.json`];
    if (doc.state !== code) p.push(`cities/${code}.json says it holds the cities of ${doc.state}`);
    if (!Array.isArray(doc.cities)) { p.push(`cities/${code}.json holds no list of cities`); continue; }
    doc.cities.forEach((c, k) => {
      cityCount++;
      const keys = Object.keys(c).join(',');
      if (keys !== 'id,name,state,counties') p.push(`cities/${code}.json: a city holds ${keys}, not id, name, state and counties`);
      if (typeof c.name !== 'string' || !c.name.trim() || c.state !== code) p.push(`cities/${code}.json: a city has no name, or another state`);
      const base = cityIdOf(code, c.name);
      if (typeof c.id !== 'string' || !(c.id === base || new RegExp(`^${base.replace(/[-]/g, '\\-')}-[2-9]$`).test(c.id))) p.push(`cities/${code}.json: ${c.id} is not the id step 3d gives its name`);
      if (ids.has(c.id)) p.push(`the city id ${c.id} is given twice`);
      ids.add(c.id);
      if (!Array.isArray(c.counties) || !c.counties.length || c.counties.some((id) => typeof id !== 'string' || !listed.has(id) || listed.get(id).state !== code)) p.push(`cities/${code}.json: ${c.id} names a county that is not in the county list, or not in its state`);
      if (k > 0 && byText(doc.cities[k - 1].name, c.name) > 0) p.push(`cities/${code}.json: the cities are not in order of name at ${c.id}`);
    });
  }
  // No line of any of these files is read by R5's patterns.
  for (const [name, text] of Object.entries(files.texts)) {
    text.split('\n').forEach((line, i) => {
      for (const pat of SCAN_PATTERNS) if ([...line.matchAll(pat.re)].some((m) => !pat.allowed(m[0]))) p.push(`${name}:${i + 1} is read by R5 as ${pat.kind}`);
    });
  }
  // Each map the right way up and not mirrored, by places written out by hand.
  for (const [name, words, holds] of PLACES) {
    const doc = docs[name];
    const boxes = Object.fromEntries((doc.states || doc.counties).map((s) => [s.code || s.id, pathBox(s.path)]));
    if (!holds(boxes, doc)) p.push(`${name}: it is not so that ${words}`);
  }
  return p.length ? p : { paths, zips: zipCount, cities: cityCount };
}

function builtTest(files) {
  const r = builtFilesProblems(files);
  if (Array.isArray(r)) return no(`${r.length} problem(s): ${r.slice(0, 6).join('; ')}`);
  return ok(`52 county files, 10 ZIP files and 52 city files and nothing else; 3,193 county shapes, each once in its state's file; the 52 codes once on the Home map; ${r.paths} paths whole-numbered and inside their frames; ${r.zips} ZIP codes of five digits naming listed counties; ${r.cities} cities, each with the id of step 3d and its counties in its state; no line R5 reads; ${PLACES.length} places where they belong`);
}

/** A copy of the built files with one file's parsed contents changed, written back as JSON. */
function changed(name, f) {
  const files = builtFiles();
  const doc = JSON.parse(files.texts[name]);
  f(doc);
  files.texts[name] = JSON.stringify(doc);
  return files;
}
const mirrorPath = (path, width) => path.replace(/M(\d+),(\d+)(l[-\d,]+)?z/g, (m, x, y, l) => `M${width - Number(x)},${y}${l ? `l${l.slice(1).split(',').map((n, i) => (i % 2 === 0 ? String(-Number(n)) : n)).join(',')}` : ''}z`);
const flipPath = (path, height) => path.replace(/M(\d+),(\d+)(l[-\d,]+)?z/g, (m, x, y, l) => `M${x},${height - Number(y)}${l ? `l${l.slice(1).split(',').map((n, i) => (i % 2 === 1 ? String(-Number(n)) : n)).join(',')}` : ''}z`);

test('built files', 'the map, ZIP and city files of public\\geo, as step 2g of the second prompt and step 3d of the third say',
  [sound('the files as job/build-shapes.mjs, job/build-zips.mjs and job/build-cities.mjs wrote them', () => builtTest(builtFiles()))],
  [
    broken('a state\'s county file missing', 'not the 52 state files', () => { const f = builtFiles(); f.counties = f.counties.filter((n) => n !== 'OH.json'); delete f.texts['counties/OH.json']; return builtTest(f); }),
    broken('a file too many among the ZIP files', 'not 0.json to 9.json', () => { const f = builtFiles(); f.zips = [...f.zips, 'extra.json'].sort(); return builtTest(f); }),
    broken('a county drawn in another state\'s file', 'not its own state\'s', () => {
      const f = builtFiles();
      const oh = JSON.parse(f.texts['counties/OH.json']);
      const pa = JSON.parse(f.texts['counties/PA.json']);
      pa.counties.push(oh.counties.shift());
      f.texts['counties/OH.json'] = JSON.stringify(oh);
      f.texts['counties/PA.json'] = JSON.stringify(pa);
      return builtTest(f);
    }),
    broken('a county with no shape', 'has 0 shapes', () => builtTest(changed('counties/TX.json', (d) => { d.counties.pop(); }))),
    broken('a code twice on the Home map', 'not the 52 once each', () => builtTest(changed('states-map.json', (d) => { d.states[1] = { ...d.states[0] }; }))),
    broken('a path with a decimal', 'does not keep to rule 16', () => builtTest(changed('counties/OH.json', (d) => { d.counties[0].path = d.counties[0].path.replace(/^M(\d+),/, 'M$1.5,'); }))),
    broken('a path with a space', 'does not keep to rule 16', () => builtTest(changed('states-map.json', (d) => { d.states[3].path = d.states[3].path.replace(',', ' '); }))),
    broken('a path drawn outside its frame', 'drawn outside its frame', () => builtTest(changed('counties/DC.json', (d) => { d.counties[0].path = `M${d.width - 1},10l5,0,0,5z${d.counties[0].path}`; }))),
    broken('a ZIP of four digits', 'not five digits', () => builtTest(changed('zips/4.json', (d) => { d.zips[0].zip = d.zips[0].zip.slice(0, 4); }))),
    broken('a ZIP naming a county not in the list', 'not in the county list', () => builtTest(changed('zips/7.json', (d) => { d.zips[0].counties = ['72001']; }))),
    broken('a line R5 reads as a phone number', 'is read by R5 as a phone number', () => { const f = builtFiles(); f.texts['zips/2.json'] = f.texts['zips/2.json'].replace('"zips":[', `"note":"${['212', '867', '5309'].join(' ')}","zips":[`); return builtTest(f); }),
    broken('the Home map mirrored', 'Washington lies left of Maine', () => builtTest(changed('states-map.json', (d) => { for (const s of d.states) s.path = mirrorPath(s.path, d.width); }))),
    broken('Ohio upside down', 'Lake County (39085) lies above Lawrence County (39087)', () => builtTest(changed('counties/OH.json', (d) => { for (const c of d.counties) c.path = flipPath(c.path, d.height); }))),
    broken('Alaska with the Aleutians drawn across the frame', 'less than half the frame wide', () => builtTest(changed('counties/AK.json', (d) => { const c = d.counties.find((x) => x.id === '02016'); c.path = `${c.path}M${d.width - 70},${Math.round(d.height / 2)}l5,0,0,5z`; }))),
    broken('a city file missing', 'not one for each of the 52 state codes', () => { const f = builtFiles(); f.cities = f.cities.filter((n) => n !== 'ON.json'); delete f.texts['cities/ON.json']; return builtTest(f); }),
    broken('a city whose id is not the one step 3d gives', 'is not the id step 3d gives', () => builtTest(changed('cities/OH.json', (d) => { d.cities[0].id = d.cities[0].id.toUpperCase(); }))),
    broken('a city in a county of another state', 'not in its state', () => builtTest(changed('cities/OH.json', (d) => { d.cities[0].counties = ['01001']; }))),
    broken('cities out of order', 'not in order of name', () => builtTest(changed('cities/OH.json', (d) => { d.cities.reverse(); }))),
  ]);

/* ================================================================== the views */

const NOW = Date.parse('2026-10-07T16:00:00Z');
const REAL = { render: renderView, filesFor, mapPart, parse: parseHash, toHash, boxAddress, suggestions: countySuggestions, loadExtra, suggest, citiesNeeded };
const impl = (over = {}) => ({ ...REAL, ...over });

/** The five steps of shading, written out by hand apart from the page: 1; 2 to 3; 4 to 6; 7 to 10; 11 up. */
export const stepOf = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : n <= 10 ? 4 : 5);

/**
 * Who has territory in each state and each county, worked out from territory.json and
 * installers.json alone (section 4.0): Tier 1, and only CONFIRMED BY PARTNER and PENDING - UPDATE
 * EXPECTED. { byState: Map(code, Set(ids)), byCounty: Map(id, { tier1, tier2 }) }, where a
 * county's tier2 leaves out an installer it has at Tier 1.
 */
export function servedFrom(territoryText, installersText) {
  const status = new Map(JSON.parse(installersText).installers.map((i) => [i.id, i.status]));
  const listed = (id) => LISTED_SPEC.includes(status.get(id));
  const byState = new Map();
  const byCounty = new Map();
  for (const s of JSON.parse(territoryText).states) {
    const all = new Set();
    for (const c of s.counties) {
      const tier1 = (c.tier1Installers || []).filter(listed);
      const tier2 = (c.tier2Installers || []).filter((id) => listed(id) && !tier1.includes(id));
      byCounty.set(c.id, { tier1, tier2 });
      for (const i of tier1) all.add(i);
    }
    byState.set(s.state, all);
  }
  return { byState, byCounty };
}

const list = JSON.parse(COUNTIES_TEXT);
const STATE_CODES = list.states.map((s) => s.code);
const countiesOf = (code) => list.counties.filter((c) => c.state === code);
const view = (I, model, hash, { files = geoFiles(), mode = null } = {}) => I.render(I.parse(hash), model, { now: NOW, files, mode });
const shapesOf = (node) => findAll(node, (n) => n.tag === 'a' && n.attrs['data-shape'] !== undefined);
const tierRows = (node, tier) => rowsOf(node).filter((r) => r.attrs['data-tier'] === tier).map((r) => r.attrs['data-installer']);
const footOf = (node) => find(node, (n) => hasClass(n, 'foot-line'));
const served = async () => { const t = await madeUpTexts(); return servedFrom(t['territory.json'], t['installers.json']); };

/**
 * What a place's lists hold, worked out apart from the page (sections 4.0 and 4.4): each list of
 * ids in the order of the file. A place is { state } or { state, counties }.
 */
export function placeApart(A, { state, counties = null }) {
  const listed = (i) => LISTED_SPEC.includes(i.status);
  const tierIn = (i) => {
    if (counties) {
      if (counties.some((id) => (A.byCounty.get(id) || { tier1: [] }).tier1.includes(i.id))) return 1;
      return counties.some((id) => (A.byCounty.get(id) || { tier2: [] }).tier2.includes(i.id)) ? 2 : 0;
    }
    return A.countiesAt(1, i.id, state).length ? 1 : A.countiesAt(2, i.id, state).length ? 2 : 0;
  };
  const states = counties ? [...new Set(counties.map((id) => A.countyList.counties.find((c) => c.id === id).state))] : [state];
  return {
    tier1: A.installers.filter((i) => listed(i) && tierIn(i) === 1).map((i) => i.id),
    tier2: A.installers.filter((i) => listed(i) && tierIn(i) === 2).map((i) => i.id),
    dormant: A.installers.filter((i) => i.status === ST.dormant && tierIn(i) > 0).map((i) => i.id),
    offMap: A.installers.filter((i) => !A.onMap(i) && ![ST.inactive, ST.held].includes(i.status) && states.some((code) => A.officeIn(i, code))).map((i) => i.id),
  };
}

/* ---------------------------------------------------------------- M1 */

const CSS = () => readFileSync(join(ROOT, 'public', 'css', 'site.css'), 'utf8');
const STEP_COLOURS = [['shade-1', '#E8F0DC'], ['shade-2', '#C7D9AD'], ['shade-3', '#9EBD70'], ['shade-4', '#76A134'], ['shade-5', '#5A7D28'], ['shade-0', '#FFFFFF']];

async function m1(I, css = CSS()) {
  const model = await madeUpModel();
  const sv = await served();
  const shapes = shapesOf(view(I, model, '#/').node);
  if (shapes.length !== STATE_CODES.length) return no(`the map on Find installers draws ${shapes.length} states, not ${STATE_CODES.length}`);
  for (const code of STATE_CODES) {
    const a = shapes.find((s) => s.attrs['data-shape'] === code);
    const n = (sv.byState.get(code) || new Set()).size;
    const want = stepOf(n);
    const path = a && a.children.find((c) => c.tag === 'path');
    if (!a || a.attrs['data-step'] !== want || a.attrs['data-count'] !== n || !path || !path.attrs.class.split(' ').includes(`shade-${want}`)) return no(`${code} is shaded at step ${a ? a.attrs['data-step'] : 'none'} for ${a ? a.attrs['data-count'] : 'no'} installers, not ${want} for the ${n} CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED installers with territory (Tier 1) there`);
  }
  for (const [n, want] of [[0, 0], [1, 1], [2, 2], [3, 2], [4, 3], [6, 3], [7, 4], [10, 4], [11, 5], [40, 5]]) if (shadeStep(n) !== want) return no(`${n} installers give step ${shadeStep(n)}, not ${want}`);
  for (const [cls, colour] of STEP_COLOURS) if (!new RegExp(`\\.${cls} \\{ fill: ${colour}; \\}`).test(css)) return no(`the colour of ${cls} is not ${colour}`);
  // A code is written in #282828 on the four paler steps and on white, and in white on the darkest,
  // so that it measures at least 4.5 to 1: shown on a model with states shaded at each step.
  const darker = { ...model, stateCounts: new Map([...model.stateCounts, ['TX', 1], ['CA', 2], ['MT', 5], ['CO', 8], ['NE', 11]]) };
  const lum = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, k) => s + v * [0.2126, 0.7152, 0.0722][k], 0);
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const codeColour = (step) => (/\.map \.code-light \{ fill: #FFFFFF; \}/.test(css) && step === 5 ? '#FFFFFF' : /fill: #282828;/.test(css.slice(css.indexOf('.map .code {'))) ? '#282828' : '#000000');
  for (const a of shapesOf(view(I, darker, '#/').node)) {
    const text = a.children.find((c) => c.tag === 'text');
    if (!text) continue;
    const step = a.attrs['data-step'];
    const light = text.attrs.class.split(' ').includes('code-light');
    if (light !== (step === 5)) return no(`the code of ${a.attrs['data-shape']} is written ${light ? 'in white' : 'dark'} on step ${step}`);
    const fill = STEP_COLOURS.find(([cls]) => cls === `shade-${step}`)[1];
    if (ratio(codeColour(step), fill) < 4.5) return no(`the code of ${a.attrs['data-shape']} measures ${ratio(codeColour(step), fill).toFixed(2)} to 1 on step ${step}`);
  }
  return ok('all 52 shaded at the step for the number of CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED installers with territory (Tier 1) there; the five steps at their edges; their colours as the old page\'s; a code on every step at least 4.5 to 1');
}
test('M1', 'on Find installers, every state\'s shade is the step for the number of listed installers with territory (Tier 1) in it, for all 52',
  [sound('the page as built', () => m1(impl()))],
  [
    broken('Ohio shaded a step too pale', 'OH is shaded', () => m1(impl({ render: transformed(renderView, (n) => (n.attrs['data-shape'] === 'OH' ? { ...n, attrs: { ...n.attrs, 'data-step': 0 } } : n)) }))),
    broken('a map that counts every installer with any county there', 'with territory (Tier 1) there', () => m1(impl({ render: (r, m, o) => renderView(r, { ...m, stateCounts: new Map(m.stateList.map((s) => [s.code, [...m.coverage.values()].filter((x) => x.has(s.code)).length])) }, o) }))),
    broken('a colour that is not the old page\'s', 'the colour of shade-4', () => m1(impl(), CSS().replace('.shade-4 { fill: #76A134; }', '.shade-4 { fill: #88B04B; }'))),
    broken('a code written dark on the darkest step', 'is written dark on step 5', () => m1(impl({ render: transformed(renderView, (n) => (n.tag === 'text' ? { ...n, attrs: { ...n.attrs, class: 'code' } } : n)) }))),
  ]);

/* ---------------------------------------------------------------- M2 */

async function m2(I) {
  const model = await madeUpModel();
  const out = view(I, model, '#/');
  const fromMap = shapesOf(out.node).map((a) => [a.attrs['data-shape'], a.attrs.href]);
  const fromList = findAll(out.node, (n) => n.tag === 'a' && n.attrs['data-state-link'] !== undefined).map((a) => [a.attrs['data-state-link'], a.attrs.href]);
  for (const [where, links] of [['the map', fromMap], ['the list', fromList]]) {
    for (const code of STATE_CODES) {
      const l = links.find(([c]) => c === code);
      if (!l || l[1] !== `#/state/${code}`) return no(`${code} has no link to its State view on ${where}`);
      if (I.render(I.parse(l[1]), model, { now: NOW, files: geoFiles() }).view !== 'state') return no(`the link of ${code} on ${where} does not open its State view`);
    }
  }
  return ok('every state and Ontario links to its State view, on the map and in the list');
}
test('M2', 'every state on the map and in the list links to its State view, Ontario among them',
  [sound('the page as built', () => m2(impl()))],
  [broken('Ontario left out of the list', 'ON has no link', () => m2(impl({ render: transformed(renderView, (n) => (n.attrs['data-state-link'] === 'ON' ? null : n)) })))]);

/* ---------------------------------------------------------------- M3 */

async function m3(I) {
  const model = await madeUpModel();
  for (const code of STATE_CODES) {
    for (const county of [null, countiesOf(code)[0].id]) {
      const paths = I.filesFor({ view: 'state', code, county, mode: null }, model, {}).map((f) => f.path);
      if (paths.join('|') !== `geo/counties/${code}.json`) return no(`the State view of ${code} asks for ${paths.join(', ') || 'nothing'}, not its own shape file alone`);
      const only = { [`geo/counties/${code}.json`]: geoFiles()[`geo/counties/${code}.json`] };
      const part = I.mapPart({ view: 'state', code, county, mode: null }, model, only);
      if (!part || part.state !== 'drawn') return no(`the State view of ${code} cannot draw its map from its own shape file alone`);
    }
  }
  return ok('each of the 52 State views, with and without a county chosen, asks for its own shape file and no other, and draws from it alone');
}
test('M3', 'opening a State view asks for that state\'s shape file and for no other shape file',
  [sound('the page as built', () => m3(impl()))],
  [broken('a State view that asks for the Home map too', 'not its own shape file alone', () => m3(impl({ filesFor: (r, m, f) => [...filesFor(r, m, f), ...(r.view === 'state' ? [{ path: HOME_MAP, part: 'map' }] : [])] })))]);

/* ---------------------------------------------------------------- M4 */

async function m4(I) {
  const model = await madeUpModel();
  const sv = await served();
  let counted = 0;
  for (const code of STATE_CODES) {
    const shapes = shapesOf(view(I, model, `#/state/${code}`).node);
    const counties = countiesOf(code);
    if (shapes.length !== counties.length) return no(`the map of ${code} draws ${shapes.length} counties, not ${counties.length}`);
    for (const c of counties) {
      const a = shapes.find((s) => s.attrs['data-shape'] === c.id);
      const n = sv.byCounty.has(c.id) ? sv.byCounty.get(c.id).tier1.length : 0;
      if (!a || a.attrs['data-step'] !== stepOf(n) || a.attrs['data-count'] !== n) return no(`county ${c.id} is shaded at step ${a ? a.attrs['data-step'] : 'none'}, not ${stepOf(n)} for the ${n} installers of its Tier 1 list`);
      counted++;
    }
  }
  return ok(`${counted} counties in the 52 State views, each shaded at the step for the number of installers in its Tier 1 list`);
}
test('M4', 'every county\'s shade is the step for the number of installers in its Tier 1 list, for every county of every state',
  [sound('the page as built', () => m4(impl()))],
  [
    broken('Autauga County shaded as if nobody served it', 'county 01001 is shaded', () => m4(impl({ render: transformed(renderView, (n) => (n.attrs['data-shape'] === '01001' ? { ...n, attrs: { ...n.attrs, 'data-step': 0 } } : n)) }))),
    broken('a county map that counts Tier 2 too', 'Tier 1 list', () => m4(impl({ render: (r, m, o) => renderView(r, { ...m, countyTier1: new Map([...m.countyServers].map(([id, s]) => [id, new Set([...s.tier1, ...s.tier2]).size])) }, o) }))),
  ]);

/* ---------------------------------------------------------------- M5 and M9 */

async function m5(I) {
  const model = await madeUpModel();
  const A = filesApart(await madeUpTexts());
  let checked = 0;
  let nobody = 0;
  for (const code of STATE_CODES) {
    for (const c of countiesOf(code)) {
      const out = view(I, model, `#/state/${code}?county=${c.id}`);
      const want = placeApart(A, { state: code, counties: [c.id] });
      if (tierRows(out.node, 1).join('|') !== want.tier1.join('|')) return no(`with county ${c.id} chosen the Tier 1 list holds ${tierRows(out.node, 1).length} installers, not the ${want.tier1.length} listed installers that have it as Tier 1`);
      if (tierRows(out.node, 2).join('|') !== want.tier2.join('|')) return no(`with county ${c.id} chosen the Tier 2 list holds ${tierRows(out.node, 2).length} installers, not the ${want.tier2.length} that have it as Tier 2 and not as Tier 1`);
      const chosen = shapesOf(out.node).filter((a) => a.attrs['aria-current'] === 'true').map((a) => a.attrs['data-shape']);
      const outline = find(out.node, (n) => hasClass(n, 'chosen-outline'));
      if (chosen.join('|') !== c.id || !outline || outline.attrs['data-chosen'] !== c.id) return no(`with county ${c.id} chosen, the shape marked chosen is ${chosen.join(', ') || 'none'}`);
      if (!want.tier1.length && !want.tier2.length) nobody++;
      checked++;
    }
  }
  return ok(`${checked} counties, each chosen in turn (01001, which begins with a zero, and the Ontario divisions among them): the Tier 1 list holds exactly the listed installers with it as Tier 1, the Tier 2 list exactly those with it as Tier 2 and not Tier 1, and its shape is marked chosen; ${nobody} are served by nobody`);
}
test('M5', 'with a county chosen, the Tier 1 list holds exactly the listed installers that have it as Tier 1, the Tier 2 list those that have it as Tier 2 and not Tier 1, and its shape is outlined, for every county of every state',
  [sound('the page as built', () => m5(impl()))],
  [
    broken('a list that ignores the county chosen', 'with county', () => m5(impl({ render: (r, m, o) => renderView(r.view === 'state' && r.county ? { ...r, county: null } : r, m, o) }))),
    broken('a Tier 1 list that also holds the Tier 2 installers', 'Tier 1 list holds', () => m5(impl({ render: transformed(renderView, (n) => (n.tag === 'tr' && n.attrs['data-tier'] === 2 ? { ...n, attrs: { ...n.attrs, 'data-tier': 1 } } : n)) }))),
    broken('the wrong county marked chosen', 'the shape marked chosen', () => m5(impl({ render: transformed(renderView, (n) => (n.attrs['aria-current'] === 'true' && n.attrs['data-shape'] ? { ...n, attrs: { ...n.attrs, 'aria-current': null } } : n)) }))),
  ]);

async function m9(I) {
  const model = await madeUpModel();
  for (const [hash, place] of [['#/state/OH?county=39001', 'Adams County, Ohio'], ['#/state/TX?county=48141', 'El Paso County, Texas'], ['#/state/DC', 'District of Columbia']]) {
    const out = view(I, model, hash);
    const text = squash(textOf(out.node));
    if (rowsOf(out.node).length || !text.includes(`No installer serves ${place}.`)) return no(`${hash}: a place nobody serves does not say so plainly`);
    if (find(out.node, (n) => n.attrs['data-tier2-toggle'])) return no(`${hash}: a place nobody serves offers the Tier 2 button`);
    if (!footOf(out.node)) return no(`${hash}: a place nobody serves does not show the foot line`);
  }
  // Portage County, Ohio (39133): only Tier 2 installers list it, in the made-up data.
  const out = view(I, model, '#/state/OH?county=39133');
  const text = squash(textOf(out.node));
  if (tierRows(out.node, 1).length || !text.includes('No Tier 1 installer serves Portage County, Ohio.')) return no('a county with no Tier 1 installer does not say "No Tier 1 installer serves Portage County, Ohio."');
  const button = find(out.node, (n) => n.attrs['data-tier2-toggle']);
  if (!button || squash(textOf(button)) !== TIER2_SHOW || !tierRows(out.node, 2).length) return no('a county with no Tier 1 installer and a Tier 2 one does not offer the Tier 2 button and its list');
  return ok('Adams County, Ohio, El Paso County, Texas, and the District of Columbia, which nobody serves, each say so, with no button and the foot line; Portage County, Ohio, which only Tier 2 installers list, says no Tier 1 installer serves it and offers the Tier 2 button');
}
test('M9', 'a county with no installer says so; a county with no Tier 1 installer says so and still offers the Tier 2 button',
  [sound('the page as built, on made-up data', () => m9(impl()))],
  [
    broken('a place nobody serves shown as an empty list', 'does not say so plainly', () => m9(impl({ render: transformed(renderView, (n) => (n.attrs['data-nobody'] ? null : n)) }))),
    broken('no Tier 2 button where there is no Tier 1 installer', 'does not offer the Tier 2 button', () => m9(impl({ render: transformed(renderView, (n) => (n.attrs['data-tier2-toggle'] ? null : n)) }))),
  ]);

/* ---------------------------------------------------------------- M6 */

async function m6(I) {
  const model = await madeUpModel();
  let checked = 0;
  for (const code of STATE_CODES) {
    const shapes = shapesOf(view(I, model, `#/state/${code}`).node);
    for (const c of countiesOf(code)) {
      const offered = I.suggestions(model, code, c.name, 1000).find((s) => s.id === c.id);
      const link = shapes.find((a) => a.attrs['data-shape'] === c.id);
      if (!offered || !link || offered.href !== link.attrs.href) return no(`choosing ${c.name} (${c.id}) in the box does not give the address of its link on the map`);
      checked++;
    }
  }
  const words = [['summit', '39153', true], ['SUMMIT co', '39153', true], ['ummit', '39153', false], ['co', '39153', true]];
  for (const [typed, id, want] of words) {
    if (I.suggestions(model, 'OH', typed, 1000).some((s) => s.id === id) !== want) return no(`the box ${want ? 'does not offer' : 'offers'} county ${id} for "${typed}": it should match from the start of a word, capitals aside`);
  }
  const chosen = view(I, model, '#/state/OH?county=39153');
  const all = find(chosen.node, (n) => n.attrs['data-show-all'] !== undefined);
  if (!all || all.attrs.href !== '#/state/OH' || squash(textOf(all)) !== 'All of Ohio') return no('"All of Ohio" does not give the state\'s address');
  return ok(`${checked} counties: choosing each name in the box gives its link's address; matched from the start of a word, capitals aside; "All of Ohio" gives Ohio's address`);
}
test('M6', 'choosing a county\'s name in the box gives the same address as the county\'s link; "All of Ohio" gives the state\'s address',
  [sound('the page as built', () => m6(impl()))],
  [
    broken('a box that gives the state\'s address for a county', 'does not give the address of its link', () => m6(impl({ suggestions: (m, code, t, n) => countySuggestions(m, code, t, n).map((s) => ({ ...s, href: stateHash(code) })) }))),
    broken('a box that matches inside a word', 'should match from the start of a word', () => m6(impl({ suggestions: (m, code, t, n) => (m.countiesByState.get(code) || []).filter((c) => c.name.toLowerCase().includes(String(t).trim().toLowerCase())).slice(0, n).map((c) => ({ id: c.id, name: c.name, href: stateHash(code, c.id) })) }))),
    broken('the link to the whole state worded as before', '"All of Ohio"', () => m6(impl({ render: transformed(renderView, (n) => (n.attrs['data-show-all'] ? { ...n, children: ['Show all of Ohio'] } : n)) }))),
  ]);

/* ---------------------------------------------------------------- M7 and M11, on a model changed by hand */

/**
 * The made-up model with Ohio's territory changed by hand, so that the order of the file and the
 * order of ids differ in both lists: Summit County (39153) Tier 1 for FAKE-024, FAKE-111 and
 * FAKE-102, Tier 2 for FAKE-001 and FAKE-107; with medina, Medina County (39103) Tier 1 for
 * FAKE-001 and Tier 2 for FAKE-107.
 */
async function reorderedModel({ medina = false } = {}) {
  const t = await madeUpTexts();
  const build = JSON.parse(t['build.json']);
  const installers = JSON.parse(t['installers.json']).installers;
  const territory = JSON.parse(t['territory.json']);
  const oh = territory.states.find((s) => s.state === 'OH');
  const county = (id) => oh.counties.find((c) => c.id === id);
  county('39153').tier1Installers = ['FAKE-024', 'FAKE-102', 'FAKE-108', 'FAKE-109', 'FAKE-111'];
  county('39153').tier2Installers = ['FAKE-001', 'FAKE-107'];
  if (medina) oh.counties.push({ id: '39103', tier1Installers: ['FAKE-001'], tier2Installers: ['FAKE-107'] });
  return makeModel(build, installers, territory.states, JSON.parse(COUNTIES_TEXT));
}

const tierLines = (out, tier) => rowsOf(out.node).filter((r) => r.attrs['data-tier'] === tier).map((r) => [r.attrs['data-installer'], squash(textOf(find(r, (n) => hasClass(n, 'tier-line')) || ''))]);

async function m7(I) {
  const model = await reorderedModel();
  const cases = [
    ['#/state/OH?county=39153', 1, [['FAKE-024', 'Tier 1 · 1 county in Ohio'], ['FAKE-111', 'Tier 1 · 2 counties in Ohio'], ['FAKE-102', 'Tier 1 · 3 counties in Ohio, and available for travel to 1 more']]],
    ['#/state/OH?county=39153', 2, [['FAKE-001', 'Tier 2 · available for travel to 1 county in Ohio'], ['FAKE-107', 'Tier 2 · available for travel to 3 counties in Ohio']]],
    ['#/state/OH', 1, [['FAKE-024', 'Tier 1 · 1 county in Ohio'], ['FAKE-001', 'Tier 1 · 1 county in Ohio, and available for travel to 1 more'], ['FAKE-111', 'Tier 1 · 2 counties in Ohio'], ['FAKE-102', 'Tier 1 · 3 counties in Ohio, and available for travel to 1 more']]],
    ['#/state/OH', 2, [['FAKE-107', 'Tier 2 · available for travel to 3 counties in Ohio']]],
  ];
  const medina = await reorderedModel({ medina: true });
  const zip = geoFiles()[zipPath('4')].doc.zips.find((z) => z.counties && z.counties.length > 1 && z.counties[0] === '39153' && z.counties.includes('39103'));
  const several = [
    [1, [['FAKE-024', 'Tier 1 · territory in Summit County'], ['FAKE-001', 'Tier 1 · territory in Medina County, and available for travel to Summit County'], ['FAKE-111', 'Tier 1 · territory in Summit County'], ['FAKE-102', 'Tier 1 · territory in Summit County']]],
    [2, [['FAKE-107', 'Tier 2 · available for travel to Summit County and Medina County']]],
  ];
  for (const [hash, tier, want] of cases) {
    const got = tierLines(view(I, model, hash), tier);
    if (JSON.stringify(got) !== JSON.stringify(want)) return no(`${hash}, the Tier ${tier} list reads ${JSON.stringify(got)}; section 4.4 gives ${JSON.stringify(want)}: in the order of the file, each with its tier line`);
  }
  for (const [tier, want] of several) {
    const got = tierLines(view(I, medina, `#/zip/${zip.zip}`), tier);
    if (JSON.stringify(got) !== JSON.stringify(want)) return no(`ZIP ${zip.zip}, in several counties: the Tier ${tier} list reads ${JSON.stringify(got)}; section 4.4 gives ${JSON.stringify(want)}`);
  }
  const order = (await madeUpModel()).installers.map((i) => i.company);
  if (order.join('|') !== [...order].sort(byText).join('|')) return no('the order of the file is not alphabetical by company');
  return ok(`with a county chosen and with none, each list in the order of the file, which is alphabetical by company, and each tier line as section 4.4 words it, counts for the whole state; ZIP ${zip.zip}, in several counties, names the counties at each tier`);
}
test('M7', 'the Tier 1 list is alphabetical, and so is the Tier 2 list; the tier line of each entry follows section 4.4, with and without a county chosen and for a ZIP in several counties',
  [sound('the page as built, on a model changed by hand', () => m7(impl()))],
  [
    broken('a list in the order of installer ids', 'in the order of the file', () => m7(impl({ render: transformed(renderView, (n) => (n.tag === 'tbody' ? { ...n, children: [...n.children].sort((a, b) => (a.attrs['data-installer'] < b.attrs['data-installer'] ? -1 : 1)) } : n)) }))),
    broken('the tier line worded as before', 'tier line', () => m7(impl({ render: transformed(renderView, (n) => (hasClass(n, 'tier-line') ? { ...n, children: [textOf(n).replace(' · ', ' in ')] } : n)) }))),
    broken('a tier line that counts the county chosen alone', 'section 4.4 gives', () => m7(impl({ render: (r, m, o) => { const out = renderView(r, m, o); return r.view === 'state' && r.county ? { ...out, node: mapTree(out.node, (n) => (hasClass(n, 'tier-line') ? { ...n, children: [textOf(n).replace(/\d+ counties/, '1 county')] } : n)) } : out; } }))),
  ]);

async function m11(I) {
  const model = await reorderedModel({ medina: true });
  const A = filesApart({ 'installers.json': (await madeUpTexts())['installers.json'], 'territory.json': JSON.stringify({ schema: 1, states: model.territoryStates }) });
  const zip = geoFiles()[zipPath('4')].doc.zips.find((z) => z.counties && z.counties.length > 1 && z.counties[0] === '39153' && z.counties.includes('39103'));
  if (!zip) return no('no ZIP in Summit and Medina Counties to try');
  const out = view(I, model, `#/zip/${zip.zip}`);
  const named = findAll(out.node, (n) => n.tag === 'a' && n.attrs['data-county'] !== undefined).map((n) => n.attrs['data-county']);
  if (named.join('|') !== zip.counties.join('|')) return no(`ZIP ${zip.zip} names ${named.join(', ')}, not each of its counties in the file's order`);
  const ids = rowsOf(out.node).map((r) => r.attrs['data-installer']);
  if (new Set(ids).size !== ids.length) return no(`ZIP ${zip.zip} lists an installer more than once`);
  const want = placeApart(A, { state: 'OH', counties: zip.counties });
  if (tierRows(out.node, 1).join('|') !== want.tier1.join('|')) return no(`ZIP ${zip.zip}'s Tier 1 list holds ${JSON.stringify(tierRows(out.node, 1))}, not each installer with territory in any of its counties, once: ${JSON.stringify(want.tier1)}`);
  if (tierRows(out.node, 2).join('|') !== want.tier2.join('|')) return no(`ZIP ${zip.zip}'s Tier 2 list holds ${JSON.stringify(tierRows(out.node, 2))}, not each of the rest with any of its counties as Tier 2, once: ${JSON.stringify(want.tier2)}`);
  return ok(`ZIP ${zip.zip}, in ${zip.counties.length} counties: each named in the file's order; Tier 1 ${want.tier1.length} installers, each once; Tier 2 ${want.tier2.length}, each once`);
}
test('M11', 'a ZIP in several counties names each; its Tier 1 list holds each installer with territory in any of them once, its Tier 2 list each of the rest with any as Tier 2 once',
  [sound('the page as built, on a model changed by hand', () => m11(impl()))],
  [
    broken('an installer listed at its worst tier', 'Tier 1 list holds', () => m11(impl({ render: transformed(renderView, (n) => (n.tag === 'tr' && n.attrs['data-installer'] === 'FAKE-001' ? { ...n, attrs: { ...n.attrs, 'data-tier': 2 } } : n)) }))),
    broken('an installer listed once for each county', 'more than once', () => m11(impl({ render: transformed(renderView, (n) => (n.tag === 'tbody' ? { ...n, children: [...n.children, n.children[0]] } : n)) }))),
  ]);

/* ---------------------------------------------------------------- M8 */

async function m8(I) {
  const base = await madeUpModel();
  const offMap = (m) => m.installers.filter((i) => !i.territory).length;
  const cases = [];
  const one = { ...base, installers: base.installers.map((i, k) => (i.territory || k === base.installers.findIndex((x) => !x.territory) ? i : { ...i, territory: { states: [], countyCount: 0 } })) };
  for (const model of [base, one]) {
    const n = offMap(model);
    for (const hash of ['#/state/OH', '#/state/OH?county=39001', '#/state/DC', '#/city/OH-akron', `#/zip/${geoFiles()[zipPath('4')].doc.zips.find((z) => z.counties && z.counties.length > 1).zip}`]) {
      const foot = footOf(view(I, model, hash).node);
      const want = n === 1 ? '1 installer is not on the map and may also serve this area.' : `${n} installers are not on the map and may also serve this area.`;
      const link = foot && find(foot, (x) => x.tag === 'a');
      if (!foot || squash(textOf(foot)) !== want || !link || link.attrs.href !== '#/installers?dormant=1&inactive=1&map=off') return no(`${hash}, with ${n} installer(s) not on the map: the foot line reads "${foot ? squash(textOf(foot)) : 'nothing'}", not "${want}" linking to All installers with "Not on the map" and both boxes ticked`);
      const listed = view(I, model, link.attrs.href);
      if (rowsOf(listed.node).length !== n) return no(`the foot line's link lists ${rowsOf(listed.node).length} installers, not the ${n} with no territory rows`);
      cases.push(hash);
    }
  }
  return ok(`the foot line in ${cases.length} lists carries the number from the data, ${offMap(base)} and then 1, in its two wordings, and its link lists exactly those installers`);
}
test('M8', 'the line at the foot of every place\'s list shows the number of installers with no territory rows, from the data, and opens All installers listing exactly them',
  [sound('the page as built', () => m8(impl()))],
  [broken('a number written into the page', 'not "1 installer is', () => m8(impl({ render: transformed(renderView, (n) => (hasClass(n, 'foot-line') ? { ...n, children: [{ tag: 'a', attrs: { href: '#/installers?dormant=1&inactive=1&map=off' }, children: ['26 installers are not on the map and may also serve this area.'] }] } : n)) })))]);

/* ---------------------------------------------------------------- M10 */

/** 50 ZIP codes chosen by a fixed rule: from each first digit, the entries at five evenly spaced places of those on the map. */
export function fiftyZips(files = geoFiles()) {
  const out = [];
  for (let d = 0; d <= 9; d++) {
    const mapped = files[zipPath(String(d))].doc.zips.filter((z) => Array.isArray(z.counties));
    for (let i = 0; i < 5; i++) out.push(mapped[Math.floor((i * mapped.length) / 5) + (i % 2)]);
  }
  return out;
}

async function m10(I) {
  const model = await madeUpModel();
  const zips = fiftyZips();
  const several = zips.filter((z) => z.counties.length > 1).length;
  const zero = zips.filter((z) => z.zip.startsWith('0')).length;
  if (!several || !zero) return no('the 50 ZIP codes hold none that crosses a county line, or none that begins with a zero');
  for (const z of zips) {
    const out = view(I, model, `#/zip/${z.zip}`);
    const sec = find(out.node, (n) => hasClass(n, 'place'));
    if (z.counties.length === 1) {
      const c = list.counties.find((x) => x.id === z.counties[0]);
      if (!sec || sec.attrs['data-county'] !== c.id || !squash(textOf(find(out.node, (n) => n.tag === 'h2'))).startsWith(`ZIP ${z.zip} · `)) return no(`ZIP ${z.zip} does not show the view of its county ${c.id}`);
    } else {
      const named = findAll(out.node, (n) => n.tag === 'a' && n.attrs['data-county'] !== undefined).map((n) => n.attrs['data-county']);
      if (named.join('|') !== z.counties.join('|')) return no(`ZIP ${z.zip} names the counties ${named.join(', ')}, not ${z.counties.join(', ')} in the file's order`);
    }
  }
  return ok(`50 ZIP codes, ${several} crossing a county line and ${zero} beginning with a zero: each names exactly the counties the file gives, in its order`);
}
test('M10', 'for 50 ZIP codes taken from the ZIP files by a fixed rule, the view names exactly the counties the file gives, in its order',
  [sound('the page as built', () => m10(impl()))],
  [broken('counties put in order of id', 'not', () => m10(impl({ render: transformed(renderView, (n) => (hasClass(n, 'summary-counties') ? { ...n, children: [...n.children].reverse() } : n)) })))]);

/* ---------------------------------------------------------------- M12 */

const LEAVES_OUT = 'ZIP codes that are only post office boxes, ZIP codes belonging to a single organization, military ZIP codes, and Canadian postal codes';

async function m12(I) {
  const model = await madeUpModel();
  const missing = squash(textOf(view(I, model, '#/zip/49999').node));
  if (!missing.includes('is not in the list') || !missing.includes(LEAVES_OUT)) return no('a ZIP not in the list does not say so, and what the list leaves out, in section 4.9\'s words');
  const outside = squash(textOf(view(I, model, '#/zip/00601').node));
  if (!outside.includes('is outside the mapped area')) return no('a ZIP outside the map does not say it is outside the mapped area');
  return ok('49999 is not in the list, which leaves out the four kinds of section 4.9; 00601 is outside the mapped area');
}
test('M12', 'a ZIP that is not in the list and a ZIP outside the map each say so in section 4.9\'s words',
  [sound('the page as built', () => m12(impl()))],
  [
    broken('a ZIP not in the list without what the list leaves out', 'what the list leaves out', () => m12(impl({ render: transformed(renderView, (n) => (n.tag === 'p' && /leaves out/.test(textOf(n)) ? null : n)) }))),
    broken('a ZIP outside the map said to be missing', 'outside the mapped area', () => m12(impl({ render: transformed(renderView, (n) => (n.attrs['data-zip-outside'] ? { ...n, children: ['That ZIP code was not found.'] } : n)) }))),
  ]);

/* ---------------------------------------------------------------- M13 */

async function m13(I) {
  const model = await madeUpModel();
  const zipFiles = (paths) => paths.filter((p) => p.startsWith('geo/zips/'));
  for (const hash of ['#/', '#/installers', '#/installers?view=pm', '#/installer/FAKE-102', '#/installers?q=ohio', '#/installers?q=4422', '#/installers?q=442211', '#/installers?dormant=1&inactive=1&map=off', '#/about', '#/state/OH', '#/state/OH?county=39153', '#/city/OH-akron']) {
    const got = zipFiles(I.filesFor(I.parse(hash), model, geoFiles()).map((f) => f.path));
    if (got.length) return no(`${hash} asks for ${got.join(', ')} before a ZIP's address is opened`);
  }
  for (const zip of ['44221', '00601', '90210', '99999']) {
    for (const hash of [`#/zip/${zip}`, `#/search?q=${zip}`]) {
      const got = zipFiles(I.filesFor(I.parse(hash), model, {}).map((f) => f.path));
      if (got.join('|') !== `geo/zips/${zip[0]}.json`) return no(`${hash} asks for ${got.join(', ') || 'no ZIP file'}, not the one for its first digit alone`);
    }
  }
  if (I.citiesNeeded(model, '44221').length) return no('typing a ZIP in the location box asks for a city file');
  return ok('12 addresses that are not a ZIP\'s ask for no ZIP file; four ZIP codes, by their own address and by the old search address, each ask for the one file of their first digit; the location box asks for no city file for five digits');
}
test('M13', 'no ZIP file is asked for until a ZIP\'s address is opened, and then only the one for its first digit',
  [sound('the page as built', () => m13(impl()))],
  [
    broken('a page that asks for a ZIP file on Find installers', 'before a ZIP\'s address is opened', () => m13(impl({ filesFor: (r, m, f) => [...filesFor(r, m, f), ...(r.view === 'home' ? [{ path: zipPath('4'), part: 'map' }] : [])] }))),
    broken('a page that asks for every ZIP file at once', 'not the one for its first digit alone', () => m13(impl({ filesFor: (r, m, f) => (r.view === 'zip' ? Array.from({ length: 10 }, (_, d) => ({ path: zipPath(String(d)), part: 'content' })) : filesFor(r, m, f)) }))),
  ]);

/* ---------------------------------------------------------------- M14 */

/** A place's Tier 1 list, button and Tier 2 list, as the view draws them, against what the files give. */
function tierProblems(out, want, label) {
  const node = out.node;
  const t1 = tierRows(node, 1);
  const t2 = tierRows(node, 2);
  if (t2.some((id) => t1.includes(id))) return `${label}: an installer is in both lists`;
  if (t1.join('|') !== want.tier1.join('|')) return `${label}: the Tier 1 list holds ${t1.length}, not the ${want.tier1.length} the files give`;
  const button = find(node, (n) => n.tag === 'button' && n.attrs['data-tier2-toggle']);
  if (!want.tier2.length) {
    if (button) return `${label}: no Tier 2 installer lists it, and the Tier 2 button is there`;
    const says = want.tier1.length ? 'No Tier 2 installer lists this area for travel.' : 'No installer serves';
    if (!squash(textOf(node)).includes(says)) return `${label}: no Tier 2 installer lists it, and it does not say so`;
    return null;
  }
  if (!button || squash(textOf(button)) !== TIER2_SHOW || button.attrs['aria-expanded'] !== 'false') return `${label}: there is no closed button reading "${TIER2_SHOW}"`;
  const part = find(node, (n) => n.attrs.id === button.attrs['aria-controls']);
  if (!part || part.attrs.hidden !== true) return `${label}: the Tier 2 list does not open hidden`;
  if (tierRows(part, 2).join('|') !== want.tier2.join('|') || t2.join('|') !== want.tier2.join('|')) return `${label}: the Tier 2 list holds ${t2.length}, not the ${want.tier2.length} the files give`;
  const flat = [];
  const walk = (n) => { if (n && n.tag) { flat.push(n); n.children.forEach(walk); } };
  walk(node);
  const at = (x) => flat.indexOf(x);
  const lastT1 = Math.max(-1, ...rowsOf(node).filter((r) => r.attrs['data-tier'] === 1).map(at));
  if (at(button) < lastT1 || at(part) < at(button)) return `${label}: the button is not under the Tier 1 list, with the Tier 2 list below it`;
  return null;
}

async function m14(I) {
  const model = await madeUpModel();
  const A = filesApart(await madeUpTexts());
  let places = 0;
  let withTier2 = 0;
  for (const code of STATE_CODES) {
    const want = placeApart(A, { state: code });
    const p = tierProblems(view(I, model, `#/state/${code}`, { files: {} }), want, code);
    if (p) return no(p);
    places++;
    if (want.tier2.length) withTier2++;
  }
  for (const c of list.counties) {
    const want = placeApart(A, { state: c.state, counties: [c.id] });
    const p = tierProblems(view(I, model, `#/state/${c.state}?county=${c.id}`, { files: {} }), want, `county ${c.id}`);
    if (p) return no(p);
    places++;
    if (want.tier2.length) withTier2++;
  }
  if (TIER2_HIDE !== 'Hide Tier 2 Installers') return no('the button does not read "Hide Tier 2 Installers" while the Tier 2 list shows');
  return ok(`${places} places, every state and every county: the Tier 1 list first; under it a closed button "${TIER2_SHOW}" with the Tier 2 list hidden below it (${withTier2} places), no installer in both; where no Tier 2 installer lists the place, no button and a line saying so`);
}
test('M14', 'every place lists its Tier 1 installers first, with the Tier 2 button under them and the Tier 2 list hidden below; no installer in both; no button where no Tier 2 installer lists the place; for every state and every county',
  [sound('the page as built', () => m14(impl()))],
  [
    broken('the Tier 2 list shown open', 'does not open hidden', () => m14(impl({ render: transformed(renderView, (n) => (n.attrs.id === 'tier2-part' ? { ...n, attrs: { ...n.attrs, hidden: false } } : n)) }))),
    broken('a button where no Tier 2 installer lists the place', 'the Tier 2 button is there', () => m14(impl({ render: transformed(renderView, (n) => (n.attrs['data-no-tier2'] ? { tag: 'button', attrs: { 'data-tier2-toggle': 'true' }, children: [TIER2_SHOW] } : n)) }))),
    broken('the Tier 2 installers put in the Tier 1 list as well', 'in both lists', () => m14(impl({ render: (r, m, o) => {
      const out = renderView(r, m, o);
      const t2 = rowsOf(out.node).filter((x) => x.attrs['data-tier'] === 2).map((x) => ({ ...x, attrs: { ...x.attrs, 'data-tier': 1 } }));
      return t2.length ? { ...out, node: mapTree(out.node, (n) => (n.tag === 'tbody' && n.children.some((x) => x.attrs && x.attrs['data-tier'] === 1) ? { ...n, children: [...n.children, ...t2] } : n)) } : out;
    } }))),
    broken('the button above the Tier 1 list', 'not under the Tier 1 list', () => m14(impl({ render: transformed(renderView, (n) => {
      const k = n.children.findIndex((c) => c && c.attrs && hasClass(c, 'tier2-bar'));
      if (n.attrs.id !== 'lists' || k < 0) return n;
      const kids = [...n.children];
      const [bar] = kids.splice(k, 1);
      return { ...n, children: [bar, ...kids] };
    }) }))),
  ]);

/* ---------------------------------------------------------------- M15 */

async function m15(I) {
  const model = await madeUpModel();
  const A = filesApart(await madeUpTexts());
  const est = view(I, model, '#/installers?dormant=1&inactive=1', { mode: 'est' });
  const rec = view(I, model, '#/installers?dormant=1&inactive=1', { mode: 'rec' });
  let lines = 0;
  // The Installer view: Tier 1 and Tier 2 apart, each with its own total.
  for (const i of A.installers) {
    const one = I.render({ view: 'installer', id: i.id, mode: null, from: null }, model, { now: NOW, mode: 'est' });
    const totals = byAttr(one.node, 'data-total').map((n) => n.attrs['data-total']);
    if (A.onMap(i) && totals.join('|') !== `${A.total(1, i.id)}|${A.total(2, i.id)}`) return no(`${i.id}: the Installer view gives ${totals.join(' and ')} counties, not Tier 1 ${A.total(1, i.id)} and Tier 2 ${A.total(2, i.id)} apart`);
  }
  // The Territory in column: the states with Tier 1 counties.
  for (const i of A.installers) {
    const inCol = squash(textOf(cellOf(rowsOf(est.node).find((r) => r.attrs['data-installer'] === i.id), 'territoryIn')));
    const states = A.statesAt(1, i.id);
    const wantIn = states.length ? states.join(', ') : A.onMap(i) ? 'Travel only (Tier 2)' : 'Not on the map';
    if (inCol !== wantIn) return no(`${i.id}: Territory in reads "${inCol}", not "${wantIn}"`);
  }
  // The Territory column of Records.
  for (const i of A.installers) {
    const t1 = A.total(1, i.id);
    const t2 = A.total(2, i.id);
    const words = squash(textOf(cellOf(rowsOf(rec.node).find((r) => r.attrs['data-installer'] === i.id), 'territory')));
    const wantWords = t1 ? `Tier 1 in ${t1} ${t1 === 1 ? 'county' : 'counties'}${t2 ? ` · travel to ${t2}` : ''}` : t2 ? 'Travel only (Tier 2)' : 'Not on the map';
    if (words !== wantWords) return no(`${i.id}: the Territory column reads "${words}", not "${wantWords}"`);
  }
  // A search result found by territory.
  for (const i of A.installers) {
    for (const code of A.statesAt(1, i.id)) {
      const name = A.names.get(code);
      const out = view(I, model, `#/installers?q=${encodeURIComponent(name)}`);
      const row = rowsOf(out.node).find((r) => r.attrs['data-installer'] === i.id);
      const line = row && find(row, (n) => n.attrs['data-match'] === 'territory');
      const n1 = A.countiesAt(1, i.id, code).length;
      const n2 = A.countiesAt(2, i.id, code).length;
      const want = `Territory includes ${name}: ${n1} ${n1 === 1 ? 'county' : 'counties'}${n2 ? `, and available for travel to ${n2} more` : ''}`;
      if (!line || squash(textOf(line)) !== want) return no(`${i.id}: a search for ${name} does not say "${want}"`);
      lines++;
    }
  }
  return ok(`${A.installers.length} made-up installers: the Installer view gives Tier 1 and Tier 2 apart, Territory in names only the states with Tier 1 counties, the Records column counts Tier 1 with travel apart, and ${lines} search results found by territory count Tier 1 with Tier 2 apart`);
}
test('M15', 'wherever a view gives an installer\'s territory it counts Tier 1 counties only, and shows Tier 2 apart as available for travel',
  [sound('the page as built', () => m15(impl()))],
  [
    broken('Territory in listing the states of Tier 2 counties too', 'Territory in reads', () => m15(impl({ render: (r, m, o) => renderView(r, tier2Too(m), o) }))),
    broken('the Records column counting both tiers', 'the Territory column reads', () => m15(impl({ render: transformed(renderView, (n) => (n.tag === 'td' && n.attrs['data-column'] === 'territory' ? { ...n, children: [textOf(n).replace(/ · travel to \d+/, '')] } : n)) }))),
  ]);
/** A copy of the model in which Tier 2 counties count as territory. */
const tier2Too = (model) => ({ ...model, coverage: new Map([...model.coverage].map(([id, m]) => [id, new Map([...m].map(([s, c]) => [s, { tier1: [...c.tier1, ...c.tier2], tier2: [] }]))])) });

/* ---------------------------------------------------------------- M17 */

async function m17(I) {
  const model = await madeUpModel();
  const shapesOfState = new Map();
  const homeLinks = new Map(shapesOf(view(I, model, '#/').node).map((a) => [a.attrs['data-shape'], a.attrs.href]));
  const share = new Map();
  for (const c of list.counties) share.set(c.name, (share.get(c.name) || new Set()).add(c.state));
  let byState = 0;
  let byName = 0;
  for (const c of list.counties) {
    if (!shapesOfState.has(c.state)) shapesOfState.set(c.state, new Map(shapesOf(view(I, model, `#/state/${c.state}`).node).map((a) => [a.attrs['data-shape'], a.attrs.href])));
    const href = shapesOfState.get(c.state).get(c.id);
    const r = I.suggest(model, `${c.name} ${c.state}`);
    const s = r.items.find((x) => x.kind === 'county' && x.id === c.id);
    if (!s || s.href !== href) return no(`typing "${c.name} ${c.state}" does not offer the county ${c.id} leading where the map does`);
    if (r.items.some((x) => x.kind === 'county' && x.state !== c.state)) return no(`typing "${c.name} ${c.state}" offers a county of another state`);
    byState++;
    if (share.get(c.name).size <= 9) {
      const alone = I.suggest(model, c.name);
      if (!alone.items.some((x) => x.kind === 'county' && x.id === c.id)) return no(`typing "${c.name}", a name ${share.get(c.name).size} states share, does not offer the county ${c.id}`);
      byName++;
    }
  }
  for (const st of list.states) {
    for (const typed of [st.name, st.code, st.code.toLowerCase()]) {
      const r = I.suggest(model, typed);
      const s = r.items.find((x) => x.kind === 'state' && x.id === st.code);
      if (!s || s.href !== homeLinks.get(st.code)) return no(`typing "${typed}" does not offer the state ${st.code} leading where the map does`);
    }
  }
  // A ZIP and nothing else; each kind labeled; a name used in several states once for each.
  const zip = I.suggest(model, '44221');
  if (zip.items.length !== 1 || zip.items[0].kind !== 'zip' || zip.items[0].href !== '#/zip/44221') return no('five digits do not offer the ZIP and nothing else');
  const wash = I.suggest(model, 'washington county');
  const keys = wash.items.map((x) => `${x.kind}:${x.state}:${x.label}`);
  if (new Set(keys).size !== keys.length || !wash.more || wash.items.length !== 10) return no('"washington county" does not offer the first 10, once for each state, with the line that more match');
  const ohio = I.suggest(model, 'washington oh');
  const ohio2 = I.suggest(model, 'Washington County, Ohio');
  for (const r of [ohio, ohio2]) if (!r.items.length || r.items.some((x) => x.state !== 'OH')) return no('a state after the name does not narrow the suggestions to that state');
  // Never an office city, never an installer.
  for (const i of model.installers) {
    const city = i.office && i.office.city;
    if (!city || city.length < 2) continue;
    for (const s of I.suggest(model, city, cityDocs()).items) {
      if (!['zip', 'state', 'county', 'city'].includes(s.kind) || !/^#\/(state|zip|city)\//.test(s.href) || s.label.includes(i.company)) return no(`typing the office city of ${i.id} offers something that is not a place`);
    }
  }
  return ok(`${byState} counties typed with their state's code, and ${byName} typed by their name alone (nine or fewer states share it), each offered and leading where the map does; 52 states by name and by code; five digits a ZIP alone; a name used in several states once for each, the first 10 with the line that more match; a state after the name narrows; an office city never offered as anything but a place`);
}
test('M17', 'the location box offers every county by its name and state, and by its name alone where nine or fewer states share it, a ZIP, and a state by name or code, each with its kind, leading where the map does, and never an office city; checked for every county and state',
  [sound('the location box as built', () => m17(impl()))],
  [
    broken('a box that offers a county by its own address, not the map\'s', 'leading where the map does', () => m17(impl({ suggest: (m, t, c) => { const r = suggest(m, t, c); return { ...r, items: r.items.map((x) => (x.kind === 'county' ? { ...x, href: `#/state/${x.state}` } : x)) }; } }))),
    broken('a box that does not understand a state after the name', 'Autauga County AL', () => m17(impl({ suggest: (m, t, c) => suggest(m, String(t).replace(/,? [A-Z]{2}$/, ' zzzz'), c) }))),
    broken('a box that offers office cities', 'offers something that is not a place', () => m17(impl({ suggest: (m, t, c) => { const r = suggest(m, t, c); const hit = m.installers.find((i) => i.office && i.office.city === t); return hit ? { ...r, items: [...r.items, { kind: 'office', label: hit.company, href: `#/installer/${hit.id}`, state: null, id: hit.id }] } : r; } }))),
  ]);

/* ---------------------------------------------------------------- M18 */

async function m18(I) {
  const model = await madeUpModel();
  const A = filesApart(await madeUpTexts());
  const held = new Set(A.installers.filter((i) => [ST.inactive, ST.held].includes(i.status)).map((i) => i.id));
  const sideIds = (node, part) => { const sec = find(node, (n) => n.attrs['data-part'] === part); return sec ? findAll(sec, (n) => n.tag === 'li').map((n) => n.attrs['data-installer']) : []; };
  let places = 0;
  const check = (out, want, label) => {
    const node = out.node;
    for (const tier of [1, 2]) {
      const ids = tierRows(node, tier);
      if (ids.some((id) => !LISTED_SPEC.includes(A.installers.find((i) => i.id === id).status))) return `${label}: the Tier ${tier} list holds an installer whose status is not CONFIRMED BY PARTNER or PENDING - UPDATE EXPECTED`;
    }
    if (sideIds(node, 'dormant').join('|') !== want.dormant.join('|')) return `${label}: "Did not respond to the August outreach" holds ${sideIds(node, 'dormant').length}, not the ${want.dormant.length} the files give`;
    if (want.dormant.length && !squash(textOf(node)).includes('Did not respond to the August outreach')) return `${label}: the DORMANT installers are not under "Did not respond to the August outreach"`;
    if (sideIds(node, 'offmap').join('|') !== want.offMap.join('|')) return `${label}: the list of installers not on the map with an office there holds ${sideIds(node, 'offmap').length}, not ${want.offMap.length}`;
    const all = new Set([...rowsOf(node).map((r) => r.attrs['data-installer']), ...findAll(node, (n) => n.tag === 'li' && n.attrs['data-installer']).map((n) => n.attrs['data-installer'])]);
    if ([...all].some((id) => held.has(id))) return `${label}: an INACTIVE or HELD - BUSINESS DECISION installer is in the view`;
    return null;
  };
  for (const code of STATE_CODES) {
    const p = check(view(I, model, `#/state/${code}`, { files: {} }), placeApart(A, { state: code }), code);
    if (p) return no(p);
    places++;
  }
  for (const c of list.counties) {
    const p = check(view(I, model, `#/state/${c.state}?county=${c.id}`, { files: {} }), placeApart(A, { state: c.state, counties: [c.id] }), `county ${c.id}`);
    if (p) return no(p);
    places++;
  }
  const summit = view(I, model, '#/state/OH?county=39153', { files: {} });
  if (!sideIds(summit.node, 'dormant').includes('FAKE-108') || !sideIds(summit.node, 'offmap').includes('FAKE-110') || rowsOf(summit.node).some((r) => r.attrs['data-installer'] === 'FAKE-109')) return no('Summit County, Ohio does not show the made-up cases: FAKE-108 under "Did not respond", FAKE-110 not on the map with an office in Ohio, FAKE-109 nowhere');
  return ok(`${places} places, every state and every county: the Tier 1 and Tier 2 lists hold only CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED; "Did not respond to the August outreach" holds the DORMANT ones with the place at either tier; "Not on the map, with an office in" holds those the files give; no INACTIVE or HELD - BUSINESS DECISION installer anywhere`);
}
test('M18', 'a place\'s view holds only listed statuses in its lists, the DORMANT ones under "Did not respond", the installers not on the map with an office in its state under their own heading, and never INACTIVE or HELD; for every state and county',
  [sound('the page as built', () => m18(impl()))],
  [
    broken('a place that lists INACTIVE and HELD installers', 'whose status is not', () => m18(impl({ render: (r, m, o) => renderView(r, { ...m, installers: m.installers.map((i) => (i.status === ST.inactive || i.status === ST.held ? { ...i, status: ST.confirmed } : i)) }, o) }))),
    broken('the DORMANT list left out', '"Did not respond to the August outreach" holds', () => m18(impl({ render: transformed(renderView, (n) => (n.attrs['data-part'] === 'dormant' ? null : n)) }))),
    broken('the list of those not on the map left out', 'not on the map with an office there', () => m18(impl({ render: transformed(renderView, (n) => (n.attrs['data-part'] === 'offmap' ? null : n)) }))),
  ]);

/* ---------------------------------------------------------------- M19 */

const MF = 'No field contact on record';
const MR = 'No receiving contact on record';
/** What section 4.8 and 4.5 say each made-up Project management row shows, written out by hand. */
export const M19_CASES = [
  { id: 'FAKE-102', label: 'a field contact who can be reached; no receiving contact; both papers on file', field: 'Lena Ortiz', receiving: null, paper: ['Agreement and insurance on file'] },
  { id: 'FAKE-111', label: 'the only field contact cannot be reached; the first receiving contact by name cannot be reached, the second can; agreement Yes, certificate No', field: 'Zara Fielding', receiving: 'Bram Dockery', paper: ['No certificate of insurance on file'] },
  { id: 'FAKE-024', label: 'no field and no receiving contact; agreement No, certificate Yes', field: null, receiving: null, paper: ['No agreement on file'] },
  { id: 'FAKE-001', label: 'both papers blank', field: null, receiving: null, paper: ['Agreement not recorded', 'Insurance not recorded'] },
  { id: 'FAKE-013', label: 'a receiving contact', field: null, receiving: 'Aaron Bellweather', paper: ['Agreement not recorded', 'Insurance not recorded'] },
  { id: 'FAKE-107', label: 'one person the scheduling and the receiving contact at once', field: null, receiving: 'Reid Mallory', scheduling: 'Reid Mallory', paper: ['Agreement not recorded', 'Insurance not recorded'] },
  { id: 'FAKE-010', label: 'a field contact; a departed field contact first by name, never chosen', field: 'Abby Zane', receiving: null, paper: ['Agreement not recorded', 'Insurance not recorded'] },
];

async function m19(I) {
  const base = await madeUpModel();
  // A hand-made departed field contact, first by name, for FAKE-010.
  const model = withInstaller(base, 'FAKE-010', (i) => ({ ...i, contacts: [...i.contacts, { name: 'Aaron Fieldgone', roles: ['Field / Installation'], phone: ['(330)', '555-0199'].join(' '), departed: true }] }));
  const out = view(I, model, '#/installers?dormant=1&inactive=1', { mode: 'pm' });
  for (const c of M19_CASES) {
    const row = rowsOf(out.node).find((r) => r.attrs['data-installer'] === c.id);
    if (!row) return no(`${c.id}: no row`);
    const inst = byIdOf(model, c.id);
    const name = (td) => { const n = find(td, (x) => hasClass(x, 'name')); return n ? squash(textOf(n)) : null; };
    const field = cellOf(row, 'field');
    if (name(field) !== c.field || (!c.field && squash(textOf(field)) !== MF)) return no(`${c.id} (${c.label}): the field contact reads "${squash(textOf(field))}"; section 4.8 says ${c.field || MF}`);
    const receiving = cellOf(row, 'receiving');
    if (name(receiving) !== c.receiving || (!c.receiving && !squash(textOf(receiving)).endsWith(MR))) return no(`${c.id} (${c.label}): the receiving contact reads "${squash(textOf(receiving))}"; section 4.8 says ${c.receiving || MR}`);
    const w = inst.warehousing || {};
    const wantW = `Warehousing: ${w.available === 'Yes' || w.available === 'No' ? w.available : w.available || 'Not recorded'}${Array.isArray(w.at) && w.at.length ? `, at ${w.at.join(', ')}` : ''}`;
    if (!squash(textOf(receiving)).startsWith(wantW)) return no(`${c.id}: the Receiving column does not begin "${wantW}"`);
    if (c.field) {
      const person = inst.contacts.find((x) => x.name === c.field);
      if (person.phone && !squash(textOf(field)).includes(person.phone)) return no(`${c.id}: the field contact's phone is not shown`);
    }
    const paper = findAll(cellOf(row, 'paperwork'), (n) => n.attrs['data-paper'] !== undefined).map((n) => squash(textOf(n)));
    if (JSON.stringify(paper) !== JSON.stringify(c.paper)) return no(`${c.id} (${c.label}): the paperwork reads ${JSON.stringify(paper)}; section 4.5 says ${JSON.stringify(c.paper)}, each missing item on its own`);
    if (c.scheduling && name(cellOf(row, 'scheduling')) !== c.scheduling) return no(`${c.id}: the scheduling contact is not ${c.scheduling}, who is also the receiving contact`);
  }
  return ok(`${M19_CASES.length} made-up installers on the Project management row: the field and receiving contacts as section 4.8 says (who can be reached first, by name, never a departed one, one person in several columns), their markers, the warehousing line, and each missing paper on its own`);
}
const byIdOf = (model, id) => model.installers.find((i) => i.id === id);
test('M19', 'on the Project management row the field contact and the receiving contact follow section 4.8, and each missing paperwork item is shown on its own; one made-up installer per case',
  [sound('the page as built', () => m19(impl()))],
  [
    broken('a receiving contact chosen without minding who can be reached', 'Bram Dockery', () => m19(impl({ render: transformed(renderView, (n) => (n.tag === 'tr' && n.attrs['data-installer'] === 'FAKE-111' ? mapTree(n, (x) => (hasClass(x, 'name') && squash(textOf(x)) === 'Bram Dockery' ? { ...x, children: ['Ada Dockery'] } : x)) : n)) }))),
    broken('the missing papers put in one line', 'each missing item on its own', () => m19(impl({ render: transformed(renderView, (n) => (n.tag === 'td' && n.attrs['data-column'] === 'paperwork' && n.children.length > 1 ? { ...n, children: [{ tag: 'p', attrs: { 'data-paper': 'both' }, children: ['Agreement and insurance not recorded'] }] } : n)) }))),
    broken('a departed field contact chosen', 'Abby Zane', () => m19(impl({ render: transformed(renderView, (n) => (n.tag === 'tr' && n.attrs['data-installer'] === 'FAKE-010' ? mapTree(n, (x) => (hasClass(x, 'name') && squash(textOf(x)) === 'Abby Zane' ? { ...x, children: ['Aaron Fieldgone'] } : x)) : n)) }))),
  ]);

/* ---------------------------------------------------------------- M21 */

/** 50 cities taken from the city files by a fixed rule: evenly spaced through every city, in the files' order. */
export function fiftyCities(files = geoFiles()) {
  const all = list.states.flatMap((s) => files[`geo/cities/${s.code}.json`].doc.cities);
  const out = [];
  for (let i = 0; i < 50; i++) out.push(all[Math.floor((i * all.length) / 50)]);
  return { cities: out, all };
}

async function m21(I) {
  const model = await madeUpModel();
  const { cities, all } = fiftyCities();
  const several = all.filter((c) => c.counties.length > 1);
  const picked = [...cities, ...several.slice(0, 5)];
  for (const c of picked) {
    const out = view(I, model, `#/city/${c.id}`);
    if (out.view !== 'city') return no(`#/city/${c.id} gives the ${out.view} view`);
    const sec = find(out.node, (n) => hasClass(n, 'place'));
    if (c.counties.length === 1) {
      const county = list.counties.find((x) => x.id === c.counties[0]);
      const state = list.states.find((s) => s.code === c.state).name;
      const heading = squash(textOf(find(out.node, (n) => n.tag === 'h2')));
      if (!sec || sec.attrs['data-county'] !== county.id || heading !== `${c.name}, ${state} · ${county.name}`) return no(`#/city/${c.id} does not open the view of its county ${county.id} under the heading "${c.name}, ${state} · ${county.name}"`);
    } else {
      const named = findAll(out.node, (n) => n.tag === 'a' && n.attrs['data-county'] !== undefined).map((n) => n.attrs['data-county']);
      if (named.join('|') !== c.counties.join('|')) return no(`#/city/${c.id} names ${named.join(', ')}, not the counties the file gives`);
    }
    const offered = I.suggest(model, `${c.name} ${c.state}`, cityDocs()).items.find((s) => s.kind === 'city' && s.id === c.id);
    if (!offered || offered.href !== `#/city/${c.id}`) return no(`typing "${c.name} ${c.state}" does not offer the city ${c.id}`);
  }
  const hint = find(view(I, model, '#/').node, (n) => n.attrs.id === 'loc-hint');
  if (!hint || !/city/.test(textOf(hint)) || LOCATION_HINT !== 'ZIP code, county, state or city.') return no('city lookup is built, and the location box\'s hint does not mention cities');
  const needed = I.citiesNeeded(model, 'akron oh');
  if (needed.join('|') !== 'OH') return no('typing a city with its state asks for other states\' city files');
  return ok(`city lookup is built: ${cities.length} cities taken from the files by a fixed rule (and ${Math.min(5, several.length)} in several counties; the files hold ${several.length}), each opening the view of exactly the counties the file gives, and offered by the location box; the hint mentions cities; a city typed with its state asks for that state's file alone`);
}
test('M21', 'city lookup, built: for 50 cities taken from the city files by a fixed rule, the view names exactly the counties the files give',
  [sound('the page as built', () => m21(impl()))],
  [
    broken('a city opening the whole state', 'does not open the view of its county', () => m21(impl({ render: (r, m, o) => { const out = renderView(r, m, o); return r.view === 'city' ? { ...out, node: mapTree(out.node, (n) => (hasClass(n, 'place') ? { ...n, attrs: { ...n.attrs, 'data-county': null } } : n)) } : out; } }))),
    broken('a box that offers no city', 'does not offer the city', () => m21(impl({ suggest: (m, t) => suggest(m, t, {}) }))),
  ]);

/* ---------------------------------------------------------------- the addresses of places */

async function addresses(I) {
  const model = await madeUpModel();
  const good = [['#/state/OH', 'state'], ['#/state/ON', 'state'], ['#/state/DC', 'state'], ['#/state/OH?county=39153', 'state'],
    ['#/state/AL?county=01001', 'state'], ['#/state/ON?county=CA-3506', 'state'], ['#/zip/44221', 'zip'], ['#/zip/00601', 'zip'], ['#/zip/49999', 'zip'],
    ['#/city/OH-akron', 'city'], ['#/state/OH?county=39153&view=rec', 'state'], ['#/zip/44203?view=pm', 'zip']];
  for (const [hash, want] of good) {
    const r = I.parse(hash);
    const out = I.render(r, model, { now: NOW, files: geoFiles() });
    if (out.view !== want) return no(`${hash} gives the ${out.view} view, not ${want}`);
    if (I.toHash(r) !== hash) return no(`${hash} gives back the address ${I.toHash(r)}`);
  }
  for (const hash of ['#/state/ZZ', '#/state/oh', '#/state/OH?county=01001', '#/state/OH?county=99999', '#/state/OH?town=1', '#/zip/4422', '#/zip/442211', '#/zip/4422a', '#/state/', '#/city/', '#/city/oh-akron', '#/city/ZZ-akron']) {
    if (I.render(I.parse(hash), model, { now: NOW, files: geoFiles() }).view !== 'notFound') return no(`${hash} does not give the not-found view`);
  }
  const box = [['44221', '#/zip/44221'], ['  44221 ', '#/zip/44221'], ['4422', '#/installers?q=4422'], ['442211', '#/installers?q=442211'], ['akron', '#/installers?q=akron']];
  for (const [typed, want] of box) if (I.boxAddress(typed) !== want) return no(`the box in the header gives ${I.boxAddress(typed)} for "${typed}", not ${want}`);
  if (I.boxAddress('akron', I.parse('#/installers?view=pm&office=OH')) !== '#/installers?view=pm&q=akron&office=OH') return no('typing in the header box on All installers does not keep its choices');
  return ok(`${good.length} addresses of places give their view and give back the same address; 12 give the not-found view; the box in the header gives a ZIP's address for five digits, spaces aside, and All installers with q= for anything else, keeping All installers' choices`);
}
test('addresses', 'the addresses of places: each gives its view and gives back the same address; the not-found cases; what the box in the header gives',
  [sound('the page as built', () => addresses(impl()))],
  [
    broken('a router that does not know a city\'s address', 'gives the notFound view', () => addresses(impl({ parse: (h) => (String(h).startsWith('#/city/') ? { view: 'notFound', hash: h } : parseHash(h)) }))),
    broken('a router that takes a county of another state', 'does not give the not-found view', () => addresses(impl({ render: (r, m, o) => renderView(r.view === 'state' && r.county === '01001' ? { ...r, county: null } : r, m, o) }))),
    broken('a header box that searches five digits', 'the box in the header gives', () => addresses(impl({ boxAddress: (t) => toHash({ view: 'installers', mode: null, q: t, office: null, territory: null, dormant: false, inactive: false, mapOff: false }) }))),
  ]);

/* ---------------------------------------------------------------- files that cannot be loaded */

async function unloadable(I) {
  const model = await madeUpModel();
  const failed = { state: 'failed' };
  const cases = [
    ['#/', { [HOME_MAP]: failed }, 'the map could not be drawn'],
    ['#/state/OH', { 'geo/counties/OH.json': failed }, 'the map could not be drawn'],
    ['#/state/OH?county=39153', { 'geo/counties/OH.json': { state: 'ok', doc: { schema: 1, state: 'TX', width: 1, height: 1, counties: [] } } }, 'the map could not be drawn'],
    ['#/zip/44221', { 'geo/zips/4.json': failed }, 'could not be looked up'],
    ['#/city/OH-akron', { 'geo/cities/OH.json': failed }, 'could not be looked up'],
  ];
  for (const [hash, files, words] of cases) {
    const out = I.render(I.parse(hash), model, { now: NOW, files });
    const text = squash(textOf(out.node)).toLowerCase();
    if (!text.includes(words)) return no(`${hash} with its file not loaded does not say ${words}`);
    const slot = find(out.node, (n) => n.attrs['data-map-slot'] !== undefined);
    if (!slot || slot.attrs['data-map'] !== 'failed') return no(`${hash} with its file not loaded does not mark its part as failed`);
    if (hash.startsWith('#/state') && !rowsOf(out.node).length) return no(`${hash} with its map not drawn does not still show its list`);
    if (hash === '#/' && find(out.node, (n) => hasClass(n, 'state-index')) === undefined) return no('Find installers with its map not drawn does not still show the list of states');
  }
  const fetchers = [['missing', async () => { throw new Error('404'); }], ['not JSON', async () => '<html>'], ['schema 2', async () => '{"schema":2,"states":[]}']];
  for (const [label, f] of fetchers) {
    const r = await I.loadExtra(f, HOME_MAP);
    if (r.state !== 'failed') return no(`a shape, ZIP or city file that is ${label} is taken as loaded`);
  }
  return ok('a map that could not be drawn, on Find installers and in a State view, leaves the lists and says so in one line; a ZIP or city file that could not be fetched says it could not be looked up; missing, not JSON and schema 2 each count as not loaded');
}
test('unloadable files', 'a shape, ZIP or city file that cannot be loaded, is not JSON or does not carry schema 1: the lists still show, and one line says so',
  [sound('the page as built', () => unloadable(impl()))],
  [
    broken('a loader that takes schema 2', 'that is schema 2 is taken as loaded', () => unloadable(impl({ loadExtra: async (f, p) => { try { return { state: 'ok', doc: JSON.parse(await f(p)) }; } catch { return { state: 'failed' }; } } }))),
    broken('a view that drops its lists when its map fails', 'does not still show its list', () => unloadable(impl({ render: (r, m, o) => { const out = renderView(r, m, o); const f = find(out.node, (n) => n.attrs['data-map'] === 'failed'); return f ? { ...out, node: mapTree(out.node, (n) => (n.tag === 'table' ? null : n)) } : out; } }))),
  ]);

/* ---------------------------------------------------------------- rulings 3, 5, 7 and 8 of the second prompt */

async function ruling3(I) {
  const model = await madeUpModel();
  const sv = await served();
  const out = view(I, model, '#/');
  const part = find(out.node, (n) => hasClass(n, 'state-index'));
  if (!part || part.tag !== 'details' || part.attrs.open) return no('Find installers has no list of every state and Ontario, closed by default under the two halves');
  for (const s of list.states) {
    const link = find(part, (n) => n.tag === 'a' && n.attrs['data-state-link'] === s.code);
    if (!link || link.attrs.href !== `#/state/${s.code}`) return no(`${s.code} is not in the list as a link to its State view`);
    const item = find(part, (n) => n.tag === 'li' && findAll(n, (x) => x === link).length > 0);
    const n = (sv.byState.get(s.code) || new Set()).size;
    const shown = find(item, (x) => x.attrs['data-count'] !== undefined);
    if (!shown || shown.attrs['data-count'] !== n) return no(`${s.code} in the list does not carry its number of installers with territory (Tier 1) there, ${n}`);
  }
  return ok('the list "Every state and Ontario", closed by default, holds all 52, each with its number of installers with territory (Tier 1) there, each a link to its State view');
}
test('maps ruling 3', 'under the map, a list of every state and Ontario, each with its number of installers with territory there and a link to its view',
  [sound('the page as built', () => ruling3(impl()))],
  [
    broken('Rhode Island left out of the list', 'RI is not in the list', () => ruling3(impl({ render: transformed(renderView, (n) => (n.tag === 'li' && find(n, (x) => x.attrs['data-state-link'] === 'RI') ? null : n)) }))),
    broken('a list that counts both tiers', 'with territory (Tier 1) there', () => ruling3(impl({ render: (r, m, o) => renderView(r, { ...m, stateCounts: new Map(m.stateList.map((s) => [s.code, [...m.coverage.values()].filter((x) => x.has(s.code)).length])) }, o) }))),
  ]);

export const CREDITS = [
  'County and state outlines: U.S. Census Bureau, 2025 cartographic boundary files.',
  'Ontario census divisions: adapted from Statistics Canada, 2021 Census boundary files. This does not constitute an endorsement by Statistics Canada of this product.',
  'ZIP codes: U.S. Census Bureau, 2020 ZIP Code Tabulation Area to county relationship file. A Census ZIP area is close to, but not exactly, the area the Postal Service delivers to.',
  'Cities: the place list of INFINIUM\'s installer application form.',
];
async function ruling5(I) {
  const model = await madeUpModel();
  const part = find(view(I, model, '#/about').node, (n) => n.attrs['data-part'] === 'maps');
  if (!part || squash(textOf(find(part, (n) => n.tag === 'h3'))) !== 'Where the maps come from') return no('About this data has no part headed "Where the maps come from"');
  const lines = findAll(part, (n) => n.tag === 'p').map((n) => squash(textOf(n)));
  if (JSON.stringify(lines) !== JSON.stringify(CREDITS)) return no('the credits are not exactly the three lines of step 4f and the fourth line of section 4.11');
  return ok('About this data credits the makers of the map, ZIP and city files in the four lines of section 4.11, the fourth because city lookup is built');
}
test('maps ruling 5', 'About this data credits the makers of the map, ZIP and city files, in the words section 4.11 gives',
  [sound('the page as built', () => ruling5(impl()))],
  [
    broken('the Statistics Canada line cut short', 'not exactly the three lines', () => ruling5(impl({ render: transformed(renderView, (n) => (n.tag === 'p' && /^Ontario census/.test(squash(textOf(n))) ? { ...n, children: ['Ontario census divisions: Statistics Canada.'] } : n)) }))),
    broken('the cities\' line left out', 'the fourth line', () => ruling5(impl({ render: transformed(renderView, (n) => (n.tag === 'p' && /^Cities:/.test(squash(textOf(n))) ? null : n)) }))),
  ]);

async function ruling7(I) {
  const model = await madeUpModel();
  for (const [q, code] of [['Ohio', 'OH'], ['ON', 'ON'], ['district of columbia', 'DC']]) {
    const out = view(I, model, `#/installers?q=${encodeURIComponent(q)}`);
    const body = out.node.children;
    const at = body.findIndex((n) => findAll(n, (x) => x.tag === 'a' && x.attrs.href === `#/state/${code}` && /^Open the map of /.test(textOf(x))).length > 0);
    const tableAt = body.findIndex((n) => findAll(n, (x) => x.tag === 'table').length > 0 || n.attrs['data-no-match']);
    if (at < 0 || (tableAt >= 0 && at > tableAt)) return no(`a search for "${q}" does not show a link to ${code}'s view above its results`);
  }
  if (findAll(view(I, model, '#/installers?q=akron').node, (x) => x.tag === 'a' && /^Open the map of /.test(textOf(x))).length) return no('a search that names no state shows a link to a state\'s view');
  return ok('"Ohio", "ON" and "district of columbia" each show a link to the state\'s view above the results in All installers; "akron" shows none');
}
test('maps ruling 7', 'a search that names a state shows, above its results, a link to that state\'s view',
  [sound('the page as built', () => ruling7(impl()))],
  [broken('the link left out', 'does not show a link', () => ruling7(impl({ render: transformed(renderView, (n) => (hasClass(n, 'state-link') ? null : n)) })))]);

async function ruling8(I) {
  const model = await madeUpModel();
  const A = filesApart(await madeUpTexts());
  for (const mode of ['est', 'pm']) {
    const all = view(I, model, '#/installers?dormant=1&inactive=1', { mode });
    for (const row of rowsOf(all.node)) {
      const id = row.attrs['data-installer'];
      const links = findAll(cellOf(row, 'territoryIn'), (n) => n.tag === 'a').map((a) => [squash(textOf(a)), a.attrs.href]);
      const want = A.statesAt(1, id).map((s) => [s, `#/state/${s}`]);
      if (JSON.stringify(links) !== JSON.stringify(want)) return no(`${id}: in Territory in the codes are not links to their State views`);
    }
  }
  for (const inst of model.installers.filter((i) => i.territory)) {
    const out = I.render({ view: 'installer', id: inst.id, mode: null, from: null }, model, { now: NOW });
    for (const d of findAll(out.node, (n) => n.tag === 'details' && n.attrs['data-state'])) {
      const summary = find(d, (n) => n.tag === 'summary');
      if (findAll(summary, (n) => n.tag === 'a').length) return no(`${inst.id}: the line that opens ${d.attrs['data-state']} holds a link`);
      const inside = find(d, (n) => hasClass(n, 'counties'));
      const first = inside && inside.children[0];
      const link = first && find(first, (n) => n.tag === 'a');
      if (!link || link.attrs.href !== `#/state/${d.attrs['data-state']}` || !/^Open the map of /.test(textOf(link))) return no(`${inst.id}: the first line inside ${d.attrs['data-state']} is not a link to its State view`);
    }
  }
  const search = view(I, model, '#/installers?q=Alabama');
  const line = find(rowsOf(search.node).find((r) => r.attrs['data-installer'] === 'FAKE-024'), (n) => n.attrs['data-match'] === 'territory');
  if (!line || !find(line, (n) => n.tag === 'a' && n.attrs.href === '#/state/AL')) return no('a search result found by territory does not link to that state\'s view');
  return ok('Territory in: each code a link to its view, in Estimating and Project management; the Installer view: the first line inside each state "Open the map of …", none in the line that opens; a result found by territory links to the state');
}
test('maps ruling 8', 'wherever a view names a state an installer covers, there is a link to that state\'s view',
  [sound('the page as built', () => ruling8(impl()))],
  [
    broken('Territory in as plain codes', 'are not links', () => ruling8(impl({ render: transformed(renderView, (n) => (hasClass(n, 'codes') ? { ...n, children: [textOf(n)] } : n)) }))),
    broken('the link put in the line that opens a state', 'holds a link', () => ruling8(impl({ render: transformed(renderView, (n) => (n.tag === 'summary' && n.attrs.id === undefined ? { ...n, children: [...n.children, { tag: 'a', attrs: { href: '#/state/OH' }, children: ['Open the map'] }] } : n)) }))),
  ]);

/* ---------------------------------------------------------------- the words, the views of places included */

async function newWords(I) {
  const model = await madeUpModel();
  const hashes = ['#/', ...STATE_CODES.map((c) => `#/state/${c}`), ...STATE_CODES.map((c) => `#/state/${c}?county=${encodeURIComponent(countiesOf(c)[0].id)}`),
    ...fiftyZips().map((z) => `#/zip/${z.zip}`), '#/zip/49999', '#/zip/00601', '#/search?q=44221', ...fiftyCities().cities.map((c) => `#/city/${c.id}`)];
  let n = 0;
  for (const hash of hashes) {
    for (const mode of VIEWS) {
      const out = view(I, model, hash, { mode });
      const bad = bannedIn(toHtml(out.node), model.installers);
      if (bad.length) return no(`${hash} in ${VIEW_NAMES[mode]} writes ${bad.join(', ')}`);
      n++;
    }
  }
  return ok(`${n} views of places (${hashes.length} addresses in the three views): none writes undefined, null, NaN or [object Object]`);
}
test('words, maps', 'nothing the views of places write holds undefined, null, NaN or [object Object]',
  [sound('the page as built', () => newWords(impl()))],
  [broken('a county map that writes a count it does not have', 'writes NaN', () => newWords(impl({ render: transformed(renderView, (n) => (n.tag === 'title' ? { ...n, children: [`${String(Number('x'))} installers`] } : n)) })))]);
