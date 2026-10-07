/**
 * npm run page:pictures: the page in a browser, with made-up installers only. The map views
 * have their own command, npm run page:pictures:maps (scripts\page-pictures-maps.mjs).
 *
 * It builds the made-up data in temporary folders (the job's made-up installers and the page's
 * own, written by the job itself), starts the server of scripts\serve-made-up.mjs on 127.0.0.1,
 * and starts Microsoft Edge or Google Chrome without a window, with a throwaway profile, pointed
 * only at the server's address (scripts\page-browser.mjs).
 *
 * It saves whole-page pictures into review-screens\ at 1440 by 900 and at 1280 by 800 (with
 * --first-screens, also what the window shows first, for a closer look), and measures,
 * printing PASS or FAIL for each:
 *   V1   each address, opened fresh, shows its view; Back and Forward move between views;
 *        typing keeps the address in step with one step to Back
 *   V3   in All installers, after scrolling down, the column titles are in view and below the
 *        search bar, at both widths
 *   V4   no table is wider than its panel, the page does not scroll sideways, and no text is cut
 *        off by its box, at both widths, in every view
 *   V15  no script error in any view
 *   no request left 127.0.0.1
 *   no text is smaller than 12px, and every piece of text measures at least 4.5 to 1
 *   every link and button can be reached with Tab, in the page's order, with a green focus
 *        ring; Escape closes "Show all contacts" and an open state
 * and shows V3 and V4 failing on a copy of the page with a broken style, served from a
 * temporary folder that leaves public\data out. A view with a map is pictured and measured once
 * its map is drawn.
 *
 * Limits: 20 seconds to reach the browser, 8 minutes in all; then, whatever happens, the browser
 * is closed, the servers stopped and the temporary folders deleted. It never reads public\data
 * and never calls QuickBase.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from './serve-made-up.mjs';
import { writeMadeUp } from './page-standins.mjs';
import { brokenCopy, FOCUS_RING, FOCUSABLES, FRAMES, MEASURE, pictureRun, SHOTS, STICKY, waitFor, WIDTHS } from './page-browser.mjs';

globalThis.fetch = async () => { throw new Error('page:pictures fetches nothing itself'); };

const HOUR = 3600 * 1000;
/** npm run page:pictures -- --first-screens also saves what the window shows first, for a closer look. */
const FIRST_SCREENS = process.argv.includes('--first-screens');

