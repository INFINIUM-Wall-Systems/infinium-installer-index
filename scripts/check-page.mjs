/**
 * npm run check:page: the page's tests on made-up installers (scripts\page-tests.mjs), each on
 * its sound cases, one line each. It runs the page's plain functions (public\js) on the three
 * files the job writes from the made-up installers, with the page's own made-up installers
 * added. It needs no browser.
 *
 * It never reads the network: fetch is replaced, before anything else, by a stand-in that
 * refuses every call. It never reads public\data, the real key or QuickBase. Its temporary
 * folders are deleted at the end.
 *
 * Each broken case, which must make its test fail, is run by npm run check:selftest.
 */
globalThis.fetch = async () => { throw new Error('the page\'s tests never reach the network'); };

const { PAGE_TESTS } = await import('./page-tests.mjs');
const { removePageTemps } = await import('./page-standins.mjs');

const lines = [];
try {
  for (const t of PAGE_TESTS) {
    const results = [];
    for (const c of t.sound) {
      let r;
      try { r = await c.run(); } catch (e) { r = { ok: false, why: `stopped: ${e && e.constructor ? e.constructor.name : 'error'}: ${e && e.message}` }; }
      results.push(r);
    }
    lines.push({ t, ok: results.every((r) => r.ok), why: results.map((r) => r.why).join(' | ') });
  }
} finally {
  const left = await removePageTemps();
  if (left.length) lines.push({ t: { line: 'temporary folders', label: 'deleted' }, ok: false, why: `not deleted: ${left.join(', ')}` });
}

for (const l of lines) console.log(`${l.ok ? 'PASS' : 'FAIL'} ${l.t.line}: ${l.why}`);
const failed = lines.filter((l) => !l.ok);
console.log(failed.length ? `check:page: ${failed.length} of ${lines.length} failed` : `check:page: PASS, ${lines.length} lines, ${PAGE_TESTS.reduce((n, t) => n + t.sound.length, 0)} cases`);
process.exitCode = failed.length ? 1 : 0;
