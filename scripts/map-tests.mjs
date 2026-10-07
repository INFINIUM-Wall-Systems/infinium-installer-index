/**
 * The tests of the map work, in npm run check:page beside scripts\page-tests.mjs: the files of
 * public\geo that job\build-shapes.mjs and job\build-zips.mjs write, and the views that draw
 * them. Same shape as the page's tests: sound cases that must pass and broken cases that must
 * fail and say why (mustSay); npm run check:selftest runs both.
 *
 * Nothing here reads public\data, the real key, QuickBase or the network. A phone-shaped run of
 * digits that a broken case needs is put together when it runs.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCAN_PATTERNS } from './checks.mjs';
import {
  byAttr, COUNTIES_TEXT, faceText, find, findAll, hasClass, madeUpModel, madeUpTexts, mapTree, ROOT, squash, transformed,
} from './page-standins.mjs';
import { bannedIn, rowsOf } from './page-tests.mjs';
import { countyMapPath, HOME_MAP, loadExtra, makeModel, zipPath } from '../public/js/data.js';
import { textOf, toHtml } from '../public/js/html.js';
import { countySuggestions, shadeStep } from '../public/js/maps.js';
import { boxAddress, parseHash, stateHash, toHash } from '../public/js/routes.js';
import { filesFor, mapPart, renderView } from '../public/js/views.js';

export const MAP_TESTS = [];
const test = (line, label, sound, broken) => MAP_TESTS.push({ line, label, sound, broken });
const ok = (why) => ({ ok: true, why });
const no = (why) => ({ ok: false, why });
const sound = (label, run) => ({ label, run });
const broken = (label, mustSay, run) => ({ label, mustSay, run });

export const GEO = join(ROOT, 'public', 'geo');
const COUNTY_LIST = () => JSON.parse(readFileSync(join(GEO, 'counties.json'), 'utf8'));

/* ================================================================== the built files */

/** The map and ZIP files as they are on disk: { counties: [names], zips: [names], texts: { name: text } }. */
export function builtFiles() {
  const counties = readdirSync(join(GEO, 'counties')).sort();
  const zips = readdirSync(join(GEO, 'zips')).sort();
  const texts = { 'states-map.json': readFileSync(join(GEO, 'states-map.json'), 'utf8') };
  for (const n of counties) texts[`counties/${n}`] = readFileSync(join(GEO, 'counties', n), 'utf8');
  for (const n of zips) texts[`zips/${n}`] = readFileSync(join(GEO, 'zips', n), 'utf8');
  return { counties, zips, texts };
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

/** The built files, against step 2g of the page's second prompt. */
export function builtFilesProblems(files, countyList = COUNTY_LIST()) {
  const p = [];
  const codes = countyList.states.map((s) => s.code);
  const wantCounties = codes.map((c) => `${c}.json`).sort();
  const wantZips = Array.from({ length: 10 }, (_, d) => `${d}.json`);
  if (files.counties.join('|') !== wantCounties.join('|')) p.push(`the folder of county files holds ${files.counties.length} files, not the ${wantCounties.length} state files and nothing else`);
  if (files.zips.join('|') !== wantZips.join('|')) p.push(`the folder of ZIP files holds ${files.zips.length} files, not 0.json to 9.json and nothing else`);
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
  return p.length ? p : { paths, zips: zipCount };
}

function builtTest(files) {
  const r = builtFilesProblems(files);
  if (Array.isArray(r)) return no(`${r.length} problem(s): ${r.slice(0, 6).join('; ')}`);
  return ok(`52 county files and 10 ZIP files and nothing else; 3,193 county shapes, each once in its state's file; the 52 codes once on the Home map; ${r.paths} paths whole-numbered and inside their frames; ${r.zips} ZIP codes of five digits naming listed counties; no line R5 reads; ${PLACES.length} places where they belong`);
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

test('built files', 'the map and ZIP files of public\\geo, as step 2g says',
  [sound('the files as job/build-shapes.mjs and job/build-zips.mjs wrote them', () => builtTest(builtFiles()))],
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
  ]);

/* ================================================================== the views, M1 to M13 */

const NOW = Date.parse('2026-10-07T16:00:00Z');
const REAL = { render: renderView, filesFor, mapPart, parse: parseHash, toHash, boxAddress, suggestions: countySuggestions, loadExtra };
const impl = (over = {}) => ({ ...REAL, ...over });

/** A file of public\geo, read as the page reads it once fetched. */
const geoDoc = (rel) => JSON.parse(readFileSync(join(ROOT, 'public', ...rel.split('/')), 'utf8'));
let everyFile = null;
/** Every map and ZIP file, as { path: { state: 'ok', doc } }: what the page holds once it has fetched them. */
export function geoFiles() {
  if (!everyFile) {
    everyFile = { [HOME_MAP]: { state: 'ok', doc: geoDoc(HOME_MAP) } };
    for (const s of JSON.parse(COUNTIES_TEXT).states) everyFile[countyMapPath(s.code)] = { state: 'ok', doc: geoDoc(countyMapPath(s.code)) };
    for (let d = 0; d <= 9; d++) everyFile[zipPath(String(d))] = { state: 'ok', doc: geoDoc(zipPath(String(d))) };
  }
  return everyFile;
}

/** The five steps of shading, written out by hand apart from the page: 1; 2 to 3; 4 to 6; 7 to 10; 11 up. */
export const stepOf = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : n <= 10 ? 4 : 5);

