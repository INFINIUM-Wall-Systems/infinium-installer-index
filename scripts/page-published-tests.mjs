/**
 * The self-test cases of npm run check:page:published (scripts\check-page-published.mjs): its
 * lines on the three files the job writes from the made-up installers, in a temporary folder,
 * passing; and each line failing, for its own reason (mustSay), on a broken stand-in for one of
 * the page's functions or a broken copy of a file. npm run check:selftest runs them.
 *
 * Nothing here reads public\data, the real key or QuickBase.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderView } from '../public/js/views.js';
import { search } from '../public/js/search.js';
import { checkPagePublished, LINES } from './check-page-published.mjs';
import { hasClass, madeUpTexts, pageTemp, transformed } from './page-standins.mjs';

export const PAGE_PUBLISHED_TESTS = [];
const test = (line, label, sound, broken) => PAGE_PUBLISHED_TESTS.push({ line, label, sound, broken });
const NOW = Date.parse('2026-10-07T16:00:00Z');
const REAL = { render: renderView, search };

/** The made-up files in a new temporary folder, with change(name, text) applied to each. */
async function folder(change = (name, text) => text) {
  const t = await madeUpTexts();
  const dir = pageTemp('published');
  for (const [name, text] of Object.entries(t)) {
    const out = change(name, text);
    if (typeof out === 'string') writeFileSync(join(dir, name), out);
  }
  return dir;
}

/** check:page:published on a folder, as one result: ok when every line passed; why, the lines that failed. */
async function run(dirPromise, I = REAL) {
  const { results } = checkPagePublished(await dirPromise, I, { now: NOW });
  if (results.length !== LINES.length || results.some((r, i) => r.id !== LINES[i])) return { ok: false, why: 'the lines are not those of check:page:published, in order' };
  const failing = results.filter((r) => !r.ok);
  return { ok: !failing.length, why: failing.length ? failing.map((r) => `${r.id} FAIL: ${r.text}`).join(' | ') : `every line passed (${results.length})` };
}

const sound = { label: 'the three files the job wrote from the made-up installers', run: () => run(folder()) };
const broken = (label, mustSay, make) => ({ label, mustSay, run: make });
const withRender = (render) => ({ ...REAL, render });
const dropping = (f) => withRender(transformed(renderView, (n) => (f(n) ? null : n)));

test('page published', 'check:page:published runs the page\'s plain functions over the files the job wrote',
  [sound],
  [
    broken('installers.json not there', 'views FAIL: could not tell', () => run(folder((name, text) => (name === 'installers.json' ? null : text)))),
    broken('an Installer view that stops with an error', 'views FAIL', () => run(folder(), withRender((r, m, o) => { if (r.view === 'installer' && r.id === 'FAKE-102') throw new TypeError('made up'); return renderView(r, m, o); }))),
    broken('the EMR left out of the Installer view', 'first at fault: emr, text', () => run(folder(), dropping((n) => n.attrs['data-field'] === 'emr'))),
    broken('an office city left out of the Installer view', 'first at fault: office.city, text', () => run(folder(), withRender(transformed(renderView, (n) => (hasClass(n, 'line') && /Columbus/.test(JSON.stringify(n)) ? null : n))))),
    broken('a view that writes undefined', 'words FAIL', () => run(folder(), withRender(transformed(renderView, (n) => (n.attrs['data-field'] === 'office' ? { ...n, children: [...n.children, `${undefined}`] } : n))))),
    broken('a county left out of each state', 'counties FAIL', () => run(folder(), withRender(transformed(renderView, (n) => (n.tag === 'ul' && hasClass(n, 'county-list') ? { ...n, children: n.children.slice(1) } : n))))),
    broken('"Last confirmed" left off', 'last confirmed FAIL', () => run(folder(), dropping((n) => n.attrs['data-field'] === 'lastConfirmed'))),
    broken('build.json that counts one more installer without territory', 'not on the map FAIL', () => run(folder((name, text) => (name === 'build.json' ? text.replace(/"installersWithoutTerritory": (\d+)/, (m, d) => `"installersWithoutTerritory": ${Number(d) + 1}`) : text)))),
    broken('About this data without the count of contacts', 'about FAIL: 1 value(s) not shown; first: counts.contacts, number', () => run(folder(), dropping((n) => n.attrs['data-count'] === 'contacts'))),
    broken('rows that show no stand-in', 'rows FAIL', () => run(folder(), withRender(transformed(renderView, (n) => (hasClass(n, 'contacts') ? { ...n, attrs: { ...n.attrs, 'data-standins': 0 } } : n))))),
    broken('Ohio shaded as if nobody had territory there', 'home map FAIL: 1 of 52 states at the wrong step or not drawn; first OH', () => run(folder(), withRender(transformed(renderView, (n) => (n.attrs['data-shape'] === 'OH' ? { ...n, attrs: { ...n.attrs, 'data-step': 0 } } : n))))),
    broken('a State view that stops with an error', 'state views FAIL: 1 State view(s) did not draw; first 48141', () => run(folder(), withRender((r, m, o) => { if (r.view === 'state' && r.county === '48141') throw new TypeError('made up'); return renderView(r, m, o); }))),
    broken('Summit County shaded as if nobody served it', 'county maps FAIL: 1 of 3193 counties', () => run(folder(), withRender(transformed(renderView, (n) => (n.attrs['data-shape'] === '39153' ? { ...n, attrs: { ...n.attrs, 'data-step': 0 } } : n))))),
    broken('a foot line with a number written in', 'foot line FAIL', () => run(folder(), withRender(transformed(renderView, (n) => (hasClass(n, 'foot-line') ? { ...n, attrs: { ...n.attrs, 'data-foot': 21 } } : n))))),
    broken('a map that shades every state a step darker', 'steps FAIL', () => run(folder(), withRender(transformed(renderView, (n) => (n.attrs['data-shape'] && n.attrs['data-step'] < 5 ? { ...n, attrs: { ...n.attrs, 'data-step': n.attrs['data-step'] + 1 } } : n))))),
  ]);
