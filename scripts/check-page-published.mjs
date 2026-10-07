/**
 * npm run check:page:published [-- <folder>]: runs the page's plain functions (public\js) over
 * the three files in public\data, or in the folder given, with public\geo\counties.json, the way
 * the page reads them. It never loads the page in a browser and never makes a picture.
 *
 * Each line prints PASS or FAIL with counts:
 *   views           every installer gives an All installers row in both column sets, a search
 *                   result (a search for its company name) and an Installer view, without an error
 *   fields          in every Installer view, every filled field section 4.4 names appears and no
 *                   empty one does
 *   words           no view holds undefined, null, NaN or [object Object], unless the
 *                   installer's own record holds that word
 *   counties        for every installer and every state it covers, the counties the Installer
 *                   view lists are as many as the file's two counts
 *   last confirmed  "Last confirmed" shows only for CONFIRMED BY PARTNER
 *   not on the map  Not on the map lists as many installers as build.json counts without territory
 *   about           About this data shows the counts build.json holds
 *   rows            how many rows show a stand-in, nobody in a place, and one person in both
 *                   places, beside the same counts made from the file
 *   home map        for each of the 52, the Home map's step is the one for the number of
 *                   installers territory.json gives it
 *   state views     every State view draws without an error, with and without a county chosen
 *   county maps     for each of the 3,193 counties, the county map's step is the one for the
 *                   number of installers territory.json gives it, and the list with that county
 *                   chosen holds as many installers
 *   foot line       the foot line's number is build.json's number without territory
 *   steps           how many counties and states fall on each of the five steps and on none, on
 *                   the maps, beside the same counts made from territory.json
 * The map lines read the map files of publicgeo. A failing map line names at most a state's
 * code or a county's id, never an installer.
 *
 * It prints counts, file names, the names of values and their kinds, and PASS or FAIL. Never a
 * company, a person, an email, a phone, an address, a rate or an installer id, and never what a
 * view held. A failing line names the check, a count, and the name and kind of the value in the
 * file that was at fault, such as office.city, text. An error is printed by its kind and the
 * step it came at, never by its own text.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readData } from '../public/js/data.js';
import { textOf, toHtml } from '../public/js/html.js';
import { search } from '../public/js/search.js';
import { renderView } from '../public/js/views.js';
import { bannedIn, installerViewProblems, rowsOf } from './page-tests.mjs';
import { byAttr, find, findAll, kindOf, squash } from './page-standins.mjs';
import { geoFiles, servedFrom, stepOf } from './map-tests.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLISHED = join(ROOT, 'public', 'data');
export const COUNTIES = join(ROOT, 'public', 'geo', 'counties.json');
export const LINES = ['views', 'fields', 'words', 'counties', 'last confirmed', 'not on the map', 'about', 'rows', 'home map', 'state views',
  'county maps', 'foot line', 'steps'];
const CONFIRMED = 'CONFIRMED BY PARTNER';
const FILES = { build: 'build.json', installers: 'installers.json', territory: 'territory.json' };

const kindOfError = (e) => (e && e.constructor && e.constructor.name) || typeof e;
const commas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** The real functions; a self-test case hands broken ones. */
export const REAL = { render: renderView, search };

/** "2 installer(s); first at fault: office.city, text" */
const fault = (n, total, first) => `${n} of ${total} installer(s)${first ? `; first at fault: ${first.name}, ${kindOf(first.value)}` : ''}`;

/**
 * Every line, worked out on the files in `folder`: { results, facts }. results: one
 * { id, ok, text } for each of LINES. facts: the count of installers. It never throws.
 */
