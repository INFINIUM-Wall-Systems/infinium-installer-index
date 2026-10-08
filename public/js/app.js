/**
 * The thin part that touches the browser: it fetches the files, puts each view on the page, keeps
 * the address in step, listens for clicks and keys, and is the only part that reads or writes the
 * browser's storage, always inside try/catch. Everything it shows is worked out by the plain
 * functions of data.js, routes.js, search.js, places.js, views.js and maps.js.
 *
 * A view with a map, or a ZIP code or a city to look up, needs a file the page fetches only then
 * (filesFor in views.js), and keeps. The lists show at once; when a map's file comes, only the
 * map's part of the page is filled in, so the lists are not drawn again, the focus stays where it
 * is, the Tier 2 button keeps its state, and the page does not scroll. When the page starts at
 * Find installers, the map's file is fetched beside the four data files, so that the map is drawn
 * with the view.
 */
import { cityPath, HOME_MAP, loadData, loadExtra } from './data.js';
import { toHtml } from './html.js';
import { boxAddress, MODES, parseHash, toHash } from './routes.js';
import { dataErrorView, DEFAULT_MODE, filesFor, freshness, MAP_HIDE, MAP_SHOW, mapPart, renderView, TIER2_HIDE, TIER2_SHOW } from './views.js';
import { suggestionList } from './maps.js';
import { citiesNeeded, suggest, suggestionStatus, suggestionTree } from './places.js';

const main = document.getElementById('content');
const fresh = document.getElementById('fresh');
const box = document.getElementById('q');
const tabs = { find: document.getElementById('tab-find'), all: document.getElementById('tab-all') };
/** Where the browser keeps the view of the view switch. */
const VIEW_KEY = 'installer-index-view';
/** On a screen narrower than this the county map starts folded (section 4.4). */
const WIDE = 1100;

let model = null;
let loaded = false;
let drawnHash = null;
/** Whether the last change of address came from typing in the box in the header. */
let boxTyping = false;
/** The map column as a person last turned it, while the page is open: null until then. */
let mapOpen = null;
/** The files fetched when a view or the location box needed them: { path: { state, doc } }. */
const files = {};

function remembered() {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    return MODES.includes(v) ? v : null;
  } catch {
    return null;
  }
}
function remember(mode) {
  try { window.localStorage.setItem(VIEW_KEY, mode); } catch { /* the page still works, in Estimating */ }
}

async function fetchText(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.text();
}

/** What the box in the header shows for an address. */
function boxText(route) {
  return route.view === 'installers' && route.q ? route.q : '';
}

/**
 * Puts the view for the address on the page. moveFocus: after a link, Back or Forward. focus: a
 * selector for what keeps the focus after a choice redraws the view.
 */
function draw({ moveFocus = false, focus = null } = {}) {
  if (!loaded) return;
  const now = Date.now();
  const route = parseHash(location.hash);
  // An old address, or one written another way, is put in place of itself as the page writes it.
  if (route.view !== 'notFound' && toHash(route) !== location.hash) history.replaceState(null, '', toHash(route));
  if (route.mode) remember(route.mode);
  const mode = route.mode || remembered() || DEFAULT_MODE;
  const out = model ? renderView(route, model, { now, files, mode }) : dataErrorView();
  drawnHash = location.hash;
  main.innerHTML = toHtml(out.node);
  main.dataset.view = out.view;
  document.title = out.title;
  for (const [key, tab] of Object.entries(tabs)) {
    if (out.tab === key) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
  }
  fresh.innerHTML = model ? toHtml(freshness(model.build, now).node) : '';
  if (moveFocus || document.activeElement !== box) box.value = boxText(route);
  applyMapColumn();
  if (moveFocus) {
    window.scrollTo(0, 0);
    const title = main.querySelector('.view-title');
    if (title) title.focus({ preventScroll: true });
  }
  if (focus) {
    const el = main.querySelector(focus);
    if (el) el.focus({ preventScroll: true });
  }
  if (model) fetchWhatIsNeeded(route);
}

/* ---------------------------------------------------------------- files fetched when needed */

