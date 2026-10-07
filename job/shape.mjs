/**
 * Turns what was read into the contents of installers.json and territory.json, and the counts
 * and gap counts build.json carries: section 3.6 of docs\SPEC.md. No network and no files, so
 * it can be tested with made-up installers.
 *
 * shape({ rows, columns, counties }) takes:
 *   rows      { master, contacts, territory }: records as QuickBase's REST interface returns
 *             them, { "<field id>": { value } }, in the order of QuickBase's record numbers
 *   columns   docs\quickbase\columns.json, parsed: each column's type, and the order of a
 *             choice list
 *   counties  public\geo\counties.json, parsed
 * and returns { installersText, territoryText, counts, gaps, extra }. extra is not written to any
 * file: tierNotOneOrTwo, the territory rows whose tier is neither Tier 1 nor Tier 2.
 *
 * A value of a kind its column's type does not allow stops it with a ShapeError, which names
 * the field id and the kind of value, never the value.
 */
import { compareText } from './lib/order.mjs';
import { TABLES } from './lib/quickbase.mjs';
import { MASTER, CONTACTS, TERRITORY } from './fields.mjs';
import { chooseRow as realChooseRow, orderContacts, orderRoles } from './row-contacts.mjs';

/** The five record statuses, in QuickBase's order. */
export const STATUSES = ['CONFIRMED BY PARTNER', 'DORMANT - NO RESPONSE', 'INACTIVE', 'PENDING - UPDATE EXPECTED',
  'HELD - BUSINESS DECISION'];
export const CONFIRMED = STATUSES[0];

export class ShapeError extends Error {}

/** The kind of a value as QuickBase handed it over. Used for the shape table of the rehearsal too. */
export function kindOf(v) {
  if (v === null || v === undefined) return 'nothing';
  if (typeof v === 'string') return v.trim() ? 'text' : 'empty text';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.length ? 'list' : 'empty list';
  return 'other';
}

/** The raw value of field `id` in a record, or undefined. */
export function rawOf(record, id) {
  const cell = record[String(id)];
  return cell && typeof cell === 'object' && !Array.isArray(cell) ? cell.value : undefined;
}

/** A field's text, trimmed, for the checks: '' when it is not text. */
export function textOf(record, id) {
  const v = rawOf(record, id);
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}

const TEXT_TYPES = new Set(['text', 'text-multi-line', 'text-multiple-choice', 'email', 'phone', 'date', 'url']);
const NUMBER_TYPES = new Set(['currency', 'numeric']);

/** A function from (record, field id) to the value as written, or undefined when empty. */
function makeReader(columns, tableId) {
  const table = (columns.tables || []).find((t) => t.id === tableId);
  const types = new Map((table ? table.columns : []).map((c) => [c.fieldId, c.type]));
  return (record, id) => {
    const type = types.get(id);
    const v = rawOf(record, id);
    const kind = kindOf(v);
    if (kind === 'nothing' || kind === 'empty text') return undefined;
    if (TEXT_TYPES.has(type)) {
      if (kind === 'text') return v.trim();
    } else if (NUMBER_TYPES.has(type)) {
      if (kind === 'number' && Number.isFinite(v)) return v;
    } else if (type === 'checkbox') {
      if (kind === 'true') return true;
      if (kind === 'false') return undefined;
    } else if (type === 'multitext') {
      if (kind === 'empty list') return undefined;
      if (kind === 'list' && v.every((x) => typeof x === 'string')) {
        const items = v.map((x) => x.trim()).filter(Boolean);
        return items.length ? items : undefined;
      }
    }
    throw new ShapeError(`field ${id} (${type || 'not in columns.json'}): a value of kind ${kind}`);
  };
}

/** A group of named values, keeping only those that are not empty. undefined when nothing is left. */
function group(pairs) {
  const out = {};
  for (const [k, v] of pairs) if (v !== undefined) out[k] = v;
  return Object.keys(out).length ? out : undefined;
}

function choiceOrder(columns, tableId, fieldId) {
  const table = (columns.tables || []).find((t) => t.id === tableId);
  const col = table && table.columns.find((c) => c.fieldId === fieldId);
  return (col && Array.isArray(col.choices)) ? col.choices : [];
}

/** A list in the order of a choice list; anything not on it after, in text order. */
function inChoiceOrder(items, choices) {
  const known = choices.filter((c) => items.includes(c));
  const other = [...new Set(items.filter((x) => !choices.includes(x)))].sort(compareText);
  return [...known, ...other];
}

