/**
 * The words and the layout of every view, as plain functions: each takes the route, the data and
 * the time, and gives back { view, tab, title, node }, where node is a tree of elements (html.js).
 * They touch no browser object, so node can load them and test them; app.js puts the result on
 * the page.
 *
 * Sections 4.0 to 4.11 of docs\SPEC.md, ninth revision, say what each view shows. A field with no
 * value is left out of the Installer view, never shown as a dash.
 *
 * The view switch (section 4.2): renderView is handed the view to draw as mode, 'est', 'pm' or
 * 'rec'; app.js passes the address's view= or the one the browser remembers.
 *
 * A view with a map, a ZIP code or a city to look up needs a file that is fetched only then:
 * filesFor says which, and renderView and mapPart are handed what has come so far, as
 * files = { path: { state: 'loading' | 'ok' | 'failed', doc } }. The lists show at once and the
 * map when its file has come; the map's part is marked pending, drawn or failed.
 */
import { h } from './html.js';
import * as F from './format.js';
import {
  cityPath, countiesIn, countyMapPath, countyName, HOME_MAP, hasCounties, isConfirmed, isDormant, isListed, isOnHold, isPending,
  notOnTheMap, officeStateIs, placeLists, placeName, STATUS_ORDER, stateName, tier1States, totalsOf, zipPath,
} from './data.js';
import { search } from './search.js';
import { contactOrder, contactsOf, fieldContact, formerContacts, isCurrent, MARKERS, NO_ROLE, receivingContact, rolesOf, rowOf } from './contacts.js';
import { ALL_INSTALLERS, installerHash, MODES, stateHash, toHash, zipHash } from './routes.js';
import { countyMap, countyMapUsable, homeMap, homeMapUsable, installersWord, legend } from './maps.js';
import { CITIES_BUILT, LOCATION_HINT } from './places.js';

export const SITE = 'Installer Index';
/** Who staff tell about a wrong value: Joe's ruling of October 8, 2026 (sections 4.6 and 4.11). */
export const JOE = Object.freeze({ name: 'Joe Lull', email: 'joe.lull@infiniumwalls.com' });
/** Ruling 8 of the first prompt: the data is out of date when builtAt is more than this many hours old. */
export const STALE_HOURS = 36;
const HOUR = 3600 * 1000;

/** The view switch (section 4.2): its three views, and the one drawn when nothing is remembered. */
export const MODE_LABELS = Object.freeze({ est: 'Estimating', pm: 'Project management', rec: 'Records' });
export const DEFAULT_MODE = 'est';
/** The Tier 2 button (section 4.0), and the map column's button (4.4). */
export const TIER2_SHOW = 'View Tier 2 Installers Available for Travel';
export const TIER2_HIDE = 'Hide Tier 2 Installers';
export const MAP_HIDE = 'Hide map';
export const MAP_SHOW = 'Show map';
export const NO_TIER2_LINE = 'No Tier 2 installer lists this area for travel.';
export const DORMANT_HEADING = 'Did not respond to the August outreach';
export const NOT_GIVEN = 'Not given';
export const NOT_RECORDED = 'Not recorded';
export const NOT_APPLICABLE = 'Not applicable';

const isGroup = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const filled = (v) => v !== undefined && v !== null && v !== '';
const titled = (what) => (what ? `${what} — ${SITE}` : SITE);
const modeOf = (m) => (MODES.includes(m) ? m : DEFAULT_MODE);