/** Who serves each state and each county, worked out from territory.json alone: { byState, byCounty }, sets of ids. */
export function servedFrom(territoryText) {
  const byState = new Map();
  const byCounty = new Map();
  for (const s of JSON.parse(territoryText).states) {
    const all = new Set();
    for (const c of s.counties) {
      const ids = new Set([...(c.tier1Installers || []), ...(c.tier2Installers || [])]);
      byCounty.set(c.id, { ids, tier1: c.tier1Installers || [], tier2: c.tier2Installers || [] });
      for (const i of ids) all.add(i);
    }
    byState.set(s.state, all);
  }
  return { byState, byCounty };
}

const list = JSON.parse(COUNTIES_TEXT);
const STATE_CODES = list.states.map((s) => s.code);
const countiesOf = (code) => list.counties.filter((c) => c.state === code);
const view = (I, model, hash, files = geoFiles()) => I.render(I.parse(hash), model, { now: NOW, files });
const shapesOf = (node) => findAll(node, (n) => n.tag === 'a' && n.attrs['data-shape'] !== undefined);
const idsOfRows = (node) => rowsOf(node).map((r) => r.attrs['data-installer']);
const footOf = (node) => find(node, (n) => hasClass(n, 'foot-line'));

/* ---------------------------------------------------------------- M1 */

const CSS = () => readFileSync(join(ROOT, 'public', 'css', 'site.css'), 'utf8');
const STEP_COLOURS = [['shade-1', '#E8F0DC'], ['shade-2', '#C7D9AD'], ['shade-3', '#9EBD70'], ['shade-4', '#76A134'], ['shade-5', '#5A7D28'], ['shade-0', '#FFFFFF']];

