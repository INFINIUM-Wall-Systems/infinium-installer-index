/**
 * npm run check:page:published [-- <folder>]: runs the page's plain functions (public\js) over
 * the three files in public\data, or in the folder given, with public\geo\counties.json, the way
 * the page reads them. It never loads the page in a browser and never makes a picture.
 *
 * Each line prints PASS or FAIL with counts. Territory is Tier 1, and a place's lists, counts and
 * shades hold only CONFIRMED BY PARTNER and PENDING - UPDATE EXPECTED installers (section 4.0 of
 * the ninth revision); what the files give is worked out apart from the page.
 *   views           every installer gives an All installers row in all three views, a search
 *                   result (a search for its company name) and an Installer view in all three
 *                   views, without an error
 *   fields          in every Installer view, every filled field section 4.6 names appears and no
 *                   empty one does
 *   words           no view holds undefined, null, NaN or [object Object], unless the
 *                   installer's own record holds that word
 *   counties        for every installer and every state it covers, the counties the Installer
 *                   view lists at each tier are as many as the file's two counts
 *   last confirmed  "Last confirmed" shows only for CONFIRMED BY PARTNER
 *   not on the map  All installers, "Not on the map" and both "Also show" boxes ticked, lists as
 *                   many installers as build.json counts without territory
 *   about           About this data shows the counts build.json holds
 *   rows            how many rows show a stand-in, nobody in a place, and one person in both
 *                   places, beside the same counts made from the file
 *   home map        for each of the 52, the map's step is the one for the number of installers
 *                   with territory there the files give
 *   state views     every State view draws without an error, with and without a county chosen
 *   county maps     for each of the 3,193 counties, the county map's step is the one for the
 *                   number of installers with it as Tier 1, and its Tier 1 list, chosen, as many
 *   foot line       the foot line's number is build.json's number without territory
 *   steps           how many counties and states fall on each of the five steps and on none
 *   tier lists      for every state and county, the Tier 1 and Tier 2 lists hold as many
 *                   installers as the files give them
 *   side lists      for every state and county, "Did not respond to the August outreach" and "Not
 *                   on the map, with an office in" hold as many as the files give
 *   boxes           All installers, with each box ticked or not, lists as many as the files give
 *   territory       About this data's count of installers with Tier 1 territory, and of those
 *                   available for travel only, beside the same counts from the files
 * A failing line names the check, a count, and at most a state's code or a county's id, never an
 * installer.
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
import { parseHash } from '../public/js/routes.js';
import { search } from '../public/js/search.js';
import { renderView } from '../public/js/views.js';
import { bannedIn, expectedAll, filesApart, installerViewProblems, rowsOf } from './page-tests.mjs';
import { byAttr, find, findAll, kindOf, squash } from './page-standins.mjs';
import { geoFiles, placeApart, servedFrom, stepOf } from './map-tests.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLISHED = join(ROOT, 'public', 'data');
export const COUNTIES = join(ROOT, 'public', 'geo', 'counties.json');
export const LINES = ['views', 'fields', 'words', 'counties', 'last confirmed', 'not on the map', 'about', 'rows', 'home map', 'state views',
  'county maps', 'foot line', 'steps', 'tier lists', 'side lists', 'boxes', 'territory'];
const CONFIRMED = 'CONFIRMED BY PARTNER';
const VIEWS = ['est', 'pm', 'rec'];
const FILES = { build: 'build.json', installers: 'installers.json', territory: 'territory.json' };

const kindOfError = (e) => (e && e.constructor && e.constructor.name) || typeof e;
const commas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** The real functions; a self-test case hands broken ones. */
export const REAL = { render: renderView, search };

