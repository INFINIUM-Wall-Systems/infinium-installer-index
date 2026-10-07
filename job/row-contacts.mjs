/**
 * The people for a row: section 4.8 of docs\SPEC.md, with "How the rules combine" deciding
 * where it and the bullets above it differ. No network and no files.
 *
 * A contact here is a contact as installers.json writes it: name, title, email, email2,
 * phone, roles (in the full-listing order), procedure, departed, confirmedRecord, each left
 * out when empty. chooseRow is handed the installer's contacts as entries
 * { contact, pos, rec }: pos is the contact's place in the written list, rec its place in the
 * order QuickBase's record numbers give.
 */
import { compareText } from './lib/order.mjs';

export const QUOTING = 'Quoting / Estimating';
export const SCHEDULING = 'Scheduling / Coordination';
export const EMERGENCY = 'Emergency dispatch';

/** Order everywhere contacts are listed in full. */
export const FULL_ORDER = [QUOTING, SCHEDULING, 'Leadership / Ownership', 'Field / Installation',
  'Receiving / Warehouse', 'Office / Billing / Compliance / Accounts payable', 'Primary contact', 'After-hours',
  EMERGENCY];

/** The next-best order a stand-in is ranked by. A contact with no role at all ranks after these. */
export const NEXT_BEST = ['Primary contact', 'Leadership / Ownership', 'Field / Installation', 'Receiving / Warehouse',
  'Office / Billing / Compliance / Accounts payable', 'After-hours'];

/** A contact's roles in the full-listing order; a role not among the nine comes after, in text order. */
export function orderRoles(roles) {
  const known = FULL_ORDER.filter((r) => roles.includes(r));
  const other = [...new Set(roles.filter((r) => !FULL_ORDER.includes(r)))].sort(compareText);
  return [...known, ...other];
}

/** "First by name": named before unnamed, by the fixed text order, then by record order. */
export function byName(a, b) {
  const an = a.contact.name;
  const bn = b.contact.name;
  if (an === undefined || bn === undefined) {
    if (an !== bn) return an === undefined ? 1 : -1;
    return a.rec - b.rec;
  }
  return compareText(an, bn) || a.rec - b.rec;
}

const rankOfFirstRole = (c) => {
  if (!c.roles || !c.roles.length) return FULL_ORDER.length + 1;
  const i = FULL_ORDER.indexOf(c.roles[0]);
  return i < 0 ? FULL_ORDER.length : i;
};

/**
 * The written order of an installer's contacts: by each one's first role in the full-listing
 * order, then by name. A contact with no role comes last; a contact with no name after those
 * with one. Takes and returns entries { contact, rec }.
 */
export function orderContacts(entries) {
  return [...entries].sort((a, b) => rankOfFirstRole(a.contact) - rankOfFirstRole(b.contact) || byName(a, b));
}

export const canBeReached = (c) => Boolean(c.phone || c.email || c.email2);
const holds = (c, role) => Boolean(c.roles && c.roles.includes(role));

/** The best role a contact stands in by, as { rank, role }, or null when it cannot stand in. */
function standInBy(c) {
  if (!c.roles || !c.roles.length) return { rank: NEXT_BEST.length, role: undefined };
  const ranks = c.roles.map((r) => NEXT_BEST.indexOf(r)).filter((i) => i >= 0);
  if (!ranks.length) return null;
  const rank = Math.min(...ranks);
  return { rank, role: NEXT_BEST[rank] };
}

/**
 * The row for one installer: { row, missingQuoting, missingScheduling }. row has quoting,
 * scheduling and gap, each left out when empty; a place holds contact (pos), and for a
 * stand-in also standIn: true and role (left out for a stand-in with no role).
 */
export function chooseRow(entries) {
  // First: set aside every contact marked departed, and every entry whose only role is
  // Emergency dispatch.
  const kept = entries.filter((e) => !e.contact.departed
    && !(e.contact.roles && e.contact.roles.length === 1 && e.contact.roles[0] === EMERGENCY));

  // Second: fill the two places from the contacts who hold the two roles. The people
  // considered for a role are its holders who can be reached or, when there are none, its
  // holders who cannot.
  const considered = (role) => {
    const holders = kept.filter((e) => holds(e.contact, role));
    const reachable = holders.filter((e) => canBeReached(e.contact));
    return (reachable.length ? reachable : holders).sort(byName);
  };
  const q = considered(QUOTING);
  const s = considered(SCHEDULING);
  const missingQuoting = q.length === 0;
  const missingScheduling = s.length === 0;
  let quoting = null;
  let scheduling = null;
  if (q.length && s.length) {
    quoting = q[0];
    scheduling = s.find((e) => e !== quoting) || null;
    if (!scheduling) {
      // The person in the quoting place is the only one considered for scheduling.
      const other = q.find((e) => e !== quoting);
      if (other) {
        scheduling = quoting;
        quoting = other;
      } else {
        scheduling = quoting;
      }
    }
  } else if (q.length) {
    quoting = q[0];
  } else if (s.length) {
    scheduling = s[0];
  }

  // Third: fill a place whose role is missing with a stand-in: the highest-ranked contact who
  // can be reached and is not already on the row.
  const places = { quoting: quoting && { entry: quoting }, scheduling: scheduling && { entry: scheduling } };
  if (missingQuoting || missingScheduling) {
    const onRow = new Set([quoting, scheduling].filter(Boolean));
    const standIns = kept
      .filter((e) => canBeReached(e.contact) && !onRow.has(e))
      .map((e) => ({ entry: e, by: standInBy(e.contact) }))
      .filter((x) => x.by)
      .sort((a, b) => a.by.rank - b.by.rank || byName(a.entry, b.entry));
    if (missingQuoting && missingScheduling) {
      if (standIns[0]) places.quoting = { entry: standIns[0].entry, standIn: standIns[0].by };
      if (standIns[1]) places.scheduling = { entry: standIns[1].entry, standIn: standIns[1].by };
    } else if (missingQuoting) {
      if (standIns[0]) places.quoting = { entry: standIns[0].entry, standIn: standIns[0].by };
    } else if (standIns[0]) {
      places.scheduling = { entry: standIns[0].entry, standIn: standIns[0].by };
    }
  }

  const row = {};
  for (const name of ['quoting', 'scheduling']) {
    const p = places[name];
    if (!p) continue;
    row[name] = { contact: p.entry.pos };
    if (p.standIn) {
      row[name].standIn = true;
      if (p.standIn.role !== undefined) row[name].role = p.standIn.role;
    }
  }
  if (missingQuoting && missingScheduling) row.gap = 'both';
  else if (missingQuoting) row.gap = 'quoting';
  else if (missingScheduling) row.gap = 'scheduling';
  return { row, missingQuoting, missingScheduling };
}