/** "A", "A and B", "A, B and C"; with "or" in place of "and" when asked. */
function joined(list, word = 'and') {
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} ${word} ${list[list.length - 1]}`;
}

/* ============================================================ small parts */

/** A text with one stretch of it marked: [before, <mark>, after]. */
function marked(text, range) {
  const s = String(text);
  if (!range) return s;
  const [a, b] = range;
  return [s.slice(0, a), h('mark', {}, s.slice(a, b)), s.slice(b)];
}

/** The status, in words, as a gray tag. */
export function statusTag(status) {
  if (!filled(status)) return null;
  return h('span', { class: 'status', 'data-status': status }, String(status));
}

/** "Pending update", in amber, beside the company of a PENDING - UPDATE EXPECTED installer (section 4.4). */
const pendingTag = () => h('span', { class: 'flag', 'data-pending': 'true' }, 'Pending update');
/** Amber, always with words, for what is missing or expired (section 4.5). */
const flag = (text, attrs = {}) => h('span', { class: 'flag', ...attrs }, text);
const expiredTag = () => flag('Expired', { 'data-expired': 'true' });
const muted = (text) => h('span', { class: 'muted' }, text);

/** Ruling 7 of the first prompt: rates have expired when the valid-through date is before today, in Eastern time. */
export function ratesExpired(installer, today) {
  const d = installer.ratesValidThrough;
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && d < today;
}

/** Long text on a row: clipped to two lines, whole on hover and in the Installer view (section 4.5). */
const clamp = (text) => h('span', { class: 'clamp', 'data-clamp': 'true', title: String(text) }, String(text));

/** Office city and state, as one line, with a match marked. */
function officeLine(installer, marks = []) {
  const o = isGroup(installer.office) ? installer.office : {};
  const city = marks.find((m) => m.field === 'city');
  const state = marks.some((m) => m.field === 'officeState');
  const parts = [];
  if (filled(o.city)) parts.push(marked(o.city, city && city.range));
  if (filled(o.state)) parts.push(state ? h('mark', {}, String(o.state)) : String(o.state));
  return parts.length === 2 ? [parts[0], ', ', parts[1]] : parts;
}

/** One labeled field of the Installer view: the label over its value. */
function field(key, label, value, { long = false } = {}) {
  return h('div', { class: long ? 'field field-long' : 'field', 'data-field': key },
    h('dt', {}, label), h('dd', { class: long ? 'long' : null }, value));
}

const fields = (...items) => {
  const kept = items.flat().filter(Boolean);
  return kept.length ? h('dl', { class: 'fields' }, kept) : null;
};

/* ============================================================ contacts */

const roleLabels = (c) => (rolesOf(c).length ? rolesOf(c) : [NO_ROLE]);

/**
 * One person: role, name, title, phone, email, second email and procedure (ruling 6), each when
 * filled. full adds what the Installer view shows: departed, and who confirmed the record. brief
 * is the field and receiving contact of a row: name, title and phone, the email only when there
 * is no phone.
 */
function person(installer, index, { labels, marks = [], full = false, departedShown = false, brief = false } = {}) {
  const c = isGroup(contactsOf(installer)[index]) ? contactsOf(installer)[index] : {};
  const mark = (fieldName, value) => {
    const m = marks.find((x) => x.contact === index && x.field === fieldName);
    return marked(value, m && m.range);
  };
  const tags = [];
  if (c.departed === true && (full || departedShown)) tags.push(h('span', { class: 'tag tag-dark', 'data-departed': 'true' }, 'Departed'));
  if (c.confirmedRecord === true && full) tags.push(h('span', { class: 'tag tag-light', 'data-confirmed-record': 'true' }, 'Confirmed this record'));
  const email = !brief || !filled(c.phone);
  return h('div', { class: 'person', 'data-contact': index },
    labels && labels.length ? h('p', { class: 'role' }, labels.map((l) => h('span', {}, l))) : null,
    h('p', { class: 'name' }, filled(c.name) ? mark('name', c.name) : 'Name not recorded'),
    tags.length ? h('p', { class: 'tags' }, tags) : null,
    filled(c.title) ? h('p', { class: 'title' }, String(c.title)) : null,
    filled(c.phone) ? h('p', { class: 'reach' }, h('a', { href: F.telHref(c.phone) }, mark('phone', c.phone))) : null,
    email && filled(c.email) ? h('p', { class: 'reach' }, h('a', { href: F.mailHref(c.email) }, mark('email', c.email))) : null,
    !brief && filled(c.email2) ? h('p', { class: 'reach' }, h('a', { href: F.mailHref(c.email2) }, mark('email2', c.email2))) : null,
    !brief && filled(c.procedure) ? h('p', { class: 'procedure', 'data-procedure': 'true' }, h('span', { class: 'inline-label' }, 'Procedure'), String(c.procedure)) : null,
  );
}

/** The contact a row shows in its contact column: the quoting place in Estimating, the scheduling place in Project management. */
function rowPlace(installer, which) {
  const r = rowOf(installer);
  const place = r.places.find((p) => p.key === which || p.key === 'both') || null;
  return { r, place, shown: place && place.contact !== null ? place.contact : null };
}

/**
 * The quote contact (Estimating) or the scheduling contact (Project management) of a row, as
 * section 4.8 says: the place as the job chose it, a stand-in labeled with its own role, the
 * marker, and "Show all contacts", which opens the other current contacts in place.
 */
function placeCell(ctx, installer, which, { marks = [], elsewhere = [] } = {}) {
  const { r, place, shown } = rowPlace(installer, which);
  const marker = r.marker || (place && place.marker) || null;
  const missing = r.marker ? 'both' : marker ? which : null;
  const contacts = contactsOf(installer);
  const rest = contacts.map((c, i) => i).filter((i) => i !== shown && !elsewhere.includes(i) && isCurrent(contacts[i]));
  const id = `more-${ctx.view}-${++ctx.ids}`;
  return h('div', { class: 'contacts', 'data-standins': r.standIns, 'data-nobody': r.nobody, 'data-both': r.oneInBoth ? 1 : 0 },
    marker ? h('p', { class: 'flag marker', 'data-marker': missing }, marker) : null,
    shown !== null ? h('div', { class: 'place', 'data-place': place.key, 'data-standin': place.standIn ? 'true' : null },
      person(installer, shown, { labels: place.labels, marks })) : null,
    rest.length ? [
      h('button', { type: 'button', class: 'more-toggle', 'aria-expanded': 'false', 'aria-controls': id, 'data-more': id },
        h('span', { class: 'chev', 'aria-hidden': 'true' }), `Show all contacts (${F.count(rest.length)} more)`),
      h('div', { id, class: 'more', hidden: true },
        rest.map((i) => person(installer, i, { labels: roleLabels(contacts[i]) }))),
    ] : null);
}

/** The field contact or the receiving contact of a row (section 4.8), or its marker. */
function oneContact(installer, index, missingText) {
  if (index === null) return h('p', { class: 'flag marker', 'data-marker': missingText === MARKERS.field ? 'field' : 'receiving' }, missingText);
  return person(installer, index, { brief: true });
}

/** The warehousing line of the Receiving column. */
function warehousingLine(installer) {
  const w = isGroup(installer.warehousing) ? installer.warehousing : {};
  const where = Array.isArray(w.at) && w.at.length ? `, at ${w.at.map(String).join(', ')}` : '';
  if (w.available === 'Yes') return `Warehousing: Yes${where}`;
  if (w.available === 'No') return `Warehousing: No${where}`;
  if (filled(w.available)) return `Warehousing: ${String(w.available)}${where}`;
  return `Warehousing: Not recorded${where}`;
}

/**
 * The paperwork of the Project management row (section 4.5): each missing item on its own,
 * never one for both; a blank answer "not recorded"; both Yes, one line. [{ key, text, flag }]
 */
export function paperworkLines(installer) {
  const p = isGroup(installer.paperwork) ? installer.paperwork : {};
  const a = p.agreementOnFile;
  const c = p.coiOnFile;
  if (a === 'Yes' && c === 'Yes') return [{ key: 'both', text: 'Agreement and insurance on file', flag: false }];
  const out = [];
  if (a === 'No') out.push({ key: 'agreement', text: 'No agreement on file', flag: true });
  else if (!filled(a)) out.push({ key: 'agreement', text: 'Agreement not recorded', flag: true });
  else if (a !== 'Yes') out.push({ key: 'agreement', text: `Agreement: ${String(a)}`, flag: false });
  if (c === 'No') out.push({ key: 'coi', text: 'No certificate of insurance on file', flag: true });
  else if (!filled(c)) out.push({ key: 'coi', text: 'Insurance not recorded', flag: true });
  else if (c !== 'Yes') out.push({ key: 'coi', text: `Insurance: ${String(c)}`, flag: false });
  return out;
}

/** The Tier 2 charge: whichever of its five parts are filled, joined with " · " (ruling 4), or null. */
export function tier2ChargeText(installer) {
  const t = isGroup(installer.tier2Charge) ? installer.tier2Charge : {};
  const parts = ['basis', 'unit', 'unitOther', 'amount', 'relation'].filter((k) => filled(t[k]))
    .map((k) => (typeof t[k] === 'number' ? F.asWritten(t[k]) : String(t[k])));
  return parts.length ? parts.join(' · ') : null;
}

/** An installer's territory in words (the Records column, section 4.5). */
export function territoryWords(model, installer) {
  const t = totalsOf(model, installer);
  if (t.tier1 > 0) return `Tier 1 in ${F.plural(t.tier1, 'county', 'counties')}${t.tier2 ? ` · travel to ${F.count(t.tier2)}` : ''}`;
  if (t.tier2 > 0) return 'Travel only (Tier 2)';
  return 'Not on the map';
}

/* ============================================================ the frame */

/**
 * The freshness line in the footer: the date of builtAt in Eastern time. Ruling 8 of the first
 * prompt: when builtAt is more than 36 hours old it says so, with a label.
 */
export function freshness(build, now) {
  const ms = F.builtAtMs(build && build.builtAt);
  const date = F.easternLongDate(ms);
  const stale = now - ms > STALE_HOURS * HOUR;
  const text = stale ? `Installer records from QuickBase. Not refreshed since ${date}.`
    : `Installer records from QuickBase, refreshed ${date}.`;
  return {
    stale, date, text,
    node: h('span', { class: 'fresh-line', 'data-stale': stale ? 'true' : 'false' },
      h('span', {}, text),
      stale ? h('span', { class: 'tag tag-dark', 'data-out-of-date': 'true' }, 'Out of date') : null,
      h('a', { href: toHash({ view: 'about' }) }, 'About this data')),
  };
}

/** The view switch (section 4.2): three links to the same address with view= changed. */
function modeSwitch(ctx, route) {
  return h('div', { class: 'mode-switch', role: 'group', 'aria-label': 'View' },
    MODES.map((m) => h('a', { class: `mode${m === ctx.mode ? ' chosen' : ''}`, href: toHash({ ...route, mode: m, old: undefined }),
      'aria-current': m === ctx.mode ? 'true' : null, 'data-mode-link': m }, MODE_LABELS[m])));
}

/** The location box (section 4.3.1): on Find installers, and as "Change location" on a place's view. */
function locationBox(label, hint) {
  return h('div', { class: hint ? 'loc-box loc-box-find' : 'loc-box' },
    h('label', { class: 'loc-label', for: 'loc' }, label),
    h('div', { class: 'loc-field' },
      h('input', { id: 'loc', class: 'loc-input', type: 'text', autocomplete: 'off', spellcheck: 'false', 'data-location-box': 'true',
        'aria-controls': 'loc-list', 'aria-describedby': hint ? 'loc-hint' : null, placeholder: hint ? null : LOCATION_HINT }),
      h('div', { id: 'loc-list', class: 'loc-list', hidden: true })),
    hint ? h('p', { id: 'loc-hint', class: 'loc-hint' }, hint) : null,
    h('p', { id: 'loc-status', class: 'visually-hidden', 'aria-live': 'polite' }));
}

/* ============================================================ maps in views */

/** A link, shown on focus, that skips past a map: app.js moves the focus, and the address does not change. */
const skipLink = (target, text) => h('a', { class: 'skip-map', href: `#${target}`, 'data-skip-to': target }, text);

/** The map's part of a view: { key, state: 'pending' | 'drawn' | 'failed', node }. */
function homeMapPart(model, files) {
  const f = files[HOME_MAP];
  if (!f || f.state === 'loading') return { key: 'home', state: 'pending', node: h('p', { class: 'map-note' }, 'Drawing the map…') };
  if (f.state !== 'ok' || !homeMapUsable(f.doc)) {
    return { key: 'home', state: 'failed', node: h('p', { class: 'map-note', 'data-map-failed': 'true' }, 'The map could not be drawn. Every state is in the list below.') };
  }
  return { key: 'home', state: 'drawn', node: [homeMap(model, f.doc), legend('Installers with territory in the state or province')] };
}

function countyMapPart(model, code, chosen, files) {
  const f = files[countyMapPath(code)];
  if (!f || f.state === 'loading') return { key: 'county', state: 'pending', node: h('p', { class: 'map-note' }, 'Drawing the map…') };
  if (f.state !== 'ok' || !countyMapUsable(f.doc, code)) {
    return { key: 'county', state: 'failed', node: h('p', { class: 'map-note', 'data-map-failed': 'true' }, 'The map could not be drawn. The lists still show every installer.') };
  }
  return { key: 'county', state: 'drawn', node: [countyMap(model, code, f.doc, chosen), legend('Installers with territory in the county')] };
}

const mapSlot = (part) => h('div', { class: 'map-slot', 'data-map-slot': part.key, 'data-map': part.state }, part.node);

/** A state's code or a county's id that the county list holds, in that state. */
const knownState = (model, code) => model.stateNames.has(code);
const knownCounty = (model, code, county) => {
  const c = model.countyById.get(county);
  return Boolean(c) && c.state === code;
};

/** What the ZIP file says of a ZIP: { state: 'pending' | 'failed' | 'ok', entry }; entry null when it is not in the list. */
function zipLookup(files, zip) {
  const f = files[zipPath(zip)];
  if (!f || f.state === 'loading') return { state: 'pending', entry: null };
  if (f.state !== 'ok' || !Array.isArray(f.doc.zips)) return { state: 'failed', entry: null };
  return { state: 'ok', entry: f.doc.zips.find((z) => isGroup(z) && z.zip === zip) || null };
}

/**
 * The place a route names, as the files stand: { state, place }. state is 'ok', or 'pending' or
 * 'failed' while a ZIP or city file has not come or could not be read, 'missing' for a ZIP not in
 * the list, 'outside' for a ZIP outside the map, 'unknown' for a place the data does not hold.
 * place: { route, kind, tag, state (the state of its map and counts), heading, name, where, full,
 * counties (null for a whole state), chosen (the counties outlined), allOf, multi }.
 */