async function m1(I, css = CSS()) {
  const model = await madeUpModel();
  const served = servedFrom((await madeUpTexts())['territory.json']);
  const shapes = shapesOf(view(I, model, '#/').node);
  if (shapes.length !== STATE_CODES.length) return no(`the Home map draws ${shapes.length} states, not ${STATE_CODES.length}`);
  for (const code of STATE_CODES) {
    const a = shapes.find((s) => s.attrs['data-shape'] === code);
    const want = stepOf((served.byState.get(code) || new Set()).size);
    const path = a && a.children.find((c) => c.tag === 'path');
    if (!a || a.attrs['data-step'] !== want || !path || !path.attrs.class.split(' ').includes(`shade-${want}`)) return no(`${code} is shaded at step ${a ? a.attrs['data-step'] : 'none'}, not ${want}, the step for its number of installers`);
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
  return ok(`all 52 shaded at the step for their number of installers; the five steps at their edges; their colours as the old page's; a code on every step at least 4.5 to 1`);
}
test('M1', 'on Home, every state\'s shade is the step for the number of installers with a territory row in it, for all 52',
  [sound('the page as built', () => m1(impl()))],
  [
    broken('Ohio shaded a step too pale', 'OH is shaded', () => m1(impl({ render: transformed(renderView, (n) => (n.attrs['data-shape'] === 'OH' ? { ...n, attrs: { ...n.attrs, 'data-step': 0 } } : n)) }))),
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
      const r = I.parse(l[1]);
      if (I.render(r, model, { now: NOW, files: geoFiles() }).view !== 'state') return no(`the link of ${code} on ${where} does not open its State view`);
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
      const paths = I.filesFor({ view: 'state', code, county }, model, {}).map((f) => f.path);
      if (paths.join('|') !== `geo/counties/${code}.json`) return no(`the State view of ${code} asks for ${paths.join(', ') || 'nothing'}, not its own shape file alone`);
      const only = { [`geo/counties/${code}.json`]: geoFiles()[`geo/counties/${code}.json`] };
      const part = I.mapPart({ view: 'state', code, county }, model, only);
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
  const served = servedFrom((await madeUpTexts())['territory.json']);
  let counted = 0;
  for (const code of STATE_CODES) {
    const shapes = shapesOf(view(I, model, `#/state/${code}`).node);
    const counties = countiesOf(code);
    if (shapes.length !== counties.length) return no(`the map of ${code} draws ${shapes.length} counties, not ${counties.length}`);
    for (const c of counties) {
      const a = shapes.find((s) => s.attrs['data-shape'] === c.id);
      const want = stepOf(served.byCounty.has(c.id) ? served.byCounty.get(c.id).ids.size : 0);
      if (!a || a.attrs['data-step'] !== want) return no(`county ${c.id} is shaded at step ${a ? a.attrs['data-step'] : 'none'}, not ${want}`);
      counted++;
    }
  }
  return ok(`${counted} counties in the 52 State views, each shaded at the step for its number of installers`);
}
test('M4', 'in a State view, every county\'s shade is the step for the number of installers serving it, for every county of every state',
  [sound('the page as built', () => m4(impl()))],
  [broken('Summit County shaded as if nobody served it', 'county 39153 is shaded', () => m4(impl({ render: transformed(renderView, (n) => (n.attrs['data-shape'] === '39153' ? { ...n, attrs: { ...n.attrs, 'data-step': 0 } } : n)) })))]);

/* ---------------------------------------------------------------- M5 and M9 */

async function m5(I) {
  const model = await madeUpModel();
  const served = servedFrom((await madeUpTexts())['territory.json']);
  let nobody = 0;
  let checked = 0;
  for (const code of STATE_CODES) {
    for (const c of countiesOf(code)) {
      const out = view(I, model, `#/state/${code}?county=${c.id}`);
      const want = [...(served.byCounty.has(c.id) ? served.byCounty.get(c.id).ids : [])].sort();
      const got = idsOfRows(out.node).slice().sort();
      if (got.join('|') !== want.join('|')) return no(`with county ${c.id} chosen the list holds ${got.length} installers, not the ${want.length} with a territory row for it`);
      const chosen = shapesOf(out.node).filter((a) => a.attrs['aria-current'] === 'true').map((a) => a.attrs['data-shape']);
      const outline = find(out.node, (n) => hasClass(n, 'chosen-outline'));
      if (chosen.join('|') !== c.id || !outline || outline.attrs['data-chosen'] !== c.id) return no(`with county ${c.id} chosen, the shape marked chosen is ${chosen.join(', ') || 'none'}`);
      if (!want.length) nobody++;
      checked++;
    }
  }
  return ok(`${checked} counties, each chosen in turn (01001, which begins with a zero, and the Ontario divisions among them): the list holds exactly its installers and its shape is marked chosen; ${nobody} are served by nobody`);
}
test('M5', 'with a county chosen, the list holds exactly the installers with a territory row for it, and its shape is marked chosen, for every county of every state',
  [sound('the page as built', () => m5(impl()))],
  [
    broken('a list that ignores the county chosen', 'with county', () => m5(impl({ render: (r, m, o) => {
      const out = renderView(r, m, o);
      if (r.view !== 'state' || !r.county) return out;
      const wholeState = rowsOf(renderView({ ...r, county: null }, m, o).node);
      return { ...out, node: mapTree(out.node, (n) => (n.tag === 'tbody' ? { ...n, children: wholeState } : n)) };
    } }))),
    broken('the wrong county marked chosen', 'the shape marked chosen', () => m5(impl({ render: transformed(renderView, (n) => (n.attrs['aria-current'] === 'true' ? { ...n, attrs: { ...n.attrs, 'aria-current': null } } : n)) }))),
  ]);

async function m9(I) {
  const model = await madeUpModel();
  for (const hash of ['#/state/OH?county=39001', '#/state/TX?county=48141', '#/state/DC']) {
    const out = view(I, model, hash);
    const text = squash(textOf(out.node));
    if (idsOfRows(out.node).length || !/No installer serves [^.]+\./.test(text)) return no(`${hash}: a place nobody serves does not say so plainly`);
    if (!footOf(out.node)) return no(`${hash}: a place nobody serves does not show the foot line`);
  }
  return ok('Adams County, Ohio, El Paso County, Texas, and the District of Columbia, which nobody serves, each say so, with the foot line');
}
test('M9', 'a county nobody serves says so',
  [sound('the page as built', () => m9(impl()))],
  [broken('a place nobody serves shown as an empty list', 'does not say so plainly', () => m9(impl({ render: transformed(renderView, (n) => (n.attrs['data-nobody'] ? null : n)) })))]);

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
  if (!all || all.attrs.href !== '#/state/OH' || squash(textOf(all)) !== 'Show all of Ohio') return no('"Show all of Ohio" does not give the state\'s address');
  return ok(`${checked} counties: choosing each name in the box gives its link's address; matched from the start of a word, capitals aside; "Show all of Ohio" gives Ohio's address`);
}
test('M6', 'choosing a county\'s name in the box gives the same address as the county\'s link; "Show all" gives the state\'s address',
  [sound('the page as built', () => m6(impl()))],
  [
    broken('a box that gives the state\'s address for a county', 'does not give the address of its link', () => m6(impl({ suggestions: (m, code, t, n) => countySuggestions(m, code, t, n).map((s) => ({ ...s, href: stateHash(code) })) }))),
    broken('a box that matches inside a word', 'should match from the start of a word', () => m6(impl({ suggestions: (m, code, t, n) => (m.countiesByState.get(code) || []).filter((c) => c.name.toLowerCase().includes(String(t).trim().toLowerCase())).slice(0, n).map((c) => ({ id: c.id, name: c.name, href: stateHash(code, c.id) })) }))),
  ]);

/* ---------------------------------------------------------------- M7 and M11, on a model changed by hand */

/** The made-up model with territory changed by hand, so that the order of the file and the order of tiers differ. */
async function reorderedModel({ medina = false } = {}) {
  const t = await madeUpTexts();
  const build = JSON.parse(t['build.json']);
  const installers = JSON.parse(t['installers.json']).installers;
  const territory = JSON.parse(t['territory.json']);
  const oh = territory.states.find((s) => s.state === 'OH');
  const county = (id) => oh.counties.find((c) => c.id === id);
  // FAKE-001 keeps only Tier 2 in Ohio; FAKE-106, late in the file, is Tier 1 in Summit County;
  // FAKE-001 is Tier 1 in Medina County (39103), beside Summit.
  county('39035').tier1Installers = (county('39035').tier1Installers || []).filter((id) => id !== 'FAKE-001');
  if (!county('39035').tier1Installers.length) delete county('39035').tier1Installers;
  county('39153').tier1Installers = ['FAKE-024', 'FAKE-106'];
  county('39153').tier2Installers = ['FAKE-001'];
  if (medina) oh.counties.push({ id: '39103', tier1Installers: ['FAKE-001'] });
  return makeModel(build, installers, territory.states, JSON.parse(COUNTIES_TEXT));
}

const tierLines = (out) => rowsOf(out.node).map((r) => [r.attrs['data-installer'], squash(textOf(find(r, (n) => hasClass(n, 'tier-line')) || ''))]);

async function m7(I) {
  const model = await reorderedModel();
  const county = tierLines(view(I, model, '#/state/OH?county=39153'));
  const wantCounty = [['FAKE-024', 'Tier 1'], ['FAKE-106', 'Tier 1'], ['FAKE-001', 'Tier 2']];
  if (JSON.stringify(county) !== JSON.stringify(wantCounty)) return no(`with Summit County chosen the list reads ${JSON.stringify(county)}: Tier 1 first, then Tier 2, each in the order of the file, each with its tier, is ${JSON.stringify(wantCounty)}`);
  const state = tierLines(view(I, model, '#/state/OH'));
  const wantState = [['FAKE-024', 'Tier 1 in 1 county, Tier 2 in 0'], ['FAKE-102', 'Tier 1 in 2 counties, Tier 2 in 1'], ['FAKE-106', 'Tier 1 in 1 county, Tier 2 in 0'], ['FAKE-001', 'Tier 1 in 0 counties, Tier 2 in 1']];
  if (JSON.stringify(state) !== JSON.stringify(wantState)) return no(`with no county chosen the list reads ${JSON.stringify(state)}: those with any Tier 1 county first, then the rest, each in the order of the file, with both counts, is ${JSON.stringify(wantState)}`);
  const order = (await madeUpModel()).installers.map((i) => i.company);
  const sorted = [...order].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0));
  if (order.join('|') !== sorted.join('|')) return no('the order of the file is not alphabetical by company');
  return ok('with a county: Tier 1 first, then Tier 2, each in the order of the file, which is alphabetical by company; with none: Tier 1 holders first, both counts as "Tier 1 in 2 counties, Tier 2 in 1"');
}
test('M7', 'the order and the tier wording, with and without a county chosen, as step 4c says',
  [sound('the page as built, on a model changed by hand', () => m7(impl()))],
  [
    broken('a list in the order of the file alone', 'Tier 1 first, then Tier 2', () => m7(impl({ render: transformed(renderView, (n) => (n.tag === 'tbody' ? { ...n, children: [...n.children].sort((a, b) => (a.attrs['data-installer'] < b.attrs['data-installer'] ? -1 : 1)) } : n)) }))),
    broken('the tier wording changed', 'with both counts', () => m7(impl({ render: transformed(renderView, (n) => (hasClass(n, 'tier-line') && /in/.test(textOf(n)) ? { ...n, children: [textOf(n).replace('Tier 1 in', 'Tier 1:')] } : n)) }))),
  ]);

