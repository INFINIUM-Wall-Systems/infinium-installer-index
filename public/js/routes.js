/**
 * The addresses of the views (section 4.1 of docs\SPEC.md), written after a # so that any host
 * serves them with no settings:
 *
 *   #/                              Find installers
 *   #/state/<code>                  a state, by its two-letter code; ON for Ontario
 *   #/state/<code>?county=<id>      that state with one county chosen
 *   #/zip/<five digits>             a ZIP code
 *   #/city/<id>                     a city (section 4.10)
 *   #/installer/<installer id>      one installer
 *   #/installers                    All installers
 *   #/about                         About this data
 *
 * Choices ride on the address as ? items, written in this order: on a state's view county; then
 * view (est, pm or rec); then for All installers q, office, territory, dormant=1, inactive=1 and
 * map=off; and on an Installer view from, the place it was opened from, written as the place's
 * own address without its #, encoded. An item that is not one of these, or a value that does not
 * fit it, gives the not-found view.
 *
 * Old addresses keep working: #/search?q=<text> opens #/installers?q=<text>, and five digits the
 * ZIP's address; #/not-on-the-map opens #/installers?dormant=1&inactive=1&map=off;
 * #/installers?set=rates and ?set=contact open All installers in the Estimating view;
 * #/installers?status=<status> opens All installers with the box that status needs ticked. Such a
 * route carries old: true, and app.js puts its new address in place of the old in the browser's
 * history.
 *
 * parseHash turns an address into a route; toHash turns a route back into its address, so that
 * every address gives its view and the view gives back the same address. An address that names
 * no view is the route { view: 'notFound' }. Whether a state, a county, a city or an installer is
 * in the data is the views' to say.
 *
 * Nothing here touches a browser object, so node can load it and test it.
 */
import { ON_HOLD, STATUS, STATUS_ORDER } from './data.js';

/** The three views of the view switch (section 4.2), by the value view= takes. */
export const MODES = Object.freeze(['est', 'pm', 'rec']);

const NOT_FOUND = (hash) => ({ view: 'notFound', hash });

