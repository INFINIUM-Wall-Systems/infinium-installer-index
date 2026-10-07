/**
 * The field ids the job watches and asks for: the one place in the code that lists them.
 * Section 3.2 of docs\SPEC.md.
 *
 * WATCHED: the 69 columns of section 3.2. On every run the job reads the three tables' fields
 * and stops if any of these has a different label or type from docs\quickbase\columns.json
 * (check 7).
 * ASKED: the 62 the job asks QuickBase for records from. The address columns 27, 34 and 46 are
 * watched, and their parts are asked for instead. Territory's County name, State or province,
 * Country and Boundary version (8, 9, 10, 12) are watched and not asked for: a county's name,
 * state and country come from public\geo\counties.json.
 */
import { TABLES } from './lib/quickbase.mjs';

/** MASTER, by the name each value has in installers.json. */
export const MASTER = Object.freeze({
  id: 6, company: 25, status: 13, lastConfirmed: 14,
  office: { address: 27, street1: 28, street2: 29, city: 30, state: 31, postalCode: 32, country: 33 },
  shipping: { address: 34, street1: 35, street2: 36, city: 37, state: 38, postalCode: 39, country: 40 },
  shippingNotApplicable: 60,
  secondShipping: { address: 46, street1: 47, street2: 48, city: 49, state: 50, postalCode: 51, country: 52 },
  secondShippingNotApplicable: 61,
  rates: { nonUnionST: 41, nonUnionOT: 42, unionST: 43, unionOT: 44 },
  mobilization: 21, ratesValidThrough: 20, shopStatus: 19, pricingNotes: 63,
  tier2Charge: { basis: 54, unit: 55, unitOther: 56, amount: 57, relation: 58 },
  coverageNote: 26, travelNote: 53, travelNoteNotApplicable: 62,
  warehousing: { available: 45, at: 59 },
  emr: 22, emrNotApplicable: 23,
  paperwork: { coiOnFile: 9, coiValidThrough: 10, agreementOnFile: 11 },
  notes: 12, anythingElse: 24,
});

/** Contacts, by the name each value has in a contact of installers.json, and the installer. */
export const CONTACTS = Object.freeze({
  parent: 6, name: 7, title: 8, email: 9, email2: 10, phone: 11, roles: 12, procedure: 13, departed: 14,
  confirmedRecord: 15,
});

/** Territory: the three asked for, and the four watched only. */
export const TERRITORY = Object.freeze({ parent: 6, county: 7, tier: 11 });
const TERRITORY_WATCHED_ONLY = [8, 9, 10, 12];

const ADDRESS_COLUMNS = [MASTER.office.address, MASTER.shipping.address, MASTER.secondShipping.address];

/** Every number in a nested group of field ids. */
function idsIn(group) {
  return Object.values(group).flatMap((v) => (typeof v === 'number' ? [v] : idsIn(v)));
}

const masterWatched = idsIn(MASTER);
export const WATCHED = Object.freeze({
  [TABLES.MASTER]: masterWatched,
  [TABLES.CONTACTS]: idsIn(CONTACTS),
  [TABLES.TERRITORY]: [...idsIn(TERRITORY), ...TERRITORY_WATCHED_ONLY],
});
export const ASKED = Object.freeze({
  [TABLES.MASTER]: masterWatched.filter((id) => !ADDRESS_COLUMNS.includes(id)),
  [TABLES.CONTACTS]: idsIn(CONTACTS),
  [TABLES.TERRITORY]: idsIn(TERRITORY),
});

/** The tables in the order the job reads them, with the name each goes by in counts. */
export const TABLE_ORDER = Object.freeze([
  { key: 'master', name: 'MASTER', id: TABLES.MASTER },
  { key: 'contacts', name: 'Contacts', id: TABLES.CONTACTS },
  { key: 'territory', name: 'Territory', id: TABLES.TERRITORY },
]);
