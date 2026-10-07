/**
 * The words and the layout of every view, as plain functions: each takes the data and the route
 * and gives back { view, title, node }, where node is a tree of elements (html.js). They touch
 * no browser object, so node can load them and test them; app.js puts the result on the page.
 *
 * Sections 4.1 to 4.9 of docs\SPEC.md say what each view shows, with the rulings of the page's
 * first and second prompts. A field with no value is left out, never shown as a dash.
 *
 * A view with a map, or a ZIP code to look up, needs a file that is fetched only then: filesFor
 * says which, and renderView and mapPart are handed what has come so far, as
 * files = { path: { state: 'loading' | 'ok' | 'failed', doc } }. The list shows at once and the
 * map when its file has come; the map's part is marked pending, drawn or failed.
 */
import { h } from './html.js';
import * as F from './format.js';
import { countiesIn, countyCount, countyMapPath, HOME_MAP, notOnTheMap, placeName, stateName, zipPath } from './data.js';
import { search } from './search.js';
import { contactsOf, NO_ROLE, rolesOf, rowOf } from './contacts.js';
import { installerHash, isZip, stateHash, toHash } from './routes.js';
import { countyMap, countyMapUsable, homeMap, homeMapUsable, installersWord, legend } from './maps.js';

export const SITE = 'Installer Index';
export const CONFIRMED = 'CONFIRMED BY PARTNER';
/** Ruling 8: the data is out of date when builtAt is more than this many hours old. */
export const STALE_HOURS = 36;
const HOUR = 3600 * 1000;

const isGroup = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const filled = (v) => v !== undefined && v !== null && v !== '';
const titled = (what) => (what ? `${what} — ${SITE}` : SITE);

/* ============================================================ small parts */

/** A text with one stretch of it marked: [before, <mark>, after]. */
function marked(text, range) {
  const s = String(text);
  if (!range) return s;
  const [a, b] = range;
  return [s.slice(0, a), h('mark', {}, s.slice(a, b)), s.slice(b)];
}

/** The status, in words. CONFIRMED BY PARTNER carries a small green dot. */
export function statusTag(status) {
  if (!filled(status)) return null;
  return h('span', { class: 'status', 'data-status': status },
    status === CONFIRMED ? h('span', { class: 'dot', 'aria-hidden': 'true' }) : null, String(status));
}

/** Ruling 7: rates have expired when the valid-through date is before today, in Eastern time. */
export function ratesExpired(installer, today) {
  const d = installer.ratesValidThrough;
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && d < today;
}

const expiredTag = () => h('span', { class: 'tag tag-dark', 'data-expired': 'true' }, 'Rates expired');

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

/** A section with a heading, as a panel. */
function part(key, title, ...body) {
  return h('section', { class: 'panel part', 'data-part': key },
    h('h3', { class: 'part-title' }, title), ...body);
}

/** One labeled field of the Installer view: the label over its value. */
function field(key, label, value, { long = false } = {}) {
  return h('div', { class: long ? 'field field-long' : 'field', 'data-field': key },
    h('dt', {}, label), h('dd', { class: long ? 'long' : null }, value));
}

const fields = (...items) => {
  const kept = items.filter(Boolean);
  return kept.length ? h('dl', { class: 'fields' }, kept) : null;
};

/* ============================================================ contacts */

const roleLabels = (c) => (rolesOf(c).length ? rolesOf(c) : [NO_ROLE]);

/**
 * One person: role, name, title, phone, email, second email and procedure (ruling 6), each
 * when filled. full adds what the Installer view shows: departed and who confirmed the record.
 */
function person(installer, index, { labels, marks = [], full = false, departedShown = false } = {}) {
  const c = isGroup(contactsOf(installer)[index]) ? contactsOf(installer)[index] : {};
  const mark = (fieldName, value) => {
    const m = marks.find((x) => x.contact === index && x.field === fieldName);
    return marked(value, m && m.range);
  };
  const tags = [];
  if (c.departed === true && (full || departedShown)) tags.push(h('span', { class: 'tag tag-dark', 'data-departed': 'true' }, 'Departed'));
  if (c.confirmedRecord === true && full) tags.push(h('span', { class: 'tag tag-light', 'data-confirmed-record': 'true' }, 'Confirmed the record'));
  return h('div', { class: 'person', 'data-contact': index },
    labels && labels.length ? h('p', { class: 'role' }, labels.map((l) => h('span', {}, l))) : null,
    h('p', { class: 'name' }, filled(c.name) ? mark('name', c.name) : 'Name not recorded'),
    tags.length ? h('p', { class: 'tags' }, tags) : null,
    filled(c.title) ? h('p', { class: 'title' }, String(c.title)) : null,
    filled(c.phone) ? h('p', { class: 'reach' }, h('a', { href: F.telHref(c.phone) }, mark('phone', c.phone))) : null,
    filled(c.email) ? h('p', { class: 'reach' }, h('a', { href: F.mailHref(c.email) }, mark('email', c.email))) : null,
    filled(c.email2) ? h('p', { class: 'reach' }, h('a', { href: F.mailHref(c.email2) }, mark('email2', c.email2))) : null,
    filled(c.procedure) ? h('p', { class: 'procedure', 'data-procedure': 'true' }, h('span', { class: 'inline-label' }, 'Procedure'), String(c.procedure)) : null,
  );
}

/**
 * A row's contacts, wherever a row shows them (section 4.8): the two places as the job chose
 * them, with the markers; then, in a search result, any matched contact who is not on the row;
 * then "Show all contacts", which opens the rest in place.
 */
