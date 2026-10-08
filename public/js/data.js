/**
 * Reading the four files the page shows: data/build.json, data/installers.json and
 * data/territory.json, which the daily job writes, and geo/counties.json, the county list.
 * Section 3.6 of docs\SPEC.md gives their shape. Each must read as JSON and carry "schema": 1;
 * otherwise the page says the data could not be loaded and draws no list.
 *
 * What territory means on the page is worked out here, once (section 4.0): an installer's
 * territory is the counties it chose as Tier 1, its Tier 2 counties are where it is available for
 * travel, and a place's lists, counts and map shades hold only the statuses LISTED names. The
 * files themselves do not change; this is worked out from what they carry.
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

/** The five record statuses, in QuickBase's order. The only place in the page's code that writes them. */
export const STATUS = Object.freeze({
  confirmed: 'CONFIRMED BY PARTNER',
  dormant: 'DORMANT - NO RESPONSE',
  inactive: 'INACTIVE',
  pending: 'PENDING - UPDATE EXPECTED',
  held: 'HELD - BUSINESS DECISION',
});
export const STATUS_ORDER = Object.freeze([STATUS.confirmed, STATUS.dormant, STATUS.inactive, STATUS.pending, STATUS.held]);
/** The statuses a place's lists, counts and map shades hold (section 4.0), and All installers with no box ticked (4.7). */
export const LISTED = Object.freeze([STATUS.confirmed, STATUS.pending]);
/** The statuses the box "Inactive or on hold" adds; never in a place's view (4.4). */
export const ON_HOLD = Object.freeze([STATUS.inactive, STATUS.held]);

const isGroup = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v : []);

export const isListed = (i) => LISTED.includes(i.status);
export const isDormant = (i) => i.status === STATUS.dormant;
export const isOnHold = (i) => ON_HOLD.includes(i.status);
export const isConfirmed = (i) => i.status === STATUS.confirmed;
export const isPending = (i) => i.status === STATUS.pending;
/** Whether an installer has a county on the map at either tier. One with none is "not on the map". */
export const hasCounties = (i) => isGroup(i.territory);

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

  // Which counties each installer covers in each state, at each tier, and who covers each
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
  // Each state's counties, in the order of the county list.
  const countiesByState = new Map(stateList.map((s) => [s.code, []]));
  for (const c of countyById.values()) if (countiesByState.has(c.state)) countiesByState.get(c.state).push(c);

  // Territory is Tier 1, and a place counts only the LISTED statuses (section 4.0): how many
  // such installers have territory in each state, and have each county as Tier 1.
  const listed = new Set(installers.filter(isListed).map((i) => i.id));
  const stateCounts = new Map(stateList.map((s) => [s.code, 0]));
  const countyTier1 = new Map();
  for (const [id, states] of coverage) {
    if (!listed.has(id)) continue;
    for (const [code, c] of states) {
      if (c.tier1.length && stateCounts.has(code)) stateCounts.set(code, stateCounts.get(code) + 1);
      for (const county of c.tier1) countyTier1.set(county, (countyTier1.get(county) || 0) + 1);
    }
  }
  // Each installer's counties in all, at each tier.
  const totals = new Map();
  for (const [id, states] of coverage) {
    let t1 = 0;
    let t2 = 0;
    for (const c of states.values()) { t1 += c.tier1.length; t2 += c.tier2.length; }
    totals.set(id, { tier1: t1, tier2: t2 });
  }
  const position = new Map(installers.map((i, k) => [i.id, k]));
  return { build, installers, territoryStates, stateList, stateNames, countyById, byId, coverage, countyServers, countiesByState,
    stateCounts, countyTier1, totals, position };
}

/** How many installers have a county as territory: Tier 1, LISTED statuses (section 4.0). */
export function countyCount(model, countyId) {
  return model.countyTier1.get(countyId) || 0;
}

/** An installer's counties in all, at each tier: { tier1, tier2 }. */
export function totalsOf(model, installer) {
  return model.totals.get(installer.id) || { tier1: 0, tier2: 0 };
}

/** The states where an installer has Tier 1 counties, in the order of installers.json's territory. */
export function tier1States(model, installer) {
  const mine = model.coverage.get(installer.id);
  if (!mine || !hasCounties(installer)) return [];
  return list(installer.territory.states).filter(isGroup).map((s) => s.state).filter((code) => mine.has(code) && mine.get(code).tier1.length > 0);
}

/** A place's name as a heading says it: "Summit County, Ohio"; a county named as its state is said once. */
export function placeName(model, code, countyId = null) {
  const state = stateName(model, code);
  if (!countyId) return state;
  const c = model.countyById.get(countyId);
  const county = c && typeof c.name === 'string' ? c.name : String(countyId);
  return county === state ? state : `${county}, ${state}`;
}

