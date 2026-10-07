/**
 * The thin part that touches the browser: it fetches the four files, puts each view on the
 * page, keeps the address in step, and listens for clicks and keys. Everything it shows is
 * worked out by the plain functions of data.js, routes.js, search.js and views.js.
 */
import { loadData } from './data.js';
import { toHtml } from './html.js';
import { parseHash, toHash } from './routes.js';
import { dataErrorView, freshness, renderView } from './views.js';

const main = document.getElementById('content');
const fresh = document.getElementById('fresh');
const box = document.getElementById('q');

let model = null;
let loaded = false;
let drawnHash = null;

async function fetchText(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.text();
}

/** Puts the view for the address on the page. moveFocus: after a link, Back or Forward. */
function draw({ moveFocus = false } = {}) {
  if (!loaded) return;
  const now = Date.now();
  const route = parseHash(location.hash);
  const out = model ? renderView(route, model, { now }) : dataErrorView();
  drawnHash = location.hash;
  main.innerHTML = toHtml(out.node);
  main.dataset.view = out.view;
  document.title = out.title;
  fresh.innerHTML = model ? toHtml(freshness(model.build, now).node) : '';
  if (moveFocus || document.activeElement !== box) box.value = route.view === 'search' ? route.q : '';
  if (moveFocus) {
    window.scrollTo(0, 0);
    const title = main.querySelector('.view-title');
    if (title) title.focus({ preventScroll: true });
  }
}

function onAddressChange() {
  if (location.hash === drawnHash) return;
  draw({ moveFocus: true });
}

window.addEventListener('hashchange', onAddressChange);
window.addEventListener('popstate', onAddressChange);

// Typing shows the results as you type. The first letter adds one step to Back; the rest
// keep the address in step without adding a step for every letter.
box.addEventListener('input', () => {
  const target = toHash({ view: 'search', q: box.value });
  if (parseHash(location.hash).view === 'search') history.replaceState(null, '', target);
  else history.pushState(null, '', target);
  draw();
});

// The link at the very top skips to the content without changing the address.
document.querySelector('.skip').addEventListener('click', (e) => {
  e.preventDefault();
  main.focus();
});

// "Show all contacts" opens the rest in place.
main.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-more]');
  if (!button) return;
  const region = document.getElementById(button.dataset.more);
  if (!region) return;
  const open = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  region.hidden = !open;
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
