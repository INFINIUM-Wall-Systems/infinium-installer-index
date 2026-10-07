/**
 * npm run page:pictures: the page in a browser, with made-up installers only.
 *
 * It builds the made-up data in temporary folders (the job's made-up installers and the page's
 * own, written by the job itself), starts the server of scripts\serve-made-up.mjs on 127.0.0.1,
 * finds Microsoft Edge or Google Chrome in the usual places, and starts it without a window,
 * with a throwaway profile in a temporary folder, pointed only at the server's address. It
 * drives the browser over the local connection the browser opens for its developer tools, with
 * Node's own WebSocket: no package.
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
 * temporary folder that leaves public\data out.
 *
 * Limits: 20 seconds to reach the browser, 8 minutes in all. Then, and whatever else happens, it
 * closes the browser, waits for it to end, stops the servers, and deletes its temporary folders,
 * trying a few times, each by its own path. It never reads public\data and never calls QuickBase.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { listPublic, PUBLIC, ROOT, startServer } from './serve-made-up.mjs';
import { removeFolder, removePageTemps, writeMadeUp } from './page-standins.mjs';

globalThis.fetch = async () => { throw new Error('page:pictures fetches nothing itself'); };

const REACH_LIMIT = 20 * 1000;
const TOTAL_LIMIT = 8 * 60 * 1000;
const HOUR = 3600 * 1000;
const SHOTS = join(ROOT, 'review-screens');
const WIDTHS = [[1440, 900], [1280, 800]];
const GREEN = 'rgb(118, 161, 52)';
/** npm run page:pictures -- --first-screens also saves what the window shows first, for a closer look. */
const FIRST_SCREENS = process.argv.includes('--first-screens');

const lines = [];
const say = (ok, id, text) => lines.push(`${ok ? 'PASS' : 'FAIL'} ${id}: ${text}`);
const note = (text) => lines.push(text);

/* ================================================================== the browser */

function findBrowser() {
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const local = process.env.LOCALAPPDATA;
  const list = process.platform === 'win32' ? [
    join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    local && join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ] : process.platform === 'darwin' ? [
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ] : ['/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return list.filter(Boolean).find((p) => existsSync(p)) || null;
}

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** The browser's local developer-tools connection, over Node's own WebSocket. */
function connect(url) {
  return new Promise((ok, fail) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const handlers = new Set();
    let id = 0;
    ws.onmessage = (ev) => {
      const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString('utf8'));
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id);
        pending.delete(m.id);
        clearTimeout(p.timer);
        if (m.error) p.fail(new Error(`${p.method}: ${m.error.message}`)); else p.ok(m.result);
      } else if (m.method) {
        for (const f of handlers) f(m);
      }
    };
    ws.onerror = () => fail(new Error('the local connection to the browser could not be opened'));
    ws.onopen = () => ok({
      send(method, params = {}, sessionId) {
        const n = ++id;
        ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
        return new Promise((res, rej) => {
          const timer = setTimeout(() => { pending.delete(n); rej(new Error(`${method} took too long`)); }, 30000);
          pending.set(n, { ok: res, fail: rej, timer, method });
        });
      },
      on(f) { handlers.add(f); return () => handlers.delete(f); },
      close() { try { ws.close(); } catch { /* already closed */ } },
    });
  });
}

/* ================================================================== in the page */

/** Waits until the page has drawn a view, with its fonts: the view's name. */
const DRAWN = `new Promise((ok) => {
  const t0 = Date.now();
  (function wait() {
    const v = document.getElementById('content') && document.getElementById('content').dataset.view;
    if (v || Date.now() - t0 > 10000) document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => ok(v || null))));
    else setTimeout(wait, 25);
  })();
})`;

/** Waits until a condition holds in the page, for up to 10 seconds: its value, or null. */
const waitFor = (cond) => `new Promise((ok) => { const t0 = Date.now(); (function w() { let v = null; try { v = (${cond}); } catch { v = null; } if (v || Date.now() - t0 > 10000) ok(v || null); else setTimeout(w, 25); })(); })`;
const FRAMES = 'new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(true))))';

