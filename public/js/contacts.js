/**
 * Contacts: section 4.8 of docs\SPEC.md.
 *
 * A row's quoting and scheduling places: the job has already chosen the people and written its
 * choice into each installer's row; the page shows what it chose and chooses nobody. A place's
 * contact is a position in the installer's contacts list as the file has it, which the page never
 * puts in another order.
 *
 * The field contact and the receiving contact of the Project management row (added in the ninth
 * revision): the page chooses these, from the installer's contacts, by the "first by name" rule
 * the job uses (job\lib\order.mjs and job\row-contacts.mjs, written out again here, not imported).
 *
 * Nothing here touches a browser object, so node can load it and test it.
 */
import { compareText } from './format.js';

export const QUOTING = 'Quoting / Estimating';
export const SCHEDULING = 'Scheduling / Coordination';
export const FIELD = 'Field / Installation';
export const RECEIVING = 'Receiving / Warehouse';
export const NO_ROLE = 'Role not recorded';
export const MARKERS = Object.freeze({
  quoting: 'No quoting contact on record',
  scheduling: 'No scheduling contact on record',
  both: 'No quoting or scheduling contact on record',
  field: 'No field contact on record',
  receiving: 'No receiving contact on record',
});
/** The order everywhere contacts are listed in full; contacts with no role come after. */
export const FULL_ORDER = Object.freeze([QUOTING, SCHEDULING, 'Leadership / Ownership', FIELD, RECEIVING,
  'Office / Billing / Compliance / Accounts payable', 'Primary contact', 'After-hours', 'Emergency dispatch']);

const isGroup = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
export const contactsOf = (installer) => (Array.isArray(installer.contacts) ? installer.contacts : []);

/** The roles of a contact, or [] when it has none. */
export const rolesOf = (c) => (isGroup(c) && Array.isArray(c.roles) ? c.roles.filter((r) => typeof r === 'string') : []);

/** Whether a contact is current: not marked departed. */
export const isCurrent = (c) => isGroup(c) && c.departed !== true;

/** A contact can be reached when it has a phone, an email or a second email. */
export const canBeReached = (c) => isGroup(c) && Boolean(c.phone || c.email || c.email2);

/**
 * "First by name": by the name, capitals aside, then the name as written; a contact with no name
 * after those with one; where that ties, the order of the file, which follows QuickBase's records.
 * Takes and compares positions in the installer's contacts list.
 */
export function byName(contacts) {
  return (a, b) => {
    const an = isGroup(contacts[a]) && typeof contacts[a].name === 'string' ? contacts[a].name : undefined;
    const bn = isGroup(contacts[b]) && typeof contacts[b].name === 'string' ? contacts[b].name : undefined;
    if (an === undefined || bn === undefined) {
      if (an !== bn) return an === undefined ? 1 : -1;
      return a - b;
    }
    return compareText(an, bn) || a - b;
  };
}

/**
 * The first current contact who holds a role and can be reached; when none can be reached, the
 * first who holds it; null when no current contact holds it. No stand-in is used.
 */
export function firstHolding(installer, role) {
  const contacts = contactsOf(installer);
  const holders = contacts.map((c, i) => i).filter((i) => isCurrent(contacts[i]) && rolesOf(contacts[i]).includes(role));
  const reachable = holders.filter((i) => canBeReached(contacts[i]));
  const pool = (reachable.length ? reachable : holders).sort(byName(contacts));
  return pool.length ? pool[0] : null;
}

/** The field contact of the Project management row: a position, or null. */
export const fieldContact = (installer) => firstHolding(installer, FIELD);
/** The receiving contact: a position, or null. */
export const receivingContact = (installer) => firstHolding(installer, RECEIVING);

/** The place a row's quoting or scheduling value points at, or null. */
function placeOf(row, key, contacts) {
  const p = isGroup(row) ? row[key] : undefined;
  if (!isGroup(p) || !Number.isInteger(p.contact) || !isGroup(contacts[p.contact])) return null;
  return p;
}

/**
 * The row of one installer, ready to show: { marker, places, rest, standIns, nobody, oneInBoth }.
 *   marker   the one marker for an installer with neither role, or null
 *   places   in order; each { key, contact (a position, or null for a place with nobody),
 *            labels, standIn, marker }. A place's marker is the words of section 4.8 when its
 *            role is missing. One person in both places is one place with key 'both' and both
 *            roles on its label.
 *   rest     the positions of every other contact not marked departed, in the file's order
 *   standIns, nobody: how many places hold a stand-in, and how many hold nobody
 *   oneInBoth  whether one person fills both places
 */
export function rowOf(installer) {
  const contacts = contactsOf(installer);
  const row = isGroup(installer.row) ? installer.row : {};
  const gap = row.gap;
  const q = placeOf(row, 'quoting', contacts);
  const s = placeOf(row, 'scheduling', contacts);
  const label = (p, role) => (p.standIn ? (typeof p.role === 'string' ? p.role : NO_ROLE) : role);
  const places = [];
  let marker = null;
  const oneInBoth = Boolean(q && s && q.contact === s.contact);
  if (gap === 'both') marker = MARKERS.both;
  if (oneInBoth) {
    places.push({ key: 'both', contact: q.contact, labels: [...new Set([label(q, QUOTING), label(s, SCHEDULING)])], standIn: Boolean(q.standIn || s.standIn), marker: null });
  } else {
    for (const [key, p, role] of [['quoting', q, QUOTING], ['scheduling', s, SCHEDULING]]) {
      const missing = gap === key || gap === 'both';
      const own = gap === key ? MARKERS[key] : null;
      if (p) places.push({ key, contact: p.contact, labels: [label(p, role)], standIn: Boolean(p.standIn), marker: own });
      else if (missing) places.push({ key, contact: null, labels: [], standIn: false, marker: own });
    }
  }
  const onRow = new Set(places.filter((p) => p.contact !== null).map((p) => p.contact));
  const rest = contacts.map((c, i) => i).filter((i) => !onRow.has(i) && isCurrent(contacts[i]));
  return {
    marker,
    places,
    rest,
    standIns: places.filter((p) => p.standIn).length,
    nobody: places.filter((p) => p.contact === null).length,
    oneInBoth,
  };
}

/**
 * The current contacts of an installer in the order its Installer view gives them (section 4.6):
 * Estimating, the quoting contacts first; Project management, scheduling, then field, then
 * receiving; then everyone else in the full order, which is the order of the file. Records, the
 * full order. Positions in the contacts list.
 */
export function contactOrder(installer, mode) {
  const contacts = contactsOf(installer);
  const current = contacts.map((c, i) => i).filter((i) => isCurrent(contacts[i]));
  const first = mode === 'est' ? [QUOTING] : mode === 'pm' ? [SCHEDULING, FIELD, RECEIVING] : [];
  const out = [];
  for (const role of first) for (const i of current) if (!out.includes(i) && rolesOf(contacts[i]).includes(role)) out.push(i);
  for (const i of current) if (!out.includes(i)) out.push(i);
  return out;
}

/** The contacts marked departed, in the file's order: positions. */
export function formerContacts(installer) {
  const contacts = contactsOf(installer);
  return contacts.map((c, i) => i).filter((i) => isGroup(contacts[i]) && contacts[i].departed === true);
}
