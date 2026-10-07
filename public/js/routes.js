/**
 * The addresses of the views, written after a # so that any host serves them with no settings:
 *
 *   #/                              Home
 *   #/installers                    All installers, the Contact info columns
 *   #/installers?set=rates          the Rates columns
 *   #/installers?status=<status>    one status only; it may be joined with set
 *   #/installer/<installer id>      one installer
 *   #/search?q=<what was typed>     Search results
 *   #/not-on-the-map                Not on the map
 *   #/about                         About this data
 *   #/state/<code>                  a state, by its two-letter code; ON for Ontario
 *   #/state/<code>?county=<id>      that state with one county chosen
 *   #/zip/<five digits>             the answer for a ZIP code
 *
 * #/search?q=<five digits> shows what #/zip/<the same digits> shows.
 *
 * parseHash turns an address into a route; toHash turns a route back into its address, so that
 * every address gives its view and the view gives back the same address. An address that names
 * no view is the route { view: 'notFound' }. Whether a status or an installer id is in the data
 * is the views' to say.
 *
 * Nothing here touches a browser object, so node can load it and test it.
 */

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

export function parseHash(hash) {
  const whole = String(hash ?? '');
  const h = whole.startsWith('#') ? whole.slice(1) : whole;
  if (h === '' || h === '/') return { view: 'home' };
  const qAt = h.indexOf('?');
  const path = qAt < 0 ? h : h.slice(0, qAt);
  const query = qAt < 0 ? null : readQuery(h.slice(qAt + 1));
  if (query === null && qAt >= 0) return NOT_FOUND(whole);
  const only = (...names) => !query || [...query.keys()].every((k) => names.includes(k));

  if (path === '/installers') {
    if (!only('set', 'status')) return NOT_FOUND(whole);
    const set = query && query.has('set') ? query.get('set') : 'contact';
    if (set !== 'contact' && set !== 'rates') return NOT_FOUND(whole);
    if (query && query.get('set') === 'contact') return NOT_FOUND(whole);
    const status = query && query.has('status') ? query.get('status') : null;
    if (status === '') return NOT_FOUND(whole);
    return { view: 'installers', set, status };
  }
  if (path.startsWith('/installer/')) {
    const raw = path.slice('/installer/'.length);
    const id = raw.includes('/') ? null : decode(raw);
    if (!id || qAt >= 0) return NOT_FOUND(whole);
    return { view: 'installer', id };
  }
  if (path === '/search') {
    if (!only('q')) return NOT_FOUND(whole);
    return { view: 'search', q: query && query.has('q') ? query.get('q') : '' };
  }
  if (path.startsWith('/state/')) {
    const code = decode(path.slice('/state/'.length));
    if (!code || !/^[A-Z]{2}$/.test(code) || !only('county')) return NOT_FOUND(whole);
    const county = query && query.has('county') ? query.get('county') : null;
    if (county === '') return NOT_FOUND(whole);
    return { view: 'state', code, county };
  }
  if (path.startsWith('/zip/')) {
    const zip = path.slice('/zip/'.length);
    if (!/^\d{5}$/.test(zip) || qAt >= 0) return NOT_FOUND(whole);
    return { view: 'zip', zip };
  }
  if (path === '/not-on-the-map' && qAt < 0) return { view: 'notOnMap' };
  if (path === '/about' && qAt < 0) return { view: 'about' };
  return NOT_FOUND(whole);
}

export function toHash(route) {
  switch (route.view) {
    case 'home': return '#/';
    case 'installers': {
      const parts = [];
      if (route.set === 'rates') parts.push('set=rates');
      if (route.status) parts.push(`status=${encode(route.status)}`);
      return `#/installers${parts.length ? `?${parts.join('&')}` : ''}`;
    }
    case 'installer': return `#/installer/${encode(route.id)}`;
    case 'search': return `#/search?q=${encode(route.q ?? '')}`;
    case 'state': return `#/state/${encode(route.code)}${route.county ? `?county=${encode(route.county)}` : ''}`;
    case 'zip': return `#/zip/${route.zip}`;
    case 'notOnMap': return '#/not-on-the-map';
    case 'about': return '#/about';
    default: return route.hash ?? '#/';
  }
}

/** The address of one installer's view. */
export const installerHash = (id) => toHash({ view: 'installer', id });

/** The address of a state's view, with a county chosen or not. */
export const stateHash = (code, county = null) => toHash({ view: 'state', code, county });

/** Five digits typed in the search box, spaces around them aside: a ZIP code. */
export const isZip = (typed) => /^\s*\d{5}\s*$/.test(String(typed ?? ''));

/** The address the search box gives for what is typed: a ZIP's for five digits, a search's for anything else. */
export function boxAddress(typed) {
  return isZip(typed) ? toHash({ view: 'zip', zip: String(typed).trim() }) : toHash({ view: 'search', q: String(typed ?? '') });
}
