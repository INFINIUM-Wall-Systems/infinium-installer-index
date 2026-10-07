/**
 * npm run check:columns [-- <path>]: check R8 of group R (docs\ACCEPTANCE.md).
 *
 * It reads the three installer tables' columns from QuickBase, through the read-only client
 * (six calls), builds them exactly as job\quickbase-columns.mjs does, and compares the result
 * with docs\quickbase\columns.json, or with the file at <path> when one is given. It passes on
 * 0 differences. It compares the file with QuickBase, never with a number typed here.
 *
 * It prints the number of differences, the number of columns in each table, and the calls it
 * sent. A difference names a table, a field id and what differs, never a value.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildColumns, COLUMNS_PATH, TABLE_ORDER, tallyCalls } from '../job/quickbase-columns.mjs';
import { makeClient, readEnv, makeRedactor } from '../job/lib/quickbase.mjs';

/** Every difference between the file and what QuickBase holds, as short descriptions. */
export function compareColumns(file, live) {
  const diffs = [];
  for (const k of ['realm', 'appId']) if (file[k] !== live[k]) diffs.push(`${k} differs`);
  const fileTables = Array.isArray(file.tables) ? file.tables : [];
  live.tables.forEach((lt, i) => {
    const ft = fileTables.find((t) => t.id === lt.id);
    if (!ft) { diffs.push(`table ${lt.id} is not in the file`); return; }
    if (fileTables.indexOf(ft) !== i) diffs.push(`table ${lt.id} is out of order`);
    if (ft.name !== lt.name) diffs.push(`table ${lt.id}: name differs`);
    if (ft.keyFieldId !== lt.keyFieldId) diffs.push(`table ${lt.id}: keyFieldId differs`);
    const fileCols = new Map((Array.isArray(ft.columns) ? ft.columns : []).map((c) => [c.fieldId, c]));
    for (const c of lt.columns) {
      const fc = fileCols.get(c.fieldId);
      if (!fc) { diffs.push(`table ${lt.id} field ${c.fieldId}: not in the file`); continue; }
      fileCols.delete(c.fieldId);
      for (const k of new Set([...Object.keys(c), ...Object.keys(fc)])) {
        if (JSON.stringify(c[k]) !== JSON.stringify(fc[k])) diffs.push(`table ${lt.id} field ${c.fieldId}: ${k} differs`);
      }
    }
    for (const id of fileCols.keys()) diffs.push(`table ${lt.id} field ${id}: in the file, not in QuickBase`);
  });
  for (const t of fileTables) if (!live.tables.some((x) => x.id === t.id)) diffs.push(`table ${t.id}: in the file, not in QuickBase`);
  return diffs;
}

async function main() {
  const path = resolve(process.argv[2] || COLUMNS_PATH);
  let file;
  try {
    if (!existsSync(path)) throw new Error(`there is no ${path}`);
    file = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.log(`R8 FAIL: could not read the columns file: ${e.message}`);
    return 1;
  }
  let env;
  try { env = readEnv(); } catch (e) { env = { problem: 'the key could not be loaded' }; }
  if (env.problem) {
    console.log(`R8 FAIL: could not tell: ${env.problem}`);
    return 1;
  }
  const redact = makeRedactor([env.token]);
  const say = (s) => console.log(redact(s));
  const client = makeClient(env);
  try {
    say(`Comparing ${path === COLUMNS_PATH ? 'docs/quickbase/columns.json' : 'the file given'} with QuickBase.`);
    const { doc } = await buildColumns(client);
    const diffs = compareColumns(file, doc);
    TABLE_ORDER.forEach(([kind, id], i) => {
      const ft = (file.tables || []).find((t) => t.id === id);
      say(`  ${kind} ${id}: ${doc.tables[i].columns.length} columns in QuickBase, ${ft && Array.isArray(ft.columns) ? ft.columns.length : 0} in the file`);
    });
    if (diffs.length) {
      say(`R8 FAIL: ${diffs.length} difference(s): ${diffs.slice(0, 10).join('; ')}${diffs.length > 10 ? '; ...' : ''}`);
      return 1;
    }
    say('R8 PASS: 0 differences');
    return 0;
  } catch (e) {
    say(`R8 FAIL: could not tell: ${e.message}`);
    return 1;
  } finally {
    say(`QuickBase calls: ${client.calls.length}${client.calls.length ? ` (${tallyCalls(client.calls).join('; ')})` : ''}; retries ${client.stats.retries}; refused ${client.stats.refused}`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) process.exitCode = await main();