const ADDRESS_PARTS = ['street1', 'street2', 'city', 'state', 'postalCode', 'country'];

export function shape({ rows, columns, counties, chooseRow = realChooseRow }) {
  const m = makeReader(columns, TABLES.MASTER);
  const c = makeReader(columns, TABLES.CONTACTS);
  const t = makeReader(columns, TABLES.TERRITORY);
  const warehousingChoices = choiceOrder(columns, TABLES.MASTER, MASTER.warehousing.at);
  const countyById = new Map((counties.counties || []).map((k) => [k.id, k]));

  // Contacts, grouped by the installer they point at, in record order.
  const contactsOf = new Map();
  rows.contacts.forEach((r, rec) => {
    const parent = c(r, CONTACTS.parent);
    const roles = c(r, CONTACTS.roles);
    const contact = group([
      ['name', c(r, CONTACTS.name)], ['title', c(r, CONTACTS.title)], ['email', c(r, CONTACTS.email)],
      ['email2', c(r, CONTACTS.email2)], ['phone', c(r, CONTACTS.phone)], ['roles', roles && orderRoles(roles)],
      ['procedure', c(r, CONTACTS.procedure)], ['departed', c(r, CONTACTS.departed)],
      ['confirmedRecord', c(r, CONTACTS.confirmedRecord)],
    ]) || {};
    if (parent === undefined) return;
    if (!contactsOf.has(parent)) contactsOf.set(parent, []);
    contactsOf.get(parent).push({ contact, rec });
  });

  // Territory: one tier for each installer and county, Tier 1 if any row says Tier 1.
  const tierOf = new Map();
  const seenPairs = new Set();
  let duplicateTerritoryRows = 0;
  let tierNotOneOrTwo = 0;
  for (const r of rows.territory) {
    const parent = t(r, TERRITORY.parent);
    const county = t(r, TERRITORY.county);
    const tierText = t(r, TERRITORY.tier);
    if (tierText !== 'Tier 1' && tierText !== 'Tier 2') tierNotOneOrTwo++;
    // A row whose tier is neither is counted, and taken as Tier 2, the smaller claim.
    const tier = tierText === 'Tier 1' ? 1 : 2;
    const pair = `${parent ?? ''}\u0000${county ?? ''}`;
    if (seenPairs.has(pair)) duplicateTerritoryRows++;
    seenPairs.add(pair);
    if (parent === undefined || county === undefined || !countyById.has(county)) continue;
    if (!tierOf.has(parent)) tierOf.set(parent, new Map());
    const mine = tierOf.get(parent);
    mine.set(county, Math.min(mine.get(county) ?? 2, tier));
  }

  const installerIds = new Set();
  const installers = rows.master.map((r, rec) => {
    const id = m(r, MASTER.id);
    const status = m(r, MASTER.status);
    if (id !== undefined) installerIds.add(id);
    const address = (g) => group(ADDRESS_PARTS.map((p) => [p, m(r, g[p])]));
    const shipping = [[address(MASTER.shipping), 1], [address(MASTER.secondShipping), 2]]
      .filter(([a]) => a).map(([a, which]) => ({ ...a, which }));
    const entries = orderContacts((id !== undefined && contactsOf.get(id)) || []);
    const contacts = entries.map((e) => e.contact);
    const { row, missingQuoting, missingScheduling } = chooseRow(entries.map((e, pos) => ({ ...e, pos })));
    const counties2 = (id !== undefined && tierOf.get(id)) || new Map();
    let territory;
    if (counties2.size) {
      const byState = new Map();
      for (const [county, tier] of counties2) {
        const k = countyById.get(county);
        if (!byState.has(k.state)) byState.set(k.state, { state: k.state, country: k.country, tier1Counties: 0, tier2Counties: 0 });
        byState.get(k.state)[tier === 1 ? 'tier1Counties' : 'tier2Counties']++;
      }
      territory = { states: [...byState.values()].sort((a, b) => compareText(a.state, b.state)), countyCount: counties2.size };
    }
    const lastConfirmed = m(r, MASTER.lastConfirmed);
    const at = m(r, MASTER.warehousing.at);
    const installer = group([
      ['id', id], ['company', m(r, MASTER.company)], ['status', status],
      ['lastConfirmed', status === CONFIRMED ? lastConfirmed : undefined],
      ['office', address(MASTER.office)],
      ['shipping', shipping.length ? shipping : undefined],
      ['shippingNotApplicable', m(r, MASTER.shippingNotApplicable)],
      ['secondShippingNotApplicable', m(r, MASTER.secondShippingNotApplicable)],
      ['rates', group(Object.entries(MASTER.rates).map(([k, f]) => [k, m(r, f)]))],
      ['mobilization', m(r, MASTER.mobilization)], ['ratesValidThrough', m(r, MASTER.ratesValidThrough)],
      ['shopStatus', m(r, MASTER.shopStatus)], ['pricingNotes', m(r, MASTER.pricingNotes)],
      ['tier2Charge', group(Object.entries(MASTER.tier2Charge).map(([k, f]) => [k, m(r, f)]))],
      ['coverageNote', m(r, MASTER.coverageNote)], ['travelNote', m(r, MASTER.travelNote)],
      ['travelNoteNotApplicable', m(r, MASTER.travelNoteNotApplicable)],
      ['warehousing', group([['available', m(r, MASTER.warehousing.available)],
        ['at', at && inChoiceOrder(at, warehousingChoices)]])],
      ['emr', m(r, MASTER.emr)], ['emrNotApplicable', m(r, MASTER.emrNotApplicable)],
      ['paperwork', group(Object.entries(MASTER.paperwork).map(([k, f]) => [k, m(r, f)]))],
      ['notes', m(r, MASTER.notes)], ['anythingElse', m(r, MASTER.anythingElse)],
    ]) || {};
    // Always written, in their places at the end: contacts, row, then territory when there is one.
    installer.contacts = contacts;
    installer.row = row;
    if (territory) installer.territory = territory;
    return { installer, rec, missingQuoting, missingScheduling };
  });

  installers.sort((a, b) => compareText(a.installer.company ?? '', b.installer.company ?? '')
    || compareText(a.installer.id ?? '', b.installer.id ?? '') || a.rec - b.rec);

  // territory.json: states in order of code, counties in order of id, installers in text order.
  const states = new Map();
  for (const [installer, mine] of tierOf) {
    if (!installerIds.has(installer)) continue;
    for (const [county, tier] of mine) {
      const k = countyById.get(county);
      if (!states.has(k.state)) states.set(k.state, { state: k.state, country: k.country, counties: new Map() });
      const counties3 = states.get(k.state).counties;
      if (!counties3.has(county)) counties3.set(county, { 1: [], 2: [] });
      counties3.get(county)[tier].push(installer);
    }
  }
  const stateList = [...states.values()].sort((a, b) => compareText(a.state, b.state));
  const stateTexts = stateList.map((s) => {
    const lines = [...s.counties.entries()].sort(([a], [b]) => compareText(a, b)).map(([id, tiers]) => JSON.stringify(group([
      ['id', id], ['tier1Installers', tiers[1].length ? [...tiers[1]].sort(compareText) : undefined],
      ['tier2Installers', tiers[2].length ? [...tiers[2]].sort(compareText) : undefined],
    ])));
    return `${JSON.stringify({ state: s.state, country: s.country }).slice(0, -1)},"counties":[\n${lines.join(',\n')}\n]}`;
  });

  const list = (items) => (items.length ? `\n${items.join(',\n')}\n` : '');
  const installersText = `{"schema":1,"installers":[${list(installers.map((x) => JSON.stringify(x.installer)))}]}\n`;
  const territoryText = `{"schema":1,"states":[${list(stateTexts)}]}\n`;

  const withTerritory = installers.filter((x) => x.installer.territory).length;
  const countiesCovered = new Set(stateList.flatMap((s) => [...s.counties.keys()])).size;
  const counts = {
    installers: rows.master.length,
    contacts: rows.contacts.length,
    territoryRows: rows.territory.length,
    duplicateTerritoryRows,
    installersWithTerritory: withTerritory,
    installersWithoutTerritory: rows.master.length - withTerritory,
    countiesCovered,
    byStatus: STATUSES.map((status) => ({ status, installers: installers.filter((x) => x.installer.status === status).length })),
  };
  const gaps = {
    noQuoting: installers.filter((x) => x.missingQuoting).length,
    noScheduling: installers.filter((x) => x.missingScheduling).length,
    neither: installers.filter((x) => x.missingQuoting && x.missingScheduling).length,
  };
  return { installersText, territoryText, counts, gaps, extra: { tierNotOneOrTwo } };
}
