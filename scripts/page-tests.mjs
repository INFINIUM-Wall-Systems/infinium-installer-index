/**
 * The page's tests, on made-up installers: each line of npm run check:page (step 5 of the page's
 * first prompt). They run the page's plain functions (public\js) on the three files the job
 * writes from the made-up installers, with the page's own made-up installers added where a case
 * needs one (scripts\fixtures\page-installers.json).
 *
 * Each test has sound cases, on which it must pass, and broken cases, on which it must fail and
 * say why (mustSay), in the shape of scripts\job-tests.mjs. A broken case hands the test a
 * broken stand-in for one of the page's functions, or a broken copy of what a view gave back.
 * npm run check:page runs the sound cases; npm run check:selftest runs both.
 *
 * Nothing here reads public\data, the real key, QuickBase or the network. Temporary folders
 * begin installer-index-page- and are deleted by removePageTemps.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { loadData } from '../public/js/data.js';
import { easternDate } from '../public/js/format.js';
import { escapeHtml, isElement, textOf, toHtml } from '../public/js/html.js';
import { parseHash, toHash } from '../public/js/routes.js';
import { search } from '../public/js/search.js';
import { dataErrorView, freshness, renderView, SEARCHABLE } from '../public/js/views.js';
import { chooseFile, listPublic, madeUpProblem, PUBLIC } from './serve-made-up.mjs';
import {
  byAttr, COUNTIES_TEXT, expectedFields, faceText, find, findAll, hasClass, madeUpModel, madeUpTexts, mapTree, pageTemp,
  spelledDate, squash, transformed, valueChecks,
} from './page-standins.mjs';

export const PAGE_TESTS = [];
const test = (line, label, sound, broken) => PAGE_TESTS.push({ line, label, sound, broken });
const ok = (why) => ({ ok: true, why });
const no = (why) => ({ ok: false, why });

/** The moment the tests hold as now: noon on October 7, 2026, Eastern daylight time. */
const NOW = Date.parse('2026-10-07T16:00:00Z');
const HOUR = 3600 * 1000;
const REAL = { render: renderView, parse: parseHash, toHash, search, freshness, loadData, toHtml, chooseFile, dataErrorView };
const impl = (over = {}) => ({ ...REAL, ...over });
const Q = 'Quoting / Estimating';
const S = 'Scheduling / Coordination';
const CONFIRMED = 'CONFIRMED BY PARTNER';

const sound = (label, run) => ({ label, run });
const broken = (label, mustSay, run) => ({ label, mustSay, run });

const rowsOf = (node) => findAll(node, (n) => n.tag === 'tr' && n.attrs['data-installer'] !== undefined);
const idsOf = (node) => rowsOf(node).map((r) => r.attrs['data-installer']);
const view = (I, model, hash, now = NOW) => I.render(I.parse(hash), model, { now });
const byId = (model, id) => model.installers.find((i) => i.id === id);

/** A copy of the model with one installer changed, or added. */
function withInstaller(model, id, change) {
  const list = model.installers.some((i) => i.id === id)
    ? model.installers.map((i) => (i.id === id ? change(structuredClone(i)) : i))
    : [...model.installers, change({ id })];
  return { ...model, installers: list, byId: new Map(list.map((i) => [i.id, i])) };
}

/* ================================================================== V1 */

const ADDRESSES = [
  ['#/', 'home'], ['#/installers', 'installers'], ['#/installers?set=rates', 'installers'],
  ['#/installers?status=CONFIRMED%20BY%20PARTNER', 'installers'], ['#/installers?set=rates&status=INACTIVE', 'installers'],
  ['#/installer/FAKE-102', 'installer'], ['#/installer/FAKE-024', 'installer'], ['#/search?q=lena', 'search'],
  ['#/search?q=Bold%20%26%20Sons', 'search'], ['#/search?q=', 'search'], ['#/not-on-the-map', 'notOnMap'], ['#/about', 'about'],
];
const UNKNOWN = ['#/nowhere', '#/installer/FAKE-999', '#/installers?set=bogus', '#/installers?status=NOT%20A%20STATUS', '#/about?x=1',
  '#/installer/', '#/installers?status=INACTIVE&status=INACTIVE', '#/search?q=%E0%A4', '#/not-on-the-map/extra', '#content'];

async function v1(I) {
  const model = await madeUpModel();
  for (const [hash, want] of ADDRESSES) {
    const route = I.parse(hash);
    const out = I.render(route, model, { now: NOW });
    if (out.view !== want) return no(`${hash} gives the ${out.view} view, not ${want}`);
    const back = I.toHash(route);
    if (back !== hash) return no(`${hash} gives back the address ${back}`);
    if (!(out.title === 'Installer Index' || out.title.endsWith(' — Installer Index'))) return no(`${hash} sets no page title of its own`);
  }
  for (const hash of UNKNOWN) {
    const out = I.render(I.parse(hash), model, { now: NOW });
    if (out.view !== 'notFound') return no(`the unknown address ${hash} gives the ${out.view} view, not the not-found view`);
    if (!findAll(out.node, (n) => n.tag === 'a' && n.attrs.href === '#/').length) return no(`the not-found view of ${hash} has no link to Home`);
  }
  // Every address a view links to gives a view.
  let links = 0;
  for (const [hash] of ADDRESSES) {
    for (const a of findAll(view(I, model, hash).node, (n) => n.tag === 'a' && String(n.attrs.href).startsWith('#/'))) {
      links++;
      if (I.render(I.parse(a.attrs.href), model, { now: NOW }).view === 'notFound') return no(`a link in ${hash} leads to the not-found view`);
    }
  }
  return ok(`${ADDRESSES.length} addresses each give their view and give back the same address; ${UNKNOWN.length} unknown addresses give the not-found view; ${links} links checked`);
}
test('V1', 'every address gives its view, and the view gives back the same address; an unknown address or installer id gives the not-found view',
  [sound('the page as built', () => v1(impl()))],
  [
    broken('a router that sends an unknown address to Home', 'not the not-found view', () => v1(impl({ parse: (h) => { const r = parseHash(h); return r.view === 'notFound' ? { view: 'home' } : r; } }))),
    broken('an address writer that drops the status', 'gives back the address', () => v1(impl({ toHash: (r) => toHash(r.view === 'installers' ? { ...r, status: null } : r) }))),
    broken('a view for an unknown installer id', 'FAKE-999', () => v1(impl({ render: (r, m, o) => renderView(r.view === 'installer' && !m.byId.has(r.id) ? { view: 'installer', id: 'FAKE-001' } : r, m, o) }))),
  ]);

/* ================================================================== V2 */

/** Section 4.3's two column sets, written out from the specification. */
export const SPEC_COLUMNS = {
  contact: ['Company', 'Status', 'Office city and state', 'Contacts by role', 'States covered'],
  rates: ['Company', 'Status', 'Non-union ST', 'Non-union OT', 'Union ST', 'Union OT', 'Mobilization', 'Rates valid through', 'Shop or labor status'],
};

async function v2(I) {
  const model = await madeUpModel();
  const ids = model.installers.map((i) => i.id);
  for (const set of ['contact', 'rates']) {
    const out = I.render({ view: 'installers', set, status: null }, model, { now: NOW });
    if (idsOf(out.node).join('|') !== ids.join('|')) return no(`${set}: the rows are not every installer in the order of installers.json`);
    const heads = findAll(out.node, (n) => n.tag === 'th').map((n) => squash(textOf(n)));
    if (heads.join('|') !== SPEC_COLUMNS[set].join('|')) return no(`${set}: the column titles are ${heads.join(', ')}, not those of section 4.3`);
    if (set === 'contact') {
      for (const row of rowsOf(out.node)) {
        const inst = byId(model, row.attrs['data-installer']);
        const cell = find(row, (n) => n.tag === 'td' && n.attrs['data-column'] === 'states');
        const want = inst.territory ? inst.territory.states.map((s) => s.state).join(', ') : 'Not on the map';
        if (squash(textOf(cell)) !== want) return no(`${inst.id}: States covered shows ${squash(textOf(cell))}, not ${want}`);
      }
    }
  }
  const statuses = model.build.counts.byStatus;
  const all = I.render({ view: 'installers', set: 'contact', status: null }, model, { now: NOW });
  const filters = findAll(find(all.node, (n) => n.attrs['aria-label'] === 'Record status'), (n) => n.tag === 'a').map((n) => squash(textOf(n)));
  const wantFilters = [`All ${ids.length}`, ...statuses.map((s) => `${s.status}${s.installers}`)].map((s) => s.replace(/\s+/g, ''));
  if (filters.map((f) => f.replace(/\s+/g, '')).join('|') !== wantFilters.join('|')) return no('the status filter does not list All and the five statuses in the order of build.json, each with its count');
  for (const { status } of statuses) {
    for (const set of ['contact', 'rates']) {
      const out = I.render({ view: 'installers', set, status }, model, { now: NOW });
      const want = model.installers.filter((i) => i.status === status).map((i) => i.id);
      if (idsOf(out.node).join('|') !== want.join('|')) return no(`the status filter for ${status} leaves ${idsOf(out.node).length} rows, not the ${want.length} installers of that status`);
    }
  }
  return ok(`${ids.length} rows in the file's order in both column sets; the columns of section 4.3; States covered; the filter for each of ${statuses.length} statuses`);
}
test('V2', 'All installers lists every installer in the file\'s order; both column sets hold the columns section 4.3 names; the status filter leaves exactly the installers of that status',
  [sound('the page as built', () => v2(impl()))],
  [
    broken('rows put in another order', 'order of installers.json', () => v2(impl({ render: transformed(renderView, (n) => (n.tag === 'tbody' ? { ...n, children: [...n.children].reverse() } : n)) }))),
    broken('the Mobilization column left out', 'column titles', () => v2(impl({ render: transformed(renderView, (n) => ((n.tag === 'th' || n.tag === 'td' || n.tag === 'col') && /obilization/.test(n.attrs['data-column'] || n.attrs.class || '') ? null : n)) }))),
    broken('a status filter that keeps every installer', 'the status filter for', () => v2(impl({ render: (r, m, o) => (r.status ? { ...renderView({ ...r, status: null }, m, o) } : renderView(r, m, o)) }))),
    broken('States covered that shows nothing for an installer with no territory', 'States covered', () => v2(impl({ render: transformed(renderView, (n) => (hasClass(n, 'off-map') ? null : n)) }))),
  ]);

