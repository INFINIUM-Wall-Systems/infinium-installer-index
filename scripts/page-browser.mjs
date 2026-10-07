/**
 * What npm run page:pictures and npm run page:pictures:maps share: finding Microsoft Edge or
 * Google Chrome, starting it without a window with a throwaway profile in a temporary folder,
 * pointed only at the local server's address, driving it over the local connection the browser
 * opens for its developer tools with Node's own WebSocket, the measures worked out in the page,
 * and the clean-up: close the browser and wait for it to end, stop the servers, delete the
 * temporary folders by their own paths, trying a few times.
 *
 * It never reads public\data and never calls QuickBase.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { listPublic, PUBLIC, ROOT } from './serve-made-up.mjs';
import { removeFolder, removePageTemps } from './page-standins.mjs';

export const REACH_LIMIT = 20 * 1000;
export const TOTAL_LIMIT = 8 * 60 * 1000;
export const SHOTS = join(ROOT, 'review-screens');
export const WIDTHS = [[1440, 900], [1280, 800]];
export const GREEN = 'rgb(118, 161, 52)';
export const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/* ================================================================== the browser */

export function findBrowser() {
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

/** The browser's local developer-tools connection, over Node's own WebSocket. */
export function connect(url) {
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

/**
 * Waits until the page has drawn a view, with its fonts, and every map's part of it is marked
 * drawn or failed (step 4a of the page's second prompt): the view's name.
 */
export const DRAWN = `new Promise((ok) => {
  const t0 = Date.now();
  (function wait() {
    const main = document.getElementById('content');
    const v = main && main.dataset.view;
    const pending = main && main.querySelector('[data-map-slot][data-map="pending"]');
    if ((v && !pending) || Date.now() - t0 > 15000) document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => ok(v || null))));
    else setTimeout(wait, 25);
  })();
})`;

/** Waits until a condition holds in the page, for up to 10 seconds: its value, or null. */
export const waitFor = (cond) => `new Promise((ok) => { const t0 = Date.now(); (function w() { let v = null; try { v = (${cond}); } catch { v = null; } if (v || Date.now() - t0 > 10000) ok(v || null); else setTimeout(w, 25); })(); })`;
export const FRAMES = 'new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(true))))';

/**
 * V4, text size and contrast, worked out in the page. Text in a drawing is measured as it is
 * drawn: its size on the screen is its font size times the drawing's scale, and its colour is its
 * fill, against the fill of the shape it is written on.
 */
export const MEASURE = `(() => {
  const parse = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c); if (!m) return null; const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (const l of layers.reverse()) base = over(l, base); return base; };
  const desc = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).join('.') : '') + (el.dataset && el.dataset.column ? '[' + el.dataset.column + ']' : '') + (el.closest && el.closest('[data-shape]') ? '[' + el.closest('[data-shape]').dataset.shape + ']' : '');
  const closedAway = (el) => Boolean(el.closest('[hidden]')) || Boolean(el.closest('details:not([open])') && !el.closest('summary'));
  const out = { sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, wide: [], cut: [], small: [], low: [], minSize: 99, minRatio: 99, texts: 0, mapTexts: 0, mapMinSize: 99, mapMinRatio: 99 };
  for (const t of document.querySelectorAll('table.grid, svg.map')) {
    const panel = t.closest('.panel');
    if (panel && t.getBoundingClientRect().width > panel.clientWidth + 1) out.wide.push(desc(t));
  }
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.visually-hidden') || closedAway(el) || el.closest('svg')) continue;
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
    if (!el || ['SCRIPT', 'STYLE', 'title'].includes(el.tagName) || closedAway(el) || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const svg = el.closest('svg');
    let size;
    let fg;
    let bg;
    if (svg && el.tagName === 'text') {
      const ctm = el.getScreenCTM();
      size = parseFloat(cs.fontSize) * (ctm ? Math.hypot(ctm.a, ctm.b) : 1);
      fg = parse(cs.fill);
      const shape = el.parentElement && el.parentElement.querySelector('path');
      bg = shape ? parse(getComputedStyle(shape).fill) : bgOf(svg);
      if (!fg) fg = { r: 0, g: 0, b: 0, a: 1 };
      if (!bg) bg = bgOf(svg);
      if (bg.a < 1) bg = over(bg, bgOf(svg));
      out.mapTexts++;
    } else if (svg) {
      continue;
    } else {
      size = parseFloat(cs.fontSize);
      bg = bgOf(el);
      fg = parse(cs.color);
    }
    out.texts++;
    if (fg.a < 1) fg = over(fg, bg);
    out.minSize = Math.min(out.minSize, size);
    if (size < 12) out.small.push(desc(el) + ' ' + size.toFixed(1) + 'px');
    const a = lum(fg) + 0.05; const b = lum(bg) + 0.05;
    const ratio = Math.max(a, b) / Math.min(a, b);
    out.minRatio = Math.min(out.minRatio, ratio);
    if (svg) { out.mapMinSize = Math.min(out.mapMinSize, size); out.mapMinRatio = Math.min(out.mapMinRatio, ratio); }
    if (ratio < 4.5) out.low.push(desc(el) + ' ' + ratio.toFixed(2));
  }
  out.cut = [...new Set(out.cut)]; out.small = [...new Set(out.small)]; out.low = [...new Set(out.low)];
  return out;
})()`;

/** V3, worked out in the page after scrolling down. */
export const STICKY = `new Promise((ok) => {
  window.scrollTo(0, Math.min(1200, document.documentElement.scrollHeight - innerHeight));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const bar = document.querySelector('.searchbar').getBoundingClientRect();
    const ths = [...document.querySelectorAll('table.grid thead th')];
    const bad = ths.filter((th) => { const r = th.getBoundingClientRect(); return !(r.top >= bar.bottom - 1 && r.top < innerHeight && r.bottom > bar.bottom); }).length;
    ok({ scrolled: Math.round(window.scrollY), titles: ths.length, bad, barBottom: Math.round(bar.bottom), firstTop: ths.length ? Math.round(ths[0].getBoundingClientRect().top) : null });
  }));
})`;

/** Lists what Tab should reach in the page, in its order; returns how many. */
export const FOCUSABLES = (scope = 'document') => `(() => {
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]') && !(el.closest('details:not([open])') && !el.matches('summary'));
  window.__f = [...${scope}.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"])')].filter(visible);
  document.activeElement && document.activeElement.blur();
  window.scrollTo(0, 0);
  return window.__f.length;
})()`;

/**
 * Where the focus is, among the list FOCUSABLES made, and whether it shows a ring: a green
 * outline or a green glow around a field, or, for a shape on a map, the green ring app.js draws
 * over the map on that shape.
 */
export const FOCUS_RING = `(() => {
  const a = document.activeElement; const i = window.__f.indexOf(a); if (i < 0) return { i };
  const green = '${GREEN}';
  if (a.matches('a[data-shape]')) {
    const ring = a.closest('svg').querySelector('.map-ring');
    const path = a.querySelector('path');
    const cs = ring && getComputedStyle(ring);
    return { i, ring: Boolean(ring && path && ring.getAttribute('d') === path.getAttribute('d') && cs.stroke === green && parseFloat(cs.strokeWidth) >= 2 && cs.display !== 'none') };
  }
  const cs = getComputedStyle(a);
  const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 && cs.outlineColor === green;
  const glow = cs.boxShadow.includes('rgba(118, 161, 52') && cs.borderTopColor === green;
  return { i, ring: outline || glow };
})()`;

/** A copy of the page without its data folder, with css appended to its styles. */
export function brokenCopy(h, tag, css, change = null) {
  const copy = join(h.temp(tag), 'public');
  for (const name of listPublic(PUBLIC)) {
    const to = join(copy, ...name.split('/'));
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(PUBLIC, ...name.split('/')), to);
  }
  if (existsSync(join(copy, 'data'))) throw new Error('the copy of the page holds a data folder');
  if (css) appendFileSync(join(copy, 'css', 'site.css'), `\n/* broken on purpose */\n${css}\n`);
  if (change) {
    const { path, text } = change(copy);
    writeFileSync(path, text);
  }
  return copy;
}

/* ================================================================== a run */

/**
 * One run of a picture command: run(h) is handed the harness; the run ends within 8 minutes,
 * and whatever happens the browser is closed, the servers stopped and the temporary folders
 * deleted. Prints its lines and ends the process: 0 when every measure passed.
 */
export async function pictureRun(name, run) {
  const lines = [];
  const temps = [];
  const servers = [];
  let browser = null;
  let cdp = null;
  const h = {
    lines,
    say: (ok, id, text) => lines.push(`${ok ? 'PASS' : 'FAIL'} ${id}: ${text}`),
    note: (text) => lines.push(text),
    temp: (tag) => { const d = mkdtempSync(join(tmpdir(), `installer-index-${tag}-`)); temps.push(d); return d; },
    server: (s) => { servers.push(s); return s; },
    /** Starts the browser at the first address: the page harness, or null when it cannot be driven. */
    async browser(firstUrl) {
      const exe = findBrowser();
      if (!exe) { h.note('NO BROWSER: neither Microsoft Edge nor Google Chrome was found in the usual places; no pictures and no measures were made.'); return null; }
      const profile = h.temp('browser');
      const started = Date.now();
      browser = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
        '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-component-update',
        '--disable-sync', '--disable-default-apps', '--disable-domain-reliability', '--disable-client-side-phishing-detection',
        '--no-pings', '--mute-audio', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', '--window-size=1440,900',
        firstUrl], { stdio: 'ignore', windowsHide: true });
      browser.exited = new Promise((ok) => { browser.once('exit', ok); browser.once('error', ok); });
      let port = null;
      while (Date.now() - started < REACH_LIMIT && !port) {
        try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n'); } catch { await sleep(200); }
      }
      if (!port) { h.note(`NO BROWSER: ${exe.split(/[\\/]/).pop()} did not open its local connection within 20 seconds; no pictures and no measures were made.`); return null; }
      cdp = await connect(`ws://127.0.0.1:${port[0].trim()}${port[1].trim()}`);
      const version = await cdp.send('Browser.getVersion');
      h.note(`Browser: ${exe.split(/[\\/]/).pop()}, ${version.product}, reached in ${((Date.now() - started) / 1000).toFixed(1)} seconds`);
      const { targetInfos } = await cdp.send('Target.getTargets');
      let target = targetInfos.find((t) => t.type === 'page');
      if (!target) target = { targetId: (await cdp.send('Target.createTarget', { url: firstUrl })).targetId };
      const { sessionId: sid } = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
      const send = (method, params = {}) => cdp.send(method, params, sid);
      const page = { send, requests: [], errors: [], where: '', quiet404: false };
      cdp.on((m) => {
        if (m.sessionId !== sid) return;
        if (m.method === 'Network.requestWillBeSent') page.requests.push({ url: m.params.request.url, where: page.where });
        if (m.method === 'Runtime.exceptionThrown') page.errors.push(`${page.where}: an exception`);
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') page.errors.push(`${page.where}: a console error`);
        if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !(page.quiet404 && m.params.entry.source === 'network')) page.errors.push(`${page.where}: a ${m.params.entry.source} error`);
      });
      await send('Page.enable');
      await send('Runtime.enable');
      await send('Network.enable');
      await send('Log.enable');
      page.evaluate = async (expression) => {
        const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(`a measure stopped in the page at ${page.where}`);
        return r.result.value;
      };
      let loads = 0;
      const loadWaiters = new Set();
      cdp.on((m) => { if (m.sessionId === sid && m.method === 'Page.loadEventFired') for (const f of loadWaiters) f(); });
      /** Opens an address fresh, and waits until its view and its maps are drawn. */
      page.open = async (server, hash, label = hash, { quiet404 = false } = {}) => {
        page.where = label;
        page.quiet404 = quiet404;
        const loaded = new Promise((ok) => { const f = () => { loadWaiters.delete(f); ok(); }; loadWaiters.add(f); setTimeout(f, 15000); });
        await send('Page.navigate', { url: `${server.url}/?v=${++loads}${hash}` });
        await loaded;
        return page.evaluate(DRAWN);
      };
      page.size = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      page.key = async (k) => {
        const codes = { Tab: 9, Enter: 13, Escape: 27 };
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: codes[k], nativeVirtualKeyCode: codes[k], ...(k === 'Enter' ? { text: '\r' } : {}) });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: codes[k], nativeVirtualKeyCode: codes[k] });
      };
      /** The whole page, top to bottom, as review-screens\<name>-<width>.png. */
      page.picture = async (name, width) => {
        await page.evaluate('window.scrollTo(0, 0)');
        const m = await send('Page.getLayoutMetrics');
        const height = Math.ceil((m.cssContentSize || m.contentSize).height);
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
        mkdirSync(SHOTS, { recursive: true });
        const file = `${name}-${width}.png`;
        writeFileSync(join(SHOTS, file), Buffer.from(shot.data, 'base64'));
        return file;
      };
      /** One element alone, as review-screens\<file>. */
      page.pictureOf = async (selector, file) => {
        const box = await page.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()`);
        if (!box) return null;
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 } });
        mkdirSync(SHOTS, { recursive: true });
        writeFileSync(join(SHOTS, file), Buffer.from(shot.data, 'base64'));
        return file;
      };
      return page;
    },
  };

  const started = Date.now();
  let failed = false;
  let timedOut = false;
  let watchdog = null;
  const limit = new Promise((_, fail) => { watchdog = setTimeout(() => { timedOut = true; fail(new Error('8 minutes')); }, TOTAL_LIMIT); });
  try {
    await Promise.race([run(h), limit]);
  } catch (e) {
    failed = true;
    h.note(`STOPPED: ${timedOut ? 'the 8-minute limit was reached' : `an error of kind ${e && e.constructor ? e.constructor.name : 'error'}: ${e && e.message}`}`);
  } finally {
    clearTimeout(watchdog);
    if (cdp) {
      try { await Promise.race([cdp.send('Browser.close'), sleep(5000)]); } catch { /* closing anyway */ }
      cdp.close();
    }
    if (browser) {
      const ended = await Promise.race([browser.exited.then(() => true), sleep(10000).then(() => false)]);
      if (!ended) { try { browser.kill(); } catch { /* gone */ } await Promise.race([browser.exited, sleep(5000)]); }
      h.note(`Browser ended: ${ended ? 'yes' : 'stopped by force'}`);
    }
    for (const s of servers.splice(0)) await s.close();
    h.note('Servers stopped');
    const left = [];
    for (const d of temps.splice(0)) if (!(await removeFolder(d))) left.push(d.replace(/\\/g, '/'));
    left.push(...await removePageTemps());
    h.note(left.length ? `Temporary folders that would not go: ${left.join(', ')}` : 'Temporary folders: each deleted by its own path, and confirmed gone');
  }
  h.note(`Took ${Math.round((Date.now() - started) / 1000)} seconds`);
  for (const l of lines) console.log(l);
  const bad = failed || lines.some((l) => l.startsWith('FAIL') || l.startsWith('NO BROWSER'));
  console.log(bad ? `${name}: not every measure passed` : `${name}: PASS`);
  process.exit(bad ? 1 : 0);
}