/** V4, text size and contrast, worked out in the page. */
const MEASURE = `(() => {
  const parse = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c); if (!m) return null; const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (const l of layers.reverse()) base = over(l, base); return base; };
  const desc = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).join('.') : '') + (el.dataset && el.dataset.column ? '[' + el.dataset.column + ']' : '');
  const closedAway = (el) => Boolean(el.closest('[hidden]')) || Boolean(el.closest('details:not([open])') && !el.closest('summary'));
  const out = { sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, wide: [], cut: [], small: [], low: [], minSize: 99, minRatio: 99, texts: 0 };
  for (const t of document.querySelectorAll('table.grid')) {
    const panel = t.closest('.panel');
    if (panel && t.getBoundingClientRect().width > panel.clientWidth + 1) out.wide.push(desc(t));
  }
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.visually-hidden') || closedAway(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || !el.getClientRects().length) continue;
    if (cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) out.cut.push(desc(el) + ' (sideways)');
    if (cs.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1) out.cut.push(desc(el) + ' (downward)');
    if ((el.tagName === 'TD' || el.tagName === 'TH') && el.scrollWidth > el.clientWidth + 1) out.cut.push(desc(el) + ' (spills out of its cell)');
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth) out.cut.push(desc(el) + ' (cut with an ellipsis)');
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE'].includes(el.tagName) || closedAway(el) || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    out.texts++;
    const size = parseFloat(cs.fontSize);
    out.minSize = Math.min(out.minSize, size);
    if (size < 12) out.small.push(desc(el) + ' ' + size + 'px');
    const bg = bgOf(el);
    const fg0 = parse(cs.color);
    const fg = fg0.a < 1 ? over(fg0, bg) : fg0;
    const a = lum(fg) + 0.05; const b = lum(bg) + 0.05;
    const ratio = Math.max(a, b) / Math.min(a, b);
    out.minRatio = Math.min(out.minRatio, ratio);
    if (ratio < 4.5) out.low.push(desc(el) + ' ' + ratio.toFixed(2));
  }
  out.cut = [...new Set(out.cut)]; out.small = [...new Set(out.small)]; out.low = [...new Set(out.low)];
  return out;
})()`;

/** V3, worked out in the page after scrolling down. */
const STICKY = `new Promise((ok) => {
  window.scrollTo(0, Math.min(1200, document.documentElement.scrollHeight - innerHeight));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const bar = document.querySelector('.searchbar').getBoundingClientRect();
    const ths = [...document.querySelectorAll('table.grid thead th')];
    const bad = ths.filter((th) => { const r = th.getBoundingClientRect(); return !(r.top >= bar.bottom - 1 && r.top < innerHeight && r.bottom > bar.bottom); }).length;
    ok({ scrolled: Math.round(window.scrollY), titles: ths.length, bad, barBottom: Math.round(bar.bottom), firstTop: ths.length ? Math.round(ths[0].getBoundingClientRect().top) : null });
  }));
})`;

/* ================================================================== the run */

const temps = [];
let browser = null;
let cdp = null;
const servers = [];
let timedOut = false;