/* ================================================================== V5 */

/** The counties territory.json gives an installer in a state, by the names counties.json gives them, written out apart. */
function countiesFromFiles(territoryText, id, state) {
  const names = new Map(JSON.parse(COUNTIES_TEXT).counties.map((c) => [c.id, c.name]));
  const st = JSON.parse(territoryText).states.find((s) => s.state === state);
  const pick = (key) => (st ? st.counties.filter((c) => (c[key] || []).includes(id)).map((c) => names.get(c.id)) : []);
  const sorted = (l) => [...l].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0));
  return { tier1: sorted(pick('tier1Installers')), tier2: sorted(pick('tier2Installers')) };
}

const PART_ORDER = ['top', 'contacts', 'addresses', 'rates', 'tier2Charge', 'territory', 'paperwork', 'other'];

/** The Installer view of one installer, against section 4.4 and the files. */
export function installerViewProblems(installer, out, territoryText) {
  const p = [];
  const shown = [...new Set(byAttr(out.node, 'data-field').map((n) => n.attrs['data-field']))];
  const want = expectedFields(installer);
  for (const f of want) {
    if (!shown.includes(f.name)) { p.push({ text: `${f.name} is filled and not shown`, name: f.name, value: f.value }); continue; }
    const text = squash(byAttr(out.node, 'data-field', f.name).map(textOf).join(' '));
    for (const c of valueChecks(f.name, f.value)) if (!text.includes(squash(c.piece))) p.push({ text: `${c.name} does not show its value`, name: c.name, value: c.value });
  }
  for (const name of shown) if (!want.some((f) => f.name === name)) p.push({ text: `${name} is shown and is empty`, name, value: undefined });
  const parts = byAttr(out.node, 'data-part').map((n) => n.attrs['data-part']);
  if (parts.join('|') !== PART_ORDER.filter((x) => parts.includes(x)).join('|')) p.push({ text: 'the parts are not in the order of top, contacts, addresses, rates, Tier 2 charge, territory, paperwork, other', name: 'parts' });
  for (const part of byAttr(out.node, 'data-part')) {
    if (part.attrs['data-part'] !== 'top' && !findAll(part, (n) => n.attrs['data-field'] !== undefined || n.attrs['data-contact'] !== undefined || n.attrs['data-state'] !== undefined).length) {
      p.push({ text: `the ${part.attrs['data-part']} part is shown with nothing in it`, name: part.attrs['data-part'] });
    }
  }
  // Contacts: every contact, as the file has them.
  const contacts = installer.contacts || [];
  const people = findAll(find(out.node, (n) => n.attrs['data-part'] === 'contacts') || [], (n) => hasClass(n, 'person'));
  if (people.length !== contacts.length) p.push({ text: `${people.length} contacts shown, not ${contacts.length}`, name: 'contacts', value: contacts });
  contacts.forEach((c, i) => {
    const node = people.find((n) => n.attrs['data-contact'] === i);
    const text = node ? squash(textOf(node)) : '';
    const pieces = [['name', c.name ?? 'Name not recorded'], ...['title', 'phone', 'email', 'email2', 'procedure'].map((k) => [k, c[k]]),
      ...(c.roles && c.roles.length ? c.roles : ['Role not recorded']).map((r) => ['roles', r])].filter(([, v]) => v !== undefined);
    for (const [k, piece] of pieces) if (!text.includes(squash(piece))) p.push({ text: `a contact's ${k} is not shown`, name: `contacts.${k}`, value: piece });
    if ((c.departed === true) !== byAttr(node || [], 'data-departed').length > 0) p.push({ text: 'a departed contact is not shown as departed, or the other way round', name: 'contacts.departed', value: c.departed });
    if ((c.confirmedRecord === true) !== byAttr(node || [], 'data-confirmed-record').length > 0) p.push({ text: 'the person who confirmed the record is not marked, or the other way round', name: 'contacts.confirmedRecord', value: c.confirmedRecord });
  });
  // Territory: each state, opening to exactly its counties.
  const states = installer.territory ? installer.territory.states : [];
  const details = findAll(out.node, (n) => n.tag === 'details');
  if (details.map((d) => d.attrs['data-state']).join('|') !== states.map((s) => s.state).join('|')) p.push({ text: 'the territory part does not list each state covered', name: 'territory.states', value: states });
  for (const s of states) {
    const d = details.find((x) => x.attrs['data-state'] === s.state);
    if (!d) continue;
    const want2 = countiesFromFiles(territoryText, installer.id, s.state);
    const got = (tier) => findAll(find(d, (n) => n.attrs['data-tier'] === tier) || [], (n) => n.tag === 'li').map((n) => squash(textOf(n)));
    const summary = squash(textOf(find(d, (n) => n.tag === 'summary')));
    if (got(1).join('|') !== want2.tier1.join('|') || got(2).join('|') !== want2.tier2.join('|')) p.push({ text: `the counties listed for ${s.state} are not those territory.json gives`, name: 'territory.counties', value: s });
    if (!summary.includes(`Tier 1 in ${s.tier1Counties} count`) || !summary.includes(`Tier 2 in ${s.tier2Counties} count`)) p.push({ text: `${s.state} does not show its two counts`, name: 'territory.states', value: s });
  }
  return p;
}

async function v5(I, ids = null) {
  const model = await madeUpModel();
  const t = await madeUpTexts();
  const list = ids ? ids.map((id) => byId(model, id)) : model.installers;
  let fieldsSeen = 0;
  for (const inst of list) {
    const out = I.render({ view: 'installer', id: inst.id }, model, { now: NOW });
    const p = installerViewProblems(inst, out, t['territory.json']);
    if (p.length) return no(`${inst.id}: ${p.map((x) => x.text).join('; ')}`);
    fieldsSeen += expectedFields(inst).length;
  }
  const full = expectedFields(byId(model, 'FAKE-102')).length;
  const least = byAttr(I.render({ view: 'installer', id: 'FAKE-103' }, model, { now: NOW }).node, 'data-part').length;
  return ok(`${list.length} installers, ${fieldsSeen} filled fields shown and no empty one; FAKE-102 shows ${full} fields; FAKE-103 shows ${least} part`);
}
const dropField = (name) => transformed(renderView, (n) => (n.attrs['data-field'] === name ? null : n));
test('V5', 'the Installer view shows every filled field section 4.4 names and leaves out every empty one; a state opens to exactly its counties',
  [sound('everything filled (FAKE-102) and as little as the files allow (FAKE-103)', () => v5(impl(), ['FAKE-102', 'FAKE-103'])),
    sound('every made-up installer', () => v5(impl()))],
  [
    broken('the EMR left out', 'emr is filled and not shown', () => v5(impl({ render: dropField('emr') }), ['FAKE-102'])),
    broken('an empty field shown', 'notes is shown and is empty', () => v5(impl({ render: transformed(renderView, (n) => (n.attrs['data-part'] === 'top' ? { ...n, children: [...n.children, { tag: 'dl', attrs: {}, children: [{ tag: 'div', attrs: { 'data-field': 'notes' }, children: [] }] }] } : n)) }), ['FAKE-103'])),
    broken('a county left out of a state', 'the counties listed for OH', () => v5(impl({ render: transformed(renderView, (n) => (n.tag === 'ul' && hasClass(n, 'county-list') ? { ...n, children: n.children.slice(1) } : n)) }), ['FAKE-102'])),
    broken('the part with nothing in it shown', 'part is shown with nothing in it', () => v5(impl({ render: transformed(renderView, (n) => (hasClass(n, 'installer') ? { ...n, children: [...n.children, { tag: 'section', attrs: { 'data-part': 'other' }, children: ['Other'] }] } : n)) }), ['FAKE-103'])),
  ]);

/* ================================================================== V6 */

const MQ = 'No quoting contact on record';
const MS = 'No scheduling contact on record';
const MB = 'No quoting or scheduling contact on record';
const place = (key, labels, name, marker = null) => ({ key, labels, name, marker });