export function resolvePlace(model, route, files = {}) {
  if (route.view === 'state') {
    if (!knownState(model, route.code) || (route.county && !knownCounty(model, route.code, route.county))) return { state: 'unknown' };
    const st = stateName(model, route.code);
    const own = { view: 'state', code: route.code, county: route.county || null, mode: null };
    if (!route.county) return { state: 'ok', place: { route: own, kind: 'state', tag: 'State', state: route.code, heading: st, name: st, where: st, full: st, counties: null, chosen: [], allOf: null, multi: false } };
    const full = placeName(model, route.code, route.county);
    return { state: 'ok', place: { route: own, kind: 'county', tag: 'County', state: route.code, heading: full, name: full, where: countyName(model, route.county) === st ? st : countyName(model, route.county),
      full, counties: [route.county], chosen: [route.county], allOf: route.code, multi: false } };
  }
  let counties;
  let name;
  let own;
  let kind;
  if (route.view === 'zip') {
    const z = zipLookup(files, route.zip);
    if (z.state !== 'ok') return { state: z.state };
    if (!z.entry) return { state: 'missing' };
    counties = (z.entry.outside === true || !Array.isArray(z.entry.counties) ? [] : z.entry.counties).filter((id) => model.countyById.has(id));
    if (!counties.length) return { state: 'outside' };
    name = `ZIP ${route.zip}`;
    own = { view: 'zip', zip: route.zip, mode: null };
    kind = 'zip';
  } else if (route.view === 'city') {
    const code = String(route.id).slice(0, 2);
    if (!knownState(model, code)) return { state: 'unknown' };
    const f = files[cityPath(code)];
    if (!f || f.state === 'loading') return { state: 'pending' };
    if (f.state !== 'ok' || !Array.isArray(f.doc.cities)) return { state: 'failed' };
    const city = f.doc.cities.find((c) => isGroup(c) && c.id === route.id);
    counties = city && Array.isArray(city.counties) ? city.counties.filter((id) => model.countyById.has(id)) : [];
    if (!counties.length || !knownState(model, city.state)) return { state: 'unknown' };
    name = `${city.name}, ${stateName(model, city.state)}`;
    own = { view: 'city', id: route.id, mode: null };
    kind = 'city';
  } else {
    return { state: 'unknown' };
  }
  const first = model.countyById.get(counties[0]);
  const tag = kind === 'zip' ? 'ZIP' : 'City';
  if (counties.length === 1) {
    const full = placeName(model, first.state, first.id);
    const st = stateName(model, first.state);
    return { state: 'ok', place: { route: own, kind, tag, state: first.state,
      heading: kind === 'zip' ? `${name} · ${full}` : `${name} · ${countyName(model, first.id)}`, name,
      where: countyName(model, first.id) === st ? st : countyName(model, first.id), full, counties, chosen: counties, allOf: first.state, multi: false } };
  }
  return { state: 'ok', place: { route: own, kind, tag, state: first.state, heading: name, name, where: joined(counties.map((id) => countyName(model, id)), 'or'),
    full: name, counties, chosen: counties.filter((id) => model.countyById.get(id).state === first.state), allOf: null, multi: true } };
}

/**
 * The files an address needs, beyond the four the page loads at the start: [{ path, part }].
 * part is 'map' for a file that only draws a map, 'content' for one the view waits on.
 */
export function filesFor(route, model, files = {}) {
  if (route.view === 'home') return [{ path: HOME_MAP, part: 'map' }];
  if (route.view === 'state') {
    if (!knownState(model, route.code) || (route.county && !knownCounty(model, route.code, route.county))) return [];
    return [{ path: countyMapPath(route.code), part: 'map' }];
  }
  if (route.view === 'zip' || route.view === 'city') {
    if (route.view === 'city' && !knownState(model, String(route.id).slice(0, 2))) return [];
    const out = [{ path: route.view === 'zip' ? zipPath(route.zip) : cityPath(String(route.id).slice(0, 2)), part: 'content' }];
    const r = resolvePlace(model, route, files);
    if (r.state === 'ok') out.push({ path: countyMapPath(r.place.state), part: 'map' });
    return out;
  }
  if (route.view === 'installer' && route.from && (route.from.view === 'zip' || route.from.view === 'city')) {
    return filesFor(route.from, model, files).filter((f) => f.part === 'content');
  }
  return [];
}

/** The map's part of the view for a route, as files stand: null for a view with no map. */
export function mapPart(route, model, files = {}) {
  if (route.view === 'home') return homeMapPart(model, files);
  if (route.view === 'state' || route.view === 'zip' || route.view === 'city') {
    const r = resolvePlace(model, route, files);
    return r.state === 'ok' ? countyMapPart(model, r.place.state, r.place.chosen, files) : null;
  }
  return null;
}

/* ============================================================ rows */

/** The columns of each view (section 4.5): [key, title]. */
export const COLUMNS = Object.freeze({
  est: [['installer', 'Installer'], ['quote', 'Quote contact'], ['nonUnion', 'Non-union ST / OT'], ['union', 'Union ST / OT'],
    ['mobilization', 'Mobilization'], ['ratesValidThrough', 'Rates valid through']],
  pm: [['installer', 'Installer'], ['scheduling', 'Scheduling contact'], ['field', 'Field contact'], ['receiving', 'Receiving'],
    ['paperwork', 'Paperwork'], ['travelNote', 'Travel note']],
  rec: [['installer', 'Installer'], ['ratesValidThrough', 'Rates valid through'], ['agreement', 'Agreement'],
    ['coi', 'Certificate of insurance'], ['emr', 'EMR'], ['gaps', 'Contact gaps'], ['territory', 'Territory']],
});

/** The columns of a table: the view's, with the Tier 2 charge in a Tier 2 list in Estimating, and Territory in for All installers. */
export function columnsFor(mode, { tier2 = false, all = false } = {}) {
  const cols = [...COLUMNS[mode]];
  if (tier2 && mode === 'est') cols.push(['tier2Charge', 'Tier 2 charge']);
  if (all && mode !== 'rec') cols.push(['territoryIn', 'Territory in']);
  return cols;
}

const NUMERIC = new Set(['nonUnion', 'union']);

function table(kind, columns, rows) {
  return h('div', { class: 'panel table-panel' },
    h('table', { class: `grid grid-${kind}` },
      h('colgroup', {}, columns.map(([key]) => h('col', { class: `c-${key}` }))),
      h('thead', {}, h('tr', {}, columns.map(([key, label]) => h('th', { scope: 'col', 'data-column': key, class: NUMERIC.has(key) ? 'num' : null }, label)))),
      h('tbody', {}, rows)));
}

function companyLink(installer, marks = [], from = null) {
  const m = marks.find((x) => x.field === 'company');
  return h('a', { class: 'company', href: installerHash(installer.id, from) },
    filled(installer.company) ? marked(installer.company, m && m.range) : 'Company not recorded');
}

/** Two rates of a row, labeled ST and OT, as dollars with two decimals; a blank rate reads "Not given". */
function ratePair(installer, st, ot) {
  const rates = isGroup(installer.rates) ? installer.rates : {};
  return h('dl', { class: 'rate-pair' }, [[st, 'ST'], [ot, 'OT']].map(([k, label]) => h('div', { class: 'rate', 'data-rate': k },
    h('dt', {}, label), typeof rates[k] === 'number' ? h('dd', { class: 'money' }, F.money(rates[k])) : h('dd', { class: 'money none' }, NOT_GIVEN))));
}

function validThrough(ctx, installer) {
  if (!filled(installer.ratesValidThrough)) return muted(NOT_GIVEN);
  return [h('span', { class: 'date' }, F.shortDate(installer.ratesValidThrough)), ratesExpired(installer, ctx.today) ? [' ', expiredTag()] : null];
}

/** The territory a search found, in words (section 4.7), with the state's name a link to its view. */
function territoryMatch(model, installer, code) {
  const mine = (model.coverage.get(installer.id) || new Map()).get(code) || { tier1: [], tier2: [] };
  return h('p', { class: 'territory-match', 'data-match': 'territory' }, 'Territory includes ',
    h('a', { href: stateHash(code), 'data-state-link': code }, h('mark', {}, stateName(model, code))),
    `: ${F.plural(mine.tier1.length, 'county', 'counties')}${mine.tier2.length ? `, and available for travel to ${F.count(mine.tier2.length)} more` : ''}`);
}

const MATCH_NAMES = {
  company: 'company name', city: 'office city', officeState: 'office state', territory: 'territory',
  name: 'contact name', email: 'email', email2: 'second email', phone: 'phone',
};

/**
 * One row of a table, in the columns given. opts: from (the place's route, for the company's link),
 * tierLine (under the company in a place's list), marks (a search's matches), searching.
 */
