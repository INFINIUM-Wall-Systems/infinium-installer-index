/**
 * npm run check:job: the job's tests on made-up installers (scripts\job-tests.mjs), each on its
 * sound cases. It runs the job's shaping, checking and writing on the made-up installers of
 * scripts\fixtures\ and on stand-ins for the client, and checks the workflow file's shape.
 *
 * It never calls QuickBase: fetch is replaced, before anything else, by a stand-in that refuses
 * every call, and every test hands the job its own stand-in. It never loads the real key and
 * never reads the real environment. Its temporary folders are deleted at the end.
 *
 * GitHub runs this before the job (.github\workflows\daily-data.yml), so that a machine that
 * would write different bytes from the laptop stops there: the fingerprints test fails.
 *
 * Each broken case, which must make its test fail, is run by npm run check:selftest.
 */
globalThis.fetch = async () => { throw new Error('the tests never reach the network'); };

const { TESTS } = await import('./job-tests.mjs');
const { removeTemps } = await import('./job-standins.mjs');

const results = [];
try {
  for (const t of TESTS) {
    for (const c of t.sound) {
      let r;
      try { r = await c.run(); } catch (e) { r = { ok: false, why: `stopped: ${e && e.constructor ? e.constructor.name : 'error'}: ${e && e.message}` }; }
      results.push({ t, c, r });
    }
  }
} finally {
  const left = removeTemps();
  if (left.length) results.push({ t: { line: 'temporary folders', label: 'deleted' }, c: { label: '' }, r: { ok: false, why: `not deleted: ${left.join(', ')}` } });
}

for (const { t, c, r } of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${t.line}: ${t.label}${c.label ? ` (${c.label})` : ''}${r.ok ? '' : ` — ${r.why}`}`);
}
const failed = results.filter((x) => !x.r.ok);
console.log(failed.length ? `check:job: ${failed.length} of ${results.length} failed` : `check:job: PASS, ${results.length} cases in ${TESTS.length} tests`);
process.exitCode = failed.length ? 1 : 0;
