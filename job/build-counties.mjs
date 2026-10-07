/**
 * Builds public\geo\counties.json, the county list of section 3.6 of docs\SPEC.md.
 *
 *   node job/build-counties.mjs <path to counties.meta.json>
 *
 * The source is installer-application's public/data/counties.meta.json at commit a6fc6db,
 * read with git show (--no-optional-locks) and saved to a temporary folder first; this
 * script reads only the file it is given and writes only public\geo\counties.json.
 *
 * The source holds the boundary file names (us_vintage, ca_vintage) and "counties", an object
 * from county id to [name, state, country]. It writes states as two-letter codes, ON for
 * Ontario, and countries as US and CA. A state the script does not know stops it.
 *
 * The same input always gives the same bytes: states in order of code, counties one to a line
 * in order of id, both by the fixed text order of job\lib\order.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareText } from './lib/order.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const COUNTIES_PATH = resolve(ROOT, 'public', 'geo', 'counties.json');

/** The 50 states, the District of Columbia and Ontario: code, name, country. */
export const STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'],
  ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'],
  ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'],
  ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
].map(([code, name]) => ({ code, name, country: 'US' })).concat([{ code: 'ON', name: 'Ontario', country: 'CA' }]);

/** The boundary files' names, used when the source names none. */
const DEFAULT_BOUNDARIES = ['cb_2025_us_county_500k', 'lcd_000a21a_e'];

/** The text of counties.json, built from the parsed source. */
export function buildCounties(source) {
  const byCode = new Map(STATES.map((s) => [s.code, s]));
  const entries = Object.entries(source.counties || {});
  if (!entries.length) throw new Error('the source holds no counties');
  const counties = entries.map(([id, v]) => {
    if (!Array.isArray(v) || v.length < 3) throw new Error(`county ${id}: not [name, state, country]`);
    const [name, state, country] = v.map((x) => String(x).trim());
    const known = byCode.get(state);
    if (!known) throw new Error(`county ${id}: state ${state} is not one of the 52`);
    if (known.country !== country) throw new Error(`county ${id}: country ${country} does not go with ${state}`);
    if (!name) throw new Error(`county ${id}: no name`);
    return { id: String(id), name, state, country };
  }).sort((a, b) => compareText(a.id, b.id));
  const used = new Set(counties.map((c) => c.state));
  const states = STATES.filter((s) => used.has(s.code)).sort((a, b) => compareText(a.code, b.code));
  const named = [source.us_vintage, source.ca_vintage].filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim());
  const boundaryVersions = named.length ? named : DEFAULT_BOUNDARIES;
  return `{"schema":1,"boundaryVersions":${JSON.stringify(boundaryVersions)},"states":[\n`
    + `${states.map((s) => JSON.stringify(s)).join(',\n')}\n],"counties":[\n`
    + `${counties.map((c) => JSON.stringify(c)).join(',\n')}\n]}\n`;
}

function main() {
  const from = process.argv[2];
  if (!from) {
    console.log('Give the path of counties.meta.json.');
    return 2;
  }
  const text = buildCounties(JSON.parse(readFileSync(from, 'utf8').replace(/^﻿/, '')));
  writeFileSync(COUNTIES_PATH, text);
  const doc = JSON.parse(text);
  const us = doc.counties.filter((c) => c.country === 'US').length;
  console.log(`Wrote public/geo/counties.json: ${Buffer.byteLength(text)} bytes; ${doc.counties.length} counties, `
    + `${us} in the United States and ${doc.counties.length - us} in Ontario; ${doc.states.length} states; `
    + `${doc.counties.filter((c) => c.id.startsWith('0')).length} ids begin with a zero; `
    + `${doc.counties.filter((c) => typeof c.id === 'string').length} ids are text; `
    + `${doc.counties.filter((c) => /\bCounty\b/.test(c.name)).length} names carry the word County; `
    + `boundary files ${doc.boundaryVersions.join(', ')}.`);
  return 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) process.exitCode = main();