function row(ctx, installer, columns, { from = null, tierLine = null, marks = [], searching = false, attrs = {} } = {}) {
  const { model, mode } = ctx;
  const contactPlace = mode === 'est' ? 'quoting' : mode === 'pm' ? 'scheduling' : null;
  const shown = contactPlace ? rowPlace(installer, contactPlace).shown : null;
  const matchedOff = [...new Set(marks.filter((m) => Number.isInteger(m.contact) && m.contact !== shown).map((m) => m.contact))];
  const tags = [];
  if (mode === 'rec' || searching || !isListed(installer)) tags.push(statusTag(installer.status));
  if (isPending(installer)) tags.push(pendingTag());
  const showOffice = mode !== 'rec' || marks.some((m) => m.field === 'city' || m.field === 'officeState');
  const contacts = contactsOf(installer);
  const cell = (key) => {
    switch (key) {
      case 'installer': return [
        h('p', { class: 'row-company' }, companyLink(installer, marks, from), tags),
        tierLine ? h('p', { class: 'tier-line' }, tierLine) : null,
        showOffice ? h('p', { class: 'row-office' }, officeLine(installer, marks)) : null,
        mode === 'rec' && isConfirmed(installer) && filled(installer.lastConfirmed)
          ? h('p', { class: 'row-confirmed' }, h('span', { class: 'inline-label' }, 'Last confirmed'), F.shortDate(installer.lastConfirmed)) : null,
        marks.filter((m) => m.field === 'territory').map((m) => territoryMatch(model, installer, m.state)),
        matchedOff.length ? h('div', { class: 'matched-contacts', 'data-matched-contacts': 'true' },
          h('p', { class: 'matched-label' }, matchedOff.length === 1 ? 'Matched contact' : 'Matched contacts'),
          matchedOff.map((i) => person(installer, i, { labels: roleLabels(contacts[i]), marks, departedShown: true }))) : null,
        marks.length ? h('p', { class: 'matched-on' }, `Matched on ${[...new Set(marks.map((m) => MATCH_NAMES[m.field]))].join(', ')}`) : null,
      ];
      case 'quote': return placeCell(ctx, installer, 'quoting', { marks, elsewhere: matchedOff });
      case 'scheduling': return placeCell(ctx, installer, 'scheduling', { marks, elsewhere: matchedOff });
      case 'nonUnion': return ratePair(installer, 'nonUnionST', 'nonUnionOT');
      case 'union': return ratePair(installer, 'unionST', 'unionOT');
      case 'mobilization': return filled(installer.mobilization) ? clamp(installer.mobilization) : muted(NOT_GIVEN);
      case 'ratesValidThrough': return validThrough(ctx, installer);
      case 'tier2Charge': { const t = tier2ChargeText(installer); return t ? clamp(t) : muted(NOT_GIVEN); }
      case 'field': return oneContact(installer, fieldContact(installer), MARKERS.field);
      case 'receiving': return [h('p', { class: 'warehousing' }, warehousingLine(installer)), oneContact(installer, receivingContact(installer), MARKERS.receiving)];
      case 'paperwork': return paperworkLines(installer).map((l) => h('p', { class: 'paper', 'data-paper': l.key }, l.flag ? flag(l.text) : l.text));
      case 'travelNote': return filled(installer.travelNote) ? clamp(installer.travelNote) : installer.travelNoteNotApplicable === true ? NOT_APPLICABLE : null;
      case 'agreement': { const a = isGroup(installer.paperwork) ? installer.paperwork.agreementOnFile : undefined; return filled(a) ? String(a) : NOT_RECORDED; }
      case 'coi': {
        const p = isGroup(installer.paperwork) ? installer.paperwork : {};
        if (p.coiOnFile === 'Yes') return `On file${filled(p.coiValidThrough) ? `, valid through ${F.shortDate(p.coiValidThrough)}` : ''}`;
        return filled(p.coiOnFile) ? String(p.coiOnFile) : NOT_RECORDED;
      }
      case 'emr': return filled(installer.emr) ? String(installer.emr) : installer.emrNotApplicable === true ? NOT_APPLICABLE : muted(NOT_GIVEN);
      case 'gaps': {
        const gap = isGroup(installer.row) ? installer.row.gap : undefined;
        const lines = [];
        if (gap === 'quoting' || gap === 'both') lines.push(h('p', { 'data-gap': 'quoting' }, flag('No quoting contact')));
        if (gap === 'scheduling' || gap === 'both') lines.push(h('p', { 'data-gap': 'scheduling' }, flag('No scheduling contact')));
        return lines.length ? lines : 'None';
      }
      case 'territory': return territoryWords(model, installer);
      case 'territoryIn': {
        const codes = tier1States(model, installer);
        if (codes.length) return h('span', { class: 'codes' }, codes.map((code, k) => [k ? ', ' : '', h('a', { href: stateHash(code), title: stateName(model, code), 'aria-label': stateName(model, code) }, code)]));
        return muted(hasCounties(installer) ? 'Travel only (Tier 2)' : 'Not on the map');
      }
      default: return null;
    }
  };
  return h('tr', { 'data-installer': installer.id, ...attrs },
    columns.map(([key]) => h('td', { 'data-column': key, class: NUMERIC.has(key) ? 'num' : null }, cell(key))));
}

/* ============================================================ Find installers */

function findInstallers(ctx) {
  const { model } = ctx;
  const all = model.installers.length;
  const onMap = model.installers.filter(hasCounties).length;
  const off = all - onMap;
  const states = [...model.stateList].sort((a, b) => F.compareText(String(a.name), String(b.name)));
  return {
    view: 'home',
    tab: 'find',
    title: titled('Find installers'),
    node: h('section', { class: 'find' },
      h('div', { class: 'view-head' },
        h('h2', { class: 'view-title', tabindex: '-1' }, 'Find installers for a project'),
        h('p', { class: 'sub' }, 'Type where the job is, or open a state on the map.')),
      h('div', { class: 'find-halves' },
        h('div', { class: 'panel find-left' },
          locationBox('Project location', LOCATION_HINT),
          h('ul', { class: 'find-counts' },
            h('li', { 'data-count': all }, h('a', { href: toHash({ ...ALL_INSTALLERS, dormant: true, inactive: true }) },
              h('span', { class: 'n' }, F.count(all)), ` ${all === 1 ? 'installer' : 'installers'} in all`)),
            h('li', { 'data-count': onMap }, h('span', { class: 'n' }, F.count(onMap)), ' with counties on the map, at either tier'),
            h('li', { 'data-count': off }, h('a', { href: toHash({ ...ALL_INSTALLERS, dormant: true, inactive: true, mapOff: true }) },
              h('span', { class: 'n' }, F.count(off)), ' not on the map')))),
        h('div', { class: 'panel map-panel map-panel-home' },
          skipLink('home-states', 'Skip the map'),
          mapSlot(homeMapPart(model, ctx.files)))),
      h('details', { class: 'panel state-index', 'data-part': 'states' },
        h('summary', { id: 'home-states' }, h('span', { class: 'chev', 'aria-hidden': 'true' }), 'Every state and Ontario'),
        h('ul', { class: 'state-index-list' }, states.map((s) => {
          const n = model.stateCounts.get(s.code) ?? 0;
          return h('li', {}, h('a', { href: stateHash(s.code), 'data-state-link': s.code },
            h('span', { class: 'state-index-name' }, `${s.name} (${s.code})`)),
          h('span', { class: 'state-index-count', 'data-count': n }, `${installersWord(n)} with territory`));
        })))),
  };
}

/* ============================================================ a place: state, county, ZIP or city */

/** The line at the foot of every place's list: the installers with no county on the map, from the data (section 4.4). */
export function footLine(model) {
  const n = notOnTheMap(model).length;
  const text = n === 1 ? '1 installer is not on the map and may also serve this area.'
    : `${F.count(n)} installers are not on the map and may also serve this area.`;
  return h('p', { class: 'foot-line', 'data-foot': n }, h('a', { href: toHash({ ...ALL_INSTALLERS, dormant: true, inactive: true, mapOff: true }) }, text));
}

/** The tier line under the company in a place's list (section 4.4). */
export function tierLine(model, place, e, listTier) {
  if (place.multi) {
    const names = (ids) => joined(ids.map((id) => countyName(model, id)));
    return listTier === 1 ? `Tier 1 · territory in ${names(e.t1In)}${e.t2In.length ? `, and available for travel to ${names(e.t2In)}` : ''}`
      : `Tier 2 · available for travel to ${names(e.t2In)}`;
  }
  const where = stateName(model, place.state);
  return listTier === 1 ? `Tier 1 · ${F.plural(e.t1, 'county', 'counties')} in ${where}${e.t2 ? `, and available for travel to ${F.count(e.t2)} more` : ''}`
    : `Tier 2 · available for travel to ${F.plural(e.t2, 'county', 'counties')} in ${where}`;
}

