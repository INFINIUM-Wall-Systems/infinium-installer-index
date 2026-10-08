/**
 * npm run page:pictures: the page in a browser, with made-up installers only: the Installer view,
 * All installers and About this data. Find installers and the views of places have their own
 * command, npm run page:pictures:maps (scripts\page-pictures-maps.mjs).
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
 *        typing in the box in the header keeps the address in step with one step to Back
 *   V3   in All installers, after scrolling down, the column titles are in view and below the
 *        header, in each of the three views, at both widths
 *   V4   no table is wider than its panel, the page does not scroll sideways, and no text is cut
 *        off without a way to read it, at both widths, in every view
 *   V15  no script error in any view
 *   V17  an old address is replaced by its new one in the browser's history
 *   V18  the view switch changes the columns and the section order, the address is replaced and
 *        Back does not step through the views, and a fresh tab at an address without view= opens
 *        the remembered view (Estimating when nothing is remembered)
 *   V19  each box of All installers, by the mouse and by the keyboard, changes the rows and the
 *        count line, and the focus stays on it
 *   no request left 127.0.0.1
 *   no text is smaller than 12px, and every piece of text measures at least 4.5 to 1
 *   every link, button and field can be reached with Tab, in the page's order, with a green
 *        focus ring; Escape closes "Show all contacts" and an open state
 * and shows V3, V4, V17, V18 and V19 failing on copies of the page broken for each, served from
 * temporary folders that leave public\data out.
 *
 * Limits: 20 seconds to reach the browser, 8 minutes in all; then, whatever happens, the browser
 * is closed, the servers stopped and the temporary folders deleted. It never reads public\data
 * and never calls QuickBase.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from './serve-made-up.mjs';
import { writeMadeUp } from './page-standins.mjs';
import { brokenCopy, FOCUS_RING, FOCUSABLES, FRAMES, MEASURE, pictureRun, scriptChange, SHOTS, STICKY, waitFor, WIDTHS } from './page-browser.mjs';

globalThis.fetch = async () => { throw new Error('page:pictures fetches nothing itself'); };

const HOUR = 3600 * 1000;
/** npm run page:pictures -- --first-screens also saves what the window shows first, for a closer look. */
const FIRST_SCREENS = process.argv.includes('--first-screens');

const COLUMNS = {
  est: 'Installer|Quote contact|Non-union ST / OT|Union ST / OT|Mobilization|Rates valid through|Territory in',
  pm: 'Installer|Scheduling contact|Field contact|Receiving|Paperwork|Travel note|Territory in',
  rec: 'Installer|Rates valid through|Agreement|Certificate of insurance|EMR|Contact gaps|Territory',
};
const SECTIONS = { est: 'contacts|rates|coverage|logistics|documents', rec: 'documents|contacts|rates|coverage|logistics' };
const heads = "[...document.querySelectorAll('table.grid thead th')].map((th) => th.textContent.trim().replace(/\\s+/g, ' ')).join('|').replace(/Non-union ST \\/ OT/i, 'Non-union ST / OT')";
const headsText = `(${heads}).split('|').map((t) => t).join('|')`;