/** "2 installer(s); first at fault: office.city, text" */
const fault = (n, total, first) => `${n} of ${total} installer(s)${first ? `; first at fault: ${first.name}, ${kindOf(first.value)}` : ''}`;
const tierRows = (node, tier) => rowsOf(node).filter((r) => r.attrs['data-tier'] === tier).length;
const sideCount = (node, part) => { const sec = find(node, (n) => n.attrs['data-part'] === part); return sec ? findAll(sec, (n) => n.tag === 'li').length : 0; };

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
  let texts = null;
  try {
    texts = {};
    for (const [key, name] of Object.entries(FILES)) {
      const path = join(folder, name);
      texts[key] = existsSync(path) ? readFileSync(path, 'utf8') : null;
    }
    texts.counties = readFileSync(countiesPath, 'utf8');
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
  const territoryText = texts.territory;
  const A = filesApart({ 'installers.json': texts.installers, 'territory.json': texts.territory });
  const opts = (mode = 'est') => ({ now, mode, files: geoFiles() });
  const render = (hash, mode = 'est') => I.render(parseHash(hash), model, opts(mode));
  const allViews = {};
  const one = new Map();
  const found = new Map();

  line('views', () => {
    let errors = 0;
    let errorKind = null;
    const attempt = (f) => { try { return f(); } catch (e) { errors++; errorKind ||= kindOfError(e); return null; } };
    for (const mode of VIEWS) allViews[mode] = attempt(() => render('#/installers?dormant=1&inactive=1', mode));
    const has = (out) => new Set(out ? rowsOf(out.node).map((r) => r.attrs['data-installer']) : []);
    const inAll = VIEWS.map((m) => has(allViews[m]));
    let rowsEvery = 0;
    let results2 = 0;
    let installerViews = 0;
    let firstMissing = null;
    for (const i of list) {
      if (inAll.every((s) => s.has(i.id))) rowsEvery++;
      else firstMissing ||= { name: 'id', value: i.id };
      const out = attempt(() => I.render({ ...parseHash('#/installers'), q: i.company }, model, opts()));
      const row = out && rowsOf(out.node).find((r) => r.attrs['data-installer'] === i.id);
      if (row) { results2++; found.set(i.id, row); } else if (out) firstMissing ||= { name: 'company', value: i.company };
      let views = 0;
      for (const mode of VIEWS) {
        const v = attempt(() => I.render({ view: 'installer', id: i.id, mode: null, from: null }, model, opts(mode)));
        if (v && v.view === 'installer') { views++; one.set(`${mode}:${i.id}`, v); attempt(() => toHtml(v.node)); }
      }
      if (views === VIEWS.length) installerViews++; else firstMissing ||= { name: 'id', value: i.id };
    }
    for (const mode of VIEWS) attempt(() => toHtml(allViews[mode].node));
    const okAll = rowsEvery === total && results2 === total && installerViews === total && errors === 0;
    const text = `${total} installers: ${rowsEvery} with a row in All installers in all three views, ${results2} found by a search for the company, ${installerViews} with an Installer view in all three views; ${errors} error(s)${errorKind ? `, first of kind ${errorKind}` : ''}`;
    return [okAll, okAll ? text : `${text}; ${fault(total - Math.min(rowsEvery, results2, installerViews), total, firstMissing)}`];
  });

  line('fields', () => {
    let bad = 0;
    let first = null;
    let fields = 0;
    for (const i of list) {
      for (const mode of VIEWS) {
        const out = one.get(`${mode}:${i.id}`);
        if (!out) { bad++; first ||= { name: 'id', value: i.id }; continue; }
        const p = installerViewProblems(i, out, territoryText, mode).filter((x) => !String(x.name).startsWith('territory'));
        if (mode === 'est') fields += byAttr(out.node, 'data-field').length;
        if (p.length) { bad++; first ||= p[0]; }
      }
    }
    return [bad === 0, bad ? `fields: ${fault(bad, total * VIEWS.length, first)}` : `${total} Installer views in each of the three views checked: every filled field of section 4.6 shown, and no empty one (${fields} fields shown in Estimating)`];
  });

  line('words', () => {
    let bad = 0;
    let first = null;
    let viewsChecked = 0;
    for (const i of list) {
      const htmls = [...VIEWS.map((m) => one.get(`${m}:${i.id}`)), found.get(i.id) && { node: found.get(i.id) },
        ...VIEWS.map((m) => allViews[m] && { node: rowsOf(allViews[m].node).find((r) => r.attrs['data-installer'] === i.id) })]
        .filter((x) => x && x.node).map((x) => toHtml(x.node));
      viewsChecked += htmls.length;
      const words = htmls.flatMap((h) => bannedIn(h, [i]));
      if (words.length) { bad++; first ||= { name: words[0], value: words[0] }; }
    }
    const whole = ['#/', '#/installers', '#/installers?map=off&dormant=1&inactive=1', '#/about'].map((h) => toHtml(render(h).node));
    const wholeBad = whole.flatMap((h) => bannedIn(h, list));
    viewsChecked += whole.length;
    const okAll = bad === 0 && wholeBad.length === 0;
    return [okAll, okAll ? `${viewsChecked} views and rows checked: none holds undefined, null, NaN or [object Object]`
      : `${bad} of ${total} installer(s), and ${wholeBad.length} word(s) in Find installers, All installers and About; first: ${first ? first.name : wholeBad[0]}`];
  });

  line('counties', () => {
    let states = 0;
    let bad = 0;
    let first = null;
    let withTerritory = 0;
    for (const i of list) {
      if (!i.territory || !Array.isArray(i.territory.states)) continue;
      withTerritory++;
      const out = one.get(`est:${i.id}`);
      for (const s of i.territory.states) {
        states++;
        const count = (tier) => {
          const d = out && findAll(out.node, (n) => n.tag === 'details' && n.attrs['data-state'] === s.state && n.attrs['data-tier'] === tier)[0];
          return d ? findAll(d, (n) => n.tag === 'li').length : 0;
        };
        if (count(1) !== s.tier1Counties || count(2) !== s.tier2Counties) { bad++; first ||= { name: 'territory.states.tier1Counties', value: s.tier1Counties }; }
      }
    }
    return [bad === 0, bad ? `${bad} of ${states} state(s) list a different number of counties; first at fault: ${first.name}, ${kindOf(first.value)}`
      : `${withTerritory} installers with counties on the map, ${states} states and provinces: each lists as many counties at each tier as the file's two counts`];
  });

  line('last confirmed', () => {
    let shown = 0;
    let wrong = 0;
    for (const i of list) {
      const out = one.get(`est:${i.id}`);
      const has = Boolean(out && byAttr(out.node, 'data-field', 'lastConfirmed').length);
      if (has) shown++;
      if (has && i.status !== CONFIRMED) wrong++;
      if (!has && i.status === CONFIRMED && i.lastConfirmed) wrong++;
    }
    const confirmed = list.filter((i) => i.status === CONFIRMED && i.lastConfirmed).length;
    return [wrong === 0, `"Last confirmed" shows on ${shown} installer(s); ${confirmed} are CONFIRMED BY PARTNER with a date; ${wrong} shown or left out wrongly`];
  });

  line('not on the map', () => {
    const n = rowsOf(render('#/installers?dormant=1&inactive=1&map=off').node).length;
    const want = model.build.counts.installersWithoutTerritory;
    return [n === want, `All installers, "Not on the map" with both boxes ticked, lists ${n} installer(s); build.json counts ${want} without territory`];
  });

  const tier1Count = A.installers.filter((i) => A.total(1, i.id) > 0).length;
  const travelOnly = A.installers.filter((i) => A.total(1, i.id) === 0 && A.total(2, i.id) > 0).length;

  line('about', () => {
    const out = render('#/about');
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
    for (const r of rowsOf(allViews.est.node)) {
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

  // The maps and the places: what the files give each state and county, worked out apart from the page.
  const served = servedFrom(territoryText, texts.installers);
  const shapes = (out) => findAll(out.node, (n) => n.tag === 'a' && n.attrs['data-shape'] !== undefined);
  const stateViews = new Map();
  const countyViews = new Map();

  line('home map', () => {
    const drawn = shapes(render('#/'));
    let bad = 0;
    let first = null;
    for (const s of model.stateList) {
      const a = drawn.find((x) => x.attrs['data-shape'] === s.code);
      const want = stepOf((served.byState.get(s.code) || new Set()).size);
      if (!a || a.attrs['data-step'] !== want) { bad++; first ||= s.code; }
    }
    return [bad === 0, bad ? `${bad} of ${model.stateList.length} states at the wrong step or not drawn; first ${first}`
      : `${model.stateList.length} states, each at the step for its number of installers with territory there`];
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
          const out = I.render({ view: 'state', code: s.code, county, mode: null }, model, opts());
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
        const n = served.byCounty.has(c.id) ? served.byCounty.get(c.id).tier1.length : 0;
        const a = drawn.find((x) => x.attrs['data-shape'] === c.id);
        const chosen = countyViews.get(c.id);
        if (!a || a.attrs['data-step'] !== stepOf(n) || !chosen || tierRows(chosen.node, 1) !== n) { bad++; first ||= c.id; }
        checked++;
      }
    }
    return [bad === 0, bad ? `${bad} of ${checked} counties at the wrong step, or listing another number in their Tier 1 list; first ${first}`
      : `${checked} counties, each at the step for its number of installers with it as Tier 1, and its Tier 1 list as many when chosen`];
  });

  line('foot line', () => {
    const out = stateViews.get('OH') || I.render({ view: 'state', code: model.stateList[0].code, county: null, mode: null }, model, opts());
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
    for (const a of shapes(render('#/'))) fromMaps.states[a.attrs['data-step']]++;
    for (const out of stateViews.values()) for (const a of shapes(out)) fromMaps.counties[a.attrs['data-step']]++;
    for (const s of model.stateList) fromFile.states[stepOf((served.byState.get(s.code) || new Set()).size)]++;
    for (const c of model.countyById.values()) fromFile.counties[stepOf(served.byCounty.has(c.id) ? served.byCounty.get(c.id).tier1.length : 0)]++;
    const words = (k) => k.map((n, step) => `${step ? `step ${step}` : 'none'} ${n}`).join(', ');
    const same = JSON.stringify(fromMaps) === JSON.stringify(fromFile);
    return [same, `counties on the maps: ${words(fromMaps.counties)}; from the files: ${words(fromFile.counties)}. States: ${words(fromMaps.states)}; from the files: ${words(fromFile.states)}`];
  });

  // Every state and county as a place, with what the files give it.
  const places = () => [
    ...model.stateList.map((s) => ({ key: s.code, out: stateViews.get(s.code), want: placeApart(A, { state: s.code }) })),
    ...[...model.countyById.values()].map((c) => ({ key: c.id, out: countyViews.get(c.id), want: placeApart(A, { state: c.state, counties: [c.id] }) })),
  ];

  line('tier lists', () => {
    let bad = 0;
    let first = null;
    let n = 0;
    let t1 = 0;
    let t2 = 0;
    for (const p of places()) {
      n++;
      if (!p.out || tierRows(p.out.node, 1) !== p.want.tier1.length || tierRows(p.out.node, 2) !== p.want.tier2.length) { bad++; first ||= p.key; continue; }
      t1 += p.want.tier1.length;
      t2 += p.want.tier2.length;
    }
    return [bad === 0, bad ? `${bad} of ${n} places list another number at Tier 1 or Tier 2 than the files give; first ${first}`
      : `${n} places, every state and county: the Tier 1 and Tier 2 lists hold as many as the files give (${commas(t1)} Tier 1 entries and ${commas(t2)} Tier 2 entries in all)`];
  });

  line('side lists', () => {
    let bad = 0;
    let first = null;
    let n = 0;
    let dormant = 0;
    let offMap = 0;
    for (const p of places()) {
      n++;
      if (!p.out || sideCount(p.out.node, 'dormant') !== p.want.dormant.length || sideCount(p.out.node, 'offmap') !== p.want.offMap.length) { bad++; first ||= p.key; continue; }
      dormant += p.want.dormant.length;
      offMap += p.want.offMap.length;
    }
    return [bad === 0, bad ? `${bad} of ${n} places list another number under "Did not respond" or "Not on the map, with an office in" than the files give; first ${first}`
      : `${n} places: "Did not respond to the August outreach" and "Not on the map, with an office in" hold as many as the files give (${commas(dormant)} and ${commas(offMap)} entries in all)`];
  });

  line('boxes', () => {
    const got = [];
    let bad = 0;
    for (const dormant of [false, true]) {
      for (const inactive of [false, true]) {
        for (const mapOff of [false, true]) {
          const hash = `#/installers?${[dormant ? 'dormant=1' : '', inactive ? 'inactive=1' : '', mapOff ? 'map=off' : ''].filter(Boolean).join('&')}`.replace(/\?$/, '');
          const n = rowsOf(render(hash).node).length;
          const want = expectedAll(A, { dormant, inactive, mapOff }).length;
          if (n !== want) bad++;
          got.push(`${[dormant ? 'D' : '-', inactive ? 'I' : '-', mapOff ? 'M' : '-'].join('')} ${n}/${want}`);
        }
      }
    }
    return [bad === 0, `All installers, each of the 8 ways the three boxes can be ticked (D did not respond, I inactive or on hold, M not on the map), listed/from the files: ${got.join('; ')}`];
  });

  line('territory', () => {
    const out = render('#/about');
    const shown = (key) => { const row = find(out.node, (n) => n.tag === 'tr' && n.attrs['data-count'] === key); const td = row && find(row, (n) => n.tag === 'td'); return td ? Number(squash(textOf(td)).replace(/,/g, '')) : null; };
    const fromPage = { tier1: shown('page:tier1'), travelOnly: shown('page:travelOnly') };
    const same = fromPage.tier1 === tier1Count && fromPage.travelOnly === travelOnly;
    return [same, `About this data: installers with territory (Tier 1) ${fromPage.tier1 ?? 'not shown'}, beside ${tier1Count} from the files; available for travel only (Tier 2) ${fromPage.travelOnly ?? 'not shown'}, beside ${travelOnly}`];
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