function rowContacts(ctx, installer, { marks = [] } = {}) {
  const r = rowOf(installer);
  const onRow = new Set(r.places.filter((p) => p.contact !== null).map((p) => p.contact));
  const matchedOff = [...new Set(marks.filter((m) => Number.isInteger(m.contact) && !onRow.has(m.contact)).map((m) => m.contact))];
  const rest = r.rest.filter((i) => !matchedOff.includes(i));
  const id = `more-${ctx.view}-${++ctx.ids}`;
  return h('div', { class: 'contacts', 'data-standins': r.standIns, 'data-nobody': r.nobody, 'data-both': r.oneInBoth ? 1 : 0 },
    r.marker ? h('p', { class: 'marker', 'data-marker': 'both' }, r.marker) : null,
    h('div', { class: 'places' }, r.places.map((p) => {
      if (p.contact === null) return p.marker ? h('div', { class: 'place nobody', 'data-place': p.key }, h('p', { class: 'marker', 'data-marker': p.key }, p.marker)) : null;
      return h('div', { class: 'place', 'data-place': p.key, 'data-standin': p.standIn ? 'true' : null },
        p.marker ? h('p', { class: 'marker', 'data-marker': p.key }, p.marker) : null,
        person(installer, p.contact, { labels: p.labels, marks }));
    })),
    matchedOff.length ? h('div', { class: 'matched-contacts', 'data-matched-contacts': 'true' },
      h('p', { class: 'matched-label' }, matchedOff.length === 1 ? 'Matched contact' : 'Matched contacts'),
      matchedOff.map((i) => person(installer, i, { labels: roleLabels(contactsOf(installer)[i]), marks, departedShown: true }))) : null,
    rest.length ? [
      h('button', { type: 'button', class: 'more-toggle', 'aria-expanded': 'false', 'aria-controls': id, 'data-more': id },
        h('span', { class: 'chev', 'aria-hidden': 'true' }), `Show all contacts (${F.count(rest.length)} more)`),
      h('div', { id, class: 'more', hidden: true },
        rest.map((i) => person(installer, i, { labels: roleLabels(contactsOf(installer)[i]) }))),
    ] : null);
}

/* ============================================================ the frame */

/**
 * The line under the search bar: the date of builtAt in Eastern time, linking to About this
 * data. Ruling 8: when builtAt is more than 36 hours old it says so, with a label.
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
      h('a', { href: toHash({ view: 'about' }) }, text),
      stale ? h('span', { class: 'tag tag-dark', 'data-out-of-date': 'true' }, 'Out of date') : null),
  };
}

const heading = (text, sub) => h('div', { class: 'view-head' },
  h('h2', { class: 'view-title', tabindex: '-1' }, text),
  sub ? h('p', { class: 'sub' }, h('span', { class: 'solid' }, sub)) : null);

/* ============================================================ the views */

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
    return { key: 'county', state: 'failed', node: h('p', { class: 'map-note', 'data-map-failed': 'true' }, 'The map could not be drawn. The list below still shows every installer.') };
  }
  return { key: 'county', state: 'drawn', node: [countyMap(model, code, f.doc, chosen), legend('Installers serving the county')] };
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

/** The ZIP a route asks for: a ZIP's own address, or a search for five digits. */
const zipOf = (route) => (route.view === 'zip' ? route.zip : route.view === 'search' && isZip(route.q) ? String(route.q).trim() : null);

/** The one listed county of a ZIP that is in exactly one county, or null. */
function soleCounty(model, entry) {
  if (!entry || !Array.isArray(entry.counties) || entry.counties.length !== 1) return null;
  return model.countyById.get(entry.counties[0]) || null;
}

/**
 * The files an address needs, beyond the four the page loads at the start: [{ path, part }].
 * part is 'map' for a file that only draws the map, 'content' for one the view's list waits on.
 */
export function filesFor(route, model, files = {}) {
  if (route.view === 'home') return [{ path: HOME_MAP, part: 'map' }];
  if (route.view === 'state') {
    if (!knownState(model, route.code) || (route.county && !knownCounty(model, route.code, route.county))) return [];
    return [{ path: countyMapPath(route.code), part: 'map' }];
  }
  const zip = zipOf(route);
  if (!zip) return [];
  const out = [{ path: zipPath(zip), part: 'content' }];
  const z = zipLookup(files, zip);
  const sole = z.state === 'ok' ? soleCounty(model, z.entry) : null;
  if (sole) out.push({ path: countyMapPath(sole.state), part: 'map' });
  return out;
}

/** The map's part of the view for a route, as files stand: null for a view with no map. */
export function mapPart(route, model, files = {}) {
  if (route.view === 'home') return homeMapPart(model, files);
  if (route.view === 'state') {
    if (!knownState(model, route.code) || (route.county && !knownCounty(model, route.code, route.county))) return null;
    return countyMapPart(model, route.code, route.county, files);
  }
  const zip = zipOf(route);
  if (!zip) return null;
  const z = zipLookup(files, zip);
  const sole = z.state === 'ok' ? soleCounty(model, z.entry) : null;
  return sole ? countyMapPart(model, sole.state, sole.id, files) : null;
}

/* ============================================================ the views */

function home(ctx) {
  const { model } = ctx;
  const all = model.installers.length;
  const off = notOnTheMap(model).length;
  const button = (href, label, n) => h('a', { class: 'btn btn-big', href, 'data-count': n },
    h('span', {}, label), h('span', { class: 'count' }, F.count(n)));
  const states = [...model.stateList].sort((a, b) => F.compareText(String(a.name), String(b.name)));
  return {
    view: 'home',
    title: SITE,
    node: h('section', { class: 'home' },
      heading('Find an installer', 'Search above by company, contact, email, phone, office city, state or ZIP code, or open a state on the map or a list.'),
      h('div', { class: 'panel map-panel map-panel-home' },
        skipLink('home-after-map', 'Skip the map'),
        mapSlot(homeMapPart(model, ctx.files))),
      h('div', { class: 'home-buttons', id: 'home-after-map', tabindex: '-1' },
        button(toHash({ view: 'installers', set: 'contact', status: null }), 'All installers', all),
        button(toHash({ view: 'notOnMap' }), 'Not on the map', off)),
      h('section', { class: 'panel part state-index', 'data-part': 'states' },
        h('h3', { class: 'part-title' }, 'Every state and Ontario'),
        h('ul', { class: 'state-index-list' }, states.map((s) => {
          const n = model.stateCounts.get(s.code) ?? 0;
          return h('li', {}, h('a', { href: stateHash(s.code), 'data-state-link': s.code },
            h('span', { class: 'state-index-name' }, `${s.name} (${s.code})`)),
          h('span', { class: 'state-index-count', 'data-count': n }, installersWord(n)));
        })))),
  };
}