async function run(h) {
  // The made-up data: as now, out of date (ruling 8), and the page without installers.json (V16).
  const now = Date.now();
  const fresh = await writeMadeUp({ builtAt: now - HOUR, tag: 'fresh' });
  const stale = await writeMadeUp({ builtAt: now - 72 * HOUR, tag: 'stale' });
  const A = h.server(await startServer({ madeUpDir: fresh.dir }));
  const B = h.server(await startServer({ madeUpDir: stale.dir }));
  const C = h.server(await startServer({ madeUpDir: fresh.dir, leaveOut: ['installers.json'] }));
  // Copies of the page broken for a measure each, data left out.
  const copy = brokenCopy(h, 'broken-style', '.grid th { position: static !important; }\ntable.grid { table-layout: auto !important; width: 2200px !important; }\n.grid td { white-space: nowrap !important; overflow-wrap: normal !important; }');
  const D = h.server(await startServer({ madeUpDir: fresh.dir, publicRoot: copy }));
  const brokenServer = async (tag, change) => h.server(await startServer({ madeUpDir: fresh.dir, publicRoot: brokenCopy(h, `broken-${tag}`, '', change) }));
  const V17B = await brokenServer('v17', scriptChange('js/app.js', [["if (route.view !== 'notFound' && toHash(route) !== location.hash) history.replaceState(null, '', toHash(route));", '']]));
  const V18B = await brokenServer('v18', scriptChange('js/app.js', [["history.replaceState(null, '', modeLink.getAttribute('href'));\n    remember(mode);", "history.pushState(null, '', modeLink.getAttribute('href'));\n    remember(mode);"]]));
  const V19B = await brokenServer('v19', scriptChange('js/app.js', [["main.addEventListener('change', (e) => {", "main.addEventListener('made-up-nothing', (e) => {"]]));

  const page = await h.browser(`${A.url}/`);
  if (!page) return;
  const { evaluate, open, size, key, picture, send, click } = page;

  const openShowAll = `(() => { const b = document.querySelector('tr[data-installer="FAKE-102"] button[data-more]'); b.click(); return b.getAttribute('aria-expanded'); })()`;
  const openState = `(() => { const d = document.querySelector('details[data-state="OH"][data-tier="1"]'); d.open = true; return d.open; })()`;
  const VIEWS = [
    ['installer-estimating', A, '#/installer/FAKE-102?view=est', 'installer'],
    ['installer-pm', A, '#/installer/FAKE-102?view=pm', 'installer'],
    ['installer-records', A, '#/installer/FAKE-102?view=rec', 'installer'],
    ['installer-state-open', A, '#/installer/FAKE-102?view=est', 'installer', openState],
    ['installer-least-filled', A, '#/installer/FAKE-103?view=est', 'installer'],
    ['installer-from-a-place', A, '#/installer/FAKE-111?view=pm&from=%2Fstate%2FOH%3Fcounty%3D39153', 'installer'],
    ['all-installers-default', A, '#/installers?view=est', 'installers'],
    ['all-installers-pm', A, '#/installers?view=pm', 'installers'],
    ['all-installers-records', A, '#/installers?view=rec', 'installers'],
    ['all-installers-all-boxes', A, '#/installers?view=est&dormant=1&inactive=1', 'installers'],
    ['all-installers-not-on-map', A, '#/installers?view=est&dormant=1&inactive=1&map=off', 'installers'],
    ['all-installers-search', A, '#/installers?view=est&q=ohio', 'installers'],
    ['all-installers-search-contact', A, '#/installers?view=pm&q=lena%20ortiz', 'installers'],
    ['all-installers-no-match', A, '#/installers?view=est&q=zzqx', 'installers'],
    ['show-all-contacts-open', A, '#/installers?view=est', 'installers', openShowAll],
    ['about-this-data', A, '#/about', 'about'],
    ['out-of-date-line', B, '#/about', 'about'],
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
  h.say(!v4.length, 'V4', v4.length ? `${v4.length} problem(s): ${v4.slice(0, 12).join('; ')}` : `${VIEWS.length} views at 1440 and at 1280: no table wider than its panel, no sideways scroll, no text cut off without a way to read it`);
  h.say(!text.length, 'text size and contrast', text.length ? `${text.length} problem(s): ${text.slice(0, 12).join('; ')}`
    : `${textCount} pieces of text in ${VIEWS.length} views at both widths: smallest ${minSize.toFixed(1)}px, lowest contrast ${minRatio.toFixed(2)} to 1`);

  // V3: the column titles after scrolling down, in the three views, at both widths.
  const v3 = [];
  for (const [width, height] of WIDTHS) {
    await size(width, height);
    for (const hash of ['#/installers?view=est&dormant=1&inactive=1', '#/installers?view=pm&dormant=1&inactive=1', '#/installers?view=rec&dormant=1&inactive=1']) {
      await open(A, hash, `${hash} at ${width}`);
      const s = await evaluate(STICKY);
      if (s.scrolled < 300 || !s.titles || s.bad) v3.push(`${hash} at ${width}: scrolled ${s.scrolled}px, ${s.bad} of ${s.titles} titles out of view or under the header (header ends at ${s.barBottom}px, first title at ${s.firstTop}px)`);
    }
  }
  h.say(!v3.length, 'V3', v3.length ? v3.join('; ') : 'All installers in the three views at 1440 and 1280: after scrolling down, every column title is in view, just below the header');

  // V3 and V4 shown failing on the copy with a broken style.
  await size(1440, 900);
  await open(D, '#/installers?view=est', 'the broken copy');
  const bs = await evaluate(STICKY);
  await evaluate('window.scrollTo(0, 0)');
  const bm = await evaluate(MEASURE);
  const v3fails = bs.bad > 0;
  const v4fails = bm.sideways || bm.wide.length > 0 || bm.cut.length > 0;
  h.say(v3fails, 'V3 on a broken style', v3fails ? `the measure fails as it should: ${bs.bad} of ${bs.titles} titles scrolled out of view` : 'the measure passed on a copy whose titles do not stay in view');
  h.say(v4fails, 'V4 on a broken style', v4fails ? `the measure fails as it should: ${bm.wide.length} table(s) wider than the panel, sideways scroll ${bm.sideways ? 'yes' : 'no'}, ${bm.cut.length} box(es) cutting text` : 'the measure passed on a copy whose table is wider than its panel');

  // V1: each address opened fresh; Back and Forward; typing in the box in the header.
  const v1 = [];
  const addresses = [
    ['#/', 'home'], ['#/installers', 'installers'], ['#/installers?view=pm&office=OH', 'installers'], ['#/installers?q=akron', 'installers'],
    ['#/installer/FAKE-024', 'installer'], ['#/installer/FAKE-102?view=rec&from=%2Fstate%2FOH', 'installer'], ['#/about', 'about'],
    ['#/state/OH', 'state'], ['#/nowhere', 'notFound'], ['#/installer/FAKE-999', 'notFound'],
  ];
  for (const [hash, want] of addresses) {
    const got = await open(A, hash, `V1 ${hash}`);
    const title = await evaluate('document.title');
    const at = await evaluate('location.hash');
    if (got !== want || !/Installer Index$/.test(title) || (want !== 'notFound' && at !== hash)) v1.push(`${hash} showed ${got} at ${at}`);
  }
  await open(A, '#/', 'V1 Back and Forward');
  await click('#tab-all');
  const afterClick = await evaluate(waitFor("location.hash === '#/installers' && document.getElementById('content').dataset.view === 'installers'"));
  await evaluate('history.back()');
  const back = (await evaluate(waitFor("location.hash === '#/' && document.getElementById('content').dataset.view"))) || 'nothing';
  await evaluate('history.forward()');
  const forward = (await evaluate(waitFor("location.hash === '#/installers' && document.getElementById('content').dataset.view"))) || 'nothing';
  if (!afterClick || back !== 'home' || forward !== 'installers') v1.push(`Back and Forward: after a click on the tab ${afterClick ? 'installers' : 'no view'}, Back ${back}, Forward ${forward}`);
  // Chrome and Edge keep at most 50 steps of history, so the step typing adds is counted by going Back.
  await evaluate("document.getElementById('q').focus()");
  for (const ch of ['l', 'e', 'n']) await send('Input.insertText', { text: ch });
  await evaluate(waitFor("location.hash === '#/installers?q=len'"));
  await evaluate(FRAMES);
  const typed = await evaluate("({ hash: location.hash, view: document.getElementById('content').dataset.view, steps: history.length, rows: document.querySelectorAll('tr[data-installer]').length, tab: document.getElementById('tab-all').getAttribute('aria-current') })");
  if (typed.hash !== '#/installers?q=len' || typed.view !== 'installers' || !typed.rows || typed.tab !== 'page') v1.push(`typing: address ${typed.hash}, view ${typed.view}, ${typed.rows} rows`);
  await evaluate('history.back()');
  const backAfterTyping = (await evaluate(waitFor("location.hash === '#/installers' && document.getElementById('content').dataset.view"))) || 'nothing';
  if (backAfterTyping !== 'installers') v1.push(`one Back after typing three letters showed ${backAfterTyping}, not All installers as it was before: typing added more than one step`);
  h.say(!v1.length, 'V1', v1.length ? v1.join('; ') : `${addresses.length} addresses opened fresh each showed their view and title; a click on a tab, Back and Forward moved between views; typing three letters in the header kept the address in step and added one step to Back`);

  // V17: an old address is replaced by its new one in the browser's history.
  const oldCheck = async (server) => {
    const p = [];
    for (const [old, now2] of [['#/not-on-the-map', '#/installers?dormant=1&inactive=1&map=off'], ['#/search?q=akron', '#/installers?q=akron'], ['#/installers?set=rates', '#/installers?view=est'], ['#/search?q=44221', '#/zip/44221']]) {
      await page.open(server, '#/about', `V17 ${old}`);
      await evaluate(`location.hash = ${JSON.stringify(old)}`);
      const there = await evaluate(waitFor(`location.hash === ${JSON.stringify(now2)} && document.getElementById('content').dataset.view !== 'about' && !document.querySelector('[data-map="pending"]')`));
      await evaluate('history.back()');
      const backTo = await evaluate(waitFor("location.hash === '#/about' && document.getElementById('content').dataset.view === 'about'"));
      if (!there || !backTo) p.push(`${old}: ${there ? 'replaced' : `not replaced by ${now2}`}; Back ${backTo ? 'returned to the view before' : `went to ${await evaluate('location.hash')}`}`);
    }
    return p;
  };
  const v17 = await oldCheck(A);
  h.say(!v17.length, 'V17', v17.length ? v17.join('; ') : '4 old addresses each became their new one in place of themselves: one Back returned to the view before them');
  const v17b = await oldCheck(V17B);
  h.say(v17b.length > 0, 'V17 on a broken copy', v17b.length ? `the measure fails as it should: ${v17b[0]}` : 'the measure passed on a copy that does not replace old addresses');

  // V18: the view switch.
  const switchCheck = async (server) => {
    const p = [];
    await page.open(server, '#/state/OH', 'V18 switch');
    await evaluate("location.hash = '#/state/OH?county=39153&view=est'");
    await evaluate(waitFor("location.hash === '#/state/OH?county=39153&view=est' && document.querySelector('a[data-mode-link=\"est\"][aria-current=\"true\"]')"));
    const estHeads = await evaluate(headsText);
    for (const m of ['pm', 'rec']) {
      await click(`a[data-mode-link="${m}"]`);
      const ok = await evaluate(waitFor(`location.hash === '#/state/OH?county=39153&view=${m}' && document.querySelector('a[data-mode-link="${m}"][aria-current="true"]')`));
      const now2 = await evaluate(`({ heads: ${headsText}, focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.modeLink : null })`);
      if (!ok || !now2.heads.startsWith(COLUMNS[m].split('|').slice(0, 6).join('|')) || now2.focus !== m) p.push(`the switch to ${m}: ${ok ? 'drawn' : 'not drawn'}, columns ${now2.heads}, focus on ${now2.focus}`);
    }
    if (!estHeads.startsWith(COLUMNS.est.split('|').slice(0, 6).join('|'))) p.push(`Estimating's columns read ${estHeads}`);
    await evaluate('history.back()');
    const back = await evaluate(waitFor("location.hash === '#/state/OH' && document.getElementById('content').dataset.view === 'state'"));
    if (!back) p.push(`Back after two changes of view went to ${await evaluate('location.hash')}, not the view before them`);
    await page.open(server, '#/installer/FAKE-102?view=est', 'V18 sections');
    const estSections = await evaluate("[...document.querySelectorAll('[data-part]')].map((n) => n.dataset.part).filter((x) => x !== 'overview').join('|')");
    await click('a[data-mode-link="rec"]');
    await evaluate(waitFor("location.hash === '#/installer/FAKE-102?view=rec'"));
    const recSections = await evaluate("[...document.querySelectorAll('[data-part]')].map((n) => n.dataset.part).filter((x) => x !== 'overview').join('|')");
    if (estSections !== SECTIONS.est || recSections !== SECTIONS.rec) p.push(`the Installer view's sections read ${estSections}, then ${recSections}`);
    const remembered = await page.inFreshTab(`${server.url}/#/state/OH?county=39153`, "document.querySelector('a[data-mode-link][aria-current=\"true\"]').dataset.modeLink");
    if (remembered !== 'rec') p.push(`a fresh tab without view= opened ${remembered}, not the remembered Records`);
    await evaluate('(() => { try { localStorage.clear(); } catch { } return true; })()');
    const first = await page.inFreshTab(`${server.url}/#/state/OH?county=39153`, "document.querySelector('a[data-mode-link][aria-current=\"true\"]').dataset.modeLink");
    if (first !== 'est') p.push(`with nothing remembered a fresh tab opened ${first}, not Estimating`);
    return p;
  };
  const v18 = await switchCheck(A);
  h.say(!v18.length, 'V18', v18.length ? v18.join('; ') : 'a county\'s view: Project management and Records, each by a click, changed the columns, kept the focus on the switch and replaced the address; one Back went past both to the view before; the Installer view changed its section order; a fresh tab without view= opened the remembered view, and Estimating once nothing was remembered');
  const v18b = await switchCheck(V18B);
  h.say(v18b.length > 0, 'V18 on a broken copy', v18b.length ? `the measure fails as it should: ${v18b[0]}` : 'the measure passed on a copy whose switch adds a step to Back');

  // V19: each box of All installers, by the mouse and the keyboard.
  const boxCheck = async (server) => {
    const p = [];
    const state = "({ rows: document.querySelectorAll('tr[data-installer]').length, line: document.querySelector('[data-shown]').textContent.trim(), hash: location.hash, focus: document.activeElement ? document.activeElement.id : null })";
    await page.open(server, '#/installers?view=est', 'V19');
    const start = await evaluate(state);
    const counts = await evaluate("Object.fromEntries([...document.querySelectorAll('input[data-filter]')].map((i) => [i.dataset.filter, Number(i.closest('label').querySelector('.count').textContent)]))");
    await click('label[for="f-dormant"]');
    const d = await evaluate(waitFor("location.hash.includes('dormant=1') && document.querySelector('#f-dormant').checked"));
    const afterD = await evaluate(state);
    if (!d || afterD.rows !== start.rows + counts.dormant || afterD.line === start.line) p.push(`"Did not respond": the rows went from ${start.rows} to ${afterD.rows}, not by ${counts.dormant}; the count line ${afterD.line === start.line ? 'did not change' : 'changed'}`);
    await evaluate("document.getElementById('f-inactive').focus()");
    await key(' ');
    const i = await evaluate(waitFor("location.hash.includes('inactive=1') && document.querySelector('#f-inactive').checked"));
    const afterI = await evaluate(state);
    if (!i || afterI.rows !== afterD.rows + counts.inactive || afterI.focus !== 'f-inactive') p.push(`"Inactive or on hold" with Space: the rows went from ${afterD.rows} to ${afterI.rows}, not by ${counts.inactive}; the focus is on ${afterI.focus}`);
    await click('label[for="f-map"]');
    const m = await evaluate(waitFor("location.hash.includes('map=off') && document.querySelector('#f-map').checked"));
    const afterM = await evaluate(state);
    if (!m || afterM.rows !== counts.map) p.push(`"Not on the map": ${afterM.rows} rows, not the ${counts.map} its count gives`);
    await click('label[for="f-map"]');
    await click('label[for="f-inactive"]');
    await click('label[for="f-dormant"]');
    const back = await evaluate(waitFor("location.hash === '#/installers?view=est' && !document.querySelector('#f-dormant').checked"));
    const end = await evaluate(state);
    if (!back || end.rows !== start.rows) p.push(`with every box unticked again the list holds ${end.rows}, not ${start.rows}`);
    return p;
  };
  const v19 = await boxCheck(A);
  h.say(!v19.length, 'V19', v19.length ? v19.join('; ') : 'All installers: "Did not respond" by a click and "Inactive or on hold" by Space each added exactly their count of rows and changed the count line, the focus staying on the box; "Not on the map" narrowed to its count; unticking all put the list back');
  const v19b = await boxCheck(V19B);
  h.say(v19b.length > 0, 'V19 on a broken copy', v19b.length ? `the measure fails as it should: ${v19b[0]}` : 'the measure passed on a copy whose boxes do nothing');

  // Tab and Escape.
  const tab = [];
  let reached = 0;
  for (const hash of ['#/installers?view=est', '#/installers?view=pm', '#/installer/FAKE-102?view=est', '#/installers?view=rec&q=abby', '#/about']) {
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
  await open(A, '#/installers?view=est', 'Escape');
  const esc1 = await evaluate(`(() => { const b = document.querySelector('tr[data-installer="FAKE-102"] button[data-more]'); b.focus(); return !!b; })()`);
  await key('Enter');
  const opened = await evaluate(`(() => { const b = document.querySelector('tr[data-installer="FAKE-102"] button[data-more]'); return b.getAttribute('aria-expanded') === 'true' && !document.getElementById(b.dataset.more).hidden; })()`);
  await key('Tab');
  await key('Escape');
  const closed = await evaluate(`(() => { const b = document.querySelector('tr[data-installer="FAKE-102"] button[data-more]'); return b.getAttribute('aria-expanded') === 'false' && document.getElementById(b.dataset.more).hidden && document.activeElement === b; })()`);
  if (!esc1 || !opened || !closed) tab.push(`Show all contacts: opened with Enter ${opened ? 'yes' : 'no'}, closed with Escape and focus back on its button ${closed ? 'yes' : 'no'}`);
  await open(A, '#/installer/FAKE-102?view=est', 'Escape on a state');
  const sel = 'details[data-state="OH"][data-tier="1"]';
  await evaluate(`document.querySelector('${sel} > summary').focus()`);
  await key('Enter');
  const stateOpen = await evaluate(`document.querySelector('${sel}').open`);
  await key('Escape');
  const stateClosed = await evaluate(`!document.querySelector('${sel}').open && document.activeElement === document.querySelector('${sel} > summary')`);
  if (!stateOpen || !stateClosed) tab.push(`a state: opened with Enter ${stateOpen ? 'yes' : 'no'}, closed with Escape ${stateClosed ? 'yes' : 'no'}`);
  h.say(!tab.length, 'Tab and Escape', tab.length ? tab.join('; ') : `${reached} links, buttons and fields in 5 views each reached with Tab, in the page's order, with a green focus ring; Escape closed "Show all contacts" and an open state, and put the focus back`);

  // V15 and the requests.
  h.say(!page.errors.length, 'V15', page.errors.length ? `${page.errors.length} error(s): ${[...new Set(page.errors)].slice(0, 10).join('; ')}` : 'no script error in any view (the 404 of the deliberately missing installers.json aside)');
  const away = page.requests.filter((r) => !r.url.startsWith('http://127.0.0.1:'));
  h.say(!away.length, 'no request left 127.0.0.1', away.length ? `${away.length} request(s) to another address` : `${page.requests.length} requests, every one to http://127.0.0.1; the browser could resolve no other host`);
  h.note(`Pictures saved in review-screens: ${saved.join(', ')}`);
}

await pictureRun('page:pictures', run);