async function m11(I) {
  const model = await reorderedModel({ medina: true });
  const zip = geoFiles()[zipPath('4')].doc.zips.find((z) => z.counties && z.counties.length > 1 && z.counties[0] === '39153' && z.counties.includes('39103'));
  if (!zip) return no('no ZIP in Summit and Medina Counties to try');
  const out = view(I, model, `#/zip/${zip.zip}`);
  const named = findAll(out.node, (n) => n.tag === 'li' && n.attrs['data-county'] !== undefined).map((n) => n.attrs['data-county']);
  if (named.join('|') !== zip.counties.join('|')) return no(`ZIP ${zip.zip} names ${named.join(', ')}, not each of its counties in the file's order`);
  const rows = rowsOf(out.node).map((r) => [r.attrs['data-installer'], r.attrs['data-tier']]);
  const ids = rows.map(([id]) => id);
  if (new Set(ids).size !== ids.length) return no(`ZIP ${zip.zip} lists an installer more than once`);
  const want = [['FAKE-024', 1], ['FAKE-001', 1], ['FAKE-106', 1]];
  if (JSON.stringify(rows) !== JSON.stringify(want)) return no(`ZIP ${zip.zip} lists ${JSON.stringify(rows)}: each installer once, at its best tier, is ${JSON.stringify(want)}`);
  const first = rowsOf(out.node).find((r) => r.attrs['data-installer'] === 'FAKE-001');
  if (!squash(textOf(first)).includes('Serves Summit County and Medina County')) return no(`ZIP ${zip.zip} does not name the counties an installer serves`);
  return ok(`ZIP ${zip.zip}, in ${zip.counties.length} counties: each named in the file's order; each installer once, at its best tier, with its counties named`);
}
test('M11', 'a ZIP in several counties names each and lists each installer once, at its best tier',
  [sound('the page as built, on a model changed by hand', () => m11(impl()))],
  [
    broken('an installer listed at its worst tier', 'at its best tier', () => m11(impl({ render: transformed(renderView, (n) => (n.tag === 'tr' && n.attrs['data-installer'] === 'FAKE-001' ? { ...n, attrs: { ...n.attrs, 'data-tier': 2 } } : n)) }))),
    broken('an installer listed once for each county', 'more than once', () => m11(impl({ render: transformed(renderView, (n) => (n.tag === 'tbody' ? { ...n, children: [...n.children, n.children[0]] } : n)) }))),
  ]);