/** The lists of a place, in the order of section 4.4. */
function placeListsPart(ctx, place, lists) {
  const { model, mode } = ctx;
  const t1 = lists.tier1;
  const t2 = lists.tier2;
  const rowOfEntry = (e, tier, cols) => row(ctx, e.installer, cols, { from: place.route, tierLine: tierLine(model, place, e, tier), attrs: { 'data-tier': tier } });
  const out = [
    h('section', { class: 'tier tier1', 'data-part': 'tier1' },
      h('h3', { class: 'list-title' }, `Tier 1 · territory includes ${place.where}`),
      t1.length ? table(`${mode}`, columnsFor(mode), t1.map((e) => rowOfEntry(e, 1, columnsFor(mode))))
        : h('p', { class: 'panel note', 'data-nobody': t2.length ? 'tier1' : 'both' }, t2.length ? `No Tier 1 installer serves ${place.full}.` : `No installer serves ${place.full}.`)),
  ];
  if (t2.length) {
    out.push(h('div', { class: 'tier2-bar' },
      h('button', { type: 'button', class: 'tier2-toggle', id: 'tier2-toggle', 'aria-expanded': 'false', 'aria-controls': 'tier2-part', 'data-tier2-toggle': 'true' }, TIER2_SHOW),
      h('p', { class: 'tier2-line' }, `${t2.length === 1 ? '1 installer lists' : `${F.count(t2.length)} installers list`} ${place.where} as Tier 2.`)));
    out.push(h('section', { class: 'tier tier2', id: 'tier2-part', 'data-part': 'tier2', hidden: true },
      h('h3', { class: 'list-title' }, `Tier 2 · available for travel to ${place.where}`),
      table(mode === 'est' ? 'est-t2' : mode, columnsFor(mode, { tier2: true }), t2.map((e) => rowOfEntry(e, 2, columnsFor(mode, { tier2: true }))))));
  } else if (t1.length) {
    out.push(h('p', { class: 'tier2-none', 'data-no-tier2': 'true' }, NO_TIER2_LINE));
  }
  if (lists.dormant.length) {
    out.push(h('section', { class: 'panel side-list', 'data-part': 'dormant' },
      h('h3', { class: 'part-title' }, DORMANT_HEADING),
      h('ul', {}, lists.dormant.map((e) => h('li', { 'data-installer': e.installer.id, 'data-tier': e.tier },
        companyLink(e.installer, [], place.route), h('span', { class: 'side-tier' }, `Tier ${e.tier}`),
        h('span', { class: 'side-office' }, officeLine(e.installer)))))));
  }
  if (lists.offMap.length) {
    out.push(h('section', { class: 'panel side-list', 'data-part': 'offmap' },
      h('h3', { class: 'part-title' }, `Not on the map, with an office in ${joined(lists.states.map((code) => stateName(model, code)), 'or')}`),
      h('ul', {}, lists.offMap.map((i) => h('li', { 'data-installer': i.id },
        companyLink(i, [], place.route),
        filled(isGroup(i.office) ? i.office.city : null) ? h('span', { class: 'side-office' }, String(i.office.city)) : null,
        filled(i.coverageNote) ? h('span', { class: 'side-note' }, h('span', { class: 'inline-label' }, 'Coverage note'), clamp(i.coverageNote)) : null)))));
  }
  out.push(footLine(model));
  return out;
}

/** The summary line under the location bar (section 4.4). */
function summaryLine(model, place, lists) {
  if (place.multi) {
    return h('p', { class: 'summary', 'data-summary': 'counties' }, `${place.name} lies in ${F.plural(place.counties.length, 'county', 'counties')}${place.kind === 'zip' ? ', largest share first' : ''}: `,
      h('span', { class: 'summary-counties' }, place.counties.map((id, k) => {
        const c = model.countyById.get(id);
        return [k ? ' · ' : '', h('a', { href: stateHash(c.state, c.id), 'data-county': c.id }, placeName(model, c.state, c.id))];
      })));
  }
  const n1 = lists.tier1.length;
  const n2 = lists.tier2.length;
  const first = n1 ? `${F.plural(n1, 'installer', 'installers')} with territory in ${place.full}` : `No installer with territory in ${place.full}`;
  const second = n2 ? ` · ${F.count(n2)} ${n1 ? 'more ' : ''}available for travel` : '';
  return h('p', { class: 'summary', 'data-summary': 'counts', 'data-tier1': n1, 'data-tier2': n2 }, `${first}${second}`);
}

/** The location bar (section 4.4): the place's name, its kind, "All of <state>" and "Change location". */
function locationBar(model, heading, tag, allOf) {
  return h('div', { class: 'loc-bar' },
    h('div', { class: 'loc-title' },
      h('h2', { class: 'view-title', tabindex: '-1' }, heading),
      tag ? h('span', { class: 'kind-tag' }, tag) : null,
      allOf ? h('a', { class: 'all-of', href: stateHash(allOf), 'data-show-all': allOf }, `All of ${stateName(model, allOf)}`) : null),
    locationBox('Change location', null));
}

/** The words section 4.9 gives for what the ZIP list leaves out. */
export const ZIP_LEAVES_OUT = 'ZIP codes that are only post office boxes, ZIP codes belonging to a single organization, military ZIP codes, and Canadian postal codes';

/** A ZIP or a city whose file has not come, could not be read, or does not hold it. */
function placeWaiting(ctx, route, state) {
  const zip = route.view === 'zip';
  const what = zip ? `ZIP code ${route.zip}` : 'the city';
  const slot = (s, ...body) => h('div', { class: 'map-slot', 'data-map-slot': zip ? 'zip' : 'city', 'data-map': s }, ...body);
  let body;
  if (state === 'pending') body = slot('pending', h('p', { class: 'panel note' }, `Looking up ${what}…`));
  else if (state === 'failed') body = slot('failed', h('p', { class: 'panel note', 'data-zip-failed': 'true' }, `${zip ? what : 'The city'} could not be looked up. Please try again shortly.`));
  else if (state === 'missing') {
    body = h('div', { class: 'panel note', 'data-zip-missing': 'true' },
      h('p', {}, `ZIP code ${route.zip} is not in the list of ZIP codes.`),
      h('p', {}, `The list leaves out ${ZIP_LEAVES_OUT}.`));
  } else body = h('p', { class: 'panel note', 'data-zip-outside': 'true' }, `ZIP code ${route.zip} is outside the mapped area.`);
  return {
    view: route.view,
    tab: 'find',
    title: titled(zip ? `ZIP ${route.zip}` : 'City'),
    node: h('section', { class: 'place', 'data-kind': state, 'data-zip': zip ? route.zip : null },
      locationBar(ctx.model, zip ? `ZIP ${route.zip}` : 'City', zip ? 'ZIP' : 'City', null), body),
  };
}

/** A place's view (section 4.4): a state, a state with one county chosen, a ZIP code or a city. */
function placeView(ctx, route) {
  const { model } = ctx;
  const r = resolvePlace(model, route, ctx.files);
  if (r.state === 'unknown') return notFound(ctx, route);
  if (r.state !== 'ok') return placeWaiting(ctx, route, r.state);
  const place = r.place;
  const lists = placeLists(model, place.counties ? { state: place.state, counties: place.counties } : { state: place.state });
  const st = stateName(model, place.state);
  return {
    view: route.view,
    tab: 'find',
    title: titled(place.heading),
    node: h('section', { class: 'place', 'data-kind': place.kind, 'data-state': place.state, 'data-county': place.counties && place.counties.length === 1 ? place.counties[0] : null,
      'data-zip': route.view === 'zip' ? route.zip : null, 'data-city': route.view === 'city' ? route.id : null },
    locationBar(model, place.heading, place.tag, place.allOf),
    h('div', { class: 'summary-row' },
      summaryLine(model, place, lists),
      h('div', { class: 'summary-tools' },
        modeSwitch(ctx, route),
        h('button', { type: 'button', class: 'map-toggle', 'aria-expanded': 'true', 'aria-controls': 'map-col', 'data-map-toggle': 'true' }, MAP_HIDE))),
    h('div', { class: 'place-body', 'data-map-open': 'true' },
      h('div', { class: 'lists', id: 'lists' }, placeListsPart(ctx, place, lists)),
      h('aside', { class: 'map-col', id: 'map-col', 'aria-label': `Map of ${st}` },
        h('div', { class: 'panel map-panel map-panel-state' },
          skipLink('county-box', 'Skip the map'),
          mapSlot(countyMapPart(model, place.state, place.chosen, ctx.files)),
          h('label', { class: 'box-label', for: 'county-box' }, `Find a county in ${st}`),
          h('input', { id: 'county-box', class: 'county-box', type: 'text', autocomplete: 'off', spellcheck: 'false', 'data-county-box': place.state,
            'aria-controls': 'county-suggestions', placeholder: 'Type a county\'s name' }),
          h('div', { id: 'county-suggestions', class: 'suggestions', 'aria-live': 'polite' }))))),
  };
}

/* ============================================================ Installer */

/** The five sections of the Installer view and their order in each view (section 4.6). */
export const SECTION_TITLES = Object.freeze({
  contacts: 'Contacts', rates: 'Rates and travel', coverage: 'Coverage', logistics: 'Logistics and locations', documents: 'Documents and record',
});
export const SECTION_ORDER = Object.freeze({
  est: ['contacts', 'rates', 'coverage', 'logistics', 'documents'],
  pm: ['contacts', 'logistics', 'coverage', 'documents', 'rates'],
  rec: ['documents', 'contacts', 'rates', 'coverage', 'logistics'],
});