/** What section 4.8 says each made-up row shows, written out by hand. */
export const V6_CASES = [
  { id: 'FAKE-001', label: 'both roles held', marker: null, places: [place('quoting', [Q], 'Ann Ostrander'), place('scheduling', [S], 'Ben Whitlock')], rest: [] },
  { id: 'FAKE-003', label: 'one person in both, shown once with both roles', marker: null, places: [place('both', [Q, S], 'Eve Marchetti')], rest: ['Fay Dunmore'] },
  { id: 'FAKE-010', label: 'quoting missing with a stand-in', marker: null, places: [place('quoting', ['Leadership / Ownership'], 'Tia Rourke', MQ), place('scheduling', [S], 'Sam Ellery')], rest: ['Abby Zane'] },
  { id: 'FAKE-011', label: 'scheduling missing with a stand-in', marker: null, places: [place('quoting', [Q], 'Uma Petrakis'), place('scheduling', ['Field / Installation'], 'Val Szymanski', MS)], rest: ['Abe Unreachable'] },
  { id: 'FAKE-013', label: 'both missing, two stand-ins', marker: MB, places: [place('quoting', ['Primary contact'], 'Zed Primrose'), place('scheduling', ['Receiving / Warehouse'], 'Aaron Bellweather')], rest: ['Cole Ashby'] },
  { id: 'FAKE-014', label: 'both missing, one stand-in', marker: MB, places: [place('quoting', ['Office / Billing / Compliance / Accounts payable'], 'Cy Lindgren')], rest: ['Di Farrow'] },
  { id: 'FAKE-015', label: 'no stand-in available: the marker alone; Emergency dispatch under Show all', marker: MB, places: [], rest: ['Gil Harrow', 'Flo Brandt'] },
  { id: 'FAKE-018', label: 'a departed contact, never on the row', marker: null, places: [place('quoting', [Q], 'Nia Halvorsen'), place('scheduling', [S], 'Oz Whitcombe')], rest: [], absent: ['Adam Departed'] },
  { id: 'FAKE-019', label: 'a contact with no phone or email', marker: null, places: [place('quoting', [Q], 'Pia Grunewald'), place('scheduling', [S], 'Rex Ambrose')], rest: [] },
  { id: 'FAKE-020', label: 'two people in one role', marker: null, places: [place('quoting', [Q], 'Sam Lee'), place('scheduling', [S], 'Ty Ballard')], rest: ['Sam Lee', 'sam lee', 'Name not recorded'] },
  { id: 'FAKE-017', label: 'a contact with no role, as a stand-in', marker: null, places: [place('quoting', [Q], 'Lia Brennan'), place('scheduling', ['Role not recorded'], 'Jo Tanaka', MS)], rest: [] },
  { id: 'FAKE-021', label: 'a contact with no role, under Show all', marker: null, places: [place('quoting', [Q], 'Uri Kastner'), place('scheduling', [S], 'Vi Delgado')], rest: ['Wyn Ashcombe', 'Name not recorded'], restLabels: ['Role not recorded', 'Role not recorded'] },
  { id: 'FAKE-106', label: 'both missing, one stand-in, of the page\'s own', marker: MB, places: [place('quoting', ['Leadership / Ownership'], 'Kit Ames')], rest: [] },
];

/** What a row's contacts cell shows. */
export function rowDisplay(cell) {
  const contacts = find(cell, (n) => hasClass(n, 'contacts'));
  if (!contacts) return null;
  const textIn = (n) => (n ? squash(textOf(n)) : null);
  const rowMarker = contacts.children.find((c) => isElement(c) && c.attrs['data-marker'] === 'both');
  const places = findAll(contacts, (n) => hasClass(n, 'place')).map((p) => {
    const role = find(p, (n) => hasClass(n, 'role'));
    return {
      key: p.attrs['data-place'],
      labels: role ? role.children.map((c) => squash(textOf(c))) : [],
      name: textIn(find(p, (n) => hasClass(n, 'name'))),
      marker: textIn(find(p, (n) => hasClass(n, 'marker'))),
      node: p,
    };
  });
  const more = find(contacts, (n) => hasClass(n, 'more'));
  const restPeople = more ? findAll(more, (n) => hasClass(n, 'person')) : [];
  return {
    marker: textIn(rowMarker),
    places,
    rest: restPeople.map((n) => textIn(find(n, (x) => hasClass(x, 'name')))),
    restLabels: restPeople.map((n) => textIn(find(n, (x) => hasClass(x, 'role')))),
    moreHidden: more ? more.attrs.hidden === true : null,
    hasButton: Boolean(find(contacts, (n) => n.tag === 'button' && n.attrs['aria-controls'] === (more && more.attrs.id))),
    text: squash(textOf(contacts)),
  };
}

async function v6(I) {
  const model = await madeUpModel();
  const out = I.render({ view: 'installers', set: 'contact', status: null }, model, { now: NOW });
  for (const c of V6_CASES) {
    const row = rowsOf(out.node).find((r) => r.attrs['data-installer'] === c.id);
    if (!row) return no(`${c.id} (${c.label}): no row`);
    const d = rowDisplay(row);
    if (d.marker !== c.marker) return no(`${c.id} (${c.label}): the marker for both roles reads ${JSON.stringify(d.marker)}, not ${JSON.stringify(c.marker)}`);
    const got = d.places.map((p) => ({ key: p.key, labels: p.labels, name: p.name, marker: p.marker }));
    if (JSON.stringify(got) !== JSON.stringify(c.places)) return no(`${c.id} (${c.label}): the places show ${JSON.stringify(got)}; section 4.8 says ${JSON.stringify(c.places)} (role label, name, marker)`);
    const inst = byId(model, c.id);
    for (const p of d.places) {
      const contact = inst.contacts[p.node.children.find((x) => hasClass(x, 'person')).attrs['data-contact']];
      for (const piece of [contact.title, contact.phone, contact.email, contact.email2].filter(Boolean)) {
        if (!squash(textOf(p.node)).includes(piece)) return no(`${c.id} (${c.label}): a place does not show the person's title, phone and email`);
      }
    }
    if (JSON.stringify(d.rest) !== JSON.stringify(c.rest)) return no(`${c.id} (${c.label}): Show all contacts holds ${JSON.stringify(d.rest)}, not ${JSON.stringify(c.rest)}`);
    if (c.restLabels && JSON.stringify(d.restLabels) !== JSON.stringify(c.restLabels)) return no(`${c.id} (${c.label}): the roles under Show all contacts read ${JSON.stringify(d.restLabels)}`);
    if (c.rest.length && (!d.hasButton || d.moreHidden !== true)) return no(`${c.id} (${c.label}): the rest is not behind a closed Show all contacts`);
    for (const name of c.absent || []) if (d.text.includes(name)) return no(`${c.id} (${c.label}): a departed contact appears on the row or under Show all contacts`);
  }
  return ok(`${V6_CASES.length} rows, one for each case of acceptance check V6, each as section 4.8 says`);
}
test('V6', 'a row\'s contacts, for each case acceptance check V6 names, show what section 4.8 says',
  [sound('the page as built', () => v6(impl()))],
  [
    broken('the markers left out', 'No quoting contact on record', () => v6(impl({ render: transformed(renderView, (n) => (hasClass(n, 'marker') ? null : n)) }))),
    broken('a stand-in labeled with the role it stands in for', 'section 4.8 says', () => v6(impl({ render: transformed(renderView, (n) => (n.attrs['data-standin'] && n.attrs['data-place'] === 'quoting'
      ? mapTree(n, (x) => (hasClass(x, 'role') ? { ...x, children: [{ tag: 'span', attrs: {}, children: [Q] }] } : x)) : n)) }))),
    broken('a departed contact put under Show all contacts', 'a departed contact appears', () => v6(impl({ render: transformed(renderView, (n) => (hasClass(n, 'contacts') && JSON.stringify(n).includes('Nia Halvorsen')
      ? { ...n, children: [...n.children, { tag: 'div', attrs: { class: 'person' }, children: ['Adam Departed'] }] } : n)) }))),
    broken('the rest shown open, not behind Show all contacts', 'closed Show all contacts', () => v6(impl({ render: transformed(renderView, (n) => (hasClass(n, 'more') ? { ...n, attrs: { ...n.attrs, hidden: false } } : n)) }))),
  ]);

/* ================================================================== V7 */

async function v7(I) {
  const base = await madeUpModel();
  // A hand-made entry the job would never write: a DORMANT installer that carries the date.
  const model = withInstaller(base, 'FAKE-003', (i) => ({ ...i, lastConfirmed: '2026-05-02' }));
  let shown = 0;
  for (const inst of model.installers) {
    const out = I.render({ view: 'installer', id: inst.id }, model, { now: NOW });
    const has = byAttr(out.node, 'data-field', 'lastConfirmed').length > 0 || squash(textOf(out.node)).includes('Last confirmed');
    const want = inst.status === CONFIRMED && Boolean(inst.lastConfirmed);
    if (has !== want) return no(`${inst.id} (${inst.status}): "Last confirmed" ${has ? 'shows' : 'does not show'}`);
    if (has) shown++;
  }
  return ok(`"Last confirmed" shows on ${shown} installers, all CONFIRMED BY PARTNER, and not on a DORMANT installer whose entry carries the date`);
}
test('V7', 'the "Last confirmed" date shows only for CONFIRMED BY PARTNER',
  [sound('the page as built, with a DORMANT installer whose entry carries a date', () => v7(impl()))],
  [broken('a page that shows the date whatever the status', 'DORMANT - NO RESPONSE', () => v7(impl({ render: (r, m, o) => {
    if (r.view !== 'installer') return renderView(r, m, o);
    return renderView(r, withInstaller(m, r.id, (i) => ({ ...i, status: i.lastConfirmed ? CONFIRMED : i.status })), o);
  } })))]);

/* ================================================================== V8 */

const found = (I, model, q) => I.search(model, q).results.map((r) => r.installer.id);

