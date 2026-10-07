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
import { ROOT } from './page-standins.mjs';

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