export const CONTACT_COLUMNS = [
  ['company', 'Company'], ['status', 'Status'], ['office', 'Office city and state'], ['contacts', 'Contacts by role'],
  ['states', 'States covered'],
];
export const RATE_COLUMNS = [
  ['company', 'Company'], ['status', 'Status'], ['nonUnionST', 'Non-union ST'], ['nonUnionOT', 'Non-union OT'],
  ['unionST', 'Union ST'], ['unionOT', 'Union OT'], ['mobilization', 'Mobilization'],
  ['ratesValidThrough', 'Rates valid through'], ['shopStatus', 'Shop or labor status'],
];

/** The five statuses in the order build.json gives them, each with its count. */
function statusesOf(model) {
  const by = model.build && model.build.counts && Array.isArray(model.build.counts.byStatus) ? model.build.counts.byStatus : [];
  return by.filter((s) => isGroup(s) && filled(s.status)).map((s) => ({ status: String(s.status), installers: s.installers }));
}

function companyLink(installer, marks = []) {
  const m = marks.find((x) => x.field === 'company');
  return h('a', { class: 'company', href: installerHash(installer.id) },
    filled(installer.company) ? marked(installer.company, m && m.range) : 'Company not recorded');
}

function rateCell(installer, key) {
  const rates = isGroup(installer.rates) ? installer.rates : {};
  return typeof rates[key] === 'number' ? F.money(rates[key]) : null;
}

function statesCovered(ctx, installer) {
  if (!isGroup(installer.territory) || !Array.isArray(installer.territory.states)) return h('span', { class: 'off-map' }, 'Not on the map');
  const codes = installer.territory.states.filter(isGroup).map((s) => String(s.state));
  return h('span', { class: 'codes' }, codes.map((code, i) => [i ? ', ' : '',
    h('a', { href: stateHash(code), title: stateName(ctx.model, code), 'aria-label': stateName(ctx.model, code) }, code)]));
}

function directoryCell(ctx, installer, key) {
  switch (key) {
    case 'company': return companyLink(installer);
    case 'status': return statusTag(installer.status);
    case 'office': return officeLine(installer);
    case 'contacts': return rowContacts(ctx, installer);
    case 'states': return statesCovered(ctx, installer);
    case 'mobilization': return filled(installer.mobilization) ? String(installer.mobilization) : null;
    case 'ratesValidThrough': return filled(installer.ratesValidThrough)
      ? [h('span', { class: 'date' }, F.longDate(installer.ratesValidThrough)), ratesExpired(installer, ctx.today) ? [' ', expiredTag()] : null] : null;
    case 'shopStatus': return filled(installer.shopStatus) ? String(installer.shopStatus) : null;
    default: return rateCell(installer, key);
  }
}

function table(kind, columns, rows) {
  return h('div', { class: 'panel table-panel' },
    h('table', { class: `grid grid-${kind}` },
      h('colgroup', {}, columns.map(([key]) => h('col', { class: `c-${key}` }))),
      h('thead', {}, h('tr', {}, columns.map(([key, label]) => h('th', { scope: 'col', 'data-column': key }, label)))),
      h('tbody', {}, rows)));
}

function installersView(ctx, route) {
  const { model } = ctx;
  const statuses = statusesOf(model);
  if (route.status && !statuses.some((s) => s.status === route.status)) return notFound(ctx, route);
  const list = route.status ? model.installers.filter((i) => i.status === route.status) : model.installers;
  const set = route.set === 'rates' ? 'rates' : 'contact';
  const columns = set === 'rates' ? RATE_COLUMNS : CONTACT_COLUMNS;
  const total = model.installers.length;
  const sub = route.status ? `${F.count(list.length)} of ${F.plural(total, 'installer', 'installers')}: ${route.status}.`
    : `${F.plural(total, 'installer', 'installers')}, in order of company name.`;
  const link = (r, label, chosen, extra = null) => h('a', { class: `btn${chosen ? ' chosen' : ''}`, href: toHash(r), 'aria-current': chosen ? 'true' : null },
    h('span', {}, label), extra);
  return {
    view: 'installers',
    title: titled(route.status ? `All installers: ${route.status}` : 'All installers'),
    node: h('section', { class: 'directory', 'data-set': set, 'data-status': route.status || null },
      heading('All installers', sub),
      h('div', { class: 'controls' },
        h('div', { class: 'control-group', role: 'group', 'aria-label': 'Columns' },
          h('span', { class: 'control-label', 'aria-hidden': 'true' }, 'Columns'),
          h('div', { class: 'control-buttons' },
            link({ view: 'installers', set: 'contact', status: route.status }, 'Contact info', set === 'contact'),
            link({ view: 'installers', set: 'rates', status: route.status }, 'Rates', set === 'rates'))),
        h('div', { class: 'control-group', role: 'group', 'aria-label': 'Record status' },
          h('span', { class: 'control-label', 'aria-hidden': 'true' }, 'Status'),
          h('div', { class: 'control-buttons' },
            link({ view: 'installers', set, status: null }, 'All', !route.status, h('span', { class: 'count' }, F.count(total))),
            statuses.map((s) => link({ view: 'installers', set, status: s.status }, s.status, route.status === s.status,
              h('span', { class: 'count' }, Number.isInteger(s.installers) ? F.count(s.installers) : '')))))),
      table(set, columns, list.map((installer) => h('tr', { 'data-installer': installer.id },
        columns.map(([key]) => h('td', { 'data-column': key }, directoryCell(ctx, installer, key))))))),
  };
}

