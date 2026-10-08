/**
 * npm run page:pictures:maps: Find installers and the views of places in a browser, with made-up
 * installers only: the map of the states and Ontario, the location box, and a place's view (a
 * state, a county, a ZIP code, a city) with its lists, its Tier 2 button and its county map. The
 * same server, browser, limits and clean-up as npm run page:pictures (scripts\page-browser.mjs).
 *
 * Pictures, into review-screens\, at 1440 by 900 and at 1280 by 800, each the whole page:
 * find-installers; find-installers-typing (the suggestions open); place-county-estimating,
 * place-county-pm, place-county-records; place-county-tier2-open; place-state; place-zip-several;
 * place-county-no-tier1; place-city; and a few more places: Texas, Ontario, a county nobody
 * serves, a ZIP in one county, a ZIP not in the list, a ZIP outside the map.
 *
 * Measures, PASS or FAIL, each new one also shown failing on a copy of the page broken for it:
 *   M16           Find installers draws its map with nothing pressed, in the right half, beside
 *                 the location box, at 1440 by 900 and 1280 by 800
 *   M20           on a place's view, at both sizes, the header and the location bar together are
 *                 at most 150 pixels tall, and the first Tier 1 row starts within 360 pixels of the top
 *   M14           the Tier 2 button by the mouse and by the keyboard (Tab, Enter and Space): the
 *                 list shows and hides, the label and aria-expanded change, the focus stays, the
 *                 page does not scroll and the address does not change
 *   location box  typing offers places with their kind, a city among them; the arrow keys move
 *                 through them; Escape closes them; Enter takes the first
 *   addresses     every address of a place, opened fresh, shows its view; a click on a state and on
 *                 a county, Back and Forward; a ZIP typed gives its address with one step to Back
 *   requests      Find installers, opened fresh, asks for its map's file with the data; a State
 *                 view its own shape file alone; a city its city file and its state's shape file;
 *                 no ZIP file until a ZIP is opened, and then only one; no request leaves 127.0.0.1
 *   width         no map or table is wider than its panel and the page does not scroll sideways
 *   errors        no script error in any view
 *   text          no text under 12px and every piece of text at least 4.5 to 1, a code on a map
 *                 measured as it is drawn: its font size times the map's scale, its fill against
 *                 the fill of its own state
 *   keyboard      on Find installers every state, and in the State views of Ohio, Texas, the
 *                 District of Columbia and Ontario every county, reached with Tab, in order, with a
 *                 ring that shows; Enter on the first link of each map, the last, and three between;
 *                 the links that skip a map move the focus past it and leave the address alone
 * Every picture and measure of a view with a map waits until its map's part is marked drawn.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC, startServer } from './serve-made-up.mjs';
import { writeMadeUp } from './page-standins.mjs';
import { brokenCopy, FOCUS_RING, FOCUSABLES, FRAMES, MEASURE, pictureRun, scriptChange, waitFor, WIDTHS } from './page-browser.mjs';

globalThis.fetch = async () => { throw new Error('page:pictures:maps fetches nothing itself'); };

const HOUR = 3600 * 1000;
const KEYBOARD_STATES = ['OH', 'TX', 'DC', 'ON'];
const TIER2_SHOW = 'View Tier 2 Installers Available for Travel';
const TIER2_HIDE = 'Hide Tier 2 Installers';

/** ZIP codes for the pictures, chosen from the ZIP files by a fixed rule. */
function pickZips() {
  const doc = JSON.parse(readFileSync(join(PUBLIC, 'geo', 'zips', '4.json'), 'utf8'));
  const one = doc.zips.find((z) => z.counties && z.counties.length === 1 && z.counties[0] === '39153');
  const several = doc.zips.find((z) => z.counties && z.counties.length > 1 && z.counties[0] === '39153');
  const zero = JSON.parse(readFileSync(join(PUBLIC, 'geo', 'zips', '0.json'), 'utf8'));
  const outside = zero.zips.find((z) => z.outside === true);
  const listed = new Set(doc.zips.map((z) => z.zip));
  let missing = null;
  for (let n = 49999; n >= 40000 && !missing; n--) if (!listed.has(String(n))) missing = String(n);
  return { one: one.zip, several: several.zip, outside: outside.zip, missing };
}