async function v8(I) {
  const model = await madeUpModel();
  for (const q of ['Ohio', 'ohio', 'OH', 'oh']) {
    const ids = found(I, model, q);
    for (const id of ['FAKE-001', 'FAKE-102', 'FAKE-106', 'FAKE-024']) if (!ids.includes(id)) return no(`"${q}" does not find ${id}, which has its office or territory in Ohio`);
    if (ids.includes('FAKE-101')) return no(`"${q}" finds FAKE-101, whose only match is those letters inside other words (Mohawk, Cohasset)`);
  }
  for (const q of ['ohi', 'hio', 'alab', 'ontari']) {
    const r = I.search(model, q);
    if (r.results.some((x) => x.matches.some((m) => m.field === 'officeState' || m.field === 'territory'))) return no(`"${q}" matches a state by part of its name`);
  }
  // Ruling 1: the office in the state, and the territory that includes it.
  const al = I.search(model, 'Alabama');
  const office = al.results.find((x) => x.installer.id === 'FAKE-024');
  const territory = al.results.find((x) => x.installer.id === 'FAKE-001');
  if (!office || !office.matches.some((m) => m.field === 'officeState')) return no('"Alabama" does not find FAKE-024 by its office in Alabama');
  if (!territory || !territory.matches.some((m) => m.field === 'territory')) return no('"Alabama" does not find FAKE-001 by its territory in Alabama');
  const out = I.render({ view: 'search', q: 'Alabama' }, model, { now: NOW });
  const row = rowsOf(out.node).find((r) => r.attrs['data-installer'] === 'FAKE-001');
  const line = row && find(row, (n) => n.attrs['data-match'] === 'territory');
  if (!line || squash(textOf(line)) !== 'Territory includes Alabama: Tier 1 in 0 counties, Tier 2 in 1 county') return no('the result found by territory does not say why, with its counties at each tier');
  for (const q of ['Ontario', 'ON']) if (!found(I, model, q).includes('FAKE-102')) return no(`"${q}" does not find FAKE-102 by its territory in Ontario`);
  return ok('"Ohio", "ohio", "OH" and "oh" find the Ohio installers and not FAKE-101; part of a state\'s name matches no state; "Alabama" finds FAKE-024 by office and FAKE-001 by territory, which says why');
}
const substringStates = (model, q) => {
  const r = search(model, q);
  const needle = q.trim().toLowerCase();
  const more = model.installers.filter((i) => !r.results.some((x) => x.installer === i)
    && [i.company, i.office && i.office.city, ...(i.contacts || []).map((c) => c.name)].some((v) => typeof v === 'string' && v.toLowerCase().includes(needle)));
  return { ...r, results: [...r.results, ...more.map((installer) => ({ installer, matches: [{ field: 'officeState', state: 'OH' }] }))] };
};
test('V8', 'a state is matched by its whole name and whole code only; "oh" finds no installer whose only match is inside another word; ruling 1\'s two ways are found, and the territory one says why',
  [sound('the page as built', () => v8(impl()))],
  [
    broken('a search that matches a state\'s letters inside any word', 'FAKE-101', () => v8(impl({ search: substringStates }))),
    broken('a search that leaves territory out', 'does not find FAKE-024', () => v8(impl({ search: (m, q) => { const r = search(m, q); return { ...r, results: r.results.map((x) => ({ ...x, matches: x.matches.filter((y) => y.field !== 'territory') })).filter((x) => x.matches.length) }; } }))),
    broken('a result found by territory that does not say why', 'does not say why', () => v8(impl({ render: transformed(renderView, (n) => (n.attrs['data-match'] === 'territory' ? null : n)) }))),
  ]);

/* ================================================================== V9 */

async function v9(I) {
  const model = await madeUpModel();
  const expect = [
    ['in', 'FAKE-101', false, '"in" finds FAKE-101, whose only match is "in" inside a longer word (Augustin)'],
    ['alder', 'FAKE-001', true, 'a company is not matched from the start of a word ("alder")'],
    ['brook', 'FAKE-001', false, 'a company is matched inside a word ("brook" in Alderbrook)'],
    ['ann ost', 'FAKE-001', true, 'a contact\'s name is not matched as a phrase ("ann ost")'],
    ['ost ann', 'FAKE-001', false, 'words matched out of their order ("ost ann")'],
    ['strander', 'FAKE-001', false, 'an email is matched inside a word of its address ("strander")'],
    ['akr', 'FAKE-106', true, 'an office city is not matched from the start of a word ("akr")'],
    ['kron', 'FAKE-106', false, 'an office city is matched inside a word ("kron")'],
    ['555-0111', 'FAKE-024', true, 'a phone is not matched on its digits ("555-0111")'],
    ['(205) 555', 'FAKE-024', true, 'a phone is not matched on its digits ("(205) 555")'],
    ['1-205-555-0111', 'FAKE-024', true, 'a phone is not matched on its digits ("1-205-555-0111")'],
    ['eclat', 'FAKE-025', true, 'a company with an accent is not found without it ("eclat")'],
    ['renee', 'FAKE-025', true, 'a contact with an accent is not found without it ("renee")'],
  ];
  for (const [q, id, want, why] of expect) if (found(I, model, q).includes(id) !== want) return no(why);
  return ok(`${expect.length} searches: from the start of a word, as a phrase, not inside a word of an email, phones on their digits`);
}
const substringNames = (model, q) => {
  const r = search(model, q);
  const needle = q.trim().toLowerCase();
  const more = model.installers.filter((i) => !r.results.some((x) => x.installer === i)
    && [i.company, i.office && i.office.city, ...(i.contacts || []).map((c) => c.name)].some((v) => typeof v === 'string' && v.toLowerCase().includes(needle)));
  return { ...r, results: [...r.results, ...more.map((installer) => ({ installer, matches: [{ field: 'company', range: [0, 1] }] }))] };
};
test('V9', 'a company, contact or city is matched from the start of a word; "in" finds no installer whose only match is inside a longer word; an email by its words (step 3); a phone on its digits',
  [sound('the page as built', () => v9(impl()))],
  [
    broken('a search that matches inside words', 'Augustin', () => v9(impl({ search: substringNames }))),
    broken('a search that leaves phones out', 'phone is not matched', () => v9(impl({ search: (m, q) => { const r = search(m, q); return { ...r, results: r.results.filter((x) => x.matches.some((y) => y.field !== 'phone')) }; } }))),
  ]);

/* ================================================================== the repair to search */

/** A search whose email matches follow another rule: rule(email, q) gives [start, end] or null. */
const searchWithEmail = (rule) => (model, q) => {
  const r = search(model, q);
  if (r.kind === 'short' || r.kind === 'zip') return r;
  const results = [];
  for (const installer of model.installers) {
    const kept = ((r.results.find((x) => x.installer === installer) || {}).matches || []).filter((m) => m.field !== 'email' && m.field !== 'email2');
    (installer.contacts || []).forEach((c, contact) => {
      for (const key of ['email', 'email2']) {
        const range = typeof c[key] === 'string' ? rule(c[key].toLowerCase(), q.trim().toLowerCase()) : null;
        if (range) kept.push({ field: key, contact, range });
      }
    });
    if (kept.length) results.push({ installer, matches: kept });
  }
  return { ...r, kind: results.length ? 'results' : 'none', results };
};
const at = (k, q) => (k < 0 ? null : [k, k + q.length]);
const OLD_RULE = (e, q) => at(e.indexOf(q), q);
const LOCAL_ONLY = (e, q) => { const local = e.split('@')[0]; for (let k = 0; k < local.length; k++) if ((k === 0 || '.-_+'.includes(local[k - 1])) && local.startsWith(q, k)) return at(k, q); return null; };
const ADDRESS_START_ONLY = (e, q) => (e.startsWith(q) ? at(0, q) : null);

async function emailRepair(I) {
  const model = await madeUpModel();
  const emailMatchOf = (q, id) => {
    const res = I.search(model, q).results.find((x) => x.installer.id === id);
    return res ? res.matches.filter((m) => m.field === 'email' || m.field === 'email2') : [];
  };
  // FAKE-104's only "co" is the .com of its contacts' addresses.
  if (found(I, model, 'co').includes('FAKE-104')) return no('"co" finds FAKE-104 by the ".com" of an address alone');
  if (!emailMatchOf('exam', 'FAKE-104').length) return no('"exam", the start of the part after the @, does not find an address');
  if (!emailMatchOf('quin', 'FAKE-104').length) return no('"quin", the first letters of a surname in an address written first.last@, does not find it');
  if (!emailMatchOf('lan@exa', 'FAKE-104').length) return no('"lan@exa", a piece holding an @, does not find the address it is part of');
  if (!emailMatchOf('t.quin', 'FAKE-104').length) return no('"t.quin", a piece holding a period, does not find the address it is part of');
  if (found(I, model, 'strander').includes('FAKE-001')) return no('"strander" finds FAKE-001 by the inside of a word of its address');
  const out = I.render({ view: 'search', q: 'exam' }, model, { now: NOW });
  const row = rowsOf(out.node).find((r) => r.attrs['data-installer'] === 'FAKE-104');
  const face = row ? squash(faceText(row)) : '';
  const marks = row ? findAll(row, (n) => n.tag === 'mark').map((n) => squash(textOf(n))) : [];
  if (!face.includes('pat.quinlan@example.com') || !marks.includes('exam')) return no('a result found by an address does not show the address that matched, marked');
  return ok('"co" does not find an address by its ".com"; "exam", "quin", "lan@exa" and "t.quin" do; "strander" does not; the result shows the address, marked');
}
test('email', 'the repair to search: an email is matched from the start of a word before the @, from the start of the part after it, or anywhere when what is typed holds an @ or a period',
  [sound('the page as built', () => emailRepair(impl()))],
  [
    broken('the old rule: anywhere in the address', 'by the ".com" of an address alone', () => emailRepair(impl({ search: searchWithEmail(OLD_RULE) }))),
    broken('a rule that leaves out the part after the @', '"exam"', () => emailRepair(impl({ search: searchWithEmail(LOCAL_ONLY) }))),
    broken('a rule that matches only the start of the address', '"quin"', () => emailRepair(impl({ search: searchWithEmail((e, q) => ADDRESS_START_ONLY(e, q) || (e.includes('@') && e.split('@')[1].startsWith(q) ? at(e.indexOf('@') + 1, q) : null)) }))),
    broken('a rule that never looks across the @', '"lan@exa"', () => emailRepair(impl({ search: searchWithEmail((e, q) => (q.includes('@') ? null : LOCAL_ONLY(e, q) || (e.split('@')[1].startsWith(q) ? at(e.indexOf('@') + 1, q) : null))) }))),
    broken('a result whose address is not marked', 'does not show the address that matched', () => emailRepair(impl({ render: transformed(renderView, (n) => (n.tag === 'mark' ? { tag: 'span', attrs: {}, children: n.children } : n)) }))),
  ]);