/** A part of an address, decoded, or null when it does not decode. A + is a space. */
function decode(part) {
  try {
    return decodeURIComponent(part.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

/** A value made safe for an address. */
export const encode = (value) => encodeURIComponent(String(value));

/** The pairs after a ?, as a Map, or null when a pair does not decode or a name comes twice. */
function readQuery(query) {
  const out = new Map();
  if (query === '') return out;
  for (const pair of query.split('&')) {
    const at = pair.indexOf('=');
    const name = decode(at < 0 ? pair : pair.slice(0, at));
    const value = decode(at < 0 ? '' : pair.slice(at + 1));
    if (name === null || value === null || out.has(name)) return null;
    out.set(name, value);
  }
  return out;
}

const isCode = (v) => /^[A-Z]{2}$/.test(v);
const isZipText = (v) => /^\d{5}$/.test(v);
const isCityId = (v) => /^[A-Z]{2}-[a-z0-9-]+$/.test(v);

/** All installers with nothing chosen. */
export const ALL_INSTALLERS = Object.freeze({ view: 'installers', mode: null, q: null, office: null, territory: null, dormant: false, inactive: false, mapOff: false });

export function parseHash(hash) {
  const whole = String(hash ?? '');
  const h = whole.startsWith('#') ? whole.slice(1) : whole;
  if (h === '' || h === '/') return { view: 'home' };
  const qAt = h.indexOf('?');
  const path = qAt < 0 ? h : h.slice(0, qAt);
  const query = qAt < 0 ? new Map() : readQuery(h.slice(qAt + 1));
  if (query === null) return NOT_FOUND(whole);
  const only = (...names) => [...query.keys()].every((k) => names.includes(k));
  const mode = query.has('view') ? query.get('view') : null;
  if (mode !== null && !MODES.includes(mode)) return NOT_FOUND(whole);

  if (path === '/installers') {
    if (query.has('set') || query.has('status')) {
      // The old addresses of the first prompt.
      if (!only('set', 'status')) return NOT_FOUND(whole);
      const set = query.has('set') ? query.get('set') : null;
      if (set !== null && set !== 'contact' && set !== 'rates') return NOT_FOUND(whole);
      const status = query.has('status') ? query.get('status') : null;
      if (status !== null && !STATUS_ORDER.includes(status)) return NOT_FOUND(whole);
      return { ...ALL_INSTALLERS, mode: set ? 'est' : null, dormant: status === STATUS.dormant, inactive: ON_HOLD.includes(status), old: true };
    }
    if (!only('view', 'q', 'office', 'territory', 'dormant', 'inactive', 'map')) return NOT_FOUND(whole);
    const q = query.has('q') ? query.get('q') : null;
    const office = query.has('office') ? query.get('office') : null;
    const territory = query.has('territory') ? query.get('territory') : null;
    if ((office !== null && !isCode(office)) || (territory !== null && !isCode(territory))) return NOT_FOUND(whole);
    for (const box of ['dormant', 'inactive']) if (query.has(box) && query.get(box) !== '1') return NOT_FOUND(whole);
    if (query.has('map') && query.get('map') !== 'off') return NOT_FOUND(whole);
    return { ...ALL_INSTALLERS, mode, q: q === null || q.trim() === '' ? null : q, office, territory, dormant: query.has('dormant'),
      inactive: query.has('inactive'), mapOff: query.has('map') };
  }
  if (path.startsWith('/installer/')) {
    const raw = path.slice('/installer/'.length);
    const id = raw.includes('/') ? null : decode(raw);
    if (!id || !only('view', 'from')) return NOT_FOUND(whole);
    let from = null;
    if (query.has('from')) {
      const f = query.get('from');
      const r = parseHash(`#${f}`);
      if (!['state', 'zip', 'city'].includes(r.view) || r.mode || r.old || toHash(r) !== `#${f}`) return NOT_FOUND(whole);
      from = r;
    }
    return { view: 'installer', id, mode, from };
  }
  if (path === '/search') {
    // The old Search results: what was typed opens All installers, five digits the ZIP.
    if (!only('q')) return NOT_FOUND(whole);
    const q = query.has('q') ? query.get('q') : '';
    if (isZipText(q.trim())) return { view: 'zip', zip: q.trim(), mode: null, old: true };
    return { ...ALL_INSTALLERS, q: q.trim() === '' ? null : q, old: true };
  }
  if (path === '/not-on-the-map') {
    if (qAt >= 0) return NOT_FOUND(whole);
    return { ...ALL_INSTALLERS, dormant: true, inactive: true, mapOff: true, old: true };
  }
  if (path.startsWith('/state/')) {
    const code = decode(path.slice('/state/'.length));
    if (!code || !isCode(code) || !only('county', 'view')) return NOT_FOUND(whole);
    const county = query.has('county') ? query.get('county') : null;
    if (county === '') return NOT_FOUND(whole);
    return { view: 'state', code, county, mode };
  }
  if (path.startsWith('/zip/')) {
    const zip = path.slice('/zip/'.length);
    if (!isZipText(zip) || !only('view')) return NOT_FOUND(whole);
    return { view: 'zip', zip, mode };
  }
  if (path.startsWith('/city/')) {
    const id = path.slice('/city/'.length);
    if (!isCityId(id) || !only('view')) return NOT_FOUND(whole);
    return { view: 'city', id, mode };
  }
  if (path === '/about' && qAt < 0) return { view: 'about' };
  return NOT_FOUND(whole);
}

/** The ? items of a route, in the order of section 4.1. */
function items(pairs) {
  const kept = pairs.filter(([, v]) => v !== null && v !== undefined && v !== false);
  return kept.length ? `?${kept.map(([k, v]) => `${k}=${v === true ? '1' : encode(v)}`).join('&')}` : '';
}

export function toHash(route) {
  switch (route.view) {
    case 'home': return '#/';
    case 'installers': return `#/installers${items([['view', route.mode], ['q', route.q], ['office', route.office], ['territory', route.territory],
      ['dormant', Boolean(route.dormant)], ['inactive', Boolean(route.inactive)], ['map', route.mapOff ? 'off' : null]])}`;
    case 'installer': return `#/installer/${encode(route.id)}${items([['view', route.mode], ['from', route.from ? placeAddress(route.from) : null]])}`;
    case 'state': return `#/state/${encode(route.code)}${items([['county', route.county], ['view', route.mode]])}`;
    case 'zip': return `#/zip/${route.zip}${items([['view', route.mode]])}`;
    case 'city': return `#/city/${route.id}${items([['view', route.mode]])}`;
    case 'about': return '#/about';
    default: return route.hash ?? '#/';
  }
}

/** A place's own address without its # and without view=, as from= carries it. */
export function placeAddress(place) {
  return toHash({ ...place, mode: null }).slice(1);
}

/** The address of one installer's view; from, the place's route it is opened from. */
export const installerHash = (id, from = null) => toHash({ view: 'installer', id, mode: null, from });

/** The address of a state's view, with a county chosen or not. */
export const stateHash = (code, county = null) => toHash({ view: 'state', code, county, mode: null });

/** The address of a ZIP code's view, and of a city's. */
export const zipHash = (zip) => toHash({ view: 'zip', zip, mode: null });
export const cityHash = (id) => toHash({ view: 'city', id, mode: null });

/** Five digits typed in a box, spaces around them aside: a ZIP code. */
export const isZip = (typed) => /^\s*\d{5}\s*$/.test(String(typed ?? ''));

/**
 * The address the box in the header gives for what is typed: a ZIP's for five digits; otherwise
 * All installers with q, keeping the choices of All installers when it is already open.
 */
export function boxAddress(typed, current = null) {
  if (isZip(typed)) return zipHash(String(typed).trim());
  const base = current && current.view === 'installers' ? current : ALL_INSTALLERS;
  const q = String(typed ?? '');
  return toHash({ ...base, q: q.trim() === '' ? null : q, old: undefined });
}