function addressLines(a) {
  const lines = [];
  if (filled(a.street1)) lines.push(String(a.street1));
  if (filled(a.street2)) lines.push(String(a.street2));
  const cityLine = [a.city, [a.state, a.postalCode].filter(filled).join(' ')].filter(filled).join(', ');
  if (cityLine) lines.push(cityLine);
  if (filled(a.country)) lines.push(String(a.country));
  return h('div', { class: 'address' }, lines.map((l) => h('div', { class: 'line' }, l)));
}

/** The three signals of the overview (section 4.6), each always shown, in words: { key, label, text, flag }. */
export function signalsOf(installer, today) {
  const p = isGroup(installer.paperwork) ? installer.paperwork : {};
  const rates = filled(installer.ratesValidThrough)
    ? (ratesExpired(installer, today) ? { text: `Expired ${F.shortDate(installer.ratesValidThrough)}`, flag: true } : { text: `Valid through ${F.shortDate(installer.ratesValidThrough)}`, flag: false })
    : { text: NOT_GIVEN, flag: false };
  const yesNo = (v) => (v === 'Yes' ? { text: 'On file', flag: false } : v === 'No' ? { text: 'Not on file', flag: true } : filled(v) ? { text: String(v), flag: false } : { text: NOT_RECORDED, flag: true });
  const coi = yesNo(p.coiOnFile);
  if (p.coiOnFile === 'Yes' && filled(p.coiValidThrough)) coi.text = `On file, valid through ${F.shortDate(p.coiValidThrough)}`;
  return [{ key: 'rates', label: 'Rates', ...rates }, { key: 'agreement', label: 'Installer agreement', ...yesNo(p.agreementOnFile) },
    { key: 'coi', label: 'Certificate of insurance', ...coi }];
}

/** Where the installer stands in the place it was opened from, or null (section 4.6). */
function fromWords(model, installer, place) {
  const lists = placeLists(model, place.counties ? { state: place.state, counties: place.counties } : { state: place.state });
  if (lists.tier1.some((e) => e.installer === installer)) return `Tier 1 in ${place.name}`;
  if (lists.tier2.some((e) => e.installer === installer)) return `Tier 2 · available for travel to ${place.name}`;
  if (lists.dormant.some((e) => e.installer === installer)) return DORMANT_HEADING;
  if (lists.offMap.includes(installer)) return `Not on the map, with an office in ${joined(lists.states.map((code) => stateName(model, code)), 'or')}`;
  return null;
}

/** The line naming Joe with his email address as a mail link (sections 4.6 and 4.11). */
const joeLine = (lead, end = '') => h('p', { class: 'joe-line', 'data-joe': 'true' }, `${lead} Tell ${JOE.name}, `, h('a', { href: F.mailHref(JOE.email) }, JOE.email), end);

function installerView(ctx, route) {
  const { model, mode } = ctx;
  const i = model.byId.get(route.id);
  if (!i) return notFound(ctx, route);
  const contacts = contactsOf(i);
  const from = route.from ? resolvePlace(model, route.from, ctx.files) : null;
  const fromPlace = from && from.state === 'ok' ? from.place : null;
  const backName = fromPlace ? fromPlace.name : route.from && route.from.view === 'zip' ? `ZIP ${route.from.zip}` : route.from ? 'your search' : null;
  const fromLine = fromPlace ? fromWords(model, i, fromPlace) : null;
  const confirmed = isConfirmed(i);
  const o = isGroup(i.office) ? i.office : {};

  const overview = h('section', { class: 'panel overview', 'data-part': 'overview' },
    backName && from && from.state !== 'unknown' ? h('p', { class: 'back' }, h('a', { href: toHash(route.from), 'data-back': 'true' }, `Back to ${backName}`)) : null,
    h('div', { class: 'ov-head' },
      h('div', { class: 'ov-title' },
        h('h2', { class: 'view-title company-title', tabindex: '-1' }, filled(i.company) ? String(i.company) : 'Company not recorded'),
        statusTag(i.status), isPending(i) ? pendingTag() : null),
      modeSwitch(ctx, route)),
    h('p', { class: 'ov-line' }, [
      filled(o.city) || filled(o.state) ? h('span', { 'data-ov': 'office' }, officeLine(i)) : null,
      confirmed && filled(i.lastConfirmed) ? h('span', { 'data-field': 'lastConfirmed' }, h('span', { class: 'inline-label' }, 'Last confirmed'), F.shortDate(i.lastConfirmed)) : null,
      filled(i.shopStatus) ? h('span', { 'data-ov': 'shopStatus' }, String(i.shopStatus)) : null,
    ].filter(Boolean).map((x, k) => [k ? h('span', { class: 'sep', 'aria-hidden': 'true' }, ' · ') : null, x])),
    h('dl', { class: 'signals' }, signalsOf(i, ctx.today).map((s) => h('div', { class: 'signal', 'data-signal': s.key },
      h('dt', {}, s.label), h('dd', {}, s.flag ? flag(s.text) : s.text)))),
    fromLine ? h('p', { class: 'from-line', 'data-from': 'true' }, h('span', { class: 'inline-label' }, 'From your search'), fromLine) : null);

  // Contacts.
  const order = contactOrder(i, mode);
  const former = formerContacts(i);
  const contactsBody = [
    order.length ? h('div', { class: 'people' }, order.map((index) => person(i, index, { labels: roleLabels(contacts[index]), full: true })))
      : h('p', { class: 'none-line' }, 'No current contact on record.'),
    former.length ? h('details', { class: 'former' },
      h('summary', {}, h('span', { class: 'chev', 'aria-hidden': 'true' }), `Former contacts (${F.count(former.length)})`),
      h('div', { class: 'people' }, former.map((index) => person(i, index, { labels: roleLabels(contacts[index]), full: true })))) : null,
  ];

  // Rates and travel.
  const rates = isGroup(i.rates) ? i.rates : {};
  const t2 = isGroup(i.tier2Charge) ? i.tier2Charge : {};
  const tiles = [['nonUnionST', 'Non-union ST'], ['nonUnionOT', 'Non-union OT'], ['unionST', 'Union ST'], ['unionOT', 'Union OT']]
    .filter(([k]) => typeof rates[k] === 'number')
    .map(([k, label]) => h('div', { class: 'tile', 'data-field': `rates.${k}` }, h('p', { class: 'tile-label' }, label),
      h('p', { class: 'tile-value' }, F.money(rates[k])), h('p', { class: 'tile-unit' }, 'USD per hour')));
  const naOr = (value, na) => (filled(value) ? String(value) : na === true ? NOT_APPLICABLE : null);
  const travel = naOr(i.travelNote, i.travelNoteNotApplicable);
  const t2Fields = [
    filled(t2.basis) ? field('tier2Charge.basis', 'Tier 2 charge: basis', String(t2.basis), { long: true }) : null,
    filled(t2.unit) ? field('tier2Charge.unit', 'Tier 2 charge: unit', String(t2.unit)) : null,
    filled(t2.unitOther) ? field('tier2Charge.unitOther', 'Tier 2 charge: unit, as described', String(t2.unitOther)) : null,
    typeof t2.amount === 'number' ? field('tier2Charge.amount', 'Tier 2 charge: amount', F.asWritten(t2.amount)) : null,
    filled(t2.relation) ? field('tier2Charge.relation', 'Tier 2 charge: relation', String(t2.relation)) : null,
  ];
  const rateFields = fields(
    filled(i.mobilization) ? field('mobilization', 'Mobilization / demobilization', String(i.mobilization), { long: true }) : null,
    filled(i.ratesValidThrough) ? field('ratesValidThrough', 'Rates valid through', [F.shortDate(i.ratesValidThrough), ratesExpired(i, ctx.today) ? [' ', expiredTag()] : null]) : null,
    filled(i.shopStatus) ? field('shopStatus', 'Shop or labor status', String(i.shopStatus)) : null,
    filled(i.pricingNotes) ? field('pricingNotes', 'Outreach pricing notes', String(i.pricingNotes), { long: true }) : null,
    t2Fields,
    travel !== null ? field('travelNote', 'Travel note', travel, { long: true }) : null);
  const ratesBody = tiles.length || rateFields ? [tiles.length ? h('div', { class: 'tiles' }, tiles) : null, rateFields]
    : h('p', { class: 'none-line' }, 'No rates or travel details on record.');

  // Coverage.
  let coverageBody;
  if (hasCounties(i)) {
    const t = totalsOf(model, i);
    const states = (Array.isArray(i.territory.states) ? i.territory.states : []).filter(isGroup);
    const column = (tier, title, total) => {
      const key = tier === 1 ? 'tier1' : 'tier2';
      const inTier = states.filter((s) => countiesIn(model, i.id, s.state)[key].length > 0);
      return h('div', { class: 'cov-col', 'data-tier': tier },
        h('h4', { class: 'cov-title' }, title),
        h('p', { class: 'cov-total', 'data-total': total }, total ? F.plural(total, 'county', 'counties') : 'None'),
        inTier.map((s) => {
          const names = countiesIn(model, i.id, s.state)[key];
          return h('details', { class: 'state', 'data-state': s.state, 'data-tier': tier },
            h('summary', {}, h('span', { class: 'chev', 'aria-hidden': 'true' }),
              h('span', { class: 'state-name' }, `${stateName(model, s.state)} (${s.state})`),
              h('span', { class: 'state-counts' }, F.plural(names.length, 'county', 'counties'))),
            h('div', { class: 'counties' },
              h('p', { class: 'state-map-link' }, h('a', { href: stateHash(s.state), 'data-state-link': s.state }, `Open the map of ${stateName(model, s.state)}`)),
              h('ul', { class: 'county-list' }, names.map((name) => h('li', {}, name)))));
        }));
    };
    coverageBody = [
      h('div', { class: 'cov-cols' }, column(1, 'Territory (Tier 1)', t.tier1), column(2, 'Available for travel (Tier 2)', t.tier2)),
      filled(i.coverageNote) ? fields(field('coverageNote', 'Coverage note', String(i.coverageNote), { long: true })) : null,
    ];
  } else {
    coverageBody = filled(i.coverageNote)
      ? fields(field('coverageNote', 'Coverage note, not confirmed on the map', String(i.coverageNote), { long: true }))
      : h('p', { class: 'none-line' }, 'Not on the map, and no coverage note on record.');
  }

  // Logistics and locations.
  const shipping = (which) => (Array.isArray(i.shipping) ? i.shipping.find((s) => isGroup(s) && s.which === which) : undefined);
  const ship = (which, key, label, na) => {
    const s = shipping(which);
    if (s) return field(key, label, addressLines(s));
    return na === true ? field(key, label, NOT_APPLICABLE) : null;
  };
  const w = isGroup(i.warehousing) ? i.warehousing : {};
  const receiving = receivingContact(i);
  const logisticsFields = fields(
    isGroup(i.office) ? field('office', 'Office', addressLines(i.office)) : null,
    ship(1, 'shipping', 'Shipping address', i.shippingNotApplicable),
    ship(2, 'secondShipping', 'Second shipping address', i.secondShippingNotApplicable),
    filled(w.available) ? field('warehousing.available', 'Warehousing available', String(w.available)) : null,
    Array.isArray(w.at) && w.at.length ? field('warehousing.at', 'Warehousing at our addresses', w.at.map(String).join(', ')) : null,
    receiving !== null ? h('div', { class: 'field', 'data-derived': 'receiving' }, h('dt', {}, 'Receiving contact'), h('dd', {}, person(i, receiving, { brief: true }))) : null);
  const logisticsBody = logisticsFields || h('p', { class: 'none-line' }, 'No address or warehousing on record.');

  // Documents and record.
  const pw = isGroup(i.paperwork) ? i.paperwork : {};
  const emr = naOr(i.emr, i.emrNotApplicable);
  const documentsBody = [
    fields(
      filled(pw.agreementOnFile) ? field('paperwork.agreementOnFile', 'Installer agreement on file', String(pw.agreementOnFile)) : null,
      filled(pw.coiOnFile) ? field('paperwork.coiOnFile', 'Certificate of insurance on file', String(pw.coiOnFile)) : null,
      filled(pw.coiValidThrough) ? field('paperwork.coiValidThrough', 'Certificate of insurance valid through', F.shortDate(pw.coiValidThrough)) : null,
      emr !== null ? field('emr', 'Current EMR', emr) : null,
      filled(i.status) ? field('status', 'Record status', String(i.status)) : null,
      confirmed && filled(i.lastConfirmed) ? field('lastConfirmed', 'Last confirmed', F.shortDate(i.lastConfirmed)) : null,
      filled(i.notes) ? field('notes', 'Notes / comments', String(i.notes), { long: true }) : null,
      filled(i.anythingElse) ? field('anythingElse', 'Anything else', String(i.anythingElse), { long: true }) : null),
    joeLine('Something wrong here?'),
  ];

  const bodies = { contacts: contactsBody, rates: ratesBody, coverage: coverageBody, logistics: logisticsBody, documents: documentsBody };
  const order2 = SECTION_ORDER[mode];
  return {
    view: 'installer',
    tab: null,
    title: titled(filled(i.company) ? String(i.company) : 'Installer'),
    node: h('div', { class: 'installer', 'data-installer': i.id, 'data-mode': mode },
      overview,
      h('nav', { class: 'jump', 'aria-label': 'Sections of this page' },
        order2.map((key) => h('a', { href: `#sec-${key}`, 'data-jump': `sec-${key}` }, SECTION_TITLES[key]))),
      order2.map((key) => h('section', { class: 'panel part', 'data-part': key, id: `sec-${key}`, tabindex: '-1' },
        h('h3', { class: 'part-title' }, SECTION_TITLES[key]), bodies[key]))),
  };
}