/* ================================================================== V10 */

/** The value a match is on, as the view shows it. */
function matchedValue(model, installer, m) {
  switch (m.field) {
    case 'company': return installer.company;
    case 'city': return installer.office.city;
    case 'officeState': return installer.office.state;
    case 'territory': return model.stateNames.get(m.state);
    default: return installer.contacts[m.contact][m.field];
  }
}

async function v10(I) {
  const model = await madeUpModel();
  const queries = ['lena', 'abby', 'ostrander', '555-0111', 'akron', 'Alabama', 'eclat', 'jon.sato.alt', 'adam', 'r.vance', 'Ohio', 'quint'];
  let checked = 0;
  for (const q of queries) {
    const r = I.search(model, q);
    const out = I.render({ view: 'search', q }, model, { now: NOW });
    for (const res of r.results) {
      const row = rowsOf(out.node).find((x) => x.attrs['data-installer'] === res.installer.id);
      if (!row) return no(`"${q}": ${res.installer.id} has no result`);
      const face = squash(faceText(row));
      const marks = findAll(row, (n) => n.tag === 'mark');
      const visibleMarks = marks.filter((mk) => faceText(row).includes(textOf(mk)) && !findAll(row, (n) => n.attrs.hidden && findAll(n, (x) => x === mk).length).length);
      for (const m of res.matches) {
        const value = matchedValue(model, res.installer, m);
        if (!face.includes(squash(value))) return no(`"${q}": ${res.installer.id}'s matched ${m.field} is not on its face`);
        if (!visibleMarks.some((mk) => squash(value).toLowerCase().includes(squash(textOf(mk)).toLowerCase()))) return no(`"${q}": ${res.installer.id}'s matched ${m.field} is not marked on its face`);
        checked++;
      }
    }
  }
  for (const q of ['FAKE-102', 'Example Avenue', 'Made-up', 'Estimator', 'Floor 3']) {
    if (I.search(model, q).results.length) return no(`"${q}", which is held in no field that search names, finds an installer: something hidden is searched`);
  }
  return ok(`${checked} matches over ${queries.length} searches, each on its result's face and marked; 5 searches for what is not searched find nothing`);
}
test('V10', 'every result carries on its face the value that matched, a contact not on the row included; nothing that no view shows is searched',
  [sound('the page as built', () => v10(impl()))],
  [
    broken('a matched contact who is not on the row kept behind Show all contacts', 'is not on its face', () => v10(impl({ render: transformed(renderView, (n) => (n.attrs['data-matched-contacts'] ? { ...n, attrs: { ...n.attrs, hidden: true } } : n)) }))),
    broken('the marks left off', 'not marked on its face', () => v10(impl({ render: transformed(renderView, (n) => (n.tag === 'mark' ? { tag: 'span', attrs: {}, children: n.children } : n)) }))),
    broken('a search that also looks at installer ids', 'something hidden is searched', () => v10(impl({ search: (m, q) => { const r = search(m, q); const extra = m.installers.filter((i) => i.id === q.trim()); return { ...r, results: [...r.results, ...extra.map((installer) => ({ installer, matches: [] }))] }; } }))),
  ]);

/* ================================================================== V11 */

async function v11(I) {
  const model = await madeUpModel();
  const out = I.render({ view: 'search', q: 'zzqx' }, model, { now: NOW });
  const text = squash(textOf(out.node));
  if (!text.includes('No installer matches “zzqx”.')) return no('a search with no match does not say so');
  if (rowsOf(out.node).length) return no('a search with no match lists installers');
  for (const what of ['Company name', 'Contact name', 'Email address', 'Phone number', 'Office city', 'State']) {
    if (!text.includes(what)) return no(`a search with no match does not list what can be searched: ${what}`);
  }
  return ok('"zzqx" says no installer matches, and lists the six things that can be searched');
}
test('V11', 'a search with no match says so and lists what can be searched',
  [sound('the page as built', () => v11(impl()))],
  [broken('the list of what can be searched left out', 'does not list what can be searched', () => v11(impl({ render: transformed(renderView, (n) => (hasClass(n, 'can-search') ? null : n)) })))]);

/* ================================================================== V12 */

async function v12(I) {
  const model = await madeUpModel();
  const today = easternDate(NOW);
  const cases = model.installers.map((i) => ({ i, want: typeof i.ratesValidThrough === 'string' && i.ratesValidThrough < today }));
  if (!cases.some((c) => c.i.ratesValidThrough === today) || !cases.some((c) => c.i.ratesValidThrough && c.i.ratesValidThrough < today)) return no('the made-up installers lack a date of today and a date before it');
  const rates = I.render({ view: 'installers', set: 'rates', status: null }, model, { now: NOW });
  for (const { i, want } of cases) {
    const row = rowsOf(rates.node).find((r) => r.attrs['data-installer'] === i.id);
    const cell = find(row, (n) => n.tag === 'td' && n.attrs['data-column'] === 'ratesValidThrough');
    if (Boolean(byAttr(cell, 'data-expired').length) !== want) return no(`${i.id} (valid through ${i.ratesValidThrough ?? 'none'}): "Rates expired" ${want ? 'missing' : 'shown'} beside Rates valid through in the Rates columns`);
    const mob = find(row, (n) => n.tag === 'td' && n.attrs['data-column'] === 'mobilization');
    if (squash(textOf(mob)) !== squash(i.mobilization ?? '')) return no(`${i.id}: mobilization in the Rates columns is not as written`);
    const one = I.render({ view: 'installer', id: i.id }, model, { now: NOW });
    if (Boolean(byAttr(find(one.node, (n) => n.attrs['data-part'] === 'rates') || [], 'data-expired').length) !== want) return no(`${i.id}: "Rates expired" ${want ? 'missing' : 'shown'} in the Installer view`);
    if (i.mobilization && squash(textOf(byAttr(one.node, 'data-field', 'mobilization')[0])) !== `Mobilization / demobilization ${squash(i.mobilization)}`) return no(`${i.id}: mobilization in the Installer view is not as written`);
  }
  for (const id of ['FAKE-102', 'FAKE-105', 'FAKE-106', 'FAKE-024', 'FAKE-001']) {
    const i = byId(model, id);
    const r = I.render({ view: 'search', q: i.company }, model, { now: NOW });
    const row = rowsOf(r.node).find((x) => x.attrs['data-installer'] === id);
    const want = typeof i.ratesValidThrough === 'string' && i.ratesValidThrough < today;
    if (!row || Boolean(byAttr(row, 'data-expired').length) !== want) return no(`${id}: "Rates expired" ${want ? 'missing' : 'shown'} in its search result`);
    const mob = byAttr(row, 'data-field', 'mobilization')[0];
    if (i.mobilization && (!mob || !squash(textOf(mob)).endsWith(squash(i.mobilization)))) return no(`${id}: mobilization in the search result is not as written`);
  }
  return ok(`today ${today}: "Rates expired" on ${cases.filter((c) => c.want).length} installers and no other, in the Rates columns, the Installer view and search results; mobilization as written`);
}
test('V12', '"Rates expired" shows when, and only when, the valid-through date is before today; mobilization as written',
  [sound('the page as built, today handed in as October 7, 2026', () => v12(impl()))],
  [
    broken('a page that counts the valid-through day itself as expired', 'FAKE-105', () => v12(impl({ render: (r, m, o) => renderView(r, m, { ...o, now: o.now + 24 * HOUR }) }))),
    broken('mobilization written as dollars', 'mobilization', () => v12(impl({ render: transformed(renderView, (n) => (n.attrs['data-column'] === 'mobilization' && n.tag === 'td' && n.children.length ? { ...n, children: ['$725.00'] } : n)) }))),
  ]);

/* ================================================================== V13 */

async function v13(I) {
  const model = await madeUpModel();
  const out = I.render({ view: 'notOnMap' }, model, { now: NOW });
  const want = model.installers.filter((i) => !i.territory).map((i) => i.id);
  if (idsOf(out.node).join('|') !== want.join('|')) return no(`Not on the map lists ${idsOf(out.node).length} installers, not exactly the ${want.length} with no territory`);
  const title = squash(textOf(find(out.node, (n) => n.tag === 'h2')));
  if (title !== `Not on the map: ${want.length} installers`) return no('the count in the heading is not the number of installers with no territory');
  return ok(`${want.length} installers with no territory, in the file's order, and the count in the heading`);
}
test('V13', 'Not on the map lists exactly the installers with no territory',
  [sound('the page as built', () => v13(impl()))],
  [
    broken('one installer left out', 'not exactly the', () => v13(impl({ render: transformed(renderView, (n) => (n.tag === 'tbody' ? { ...n, children: n.children.slice(1) } : n)) }))),
    broken('an installer with territory added', 'not exactly the', () => v13(impl({ render: (r, m, o) => renderView(r, { ...m, installers: m.installers.map((i) => (i.id === 'FAKE-001' ? { ...i, territory: undefined } : i)) }, o) }))),
  ]);

/* ================================================================== V14 */

const commas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