/* ---------------------------------------------------------------- M8 */

async function m8(I) {
  const base = await madeUpModel();
  const cases = [];
  for (const offMap of [base.installers.filter((i) => !i.territory).length, 1]) {
    const installers = offMap === 1 ? base.installers.map((i, k) => (i.territory ? i : k === base.installers.findIndex((x) => !x.territory) ? i : { ...i, territory: { states: [], countyCount: 0 } })) : base.installers;
    const model = { ...base, installers };
    for (const hash of ['#/state/OH', '#/state/OH?county=39001', '#/state/DC', `#/zip/${geoFiles()[zipPath('4')].doc.zips.find((z) => z.counties && z.counties.length > 1).zip}`]) {
      const foot = footOf(view(I, model, hash).node);
      const want = offMap === 1 ? '1 installer has no mapped territory and may also serve this area.' : `${offMap} installers have no mapped territory and may also serve this area.`;
      if (!foot || squash(textOf(foot)) !== want || find(foot, (n) => n.tag === 'a').attrs.href !== '#/not-on-the-map') return no(`${hash}, with ${offMap} installer(s) not on the map: the foot line reads "${foot ? squash(textOf(foot)) : 'nothing'}", not "${want}" linking to Not on the map`);
      cases.push(hash);
    }
  }
  return ok(`the foot line in ${cases.length} lists carries the number from the data, ${base.installers.filter((i) => !i.territory).length} and then 1, in its two wordings, linking to Not on the map`);
}
test('M8', 'the foot line shows the number of installers with no territory, taken from the data',
  [sound('the page as built', () => m8(impl()))],
  [broken('a number written into the page', 'not "1 installer has', () => m8(impl({ render: transformed(renderView, (n) => (hasClass(n, 'foot-line') ? { ...n, children: [{ tag: 'a', attrs: { href: '#/not-on-the-map' }, children: ['25 installers have no mapped territory and may also serve this area.'] }] } : n)) })))]);

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
    if (z.counties.length === 1) {
      const c = list.counties.find((x) => x.id === z.counties[0]);
      const sv = find(out.node, (n) => hasClass(n, 'state-view'));
      if (!sv || sv.attrs['data-county'] !== c.id || !squash(textOf(find(out.node, (n) => n.tag === 'h2'))).startsWith(`Installers serving ZIP ${z.zip} — `)) return no(`ZIP ${z.zip} does not show the State view for its county ${c.id}`);
    } else {
      const named = findAll(out.node, (n) => n.tag === 'li' && n.attrs['data-county'] !== undefined).map((n) => n.attrs['data-county']);
      if (named.join('|') !== z.counties.join('|')) return no(`ZIP ${z.zip} names the counties ${named.join(', ')}, not ${z.counties.join(', ')} in the file's order`);
    }
  }
  return ok(`50 ZIP codes, ${several} crossing a county line and ${zero} beginning with a zero: each names exactly the counties the file gives, in its order`);
}
test('M10', 'for 50 ZIP codes taken from the ZIP files by a fixed rule, the view names exactly the counties the file gives, in its order',
  [sound('the page as built', () => m10(impl()))],
  [broken('counties put in order of id', 'not', () => m10(impl({ render: transformed(renderView, (n) => (hasClass(n, 'zip-counties') ? { ...n, children: [...n.children].sort((a, b) => (a.attrs['data-county'] < b.attrs['data-county'] ? 1 : -1)) } : n)) })))]);

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
  for (const hash of ['#/', '#/installers', '#/installers?set=rates', '#/installer/FAKE-102', '#/search?q=ohio', '#/search?q=4422', '#/search?q=442211', '#/not-on-the-map', '#/about', '#/state/OH', '#/state/OH?county=39153']) {
    const got = zipFiles(I.filesFor(I.parse(hash), model, geoFiles()).map((f) => f.path));
    if (got.length) return no(`${hash} asks for ${got.join(', ')} before a ZIP's address is opened`);
  }
  for (const zip of ['44221', '00601', '90210', '99999']) {
    for (const hash of [`#/zip/${zip}`, `#/search?q=${zip}`]) {
      const got = zipFiles(I.filesFor(I.parse(hash), model, {}).map((f) => f.path));
      if (got.join('|') !== `geo/zips/${zip[0]}.json`) return no(`${hash} asks for ${got.join(', ') || 'no ZIP file'}, not the one for its first digit alone`);
    }
  }
  return ok('11 addresses that are not a ZIP\'s ask for no ZIP file; four ZIP codes, by their own address and by the search box, each ask for the one file of their first digit');
}
test('M13', 'no ZIP file is asked for until a ZIP\'s address is opened, and then only the one for its first digit',
  [sound('the page as built', () => m13(impl()))],
  [
    broken('a page that asks for a ZIP file on Home', 'before a ZIP\'s address is opened', () => m13(impl({ filesFor: (r, m, f) => [...filesFor(r, m, f), ...(r.view === 'home' ? [{ path: zipPath('4'), part: 'map' }] : [])] }))),
    broken('a page that asks for every ZIP file at once', 'not the one for its first digit alone', () => m13(impl({ filesFor: (r, m, f) => (r.view === 'zip' ? Array.from({ length: 10 }, (_, d) => ({ path: zipPath(String(d)), part: 'content' })) : filesFor(r, m, f)) }))),
  ]);