/* ============================================================ All installers */

/** What can be searched, listed when a search finds nothing. */
export const SEARCHABLE = [
  'Company name, from the start of any word',
  'Contact name, from the start of any word, including people who have left',
  'Email address, from the start of any word of it, or any part once what you type holds an @ or a period',
  'Phone number, by its digits',
  'Office city, from the start of any word',
  'State, by its full name or its two-letter code: an office in that state, or territory there',
  'ZIP code, by its five digits: opens the ZIP code\'s own view',
];

/** The counts beside the boxes of All installers (section 4.7), from the data. */
export function boxCounts(model) {
  return {
    dormant: model.installers.filter(isDormant).length,
    inactive: model.installers.filter(isOnHold).length,
    map: notOnTheMap(model).length,
  };
}

/** The installers All installers lists for a route, in the order of the file: { shown, search }. */
export function installersShown(model, route) {
  const r = route.q ? search(model, route.q) : null;
  const searching = Boolean(r && (r.kind === 'results' || r.kind === 'none'));
  const office = (i) => !route.office || officeStateIs(model, isGroup(i.office) ? i.office.state : undefined, route.office);
  const territory = (i) => !route.territory || tier1States(model, i).includes(route.territory);
  const mapOk = (i) => !route.mapOff || !hasCounties(i);
  if (searching) {
    const matches = new Map(r.results.map((x) => [x.installer.id, x.matches]));
    return { shown: model.installers.filter((i) => matches.has(i.id) && office(i) && territory(i) && mapOk(i)), search: r, matches, searching };
  }
  const statusOk = (i) => isListed(i) || (route.dormant && isDormant(i)) || (route.inactive && isOnHold(i));
  return { shown: model.installers.filter((i) => statusOk(i) && office(i) && territory(i) && mapOk(i)), search: r, matches: new Map(), searching };
}

function installersView(ctx, route) {
  const { model, mode } = ctx;
  if ((route.office && !knownState(model, route.office)) || (route.territory && !knownState(model, route.territory))) return notFound(ctx, route);
  const counts = boxCounts(model);
  const { shown, search: r, matches, searching } = installersShown(model, route);
  const total = model.installers.length;
  const states = [...model.stateList].sort((a, b) => F.compareText(String(a.name), String(b.name)));
  const select = (key, label, value) => h('div', { class: 'filter' },
    h('label', { class: 'filter-label', for: `f-${key}` }, label),
    h('select', { id: `f-${key}`, class: 'filter-select', 'data-filter': key },
      h('option', { value: '', selected: !value }, 'Any state'),
      states.map((s) => h('option', { value: s.code, selected: value === s.code }, String(s.name)))));
  const box = (key, label, checked, n) => h('label', { class: 'box', for: `f-${key}` },
    h('input', { type: 'checkbox', id: `f-${key}`, 'data-filter': key, checked }), h('span', {}, label), h('span', { class: 'count', 'data-count': n }, F.count(n)));
  const columns = columnsFor(mode, { all: true });
  let note = null;
  if (r && r.kind === 'zip') note = h('p', { class: 'panel note', 'data-zip-note': 'true' }, `${r.q} is a ZIP code. `, h('a', { href: zipHash(r.q) }, `Open ZIP ${r.q}`));
  if (r && r.kind === 'short') note = h('p', { class: 'panel note' }, 'Type two or more characters to search.');
  const stateLink = searching && r.state ? h('p', { class: 'panel note state-link', 'data-state-link': r.state },
    h('a', { href: stateHash(r.state) }, `Open the map of ${stateName(model, r.state)}`)) : null;
  let body;
  if (shown.length) {
    body = table(`${mode}-all`, columns, shown.map((i) => row(ctx, i, columns, { marks: matches.get(i.id) || [], searching,
      attrs: searching ? { 'data-matched-on': (matches.get(i.id) || []).map((m) => m.field).join(' ') } : {} })));
  } else if (searching) {
    body = [h('p', { class: 'panel note', 'data-no-match': 'true' }, `No installer matches “${r.q}”.`),
      h('div', { class: 'panel can-search' }, h('p', {}, 'You can search by:'), h('ul', {}, SEARCHABLE.map((s) => h('li', {}, s))))];
  } else {
    body = h('p', { class: 'panel note', 'data-no-match': 'filters' }, 'No installer matches these choices.');
  }
  return {
    view: 'installers',
    tab: 'all',
    title: titled(searching ? `All installers: ${r.q}` : 'All installers'),
    node: h('section', { class: 'directory', 'data-mode': mode, 'data-searching': searching ? 'true' : null },
      h('div', { class: 'view-head' }, h('h2', { class: 'view-title', tabindex: '-1' }, 'All installers')),
      h('div', { class: 'panel filters', role: 'group', 'aria-label': 'Choose which installers are listed' },
        select('office', 'Office in', route.office),
        select('territory', 'Territory in', route.territory),
        h('fieldset', { class: 'filter boxes' }, h('legend', { class: 'filter-label' }, 'Also show'),
          box('dormant', DORMANT_HEADING, route.dormant, counts.dormant),
          box('inactive', 'Inactive or on hold', route.inactive, counts.inactive)),
        h('fieldset', { class: 'filter boxes' }, h('legend', { class: 'filter-label' }, 'Narrow to'),
          box('map', 'Not on the map', route.mapOff, counts.map))),
      h('div', { class: 'summary-row' },
        h('p', { class: 'summary count-line', 'data-shown': shown.length, 'data-total': total },
          `Showing ${F.count(shown.length)} of ${F.count(total)}`, searching ? h('span', {}, ` matching “${r.q}”`) : null),
        h('div', { class: 'summary-tools' }, modeSwitch(ctx, route))),
      note, stateLink, body),
  };
}