async function v14(I) {
  const model = await madeUpModel();
  const at = (builtAt, now) => I.freshness({ ...model.build, builtAt }, now);
  const dates = [
    ['2026-10-07T13:31:41Z', 'October 7, 2026'],
    ['2026-10-08T03:30:00Z', 'October 7, 2026'], // just after midnight UTC: 11:30 PM the day before, Eastern
    ['2026-10-08T04:00:00Z', 'October 8, 2026'],
    ['2026-12-15T04:59:59Z', 'December 14, 2026'],
    ['2026-12-15T05:00:00Z', 'December 15, 2026'],
    ['2027-01-01T03:00:00Z', 'December 31, 2026'],
  ];
  for (const [builtAt, date] of dates) {
    const f = at(builtAt, Date.parse(builtAt) + HOUR);
    if (f.text !== `Installer records from QuickBase, refreshed ${date}.`) return no(`builtAt ${builtAt}: the line reads "${f.text}", not the date ${date} in Eastern time`);
  }
  // Eastern time against the time-zone data node carries, every 90 minutes through two years, when node has it.
  let compared = 0;
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    for (let t = Date.parse('2026-01-01T00:00:00Z'); t < Date.parse('2028-01-01T00:00:00Z'); t += 90 * 60 * 1000) {
      if (easternDate(t) !== fmt.format(t)) return no(`Eastern time is wrong at ${new Date(t).toISOString()}`);
      compared++;
    }
  } catch { /* no time-zone data here; the fixed cases above stand */ }
  // Ruling 8, at 35 and at 37 hours.
  const built = Date.parse(model.build.builtAt);
  const fresh35 = at(model.build.builtAt, built + 35 * HOUR);
  const stale37 = at(model.build.builtAt, built + 37 * HOUR);
  if (fresh35.stale || !fresh35.text.includes('refreshed October 7, 2026.')) return no('at 35 hours the line says the data is out of date');
  if (!stale37.stale || stale37.text !== 'Installer records from QuickBase. Not refreshed since October 7, 2026.' || !squash(textOf(stale37.node)).includes('Out of date')) return no('at 37 hours the line does not say "Not refreshed since" with the "Out of date" label');
  // About this data: the counts, the gap counts and every check.
  for (const build of [model.build, { ...model.build, checks: model.build.checks.map((c, i) => (i === 0 ? { check: 1, name: c.name, skipped: true } : c)) }]) {
    const out = I.render({ view: 'about' }, { ...model, build }, { now: NOW });
    const rowText = (key) => squash(textOf(find(out.node, (n) => n.tag === 'tr' && n.attrs['data-count'] === key) || ''));
    for (const [k, v] of Object.entries(build.counts)) {
      if (k === 'byStatus') continue;
      if (!rowText(k).endsWith(commas(v))) return no(`About this data does not show the count ${k}`);
    }
    for (const s of build.counts.byStatus) if (!rowText(`status:${s.status}`).endsWith(commas(s.installers))) return no(`About this data does not show the count of ${s.status}`);
    for (const [k, v] of Object.entries(build.gaps)) if (!rowText(`gap:${k}`).endsWith(commas(v))) return no(`About this data does not show the gap count ${k}`);
    const checks = findAll(out.node, (n) => n.tag === 'tr' && n.attrs['data-check'] !== undefined);
    if (checks.length !== build.checks.length) return no(`About this data shows ${checks.length} checks, not ${build.checks.length}`);
    for (const c of build.checks) {
      const row = checks.find((r) => r.attrs['data-check'] === c.check);
      const t = row ? squash(textOf(row)) : '';
      if (!t.includes(c.name) || !t.endsWith(c.skipped ? 'Skipped for this run' : 'Passed')) return no(`About this data does not show check ${c.check} with its name and whether it passed or was skipped`);
    }
    if (!squash(textOf(out.node)).includes('Wednesday, October 7, 2026, at 5:20 AM Eastern Daylight Time')) return no('About this data does not show the date and time of the refresh in Eastern time');
  }
  return ok(`${dates.length} times, one just after midnight UTC, shown as their Eastern date${compared ? `; ${compared} times agree with node's time-zone data` : ''}; 35 hours fresh, 37 hours out of date; About this data shows every count, gap count and check, passed or skipped`);
}
test('V14', 'the line under the search bar shows the Eastern date of builtAt; About this data shows the counts, the gap counts and every check; ruling 8 at 35 and 37 hours',
  [sound('the page as built', () => v14(impl()))],
  [
    broken('a line that shows the date in UTC', 'not the date October 7, 2026', () => v14(impl({ freshness: (b, now) => { const f = freshness(b, now); return { ...f, text: f.stale ? f.text : `Installer records from QuickBase, refreshed ${spelledDate(b.builtAt.slice(0, 10))}.` }; } }))),
    broken('a line that calls the data out of date only after 38 hours', 'at 37 hours', () => v14(impl({ freshness: (b, now) => freshness(b, now - 2 * HOUR) }))),
    broken('About this data with a check left out', 'checks, not', () => v14(impl({ render: transformed(renderView, (n) => (n.attrs['data-check'] === 7 ? null : n)) }))),
    broken('About this data without the gap counts', 'gap count', () => v14(impl({ render: transformed(renderView, (n) => (String(n.attrs['data-count'] || '').startsWith('gap:') ? null : n)) }))),
  ]);

/* ================================================================== V16 */

const MISSING = Symbol('missing');
async function pageWith(I, change) {
  const t = await madeUpTexts();
  const files = { 'data/build.json': t['build.json'], 'data/installers.json': t['installers.json'], 'data/territory.json': t['territory.json'], 'geo/counties.json': COUNTIES_TEXT, ...change };
  const r = await I.loadData(async (path) => { if (files[path] === MISSING) throw new Error('404'); return files[path]; });
  return r.ok ? I.render({ view: 'installers', set: 'contact', status: null }, r.model, { now: NOW }) : I.dataErrorView();
}

async function v16(I) {
  const whole = await pageWith(I, {});
  if (whole.view !== 'installers' || !rowsOf(whole.node).length) return no('with every file there, the page does not list the installers');
  const t = await madeUpTexts();
  const cases = [
    ['installers.json missing', { 'data/installers.json': MISSING }],
    ['build.json missing', { 'data/build.json': MISSING }],
    ['counties.json missing', { 'geo/counties.json': MISSING }],
    ['territory.json not JSON', { 'data/territory.json': t['territory.json'].slice(0, 200) }],
    ['installers.json not JSON', { 'data/installers.json': '<!doctype html><title>Not found</title>' }],
    ['build.json with schema 2', { 'data/build.json': t['build.json'].replace('"schema": 1', '"schema": 2') }],
    ['installers.json with no schema', { 'data/installers.json': t['installers.json'].replace('"schema":1,', '') }],
  ];
  for (const [label, change] of cases) {
    const out = await pageWith(I, change);
    const text = squash(textOf(out.node));
    if (rowsOf(out.node).length || findAll(out.node, (n) => n.tag === 'table').length) return no(`${label}: a list is drawn, as an empty directory or otherwise`);
    if (!text.includes('could not be loaded') || !text.includes('try again shortly')) return no(`${label}: the page does not say the data could not be loaded`);
  }
  return ok(`${cases.length} cases (a file missing, not JSON, a schema not 1): each says the data could not be loaded and draws no list`);
}
test('V16', 'with a file missing, a file that is not JSON, or a schema that is not 1, the page says the data could not be loaded and draws no list',
  [sound('the page as built', () => v16(impl()))],
  [broken('a loader that takes a missing file as an empty list', 'a list is drawn', () => v16(impl({
    loadData: (f) => loadData(async (p) => { try { return await f(p); } catch { return p.includes('installers') ? '{"schema":1,"installers":[]}' : p.includes('territory') ? '{"schema":1,"states":[]}' : (await madeUpTexts())['build.json']; } }),
  })))]);

/* ================================================================== made safe */

async function madeSafe(I) {
  const model = await madeUpModel();
  const html = I.toHtml(I.render({ view: 'installer', id: 'FAKE-104' }, model, { now: NOW }).node);
  if (html.includes('<b>Bold') || !html.includes('&lt;b&gt;Bold &amp; Sons&lt;/b&gt;')) return no('the company <b>Bold & Sons</b> is not shown as typed');
  if (html.includes('Pat "Red"') || !html.includes('Pat &quot;Red&quot; Quinlan')) return no('a contact name with a quotation mark is not shown as typed');
  const list = I.toHtml(I.render({ view: 'installers', set: 'contact', status: null }, model, { now: NOW }).node);
  if (list.includes('<b>Bold') || !list.includes('&lt;b&gt;Bold &amp; Sons&lt;/b&gt;')) return no('the company <b>Bold & Sons</b> is not shown as typed in All installers');
  // An installer id that would break an address, made up here.
  const odd = 'FAKE-9"<i>&/?#x';
  const m2 = withInstaller(model, odd, () => ({ id: odd, company: 'Odd Id Walls', status: 'INACTIVE', contacts: [], row: { gap: 'both' } }));
  const all = I.toHtml(I.render({ view: 'installers', set: 'contact', status: null }, m2, { now: NOW }).node);
  const href = '#/installer/FAKE-9%22%3Ci%3E%26%2F%3F%23x';
  if (!all.includes(`href="${href}"`)) return no('an installer id does not go into its address safely');
  const back = I.parse(href);
  if (back.view !== 'installer' || back.id !== odd || I.render(back, m2, { now: NOW }).view !== 'installer') return no('the address of an installer with an odd id does not lead back to it');
  return ok('<b>Bold & Sons</b> and Pat "Red" Quinlan shown as typed; an id with " < > & / ? # goes into its address and back');
}
const naiveHtml = (node) => {
  if (Array.isArray(node)) return node.map(naiveHtml).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  const attrs = Object.entries(node.attrs).filter(([, v]) => v !== null && v !== undefined && v !== false).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(v)}"`)).join('');
  return `<${node.tag}${attrs}>${node.children.map(naiveHtml).join('')}</${node.tag}>`;
};
test('made safe', 'a company with <, > and & in its name, and a contact whose name holds a quotation mark, show as typed; an installer id goes into an address safely',
  [sound('the page as built', () => madeSafe(impl()))],
  [broken('markup written without making text safe', 'Bold & Sons', () => madeSafe(impl({ toHtml: naiveHtml })))]);