/* ---------------------------------------------------------------- the new addresses */

async function addresses(I) {
  const model = await madeUpModel();
  const good = [['#/state/OH', 'state'], ['#/state/ON', 'state'], ['#/state/DC', 'state'], ['#/state/OH?county=39153', 'state'],
    ['#/state/AL?county=01001', 'state'], ['#/state/ON?county=CA-3506', 'state'], ['#/zip/44221', 'zip'], ['#/zip/00601', 'zip'], ['#/zip/49999', 'zip']];
  for (const [hash, want] of good) {
    const r = I.parse(hash);
    const out = I.render(r, model, { now: NOW, files: geoFiles() });
    if (out.view !== want) return no(`${hash} gives the ${out.view} view, not ${want}`);
    if (I.toHash(r) !== hash) return no(`${hash} gives back the address ${I.toHash(r)}`);
  }
  for (const hash of ['#/state/ZZ', '#/state/oh', '#/state/OH?county=01001', '#/state/OH?county=99999', '#/state/OH?town=1', '#/zip/4422', '#/zip/442211', '#/zip/4422a', '#/state/']) {
    if (I.render(I.parse(hash), model, { now: NOW, files: geoFiles() }).view !== 'notFound') return no(`${hash} does not give the not-found view`);
  }
  const box = [['44221', '#/zip/44221'], ['  44221 ', '#/zip/44221'], ['4422', '#/search?q=4422'], ['442211', '#/search?q=442211'], ['akron', '#/search?q=akron']];
  for (const [typed, want] of box) if (I.boxAddress(typed) !== want) return no(`the search box gives ${I.boxAddress(typed)} for "${typed}", not ${want}`);
  const viaSearch = I.render(I.parse('#/search?q=44221'), model, { now: NOW, files: geoFiles() });
  const direct = I.render(I.parse('#/zip/44221'), model, { now: NOW, files: geoFiles() });
  if (viaSearch.view !== 'zip' || squash(textOf(viaSearch.node)) !== squash(textOf(direct.node))) return no('#/search?q=44221 does not show what #/zip/44221 shows');
  return ok(`${good.length} new addresses give their view and give back the same address; 9 give the not-found view; the box gives a ZIP's address for five digits, spaces aside, and a search's for four or six; a search for five digits shows the ZIP`);
}
test('addresses', 'the new addresses: each gives its view and gives back the same address; the not-found cases; what the search box gives for five digits, four and six',
  [sound('the page as built', () => addresses(impl()))],
  [
    broken('a router that does not know a ZIP\'s address', 'gives the notFound view', () => addresses(impl({ parse: (h) => (String(h).startsWith('#/zip/') ? { view: 'notFound', hash: h } : parseHash(h)) }))),
    broken('a router that takes a county of another state', 'does not give the not-found view', () => addresses(impl({ render: (r, m, o) => renderView(r.view === 'state' && r.county === '01001' ? { ...r, county: null } : r, m, o) }))),
    broken('a box that searches five digits', 'the search box gives', () => addresses(impl({ boxAddress: (t) => toHash({ view: 'search', q: t }) }))),
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
  ];
  for (const [hash, files, words] of cases) {
    const out = I.render(I.parse(hash), model, { now: NOW, files });
    const text = squash(textOf(out.node)).toLowerCase();
    if (!text.includes(words)) return no(`${hash} with its file not loaded does not say ${words}`);
    const slot = find(out.node, (n) => n.attrs['data-map-slot'] !== undefined);
    if (!slot || slot.attrs['data-map'] !== 'failed') return no(`${hash} with its file not loaded does not mark its map's part as failed`);
    if (hash.startsWith('#/state') && !rowsOf(out.node).length) return no(`${hash} with its map not drawn does not still show its list`);
    if (hash === '#/' && find(out.node, (n) => hasClass(n, 'state-index')) === undefined) return no('Home with its map not drawn does not still show the list of states');
  }
  const fetchers = [['missing', async () => { throw new Error('404'); }], ['not JSON', async () => '<html>'], ['schema 2', async () => '{"schema":2,"states":[]}']];
  for (const [label, f] of fetchers) {
    const r = await I.loadExtra(f, HOME_MAP);
    if (r.state !== 'failed') return no(`a shape or ZIP file that is ${label} is taken as loaded`);
  }
  return ok('a map that could not be drawn, on Home and in a State view, leaves the list and says so in one line; a ZIP file that could not be fetched says the ZIP could not be looked up; missing, not JSON and schema 2 each count as not loaded');
}
test('unloadable files', 'a shape file or a ZIP file that cannot be loaded, is not JSON or does not carry schema 1: the list still shows, and one line says so',
  [sound('the page as built', () => unloadable(impl()))],
  [
    broken('a loader that takes schema 2', 'that is schema 2 is taken as loaded', () => unloadable(impl({ loadExtra: async (f, p) => { try { return { state: 'ok', doc: JSON.parse(await f(p)) }; } catch { return { state: 'failed' }; } } }))),
    broken('a view that drops its list when its map fails', 'does not still show its list', () => unloadable(impl({ render: (r, m, o) => { const out = renderView(r, m, o); const failed = find(out.node, (n) => n.attrs['data-map'] === 'failed'); return failed ? { ...out, node: mapTree(out.node, (n) => (n.tag === 'table' ? null : n)) } : out; } }))),
  ]);

