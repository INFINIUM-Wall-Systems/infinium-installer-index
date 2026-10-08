/**
 * The location box (section 4.3.1 of docs\SPEC.md): what it offers as a place is typed, on Find
 * installers and, as "Change location", at the top of a place's view. It finds places, never
 * companies: a ZIP code, a state, a county or a city (section 4.10), and never an office city.
 *
 *   - Suggestions from the second letter, at most 10, each labeled with its kind.
 *   - Matching is from the start of any word of the name, as a phrase, capitals and accents
 *     aside, so typing the word "county" is not needed; a state also by its whole two-letter code.
 *     Five digits offer the ZIP and nothing else.
 *   - A state after the name narrows it: what is typed may end with a state's name or code, with
 *     or without a comma. "washington oh" and "Washington County, Ohio" offer only Ohio's.
 *   - Order: ZIP, then states, then counties, then cities; within each by name, then by state.
 *   - A county or city name used in several states is offered once for each state.
 *
 * The cities come from geo/cities/<code>.json, one file for each state (job\build-cities.mjs):
 * citiesNeeded says which a typed text needs, and suggest is handed those that have come.
 *
 * Nothing here touches a browser object, so node can load it and test it.
 */
import { h } from './html.js';
import { compareText } from './format.js';
import { countyName, stateName } from './data.js';
import { wordsOf } from './search.js';
import { cityHash, isZip, stateHash, zipHash } from './routes.js';

/** City lookup is built: step 3 of the page's third prompt found every place with its county. */
export const CITIES_BUILT = true;
export const MAX_SUGGESTIONS = 10;
export const MIN_TYPED = 2;
export const KIND_LABELS = Object.freeze({ zip: 'ZIP', state: 'State', county: 'County', city: 'City' });
const KIND_ORDER = ['zip', 'state', 'county', 'city'];
/** The hint under the box on Find installers. */
export const LOCATION_HINT = CITIES_BUILT ? 'ZIP code, county, state or city.' : 'ZIP code, county or state.';
export const MORE_LINE = 'More match. Add the state, as in Washington OH.';
export const noneLine = (typed) => `Nothing matches “${typed}”. Type a ZIP code, a county, a state${CITIES_BUILT ? ' or a city' : ''}.${CITIES_BUILT ? ' A small town may be missing from the list of cities: try its ZIP code.' : ''}`;

const isGroup = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** The folded words of a name, kept, since the same names are matched at every key. */
const kept = new Map();
function wordsIn(name) {
  let w = kept.get(name);
  if (!w) { w = wordsOf(name).map((x) => x.word); kept.set(name, w); }
  return w;
}

/** Whether typed words match a name as a phrase: words of the name that follow one another, each starting with the typed word in its place. */
function phrase(name, typed) {
  if (typeof name !== 'string' || !typed.length) return false;
  const words = wordsIn(name);
  for (let i = 0; i + typed.length <= words.length; i++) if (typed.every((t, j) => words[i + j].startsWith(t))) return true;
  return false;
}

/**
 * A state named at the end of what is typed, after something else: { rest, code }, or null. The
 * state is matched by its whole name or its whole code, word for word; the longest name wins.
 */
export function trailingState(model, typed) {
  const text = String(typed ?? '');
  const words = wordsOf(text);
  let best = null;
  for (const s of model.stateList) {
    for (const form of [wordsIn(String(s.name)), [String(s.code).toLowerCase()]]) {
      const n = form.length;
      if (!n || words.length <= n) continue;
      const tail = words.slice(-n).map((w) => w.word);
      if (tail.every((w, k) => w === form[k]) && (!best || n > best.n)) best = { n, code: s.code, start: words[words.length - n].start };
    }
  }
  if (!best) return null;
  const rest = text.slice(0, best.start).replace(/[\s,]+$/, '');
  return rest.trim() ? { rest, code: best.code } : null;
}

