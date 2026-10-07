/**
 * Writes docs\quickbase\columns.json: every column of the three installer tables, read from
 * QuickBase.
 *
 *   node job/quickbase-columns.mjs        (npm run quickbase:columns)
 *
 * It reads only, through job\lib\quickbase.mjs: for each table, the table itself and its
 * fields. Six calls. It reads no record and no value from any record.
 *
 * The file holds the realm, the app id and the three tables in the order MASTER, Contacts,
 * Territory. For each table: its id, its name as QuickBase reports it, its keyFieldId, and its
 * columns in field id order. For each column: fieldId, label, type (QuickBase's own name for
 * the field type), choices in QuickBase's order when the column has them, and partOf, the
 * field id of the Address column, when the column is one of an address's parts. Nothing else:
 * no date or time of reading, so that reading an unchanged QuickBase twice writes the same
 * bytes.
 *
 * A choice list that holds anything the data rules bar (an email, a phone, a street address,
 * a rate, an installer id, or the names of companies or people) is left out, and the column
 * carries "choicesWithheld": true instead.
 *
 * scripts\check-columns.mjs (check R8) builds the same object with buildColumns and compares
 * it with the file.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TABLES, REALM, APP_ID, makeClient, readEnv, makeRedactor, partsOf } from './lib/quickbase.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const COLUMNS_PATH = resolve(ROOT, 'docs', 'quickbase', 'columns.json');
export const TABLE_ORDER = [['MASTER', TABLES.MASTER], ['Contacts', TABLES.CONTACTS], ['Territory', TABLES.TERRITORY]];

// What a choice list must not hold. A column whose label is a company's or a person's name
// has its choices withheld whatever they are.
const BARRED_CHOICE = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/,
  /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}/,
  /\b\d+\s+[A-Za-z0-9 .]+\s(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|way|suite)\b/i,
  /\$\s?\d/,
  /INS-[A-Za-z0-9]/,
];
const BARRED_LABEL = /^(company|company name|legal business name|name|contact|contact name|installer id|authorized representative)$/i;
export const choicesBarred = (label, choices) => BARRED_LABEL.test(label) || choices.some((c) => BARRED_CHOICE.some((re) => re.test(String(c))));

/** The columns object, read from QuickBase through `client`. Returns { doc, withheld }. */
export async function buildColumns(client) {
  const tables = [];
  const withheld = [];
  for (const [kind, id] of TABLE_ORDER) {
    const table = await client.getTable(id);
    const fields = await client.getFields(id);
    const partOf = new Map();
    for (const a of fields.filter((f) => f.fieldType === 'address')) {
      for (const p of partsOf(fields, a.id)) partOf.set(p.id, a.id);
    }
    const columns = [...fields].sort((a, b) => a.id - b.id).map((f) => {
      const col = { fieldId: f.id, label: f.label, type: f.fieldType };
      const choices = (f.properties || {}).choices;
      if (Array.isArray(choices) && choices.length) {
        if (choicesBarred(f.label, choices)) {
          col.choicesWithheld = true;
          withheld.push(`${kind} field ${f.id} "${f.label}"`);
        } else {
          col.choices = [...choices];
        }
      }
      if (partOf.has(f.id)) col.partOf = partOf.get(f.id);
      return col;
    });
    tables.push({ id, name: table.name, keyFieldId: table.keyFieldId, columns });
  }
  return { doc: { realm: REALM, appId: APP_ID, tables }, withheld };
}

export const serialize = (doc) => `${JSON.stringify(doc, null, 2)}\n`;

/** "METHOD address xN" for each kind of request a client sent. */
export function tallyCalls(calls) {
  const n = new Map();
  for (const c of calls) n.set(c, (n.get(c) || 0) + 1);
  return [...n].map(([c, k]) => `${c} x${k}`);
}

async function main() {
  const env = readEnv();
  if (env.problem) {
    console.error(env.problem);
    return 2;
  }
  const redact = makeRedactor([env.token]);
  const say = (s) => console.log(redact(s));
  const client = makeClient(env);
  try {
    const { doc, withheld } = await buildColumns(client);
    writeFileSync(COLUMNS_PATH, serialize(doc));
    say(`Wrote docs/quickbase/columns.json.`);
    for (const [i, [kind, id]] of TABLE_ORDER.entries()) say(`  ${kind} ${id}: ${doc.tables[i].columns.length} columns`);
    say(`Choice lists withheld: ${withheld.length ? withheld.join('; ') : 'none'}`);
    return 0;
  } catch (e) {
    console.error(redact(`STOPPED: ${e.message}`));
    return 1;
  } finally {
    say(`QuickBase calls: ${client.calls.length}${client.calls.length ? ` (${tallyCalls(client.calls).join('; ')})` : ''}; retries ${client.stats.retries}; refused ${client.stats.refused}`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) process.exitCode = await main();
