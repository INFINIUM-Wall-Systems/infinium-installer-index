/**
 * Reading the four files the page shows: data/build.json, data/installers.json and
 * data/territory.json, which the daily job writes, and geo/counties.json, the county list.
 * Section 3.6 of docs\SPEC.md gives their shape. Each must read as JSON and carry "schema": 1;
 * otherwise the page says the data could not be loaded and draws no list.
 *
 * loadData is handed a function that fetches a file's text by its address relative to the
 * page, so that node can test it with made-up files. Nothing else here touches a browser object.
 */
import { builtAtMs, compareText } from './format.js';

/** The four files, by the address relative to the page. */
export const FILES = Object.freeze({
  build: 'data/build.json',
  installers: 'data/installers.json',
  territory: 'data/territory.json',
  counties: 'geo/counties.json',
});

const isGroup = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v : []);

/** Fetches the four files and reads them: { ok: true, model } or { ok: false, problem }. */
export async function loadData(fetchText) {
  const texts = {};
  const missing = [];
  await Promise.all(Object.entries(FILES).map(async ([key, path]) => {
    try {
      const text = await fetchText(path);
      if (typeof text !== 'string') throw new TypeError('not text');
      texts[key] = text;
    } catch {
      missing.push(path);
    }
  }));
  if (missing.length) return { ok: false, problem: `could not be fetched: ${missing.sort(compareText).join(', ')}` };
  return readData(texts);
}

/** Reads the four files' texts ({ build, installers, territory, counties }): { ok: true, model } or { ok: false, problem }. */
export function readData(texts) {
  const doc = {};
  for (const [key, path] of Object.entries(FILES)) {
    try {
      doc[key] = JSON.parse(texts[key]);
    } catch {
      return { ok: false, problem: `${path} does not read as JSON` };
    }
    if (!isGroup(doc[key]) || doc[key].schema !== 1) return { ok: false, problem: `${path} does not carry schema 1` };
  }
  const { build, installers, territory, counties } = doc;
  if (!Array.isArray(installers.installers) || !installers.installers.every(isGroup)) return { ok: false, problem: 'data/installers.json holds no list of installers' };
  if (!Array.isArray(territory.states)) return { ok: false, problem: 'data/territory.json holds no list of states' };
  if (!Array.isArray(counties.counties) || !Array.isArray(counties.states)) return { ok: false, problem: 'geo/counties.json holds no county list' };
  if (Number.isNaN(builtAtMs(build.builtAt)) || !isGroup(build.counts) || !isGroup(build.gaps) || !Array.isArray(build.checks)) {
    return { ok: false, problem: 'data/build.json is not as section 3.6 gives it' };
  }
  return { ok: true, model: makeModel(build, installers.installers, territory.states, counties) };
}

/** What the views work from. installers stays in the order of the file. */
export function makeModel(build, installers, territoryStates, counties) {
  const stateList = list(counties.states).filter(isGroup);
  const stateNames = new Map(stateList.map((s) => [s.code, s.name]));
  const countyById = new Map(list(counties.counties).filter(isGroup).map((c) => [c.id, c]));
  const byId = new Map();
  for (const i of installers) if (typeof i.id === 'string' && !byId.has(i.id)) byId.set(i.id, i);

  // Which counties each installer covers in each state, at each tier, and who serves each
  // county at each tier, from territory.json.
  const coverage = new Map();
  const countyServers = new Map();
  for (const state of territoryStates) {
    if (!isGroup(state)) continue;
    for (const county of list(state.counties)) {
      if (!isGroup(county)) continue;
      countyServers.set(county.id, { tier1: list(county.tier1Installers).slice(), tier2: list(county.tier2Installers).slice() });
      for (const [tier, ids] of [['tier1', county.tier1Installers], ['tier2', county.tier2Installers]]) {
        for (const id of list(ids)) {
          if (!coverage.has(id)) coverage.set(id, new Map());
          const mine = coverage.get(id);
          if (!mine.has(state.state)) mine.set(state.state, { tier1: [], tier2: [] });
          mine.get(state.state)[tier].push(county.id);
        }
      }
    }
  }
  // Each state's counties, in the order of the county list; and how many installers have
  // territory in each state.
  const countiesByState = new Map(stateList.map((s) => [s.code, []]));
  for (const c of countyById.values()) if (countiesByState.has(c.state)) countiesByState.get(c.state).push(c);
  const stateCounts = new Map(stateList.map((s) => [s.code, 0]));
  for (const i of installers) {
    if (!isGroup(i.territory)) continue;
    for (const code of new Set(list(i.territory.states).filter(isGroup).map((s) => s.state))) {
      if (stateCounts.has(code)) stateCounts.set(code, stateCounts.get(code) + 1);
    }
  }
  const position = new Map(installers.map((i, k) => [i.id, k]));
  return { build, installers, territoryStates, stateList, stateNames, countyById, byId, coverage, countyServers, countiesByState,
    stateCounts, position };
}

/** How many installers serve a county, at either tier. */
export function countyCount(model, countyId) {
  const s = model.countyServers.get(countyId);
  return s ? new Set([...s.tier1, ...s.tier2]).size : 0;
}

/** A place's name as a heading says it: "Summit County, Ohio"; a county named as its state is said once. */
export function placeName(model, code, countyId = null) {
  const state = stateName(model, code);
  if (!countyId) return state;
  const c = model.countyById.get(countyId);
  const county = c && typeof c.name === 'string' ? c.name : String(countyId);
  return county === state ? state : `${county}, ${state}`;
}

/** A state's name from the county list, or the code itself when the list does not hold it. */
export function stateName(model, code) {
  return model.stateNames.get(code) ?? code;
}

/**
 * The counties an installer covers in one state, by name, Tier 1 then Tier 2: { tier1, tier2 },
 * each a list of names in the fixed order of section 3.6. A county the county list does not
 * hold is shown by its id.
 */
export function countiesIn(model, installerId, state) {
  const mine = model.coverage.get(installerId);
  const ids = (mine && mine.get(state)) || { tier1: [], tier2: [] };
  const names = (list2) => list2.map((id) => {
    const c = model.countyById.get(id);
    return c && typeof c.name === 'string' ? c.name : String(id);
  }).sort(compareText);
  return { tier1: names(ids.tier1), tier2: names(ids.tier2) };
}

/* ---------------------------------------------------------------- files a view asks for when it needs them */

/** The Home map, a state's county map, and the ZIP file for a ZIP code's first digit. */
export const HOME_MAP = 'geo/states-map.json';
export const countyMapPath = (code) => `geo/counties/${code}.json`;
export const zipPath = (zip) => `geo/zips/${String(zip)[0]}.json`;

/** Fetches one of those files: { state: 'ok', doc }, or { state: 'failed' } when it is missing, not JSON, or not schema 1. */
export async function loadExtra(fetchText, path) {
  try {
    const doc = JSON.parse(await fetchText(path));
    return isGroup(doc) && doc.schema === 1 ? { state: 'ok', doc } : { state: 'failed' };
  } catch {
    return { state: 'failed' };
  }
}

/** The installers with no territory, in the order of the file. */
export function notOnTheMap(model) {
  return model.installers.filter((i) => !isGroup(i.territory));
}