/* ---------------------------------------------------------------- rulings 3, 5, 7 and 8 */

async function ruling3(I) {
  const model = await madeUpModel();
  const served = servedFrom((await madeUpTexts())['territory.json']);
  const out = view(I, model, '#/');
  const part = find(out.node, (n) => hasClass(n, 'state-index'));
  if (!part) return no('Home has no list of every state and Ontario');
  for (const s of list.states) {
    const link = find(part, (n) => n.tag === 'a' && n.attrs['data-state-link'] === s.code);
    if (!link || link.attrs.href !== `#/state/${s.code}`) return no(`${s.code} is not in the list under the Home map as a link to its State view`);
    const item = find(part, (n) => n.tag === 'li' && findAll(n, (x) => x === link).length > 0);
    const n = (served.byState.get(s.code) || new Set()).size;
    const shown = find(item, (x) => x.attrs['data-count'] !== undefined);
    if (!shown || shown.attrs['data-count'] !== n) return no(`${s.code} in the list does not carry its number of installers, ${n}`);
  }
  return ok('the list under the Home map holds all 52, each with its number of installers, each a link to its State view');
}
test('maps ruling 3', 'under the Home map, a list of every state and Ontario, each with its number of installers and a link to its view',
  [sound('the page as built', () => ruling3(impl()))],
  [broken('Rhode Island left out of the list', 'RI is not in the list', () => ruling3(impl({ render: transformed(renderView, (n) => (n.tag === 'li' && find(n, (x) => x.attrs['data-state-link'] === 'RI') ? null : n)) })))]);

export const CREDITS = [
  'County and state outlines: U.S. Census Bureau, 2025 cartographic boundary files.',
  'Ontario census divisions: adapted from Statistics Canada, 2021 Census boundary files. This does not constitute an endorsement by Statistics Canada of this product.',
  'ZIP codes: U.S. Census Bureau, 2020 ZIP Code Tabulation Area to county relationship file. A Census ZIP area is close to, but not exactly, the area the Postal Service delivers to.',
];
async function ruling5(I) {
  const model = await madeUpModel();
  const part = find(view(I, model, '#/about').node, (n) => n.attrs['data-part'] === 'maps');
  if (!part || squash(textOf(find(part, (n) => n.tag === 'h3'))) !== 'Where the maps come from') return no('About this data has no part headed "Where the maps come from"');
  const lines = findAll(part, (n) => n.tag === 'p').map((n) => squash(textOf(n)));
  if (JSON.stringify(lines) !== JSON.stringify(CREDITS)) return no('the credits are not exactly the three lines of step 4f');
  return ok('About this data credits the makers of the map and ZIP files in the three lines of step 4f');
}
test('maps ruling 5', 'About this data credits the makers of the map and ZIP files, in the words step 4f gives',
  [sound('the page as built', () => ruling5(impl()))],
  [broken('the Statistics Canada line cut short', 'not exactly the three lines', () => ruling5(impl({ render: transformed(renderView, (n) => (n.tag === 'p' && /^Ontario census/.test(squash(textOf(n))) ? { ...n, children: ['Ontario census divisions: Statistics Canada.'] } : n)) })))]);