function addressLines(a) {
  const lines = [];
  if (filled(a.street1)) lines.push(String(a.street1));
  if (filled(a.street2)) lines.push(String(a.street2));
  const cityLine = [a.city, [a.state, a.postalCode].filter(filled).join(' ')].filter(filled).join(', ');
  if (cityLine) lines.push(cityLine);
  if (filled(a.country)) lines.push(String(a.country));
  return h('div', { class: 'address' }, lines.map((l) => h('div', { class: 'line' }, l)));
}

const NOT_APPLICABLE = 'Not applicable';

function installerView(ctx, route) {
  const { model } = ctx;
  const i = model.byId.get(route.id);
  if (!i) return notFound(ctx, route);
  const contacts = contactsOf(i);
  const shipping = (which) => (Array.isArray(i.shipping) ? i.shipping.find((s) => isGroup(s) && s.which === which) : undefined);
  const rates = isGroup(i.rates) ? i.rates : {};
  const t2 = isGroup(i.tier2Charge) ? i.tier2Charge : {};
  const w = isGroup(i.warehousing) ? i.warehousing : {};
  const pw = isGroup(i.paperwork) ? i.paperwork : {};
  const hasTerritory = isGroup(i.territory) && Array.isArray(i.territory.states) && i.territory.states.length > 0;
  const confirmed = i.status === CONFIRMED;

  const top = h('section', { class: 'panel part top', 'data-part': 'top' },
    h('p', { class: 'back' }, h('a', { href: toHash({ view: 'installers', set: 'contact', status: null }) }, 'All installers')),
    h('h2', { class: 'view-title company-title', tabindex: '-1' }, filled(i.company) ? String(i.company) : 'Company not recorded'),
    h('div', { class: 'top-line' },
      statusTag(i.status),
      confirmed && filled(i.lastConfirmed)
        ? h('span', { class: 'last-confirmed', 'data-field': 'lastConfirmed' }, h('span', { class: 'inline-label' }, 'Last confirmed'), F.longDate(i.lastConfirmed))
        : null));

  const contactsPart = contacts.length ? part('contacts', 'Contacts',
    h('div', { class: 'people' }, contacts.map((c, index) => person(i, index, { labels: roleLabels(c), full: true })))) : null;

  const ship = (which, key, label, na) => {
    const s = shipping(which);
    if (s) return field(key, label, addressLines(s));
    return na === true ? field(key, label, NOT_APPLICABLE) : null;
  };
  const addressFields = fields(
    isGroup(i.office) ? field('office', 'Office', addressLines(i.office)) : null,
    ship(1, 'shipping', 'Shipping address', i.shippingNotApplicable),
    ship(2, 'secondShipping', 'Second shipping address', i.secondShippingNotApplicable));
  const addressesPart = addressFields ? part('addresses', 'Addresses', addressFields) : null;

  const tiles = [['nonUnionST', 'Non-union ST'], ['nonUnionOT', 'Non-union OT'], ['unionST', 'Union ST'], ['unionOT', 'Union OT']]
    .filter(([k]) => typeof rates[k] === 'number')
    .map(([k, label]) => h('div', { class: 'tile', 'data-field': `rates.${k}` }, h('p', { class: 'tile-label' }, label), h('p', { class: 'tile-value' }, F.money(rates[k]))));
  const rateFields = fields(
    filled(i.mobilization) ? field('mobilization', 'Mobilization / demobilization', String(i.mobilization), { long: true }) : null,
    filled(i.ratesValidThrough) ? field('ratesValidThrough', 'Rates valid through',
      [F.longDate(i.ratesValidThrough), ratesExpired(i, ctx.today) ? [' ', expiredTag()] : null]) : null,
    filled(i.shopStatus) ? field('shopStatus', 'Shop or labor status', String(i.shopStatus)) : null,
    filled(i.pricingNotes) ? field('pricingNotes', 'Pricing notes', String(i.pricingNotes), { long: true }) : null);
  const ratesPart = tiles.length || rateFields ? part('rates', 'Rates', tiles.length ? h('div', { class: 'tiles' }, tiles) : null, rateFields) : null;

  const t2Fields = fields(
    filled(t2.basis) ? field('tier2Charge.basis', 'Basis', String(t2.basis), { long: true }) : null,
    filled(t2.unit) ? field('tier2Charge.unit', 'Charge unit', String(t2.unit)) : null,
    filled(t2.unitOther) ? field('tier2Charge.unitOther', 'Charge unit, as described', String(t2.unitOther)) : null,
    typeof t2.amount === 'number' ? field('tier2Charge.amount', 'Charge amount', F.asWritten(t2.amount)) : null,
    filled(t2.relation) ? field('tier2Charge.relation', 'Charge relation', String(t2.relation)) : null);
  const tier2Part = t2Fields ? part('tier2Charge', 'Tier 2 charge', t2Fields) : null;

  let territoryPart = null;
  if (hasTerritory) {
    const states = i.territory.states.filter(isGroup);
    const n = Number.isInteger(i.territory.countyCount) ? i.territory.countyCount : null;
    territoryPart = part('territory', 'Territory',
      h('p', { class: 'part-sub' }, `${F.plural(states.length, 'state or province', 'states and provinces')}${n !== null ? `, ${F.plural(n, 'county', 'counties')} in all` : ''}. Open a state to list its counties.`),
      h('div', { class: 'states' }, states.map((s) => {
        const names = countiesIn(model, i.id, s.state);
        const t1 = Number.isInteger(s.tier1Counties) ? s.tier1Counties : names.tier1.length;
        const t2c = Number.isInteger(s.tier2Counties) ? s.tier2Counties : names.tier2.length;
        const tierList = (tier, label, list) => (list.length ? h('div', { class: 'tier', 'data-tier': tier },
          h('h4', {}, `${label}: ${F.plural(list.length, 'county', 'counties')}`),
          h('ul', { class: 'county-list' }, list.map((name) => h('li', {}, name)))) : null);
        return h('details', { class: 'state', 'data-state': s.state },
          h('summary', {}, h('span', { class: 'chev', 'aria-hidden': 'true' }),
            h('span', { class: 'state-name' }, `${stateName(model, s.state)} (${s.state})`),
            h('span', { class: 'state-counts' }, `Tier 1 in ${F.plural(t1, 'county', 'counties')}, Tier 2 in ${F.plural(t2c, 'county', 'counties')}`)),
          h('div', { class: 'counties' },
            h('p', { class: 'state-map-link' }, h('a', { href: stateHash(s.state), 'data-state-link': s.state }, `Open the map of ${stateName(model, s.state)}`)),
            tierList(1, 'Tier 1', names.tier1), tierList(2, 'Tier 2', names.tier2)));
      })),
      filled(i.coverageNote) ? fields(field('coverageNote', 'Coverage note', String(i.coverageNote), { long: true })) : null);
  } else if (filled(i.coverageNote)) {
    territoryPart = part('territory', 'Territory',
      fields(field('coverageNote', 'Coverage note, not confirmed on the map', String(i.coverageNote), { long: true })));
  }

  const paperworkFields = fields(
    filled(pw.agreementOnFile) ? field('paperwork.agreementOnFile', 'Installer agreement on file', String(pw.agreementOnFile)) : null,
    filled(pw.coiOnFile) ? field('paperwork.coiOnFile', 'Valid certificate of insurance on file', String(pw.coiOnFile)) : null,
    filled(pw.coiValidThrough) ? field('paperwork.coiValidThrough', 'Certificate of insurance valid through', F.longDate(pw.coiValidThrough)) : null);
  const paperworkPart = paperworkFields ? part('paperwork', 'Paperwork, as recorded in QuickBase', paperworkFields) : null;

  const naOr = (value, na) => (filled(value) ? String(value) : na === true ? NOT_APPLICABLE : null);
  const travel = naOr(i.travelNote, i.travelNoteNotApplicable);
  const emr = naOr(i.emr, i.emrNotApplicable);
  const otherFields = fields(
    filled(w.available) ? field('warehousing.available', 'Warehousing available', String(w.available)) : null,
    Array.isArray(w.at) && w.at.length ? field('warehousing.at', 'Warehousing at our addresses', w.at.map(String).join(', ')) : null,
    travel !== null ? field('travelNote', 'Travel note', travel, { long: true }) : null,
    emr !== null ? field('emr', 'Current EMR', emr) : null,
    filled(i.notes) ? field('notes', 'Notes / comments', String(i.notes), { long: true }) : null,
    filled(i.anythingElse) ? field('anythingElse', 'Anything else', String(i.anythingElse), { long: true }) : null);
  const otherPart = otherFields ? part('other', 'Other', otherFields) : null;

  return {
    view: 'installer',
    title: titled(filled(i.company) ? String(i.company) : 'Installer'),
    node: h('div', { class: 'installer', 'data-installer': i.id },
      top, contactsPart, addressesPart, ratesPart, tier2Part, territoryPart, paperworkPart, otherPart),
  };
}