async function run() {
  // The made-up data: as now, out of date (ruling 8), and the page without installers.json (V16).
  const now = Date.now();
  const fresh = await writeMadeUp({ builtAt: now - HOUR, tag: 'fresh' });
  const stale = await writeMadeUp({ builtAt: now - 72 * HOUR, tag: 'stale' });
  const A = await startServer({ madeUpDir: fresh.dir });
  const B = await startServer({ madeUpDir: stale.dir });
  const C = await startServer({ madeUpDir: fresh.dir, leaveOut: ['installers.json'] });
  servers.push(A, B, C);

  // A copy of the page with a broken style, data left out, for V3 and V4 failing.
  const copyRoot = mkdtempSync(join(tmpdir(), 'installer-index-broken-style-'));
  temps.push(copyRoot);
  const copy = join(copyRoot, 'public');
  for (const name of listPublic(PUBLIC)) {
    const to = join(copy, ...name.split('/'));
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(PUBLIC, ...name.split('/')), to);
  }
  if (existsSync(join(copy, 'data'))) throw new Error('the copy of the page holds a data folder');
  appendFileSync(join(copy, 'css', 'site.css'), '\n/* broken on purpose */\n.grid th { position: static !important; }\ntable.grid { table-layout: auto !important; width: 2200px !important; }\n.grid td { white-space: nowrap !important; overflow-wrap: normal !important; }\n');
  const D = await startServer({ madeUpDir: fresh.dir, publicRoot: copy });
  servers.push(D);

  // The browser, without a window, with a throwaway profile, pointed at the server alone.
  const exe = findBrowser();
  if (!exe) { note('NO BROWSER: neither Microsoft Edge nor Google Chrome was found in the usual places; no pictures and no measures were made.'); return; }
  const profile = mkdtempSync(join(tmpdir(), 'installer-index-browser-'));
  temps.push(profile);
  const started = Date.now();
  browser = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--disable-default-apps', '--disable-domain-reliability', '--disable-client-side-phishing-detection',
    '--no-pings', '--mute-audio', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', '--window-size=1440,900',
    `${A.url}/`], { stdio: 'ignore', windowsHide: true });
  browser.exited = new Promise((ok) => { browser.once('exit', ok); browser.once('error', ok); });
  let port = null;
  while (Date.now() - started < REACH_LIMIT && !port) {
    try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n'); } catch { await sleep(200); }
  }
  if (!port) { note(`NO BROWSER: ${exe.split(/[\\/]/).pop()} did not open its local connection within 20 seconds; no pictures and no measures were made.`); return; }
  cdp = await connect(`ws://127.0.0.1:${port[0].trim()}${port[1].trim()}`);
  const version = await cdp.send('Browser.getVersion');
  note(`Browser: ${exe.split(/[\\/]/).pop()}, ${version.product}, reached in ${((Date.now() - started) / 1000).toFixed(1)} seconds`);
  const { targetInfos } = await cdp.send('Target.getTargets');
  let target = targetInfos.find((t) => t.type === 'page');
  if (!target) target = { targetId: (await cdp.send('Target.createTarget', { url: `${A.url}/` })).targetId };
  const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const send = (method, params = {}) => cdp.send(method, params, sid);

  // What the page asks for, and every script error.
  const requests = [];
  const errors = [];
  let where = '';
  let quiet404 = false;
  cdp.on((m) => {
    if (m.sessionId !== sid) return;
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
    if (m.method === 'Runtime.exceptionThrown') errors.push(`${where}: an exception`);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(`${where}: a console error`);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !(quiet404 && m.params.entry.source === 'network')) errors.push(`${where}: a ${m.params.entry.source} error`);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`a measure stopped in the page at ${where}`);
    return r.result.value;
  };
  let loads = 0;
  const loadWaiters = new Set();
  cdp.on((m) => { if (m.sessionId === sid && m.method === 'Page.loadEventFired') for (const f of loadWaiters) f(); });
  const open = async (server, hash, label = hash) => {
    where = label;
    quiet404 = server === C;
    const loaded = new Promise((ok) => { const f = () => { loadWaiters.delete(f); ok(); }; loadWaiters.add(f); setTimeout(f, 15000); });
    await send('Page.navigate', { url: `${server.url}/?v=${++loads}${hash}` });
    await loaded;
    return evaluate(DRAWN);
  };
  const size = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const key = async (k) => {
    const codes = { Tab: 9, Enter: 13, Escape: 27 };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: codes[k], nativeVirtualKeyCode: codes[k], ...(k === 'Enter' ? { text: '\r' } : {}) });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: codes[k], nativeVirtualKeyCode: codes[k] });
  };
  const picture = async (name, width) => {
    await evaluate('window.scrollTo(0, 0)');
    const m = await send('Page.getLayoutMetrics');
    const height = Math.ceil((m.cssContentSize || m.contentSize).height);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
    mkdirSync(SHOTS, { recursive: true });
    const file = `${name}-${width}.png`;
    writeFileSync(join(SHOTS, file), Buffer.from(shot.data, 'base64'));
    return file;
  };

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
    ['data-not-loaded', C, '#/installers', 'error'],
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
    for (const [name, server, hash, want, after] of VIEWS) {
      const got = await open(server, hash, `${name} at ${width}`);
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
  say(!v4.length, 'V4', v4.length ? `${v4.length} problem(s): ${v4.slice(0, 12).join('; ')}` : `${VIEWS.length} views at 1440 and at 1280: no table wider than its panel, no sideways scroll, no text cut off by its box`);
  say(!text.length, 'text size and contrast', text.length ? `${text.length} problem(s): ${text.slice(0, 12).join('; ')}`
    : `${textCount} pieces of text in ${VIEWS.length} views at both widths: smallest ${minSize}px, lowest contrast ${minRatio.toFixed(2)} to 1`);

  // V3: the column titles after scrolling down, both column sets, both widths.
  const v3 = [];
  for (const [width, height] of WIDTHS) {
    await size(width, height);
    for (const hash of ['#/installers', '#/installers?set=rates']) {
      await open(A, hash, `${hash} at ${width}`);
      const s = await evaluate(STICKY);
      if (s.scrolled < 300 || !s.titles || s.bad) v3.push(`${hash} at ${width}: scrolled ${s.scrolled}px, ${s.bad} of ${s.titles} titles out of view or under the bar (bar ends at ${s.barBottom}px, first title at ${s.firstTop}px)`);
      else v3.push(null);
    }
  }
  const v3bad = v3.filter(Boolean);
  say(!v3bad.length, 'V3', v3bad.length ? v3bad.join('; ') : 'both column sets at 1440 and 1280: after scrolling down, every column title is in view, just below the search bar');

  // V3 and V4 shown failing on the copy with a broken style.
  await size(1440, 900);
  await open(D, '#/installers', 'the broken copy');
  const bs = await evaluate(STICKY);
  await evaluate('window.scrollTo(0, 0)');
  const bm = await evaluate(MEASURE);
  const v3fails = bs.bad > 0;
  const v4fails = bm.sideways || bm.wide.length > 0 || bm.cut.length > 0;
  say(v3fails, 'V3 on a broken style', v3fails ? `the measure fails as it should: ${bs.bad} of ${bs.titles} titles scrolled out of view` : 'the measure passed on a copy whose titles do not stay in view');
  say(v4fails, 'V4 on a broken style', v4fails ? `the measure fails as it should: ${bm.wide.length} table(s) wider than the panel, sideways scroll ${bm.sideways ? 'yes' : 'no'}, ${bm.cut.length} box(es) cutting text` : 'the measure passed on a copy whose table is wider than its panel');

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
  say(!v1.length, 'V1', v1.length ? v1.join('; ') : `${addresses.length} addresses opened fresh each showed their view and title; Back and Forward moved between views; typing three letters kept the address in step and added one step to Back`);

  // Tab and Escape.
  const tab = [];
  let reached = 0;
  for (const hash of ['#/', '#/installers', '#/installer/FAKE-102', '#/search?q=abby', '#/not-on-the-map', '#/about']) {
    await open(A, hash, `Tab ${hash}`);
    const count = await evaluate(`(() => {
      const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]') && !(el.closest('details:not([open])') && !el.matches('summary'));
      window.__f = [...document.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"])')].filter(visible);
      document.activeElement && document.activeElement.blur();
      window.scrollTo(0, 0);
      return window.__f.length;
    })()`);
    const seen = [];
    let ringless = 0;
    for (let i = 0; i < count + 3; i++) {
      await key('Tab');
      const s = await evaluate(`(() => {
        const a = document.activeElement; const i = window.__f.indexOf(a); if (i < 0) return { i };
        const cs = getComputedStyle(a); const green = '${GREEN}';
        const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 && cs.outlineColor === green;
        const ring = cs.boxShadow.includes('rgba(118, 161, 52') && cs.borderTopColor === green;
        return { i, ring: outline || ring };
      })()`);
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
  say(!tab.length, 'Tab and Escape', tab.length ? tab.join('; ') : `${reached} links, buttons and fields in 6 views each reached with Tab, in the page's order, with a green focus ring; Escape closed "Show all contacts" and an open state, and put the focus back`);

  // V15 and the requests.
  say(!errors.length, 'V15', errors.length ? `${errors.length} error(s): ${[...new Set(errors)].slice(0, 10).join('; ')}` : 'no script error in any view (the 404 of the deliberately missing installers.json aside)');
  const away = requests.filter((u) => !u.startsWith('http://127.0.0.1:'));
  say(!away.length, 'no request left 127.0.0.1', away.length ? `${away.length} request(s) to another address` : `${requests.length} requests, every one to http://127.0.0.1; the browser could resolve no other host`);
  note(`Pictures saved in review-screens: ${saved.join(', ')}`);
}

async function cleanUp() {
  if (cdp) {
    try { await Promise.race([cdp.send('Browser.close'), sleep(5000)]); } catch { /* closing anyway */ }
    cdp.close();
  }
  if (browser) {
    const ended = await Promise.race([browser.exited.then(() => true), sleep(10000).then(() => false)]);
    if (!ended) { try { browser.kill(); } catch { /* gone */ } await Promise.race([browser.exited, sleep(5000)]); }
    note(`Browser ended: ${ended ? 'yes' : 'stopped by force'}`);
  }
  for (const s of servers.splice(0)) await s.close();
  note('Servers stopped');
  const left = [];
  for (const d of temps.splice(0)) if (!(await removeFolder(d))) left.push(d.replace(/\\/g, '/'));
  left.push(...await removePageTemps());
  note(left.length ? `Temporary folders that would not go: ${left.join(', ')}` : 'Temporary folders: each deleted by its own path, and confirmed gone');
}

let failed = false;
let watchdog = null;
const limit = new Promise((_, fail) => { watchdog = setTimeout(() => { timedOut = true; fail(new Error('8 minutes')); }, TOTAL_LIMIT); });
try {
  await Promise.race([run(), limit]);
} catch (e) {
  failed = true;
  note(`STOPPED: ${timedOut ? 'the 8-minute limit was reached' : `an error of kind ${e && e.constructor ? e.constructor.name : 'error'}: ${e && e.message}`}`);
} finally {
  clearTimeout(watchdog);
  await cleanUp();
}
for (const l of lines) console.log(l);
const bad = failed || lines.some((l) => l.startsWith('FAIL') || l.startsWith('NO BROWSER'));
console.log(bad ? 'page:pictures: not every measure passed' : 'page:pictures: PASS');
process.exit(bad ? 1 : 0);
