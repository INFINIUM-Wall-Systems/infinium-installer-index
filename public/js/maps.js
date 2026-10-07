/**
 * The maps, drawn by the page itself as plain SVG from the files of public\geo: the Home map of
 * the states and Ontario (geo/states-map.json) and each state's county map
 * (geo/counties/<code>.json). No map library and no map tiles. Each state and each county is a
 * link with its own address, so a click, the Enter key and a pasted address all do the same
 * thing.
 *
 * A map is part of a view's markup: plain functions that take the data and a shape file and
 * give back a tree of elements (html.js). Inside an svg only SVG's own elements are used. Two
 * empty paths at the end of each map are where app.js draws the border and the green ring of the
 * shape under the pointer or the focus, last, so that no neighbour hides them.
 *
 * Nothing here touches a browser object, so node can load it and test it.
 */
import { h } from './html.js';
import * as F from './format.js';
import { countyCount, stateName } from './data.js';
import { stateHash } from './routes.js';

/** The five steps of shading, the old page's, and none. */
export const STEPS = [
  { step: 1, from: 1, to: 1, label: '1' },
  { step: 2, from: 2, to: 3, label: '2 to 3' },
  { step: 3, from: 4, to: 6, label: '4 to 6' },
  { step: 4, from: 7, to: 10, label: '7 to 10' },
  { step: 5, from: 11, to: Infinity, label: '11 or more' },
];

/** The step of a number of installers: 0 for none, then 1 to 5. */
export function shadeStep(n) {
  if (!(n > 0)) return 0;
  return STEPS.find((s) => n >= s.from && n <= s.to).step;
}

/** "3 installers", "1 installer", "no installer". */
export const installersWord = (n) => (n > 0 ? F.plural(n, 'installer', 'installers') : 'no installer');

const isGroup = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const goodNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Whether a Home map file holds what the page draws. */
export function homeMapUsable(doc) {
  return isGroup(doc) && goodNumber(doc.width) && goodNumber(doc.height) && Array.isArray(doc.states)
    && doc.states.every((s) => isGroup(s) && typeof s.code === 'string' && typeof s.path === 'string');
}

/** Whether a county map file holds what the page draws, for that state. */
export function countyMapUsable(doc, code) {
  return isGroup(doc) && doc.state === code && goodNumber(doc.width) && goodNumber(doc.height) && Array.isArray(doc.counties)
    && doc.counties.every((c) => isGroup(c) && typeof c.id === 'string' && typeof c.path === 'string');
}

/** The two paths app.js fills in for the shape under the pointer or the focus. */
const overlays = () => [h('path', { class: 'map-ring', d: '' }), h('path', { class: 'map-hover', d: '' })];

/** The Home map: each state shaded by how many installers have territory in it, and a link to its view. */
export function homeMap(model, doc) {
  const size = goodNumber(doc.labelSize) ? doc.labelSize : 130;
  return h('svg', { class: 'map map-home', viewBox: `0 0 ${doc.width} ${doc.height}`, role: 'group', 'aria-label': 'Map of the United States and Ontario', 'data-width': doc.width },
    doc.states.map((s) => {
      const n = model.stateCounts.get(s.code) ?? 0;
      const step = shadeStep(n);
      const label = `${stateName(model, s.code)}: ${installersWord(n)}`;
      const fits = s.fits === true && Array.isArray(s.label) && s.label.length === 2;
      return h('a', { href: stateHash(s.code), class: 'map-link', 'data-shape': s.code, 'data-step': step, 'data-count': n, 'aria-label': label },
        h('title', {}, label),
        h('path', { class: `shade shade-${step}`, d: s.path }),
        fits ? h('text', { class: `code${step === 5 ? ' code-light' : ''}`, x: s.label[0], y: s.label[1], 'font-size': size, 'aria-hidden': 'true' }, s.code) : null);
    }),
    overlays());
}

/**
 * A state's county map: each county shaded by how many installers serve it, and a link to the
 * state with that county chosen. The chosen county is marked, and its outline is drawn again,
 * heavy, over the map last: not a link, so the order of Tab does not change.
 */
export function countyMap(model, code, doc, chosen = null) {
  const chosenShape = chosen ? doc.counties.find((c) => c.id === chosen) : null;
  return h('svg', { class: 'map map-county', viewBox: `0 0 ${doc.width} ${doc.height}`, role: 'group', 'aria-label': `Map of the counties of ${stateName(model, code)}`, 'data-width': doc.width },
    doc.counties.map((c) => {
      const n = countyCount(model, c.id);
      const step = shadeStep(n);
      const county = model.countyById.get(c.id);
      const label = `${county ? county.name : c.id}: ${installersWord(n)}`;
      return h('a', { href: stateHash(code, c.id), class: 'map-link', 'data-shape': c.id, 'data-step': step, 'data-count': n,
        'aria-label': label, 'aria-current': c.id === chosen ? 'true' : null },
      h('title', {}, label),
      h('path', { class: `shade shade-${step}${c.id === chosen ? ' chosen' : ''}`, d: c.path }));
    }),
    chosenShape ? h('path', { class: 'chosen-outline', d: chosenShape.path, 'data-chosen': chosen }) : null,
    overlays());
}

/** The legend of the five steps and none. */
export function legend(title) {
  return h('div', { class: 'legend' },
    h('p', { class: 'legend-title' }, title),
    h('ul', { class: 'legend-steps' },
      [{ step: 0, label: 'None' }, ...STEPS].map((s) => h('li', { 'data-step': s.step },
        h('span', { class: `swatch swatch-${s.step}`, 'aria-hidden': 'true' }), s.label))));
}

/**
 * The counties of a state whose name has a word that starts with what is typed, capitals aside:
 * [{ id, name, href }], by name, at most `limit`. The address is the county's link's address.
 */
export function countySuggestions(model, code, typed, limit = 12) {
  const t = String(typed ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return [];
  const starts = (name) => {
    const n = name.toLowerCase();
    for (let k = 0; k < n.length; k++) if ((k === 0 || !/[\p{L}\p{N}]/u.test(n[k - 1])) && n.startsWith(t, k)) return true;
    return false;
  };
  return (model.countiesByState.get(code) || []).filter((c) => typeof c.name === 'string' && starts(c.name))
    .sort((a, b) => F.compareText(a.name, b.name)).slice(0, limit)
    .map((c) => ({ id: c.id, name: c.name, href: stateHash(code, c.id) }));
}

/** The list the county box offers. */
export function suggestionList(model, code, typed) {
  const list = countySuggestions(model, code, typed);
  if (!String(typed ?? '').trim()) return [];
  if (!list.length) return h('p', { class: 'suggest-none' }, 'No county of that name.');
  return h('ul', { class: 'suggest-list' }, list.map((c) => h('li', {}, h('a', { href: c.href, 'data-county': c.id }, c.name))));
}