/** What can be searched, listed when a search finds nothing. */
export const SEARCHABLE = [
  'Company name, from the start of any word',
  'Contact name, from the start of any word, including people who have left',
  'Email address, from the start of any word of it, or any part once what you type holds an @ or a period',
  'Phone number, by its digits',
  'Office city, from the start of any word',
  'State, by its full name or its two-letter code: an office in that state, or territory there',
  'ZIP code, by its five digits: the counties it falls in, and the installers who serve them',
];

const MATCH_NAMES = {
  company: 'company name', city: 'office city', officeState: 'office state', territory: 'territory',
  name: 'contact name', email: 'email', email2: 'second email', phone: 'phone',
};

/**
 * One entry of a list laid out as a search result is: three columns, the installer, contacts by
 * role, rates and mobilization. lines go under the company (a State view's tier and counties
 * covered); after goes under the status (a search's matches).
 */
function entryRow(ctx, installer, { matches = [], lines = [], after = [], attrs = {} } = {}) {
  const rates = isGroup(installer.rates) ? installer.rates : {};
  const rateLines = [['nonUnionST', 'Non-union ST'], ['nonUnionOT', 'Non-union OT'], ['unionST', 'Union ST'], ['unionOT', 'Union OT']]
    .filter(([k]) => typeof rates[k] === 'number')
    .map(([k, label]) => h('div', { class: 'mini', 'data-field': `rates.${k}` }, h('dt', {}, label), h('dd', {}, F.money(rates[k]))));
  return h('tr', { 'data-installer': installer.id, ...attrs },
    h('td', { 'data-column': 'installer' },
      h('p', { class: 'result-company' }, companyLink(installer, matches)),
      lines,
      h('p', { class: 'result-office' }, officeLine(installer, matches)),
      h('p', { class: 'result-status' }, statusTag(installer.status), ratesExpired(installer, ctx.today) ? [' ', expiredTag()] : null),
      after),
    h('td', { 'data-column': 'contacts' }, rowContacts(ctx, installer, { marks: matches })),
    h('td', { 'data-column': 'rates' },
      rateLines.length ? h('dl', { class: 'mini-rates' }, rateLines) : null,
      filled(installer.mobilization) ? h('dl', { class: 'mini-rates mobil' }, h('div', { class: 'mini wide', 'data-field': 'mobilization' },
        h('dt', {}, 'Mobilization'), h('dd', {}, String(installer.mobilization)))) : null));
}

function resultRow(ctx, result) {
  const { installer, matches } = result;
  const { model } = ctx;
  const territoryLines = matches.filter((m) => m.field === 'territory').map((m) => {
    const s = installer.territory.states.find((x) => isGroup(x) && x.state === m.state) || {};
    const t1 = Number.isInteger(s.tier1Counties) ? s.tier1Counties : 0;
    const t2 = Number.isInteger(s.tier2Counties) ? s.tier2Counties : 0;
    return h('p', { class: 'territory-match', 'data-match': 'territory' }, 'Territory includes ',
      h('a', { href: stateHash(m.state), 'data-state-link': m.state }, h('mark', {}, stateName(model, m.state))),
      `: Tier 1 in ${F.plural(t1, 'county', 'counties')}, Tier 2 in ${F.plural(t2, 'county', 'counties')}`);
  });
  const on = [...new Set(matches.map((m) => MATCH_NAMES[m.field]))];
  return entryRow(ctx, installer, { matches, attrs: { 'data-matched-on': matches.map((m) => m.field).join(' ') },
    after: [territoryLines, h('p', { class: 'matched-on' }, `Matched on ${on.join(', ')}`)] });
}