export function checkPagePublished(folder = PUBLISHED, I = REAL, { now = Date.now(), countiesPath = COUNTIES } = {}) {
  const results = [];
  const facts = { installers: null };
  const line = (id, work) => {
    try {
      const [ok, text] = work();
      results.push({ id, ok, text });
    } catch (e) {
      results.push({ id, ok: false, text: `could not tell: an error of kind ${kindOfError(e)} at step "${id}"` });
    }
  };
  let model = null;
  let territoryText = null;
  try {
    const texts = {};
    for (const [key, name] of Object.entries(FILES)) {
      const path = join(folder, name);
      texts[key] = existsSync(path) ? readFileSync(path, 'utf8') : null;
    }
    texts.counties = readFileSync(countiesPath, 'utf8');
    territoryText = texts.territory;
    const r = Object.values(texts).every((t) => typeof t === 'string') ? readData(texts) : { ok: false };
    model = r.ok ? r.model : null;
  } catch {
    model = null;
  }
  if (!model) {
    for (const id of LINES) results.push({ id, ok: false, text: 'could not tell: the files could not be read as the page reads them' });
    return { results, facts };
  }
  const list = model.installers;
  const total = list.length;
  facts.installers = total;
  const opts = { now };
  const views = { contact: null, rates: null };
  const one = new Map();
  const found = new Map();

  line('views', () => {
    let errors = 0;
    let errorKind = null;
    const attempt = (f) => { try { return f(); } catch (e) { errors++; errorKind ||= kindOfError(e); return null; } };
    views.contact = attempt(() => I.render({ view: 'installers', set: 'contact', status: null }, model, opts));
    views.rates = attempt(() => I.render({ view: 'installers', set: 'rates', status: null }, model, opts));
    const has = (out) => new Set(out ? rowsOf(out.node).map((r) => r.attrs['data-installer']) : []);
    const inContact = has(views.contact);
    const inRates = has(views.rates);
    let rowsBoth = 0;
    let results2 = 0;
    let installerViews = 0;
    let firstMissing = null;
    for (const i of list) {
      if (inContact.has(i.id) && inRates.has(i.id)) rowsBoth++;
      else firstMissing ||= { name: 'id', value: i.id };
      const out = attempt(() => I.render({ view: 'search', q: i.company }, model, opts));
      const row = out && rowsOf(out.node).find((r) => r.attrs['data-installer'] === i.id);
      if (row) { results2++; found.set(i.id, row); } else if (out) firstMissing ||= { name: 'company', value: i.company };
      const view = attempt(() => I.render({ view: 'installer', id: i.id }, model, opts));
      if (view && view.view === 'installer') { installerViews++; one.set(i.id, view); } else if (view) firstMissing ||= { name: 'id', value: i.id };
      attempt(() => toHtml(view.node));
    }
    attempt(() => toHtml(views.contact.node));
    attempt(() => toHtml(views.rates.node));
    const okAll = rowsBoth === total && results2 === total && installerViews === total && errors === 0;
    const text = `${total} installers: ${rowsBoth} with a row in both column sets, ${results2} found by a search for the company, ${installerViews} Installer views; ${errors} error(s)${errorKind ? `, first of kind ${errorKind}` : ''}`;
    return [okAll, okAll ? text : `${text}; ${fault(total - Math.min(rowsBoth, results2, installerViews), total, firstMissing)}`];
  });

  line('fields', () => {
    let bad = 0;
    let first = null;
    let fields = 0;
    for (const i of list) {
      const out = one.get(i.id);
      if (!out) { bad++; first ||= { name: 'id', value: i.id }; continue; }
      const p = installerViewProblems(i, out, territoryText).filter((x) => !String(x.name).startsWith('territory'));
      fields += byAttr(out.node, 'data-field').length;
      if (p.length) { bad++; first ||= p[0]; }
    }
    return [bad === 0, bad ? `fields: ${fault(bad, total, first)}` : `${total} Installer views checked: every filled field of section 4.4 shown, and no empty one (${fields} fields shown)`];
  });

  line('words', () => {
    let bad = 0;
    let first = null;
    let viewsChecked = 0;
    for (const i of list) {
      const htmls = [one.get(i.id), found.get(i.id) && { node: found.get(i.id) }]
        .concat([views.contact, views.rates].map((v) => v && { node: rowsOf(v.node).find((r) => r.attrs['data-installer'] === i.id) }))
        .filter((x) => x && x.node).map((x) => toHtml(x.node));
      viewsChecked += htmls.length;
      const words = htmls.flatMap((h) => bannedIn(h, [i]));
      if (words.length) { bad++; first ||= { name: words[0], value: words[0] }; }
    }
    const whole = ['home', 'notOnMap', 'about'].map((v) => toHtml(I.render({ view: v }, model, opts).node));
    const wholeBad = whole.flatMap((h) => bannedIn(h, list));
    viewsChecked += whole.length;
    const okAll = bad === 0 && wholeBad.length === 0;
    return [okAll, okAll ? `${viewsChecked} views and rows checked: none holds undefined, null, NaN or [object Object]`
      : `${bad} of ${total} installer(s), and ${wholeBad.length} word(s) in Home, Not on the map and About; first: ${first ? first.name : wholeBad[0]}`];
  });

  line('counties', () => {
    let states = 0;
    let bad = 0;
    let first = null;
    let withTerritory = 0;
    for (const i of list) {
      if (!i.territory || !Array.isArray(i.territory.states)) continue;
      withTerritory++;
      const out = one.get(i.id);
      for (const s of i.territory.states) {
        states++;
        const d = out && findAll(out.node, (n) => n.tag === 'details' && n.attrs['data-state'] === s.state)[0];
        const count = (tier) => (d ? findAll(find(d, (n) => n.attrs['data-tier'] === tier) || [], (n) => n.tag === 'li').length : -1);
        if (count(1) !== s.tier1Counties || count(2) !== s.tier2Counties) { bad++; first ||= { name: 'territory.states.tier1Counties', value: s.tier1Counties }; }
      }
    }
    return [bad === 0, bad ? `${bad} of ${states} state(s) list a different number of counties; first at fault: ${first.name}, ${kindOf(first.value)}`
      : `${withTerritory} installers with territory, ${states} states and provinces: each lists as many counties at each tier as the file's two counts`];
  });

  line('last confirmed', () => {
    let shown = 0;
    let wrong = 0;
    for (const i of list) {
      const out = one.get(i.id);
      const has = Boolean(out && byAttr(out.node, 'data-field', 'lastConfirmed').length);
      if (has) shown++;
      if (has && i.status !== CONFIRMED) wrong++;
      if (!has && i.status === CONFIRMED && i.lastConfirmed) wrong++;
    }
    const confirmed = list.filter((i) => i.status === CONFIRMED && i.lastConfirmed).length;
    return [wrong === 0, `"Last confirmed" shows on ${shown} installer(s); ${confirmed} are CONFIRMED BY PARTNER with a date; ${wrong} shown or left out wrongly`];
  });

  line('not on the map', () => {
    const out = I.render({ view: 'notOnMap' }, model, opts);
    const n = rowsOf(out.node).length;
    const want = model.build.counts.installersWithoutTerritory;
    return [n === want, `Not on the map lists ${n} installer(s); build.json counts ${want} without territory`];
  });

  line('about', () => {
    const out = I.render({ view: 'about' }, model, opts);
    const rowText = (key) => squash(textOf(find(out.node, (n) => n.tag === 'tr' && n.attrs['data-count'] === key) || ''));
    const p = [];
    const c = model.build.counts;
    for (const [k, v] of Object.entries(c)) if (k !== 'byStatus' && !rowText(k).endsWith(commas(v))) p.push(`counts.${k}, ${kindOf(v)}`);
    for (const s of c.byStatus) if (!rowText(`status:${s.status}`).endsWith(commas(s.installers))) p.push('counts.byStatus.installers, number');
    for (const [k, v] of Object.entries(model.build.gaps)) if (!rowText(`gap:${k}`).endsWith(commas(v))) p.push(`gaps.${k}, ${kindOf(v)}`);
    const checks = findAll(out.node, (n) => n.tag === 'tr' && n.attrs['data-check'] !== undefined);
    if (checks.length !== model.build.checks.length) p.push(`checks, list: ${checks.length} shown of ${model.build.checks.length}`);
    const n = Object.keys(c).length - 1 + c.byStatus.length + Object.keys(model.build.gaps).length;
    return [p.length === 0, p.length ? `${p.length} value(s) not shown; first: ${p[0]}` : `About this data shows the ${n} counts and gap counts build.json holds, and its ${checks.length} checks`];
  });

  line('rows', () => {
    const fromView = { standIn: 0, nobody: 0, both: 0 };
    for (const r of rowsOf(views.contact.node)) {
      const cell = find(r, (n) => typeof n.attrs.class === 'string' && n.attrs.class.split(' ').includes('contacts'));
      if (!cell) continue;
      if (Number(cell.attrs['data-standins']) > 0) fromView.standIn++;
      if (Number(cell.attrs['data-nobody']) > 0) fromView.nobody++;
      if (Number(cell.attrs['data-both']) > 0) fromView.both++;
    }
    const fromFile = { standIn: 0, nobody: 0, both: 0 };
    for (const i of list) {
      const row = i.row || {};
      const q = row.quoting;
      const s = row.scheduling;
      if ((q && q.standIn === true) || (s && s.standIn === true)) fromFile.standIn++;
      if (((row.gap === 'quoting' || row.gap === 'both') && !q) || ((row.gap === 'scheduling' || row.gap === 'both') && !s)) fromFile.nobody++;
      if (q && s && q.contact === s.contact) fromFile.both++;
    }
    const same = JSON.stringify(fromView) === JSON.stringify(fromFile);
    return [same, `rows showing a stand-in ${fromView.standIn}, beside ${fromFile.standIn} from the file; nobody in a place ${fromView.nobody}, beside ${fromFile.nobody}; one person in both places ${fromView.both}, beside ${fromFile.both}`];
  });

  // The maps: what territory.json gives each state and county, worked out apart from the page.
  const served = servedFrom(territoryText);
  const files = geoFiles();
  const mapOpts = { now, files };
  const shapes = (out) => findAll(out.node, (n) => n.tag === 'a' && n.attrs['data-shape'] !== undefined);
  const stateViews = new Map();
  const countyViews = new Map();

  line('home map', () => {
    const out = I.render({ view: 'home' }, model, mapOpts);
    const drawn = shapes(out);
    let bad = 0;
    let first = null;
    for (const s of model.stateList) {
      const a = drawn.find((x) => x.attrs['data-shape'] === s.code);
      const want = stepOf((served.byState.get(s.code) || new Set()).size);
      if (!a || a.attrs['data-step'] !== want) { bad++; first ||= s.code; }
    }
    return [bad === 0, bad ? `${bad} of ${model.stateList.length} states at the wrong step or not drawn; first ${first}`
      : `${model.stateList.length} states, each at the step for its number of installers`];
  });

  line('state views', () => {
    let errors = 0;
    let errorKind = null;
    let first = null;
    let drawn = 0;
    for (const s of model.stateList) {
      const counties = [null, ...(model.countiesByState.get(s.code) || []).map((c) => c.id)];
      for (const county of counties) {
        try {
          const out = I.render({ view: 'state', code: s.code, county }, model, mapOpts);
          toHtml(out.node);
          if (out.view !== 'state') throw new TypeError('not the State view');
          if (county) countyViews.set(county, out); else stateViews.set(s.code, out);
          drawn++;
        } catch (e) {
          errors++;
          errorKind ||= kindOfError(e);
          first ||= county || s.code;
        }
      }
    }
    return [errors === 0, errors ? `${errors} State view(s) did not draw; first ${first}, an error of kind ${errorKind}` : `${drawn} State views drawn, ${model.stateList.length} with no county chosen and ${drawn - model.stateList.length} with one`];
  });

  line('county maps', () => {
    let bad = 0;
    let first = null;
    let checked = 0;
    for (const s of model.stateList) {
      const out = stateViews.get(s.code);
      if (!out) { bad++; first ||= s.code; continue; }
      const drawn = shapes(out);
      for (const c of model.countiesByState.get(s.code) || []) {
        const n = served.byCounty.has(c.id) ? served.byCounty.get(c.id).ids.size : 0;
        const a = drawn.find((x) => x.attrs['data-shape'] === c.id);
        const chosen = countyViews.get(c.id);
        if (!a || a.attrs['data-step'] !== stepOf(n) || !chosen || rowsOf(chosen.node).length !== n) { bad++; first ||= c.id; }
        checked++;
      }
    }
    return [bad === 0, bad ? `${bad} of ${checked} counties at the wrong step, or listing another number of installers; first ${first}`
      : `${checked} counties, each at the step for its number of installers, and each listing as many when chosen`];
  });

  line('foot line', () => {
    const out = stateViews.get('OH') || I.render({ view: 'state', code: model.stateList[0].code, county: null }, model, mapOpts);
    const foot = find(out.node, (n) => typeof n.attrs.class === 'string' && n.attrs.class.split(' ').includes('foot-line'));
    const shown = foot ? foot.attrs['data-foot'] : null;
    const want = model.build.counts.installersWithoutTerritory;
    const text = foot ? squash(textOf(foot)) : '';
    const okText = text.startsWith(`${commas(want)} installer`);
    return [shown === want && okText, `the foot line carries ${shown ?? 'no number'}; build.json counts ${want} without territory`];
  });

  line('steps', () => {
    const fromMaps = { counties: [0, 0, 0, 0, 0, 0], states: [0, 0, 0, 0, 0, 0] };
    const fromFile = { counties: [0, 0, 0, 0, 0, 0], states: [0, 0, 0, 0, 0, 0] };
    for (const a of shapes(I.render({ view: 'home' }, model, mapOpts))) fromMaps.states[a.attrs['data-step']]++;
    for (const out of stateViews.values()) for (const a of shapes(out)) fromMaps.counties[a.attrs['data-step']]++;
    for (const s of model.stateList) fromFile.states[stepOf((served.byState.get(s.code) || new Set()).size)]++;
    for (const c of model.countyById.values()) fromFile.counties[stepOf(served.byCounty.has(c.id) ? served.byCounty.get(c.id).ids.size : 0)]++;
    const words = (k) => k.map((n, step) => `${step ? `step ${step}` : 'none'} ${n}`).join(', ');
    const same = JSON.stringify(fromMaps) === JSON.stringify(fromFile);
    return [same, `counties on the maps: ${words(fromMaps.counties)}; from the file: ${words(fromFile.counties)}. States: ${words(fromMaps.states)}; from the file: ${words(fromFile.states)}`];
  });

  return { results, facts };
}

function main() {
  const given = process.argv[2];
  const folder = given ? resolve(given) : PUBLISHED;
  console.log(`Running the page's plain functions over the three files in ${given ? 'the folder given' : 'public/data'}.`);
  const { results, facts } = checkPagePublished(folder);
  for (const r of results) console.log(`${r.id} ${r.ok ? 'PASS' : 'FAIL'}: ${r.text}`);
  console.log(`installers read: ${facts.installers ?? 'none'}`);
  const failed = results.filter((r) => !r.ok).map((r) => r.id);
  console.log(failed.length ? `check:page:published: ${failed.length} failed (${failed.join(', ')})` : `check:page:published: PASS, ${results.length} lines`);
  return failed.length ? 1 : 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) {
  globalThis.fetch = async () => { throw new Error('check:page:published never reaches the network'); };
  let code = 1;
  try {
    code = main();
  } catch (e) {
    console.log(`check:page:published FAIL: an error of kind ${kindOfError(e)} at step "main"`);
  }
  try {
    const { removePageTemps } = await import('./page-standins.mjs');
    await removePageTemps();
  } catch { /* nothing was made */ }
  process.exitCode = code;
}