/** The states whose city files a typed text needs: the state it names at its end, or every state. */
export function citiesNeeded(model, typed) {
  const text = String(typed ?? '').trim();
  if (!CITIES_BUILT || text.length < MIN_TYPED || isZip(text)) return [];
  const tail = trailingState(model, text);
  return tail ? [tail.code] : model.stateList.map((s) => s.code);
}

/**
 * What the box offers for a typed text: { items, total, more, none }. items are at most 10, each
 * { kind, label, sub, href, state, id }. cities: { <code>: the doc of geo/cities/<code>.json },
 * those that have come.
 */
export function suggest(model, typed, cities = {}) {
  const text = String(typed ?? '').trim();
  if (text.length < MIN_TYPED) return { items: [], total: 0, more: false, none: false, short: true };
  if (isZip(text)) return { items: [{ kind: 'zip', label: text, sub: null, href: zipHash(text), state: null, id: text }], total: 1, more: false, none: false };
  const tries = [{ words: wordsOf(text).map((w) => w.word), code: null }];
  const tail = trailingState(model, text);
  if (tail) tries.push({ words: wordsOf(tail.rest).map((w) => w.word), code: tail.code });
  const fits = (name, code) => tries.some((t) => t.words.length && (t.code === null || t.code === code) && phrase(name, t.words));
  const found = [];
  for (const s of model.stateList) {
    const byCode = tries.some((t) => t.code === null && t.words.length === 1 && t.words[0] === String(s.code).toLowerCase());
    if (byCode || fits(s.name, s.code)) found.push({ kind: 'state', label: String(s.name), name: String(s.name), sub: null, href: stateHash(s.code), state: s.code, id: s.code });
  }
  for (const c of model.countyById.values()) {
    if (!model.stateNames.has(c.state) || !fits(c.name, c.state)) continue;
    const st = stateName(model, c.state);
    found.push({ kind: 'county', label: c.name === st ? st : `${c.name}, ${st}`, name: String(c.name), sub: null, href: stateHash(c.state, c.id), state: c.state, id: c.id });
  }
  if (CITIES_BUILT) {
    for (const doc of Object.values(cities)) {
      if (!isGroup(doc) || !Array.isArray(doc.cities)) continue;
      for (const city of doc.cities) {
        if (!isGroup(city) || typeof city.id !== 'string' || !model.stateNames.has(city.state) || !fits(city.name, city.state)) continue;
        const counties = Array.isArray(city.counties) ? city.counties : [];
        found.push({ kind: 'city', label: `${city.name}, ${stateName(model, city.state)}`, name: String(city.name),
          sub: counties.map((id) => countyName(model, id)).join(' and ') || null, href: cityHash(city.id), state: city.state, id: city.id });
      }
    }
  }
  found.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || compareText(a.name, b.name)
    || compareText(stateName(model, a.state), stateName(model, b.state)) || compareText(a.id, b.id));
  return { items: found.slice(0, MAX_SUGGESTIONS), total: found.length, more: found.length > MAX_SUGGESTIONS, none: found.length === 0 };
}

/** What a screen reader hears as the suggestions change. */
export function suggestionStatus(r) {
  if (r.short) return '';
  if (r.none) return 'No place matches.';
  if (r.more) return `More than ${MAX_SUGGESTIONS} places match; the first ${MAX_SUGGESTIONS} are listed.`;
  return r.total === 1 ? '1 place matches.' : `${r.total} places match.`;
}

/** The list under the box, as a tree of elements. */
export function suggestionTree(r, typed) {
  if (r.short) return [];
  if (r.none) return h('p', { class: 'loc-none' }, noneLine(String(typed ?? '').trim()));
  return [
    h('ul', { class: 'loc-items' }, r.items.map((s) => h('li', {},
      h('a', { class: 'loc-item', href: s.href, 'data-kind': s.kind, 'data-place': s.id },
        h('span', { class: 'loc-name' }, s.label, s.sub ? h('span', { class: 'loc-sub' }, ` · ${s.sub}`) : null),
        h('span', { class: 'loc-kind' }, KIND_LABELS[s.kind]))))),
    r.more ? h('p', { class: 'loc-more' }, MORE_LINE) : null,
  ].filter(Boolean);
}
