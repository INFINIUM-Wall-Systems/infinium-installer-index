/**
 * The seven checks of section 3.5 of docs\SPEC.md, in its order, with the names section 3.6
 * fixes. No network and no files.
 *
 * Each returns { check, name, passed, counts }: counts holds numbers only, never a value
 * taken from a record. The first check has skipped: true when the count guard was skipped.
 */
import { CONTACTS, MASTER, TABLE_ORDER, TERRITORY, WATCHED } from './fields.mjs';
import { STATUSES, textOf } from './shape.mjs';

export const CHECK_NAMES = [
  'Counts have not fallen',
  'Every contact and territory row has its installer',
  'Every county is in the county list',
  'No installer id twice',
  'Every installer has a company and a known status',
  'The same data gives the same files',
  'Columns keep their label and type',
];

const result = (n, passed, counts) => ({ check: n, name: CHECK_NAMES[n - 1], passed, counts });

/** The three counts the guard compares, from a build.json's counts, or null if they cannot be read. */
export function guardCounts(counts) {
  if (!counts || typeof counts !== 'object') return null;
  const out = {};
  for (const k of ['installers', 'contacts', 'territoryRows']) {
    if (!Number.isInteger(counts[k]) || counts[k] < 0) return null;
    out[k] = counts[k];
  }
  return out;
}

/**
 * 1. At least one installer, and, since the last good run, installers down by no more than 5
 * and contacts and territory rows down by no more than 10 percent (acceptance check J3).
 * previous: { kind: 'none' } when there is no last good run, { kind: 'unreadable' }, or
 * { kind: 'counts', counts }. skip: the count guard is left out for this run.
 */
export function checkCounts(counts, previous, skip) {
  const atLeastOne = counts.installers >= 1;
  if (skip) return { ...result(1, atLeastOne, { installers: counts.installers }), skipped: true };
  if (!previous || previous.kind === 'none') return result(1, atLeastOne, { installers: counts.installers });
  if (previous.kind !== 'counts') return result(1, false, { installers: counts.installers, earlierBuildUnreadable: 1 });
  const before = previous.counts;
  const falls = {
    installersFall: before.installers - counts.installers > 5 ? 1 : 0,
    // "Down by more than 10 percent": the new count times 10 is less than the old count times 9.
    contactsFall: counts.contacts * 10 < before.contacts * 9 ? 1 : 0,
    territoryRowsFall: counts.territoryRows * 10 < before.territoryRows * 9 ? 1 : 0,
  };
  const passed = atLeastOne && !falls.installersFall && !falls.contactsFall && !falls.territoryRowsFall;
  return result(1, passed, {
    installers: counts.installers, installersBefore: before.installers,
    contacts: counts.contacts, contactsBefore: before.contacts,
    territoryRows: counts.territoryRows, territoryRowsBefore: before.territoryRows, ...falls,
  });
}

/** 2. Every contact row and every territory row points at an installer that exists. */
export function checkParents(rows) {
  const ids = new Set(rows.master.map((r) => textOf(r, MASTER.id)).filter(Boolean));
  const contactRows = rows.contacts.filter((r) => !ids.has(textOf(r, CONTACTS.parent))).length;
  const territoryRows = rows.territory.filter((r) => !ids.has(textOf(r, TERRITORY.parent))).length;
  return result(2, contactRows === 0 && territoryRows === 0,
    { contactRowsWithoutInstaller: contactRows, territoryRowsWithoutInstaller: territoryRows });
}

/** 3. Every county id on a territory row exists in the county list. */
export function checkCounties(rows, counties) {
  const known = new Set((counties.counties || []).map((c) => c.id));
  const missing = rows.territory.filter((r) => !known.has(textOf(r, TERRITORY.county))).length;
  return result(3, missing === 0, { territoryRowsWithUnknownCounty: missing });
}

/** 4. No installer id appears twice. An installer with no id fails it as well. */
export function checkUniqueIds(rows) {
  const seen = new Set();
  let repeated = 0;
  let blank = 0;
  for (const r of rows.master) {
    const id = textOf(r, MASTER.id);
    if (!id) { blank++; continue; }
    if (seen.has(id)) repeated++;
    seen.add(id);
  }
  return result(4, repeated === 0 && blank === 0, { repeatedIds: repeated, installersWithoutId: blank });
}

/** 5. Every installer has a company name and one of the five record statuses. */
export function checkCompanyAndStatus(rows) {
  const noCompany = rows.master.filter((r) => !textOf(r, MASTER.company)).length;
  const unknownStatus = rows.master.filter((r) => !STATUSES.includes(textOf(r, MASTER.status))).length;
  return result(5, noCompany === 0 && unknownStatus === 0, { installersWithoutCompany: noCompany, installersWithUnknownStatus: unknownStatus });
}

/** 6. What was read, turned into the files' contents twice, gives the same installer and territory files. */
export function checkSameFiles(first, second) {
  const installersSame = first.installersText === second.installersText;
  const territorySame = first.territoryText === second.territoryText;
  return result(6, installersSame && territorySame, { installersFileDiffers: installersSame ? 0 : 1, territoryFileDiffers: territorySame ? 0 : 1 });
}

/**
 * 7. Every column the job watches (the 69 of WATCHED) still has, in QuickBase, the label and
 * type docs\quickbase\columns.json gives it. live: { master, contacts, territory }, each the
 * table's fields as QuickBase lists them.
 */
export function checkColumns(live, columns) {
  let missing = 0;
  let labels = 0;
  let types = 0;
  for (const t of TABLE_ORDER) {
    const fileTable = (columns.tables || []).find((x) => x.id === t.id);
    const fileCols = new Map((fileTable ? fileTable.columns : []).map((c) => [c.fieldId, c]));
    const liveCols = new Map((live[t.key] || []).map((f) => [f.id, f]));
    for (const id of WATCHED[t.id]) {
      const f = fileCols.get(id);
      const l = liveCols.get(id);
      if (!f || !l) { missing++; continue; }
      if (f.label !== l.label) labels++;
      if (f.type !== l.fieldType) types++;
    }
  }
  return result(7, missing === 0 && labels === 0 && types === 0,
    { columnsWatched: Object.values(WATCHED).reduce((n, ids) => n + ids.length, 0), columnsMissing: missing, labelsChanged: labels, typesChanged: types });
}
