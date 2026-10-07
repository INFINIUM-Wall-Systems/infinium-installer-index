/**
 * A small tree of elements. The views build one, and it becomes markup in one place, toHtml,
 * so that everything taken from the data is made safe on its way into the page: a company
 * named <b>Bold & Sons</b> shows those characters as typed and makes nothing bold.
 *
 * h(tag, attrs, ...children) makes an element. A child is an element, a text, a number, or a
 * list of children; null, undefined, false and '' are left out. An attribute whose value is
 * null, undefined or false is left out, and true writes the bare name. Tag and attribute names
 * come from the code, never from the data.
 *
 * Nothing here touches a browser object, so node can load it and test it.
 */

const VOID = new Set(['br', 'img', 'input', 'link', 'meta', 'hr', 'col']);

function flatten(list, out) {
  for (const c of list) {
    if (Array.isArray(c)) flatten(c, out);
    else if (c !== null && c !== undefined && c !== false && c !== '') out.push(c);
  }
  return out;
}

export function h(tag, attrs, ...children) {
  return { tag, attrs: attrs || {}, children: flatten(children, []) };
}

export const isElement = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x) && typeof x.tag === 'string';

/** Text made safe for markup, inside an element or inside a quoted attribute. */
export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function attrsHtml(attrs) {
  let out = '';
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    out += value === true ? ` ${name}` : ` ${name}="${escapeHtml(value)}"`;
  }
  return out;
}

/** The markup of a tree. Anything that is not an element, a text or a number is refused. */
export function toHtml(node) {
  if (Array.isArray(node)) return node.map(toHtml).join('');
  if (typeof node === 'string') return escapeHtml(node);
  if (typeof node === 'number') return escapeHtml(String(node));
  if (!isElement(node)) throw new TypeError('toHtml was handed something that is not an element, a text or a number');
  const open = `<${node.tag}${attrsHtml(node.attrs)}>`;
  if (VOID.has(node.tag)) return open;
  return `${open}${node.children.map(toHtml).join('')}</${node.tag}>`;
}

const BLOCK = new Set(['address', 'article', 'dd', 'details', 'div', 'dl', 'dt', 'footer', 'h1', 'h2', 'h3', 'h4', 'header',
  'li', 'ol', 'p', 'section', 'summary', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'br']);

/** The text of a tree, as a reader would see it with everything open. A block stands apart by a space. */
export function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!isElement(node)) return '';
  const inner = node.children.map(textOf).join('');
  return BLOCK.has(node.tag) ? ` ${inner} ` : inner;
}
