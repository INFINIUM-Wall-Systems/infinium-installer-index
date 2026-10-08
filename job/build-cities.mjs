/**
 * Builds the city list of public\geo for city lookup (section 4.10 of docs\SPEC.md): one file for
 * each state, cities\<code>.json, for each of the 52 codes of public\geo\counties.json.
 *
 *   node job/build-cities.mjs
 *
 * Run by hand when the place list changes, never by the daily job. The source is
 * installer-application's public/data/places.json at commit a6fc6db: the application form's place
 * list (US Census Bureau 2024 Gazetteer places of 5,000 people or more). git show hands it over and
 * it is held in memory. The list holds its places as two lists of the same length: "names", and
 * "counties", the county id each place lies in, as public\geo\counties.json gives ids. A place's
 * state is its county's state in counties.json.
 *
 * Each city has:
 *   id        text: the state code, a hyphen, and the name in lower case with each run of
 *             characters other than a to z and 0 to 9 a single hyphen. A second city with the same
 *             id gets "-2" after it, a third "-3".
 *   name      as the place list writes it
 *   state     the two-letter code
 *   counties  its county ids, as text, in the order the place list gives them
 * A place whose county is not in counties.json is left out and counted. The cities are in order of
 * state, then name, then county id, one to a line, so a change shows as a changed line. Names,
 * codes and ids are all text in quotation marks: the files hold no number at all.
 *
 * Why one file for each state: as one file the list is over 400,000 bytes (step 3d of the page's
 * third prompt), so the page fetches only the files of the states that could match what is typed.
 * A state with no city in the list (Ontario: the list holds none) still has its file, with no city
 * in it, so the page never asks for a file that is not there.
 *
 * The same source always gives the same bytes. It prints counts, sizes and a SHA-256 only, never
 * a place's name.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareText } from './lib/order.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const GEO = join(ROOT, 'public', 'geo');
export const SOURCE = { repo: resolve(ROOT, '..', 'installer-application'), commit: 'a6fc6db', path: 'public/data/places.json' };
/** As one file over this many bytes, the list is split by state (step 3d of the page's third prompt). */
export const SPLIT_AT = 400000;

/** The place list, as git show hands it over at the commit. */
export function readSource() {
  const text = execFileSync('git', ['--no-optional-locks', '-C', SOURCE.repo, 'show', `${SOURCE.commit}:${SOURCE.path}`],
    { maxBuffer: 1 << 28 }).toString('utf8');
  return JSON.parse(text);
}

/** A city's id before a second of the same id is told apart: OH-cuyahoga-falls. */
export const cityId = (state, name) => `${state}-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const fileText = (head, cities) => {
  const lines = cities.map((c) => JSON.stringify(c));
  return `{"schema":1,${head}"cities":[${lines.length ? `\n${lines.join(',\n')}\n` : ''}]}\n`;
};

/**
 * The cities of a place list, against the county list:
 * { files, whole, cities, places, leftOut, repeated }. files: { 'cities/OH.json': text, ... },
 * one for each state of the county list; whole: the list as one file, to measure it; repeated: how
 * many ids were given a number after them.
 */
export function buildCities(source, countyList) {
  const names = Array.isArray(source.names) ? source.names : [];
  const counties = Array.isArray(source.counties) ? source.counties : [];
  if (names.length !== counties.length) throw new Error('the place list\'s names and counties are not the same length');
  const stateOf = new Map(countyList.counties.map((c) => [c.id, c.state]));
  const kept = [];
  let leftOut = 0;
  names.forEach((name, i) => {
    const ids = (Array.isArray(counties[i]) ? counties[i] : [counties[i]]).map(String).filter((id) => stateOf.has(id));
    const states = [...new Set(ids.map((id) => stateOf.get(id)))];
    if (typeof name !== 'string' || !name.trim() || !ids.length || states.length !== 1) { leftOut++; return; }
    kept.push({ name, state: states[0], counties: ids });
  });
  kept.sort((a, b) => compareText(a.state, b.state) || compareText(a.name, b.name) || compareText(a.counties.join(' '), b.counties.join(' ')));
  const seen = new Map();
  let repeated = 0;
  const cities = kept.map((c) => {
    const base = cityId(c.state, c.name);
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    if (n > 1) repeated++;
    return { id: n > 1 ? `${base}-${n}` : base, name: c.name, state: c.state, counties: c.counties };
  });
  const files = {};
  for (const s of [...countyList.states].sort((a, b) => compareText(a.code, b.code))) {
    files[`cities/${s.code}.json`] = fileText(`"state":${JSON.stringify(s.code)},`, cities.filter((c) => c.state === s.code));
  }
  return { files, whole: fileText('', cities), cities, places: names.length, leftOut, repeated };
}

function main() {
  const source = readSource();
  const countyList = JSON.parse(readFileSync(join(GEO, 'counties.json'), 'utf8'));
  const r = buildCities(source, countyList);
  console.log(`Source: ${SOURCE.path} at ${SOURCE.commit}; ${r.places} places.`);
  console.log(`Cities: ${r.cities.length}, in ${new Set(r.cities.map((c) => c.state)).size} states; left out, with no county in the county list: ${r.leftOut}; ids given a number after them: ${r.repeated}.`);
  console.log(`As one file the list would be ${Buffer.byteLength(r.whole)} bytes; over ${SPLIT_AT}, it is written as one file for each state.`);
  mkdirSync(join(GEO, 'cities'), { recursive: true });
  const all = createHash('sha256');
  const sizes = [];
  for (const [name, text] of Object.entries(r.files)) {
    writeFileSync(join(GEO, ...name.split('/')), text);
    all.update(`${name}\n${text}`);
    sizes.push([name, Buffer.byteLength(text)]);
  }
  const largest = sizes.reduce((m, x) => (x[1] > m[1] ? x : m));
  const empty = Object.entries(r.files).filter(([, t]) => t.endsWith('"cities":[]}\n')).length;
  console.log(`Wrote public/geo/cities/: ${sizes.length} files, ${sizes.reduce((n, [, b]) => n + b, 0)} bytes; the largest ${largest[0]}, ${largest[1]} bytes; ${empty} with no city.`);
  console.log(`SHA-256 of the files, names and texts in order: ${all.digest('hex')}.`);
  return 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) process.exitCode = main();