export const SEARCH_COLUMNS = [['installer', 'Installer'], ['contacts', 'Contacts by role'], ['rates', 'Rates and mobilization']];

function searchView(ctx, route) {
  if (isZip(route.q)) return zipView(ctx, { view: 'zip', zip: String(route.q).trim() }, { search: true });
  const r = search(ctx.model, route.q);
  const q = r.q;
  const canSearch = () => h('div', { class: 'panel can-search' }, h('p', {}, 'You can search by:'),
    h('ul', {}, SEARCHABLE.map((s) => h('li', {}, s))));
  // Ruling 7: a search that names a state shows a link to that state's view.
  const stateLink = r.state ? h('p', { class: 'panel note state-link', 'data-state-link': r.state },
    h('a', { href: stateHash(r.state) }, `Open the map of ${stateName(ctx.model, r.state)}`)) : null;
  let body;
  if (r.kind === 'short') {
    body = [heading('Search', 'Type two or more characters to search.'), canSearch()];
  } else if (r.kind === 'none') {
    body = [heading('Search results', null), stateLink, h('p', { class: 'panel note', 'data-no-match': 'true' }, `No installer matches “${q}”.`), canSearch()];
  } else {
    body = [heading('Search results', `${F.plural(r.results.length, 'installer matches', 'installers match')} “${q}”.`), stateLink,
      table('results', SEARCH_COLUMNS, r.results.map((x) => resultRow(ctx, x)))];
  }
  return {
    view: 'search',
    title: titled(q ? `Search: ${q}` : 'Search'),
    node: h('section', { class: 'search', 'data-kind': r.kind }, body),
  };
}

/* ============================================================ the State view and ZIP lookup */

/** The line at the foot of every list: the installers with no territory, from the data, linking to Not on the map. */
export function footLine(model) {
  const n = notOnTheMap(model).length;
  const text = n === 1 ? '1 installer has no mapped territory and may also serve this area.'
    : `${F.count(n)} installers have no mapped territory and may also serve this area.`;
  return h('p', { class: 'foot-line', 'data-foot': n }, h('a', { href: toHash({ view: 'notOnMap' }) }, text));
}

/**
 * Who serves a state, or one county of it, in the order step 4c gives: [{ installer, tier, t1, t2 }].
 * With a county: its Tier 1 installers, then its Tier 2, each in the order of the file. With
 * none: those with any Tier 1 county in the state, then the rest, each in the order of the file.
 */
export function servingState(model, code, county = null) {
  const list = [];
  const coverageOf = (i) => (model.coverage.get(i.id) || new Map()).get(code) || { tier1: [], tier2: [] };
  if (county) {
    const s = model.countyServers.get(county) || { tier1: [], tier2: [] };
    const t1 = new Set(s.tier1);
    const t2 = new Set(s.tier2);
    for (const tier of [1, 2]) {
      for (const i of model.installers) {
        if (tier === 1 ? t1.has(i.id) : !t1.has(i.id) && t2.has(i.id)) {
          const c = coverageOf(i);
          list.push({ installer: i, tier, t1: c.tier1.length, t2: c.tier2.length });
        }
      }
    }
    return list;
  }
  for (const first of [true, false]) {
    for (const i of model.installers) {
      const c = coverageOf(i);
      if (c.tier1.length + c.tier2.length === 0 || (c.tier1.length > 0) !== first) continue;
      list.push({ installer: i, tier: null, t1: c.tier1.length, t2: c.tier2.length });
    }
  }
  return list;
}

const tierWords = (e) => (e.tier ? `Tier ${e.tier}` : `Tier 1 in ${F.plural(e.t1, 'county', 'counties')}, Tier 2 in ${F.count(e.t2)}`);

/** The State view's list, or a plain line when nobody serves the place; then the foot line. */
function servingList(ctx, code, county, id) {
  const { model } = ctx;
  const entries = servingState(model, code, county);
  const place = county ? (model.countyById.get(county) || {}).name || county : stateName(model, code);
  const where = stateName(model, code);
  const body = entries.length
    ? table('results', SEARCH_COLUMNS, entries.map((e) => entryRow(ctx, e.installer, {
      attrs: { 'data-tier': e.tier ?? 'both' },
      lines: [h('p', { class: 'tier-line' }, tierWords(e)),
        h('p', { class: 'counties-line' }, `${F.plural(e.t1 + e.t2, 'county', 'counties')} covered in ${where}`)],
    })))
    : h('p', { class: 'panel note', 'data-nobody': 'true' }, `No installer serves ${place}.`);
  return h('section', { class: 'serving', id, tabindex: '-1', 'data-count': entries.length }, body, footLine(model));
}

