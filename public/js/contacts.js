/**
 * A row's contacts: section 4.8 of docs\SPEC.md. The job has already chosen the people and
 * written its choice into each installer's row; the page shows what it chose and chooses
 * nobody. A place's contact is a position in the installer's contacts list as the file has it,
 * which the page never puts in another order.
 *
 * Nothing here touches a browser object, so node can load it and test it.
 */

export const QUOTING = 'Quoting / Estimating';
export const SCHEDULING = 'Scheduling / Coordination';
export const NO_ROLE = 'Role not recorded';
export const MARKERS = Object.freeze({
  quoting: 'No quoting contact on record',
  scheduling: 'No scheduling contact on record',
  both: 'No quoting or scheduling contact on record',
});

const isGroup = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
export const contactsOf = (installer) => (Array.isArray(installer.contacts) ? installer.contacts : []);

/** The roles of a contact, or [] when it has none. */
export const rolesOf = (c) => (isGroup(c) && Array.isArray(c.roles) ? c.roles.filter((r) => typeof r === 'string') : []);

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
  const rest = contacts.map((c, i) => i).filter((i) => !onRow.has(i) && isGroup(contacts[i]) && contacts[i].departed !== true);
  return {
    marker,
    places,
    rest,
    standIns: places.filter((p) => p.standIn).length,
    nobody: places.filter((p) => p.contact === null).length,
    oneInBoth,
  };
}