/* ============================================================ About this data */

export const COUNT_LABELS = [
  ['installers', 'Installers'], ['contacts', 'Contacts, including those who have left'], ['territoryRows', 'Territory rows'],
  ['duplicateTerritoryRows', 'Territory rows that repeat an installer and county'],
  ['installersWithTerritory', 'Installers with counties on the map, at either tier'],
  ['installersWithoutTerritory', 'Installers not on the map'], ['countiesCovered', 'Counties with an installer, at either tier'],
];
export const GAP_LABELS = [
  ['noQuoting', 'Installers with no quoting contact'], ['noScheduling', 'Installers with no scheduling contact'],
  ['neither', 'Installers with neither'],
];

/** The makers of the map, ZIP and city files, credited on About this data (ruling 5 of the second prompt; section 4.11). */
export const MAP_CREDITS = [
  'County and state outlines: U.S. Census Bureau, 2025 cartographic boundary files.',
  'Ontario census divisions: adapted from Statistics Canada, 2021 Census boundary files. This does not constitute an endorsement by Statistics Canada of this product.',
  'ZIP codes: U.S. Census Bureau, 2020 ZIP Code Tabulation Area to county relationship file. A Census ZIP area is close to, but not exactly, the area the Postal Service delivers to.',
  ...(CITIES_BUILT ? ['Cities: the place list of INFINIUM\'s installer application form.'] : []),
];

/** The counts the page works out itself (section 4.11): [{ key, label, value }]. */
export function pageCounts(model) {
  const t = (i) => totalsOf(model, i);
  return [
    { key: 'page:tier1', label: 'Installers with territory (Tier 1)', value: model.installers.filter((i) => t(i).tier1 > 0).length },
    { key: 'page:travelOnly', label: 'Installers available for travel only (Tier 2)', value: model.installers.filter((i) => t(i).tier1 === 0 && t(i).tier2 > 0).length },
    ...STATUS_ORDER.map((s) => ({ key: `status:${s}`, label: null, status: s, value: model.installers.filter((i) => i.status === s).length })),
  ];
}

function aboutView(ctx) {
  const { build } = ctx.model;
  const ms = F.builtAtMs(build.builtAt);
  const when = F.easternDateTime(ms);
  const fresh = freshness(build, ctx.now);
  const counts = isGroup(build.counts) ? build.counts : {};
  const gaps = isGroup(build.gaps) ? build.gaps : {};
  const num = (v) => (typeof v === 'number' ? F.count(v) : '');
  const statRow = (key, label, value) => h('tr', { 'data-count': key }, h('th', { scope: 'row' }, label), h('td', {}, value));
  const checks = Array.isArray(build.checks) ? build.checks.filter(isGroup) : [];
  const result = (c) => (c.skipped === true ? 'Skipped for this run' : c.passed === true ? 'Passed' : 'Did not pass');
  return {
    view: 'about',
    tab: null,
    title: titled('About this data'),
    node: h('section', { class: 'about' },
      h('div', { class: 'view-head' },
        h('h2', { class: 'view-title', tabindex: '-1' }, 'About this data'),
        h('p', { class: 'sub' }, 'Where the installer records come from, how current they are, and what was checked.')),
      h('section', { class: 'panel part', 'data-part': 'refresh' },
        h('h3', { class: 'part-title' }, 'Last refresh'),
        h('p', { class: 'big-line', 'data-built-at': build.builtAt },
          `${when.date}, at ${when.time} ${when.zoneName}.`, fresh.stale ? [' ', h('span', { class: 'tag tag-dark' }, 'Out of date')] : null),
        h('p', {}, 'A job on GitHub reads the three installer tables in QuickBase once a day, checks what it read, and saves the files this page reads. The page never calls QuickBase. A change made in QuickBase shows here after the next refresh.')),
      h('div', { class: 'about-grid' },
        h('section', { class: 'panel part', 'data-part': 'counts' },
          h('h3', { class: 'part-title' }, 'Counts from the refresh'),
          h('table', { class: 'stats' }, h('tbody', {}, COUNT_LABELS.map(([k, label]) => statRow(k, label, num(counts[k])))))),
        h('section', { class: 'panel part', 'data-part': 'page-counts' },
          h('h3', { class: 'part-title' }, 'Counts the page works out'),
          h('table', { class: 'stats' }, h('tbody', {},
            pageCounts(ctx.model).map((c) => statRow(c.key, c.label || h('span', {}, 'Status: ', statusTag(c.status)), num(c.value))))),
          h('p', { class: 'part-sub' }, 'Territory is the counties an installer chose as Tier 1. Its Tier 2 counties are where it is available for travel.')),
        h('section', { class: 'panel part', 'data-part': 'gaps' },
          h('h3', { class: 'part-title' }, 'Contact gaps'),
          h('table', { class: 'stats' }, h('tbody', {}, GAP_LABELS.map(([k, label]) => statRow(`gap:${k}`, label, num(gaps[k]))))),
          h('p', { class: 'part-sub' }, 'Departed contacts are left out of these counts. Where a role is missing, a row shows the next-best contact with their own role, and a marker.')),
        h('section', { class: 'panel part', 'data-part': 'checks' },
          h('h3', { class: 'part-title' }, 'The checks of this refresh'),
          h('table', { class: 'stats checks' },
            h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Check'), h('th', { scope: 'col' }, 'Name'), h('th', { scope: 'col' }, 'Result'))),
            h('tbody', {}, checks.map((c) => h('tr', { 'data-check': c.check }, h('td', {}, num(c.check)), h('td', {}, String(c.name ?? '')),
              h('td', { 'data-result': c.skipped === true ? 'skipped' : c.passed === true ? 'passed' : 'failed' }, result(c)))))))),
      h('section', { class: 'panel part', 'data-part': 'maps' },
        h('h3', { class: 'part-title' }, 'Where the maps come from'),
        MAP_CREDITS.map((line) => h('p', { class: 'credit' }, line))),
      h('section', { class: 'panel part', 'data-part': 'wrong' },
        joeLine('Something wrong in a record?', '.'))),
  };
}

/* ============================================================ not found, and data that cannot be loaded */

function notFound(ctx, route) {
  const what = route.view === 'installer' ? 'No installer with this address is in the data.'
    : ['state', 'zip', 'city'].includes(route.view) ? 'No place with this address is on the map.' : 'There is no view at this address.';
  return {
    view: 'notFound',
    tab: null,
    title: titled('Not found'),
    node: h('section', { class: 'not-found' },
      h('div', { class: 'view-head' }, h('h2', { class: 'view-title', tabindex: '-1' }, 'Not found'), h('p', { class: 'sub' }, what)),
      h('p', {}, h('a', { class: 'btn', href: toHash({ view: 'home' }) }, 'Go to Find installers'))),
  };
}

/** The view the page shows when the data cannot be loaded. It never shows an empty directory. */
export function dataErrorView() {
  return {
    view: 'error',
    tab: null,
    title: titled('Data could not be loaded'),
    node: h('section', { class: 'panel data-error', role: 'alert' },
      h('h2', { class: 'view-title', tabindex: '-1' }, 'The installer data could not be loaded'),
      h('p', {}, 'Please try again shortly.')),
  };
}

/**
 * The view for a route: { view, tab, title, node }. now is the time in milliseconds, handed in,
 * so that "today" (ruling 7) and the out-of-date line (ruling 8) can be tested. files holds what
 * has come of the files filesFor names. mode is the view of the view switch to draw: the address's
 * view=, or the one the browser remembers; Estimating when neither is handed in.
 */
export function renderView(route, model, { now = Date.now(), files = {}, mode = null } = {}) {
  const ctx = { model, now, today: F.easternDate(now), ids: 0, view: route.view, files, mode: modeOf(route.mode || mode) };
  switch (route.view) {
    case 'home': return findInstallers(ctx);
    case 'installers': return installersView(ctx, route);
    case 'installer': return installerView(ctx, route);
    case 'state': case 'zip': case 'city': return placeView(ctx, route);
    case 'about': return aboutView(ctx);
    default: return notFound(ctx, route);
  }
}
