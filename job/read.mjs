/**
 * Reads the three installer tables through the read-only client (job\lib\quickbase.mjs).
 *
 * readFields: one GET /v1/fields for each table, three calls. The job works out check 7 from
 * them before it asks for any record.
 * readRecords: every record of each table, asking only for the columns in ASKED
 * (job\fields.mjs), page by page through readAll. With 5,000 rows to a page that is one page
 * for MASTER, one for Contacts and four for Territory: six calls. If QuickBase hands back
 * shorter pages than were asked for, there are more.
 *
 * It does not ask for the tables themselves. It prints nothing and writes nothing.
 */
import { readAll } from './lib/quickbase.mjs';
import { ASKED, TABLE_ORDER } from './fields.mjs';

/** { master, contacts, territory }: each table's fields as QuickBase lists them. */
export async function readFields(client) {
  const out = {};
  for (const t of TABLE_ORDER) {
    const fields = await client.getFields(t.id);
    out[t.key] = Array.isArray(fields) ? fields : [];
  }
  return out;
}

/**
 * { rows, totals, pages }: for each table, the rows in the order of QuickBase's record
 * numbers, QuickBase's own total, and how many rows came in each page.
 */
export async function readRecords(client) {
  const rows = {};
  const totals = {};
  const pages = {};
  for (const t of TABLE_ORDER) {
    const sizes = [];
    // The same client, with the size of each page noted on the way past.
    const counting = {
      query: async (id, body) => {
        const res = await client.query(id, body);
        sizes.push(Array.isArray(res.data) ? res.data.length : 0);
        return res;
      },
    };
    const r = await readAll(counting, t.id, ASKED[t.id]);
    rows[t.key] = r.rows;
    totals[t.key] = r.total;
    pages[t.key] = sizes;
  }
  return { rows, totals, pages };
}