/** Fills in the map's part of the page alone. */
function fillMap(route) {
  const part = mapPart(route, model, files);
  if (!part) return;
  const slot = main.querySelector(`[data-map-slot="${part.key}"]`);
  if (!slot) return;
  slot.innerHTML = toHtml(part.node);
  slot.dataset.map = part.state;
}

function fetchFile(path) {
  if (files[path]) return;
  files[path] = { state: 'loading' };
  loadExtra(fetchText, path).then((r) => {
    files[path] = r;
    arrived(path);
  });
}

/** A file has come: the view that waits on it is drawn again, or its map filled in; the suggestions are brought up to date. */
function arrived(path) {
  if (!model) return;
  if (location.hash === drawnHash) {
    const now = parseHash(location.hash);
    const need = filesFor(now, model, files).find((f) => f.path === path);
    if (need && need.part === 'content') draw();
    else if (need) {
      fillMap(now);
      fetchWhatIsNeeded(now);
    }
  }
  if (path.startsWith('geo/cities/')) refreshSuggestionsSoon();
}

function fetchWhatIsNeeded(route) {
  for (const { path } of filesFor(route, model, files)) fetchFile(path);
}

/* ---------------------------------------------------------------- the address */

function onAddressChange() {
  if (location.hash === drawnHash) return;
  boxTyping = false;
  draw({ moveFocus: true });
}

window.addEventListener('hashchange', onAddressChange);
window.addEventListener('popstate', onAddressChange);

// The box in the header: what is typed opens All installers with q=, five digits the ZIP's view.
// The first letter adds one step to Back; the rest keep the address in step without adding one.
box.addEventListener('input', () => {
  const current = parseHash(location.hash);
  const target = boxAddress(box.value, current);
  if (boxTyping || (current.view === 'installers' && current.q !== null)) history.replaceState(null, '', target);
  else history.pushState(null, '', target);
  boxTyping = true;
  draw();
});
box.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') boxTyping = false;
});

// The link at the very top skips to the content without changing the address.
document.querySelector('.skip').addEventListener('click', (e) => {
  e.preventDefault();
  main.focus();
});

/* ---------------------------------------------------------------- the map column */

function setMap(body, button, open) {
  if (!body || !button) return;
  body.dataset.mapOpen = open ? 'true' : 'false';
  const col = document.getElementById(button.getAttribute('aria-controls'));
  if (col) col.hidden = !open;
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  button.textContent = open ? MAP_HIDE : MAP_SHOW;
}

/** The map column as it starts: shown on a wide screen, folded on a narrower one, or as a person last turned it. */
function applyMapColumn() {
  const button = main.querySelector('button[data-map-toggle]');
  if (!button) return;
  setMap(main.querySelector('.place-body'), button, mapOpen === null ? window.innerWidth >= WIDE : mapOpen);
}

/* ---------------------------------------------------------------- clicks */

main.addEventListener('click', (e) => {
  // The Tier 2 button shows or hides the Tier 2 list in place: the focus stays on it, the page
  // does not scroll, and the address does not change.
  const tier2 = e.target.closest('button[data-tier2-toggle]');
  if (tier2) {
    const open = tier2.getAttribute('aria-expanded') !== 'true';
    const part = document.getElementById(tier2.getAttribute('aria-controls'));
    tier2.setAttribute('aria-expanded', open ? 'true' : 'false');
    tier2.textContent = open ? TIER2_HIDE : TIER2_SHOW;
    if (part) part.hidden = !open;
    tier2.focus({ preventScroll: true });
    return;
  }
  // "Hide map" and "Show map".
  const mapButton = e.target.closest('button[data-map-toggle]');
  if (mapButton) {
    mapOpen = mapButton.getAttribute('aria-expanded') !== 'true';
    setMap(main.querySelector('.place-body'), mapButton, mapOpen);
    mapButton.focus({ preventScroll: true });
    return;
  }
  // The view switch: the address is replaced, not added to Back; the view is remembered; the
  // focus stays on the switch.
  const modeLink = e.target.closest('a[data-mode-link]');
  if (modeLink) {
    e.preventDefault();
    const mode = modeLink.dataset.modeLink;
    history.replaceState(null, '', modeLink.getAttribute('href'));
    remember(mode);
    draw({ focus: `a[data-mode-link="${mode}"]` });
    return;
  }
  // A link of the jump bar, or one that skips a map, moves the focus; the address does not change.
  const jump = e.target.closest('a[data-jump], a[data-skip-to]');
  if (jump) {
    e.preventDefault();
    const target = document.getElementById(jump.dataset.jump || jump.dataset.skipTo);
    if (target) {
      if (jump.dataset.jump) target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: Boolean(jump.dataset.jump) });
    }
    return;
  }
  // "Show all contacts" opens the rest in place.
  const button = e.target.closest('button[data-more]');
  if (!button) return;
  const region = document.getElementById(button.dataset.more);
  if (!region) return;
  const open = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  region.hidden = !open;
});

