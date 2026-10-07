/**
 * npm run page:pictures:maps: the map views in a browser, with made-up installers only: the
 * Home map, the State view with its county map and its county box, and ZIP lookup. The same
 * server, browser, limits and clean-up as npm run page:pictures (scripts\page-browser.mjs).
 *
 * Pictures, into review-screens\, at 1440 by 900 and at 1280 by 800, each the whole page: Home
 * with its map; Home with one state reached by Tab; the State views of Ohio, Texas, Alaska,
 * Hawaii, Michigan, Virginia, Louisiana, the District of Columbia and Ontario; a county chosen;
 * a county nobody serves; a ZIP in one county; a ZIP in several; a ZIP not in the list; a ZIP
 * outside the map; About this data; a search that names a state. And each map's panel alone at
 * 1440, for a closer look.
 *
 * Measures, PASS or FAIL, each also shown failing on a copy of the page broken for it:
 *   addresses     every new address, opened fresh, shows its view; Back and Forward move
 *                 between them; typing a ZIP adds one step to Back
 *   requests      opening a State view asks for its own shape file and no other; no ZIP file is
 *                 asked for until a ZIP is opened, and then only one; no request leaves 127.0.0.1
 *   width         no map is wider than its panel and the page does not scroll sideways
 *   errors        no script error in any view
 *   text          no text under 12px and every piece of text at least 4.5 to 1, a code on a map
 *                 measured as it is drawn: its font size times the map's scale, its fill against
 *                 the fill of its own state
 *   keyboard      on Home every state, and in the State views of Ohio, Texas, the District of
 *                 Columbia and Ontario every county, reached with Tab, in order, with a ring that
 *                 shows; Enter on the first link of each map, the last, and three between; the
 *                 links that skip a map move the focus past it and leave the address alone
 * Every picture and measure of a view with a map waits until its map's part is marked drawn.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC, startServer } from './serve-made-up.mjs';
import { writeMadeUp } from './page-standins.mjs';
import { brokenCopy, FOCUS_RING, FOCUSABLES, FRAMES, MEASURE, pictureRun, waitFor, WIDTHS } from './page-browser.mjs';

globalThis.fetch = async () => { throw new Error('page:pictures:maps fetches nothing itself'); };

const HOUR = 3600 * 1000;
const STATES_PICTURED = ['OH', 'TX', 'AK', 'HI', 'MI', 'VA', 'LA', 'DC', 'ON'];
const KEYBOARD_STATES = ['OH', 'TX', 'DC', 'ON'];

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

/** A copy of public\ with one file's text changed: [find, replace] pairs, each of which must be there. */
function scriptChange(file, pairs) {
  return (copy) => {
    const path = join(copy, ...file.split('/'));
    let text = readFileSync(path, 'utf8');
    for (const [find, replace] of pairs) {
      if (!text.includes(find)) throw new Error(`the broken copy could not be made: ${file} does not hold the text to change`);
      text = text.replace(find, replace);
    }
    return { path, text };
  };
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

  const page = await h.browser(`${A.url}/`);
  if (!page) return;
  const { evaluate, open, size, key, picture, pictureOf, send } = page;

  /* ---------------------------------------------------------------- pictures, width and text */

  const VIEWS = [
    ['home-map', '#/', 'home'],
    ['home-state-by-tab', '#/', 'home', 'tab:OH'],
    ...STATES_PICTURED.map((code) => [`state-${code}`, `#/state/${code}`, 'state']),
    ['state-county-chosen', '#/state/OH?county=39153', 'state'],
    ['state-county-nobody-serves', '#/state/OH?county=39001', 'state'],
    ['zip-one-county', `#/zip/${Z.one}`, 'zip'],
    ['zip-several-counties', `#/zip/${Z.several}`, 'zip'],
    ['zip-not-in-list', `#/zip/${Z.missing}`, 'zip'],
    ['zip-outside-map', `#/zip/${Z.outside}`, 'zip'],
    ['about-this-data-maps', '#/about', 'about'],
    ['search-names-state', '#/search?q=Ohio', 'search'],
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
      if (failedMap) width.push(`${name} at ${w}: its map could not be drawn`);
      if (after && after.startsWith('tab:')) {
        const code = after.slice(4);
        await evaluate(FOCUSABLES());
        for (let i = 0; i < 400; i++) {
          await key('Tab');
          if (await evaluate(`document.activeElement && document.activeElement.dataset && document.activeElement.dataset.shape === '${code}'`)) break;
        }
        await evaluate(FRAMES);
      }
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
      if (w === 1440 && !after && (await evaluate("Boolean(document.querySelector('.map-panel svg.map'))"))) {
        const f = await pictureOf('.map-panel', `map-panel-${name}-1440.png`);
        if (f) saved.push(f);
      }
    }
  }
  h.say(!width.length, 'width', width.length ? `${width.length} problem(s): ${width.slice(0, 10).join('; ')}`
    : `${VIEWS.length} views at 1440 and at 1280, every map drawn: no map wider than its panel, no sideways scroll, no text cut off by its box`);
  h.say(!text.length, 'text', text.length ? `${text.length} problem(s): ${text.slice(0, 10).join('; ')}`
    : `every piece of text at least 12px and 4.5 to 1 (smallest ${minSize.toFixed(1)}px, lowest ${minRatio.toFixed(2)} to 1); ${mapTexts} codes on maps measured as drawn: smallest ${mapMinSize.toFixed(1)}px, lowest ${mapMinRatio.toFixed(2)} to 1 against their own state`);

  /* ---------------------------------------------------------------- addresses */

  const addressCheck = async (server) => {
    const p = [];
    const list = [
      ['#/state/OH', 'state'], ['#/state/ON', 'state'], ['#/state/OH?county=39153', 'state'], [`#/zip/${Z.one}`, 'zip'],
      [`#/zip/${Z.several}`, 'zip'], [`#/zip/${Z.outside}`, 'zip'], [`#/search?q=${Z.one}`, 'zip'],
      ['#/state/ZZ', 'notFound'], ['#/state/OH?county=01001', 'notFound'], ['#/zip/4422', 'notFound'],
    ];
    for (const [hash, want] of list) {
      const got = await page.open(server, hash, `addresses ${hash}`);
      if (got !== want) p.push(`${hash} showed ${got}`);
    }
    // Clicks with the mouse, as a person makes them, on a state and then on a county.
    const click = async (shape) => {
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
    steps.push(['a click on Ohio', (await click('OH')) && (await at('#/state/OH', 'state'))]);
    steps.push(['a click on Summit County', (await click('39153')) && (await at('#/state/OH?county=39153', 'state'))]);
    await evaluate('history.back()');
    steps.push(['Back', await at('#/state/OH', 'state')]);
    await evaluate('history.back()');
    steps.push(['Back again', await at('#/', 'home')]);
    await evaluate('history.forward()');
    steps.push(['Forward', await at('#/state/OH', 'state')]);
    const wrong = steps.filter(([, ok]) => !ok);
    if (wrong.length) p.push(`clicks, Back and Forward: ${wrong.map(([s]) => s).join(', ')} did not reach the view it should (the address is ${await evaluate('location.hash')})`);
    // Typing a ZIP from Home adds one step to Back, not one for every digit.
    await page.open(server, '#/', 'addresses typing a ZIP');
    await evaluate("document.getElementById('q').focus()");
    for (const ch of Z.one) await send('Input.insertText', { text: ch });
    const typed = await at(`#/zip/${Z.one}`, 'zip');
    await evaluate('history.back()');
    const backToHome = await at('#/', 'home');
    if (!typed || !backToHome) p.push(`typing a ZIP: the address became ${typed ? 'the ZIP\'s' : 'something else'}, and one Back ${backToHome ? 'returned' : 'did not return'} to Home (the address is ${await evaluate('location.hash')})`);
    return p;
  };
  const addr = await addressCheck(A);
  h.say(!addr.length, 'addresses', addr.length ? addr.join('; ') : '10 new addresses opened fresh each showed their view, unknown ones the not-found view; a click on a state and on a county, Back twice and Forward moved between views; typing a ZIP gave its address with one step to Back');
  const addrBroken = await addressCheck(broken.addresses);
  h.say(addrBroken.length > 0, 'addresses on a broken copy', addrBroken.length ? `the measure fails as it should: ${addrBroken[0]}` : 'the measure passed on a copy that sends a state\'s address to the not-found view');

  /* ---------------------------------------------------------------- requests */

  const requestCheck = async (server) => {
    const p = [];
    const asked = async (hash) => {
      const from = page.requests.length;
      await page.open(server, hash, `requests ${hash}`);
      await evaluate(FRAMES);
      return page.requests.slice(from).map((r) => new URL(r.url).pathname).filter((u) => u.startsWith('/geo/'));
    };
    for (const hash of ['#/', '#/installers', '#/about', '#/search?q=Ohio', '#/installer/FAKE-102']) {
      const got = await asked(hash);
      const zips = got.filter((u) => u.startsWith('/geo/zips/'));
      if (zips.length) p.push(`${hash} asked for a ZIP file before a ZIP was opened`);
      const shapes = got.filter((u) => u.startsWith('/geo/counties/'));
      if (shapes.length) p.push(`${hash} asked for a county shape file`);
    }
    for (const code of ['OH', 'TX', 'ON', 'DC']) {
      const got = await asked(`#/state/${code}`);
      const shapes = got.filter((u) => u.startsWith('/geo/counties/') || u === '/geo/states-map.json');
      if (shapes.join('|') !== `/geo/counties/${code}.json`) p.push(`#/state/${code} asked for ${shapes.length} shape file(s), not its own alone`);
      if (got.some((u) => u.startsWith('/geo/zips/'))) p.push(`#/state/${code} asked for a ZIP file`);
    }
    const zipAsked = await asked(`#/zip/${Z.one}`);
    const zipFiles = zipAsked.filter((u) => u.startsWith('/geo/zips/'));
    if (zipFiles.join('|') !== `/geo/zips/${Z.one[0]}.json`) p.push(`#/zip/${Z.one} asked for ${zipFiles.length} ZIP file(s), not the one for its first digit`);
    return p;
  };
  const req = await requestCheck(A);
  const away = page.requests.filter((r) => !r.url.startsWith('http://127.0.0.1:'));
  if (away.length) req.push(`${away.length} request(s) left 127.0.0.1`);
  h.say(!req.length, 'requests', req.length ? req.join('; ') : `Home, All installers, About, a search and an Installer view asked for no ZIP and no county file; Ohio, Texas, Ontario and the District of Columbia each asked for its own shape file alone; a ZIP asked for the one ZIP file of its first digit; ${page.requests.length} requests so far, every one to 127.0.0.1`);
  const reqBroken = await requestCheck(broken.requests);
  h.say(reqBroken.length > 0, 'requests on a broken copy', reqBroken.length ? `the measure fails as it should: ${reqBroken[0]}` : 'the measure passed on a copy that asks for a ZIP file on Home');

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
  kb.push(...await mapKeyboard(A, '#/', 'Home'));
  for (const code of KEYBOARD_STATES) kb.push(...await mapKeyboard(A, `#/state/${code}`, code));
  h.say(!kb.length, 'keyboard', kb.length ? kb.slice(0, 8).join('; ') : 'on Home all 52 states, and every county of Ohio, Texas, the District of Columbia and Ontario, reached with Tab in order with the green ring drawn on the shape; Enter on the first, the last and three between opened each address; the links that skip a map moved the focus past it and left the address alone');
  const kbBroken = await mapKeyboard(broken.keyboard, '#/', 'Home on a broken copy');
  h.say(kbBroken.length > 0, 'keyboard on a broken copy', kbBroken.length ? `the measure fails as it should: ${kbBroken[0]}` : 'the measure passed on a copy whose states cannot be reached with Tab');

  const awayAll = page.requests.filter((r) => !r.url.startsWith('http://127.0.0.1:'));
  h.say(!awayAll.length, 'no request left 127.0.0.1', awayAll.length ? `${awayAll.length} request(s) to another address` : `${page.requests.length} requests, every one to http://127.0.0.1`);
  h.note(`ZIP codes pictured: one county ${Z.one}; several ${Z.several}; not in the list ${Z.missing}; outside the map ${Z.outside}`);
  h.note(`Pictures saved in review-screens: ${saved.join(', ')}`);
}

await pictureRun('page:pictures:maps', run);