/** A county's own name, or its id when the county list does not hold it. */
export function countyName(model, countyId) {
  const c = model.countyById.get(countyId);
  return c && typeof c.name === 'string' ? c.name : String(countyId);
}

/** A state's name from the county list, or the code itself when the list does not hold it. */
export function stateName(model, code) {
  return model.stateNames.get(code) ?? code;
}

/** Whether an office state, as QuickBase writes it, is a state: by its code or its name. */
export function officeStateIs(model, officeState, code) {
  if (typeof officeState !== 'string') return false;
  const s = officeState.trim().toLowerCase();
  return s === code.toLowerCase() || s === String(stateName(model, code)).toLowerCase();
}

/**
 * The counties an installer covers in one state, by name, Tier 1 then Tier 2: { tier1, tier2 },
 * each a list of names in the fixed order of section 3.6. A county the county list does not
 * hold is shown by its id.
 */
export function countiesIn(model, installerId, state) {
  const mine = model.coverage.get(installerId);
  const ids = (mine && mine.get(state)) || { tier1: [], tier2: [] };
  const names = (list2) => list2.map((id) => countyName(model, id)).sort(compareText);
  return { tier1: names(ids.tier1), tier2: names(ids.tier2) };
}

/**
 * The installers for a place (sections 4.0 and 4.4), each list in the order of the file:
 *   tier1    LISTED installers with at least one of the place's counties as Tier 1
 *   tier2    LISTED installers with one of them as Tier 2 and none as Tier 1
 *   dormant  DORMANT - NO RESPONSE installers with the place at either tier
 *   offMap   installers with no county at either tier whose office is in one of the place's
 *            states, other than INACTIVE and HELD - BUSINESS DECISION
 * A place is a state ({ state }) or one or more counties ({ state, counties }); state is the
 * state whose counts the tier line gives. Each entry of the first three is
 * { installer, tier, t1, t2, t1In, t2In }: its best tier for the place; its counties in the state
 * at each tier; and, for counties, which of them it has at each tier.
 */
export function placeLists(model, { state, counties = null }) {
  const sets = counties ? counties.map((id) => {
    const s = model.countyServers.get(id) || { tier1: [], tier2: [] };
    return { id, t1: new Set(s.tier1), t2: new Set(s.tier2) };
  }) : null;
  const entries = model.installers.map((installer) => {
    const mine = model.coverage.get(installer.id);
    const st = (mine && mine.get(state)) || { tier1: [], tier2: [] };
    const t1In = [];
    const t2In = [];
    if (sets) for (const s of sets) { if (s.t1.has(installer.id)) t1In.push(s.id); else if (s.t2.has(installer.id)) t2In.push(s.id); }
    const tier = sets ? (t1In.length ? 1 : t2In.length ? 2 : 0) : (st.tier1.length ? 1 : st.tier2.length ? 2 : 0);
    return { installer, tier, t1: st.tier1.length, t2: st.tier2.length, t1In, t2In };
  });
  const states = sets ? [...new Set(counties.map((id) => (model.countyById.get(id) || {}).state).filter(Boolean))] : [state];
  return {
    tier1: entries.filter((e) => e.tier === 1 && isListed(e.installer)),
    tier2: entries.filter((e) => e.tier === 2 && isListed(e.installer)),
    dormant: entries.filter((e) => e.tier > 0 && isDormant(e.installer)),
    offMap: model.installers.filter((i) => !hasCounties(i) && !isOnHold(i)
      && states.some((code) => officeStateIs(model, isGroup(i.office) ? i.office.state : undefined, code))),
    states,
  };
}

/* ---------------------------------------------------------------- files a view asks for when it needs them */

/** The Home map, a state's county map, the ZIP file for a ZIP code's first digit, and a state's city file. */
export const HOME_MAP = 'geo/states-map.json';
export const countyMapPath = (code) => `geo/counties/${code}.json`;
export const zipPath = (zip) => `geo/zips/${String(zip)[0]}.json`;
export const cityPath = (code) => `geo/cities/${code}.json`;

/** Fetches one of those files: { state: 'ok', doc }, or { state: 'failed' } when it is missing, not JSON, or not schema 1. */
export async function loadExtra(fetchText, path) {
  try {
    const doc = JSON.parse(await fetchText(path));
    return isGroup(doc) && doc.schema === 1 ? { state: 'ok', doc } : { state: 'failed' };
  } catch {
    return { state: 'failed' };
  }
}

/** The installers with no county on the map at either tier, in the order of the file. */
export function notOnTheMap(model) {
  return model.installers.filter((i) => !hasCounties(i));
}