// All installers: a filter or a box draws the list again; the address is replaced, not added to
// Back, and the focus stays on what was changed.
main.addEventListener('change', (e) => {
  const control = e.target.closest && e.target.closest('[data-filter]');
  if (!control) return;
  const route = parseHash(location.hash);
  if (route.view !== 'installers') return;
  const key = control.dataset.filter;
  const next = { ...route, old: undefined };
  if (key === 'office' || key === 'territory') next[key] = control.value || null;
  else if (key === 'map') next.mapOff = control.checked;
  else next[key] = control.checked;
  history.replaceState(null, '', toHash(next));
  draw({ focus: `#${control.id}` });
});

/* ---------------------------------------------------------------- the maps: the shape under the pointer or the focus */

function showShape(link) {
  const svg = link && link.closest('svg');
  const path = link && link.querySelector('path');
  if (!svg || !path) return;
  for (const o of svg.querySelectorAll('.map-ring, .map-hover')) o.setAttribute('d', path.getAttribute('d'));
}
function clearShape(svg) {
  const focused = document.activeElement;
  if (focused && focused.closest && focused.closest('svg') === svg && focused.matches('a[data-shape]')) { showShape(focused); return; }
  for (const o of svg.querySelectorAll('.map-ring, .map-hover')) o.setAttribute('d', '');
}
main.addEventListener('mouseover', (e) => { const a = e.target.closest && e.target.closest('a[data-shape]'); if (a) showShape(a); });
main.addEventListener('mouseout', (e) => {
  const a = e.target.closest && e.target.closest('a[data-shape]');
  if (a && !(e.relatedTarget && a.contains(e.relatedTarget))) clearShape(a.closest('svg'));
});
main.addEventListener('focusin', (e) => { const a = e.target.closest && e.target.closest('a[data-shape]'); if (a) showShape(a); });
main.addEventListener('focusout', (e) => {
  const a = e.target.closest && e.target.closest('a[data-shape]');
  if (a) setTimeout(() => clearShape(a.closest('svg')), 0);
  // The location box's suggestions close when the focus leaves the box.
  const locBox = e.target.closest && e.target.closest('.loc-box');
  if (locBox) setTimeout(() => { if (!locBox.contains(document.activeElement)) closeSuggestions(locBox, false); }, 0);
});

/* ---------------------------------------------------------------- the location box and the county box */

const cityDocs = () => {
  const out = {};
  for (const [path, f] of Object.entries(files)) if (path.startsWith('geo/cities/') && f.state === 'ok') out[path] = f.doc;
  return out;
};

/** Shows what the location box offers for what is typed, fetching the city files it needs. */
function showSuggestions(input) {
  const list = document.getElementById(input.getAttribute('aria-controls'));
  const status = document.getElementById('loc-status');
  if (!list || !model) return;
  for (const code of citiesNeeded(model, input.value)) fetchFile(cityPath(code));
  const r = suggest(model, input.value, cityDocs());
  list.innerHTML = toHtml(suggestionTree(r, input.value));
  list.hidden = Boolean(r.short);
  if (status) status.textContent = suggestionStatus(r);
}

