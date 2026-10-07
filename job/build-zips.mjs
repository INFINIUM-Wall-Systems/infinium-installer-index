/**
 * Builds the ZIP list of public\geo: zips\0.json to zips\9.json, split by a ZIP code's first
 * digit, so that the page loads only the one it needs.
 *
 *   node job/build-zips.mjs [path to zip-to-county.csv]
 *
 * Run by hand when the list changes, never by the daily job. The source is coverage-map's
 * data\geo\zip-to-county.csv, read where it lies (the path beside this repository unless another
 * is given): the US Census Bureau's 2020 ZIP Code Tabulation Area to county relationship file,
 * with Connecticut rebuilt to the planning regions the county list uses. One row for each pair
 * of a ZIP code and a county it touches, with the share of the ZIP's land in that county. The
 * columns are read by name, and a field may stand in quotation marks; an empty share counts as
 * nothing.
 *
 * For each ZIP: the ids of its counties, largest share first, then by id. A ZIP none of whose
 * counties is in public\geo\counties.json is marked outside the map and carries no county; a ZIP
 * with some counties in the list and some not carries those in the list. ZIP codes and county
 * ids are text. ZIPs are written in order of code, one to a line.
 *
 * The same source always gives the same bytes. It prints counts and sizes only.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareText } from './lib/order.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const GEO = join(ROOT, 'public', 'geo');
export const DEFAULT_SOURCE = resolve(ROOT, '..', 'coverage-map', 'data', 'geo', 'zip-to-county.csv');
export const COLUMNS = ['zip', 'county_fips', 'county_name', 'state', 'land_area_m2', 'water_area_m2', 'land_area_share'];

/** The fields of one line of comma-separated text; a field may stand in quotation marks. */
export function fieldsOf(line) {
  const out = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let v = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { v += '"'; i += 2; } else if (line[i] === '"') { i++; break; } else { v += line[i]; i++; }
      }
      out.push(v);
      i++; // the comma
    } else {
      const end = line.indexOf(',', i);
      out.push(end < 0 ? line.slice(i) : line.slice(i, end));
      i = end < 0 ? line.length + 1 : end + 1;
    }
  }
  return out;
}

/** The rows of the source: [{ zip, county, share }], and counts. */
export function readRows(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.length);
  const head = fieldsOf(lines[0]).map((h) => h.trim());
  const at = Object.fromEntries(COLUMNS.map((c) => [c, head.indexOf(c)]));
  const missing = COLUMNS.filter((c) => at[c] < 0);
  if (missing.length) throw new Error(`the source has no column ${missing.join(', ')}`);
  const rows = lines.slice(1).map((l) => {
    const f = fieldsOf(l);
    const share = Number.parseFloat(f[at.land_area_share]);
    return { zip: f[at.zip].trim(), county: f[at.county_fips].trim(), share: Number.isFinite(share) ? share : 0 };
  });
  for (const r of rows) {
    if (!/^\d{5}$/.test(r.zip)) throw new Error('a ZIP code is not five digits');
    if (!/^\d{5}$/.test(r.county)) throw new Error('a county code is not five digits');
  }
  return rows;
}

/** The ten files, as { 'zips/0.json': text, ... }, and counts. */
export function buildZips(rows, countyList) {
  const listed = new Set(countyList.counties.map((c) => c.id));
  const byZip = new Map();
  for (const r of rows) {
    if (!byZip.has(r.zip)) byZip.set(r.zip, []);
    byZip.get(r.zip).push(r);
  }
  const zips = [...byZip.keys()].sort(compareText);
  const files = {};
  const outside = {};
  let partly = 0;
  for (let d = 0; d <= 9; d++) {
    const digit = String(d);
    outside[digit] = 0;
    const lines = zips.filter((z) => z[0] === digit).map((zip) => {
      const all = byZip.get(zip);
      const shares = new Map();
      for (const r of all) shares.set(r.county, (shares.get(r.county) || 0) + r.share);
      const ids = [...shares.keys()].sort((a, b) => shares.get(b) - shares.get(a) || compareText(a, b));
      const kept = ids.filter((id) => listed.has(id));
      if (!kept.length) { outside[digit]++; return JSON.stringify({ zip, outside: true }); }
      if (kept.length < ids.length) partly++;
      return JSON.stringify({ zip, counties: kept });
    });
    files[`zips/${digit}.json`] = `{"schema":1,"digit":${JSON.stringify(digit)},"zips":[${lines.length ? `\n${lines.join(',\n')}\n` : ''}]}\n`;
  }
  const codes = [...new Set(rows.map((r) => r.county))];
  return { files, zips: zips.length, codes: codes.length, codesListed: codes.filter((c) => listed.has(c)).length, outside, partly,
    connecticutOutside: zips.filter((z) => z.startsWith('06') && !byZip.get(z).some((r) => listed.has(r.county))).length };
}

function main() {
  const from = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_SOURCE;
  const raw = readFileSync(from);
  const rows = readRows(raw.toString('utf8'));
  const countyList = JSON.parse(readFileSync(join(GEO, 'counties.json'), 'utf8'));
  const r = buildZips(rows, countyList);
  mkdirSync(join(GEO, 'zips'), { recursive: true });
  for (const [name, text] of Object.entries(r.files)) writeFileSync(join(GEO, ...name.split('/')), text);
  const sizes = Object.entries(r.files).map(([name, text]) => [name, Buffer.byteLength(text)]);
  const largest = sizes.reduce((m, x) => (x[1] > m[1] ? x : m));
  console.log(`Source: ${raw.length} bytes; ${rows.length} rows; ${r.zips} ZIP codes; ${r.codes} county codes, ${r.codesListed} of them in the county list.`);
  console.log(`ZIP codes outside the map, by first digit: ${Object.entries(r.outside).map(([d, n]) => `${d}: ${n}`).join('; ')}; beginning 06: ${r.connecticutOutside}.`);
  console.log(`ZIP codes with some counties in the list and some not: ${r.partly}.`);
  console.log(`Wrote public/geo/zips/: ${sizes.length} files, ${sizes.reduce((n, [, b]) => n + b, 0)} bytes; the largest ${largest[0]}, ${largest[1]} bytes.`);
  return 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) process.exitCode = main();