async function ruling7(I) {
  const model = await madeUpModel();
  for (const [q, code] of [['Ohio', 'OH'], ['ON', 'ON'], ['district of columbia', 'DC']]) {
    const out = view(I, model, `#/search?q=${encodeURIComponent(q)}`);
    const body = out.node.children;
    const at = body.findIndex((n) => findAll(n, (x) => x.tag === 'a' && x.attrs.href === `#/state/${code}` && /^Open the map of /.test(textOf(x))).length > 0);
    const tableAt = body.findIndex((n) => findAll(n, (x) => x.tag === 'table').length > 0 || n.attrs['data-no-match']);
    if (at < 0 || (tableAt >= 0 && at > tableAt)) return no(`a search for "${q}" does not show a link to ${code}'s view above its results`);
  }
  if (findAll(view(I, model, '#/search?q=akron').node, (x) => x.tag === 'a' && /^Open the map of /.test(textOf(x))).length) return no('a search that names no state shows a link to a state\'s view');
  return ok('"Ohio", "ON" and "district of columbia" each show a link to the state\'s view above the results; "akron" shows none');
}
test('maps ruling 7', 'a search that names a state shows, above its results, a link to that state\'s view',
  [sound('the page as built', () => ruling7(impl()))],
  [broken('the link left out', 'does not show a link', () => ruling7(impl({ render: transformed(renderView, (n) => (hasClass(n, 'state-link') ? null : n)) })))]);

async function ruling8(I) {
  const model = await madeUpModel();
  const all = view(I, model, '#/installers');
  for (const row of rowsOf(all.node)) {
    const cell = find(row, (n) => n.tag === 'td' && n.attrs['data-column'] === 'states');
    const inst = model.byId.get(row.attrs['data-installer']);
    if (!inst.territory) continue;
    const links = findAll(cell, (n) => n.tag === 'a').map((a) => [squash(textOf(a)), a.attrs.href]);
    const want = inst.territory.states.map((s) => [s.state, `#/state/${s.state}`]);
    if (JSON.stringify(links) !== JSON.stringify(want)) return no(`${inst.id}: in States covered the codes are not links to their State views`);
  }
  for (const inst of model.installers.filter((i) => i.territory)) {
    const out = view(I, model, `#/installer/${inst.id}`);
    for (const d of findAll(out.node, (n) => n.tag === 'details')) {
      const summary = find(d, (n) => n.tag === 'summary');
      if (findAll(summary, (n) => n.tag === 'a').length) return no(`${inst.id}: the line that opens ${d.attrs['data-state']} holds a link`);
      const inside = find(d, (n) => hasClass(n, 'counties'));
      const first = inside && inside.children[0];
      const link = first && find(first, (n) => n.tag === 'a');
      if (!link || link.attrs.href !== `#/state/${d.attrs['data-state']}` || !/^Open the map of /.test(textOf(link))) return no(`${inst.id}: the first line inside ${d.attrs['data-state']} is not a link to its State view`);
    }
  }
  const search = view(I, model, '#/search?q=Alabama');
  const line = find(rowsOf(search.node).find((r) => r.attrs['data-installer'] === 'FAKE-001'), (n) => n.attrs['data-match'] === 'territory');
  if (!line || !find(line, (n) => n.tag === 'a' && n.attrs.href === '#/state/AL')) return no('a search result found by territory does not link to that state\'s view');
  return ok('States covered: each code a link to its view; the Installer view: the first line inside each state "Open the map of …", none in the line that opens; a result found by territory links to the state');
}
test('maps ruling 8', 'wherever a view names a state an installer covers, there is a link to that state\'s view',
  [sound('the page as built', () => ruling8(impl()))],
  [
    broken('States covered as plain codes', 'are not links', () => ruling8(impl({ render: transformed(renderView, (n) => (hasClass(n, 'codes') ? { ...n, children: [textOf(n)] } : n)) }))),
    broken('the link put in the line that opens a state', 'holds a link', () => ruling8(impl({ render: transformed(renderView, (n) => (n.tag === 'summary' ? { ...n, children: [...n.children, { tag: 'a', attrs: { href: '#/state/OH' }, children: ['Open the map'] }] } : n)) }))),
  ]);

/* ---------------------------------------------------------------- the words, the new views included */

async function newWords(I) {
  const model = await madeUpModel();
  const hashes = ['#/', ...STATE_CODES.map((c) => `#/state/${c}`), ...STATE_CODES.map((c) => `#/state/${c}?county=${encodeURIComponent(countiesOf(c)[0].id)}`),
    ...fiftyZips().map((z) => `#/zip/${z.zip}`), '#/zip/49999', '#/zip/00601', '#/search?q=44221'];
  for (const hash of hashes) {
    const out = view(I, model, hash);
    const bad = bannedIn(toHtml(out.node), model.installers);
    if (bad.length) return no(`${hash} writes ${bad.join(', ')}`);
  }
  return ok(`${hashes.length} views of the map work: none writes undefined, null, NaN or [object Object]`);
}
test('words, maps', 'nothing the new views write holds undefined, null, NaN or [object Object]',
  [sound('the page as built', () => newWords(impl()))],
  [broken('a county map that writes a count it does not have', 'writes NaN', () => newWords(impl({ render: transformed(renderView, (n) => (n.tag === 'title' ? { ...n, children: [`${String(Number('x'))} installers`] } : n)) })))]);