let refreshing = false;
function refreshSuggestionsSoon() {
  if (refreshing) return;
  refreshing = true;
  requestAnimationFrame(() => {
    refreshing = false;
    const input = main.querySelector('input[data-location-box]');
    if (input && document.activeElement === input) showSuggestions(input);
  });
}

function closeSuggestions(locBox, focusInput) {
  const input = locBox.querySelector('input[data-location-box]');
  const list = input && document.getElementById(input.getAttribute('aria-controls'));
  if (list) { list.hidden = true; list.innerHTML = ''; }
  const status = document.getElementById('loc-status');
  if (status) status.textContent = '';
  if (focusInput && input) input.focus();
}

main.addEventListener('input', (e) => {
  const loc = e.target.closest && e.target.closest('input[data-location-box]');
  if (loc) { showSuggestions(loc); return; }
  // The county box offers the state's counties as a name is typed.
  const input = e.target.closest && e.target.closest('input[data-county-box]');
  if (!input || !model) return;
  const list = document.getElementById('county-suggestions');
  if (list) list.innerHTML = toHtml(suggestionList(model, input.dataset.countyBox, input.value));
});

main.addEventListener('keydown', (e) => {
  const loc = e.target.closest && e.target.closest('input[data-location-box]');
  const item = e.target.closest && e.target.closest('a.loc-item');
  if (loc || item) {
    const locBox = (loc || item).closest('.loc-box');
    const items = [...locBox.querySelectorAll('.loc-list:not([hidden]) a.loc-item')];
    const k = item ? items.indexOf(item) : -1;
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); items[Math.min(k + 1, items.length - 1)].focus(); }
    else if (e.key === 'ArrowUp' && item) { e.preventDefault(); if (k > 0) items[k - 1].focus(); else locBox.querySelector('input[data-location-box]').focus(); }
    else if (e.key === 'Enter' && loc && items.length) { e.preventDefault(); location.hash = items[0].getAttribute('href'); }
    return;
  }
  // Enter in the county box goes to the first county it offers.
  const input = e.target.closest && e.target.closest('input[data-county-box]');
  if (!input || e.key !== 'Enter') return;
  const first = document.querySelector('#county-suggestions a[href]');
  if (first) { e.preventDefault(); location.hash = first.getAttribute('href'); }
});

/* ---------------------------------------------------------------- Escape */

// Escape closes anything that opens, and puts the focus back on what opened it.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const focused = document.activeElement;
  let back = null;
  for (const button of main.querySelectorAll('button[data-more][aria-expanded="true"], button[data-tier2-toggle][aria-expanded="true"]')) {
    const region = document.getElementById(button.getAttribute('aria-controls'));
    if (region && (region.contains(focused) || focused === button)) back = button;
    button.setAttribute('aria-expanded', 'false');
    if (button.dataset.tier2Toggle) button.textContent = TIER2_SHOW;
    if (region) region.hidden = true;
  }
  for (const details of main.querySelectorAll('details[open]')) {
    if (details.contains(focused)) back = details.querySelector('summary');
    details.open = false;
  }
  const locBox = main.querySelector('.loc-box');
  const list = main.querySelector('.loc-list');
  if (locBox && list && !list.hidden) {
    if (locBox.contains(focused)) back = locBox.querySelector('input[data-location-box]');
    closeSuggestions(locBox, false);
  }
  const suggestions = document.getElementById('county-suggestions');
  if (suggestions && suggestions.innerHTML) {
    const input = main.querySelector('input[data-county-box]');
    if (suggestions.contains(focused) || focused === input) back = input;
    suggestions.innerHTML = '';
    if (input) input.value = '';
  }
  if (back) back.focus();
});

/* ---------------------------------------------------------------- the start */

// Find installers draws its map as it opens: its file is fetched beside the four data files.
if (parseHash(location.hash).view === 'home') fetchFile(HOME_MAP);

loadData(fetchText).then((r) => {
  model = r.ok ? r.model : null;
  loaded = true;
  draw();
}, () => {
  model = null;
  loaded = true;
  draw();
});
