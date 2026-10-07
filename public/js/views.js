/**
 * The words and the layout of every view, as plain functions: each takes the data and the route
 * and gives back { view, title, node }, where node is a tree of elements (html.js). They touch
 * no browser object, so node can load them and test them; app.js puts the result on the page.
 *
 * Sections 4.1 and 4.3 to 4.8 of docs\SPEC.md say what each view shows, with the rulings of the
 * page's first prompt. A field with no value is left out, never shown as a dash.
 */
import { h } from './html.js';
import * as F from './format.js';
import { countiesIn, notOnTheMap, stateName } from './data.js';
import { search } from './search.js';
import { contactsOf, NO_ROLE, rolesOf, rowOf } from './contacts.js';
import { installerHash, toHash } from './routes.js';

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

function home(ctx) {
  const { model } = ctx;
  const all = model.installers.length;
  const off = notOnTheMap(model).length;
  const button = (href, label, n) => h('a', { class: 'btn btn-big', href, 'data-count': n },
    h('span', {}, label), h('span', { class: 'count' }, F.count(n)));
  return {
    view: 'home',
    title: SITE,
    node: h('section', { class: 'home' },
      heading('Find an installer', 'Search above by company, contact, email, phone, office city or state, or open a list.'),
      h('div', { class: 'home-buttons' },
        button(toHash({ view: 'installers', set: 'contact', status: null }), 'All installers', all),
        button(toHash({ view: 'notOnMap' }), 'Not on the map', off))),
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
  return h('span', { class: 'codes' }, codes.map((code, i) => [i ? ', ' : '', h('abbr', { title: stateName(ctx.model, code) }, code)]));
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
          h('div', { class: 'counties' }, tierList(1, 'Tier 1', names.tier1), tierList(2, 'Tier 2', names.tier2)));
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
];

const MATCH_NAMES = {
  company: 'company name', city: 'office city', officeState: 'office state', territory: 'territory',
  name: 'contact name', email: 'email', email2: 'second email', phone: 'phone',
};

function resultRow(ctx, result) {
  const { installer, matches } = result;
  const { model } = ctx;
  const territoryLines = matches.filter((m) => m.field === 'territory').map((m) => {
    const s = installer.territory.states.find((x) => isGroup(x) && x.state === m.state) || {};
    const t1 = Number.isInteger(s.tier1Counties) ? s.tier1Counties : 0;
    const t2 = Number.isInteger(s.tier2Counties) ? s.tier2Counties : 0;
    return h('p', { class: 'territory-match', 'data-match': 'territory' }, 'Territory includes ', h('mark', {}, stateName(model, m.state)),
      `: Tier 1 in ${F.plural(t1, 'county', 'counties')}, Tier 2 in ${F.plural(t2, 'county', 'counties')}`);
  });
  const on = [...new Set(matches.map((m) => MATCH_NAMES[m.field]))];
  const rates = isGroup(installer.rates) ? installer.rates : {};
  const rateLines = [['nonUnionST', 'Non-union ST'], ['nonUnionOT', 'Non-union OT'], ['unionST', 'Union ST'], ['unionOT', 'Union OT']]
    .filter(([k]) => typeof rates[k] === 'number')
    .map(([k, label]) => h('div', { class: 'mini', 'data-field': `rates.${k}` }, h('dt', {}, label), h('dd', {}, F.money(rates[k]))));
  return h('tr', { 'data-installer': installer.id, 'data-matched-on': matches.map((m) => m.field).join(' ') },
    h('td', { 'data-column': 'installer' },
      h('p', { class: 'result-company' }, companyLink(installer, matches)),
      h('p', { class: 'result-office' }, officeLine(installer, matches)),
      h('p', { class: 'result-status' }, statusTag(installer.status), ratesExpired(installer, ctx.today) ? [' ', expiredTag()] : null),
      territoryLines,
      h('p', { class: 'matched-on' }, `Matched on ${on.join(', ')}`)),
    h('td', { 'data-column': 'contacts' }, rowContacts(ctx, installer, { marks: matches })),
    h('td', { 'data-column': 'rates' },
      rateLines.length ? h('dl', { class: 'mini-rates' }, rateLines) : null,
      filled(installer.mobilization) ? h('dl', { class: 'mini-rates mobil' }, h('div', { class: 'mini wide', 'data-field': 'mobilization' },
        h('dt', {}, 'Mobilization'), h('dd', {}, String(installer.mobilization)))) : null));
}

export const SEARCH_COLUMNS = [['installer', 'Installer'], ['contacts', 'Contacts by role'], ['rates', 'Rates and mobilization']];

function searchView(ctx, route) {
  const r = search(ctx.model, route.q);
  const q = r.q;
  const canSearch = () => h('div', { class: 'panel can-search' }, h('p', {}, 'You can search by:'),
    h('ul', {}, SEARCHABLE.map((s) => h('li', {}, s))));
  let body;
  if (r.kind === 'short') {
    body = [heading('Search', 'Type two or more characters to search.'), canSearch()];
  } else if (r.kind === 'zip') {
    body = [heading('Search results', null), h('p', { class: 'panel note', 'data-zip': 'true' }, 'ZIP code lookup comes with the map views.')];
  } else if (r.kind === 'none') {
    body = [heading('Search results', null), h('p', { class: 'panel note', 'data-no-match': 'true' }, `No installer matches “${q}”.`), canSearch()];
  } else {
    body = [heading('Search results', `${F.plural(r.results.length, 'installer matches', 'installers match')} “${q}”.`),
      table('results', SEARCH_COLUMNS, r.results.map((x) => resultRow(ctx, x)))];
  }
  return {
    view: 'search',
    title: titled(q ? `Search: ${q}` : 'Search'),
    node: h('section', { class: 'search', 'data-kind': r.kind }, body),
  };
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
            h('td', { 'data-result': c.skipped === true ? 'skipped' : c.passed === true ? 'passed' : 'failed' }, result(c)))))))),
  };
}

function notFound(ctx, route) {
  const what = route.view === 'installer' ? 'No installer with this address is in the data.' : 'There is no view at this address.';
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
 * that "today" (ruling 7) and the out-of-date line (ruling 8) can be tested.
 */
export function renderView(route, model, { now = Date.now() } = {}) {
  const ctx = { model, now, today: F.easternDate(now), ids: 0, view: route.view };
  switch (route.view) {
    case 'home': return home(ctx);
    case 'installers': return installersView(ctx, route);
    case 'installer': return installerView(ctx, route);
    case 'search': return searchView(ctx, route);
    case 'notOnMap': return notOnMapView(ctx);
    case 'about': return aboutView(ctx);
    default: return notFound(ctx, route);
  }
}
