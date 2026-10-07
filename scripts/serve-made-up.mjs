/**
 * A small web server for npm run page:pictures: node only, on 127.0.0.1 and a free port. It
 * serves the page with made-up installers, and it has no way to serve public\data:
 *
 *   - It refuses to start unless it is given a temporary folder, whose name or a folder it sits
 *     in begins installer-index-, holding the three files built from the made-up installers:
 *     each reads as JSON with schema 1, and every installer id begins FAKE-.
 *   - At start it lists the files under the page's folder, passing over the data folder whole,
 *     and serves only the names on that list, matched exactly. An address is never decoded or
 *     tidied before it is matched.
 *   - An address under /data/ is answered from the made-up folder alone. A file that is not
 *     there is answered "not found", never from another folder.
 *
 * Which file answers an address is one plain function, chooseFile, tested in npm run check:page
 * with no server running. The server can be told to leave a data file out, or to serve one
 * broken, for the pictures of V16.
 *
 * It is never started on its own: npm run page:pictures starts it and stops it.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC = join(ROOT, 'public');
export const DATA_FILES = ['build.json', 'installers.json', 'territory.json'];
export const PREFIX = 'installer-index-';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
};

/** Every file under a folder, as names like css/site.css, passing over its data folder whole. */
export function listPublic(root) {
  const out = [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!prefix && entry.name.toLowerCase() === 'data') continue;
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), name);
      else if (entry.isFile()) out.push(name);
    }
  };
  walk(root, '');
  return out.sort();
}

/**
 * The file that answers an address, as a path on disk, or null for "not found".
 *   urlPath      the address as the request gives it, such as /css/site.css?x=1
 *   publicRoot   the page's folder; publicNames, the list listPublic made of it at start
 *   madeUpDir    the made-up folder; madeUpNames, the data files served from it
 */
export function chooseFile(urlPath, { publicRoot, publicNames, madeUpDir, madeUpNames }) {
  const path = String(urlPath).split('?')[0].split('#')[0];
  if (!path.startsWith('/')) return null;
  const name = path === '/' ? 'index.html' : path.slice(1);
  if (name.startsWith('data/')) {
    const file = name.slice('data/'.length);
    return madeUpNames.includes(file) ? join(madeUpDir, file) : null;
  }
  return publicNames.includes(name) ? join(publicRoot, ...name.split('/')) : null;
}

/** Why a folder cannot be served as the made-up data, or null when it can. */
export function madeUpProblem(dir, { temp = tmpdir() } = {}) {
  let real;
  let realTemp;
  try {
    if (!statSync(dir).isDirectory()) return 'the made-up folder is not a folder';
    real = realpathSync.native(dir).toLowerCase();
    realTemp = realpathSync.native(temp).toLowerCase();
  } catch {
    return 'the made-up folder is not there';
  }
  const rel = relative(realTemp, real);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return 'the made-up folder is not inside the system temp directory';
  if (!rel.split(sep).some((part) => part.startsWith(PREFIX))) return `neither the made-up folder nor a folder it sits in begins ${PREFIX}`;
  for (const name of DATA_FILES) {
    const path = join(dir, name);
    if (!existsSync(path)) return `the made-up folder does not hold ${name}`;
    let doc;
    try { doc = JSON.parse(readFileSync(path, 'utf8')); } catch { return `${name} in the made-up folder does not read as JSON`; }
    if (!doc || doc.schema !== 1) return `${name} in the made-up folder does not carry schema 1`;
    if (name === 'installers.json') {
      const list = Array.isArray(doc.installers) ? doc.installers : null;
      if (!list || !list.length) return 'installers.json in the made-up folder holds no installer';
      if (!list.every((i) => i && typeof i.id === 'string' && i.id.startsWith('FAKE-'))) return 'an installer id in the made-up folder does not begin FAKE-';
    }
  }
  return null;
}

/** A data file's text made broken on purpose: 'json', cut short; 'schema', schema 2. */
function breakText(text, how) {
  if (how === 'json') return text.slice(0, Math.max(1, Math.floor(text.length / 3)));
  if (how === 'schema') return text.replace('"schema":1', '"schema":2').replace('"schema": 1', '"schema": 2');
  return text;
}

/**
 * Starts the server: { url, close }. madeUpDir: the made-up folder (required). publicRoot: the
 * page's folder (public\ by default, or a copy without its data folder). leaveOut: data files
 * answered "not found". broken: { name: 'json' | 'schema' }.
 */
export async function startServer({ madeUpDir, publicRoot = PUBLIC, leaveOut = [], broken = {} } = {}) {
  const problem = madeUpDir ? madeUpProblem(madeUpDir) : 'no made-up folder was given';
  if (problem) throw new Error(`the server will not start: ${problem}`);
  const publicNames = listPublic(publicRoot);
  const madeUpNames = DATA_FILES.filter((n) => !leaveOut.includes(n));
  const opts = { publicRoot, publicNames, madeUpDir, madeUpNames };
  const server = createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not allowed');
      return;
    }
    const file = chooseFile(req.url, opts);
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('Not found');
      return;
    }
    let body = readFileSync(file);
    const dataName = file.startsWith(madeUpDir) ? file.slice(madeUpDir.length + 1) : null;
    if (dataName && broken[dataName]) body = Buffer.from(breakText(body.toString('utf8'), broken[dataName]), 'utf8');
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', ok);
  });
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((ok) => { server.closeAllConnections(); server.close(() => ok()); }),
  };
}
