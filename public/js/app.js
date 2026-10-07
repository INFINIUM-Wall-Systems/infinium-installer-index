/**
 * The thin part that touches the browser: it fetches the four files, puts each view on the
 * page, keeps the address in step, and listens for clicks and keys. Everything it shows is
 * worked out by the plain functions of data.js, routes.js, search.js, views.js and maps.js.
 *
 * A view with a map, or a ZIP code to look up, needs a file the page fetches only then
 * (filesFor in views.js), and keeps. The list shows at once; when a map's file comes, only the
 * map's part of the page is filled in, so the list is not drawn again, the focus stays where it
 * is, and the page does not scroll.
 */
import { loadData, loadExtra } from './data.js';
import { toHtml } from './html.js';
import { boxAddress, parseHash } from './routes.js';
import { dataErrorView, filesFor, freshness, mapPart, renderView } from './views.js';
import { suggestionList } from './maps.js';

const main = document.getElementById('content');
const fresh = document.getElementById('fresh');
const box = document.getElementById('q');

let model = null;
let loaded = false;
let drawnHash = null;
/** The files fetched when a view needed them: { path: { state, doc } }. */
const files = {};

async function fetchText(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.text();
}

/** What the search box shows for an address. */
function boxText(route) {
  if (route.view === 'search') return route.q;
  if (route.view === 'zip') return route.zip;
  return '';
}

/** Puts the view for the address on the page. moveFocus: after a link, Back or Forward. */
function draw({ moveFocus = false } = {}) {
  if (!loaded) return;
  const now = Date.now();
  const route = parseHash(location.hash);
  const out = model ? renderView(route, model, { now, files }) : dataErrorView();
  drawnHash = location.hash;
  main.innerHTML = toHtml(out.node);
  main.dataset.view = out.view;
  document.title = out.title;
  fresh.innerHTML = model ? toHtml(freshness(model.build, now).node) : '';
  if (moveFocus || document.activeElement !== box) box.value = boxText(route);
  if (moveFocus) {
    window.scrollTo(0, 0);
    const title = main.querySelector('.view-title');
    if (title) title.focus({ preventScroll: true });
  }
  if (model) fetchWhatIsNeeded(route);
}

/** Fills in the map's part of the page alone. */
function fillMap(route) {
  const part = mapPart(route, model, files);
  if (!part) return;
  const slot = main.querySelector(`[data-map-slot="${part.key}"]`);
  if (!slot) return;
  slot.innerHTML = toHtml(part.node);
  slot.dataset.map = part.state;
}

/** Fetches each file the address needs that has not been asked for yet. */
function fetchWhatIsNeeded(route) {
  for (const { path, part } of filesFor(route, model, files)) {
    if (files[path]) continue;
    files[path] = { state: 'loading' };
    loadExtra(fetchText, path).then((r) => {
      files[path] = r;
      const now = parseHash(location.hash);
      if (location.hash !== drawnHash || !filesFor(now, model, files).some((f) => f.path === path)) return;
      if (part === 'content') draw();
      else {
        fillMap(now);
        fetchWhatIsNeeded(now);
      }
    });
  }
}

function onAddressChange() {
  if (location.hash === drawnHash) return;
  draw({ moveFocus: true });
}

window.addEventListener('hashchange', onAddressChange);
window.addEventListener('popstate', onAddressChange);

// Typing shows the results as you type; five digits give the ZIP's address. The first letter
// adds one step to Back; the rest keep the address in step without adding a step for each.
box.addEventListener('input', () => {
  const target = boxAddress(box.value);
  const view = parseHash(location.hash).view;
  if (view === 'search' || view === 'zip') history.replaceState(null, '', target);
  else history.pushState(null, '', target);
  draw();
});

// The link at the very top skips to the content without changing the address.
document.querySelector('.skip').addEventListener('click', (e) => {
  e.preventDefault();
  main.focus();
});

main.addEventListener('click', (e) => {
  // A link that skips a map moves the focus past it; the address does not change.
  const skip = e.target.closest('a[data-skip-to]');
  if (skip) {
    e.preventDefault();
    const target = document.getElementById(skip.dataset.skipTo);
    if (target) target.focus();
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

// The border and the green ring of the shape under the pointer or the focus, drawn last.
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
});

// The county box offers the state's counties as a name is typed. Enter goes to the first.
main.addEventListener('input', (e) => {
  const input = e.target.closest && e.target.closest('input[data-county-box]');
  if (!input || !model) return;
  const list = document.getElementById('county-suggestions');
  if (list) list.innerHTML = toHtml(suggestionList(model, input.dataset.countyBox, input.value));
});
main.addEventListener('keydown', (e) => {
  const input = e.target.closest && e.target.closest('input[data-county-box]');
  if (!input || e.key !== 'Enter') return;
  const first = document.querySelector('#county-suggestions a[href]');
  if (first) { e.preventDefault(); location.hash = first.getAttribute('href'); }
});

// Escape closes anything that opens, and puts the focus back on what opened it.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const focused = document.activeElement;
  let back = null;
  for (const button of main.querySelectorAll('button[data-more][aria-expanded="true"]')) {
    const region = document.getElementById(button.dataset.more);
    if (region && (region.contains(focused) || focused === button)) back = button;
    button.setAttribute('aria-expanded', 'false');
    if (region) region.hidden = true;
  }
  for (const details of main.querySelectorAll('details[open]')) {
    if (details.contains(focused)) back = details.querySelector('summary');
    details.open = false;
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

loadData(fetchText).then((r) => {
  model = r.ok ? r.model : null;
  loaded = true;
  draw();
}, () => {
  model = null;
  loaded = true;
  draw();
});