/* ================================================================== rule 8 */

const TEXT_KINDS = ['.html', '.css', '.js', '.mjs', '.svg', '.json', '.txt', '.md', '.webmanifest'];

/** Every address of another site in the files, by file and line, and what a browser would fetch from one. */
export function otherSites(files) {
  const hits = [];
  for (const f of files) {
    f.text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/\bhttps?:\/\/[^\s"'<>)]*/gi)) {
        const before = line.slice(0, m.index);
        if (/\bxmlns(?::[\w-]+)?\s*=\s*["']$/.test(before)) continue; // the fixed name that marks an SVG's kind
        hits.push(`${f.path}:${i + 1} (an address of another site)`);
      }
      for (const m of line.matchAll(/(?:\bsrc\s*=\s*|\bhref\s*=\s*|\burl\(\s*|@import\s+|\bfrom\s+|\bimport\s*\(\s*|\bfetch\s*\(\s*)(["']?)\s*(\/\/|[a-z][a-z0-9+.-]*:)/gi)) {
        const scheme = m[2].toLowerCase();
        if (['mailto:', 'tel:', 'data:'].includes(scheme)) continue;
        hits.push(`${f.path}:${i + 1} (a file fetched from ${scheme === '//' ? 'another site' : `a ${scheme} address`})`);
      }
    });
  }
  return [...new Set(hits)];
}

/** Every text file under public\, data left out: [{ path, text }]. */
export function publicTextFiles(root = PUBLIC) {
  return listPublic(root).filter((n) => TEXT_KINDS.some((k) => n.toLowerCase().endsWith(k)))
    .map((n) => ({ path: `public/${n}`, text: readFileSync(join(root, ...n.split('/')), 'utf8') }));
}

function rule8(files) {
  if (files.some((f) => f.path.startsWith('public/data/'))) return no('the scan read a file under public/data');
  const hits = otherSites(files);
  return hits.length ? no(`${hits.length} hit(s): ${hits.slice(0, 10).join('; ')}`) : ok(`${files.length} text files under public/, data left out: no address of another site, and nothing fetched from one`);
}
const planted = (path, text) => () => rule8([...publicTextFiles(), { path, text }]);
test('rule 8', 'no address of another site anywhere in public\\ outside public\\data',
  [sound('the files under public/ as they are', () => rule8(publicTextFiles()))],
  [
    broken('a script from another site, planted in a copy of index.html', 'public/index-copy.html:2', planted('public/index-copy.html', '<!doctype html>\n<script src="https://cdn.example.com/lib.js"></script>\n')),
    broken('a font service, planted in a copy of the styles', 'public/css/copy.css:1', planted('public/css/copy.css', '@import url(//fonts.example.com/css?family=Roboto);\n')),
    broken('a fetch from another site, planted in a copy of a script', 'public/js/copy.js:1', planted('public/js/copy.js', "fetch('https://api.example.com/x');\n")),
  ]);

/* ================================================================== rulings 2 to 7 and 10 */

async function ruling2(I) {
  const model = await madeUpModel();
  for (const [q, id, name] of [['adam', 'FAKE-018', 'Adam Departed'], ['r.vance', 'FAKE-102', 'Rudy Vance']]) {
    const out = I.render({ view: 'search', q }, model, { now: NOW });
    const row = rowsOf(out.node).find((r) => r.attrs['data-installer'] === id);
    if (!row) return no(`"${q}" does not find ${id} by its departed contact`);
    const block = find(row, (n) => n.attrs['data-matched-contacts']);
    if (!block || !squash(faceText(block)).includes(name) || !byAttr(block, 'data-departed').length) return no(`"${q}": the departed contact is not shown marked "Departed"`);
  }
  const rows = rowsOf(I.render({ view: 'installers', set: 'contact', status: null }, model, { now: NOW }).node);
  if (rows.some((r) => byAttr(r, 'data-departed').length)) return no('a departed contact is shown on a row of All installers');
  return ok('a departed contact is found by search and shown marked "Departed"; none is shown on a row');
}
test('ruling 2', 'a contact marked departed is found by search and shown in the result marked "Departed"',
  [sound('the page as built', () => ruling2(impl()))],
  [broken('the "Departed" mark left off', 'marked "Departed"', () => ruling2(impl({ render: transformed(renderView, (n) => (n.attrs['data-departed'] ? null : n)) })))]);

async function ruling3(I) {
  const model = await madeUpModel();
  const out = I.render({ view: 'installer', id: 'FAKE-024' }, model, { now: NOW });
  const part = find(out.node, (n) => n.attrs['data-part'] === 'paperwork');
  if (!part || squash(textOf(find(part, (n) => n.tag === 'h3'))) !== 'Paperwork, as recorded in QuickBase') return no('the paperwork part is not headed "Paperwork, as recorded in QuickBase"');
  const lines = byAttr(part, 'data-field').map((n) => squash(textOf(n)));
  const want = ['Installer agreement on file No', 'Valid certificate of insurance on file Yes', 'Certificate of insurance valid through March 31, 2027'];
  if (lines.join('|') !== want.join('|')) return no(`the paperwork lines read ${JSON.stringify(lines)}`);
  const none = I.render({ view: 'installer', id: 'FAKE-001' }, model, { now: NOW });
  if (find(none.node, (n) => n.attrs['data-part'] === 'paperwork')) return no('the paperwork part shows for an installer with none filled');
  return ok('agreement, certificate and its date, as QuickBase has them, under "Paperwork, as recorded in QuickBase"');
}
test('ruling 3', 'paperwork is shown as QuickBase has it, under "Paperwork, as recorded in QuickBase"',
  [sound('the page as built', () => ruling3(impl()))],
  [broken('the paperwork under another heading', 'Paperwork, as recorded in QuickBase', () => ruling3(impl({ render: transformed(renderView, (n) => (n.tag === 'h3' && squash(textOf(n)).startsWith('Paperwork') ? { ...n, children: ['Paperwork'] } : n)) })))]);

async function ruling4(I) {
  const model = await madeUpModel();
  const shown = (id) => byAttr(I.render({ view: 'installer', id }, model, { now: NOW }).node, 'data-field').map((n) => n.attrs['data-field']).filter((f) => f.startsWith('tier2Charge.'));
  const cases = [['FAKE-105', ['tier2Charge.basis', 'tier2Charge.relation']], ['FAKE-024', ['tier2Charge.basis', 'tier2Charge.unit', 'tier2Charge.unitOther', 'tier2Charge.amount', 'tier2Charge.relation']], ['FAKE-001', []]];
  for (const [id, want] of cases) if (shown(id).join('|') !== want.join('|')) return no(`${id}: the Tier 2 charge shows ${shown(id).join(', ') || 'nothing'}, not its filled parts`);
  return ok('two of five parts, all five, and none: each shows exactly its filled parts');
}
test('ruling 4', 'the Tier 2 charge shows whichever of its five parts are filled',
  [sound('the page as built', () => ruling4(impl()))],
  [broken('the charge amount left out', 'FAKE-024', () => ruling4(impl({ render: dropField('tier2Charge.amount') })))]);

async function ruling5(I) {
  const model = await madeUpModel();
  const val = (id, f) => { const n = byAttr(I.render({ view: 'installer', id }, model, { now: NOW }).node, 'data-field', f)[0]; return n ? squash(textOf(n.children[1])) : null; };
  const cases = [
    ['FAKE-105', 'shipping', 'Not applicable'], ['FAKE-105', 'secondShipping', 'Not applicable'], ['FAKE-105', 'travelNote', 'Not applicable'], ['FAKE-105', 'emr', 'Not applicable'],
    ['FAKE-027', 'shipping', 'Not applicable'], ['FAKE-027', 'emr', 'Not applicable'], ['FAKE-027', 'travelNote', 'Made-up travel note.'],
    ['FAKE-102', 'travelNote', 'Made-up travel note.'], ['FAKE-102', 'shipping', '45 Placeholder Drive Dock 2 Grove City, OH 43123 US'],
    ['FAKE-024', 'secondShipping', 'Not applicable'], ['FAKE-001', 'emr', null],
  ];
  for (const [id, f, want] of cases) if (val(id, f) !== want) return no(`${id}: ${f} shows ${JSON.stringify(val(id, f))}, not ${JSON.stringify(want)}`);
  return ok(`${cases.length} cases: a ticked box with an empty field shows "Not applicable"; a field with a value shows the value`);
}
test('ruling 5', 'a ticked "Not applicable" box shows "Not applicable" for its empty field; a value is shown when there is one',
  [sound('the page as built', () => ruling5(impl()))],
  [broken('a ticked box shown over a value', 'Made-up travel note', () => ruling5(impl({ render: transformed(renderView, (n) => (n.attrs['data-field'] === 'travelNote' ? { ...n, children: [n.children[0], { tag: 'dd', attrs: {}, children: ['Not applicable'] }] } : n)) })))]);

async function ruling6(I) {
  const model = await madeUpModel();
  const one = I.render({ view: 'installer', id: 'FAKE-102' }, model, { now: NOW });
  const mara = findAll(one.node, (n) => hasClass(n, 'person')).find((n) => textOf(n).includes('Mara Quint'));
  if (!mara || !squash(textOf(mara)).includes('Made-up procedure: email first, then call.')) return no('a contact\'s procedure is not shown under the contact in the Installer view');
  const row = rowsOf(I.render({ view: 'installers', set: 'contact', status: null }, model, { now: NOW }).node).find((r) => r.attrs['data-installer'] === 'FAKE-015');
  const flo = findAll(row, (n) => hasClass(n, 'person')).find((n) => textOf(n).includes('Flo Brandt'));
  if (!flo || !squash(textOf(flo)).includes('Made-up procedure: call, then text.')) return no('a contact\'s procedure is not shown under the contact under Show all contacts');
  const lia = findAll(I.render({ view: 'installer', id: 'FAKE-017' }, model, { now: NOW }).node, (n) => n.attrs['data-procedure']);
  if (lia.length) return no('a procedure is shown for a contact without one');
  return ok('the procedure shows under its contact, in the Installer view and under Show all contacts, and nowhere else');
}
test('ruling 6', 'a contact\'s procedure is shown under that contact when filled',
  [sound('the page as built', () => ruling6(impl()))],
  [broken('procedures left out', 'procedure is not shown', () => ruling6(impl({ render: transformed(renderView, (n) => (n.attrs['data-procedure'] ? null : n)) })))]);

async function ruling7(I) {
  const model = await madeUpModel();
  const late = Date.parse('2026-10-08T02:00:00Z'); // 10 PM on October 7, Eastern; already October 8 in UTC
  const expired = (id) => byAttr(find(I.render({ view: 'installer', id }, model, { now: late }).node, (n) => n.attrs['data-part'] === 'rates'), 'data-expired').length > 0;
  if (expired('FAKE-105')) return no('at 10 PM Eastern on October 7, rates valid through October 7 show as expired: today is not taken in Eastern time');
  if (!expired('FAKE-106')) return no('at 10 PM Eastern on October 7, rates valid through October 6 do not show as expired');
  return ok('at 10 PM Eastern on October 7 (October 8 in UTC), October 7 is not expired and October 6 is');
}
test('ruling 7', '"Rates expired" compares the valid-through date with today\'s date in Eastern time',
  [sound('the page as built', () => ruling7(impl()))],
  [broken('a page that takes today in UTC', 'not taken in Eastern time', () => ruling7(impl({ render: (r, m, o) => renderView(r, m, { ...o, now: o.now + 5 * HOUR }) })))]);

async function ruling10(I) {
  const model = await madeUpModel();
  const note = (id) => {
    const part = find(I.render({ view: 'installer', id }, model, { now: NOW }).node, (n) => n.attrs['data-part'] === 'territory');
    if (!part) return null;
    const kids = findAll(part, (n) => hasClass(n, 'states') || n.attrs['data-field'] === 'coverageNote');
    return { order: kids.map((n) => (hasClass(n, 'states') ? 'states' : 'note')), label: squash(textOf((byAttr(part, 'data-field', 'coverageNote')[0] || { children: [] }).children[0] || '')) };
  };
  const off = note('FAKE-026');
  if (!off || off.label !== 'Coverage note, not confirmed on the map') return no('for an installer with no territory, the coverage note does not stand in the territory part, labeled as not confirmed on the map');
  const on = note('FAKE-102');
  if (!on || on.order.join('|') !== 'states|note' || on.label !== 'Coverage note') return no('for an installer with territory, the coverage note does not follow the states, labeled "Coverage note"');
  return ok('with no territory: in the territory part, not confirmed on the map; with territory: after the states, "Coverage note"');
}
test('ruling 10', 'the written coverage note is shown whenever it is filled',
  [sound('the page as built', () => ruling10(impl()))],
  [broken('the coverage note left out where there is territory', 'follow the states', () => ruling10(impl({ render: transformed(renderView, (n) => (n.attrs['data-part'] === 'territory' && JSON.stringify(n).includes('"states"') ? mapTree(n, (x) => (x.attrs['data-field'] === 'coverageNote' ? null : x)) : n)) })))]);

/* ================================================================== the server of step 6 */

const MARKER = ['stands', 'in', 'for', 'real', 'data'].join('-');

async function serverChoice(I) {
  const t = await madeUpTexts();
  const base = pageTemp('server');
  const pub = join(base, 'public');
  mkdirSync(join(pub, 'data'), { recursive: true });
  mkdirSync(join(pub, 'js'), { recursive: true });
  writeFileSync(join(pub, 'index.html'), '<!doctype html><title>made up</title>\n');
  writeFileSync(join(pub, 'js', 'a.js'), 'export {};\n');
  for (const name of ['x', 'installers.json', 'build.json']) writeFileSync(join(pub, 'data', name), MARKER);
  const made = join(base, 'made');
  mkdirSync(made);
  for (const name of ['build.json', 'installers.json', 'territory.json']) writeFileSync(join(made, name), t[name]);
  const publicNames = listPublic(pub);
  if (publicNames.some((n) => n.toLowerCase().startsWith('data/'))) return no('the list made at start holds a file of the data folder');
  const opts = { publicRoot: pub, publicNames, madeUpDir: made, madeUpNames: ['build.json', 'territory.json'] };
  for (const url of ['/data/x', '/DATA/x', '/js/../data/x', '/%64ata/x', '/data./x', '/data/installers.json', '/Data/build.json', '/js/%2E%2E/data/x']) {
    const file = I.chooseFile(url, opts);
    if (file && readFileSync(file, 'utf8') === MARKER) return no(`${url} is answered with the marker that stands in for real data`);
    if (file && !resolve(file).startsWith(resolve(made))) return no(`${url} is answered from outside the made-up folder`);
  }
  if (!I.chooseFile('/data/build.json', opts) || readFileSync(I.chooseFile('/data/build.json', opts), 'utf8') !== t['build.json']) return no('/data/build.json is not answered from the made-up folder');
  if (I.chooseFile('/data/installers.json', opts) !== null) return no('a file left out of the made-up folder is not answered "not found"');
  if (!I.chooseFile('/', opts) || !I.chooseFile('/js/a.js?x=1', opts)) return no('the page\'s own files are not served');
  // It refuses to start without the made-up files.
  if (!madeUpProblem(pub)) return no('the server would start on a folder that does not hold the made-up files');
  const realLooking = join(base, 'real-looking');
  mkdirSync(realLooking);
  for (const name of ['build.json', 'territory.json']) writeFileSync(join(realLooking, name), t[name]);
  writeFileSync(join(realLooking, 'installers.json'), t['installers.json'].replace(/"FAKE-0(\d\d)"/, (m, d) => `"${['IN', 'S-'].join('')}0${d}"`));
  if (!madeUpProblem(realLooking)) return no('the server would start on files whose installer ids do not begin FAKE-');
  if (madeUpProblem(made)) return no(`the server would not start on the made-up files: ${madeUpProblem(made)}`);
  return ok('8 addresses aimed at the data folder: none returns the marker; the made-up files are served and a file left out is "not found"; it refuses a folder without the made-up files');
}
test('server', 'the server of step 6: which file answers an address, with no server running',
  [sound('chooseFile as built', () => serverChoice(impl()))],
  [broken('a server that decodes and tidies an address before it looks', 'is answered with the marker', () => serverChoice(impl({
    chooseFile: (url, o) => {
      const p = posix.normalize(decodeURIComponent(url.split('?')[0])).replace(/^\/data\.\//i, '/data/').slice(1);
      const path = resolve(o.publicRoot, p === '' ? 'index.html' : p);
      try { readFileSync(path); return path; } catch { return chooseFile(url, o); }
    },
  })))]);

/* ================================================================== no undefined, null, NaN or [object Object] */

const BANNED = [['undefined', /\bundefined\b/], ['null', /\bnull\b/], ['NaN', /\bNaN\b/], ['[object Object]', /\[object Object\]/]];

/** The banned words a view's markup holds that the installers it shows do not hold themselves. */
export function bannedIn(html, installers) {
  const own = JSON.stringify(installers);
  return BANNED.filter(([word, re]) => re.test(html) && !own.includes(word)).map(([word]) => word);
}

async function words(I) {
  const model = await madeUpModel();
  const hashes = ['#/', '#/installers', '#/installers?set=rates', '#/not-on-the-map', '#/about', '#/nowhere', '#/search?q=a',
    ...model.installers.map((i) => `#/installer/${encodeURIComponent(i.id)}`),
    ...model.installers.map((i) => `#/search?q=${encodeURIComponent(i.company)}`),
    ...model.build.counts.byStatus.map((s) => `#/installers?status=${encodeURIComponent(s.status)}`)];
  for (const hash of hashes) {
    const out = view(I, model, hash);
    const bad = bannedIn(I.toHtml(out.node), model.installers);
    if (bad.length) return no(`${hash} writes ${bad.join(', ')}`);
  }
  return ok(`${hashes.length} views: none writes undefined, null, NaN or [object Object]`);
}
test('words', 'nothing a view writes holds undefined, null, NaN or [object Object], unless the installer\'s own record holds that word',
  [sound('the page as built', () => words(impl()))],
  [
    broken('a field written from a value that is not there', 'writes undefined', () => words(impl({ render: transformed(renderView, (n) => (n.attrs['data-field'] === 'office' ? { ...n, children: [...n.children, `${undefined}`] } : n)) }))),
    broken('a count written from a value that is not a number', 'writes NaN', () => words(impl({ render: transformed(renderView, (n) => (hasClass(n, 'count') ? { ...n, children: [String(Number('x'))] } : n)) }))),
  ]);

export { NOW, REAL, impl, rowsOf, idsOf };