async function run(h) {
  const now = Date.now();
  const fresh = await writeMadeUp({ builtAt: now - HOUR, tag: 'maps' });
  const A = h.server(await startServer({ madeUpDir: fresh.dir }));
  const Z = pickZips();
  // Copies of the page broken for each measure, data left out.
  const broken = {};
  const make = async (key, css, change = null) => {
    const copy = brokenCopy(h, `broken-${key}`, css, change);
    broken[key] = h.server(await startServer({ madeUpDir: fresh.dir, publicRoot: copy }));
  };
  await make('addresses', '', scriptChange('js/routes.js', [["if (path.startsWith('/state/')) {", "if (path.startsWith('/state/') && false) {"]]));
  await make('requests', '', scriptChange('js/views.js', [["if (route.view === 'home') return [{ path: HOME_MAP, part: 'map' }];",
    "if (route.view === 'home') return [{ path: HOME_MAP, part: 'map' }, { path: zipPath('40000'), part: 'map' }];"]]));
  await make('width', '.map-home { max-width: none !important; width: 2600px !important; }');
  await make('errors', '', scriptChange('js/app.js', [['function fillMap(route) {', "function fillMap(route) {\n  if (route.view === 'state') throw new Error('broken on purpose');"]]));
  await make('text', '.map .code { fill: #9EBD70 !important; font-size: 60px !important; }');
  await make('keyboard', '', scriptChange('js/maps.js', [["return h('a', { href: stateHash(s.code), class: 'map-link',", "return h('a', { href: stateHash(s.code), tabindex: '-1', class: 'map-link',"]]));
  await make('m16', '.find-halves { grid-template-columns: minmax(0, 1fr) !important; }');
  await make('m20', '.loc-bar { padding: 70px 16px !important; }');
  await make('m14', '', scriptChange('js/app.js', [['    tier2.textContent = open ? TIER2_HIDE : TIER2_SHOW;\n', '']]));
  await make('box', '', scriptChange('js/app.js', [["if (e.key === 'ArrowDown' && items.length)", "if (false)"]]));

  const page = await h.browser(`${A.url}/`);
  if (!page) return;
  const { evaluate, open, size, key, picture, send, click } = page;

  /* ---------------------------------------------------------------- pictures, width and text */

  const tier2Open = "(() => { const b = document.querySelector('button[data-tier2-toggle]'); if (b) b.click(); return true; })()";
  const VIEWS = [
    ['find-installers', '#/', 'home'],
    ['find-installers-typing', '#/', 'home', 'type:summ'],
    ['place-county-estimating', '#/state/OH?county=39153&view=est', 'state'],
    ['place-county-pm', '#/state/OH?county=39153&view=pm', 'state'],
    ['place-county-records', '#/state/OH?county=39153&view=rec', 'state'],
    ['place-county-tier2-open', '#/state/OH?county=39153&view=est', 'state', tier2Open],
    ['place-state', '#/state/OH?view=est', 'state'],
    ['place-state-TX', '#/state/TX?view=est', 'state'],
    ['place-state-ON', '#/state/ON?view=est', 'state'],
    ['place-zip-several', `#/zip/${Z.several}?view=est`, 'zip'],
    ['place-zip-one', `#/zip/${Z.one}?view=pm`, 'zip'],
    ['place-zip-not-in-list', `#/zip/${Z.missing}`, 'zip'],
    ['place-zip-outside-map', `#/zip/${Z.outside}`, 'zip'],
    ['place-county-no-tier1', '#/state/OH?county=39133&view=est', 'state'],
    ['place-county-nobody', '#/state/OH?county=39001&view=est', 'state'],
    ['place-city', '#/city/OH-akron?view=est', 'city'],
  ];
  const saved = [];
  const width = [];
  const text = [];
  let mapTexts = 0;
  let mapMinSize = 99;
  let mapMinRatio = 99;
  let minSize = 99;
  let minRatio = 99;
  for (const [w, hgt] of WIDTHS) {
    await size(w, hgt);
    for (const [name, hash, want, after] of VIEWS) {
      const got = await open(A, hash, `${name} at ${w}`);
      if (got !== want) width.push(`${name} at ${w}: drew ${got}, not ${want}`);
      const failedMap = await evaluate("Boolean(document.querySelector('[data-map-slot][data-map=\"failed\"]'))");
      if (failedMap) width.push(`${name} at ${w}: its map or its file could not be drawn`);
      if (after && after.startsWith('type:')) {
        await evaluate("document.getElementById('loc').focus()");
        for (const ch of after.slice(5)) await send('Input.insertText', { text: ch });
        await evaluate(waitFor("!document.getElementById('loc-list').hidden && document.querySelectorAll('#loc-list a.loc-item').length > 0"));
      } else if (after) {
        await evaluate(after);
      }
      await evaluate(FRAMES);
      const m = await evaluate(MEASURE);
      if (m.sideways) width.push(`${name} at ${w}: the page scrolls sideways`);
      for (const x of m.wide) width.push(`${name} at ${w}: ${x} is wider than its panel`);
      for (const c of m.cut) width.push(`${name} at ${w}: ${c}`);
      for (const s of m.small) text.push(`${name} at ${w}: ${s}`);
      for (const l of m.low) text.push(`${name} at ${w}: contrast ${l}`);
      mapTexts += m.mapTexts;
      mapMinSize = Math.min(mapMinSize, m.mapMinSize);
      mapMinRatio = Math.min(mapMinRatio, m.mapMinRatio);
      minSize = Math.min(minSize, m.minSize);
      minRatio = Math.min(minRatio, m.minRatio);
      saved.push(await picture(name, w));
    }
  }
  h.say(!width.length, 'width', width.length ? `${width.length} problem(s): ${width.slice(0, 10).join('; ')}`
    : `${VIEWS.length} views at 1440 and at 1280, every map drawn: no map or table wider than its panel, no sideways scroll, no text cut off without a way to read it`);
  h.say(!text.length, 'text', text.length ? `${text.length} problem(s): ${text.slice(0, 10).join('; ')}`
    : `every piece of text at least 12px and 4.5 to 1 (smallest ${minSize.toFixed(1)}px, lowest ${minRatio.toFixed(2)} to 1); ${mapTexts} codes on maps measured as drawn: smallest ${mapMinSize.toFixed(1)}px, lowest ${mapMinRatio.toFixed(2)} to 1 against their own state`);

  /* ---------------------------------------------------------------- M16 */

  const m16Check = async (server) => {
    const p = [];
    for (const [w, hgt] of WIDTHS) {
      await size(w, hgt);
      await page.open(server, '#/', `M16 at ${w}`);
      const m = await evaluate(`(() => {
        const svg = document.querySelector('[data-map-slot="home"][data-map="drawn"] svg.map-home');
        const box = document.getElementById('loc');
        if (!svg || !box) return { drawn: Boolean(svg), box: Boolean(box) };
        const s = svg.getBoundingClientRect(); const b = box.getBoundingClientRect();
        return { drawn: true, box: true, left: Math.round(s.left), right: Math.round(s.right), top: Math.round(s.top), boxRight: Math.round(b.right), boxTop: Math.round(b.top), half: Math.round(innerWidth / 2), width: innerWidth, states: svg.querySelectorAll('a[data-shape]').length };
      })()`);
      if (!m.drawn) { p.push(`at ${w}: the map is not drawn with nothing pressed`); continue; }
      if (m.left < m.half - 40 || m.right > m.width || m.boxRight > m.half + 20 || Math.abs(m.top - m.boxTop) > 220 || m.states !== 52) p.push(`at ${w}: the map runs from ${m.left} to ${m.right} and starts at ${m.top}, the location box ends at ${m.boxRight} and starts at ${m.boxTop}, the middle is ${m.half}: the map is not in the right half beside the box`);
    }
    await size(1440, 900);
    return p;
  };
  const m16 = await m16Check(A);
  h.say(!m16.length, 'M16', m16.length ? m16.join('; ') : 'Find installers, opened fresh at 1440 by 900 and at 1280 by 800, drew the map of the 52 with nothing pressed, in the right half, beside the location box in the left');
  const m16b = await m16Check(broken.m16);
  h.say(m16b.length > 0, 'M16 on a broken copy', m16b.length ? `the measure fails as it should: ${m16b[0]}` : 'the measure passed on a copy whose map is below the location box');

  /* ---------------------------------------------------------------- M20 */

  const m20Check = async (server) => {
    const p = [];
    let worstBar = 0;
    let worstRow = 0;
    for (const [w, hgt] of WIDTHS) {
      await size(w, hgt);
      for (const hash of ['#/state/OH?county=39153&view=est', '#/state/OH?view=est', `#/zip/${Z.several}?view=est`, '#/city/OH-akron?view=pm', '#/state/OH?county=39153&view=rec']) {
        await page.open(server, hash, `M20 ${hash} at ${w}`);
        const m = await evaluate(`(() => { window.scrollTo(0, 0); const bar = document.querySelector('.loc-bar'); const row = document.querySelector('tr[data-tier="1"]'); return { bar: bar ? Math.round(bar.getBoundingClientRect().bottom) : null, row: row ? Math.round(row.getBoundingClientRect().top) : null }; })()`);
        if (m.bar === null || m.bar > 150) p.push(`${hash} at ${w}: the header and the location bar end at ${m.bar}px, not within 150`);
        if (m.row === null || m.row > 360) p.push(`${hash} at ${w}: the first Tier 1 row starts at ${m.row}px, not within 360`);
        worstBar = Math.max(worstBar, m.bar || 0);
        worstRow = Math.max(worstRow, m.row || 0);
      }
    }
    await size(1440, 900);
    return { p, worstBar, worstRow };
  };
  const m20 = await m20Check(A);
  h.say(!m20.p.length, 'M20', m20.p.length ? m20.p.join('; ') : `5 places (a county in each view, a state, a ZIP in several counties, a city) at 1440 by 900 and 1280 by 800: the header and the location bar end at ${m20.worstBar}px at most, the first Tier 1 row starts at ${m20.worstRow}px at most`);
  const m20b = await m20Check(broken.m20);
  h.say(m20b.p.length > 0, 'M20 on a broken copy', m20b.p.length ? `the measure fails as it should: ${m20b.p[0]}` : 'the measure passed on a copy whose location bar is tall');

  /* ---------------------------------------------------------------- M14 */

  const m14Check = async (server) => {
    const p = [];
    const state = "(() => { const b = document.querySelector('button[data-tier2-toggle]'); const part = document.getElementById(b.getAttribute('aria-controls')); return { label: b.textContent.trim(), expanded: b.getAttribute('aria-expanded'), hidden: part.hidden, rows: part.querySelectorAll('tr[data-tier=\"2\"]').length, focus: document.activeElement === b, scroll: Math.round(scrollY), hash: location.hash }; })()";
    const hash = '#/state/OH?county=39153&view=est';
    // By the mouse.
    await page.open(server, hash, 'M14 mouse');
    await click('button[data-tier2-toggle]');
    await evaluate(FRAMES);
    const scrollAt = await evaluate('Math.round(scrollY)');
    const m1 = await evaluate(state);
    if (m1.hidden || !m1.rows || m1.label !== TIER2_HIDE || m1.expanded !== 'true' || !m1.focus || m1.hash !== hash) p.push(`a click: the list ${m1.hidden ? 'stayed hidden' : 'showed'}, the label read "${m1.label}", aria-expanded ${m1.expanded}, the focus ${m1.focus ? 'stayed' : 'moved'}, the address ${m1.hash}`);
    await click('button[data-tier2-toggle]');
    await evaluate(FRAMES);
    const m2 = await evaluate(state);
    if (!m2.hidden || m2.label !== TIER2_SHOW || m2.expanded !== 'false' || m2.scroll !== scrollAt || m2.hash !== hash) p.push(`a second click: the list ${m2.hidden ? 'hid' : 'stayed'}, the label read "${m2.label}", the page scrolled from ${scrollAt} to ${m2.scroll}`);
    // By the keyboard: Tab to the button, Enter, then Space.
    await page.open(server, hash, 'M14 keyboard');
    await evaluate(FOCUSABLES());
    let reached = false;
    for (let i = 0; i < 300 && !reached; i++) {
      await key('Tab');
      reached = await evaluate("document.activeElement && document.activeElement.matches('button[data-tier2-toggle]')");
    }
    if (!reached) p.push('Tab did not reach the Tier 2 button');
    const scrollKey = await evaluate('Math.round(scrollY)');
    await key('Enter');
    await evaluate(FRAMES);
    const k1 = await evaluate(state);
    if (k1.hidden || k1.label !== TIER2_HIDE || k1.expanded !== 'true' || !k1.focus || k1.hash !== hash || k1.scroll !== scrollKey) p.push(`Enter: the list ${k1.hidden ? 'stayed hidden' : 'showed'}, the label read "${k1.label}", the focus ${k1.focus ? 'stayed' : 'moved'}, the page scrolled from ${scrollKey} to ${k1.scroll}`);
    await key(' ');
    await evaluate(FRAMES);
    const k2 = await evaluate(state);
    if (!k2.hidden || k2.label !== TIER2_SHOW || k2.expanded !== 'false' || !k2.focus || k2.hash !== hash) p.push(`Space: the list ${k2.hidden ? 'hid' : 'stayed'}, the label read "${k2.label}", the focus ${k2.focus ? 'stayed' : 'moved'}`);
    // A new address opens with Tier 2 hidden.
    await click('button[data-tier2-toggle]');
    await evaluate("location.hash = '#/state/OH?view=est'");
    await evaluate(waitFor("location.hash === '#/state/OH?view=est' && document.getElementById('content').dataset.view === 'state'"));
    const fresh2 = await evaluate("(() => { const b = document.querySelector('button[data-tier2-toggle]'); return b ? b.getAttribute('aria-expanded') : 'none'; })()");
    if (fresh2 !== 'false' && fresh2 !== 'none') p.push('a new place opened with its Tier 2 list showing');
    return p;
  };
  const m14 = await m14Check(A);
  h.say(!m14.length, 'M14', m14.length ? m14.join('; ') : 'Summit County, Ohio: by a click and again, and by Tab, Enter and Space, the Tier 2 list showed and hid, the label and aria-expanded changed, the focus stayed on the button, the page did not scroll and the address did not change; the next place opened with Tier 2 hidden');
  const m14b = await m14Check(broken.m14);
  h.say(m14b.length > 0, 'M14 on a broken copy', m14b.length ? `the measure fails as it should: ${m14b[0]}` : 'the measure passed on a copy whose button keeps its label');

  /* ---------------------------------------------------------------- the location box */

  const boxCheck = async (server) => {
    const p = [];
    await page.open(server, '#/', 'location box');
    const type = async (s) => {
      await evaluate("(() => { const i = document.getElementById('loc'); i.focus(); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()");
      for (const ch of s) await send('Input.insertText', { text: ch });
    };
    await type('summ');
    const list = await evaluate(waitFor("(() => { const l = document.getElementById('loc-list'); const a = [...l.querySelectorAll('a.loc-item')]; return !l.hidden && a.length ? { n: a.length, kinds: [...new Set(a.map((x) => x.dataset.kind))].join(','), status: document.getElementById('loc-status').textContent } : null; })()"));
    if (!list || !list.status) p.push(`typing "summ" offered ${list ? list.n : 'nothing'}${list && !list.status ? ', and nothing was said to a screen reader' : ''}`);
    const where = "(() => { const a = document.activeElement; const items = [...document.querySelectorAll('#loc-list a.loc-item')]; return a && a.id === 'loc' ? 'box' : items.indexOf(a); })()";
    await key('ArrowDown');
    const d1 = await evaluate(where);
    await key('ArrowDown');
    const d2 = await evaluate(where);
    await key('ArrowUp');
    const u1 = await evaluate(where);
    await key('ArrowUp');
    const u2 = await evaluate(where);
    if (d1 !== 0 || d2 !== Math.min(1, list ? list.n - 1 : 0) || u1 !== 0 || u2 !== 'box') p.push(`the arrow keys moved the focus to ${d1}, ${d2}, ${u1}, ${u2}, not 0, 1, 0 and the box`);
    await key('Escape');
    const closed = await evaluate("document.getElementById('loc-list').hidden && document.activeElement === document.getElementById('loc')");
    if (!closed) p.push('Escape did not close the suggestions and leave the focus in the box');
    await type('akron');
    const city = await evaluate(waitFor("[...document.querySelectorAll('#loc-list a.loc-item')].some((a) => a.dataset.kind === 'city' && a.getAttribute('href') === '#/city/OH-akron')"));
    if (!city) p.push('typing "akron" did not offer the city of Akron, Ohio');
    await type('44221');
    const zip = await evaluate(waitFor("(() => { const a = [...document.querySelectorAll('#loc-list a.loc-item')]; return a.length === 1 && a[0].dataset.kind === 'zip'; })()"));
    if (!zip) p.push('five digits did not offer the ZIP and nothing else');
    await key('Enter');
    const went = await evaluate(waitFor("location.hash === '#/zip/44221' && document.getElementById('content').dataset.view === 'zip' && !document.querySelector('[data-map=\"pending\"]')"));
    // Chrome and Edge keep at most 50 steps of history, so the step Enter adds is counted by going Back.
    await evaluate('history.back()');
    const back = await evaluate(waitFor("location.hash === '#/' && document.getElementById('content').dataset.view === 'home'"));
    if (!went || !back) p.push(`Enter ${went ? 'opened the ZIP' : 'did not open the ZIP'}; one Back ${back ? 'returned' : 'did not return'} to Find installers`);
    return p;
  };
  const box = await boxCheck(A);
  h.say(!box.length, 'location box', box.length ? box.join('; ') : 'on Find installers: "summ" offered places with their kinds, and said so to a screen reader; ArrowDown, ArrowDown, ArrowUp, ArrowUp moved through them and back to the box; Escape closed them; "akron" offered the city; five digits offered the ZIP alone, and Enter opened it with one step to Back');
  const boxb = await boxCheck(broken.box);
  h.say(boxb.length > 0, 'location box on a broken copy', boxb.length ? `the measure fails as it should: ${boxb[0]}` : 'the measure passed on a copy whose arrow keys do nothing');

  /* ---------------------------------------------------------------- addresses */

  const addressCheck = async (server) => {
    const p = [];
    const list = [
      ['#/state/OH', 'state'], ['#/state/ON?view=pm', 'state'], ['#/state/OH?county=39153&view=rec', 'state'], [`#/zip/${Z.one}`, 'zip'],
      [`#/zip/${Z.several}`, 'zip'], [`#/zip/${Z.outside}`, 'zip'], ['#/city/OH-akron', 'city'],
      ['#/state/ZZ', 'notFound'], ['#/state/OH?county=01001', 'notFound'], ['#/zip/4422', 'notFound'], ['#/city/OH-nowhere-at-all', 'notFound'],
    ];
    for (const [hash, want] of list) {
      const got = await page.open(server, hash, `addresses ${hash}`);
      if (got !== want) p.push(`${hash} showed ${got}`);
    }
    // Clicks with the mouse, as a person makes them, on a state and then on a county.
    const clickShape = async (shape) => {
      const pt = await evaluate(`(() => {
        const a = document.querySelector('a[data-shape="${shape}"]');
        if (!a) return null;
        a.scrollIntoView({ block: 'center' });
        const r = a.querySelector('path').getBoundingClientRect();
        for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) {
          const x = r.left + (r.width * i) / 8; const y = r.top + (r.height * j) / 8;
          const e = document.elementFromPoint(x, y);
          if (e && e.closest('a[data-shape]') === a) return { x, y };
        }
        return null;
      })()`);
      if (!pt) return false;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
      return true;
    };
    const at = (hash, view) => evaluate(waitFor(`location.hash === '${hash}' && document.getElementById('content').dataset.view === '${view}' && !document.querySelector('[data-map="pending"]')`));
    await page.open(server, '#/', 'addresses Back and Forward');
    const steps = [];
    steps.push(['a click on Ohio', (await clickShape('OH')) && (await at('#/state/OH', 'state'))]);
    steps.push(['a click on Summit County', (await clickShape('39153')) && (await at('#/state/OH?county=39153', 'state'))]);
    await evaluate('history.back()');
    steps.push(['Back', await at('#/state/OH', 'state')]);
    await evaluate('history.back()');
    steps.push(['Back again', await at('#/', 'home')]);
    await evaluate('history.forward()');
    steps.push(['Forward', await at('#/state/OH', 'state')]);
    const wrong = steps.filter(([, ok]) => !ok);
    if (wrong.length) p.push(`clicks, Back and Forward: ${wrong.map(([s]) => s).join(', ')} did not reach the view it should (the address is ${await evaluate('location.hash')})`);
    // Five digits typed in the box in the header give the ZIP's address, with one step to Back.
    await page.open(server, '#/', 'addresses typing a ZIP');
    await evaluate("document.getElementById('q').focus()");
    for (const ch of Z.one) await send('Input.insertText', { text: ch });
    const typed = await at(`#/zip/${Z.one}`, 'zip');
    await evaluate('history.back()');
    const backToFind = await at('#/', 'home');
    if (!typed || !backToFind) p.push(`typing a ZIP in the header: the address became ${typed ? 'the ZIP\'s' : 'something else'}, and one Back ${backToFind ? 'returned' : 'did not return'} to Find installers (the address is ${await evaluate('location.hash')})`);
    return p;
  };
  const addr = await addressCheck(A);
  h.say(!addr.length, 'addresses', addr.length ? addr.join('; ') : '11 addresses of places opened fresh each showed their view, unknown ones the not-found view; a click on a state and on a county, Back twice and Forward moved between views; typing a ZIP in the header gave its address with one step to Back');
  const addrBroken = await addressCheck(broken.addresses);
  h.say(addrBroken.length > 0, 'addresses on a broken copy', addrBroken.length ? `the measure fails as it should: ${addrBroken[0]}` : 'the measure passed on a copy that sends a state\'s address to the not-found view');

  /* ---------------------------------------------------------------- requests */

  const requestCheck = async (server) => {
    const p = [];
    const asked = async (hash) => {
      const from = page.requests.length;
      await page.open(server, hash, `requests ${hash}`);
      await evaluate(FRAMES);
      return page.requests.slice(from).map((r) => new URL(r.url).pathname).filter((u) => u.startsWith('/geo/') && u !== '/geo/counties.json');
    };
    const find = await asked('#/');
    if (find.join('|') !== '/geo/states-map.json') p.push(`Find installers, opened fresh, asked for ${find.join(', ') || 'no file'} beside the data, not its map's file alone`);
    for (const hash of ['#/installers', '#/about', '#/installers?q=Ohio', '#/installer/FAKE-102']) {
      const got = await asked(hash);
      if (got.length) p.push(`${hash} asked for ${got.join(', ')}`);
    }
    for (const code of ['OH', 'TX', 'ON', 'DC']) {
      const got = await asked(`#/state/${code}`);
      if (got.join('|') !== `/geo/counties/${code}.json`) p.push(`#/state/${code} asked for ${got.join(', ') || 'nothing'}, not its own shape file alone`);
    }
    const city = await asked('#/city/OH-akron');
    if (city.join('|') !== '/geo/cities/OH.json|/geo/counties/OH.json') p.push(`#/city/OH-akron asked for ${city.join(', ')}, not its city file and its state's shape file`);
    const zipAsked = await asked(`#/zip/${Z.one}`);
    const zipFiles = zipAsked.filter((u) => u.startsWith('/geo/zips/'));
    if (zipFiles.join('|') !== `/geo/zips/${Z.one[0]}.json`) p.push(`#/zip/${Z.one} asked for ${zipFiles.length} ZIP file(s), not the one for its first digit`);
    return p;
  };
  const req = await requestCheck(A);
  const away = page.requests.filter((r) => !r.url.startsWith('http://127.0.0.1:'));
  if (away.length) req.push(`${away.length} request(s) left 127.0.0.1`);
  h.say(!req.length, 'requests', req.length ? req.join('; ') : `Find installers, opened fresh, asked for its map's file beside the data; All installers, About, a search and an Installer view asked for no map, ZIP or city file; Ohio, Texas, Ontario and the District of Columbia each asked for its own shape file alone; a city for its city file and its state's shape file; a ZIP for the one ZIP file of its first digit; ${page.requests.length} requests so far, every one to 127.0.0.1`);
  const reqBroken = await requestCheck(broken.requests);
  h.say(reqBroken.length > 0, 'requests on a broken copy', reqBroken.length ? `the measure fails as it should: ${reqBroken[0]}` : 'the measure passed on a copy that asks for a ZIP file on Find installers');

  /* ---------------------------------------------------------------- width, errors and text on broken copies */

  await size(1440, 900);
  await page.open(broken.width, '#/', 'width on a broken copy');
  const bw = await evaluate(MEASURE);
  h.say(bw.wide.length > 0 || bw.sideways, 'width on a broken copy', bw.wide.length || bw.sideways ? `the measure fails as it should: ${bw.wide.join(', ') || 'the page scrolls sideways'}` : 'the measure passed on a copy whose map is wider than its panel');
  await page.open(broken.text, '#/', 'text on a broken copy');
  const bt = await evaluate(MEASURE);
  h.say(bt.small.length > 0 && bt.low.length > 0, 'text on a broken copy', bt.small.length && bt.low.length
    ? `the measure fails as it should: ${bt.small.length} codes under 12px as drawn, ${bt.low.length} under 4.5 to 1 against their state` : 'the measure passed on a copy whose codes are small and pale');
  const errorsBefore = page.errors.length;
  const errorsSoFar = page.errors.slice();
  await page.open(broken.errors, '#/state/OH', 'errors on a broken copy');
  await evaluate(FRAMES);
  const brokenErrors = page.errors.length - errorsBefore;
  h.say(!errorsSoFar.length, 'errors', errorsSoFar.length ? `${errorsSoFar.length} error(s): ${[...new Set(errorsSoFar)].slice(0, 8).join('; ')}` : 'no script error in any view opened so far');
  h.say(brokenErrors > 0, 'errors on a broken copy', brokenErrors > 0 ? `the measure fails as it should: ${brokenErrors} error(s) on a copy whose map stops with an error` : 'the measure found no error on a copy whose map stops with an error');
  page.errors.length = errorsBefore;

  /* ---------------------------------------------------------------- the keyboard */

  const mapKeyboard = async (server, hash, label) => {
    const p = [];
    await page.open(server, hash, `keyboard ${hash}`);
    const total = await evaluate(FOCUSABLES());
    const count = await evaluate(`(() => { window.__all = window.__f; window.__f = [...document.querySelectorAll('svg.map a[data-shape]')]; return window.__f.length; })()`);
    if (!count) return [`${label}: no shape on the map to reach`];
    const seen = [];
    let ringless = 0;
    for (let i = 0; i < total + 5 && seen.length < count; i++) {
      await key('Tab');
      const s = await evaluate(FOCUS_RING);
      if (s.i >= 0) { seen.push(s.i); if (!s.ring) ringless++; }
    }
    const inOrder = seen.every((v, i) => i === 0 || v > seen[i - 1]);
    if (seen.length !== count || !inOrder) p.push(`${label}: ${seen.length} of ${count} shapes reached with Tab${inOrder ? '' : ', out of order'}`);
    if (ringless) p.push(`${label}: ${ringless} shapes reached without a ring that shows`);
    // Enter on the first link, the last, and three between.
    for (const k of [0, Math.floor(count / 4), Math.floor(count / 2), Math.floor((3 * count) / 4), count - 1]) {
      await page.open(server, hash, `keyboard ${hash} Enter`);
      const href = await evaluate(`(() => { const a = document.querySelectorAll('svg.map a[data-shape]')[${k}]; a.focus(); return a.getAttribute('href'); })()`);
      await key('Enter');
      const arrived = await evaluate(waitFor(`location.hash === ${JSON.stringify(href)} && !document.querySelector('[data-map="pending"]') && document.getElementById('content').dataset.view`));
      if (!arrived) p.push(`${label}: Enter on shape ${k + 1} of ${count} did not open its address`);
    }
    // The link that skips the map moves the focus past it and leaves the address alone.
    await page.open(server, hash, `keyboard ${hash} skip`);
    const before = await evaluate('location.hash');
    await evaluate("document.querySelector('a[data-skip-to]').focus()");
    const shown = await evaluate("getComputedStyle(document.querySelector('a[data-skip-to]')).opacity === '1'");
    await key('Enter');
    const skipped = await evaluate(`(() => { const a = document.querySelector('a[data-skip-to]'); const t = document.getElementById(a.dataset.skipTo); return document.activeElement === t && location.hash === ${JSON.stringify(before)}; })()`);
    if (!shown || !skipped) p.push(`${label}: the link that skips the map ${shown ? '' : 'does not show on focus and '}${skipped ? 'works' : 'does not move the focus past the map, or changes the address'}`);
    return p;
  };
  const kb = [];
  kb.push(...await mapKeyboard(A, '#/', 'Find installers'));
  for (const code of KEYBOARD_STATES) kb.push(...await mapKeyboard(A, `#/state/${code}?view=est`, code));
  h.say(!kb.length, 'keyboard', kb.length ? kb.slice(0, 8).join('; ') : 'on Find installers all 52 states, and every county of Ohio, Texas, the District of Columbia and Ontario, reached with Tab in order with the green ring drawn on the shape; Enter on the first, the last and three between opened each address; the links that skip a map moved the focus past it and left the address alone');
  const kbBroken = await mapKeyboard(broken.keyboard, '#/', 'Find installers on a broken copy');
  h.say(kbBroken.length > 0, 'keyboard on a broken copy', kbBroken.length ? `the measure fails as it should: ${kbBroken[0]}` : 'the measure passed on a copy whose states cannot be reached with Tab');

  const awayAll = page.requests.filter((r) => !r.url.startsWith('http://127.0.0.1:'));
  h.say(!awayAll.length, 'no request left 127.0.0.1', awayAll.length ? `${awayAll.length} request(s) to another address` : `${page.requests.length} requests, every one to http://127.0.0.1`);
  h.note(`ZIP codes pictured: one county ${Z.one}; several ${Z.several}; not in the list ${Z.missing}; outside the map ${Z.outside}`);
  h.note(`Pictures saved in review-screens: ${saved.join(', ')}`);
}

await pictureRun('page:pictures:maps', run);