/** The State view, or a ZIP in one county, which shows the State view for that county under its own heading. */
function stateView(ctx, route, { zip = null } = {}) {
  const { model } = ctx;
  const { code, county } = route;
  if (!knownState(model, code) || (county && !knownCounty(model, code, county))) return notFound(ctx, route);
  const n = servingState(model, code, county).length;
  const place = placeName(model, code, county);
  const title = zip ? `Installers serving ZIP ${zip} — ${place}` : `Installers in ${place}`;
  const sub = n ? `${F.plural(n, 'installer serves', 'installers serve')} ${place}.` : null;
  return {
    view: zip ? 'zip' : 'state',
    title: titled(zip ? `ZIP ${zip}` : place),
    node: h('section', { class: 'state-view', 'data-state': code, 'data-county': county || null, 'data-zip': zip },
      heading(title, sub),
      h('div', { class: 'panel map-panel map-panel-state' },
        h('div', { class: 'map-column' },
          skipLink('state-after-map', 'Skip the map'),
          mapSlot(countyMapPart(model, code, county, ctx.files))),
        h('div', { class: 'map-side' },
          h('label', { class: 'box-label', for: 'county-box' }, `Find a county in ${stateName(model, code)}`),
          h('input', { id: 'county-box', class: 'county-box', type: 'text', autocomplete: 'off', spellcheck: 'false', 'data-county-box': code,
            'aria-controls': 'county-suggestions', placeholder: 'Type a county\'s name' }),
          h('div', { id: 'county-suggestions', class: 'suggestions', 'aria-live': 'polite' }),
          county ? h('p', { class: 'chosen-line' }, h('span', { class: 'inline-label' }, 'Chosen'), (model.countyById.get(county) || {}).name || county) : null,
          county ? h('p', { class: 'show-all' }, h('a', { class: 'btn', href: stateHash(code), 'data-show-all': code }, `Show all of ${stateName(model, code)}`)) : null)),
      servingList(ctx, code, county, 'state-after-map')),
  };
}

/** The words section 4.9 gives for what the ZIP list leaves out. */
export const ZIP_LEAVES_OUT = 'ZIP codes that are only post office boxes, ZIP codes belonging to a single organization, military ZIP codes, and Canadian postal codes';

/** ZIP lookup, section 4.9. */
function zipView(ctx, route, { search: viaSearch = false } = {}) {
  const { model } = ctx;
  const zip = route.zip;
  const z = zipLookup(ctx.files, zip);
  const page = (body, kind) => ({
    view: 'zip',
    title: titled(`ZIP ${zip}`),
    node: h('section', { class: 'zip-view', 'data-zip': zip, 'data-kind': kind, 'data-via-search': viaSearch ? 'true' : null }, body),
  });
  if (z.state === 'pending') {
    return page([heading(`ZIP code ${zip}`, null), h('div', { class: 'map-slot', 'data-map-slot': 'zip', 'data-map': 'pending' },
      h('p', { class: 'panel note' }, `Looking up ZIP code ${zip}…`))], 'pending');
  }
  if (z.state === 'failed') {
    return page([heading(`ZIP code ${zip}`, null), h('div', { class: 'map-slot', 'data-map-slot': 'zip', 'data-map': 'failed' },
      h('p', { class: 'panel note', 'data-zip-failed': 'true' }, `ZIP code ${zip} could not be looked up. Please try again shortly.`))], 'failed');
  }
  if (!z.entry) {
    return page([heading(`ZIP code ${zip}`, null),
      h('div', { class: 'panel note', 'data-zip-missing': 'true' },
        h('p', {}, `ZIP code ${zip} is not in the list of ZIP codes.`),
        h('p', {}, `The list leaves out ${ZIP_LEAVES_OUT}.`))], 'missing');
  }
  if (z.entry.outside === true || !Array.isArray(z.entry.counties) || !z.entry.counties.length) {
    return page([heading(`ZIP code ${zip}`, null),
      h('p', { class: 'panel note', 'data-zip-outside': 'true' }, `ZIP code ${zip} is outside the mapped area.`)], 'outside');
  }
  const counties = z.entry.counties.map((id) => model.countyById.get(id)).filter(Boolean);
  if (counties.length === 1) {
    const out = stateView(ctx, { view: 'state', code: counties[0].state, county: counties[0].id }, { zip });
    return { ...out, node: { ...out.node, attrs: { ...out.node.attrs, 'data-kind': 'one', 'data-via-search': viaSearch ? 'true' : null } } };
  }
  // Several counties: every county, largest share first; then each installer once, at its best tier among them.
  const best = new Map();
  for (const c of counties) {
    const s = model.countyServers.get(c.id) || { tier1: [], tier2: [] };
    for (const [tier, ids] of [[1, s.tier1], [2, s.tier2]]) {
      for (const id of ids) {
        if (!best.has(id)) best.set(id, { tier, counties: [] });
        const b = best.get(id);
        b.tier = Math.min(b.tier, tier);
        if (!b.counties.includes(c)) b.counties.push(c);
      }
    }
  }
  const entries = [1, 2].flatMap((tier) => model.installers.filter((i) => best.has(i.id) && best.get(i.id).tier === tier)
    .map((i) => ({ installer: i, ...best.get(i.id) })));
  const names = (list) => {
    const n = list.map((c) => c.name);
    return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
  };
  const body = entries.length
    ? table('results', SEARCH_COLUMNS, entries.map((e) => entryRow(ctx, e.installer, {
      attrs: { 'data-tier': e.tier },
      lines: [h('p', { class: 'tier-line' }, `Tier ${e.tier}`), h('p', { class: 'counties-line' }, `Serves ${names(e.counties)}`)],
    })))
    : h('p', { class: 'panel note', 'data-nobody': 'true' }, `No installer serves the counties of ZIP code ${zip}.`);
  return page([
    heading(`Installers serving ZIP ${zip}`, `ZIP code ${zip} falls in ${F.plural(counties.length, 'county', 'counties')}, largest share first.`),
    h('ul', { class: 'panel zip-counties' }, counties.map((c) => h('li', { 'data-county': c.id },
      h('a', { href: stateHash(c.state, c.id) }, placeName(model, c.state, c.id))))),
    h('section', { class: 'serving', 'data-count': entries.length }, body, footLine(model)),
  ], 'several');
}

function notOnMapView(ctx) {
  const list = notOnTheMap(ctx.model);
  const columns = [['company', 'Company'], ['status', 'Status'], ['office', 'Office city and state'], ['coverageNote', 'Written coverage note']];
  return {
    view: 'notOnMap',
    title: titled('Not on the map'),
    node: h('section', { class: 'not-on-map' },
      heading(`Not on the map: ${F.plural(list.length, 'installer', 'installers')}`,
        'Installers with no mapped territory: those who never confirmed, and those who confirmed without marking a map. They may still serve an area.'),
      table('offmap', columns, list.map((i) => h('tr', { 'data-installer': i.id },
        h('td', { 'data-column': 'company' }, companyLink(i)),
        h('td', { 'data-column': 'status' }, statusTag(i.status)),
        h('td', { 'data-column': 'office' }, officeLine(i)),
        h('td', { 'data-column': 'coverageNote', class: 'long' }, filled(i.coverageNote) ? String(i.coverageNote) : null))))),
  };
}