async function run(h) {
  // The made-up data: as now, out of date (ruling 8), and the page without installers.json (V16).
  const now = Date.now();
  const fresh = await writeMadeUp({ builtAt: now - HOUR, tag: 'fresh' });
  const stale = await writeMadeUp({ builtAt: now - 72 * HOUR, tag: 'stale' });
  const A = h.server(await startServer({ madeUpDir: fresh.dir }));
  const B = h.server(await startServer({ madeUpDir: stale.dir }));
  const C = h.server(await startServer({ madeUpDir: fresh.dir, leaveOut: ['installers.json'] }));
  // A copy of the page with a broken style, data left out, for V3 and V4 failing.
  const copy = brokenCopy(h, 'broken-style', '.grid th { position: static !important; }\ntable.grid { table-layout: auto !important; width: 2200px !important; }\n.grid td { white-space: nowrap !important; overflow-wrap: normal !important; }');
  const D = h.server(await startServer({ madeUpDir: fresh.dir, publicRoot: copy }));

  const page = await h.browser(`${A.url}/`);
  if (!page) return;
  const { evaluate, open, size, key, picture, send } = page;

  const openShowAll = `(() => { const b = document.querySelector('tr[data-installer="FAKE-102"] button[data-more]'); b.click(); return b.getAttribute('aria-expanded'); })()`;
  const openState = `(() => { const d = document.querySelector('details[data-state="OH"]'); d.open = true; return d.open; })()`;
  const VIEWS = [
    ['home', A, '#/', 'home'],
    ['all-installers-contact-info', A, '#/installers', 'installers'],
    ['all-installers-rates', A, '#/installers?set=rates', 'installers'],
    ['all-installers-one-status', A, '#/installers?status=CONFIRMED%20BY%20PARTNER', 'installers'],
    ['installer-everything-filled', A, '#/installer/FAKE-102', 'installer'],
    ['installer-state-open', A, '#/installer/FAKE-102', 'installer', openState],
    ['installer-least-filled', A, '#/installer/FAKE-103', 'installer'],
    ['show-all-contacts-open', A, '#/installers', 'installers', openShowAll],
    ['search-contact-not-on-row', A, '#/search?q=lena%20ortiz', 'search'],
    ['search-no-match', A, '#/search?q=zzqx', 'search'],
    ['search-state', A, '#/search?q=Ohio', 'search'],
    ['not-on-the-map', A, '#/not-on-the-map', 'notOnMap'],
    ['about-this-data', A, '#/about', 'about'],
    ['out-of-date-line', B, '#/', 'home'],
    ['data-not-loaded', C, '#/installers', 'error', null, { quiet404: true }],
  ];

  // Pictures, V4, text size and contrast: every view at both widths.
  const saved = [];
  const v4 = [];
  const text = [];
  let textCount = 0;
  let minSize = 99;
  let minRatio = 99;
  for (const [width, height] of WIDTHS) {
    await size(width, height);
    for (const [name, server, hash, want, after, opts] of VIEWS) {
      const got = await open(server, hash, `${name} at ${width}`, opts);
      if (got !== want) v4.push(`${name} at ${width}: drew ${got}, not ${want}`);
      if (after) await evaluate(after);
      await evaluate(FRAMES);
      const m = await evaluate(MEASURE);
      if (m.sideways) v4.push(`${name} at ${width}: the page scrolls sideways`);
      for (const w of m.wide) v4.push(`${name} at ${width}: ${w} is wider than its panel`);
      for (const c of m.cut) v4.push(`${name} at ${width}: ${c}`);
      for (const s of m.small) text.push(`${name} at ${width}: ${s}`);
      for (const l of m.low) text.push(`${name} at ${width}: contrast ${l}`);
      textCount += m.texts;
      minSize = Math.min(minSize, m.minSize);
      minRatio = Math.min(minRatio, m.minRatio);
      saved.push(await picture(name, width));
      if (FIRST_SCREENS) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(SHOTS, `${name}-${width}-first-screen.png`), Buffer.from(shot.data, 'base64'));
      }
    }
  }
  h.say(!v4.length, 'V4', v4.length ? `${v4.length} problem(s): ${v4.slice(0, 12).join('; ')}` : `${VIEWS.length} views at 1440 and at 1280: no table wider than its panel, no sideways scroll, no text cut off by its box`);
  h.say(!text.length, 'text size and contrast', text.length ? `${text.length} problem(s): ${text.slice(0, 12).join('; ')}`
    : `${textCount} pieces of text in ${VIEWS.length} views at both widths: smallest ${minSize.toFixed(1)}px, lowest contrast ${minRatio.toFixed(2)} to 1`);

  // V3: the column titles after scrolling down, both column sets, both widths.
  const v3 = [];
  for (const [width, height] of WIDTHS) {
    await size(width, height);
    for (const hash of ['#/installers', '#/installers?set=rates']) {
      await open(A, hash, `${hash} at ${width}`);
      const s = await evaluate(STICKY);
      if (s.scrolled < 300 || !s.titles || s.bad) v3.push(`${hash} at ${width}: scrolled ${s.scrolled}px, ${s.bad} of ${s.titles} titles out of view or under the bar (bar ends at ${s.barBottom}px, first title at ${s.firstTop}px)`);
    }
  }
  h.say(!v3.length, 'V3', v3.length ? v3.join('; ') : 'both column sets at 1440 and 1280: after scrolling down, every column title is in view, just below the search bar');

  // V3 and V4 shown failing on the copy with a broken style.
  await size(1440, 900);
  await open(D, '#/installers', 'the broken copy');
  const bs = await evaluate(STICKY);
  await evaluate('window.scrollTo(0, 0)');
  const bm = await evaluate(MEASURE);
  const v3fails = bs.bad > 0;
  const v4fails = bm.sideways || bm.wide.length > 0 || bm.cut.length > 0;
  h.say(v3fails, 'V3 on a broken style', v3fails ? `the measure fails as it should: ${bs.bad} of ${bs.titles} titles scrolled out of view` : 'the measure passed on a copy whose titles do not stay in view');
  h.say(v4fails, 'V4 on a broken style', v4fails ? `the measure fails as it should: ${bm.wide.length} table(s) wider than the panel, sideways scroll ${bm.sideways ? 'yes' : 'no'}, ${bm.cut.length} box(es) cutting text` : 'the measure passed on a copy whose table is wider than its panel');

  // V1: each address opened fresh; Back and Forward; typing.
  const v1 = [];
  const addresses = [
    ['#/', 'home'], ['#/installers', 'installers'], ['#/installers?set=rates', 'installers'], ['#/installers?status=INACTIVE', 'installers'],
    ['#/installer/FAKE-024', 'installer'], ['#/search?q=akron', 'search'], ['#/not-on-the-map', 'notOnMap'], ['#/about', 'about'],
    ['#/nowhere', 'notFound'], ['#/installer/FAKE-999', 'notFound'],
  ];
  for (const [hash, want] of addresses) {
    const got = await open(A, hash, `V1 ${hash}`);
    const title = await evaluate('document.title');
    if (got !== want || !/Installer Index$/.test(title)) v1.push(`${hash} showed ${got}`);
  }
  await open(A, '#/', 'V1 Back and Forward');
  await evaluate(`document.querySelector('a.btn[href="#/installers"]').click()`);
  const afterClick = await evaluate(waitFor("location.hash === '#/installers' && document.getElementById('content').dataset.view === 'installers'"));
  await evaluate('history.back()');
  const back = (await evaluate(waitFor("location.hash === '#/' && document.getElementById('content').dataset.view"))) || 'nothing';
  await evaluate('history.forward()');
  const forward = (await evaluate(waitFor("location.hash === '#/installers' && document.getElementById('content').dataset.view"))) || 'nothing';
  if (!afterClick || back !== 'home' || forward !== 'installers') v1.push(`Back and Forward: after a click ${afterClick ? 'installers' : 'no view'}, Back ${back}, Forward ${forward}`);
  const before = await evaluate('history.length');
  await evaluate("document.getElementById('q').focus()");
  for (const ch of ['l', 'e', 'n']) await send('Input.insertText', { text: ch });
  await evaluate(waitFor("location.hash === '#/search?q=len'"));
  await evaluate(FRAMES);
  const typed = await evaluate("({ hash: location.hash, view: document.getElementById('content').dataset.view, steps: history.length, rows: document.querySelectorAll('tr[data-installer]').length })");
  if (typed.hash !== '#/search?q=len' || typed.view !== 'search' || typed.steps !== before + 1 || !typed.rows) v1.push(`typing: address ${typed.hash}, view ${typed.view}, ${typed.steps - before} step(s) added to Back`);
  await evaluate('history.back()');
  const backAfterTyping = (await evaluate(waitFor("location.hash === '#/installers' && document.getElementById('content').dataset.view"))) || 'nothing';
  if (backAfterTyping !== 'installers') v1.push(`Back after typing showed ${backAfterTyping}`);
  h.say(!v1.length, 'V1', v1.length ? v1.join('; ') : `${addresses.length} addresses opened fresh each showed their view and title; Back and Forward moved between views; typing three letters kept the address in step and added one step to Back`);

  // Tab and Escape.
  const tab = [];
  let reached = 0;
  for (const hash of ['#/', '#/installers', '#/installer/FAKE-102', '#/search?q=abby', '#/not-on-the-map', '#/about']) {
    await open(A, hash, `Tab ${hash}`);
    const count = await evaluate(FOCUSABLES());
    const seen = [];
    let ringless = 0;
    for (let i = 0; i < count + 3; i++) {
      await key('Tab');
      const s = await evaluate(FOCUS_RING);
      if (s.i >= 0) {
        seen.push(s.i);
        if (!s.ring) ringless++;
      }
      if (seen.length >= count) break;
    }
    const inOrder = seen.every((v, i) => i === 0 || v > seen[i - 1]);
    if (seen.length !== count || !inOrder) tab.push(`${hash}: ${seen.length} of ${count} reached${inOrder ? '' : ', out of the page\'s order'}`);
    if (ringless) tab.push(`${hash}: ${ringless} without a green focus ring`);
    reached += seen.length;
  }
  await open(A, '#/installers', 'Escape');
  const esc1 = await evaluate(`(() => { const b = document.querySelector('tr[data-installer="FAKE-102"] button[data-more]'); b.focus(); return !!b; })()`);
  await key('Enter');
  const opened = await evaluate(`(() => { const b = document.querySelector('tr[data-installer="FAKE-102"] button[data-more]'); return b.getAttribute('aria-expanded') === 'true' && !document.getElementById(b.dataset.more).hidden; })()`);
  await key('Tab');
  await key('Escape');
  const closed = await evaluate(`(() => { const b = document.querySelector('tr[data-installer="FAKE-102"] button[data-more]'); return b.getAttribute('aria-expanded') === 'false' && document.getElementById(b.dataset.more).hidden && document.activeElement === b; })()`);
  if (!esc1 || !opened || !closed) tab.push(`Show all contacts: opened with Enter ${opened ? 'yes' : 'no'}, closed with Escape and focus back on its button ${closed ? 'yes' : 'no'}`);
  await open(A, '#/installer/FAKE-102', 'Escape on a state');
  await evaluate(`document.querySelector('details[data-state="OH"] > summary').focus()`);
  await key('Enter');
  const stateOpen = await evaluate(`document.querySelector('details[data-state="OH"]').open`);
  await key('Escape');
  const stateClosed = await evaluate(`!document.querySelector('details[data-state="OH"]').open && document.activeElement === document.querySelector('details[data-state="OH"] > summary')`);
  if (!stateOpen || !stateClosed) tab.push(`a state: opened with Enter ${stateOpen ? 'yes' : 'no'}, closed with Escape ${stateClosed ? 'yes' : 'no'}`);
  h.say(!tab.length, 'Tab and Escape', tab.length ? tab.join('; ') : `${reached} links, buttons and fields in 6 views each reached with Tab, in the page's order, with a green focus ring; Escape closed "Show all contacts" and an open state, and put the focus back`);

  // V15 and the requests.
  h.say(!page.errors.length, 'V15', page.errors.length ? `${page.errors.length} error(s): ${[...new Set(page.errors)].slice(0, 10).join('; ')}` : 'no script error in any view (the 404 of the deliberately missing installers.json aside)');
  const away = page.requests.filter((r) => !r.url.startsWith('http://127.0.0.1:'));
  h.say(!away.length, 'no request left 127.0.0.1', away.length ? `${away.length} request(s) to another address` : `${page.requests.length} requests, every one to http://127.0.0.1; the browser could resolve no other host`);
  h.note(`Pictures saved in review-screens: ${saved.join(', ')}`);
}

await pictureRun('page:pictures', run);