export const COUNT_LABELS = [
  ['installers', 'Installers'], ['contacts', 'Contacts, including those who have left'], ['territoryRows', 'Territory rows'],
  ['duplicateTerritoryRows', 'Territory rows that repeat an installer and county'], ['installersWithTerritory', 'Installers with mapped territory'],
  ['installersWithoutTerritory', 'Installers not on the map'], ['countiesCovered', 'Counties covered'],
];
export const GAP_LABELS = [
  ['noQuoting', 'Installers with no quoting contact'], ['noScheduling', 'Installers with no scheduling contact'],
  ['neither', 'Installers with neither'],
];

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
    title: titled('About this data'),
    node: h('section', { class: 'about' },
      heading('About this data', 'Where the installer records come from, how current they are, and what was checked.'),
      h('section', { class: 'panel part', 'data-part': 'refresh' },
        h('h3', { class: 'part-title' }, 'Last refresh'),
        h('p', { class: 'big-line', 'data-built-at': build.builtAt },
          `${when.date}, at ${when.time} ${when.zoneName}.`, fresh.stale ? [' ', h('span', { class: 'tag tag-dark' }, 'Out of date')] : null),
        h('p', {}, 'A job on GitHub reads the three installer tables in QuickBase once a day, checks what it read, and saves the files this page reads. The page never calls QuickBase. A change made in QuickBase shows here after the next refresh.')),
      h('div', { class: 'about-grid' },
        h('section', { class: 'panel part', 'data-part': 'counts' },
          h('h3', { class: 'part-title' }, 'Counts'),
          h('table', { class: 'stats' }, h('tbody', {},
            COUNT_LABELS.map(([k, label]) => statRow(k, label, num(counts[k]))),
            (Array.isArray(counts.byStatus) ? counts.byStatus.filter(isGroup) : []).map((s) => statRow(`status:${s.status}`, h('span', {}, 'Status: ', statusTag(s.status)), num(s.installers)))))),
        h('section', { class: 'panel part', 'data-part': 'gaps' },
          h('h3', { class: 'part-title' }, 'Contact gaps'),
          h('table', { class: 'stats' }, h('tbody', {}, GAP_LABELS.map(([k, label]) => statRow(`gap:${k}`, label, num(gaps[k]))))),
          h('p', { class: 'part-sub' }, 'Departed contacts are left out of these counts. Where a role is missing, a row shows the next-best contact with their own role, and a marker.'))),
      h('section', { class: 'panel part', 'data-part': 'checks' },
        h('h3', { class: 'part-title' }, 'The checks of this refresh'),
        h('table', { class: 'stats checks' },
          h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Check'), h('th', { scope: 'col' }, 'Name'), h('th', { scope: 'col' }, 'Result'))),
          h('tbody', {}, checks.map((c) => h('tr', { 'data-check': c.check }, h('td', {}, num(c.check)), h('td', {}, String(c.name ?? '')),
            h('td', { 'data-result': c.skipped === true ? 'skipped' : c.passed === true ? 'passed' : 'failed' }, result(c))))))),
      h('section', { class: 'panel part', 'data-part': 'maps' },
        h('h3', { class: 'part-title' }, 'Where the maps come from'),
        MAP_CREDITS.map((line) => h('p', { class: 'credit' }, line)))),
  };
}

/** The makers of the map and ZIP files, credited on About this data (ruling 5). */
export const MAP_CREDITS = [
  'County and state outlines: U.S. Census Bureau, 2025 cartographic boundary files.',
  'Ontario census divisions: adapted from Statistics Canada, 2021 Census boundary files. This does not constitute an endorsement by Statistics Canada of this product.',
  'ZIP codes: U.S. Census Bureau, 2020 ZIP Code Tabulation Area to county relationship file. A Census ZIP area is close to, but not exactly, the area the Postal Service delivers to.',
];

function notFound(ctx, route) {
  const what = route.view === 'installer' ? 'No installer with this address is in the data.'
    : route.view === 'state' ? 'No state or county with this address is on the map.' : 'There is no view at this address.';
  return {
    view: 'notFound',
    title: titled('Not found'),
    node: h('section', { class: 'not-found' },
      heading('Not found', what),
      h('p', {}, h('a', { class: 'btn', href: toHash({ view: 'home' }) }, 'Go to Home'))),
  };
}

/** The view the page shows when the data cannot be loaded. It never shows an empty directory. */
export function dataErrorView() {
  return {
    view: 'error',
    title: titled('Data could not be loaded'),
    node: h('section', { class: 'panel data-error', role: 'alert' },
      h('h2', { class: 'view-title', tabindex: '-1' }, 'The installer data could not be loaded'),
      h('p', {}, 'Please try again shortly.')),
  };
}

/**
 * The view for a route: { view, title, node }. now is the time in milliseconds, handed in, so
 * that "today" (ruling 7) and the out-of-date line (ruling 8) can be tested. files holds what
 * has come of the files filesFor names.
 */
export function renderView(route, model, { now = Date.now(), files = {} } = {}) {
  const ctx = { model, now, today: F.easternDate(now), ids: 0, view: route.view, files };
  switch (route.view) {
    case 'home': return home(ctx);
    case 'installers': return installersView(ctx, route);
    case 'installer': return installerView(ctx, route);
    case 'search': return searchView(ctx, route);
    case 'notOnMap': return notOnMapView(ctx);
    case 'about': return aboutView(ctx);
    case 'state': return stateView(ctx, route);
    case 'zip': return zipView(ctx, route);
    default: return notFound(ctx, route);
  }
}
