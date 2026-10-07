/**
 * Builds the map files of public\geo: states-map.json, the map on Home, and counties\<code>.json,
 * one county map for each of the 50 states, the District of Columbia and Ontario.
 *
 *   node job/build-shapes.mjs
 *
 * Run by hand when boundaries change, never by the daily job. The source is installer-application's
 * public/data/counties.topo.json at commit a6fc6db: the application form's county and state
 * outlines (US Census Bureau 2025 cartographic boundary files; Statistics Canada 2021 census
 * divisions for Ontario), in TopoJSON, in longitude and latitude. git show hands it over and it is
 * held in memory. Nothing is installed: the TopoJSON is read by the code below.
 *
 * How the outlines become paths:
 *   - each shared border of the source (an arc) is projected, put into the map's frame and
 *     rounded to its whole units; a point that repeats the one before it is dropped; then the arc
 *     is thinned once (Douglas-Peucker, keeping its two ends), before the arcs are joined into
 *     shapes, so that two neighbours keep the very same points along the border they share;
 *   - a path is written as M x,y then l dx,dy,dx,dy... z for each ring: whole numbers only, a
 *     comma between every two numbers, a minus sign only straight after a comma or a letter, so
 *     that check R5 never reads a run of digits as a phone number.
 *
 * The Home map: the 48 adjoining states, the District of Columbia and Ontario in one equal-area
 * conic projection (standard parallels 29.5 and 45.5 degrees north, centred on 96 degrees west),
 * fitted to a frame 9600 units wide; Alaska and Hawaii each in a conic projection of their own,
 * drawn smaller in the lower left, below every state above them. Each state carries the point
 * of its largest piece that lies farthest from its edge, and whether its code fits there.
 *
 * A state's map: its counties in an equal-area conic projection centred on that state (standard
 * parallels at one sixth and five sixths of its span of latitude), north up, scaled to fit inside
 * 6400 by 5600 units, whichever it meets first, and centred in that frame.
 *
 * For Alaska, 360 is taken from every longitude above zero before projecting.
 *
 * The same source always gives the same bytes. It prints counts and sizes only.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareText } from './lib/order.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const GEO = join(ROOT, 'public', 'geo');
export const SOURCE = { repo: resolve(ROOT, '..', 'installer-application'), commit: 'a6fc6db', path: 'public/data/counties.topo.json' };

/** The Home map's frame and the size it writes a state's code at, in its units. */
export const HOME = { width: 9600, margin: 60, labelSize: 130, tolerance: 0, alaskaScale: 0.35, hawaiiScale: 0.8, gap: 160 };
/** A state's map: its frame, and the margin kept inside it. */
export const STATE = { width: 6400, height: 5600, margin: 60, tolerance: 0 };

/* ================================================================ reading the source */

/** The TopoJSON source, as git show hands it over at the commit. */
export function readSource() {
  const text = execFileSync('git', ['--no-optional-locks', '-C', SOURCE.repo, 'show', `${SOURCE.commit}:${SOURCE.path}`],
    { maxBuffer: 1 << 28 }).toString('utf8');
  return JSON.parse(text);
}

/** Every arc of a quantized topology, decoded to [longitude, latitude] points. */
export function decodeArcs(topo) {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  return topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
}

/** A geometry's polygons, each a list of rings, each a list of arc indexes (~i read backwards). */
export function polygonsOf(g) {
  if (g.type === 'Polygon') return [g.arcs];
  if (g.type === 'MultiPolygon') return g.arcs;
  return [];
}

/* ================================================================ projections */

const RAD = Math.PI / 180;

/**
 * An Albers equal-area conic projection on the unit sphere: (longitude, latitude) to [x, y],
 * y growing to the north. wrap takes 360 from a longitude above zero (Alaska).
 */
export function albers({ lon0, lat0, lat1, lat2, wrap = false }) {
  const s1 = Math.sin(lat1 * RAD);
  const s2 = Math.sin(lat2 * RAD);
  const n = (s1 + s2) / 2;
  const c = Math.cos(lat1 * RAD) ** 2 + 2 * n * s1;
  const rho0 = Math.sqrt(c - 2 * n * Math.sin(lat0 * RAD)) / n;
  return (lon, lat) => {
    const l = wrap && lon > 0 ? lon - 360 : lon;
    const t = n * (l - lon0) * RAD;
    const rho = Math.sqrt(c - 2 * n * Math.sin(lat * RAD)) / n;
    return [rho * Math.sin(t), rho0 - rho * Math.cos(t)];
  };
}

export const PROJECTIONS = {
  main: albers({ lon0: -96, lat0: 37.5, lat1: 29.5, lat2: 45.5 }),
  AK: albers({ lon0: -154, lat0: 50, lat1: 55, lat2: 65, wrap: true }),
  HI: albers({ lon0: -157, lat0: 3, lat1: 8, lat2: 18 }),
};

/** A projection centred on one state, from the span of its longitudes and latitudes. */
export function stateProjection(code, box) {
  const span = box.maxLat - box.minLat;
  return albers({ lon0: (box.minLon + box.maxLon) / 2, lat0: (box.minLat + box.maxLat) / 2, lat1: box.minLat + span / 6,
    lat2: box.maxLat - span / 6, wrap: code === 'AK' });
}

/* ================================================================ thinning and joining */

function segmentDistance2(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx - p[0];
  const y = a[1] + t * dy - p[1];
  return x * x + y * y;
}

/** Douglas-Peucker on an open line, keeping its two ends. */
function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1;
    let far = 0;
    for (let i = a + 1; i < b; i++) {
      const d = segmentDistance2(points[i], points[a], points[b]);
      if (d > far) { far = d; best = i; }
    }
    if (best >= 0 && far > tol2) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return points.filter((p, i) => keep[i]);
}

const same = (p, q) => p[0] === q[0] && p[1] === q[1];

/** Thins one arc. A closed arc is split at its point farthest from its start, so that it keeps a shape. */
export function thin(points, tolerance) {
  if (points.length <= 3 || tolerance <= 0) return points;
  if (!same(points[0], points[points.length - 1])) return douglasPeucker(points, tolerance);
  let far = 0;
  let farD = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const d = (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2;
    if (d > farD) { farD = d; far = i; }
  }
  return [...douglasPeucker(points.slice(0, far + 1), tolerance), ...douglasPeucker(points.slice(far), tolerance).slice(1)];
}

/** Rounds points to whole units and drops a point that repeats the one before it. */
function roundPoints(points) {
  const out = [];
  for (const [x, y] of points) {
    const p = [Math.round(x), Math.round(y)];
    if (!out.length || !same(out[out.length - 1], p)) out.push(p);
  }
  return out;
}

/** A ring's points, from its arcs, with no point repeated; null when it has fewer than three. */
function joinRing(ring, arcPoints) {
  const out = [];
  for (const i of ring) {
    const pts = i >= 0 ? arcPoints(i) : [...arcPoints(~i)].reverse();
    for (const p of pts) if (!out.length || !same(out[out.length - 1], p)) out.push(p);
  }
  while (out.length > 1 && same(out[0], out[out.length - 1])) out.pop();
  return out.length >= 3 ? out : null;
}

/** Twice the signed area of a ring. */
function area2(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return a;
}

/** The SVG path of rings: M x,y l dx,dy,... z for each. */
export function pathOf(rings) {
  return rings.map((r) => {
    const steps = [];
    for (let i = 1; i < r.length; i++) steps.push(`${r[i][0] - r[i - 1][0]},${r[i][1] - r[i - 1][1]}`);
    return `M${r[0][0]},${r[0][1]}${steps.length ? `l${steps.join(',')}` : ''}z`;
  }).join('');
}

/* ================================================================ the label point */

/** Signed distance from a point to a polygon's edge: above zero inside. */
function pointToPolygon(x, y, polygon) {
  let inside = false;
  let min = Infinity;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
      min = Math.min(min, segmentDistance2([x, y], a, b));
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(min);
}

/**
 * The point of a polygon (rings, the first its outside) that lies farthest from its edge, found
 * by dividing its box into cells and keeping the best (the method of Mapbox's polylabel).
 * Returns { x, y, d }, d its distance to the edge.
 */
export function farthestFromEdge(polygon, precision = 1) {
  const outer = polygon[0];
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const [x, y] of outer) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const size = Math.min(maxX - minX, maxY - minY);
  const cell = (x, y, h) => { const d = pointToPolygon(x, y, polygon); return { x, y, h, d, max: d + h * Math.SQRT2 }; };
  if (size === 0) return { x: minX, y: minY, d: 0 };
  const heap = [];
  const push = (c) => {
    heap.push(c);
    let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p].max >= heap[i].max) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1; const r = l + 1; let m = i;
        if (l < heap.length && heap[l].max > heap[m].max) m = l;
        if (r < heap.length && heap[r].max > heap[m].max) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  let h = size / 2;
  for (let x = minX; x < maxX; x += size) for (let y = minY; y < maxY; y += size) push(cell(x + h, y + h, h));
  // Start from the centre of area, or the centre of the box, whichever is better.
  let a = 0; let cx = 0; let cy = 0;
  for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
    const f = outer[i][0] * outer[j][1] - outer[j][0] * outer[i][1];
    cx += (outer[i][0] + outer[j][0]) * f; cy += (outer[i][1] + outer[j][1]) * f; a += f * 3;
  }
  let best = a ? cell(cx / a, cy / a, 0) : cell(outer[0][0], outer[0][1], 0);
  const boxCentre = cell(minX + (maxX - minX) / 2, minY + (maxY - minY) / 2, 0);
  if (boxCentre.d > best.d) best = boxCentre;
  while (heap.length) {
    const c = pop();
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precision) continue;
    h = c.h / 2;
    push(cell(c.x - h, c.y - h, h)); push(cell(c.x + h, c.y - h, h));
    push(cell(c.x - h, c.y + h, h)); push(cell(c.x + h, c.y + h, h));
  }
  return { x: best.x, y: best.y, d: best.d };
}

/** Whether a two-letter code, at a size, fits in a circle of radius d: its box, half its diagonal. */
export function codeFits(d, size) {
  const halfW = 0.72 * size;
  const halfH = 0.42 * size;
  return d >= Math.sqrt(halfW * halfW + halfH * halfH);
}

/* ================================================================ one map */

/**
 * Draws shapes into one frame. shapes: [{ key, polygons, group }]; groups: { name: { project,
 * place: ([x, y]) => [X, Y] } } (filled in later is fine: place is read when the arcs are put in
 * the frame). Returns, per shape, its rings in frame units, and counts.
 */
function drawShapes(shapes, groups, lonLatArcs, tolerance) {
  const cache = new Map();
  let sourcePoints = 0;
  let keptPoints = 0;
  const arcIn = (group) => (i) => {
    const key = `${group}:${i}`;
    if (!cache.has(key)) {
      const g = groups[group];
      const pts = lonLatArcs[i].map(([lon, lat]) => g.place(g.project(lon, lat)));
      sourcePoints += pts.length;
      const out = thin(roundPoints(pts), tolerance);
      keptPoints += out.length;
      cache.set(key, out);
    }
    return cache.get(key);
  };
  const plain = (group) => (i) => roundPoints(lonLatArcs[i].map(([lon, lat]) => groups[group].place(groups[group].project(lon, lat))));
  let fallbacks = 0;
  const drawn = shapes.map((s) => {
    const make = (arcPoints) => s.polygons.map((poly) => poly.map((ring) => joinRing(ring, arcPoints)))
      .filter((poly) => poly[0]).map((poly) => poly.filter(Boolean));
    let polygons = make(arcIn(s.group));
    if (!polygons.length) { polygons = make(plain(s.group)); fallbacks++; }
    return { key: s.key, polygons };
  });
  return { drawn, sourcePoints, keptPoints, fallbacks };
}

/** The box of [x, y] points. */
function boxOf(points) {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of points) { b.minX = Math.min(b.minX, x); b.minY = Math.min(b.minY, y); b.maxX = Math.max(b.maxX, x); b.maxY = Math.max(b.maxY, y); }
  return b;
}

/** Every [lon, lat] point of a set of polygons. */
function lonLatPoints(polygons, lonLatArcs) {
  const out = [];
  for (const poly of polygons) for (const ring of poly) for (const i of ring) for (const p of lonLatArcs[i >= 0 ? i : ~i]) out.push(p);
  return out;
}

/* ================================================================ the Home map */

export function buildStatesMap(topo, lonLatArcs) {
  const states = topo.objects.states.geometries.map((g) => ({ code: g.properties.st, polygons: polygonsOf(g) }))
    .sort((a, b) => compareText(a.code, b.code));
  const groupOf = (code) => (code === 'AK' || code === 'HI' ? code : 'main');
  // The frame of the 48, the District of Columbia and Ontario.
  const mainPoints = states.filter((s) => groupOf(s.code) === 'main').flatMap((s) => lonLatPoints(s.polygons, lonLatArcs).map(([lon, lat]) => PROJECTIONS.main(lon, lat)));
  const mb = boxOf(mainPoints);
  const k = (HOME.width - 2 * HOME.margin) / (mb.maxX - mb.minX);
  const groups = {
    main: { project: PROJECTIONS.main, place: ([x, y]) => [(x - mb.minX) * k + HOME.margin, (mb.maxY - y) * k + HOME.margin] },
    AK: { project: PROJECTIONS.AK, place: null },
    HI: { project: PROJECTIONS.HI, place: null },
  };
  const main = drawShapes(states.filter((s) => groupOf(s.code) === 'main').map((s) => ({ key: s.code, polygons: s.polygons, group: 'main' })), groups, lonLatArcs, HOME.tolerance);
  const mainFramePoints = main.drawn.flatMap((d) => d.polygons.flat(2));
  /** The lowest point of the 48 and Ontario between two x positions. */
  const lowestBetween = (x0, x1) => mainFramePoints.filter(([x]) => x >= x0 && x <= x1).reduce((m, [, y]) => Math.max(m, y), HOME.margin);
  // Alaska, then Hawaii, in the lower left, each below every state above it.
  let left = HOME.margin;
  const insets = [];
  for (const [code, scale] of [['AK', HOME.alaskaScale], ['HI', HOME.hawaiiScale]]) {
    const s = states.find((x) => x.code === code);
    const pts = lonLatPoints(s.polygons, lonLatArcs).map(([lon, lat]) => PROJECTIONS[code](lon, lat));
    const b = boxOf(pts);
    const kk = k * scale;
    const w = (b.maxX - b.minX) * kk;
    const top = lowestBetween(left - HOME.gap, left + w + HOME.gap) + HOME.gap;
    const x0 = left;
    groups[code].place = ([x, y]) => [(x - b.minX) * kk + x0, (b.maxY - y) * kk + top];
    insets.push(drawShapes([{ key: code, polygons: s.polygons, group: code }], groups, lonLatArcs, HOME.tolerance));
    left += w + HOME.gap;
  }
  const drawn = [...main.drawn, ...insets.flatMap((x) => x.drawn)].sort((a, b) => compareText(a.key, b.key));
  const all = drawn.flatMap((d) => d.polygons.flat(2));
  const height = Math.max(...all.map(([, y]) => y)) + HOME.margin;
  const lines = drawn.map((d) => {
    const largest = d.polygons.reduce((m, p) => (Math.abs(area2(p[0])) > Math.abs(area2(m[0])) ? p : m), d.polygons[0]);
    const spot = farthestFromEdge(largest, 1);
    return JSON.stringify({ code: d.key, path: pathOf(d.polygons.flat()), label: [Math.round(spot.x), Math.round(spot.y)], fits: codeFits(spot.d, HOME.labelSize) });
  });
  const text = `{"schema":1,"width":${HOME.width},"height":${height},"labelSize":${HOME.labelSize},"states":[\n${lines.join(',\n')}\n]}\n`;
  const sourcePoints = main.sourcePoints + insets.reduce((n, x) => n + x.sourcePoints, 0);
  const keptPoints = main.keptPoints + insets.reduce((n, x) => n + x.keptPoints, 0);
  const fallbacks = main.fallbacks + insets.reduce((n, x) => n + x.fallbacks, 0);
  return { text, count: drawn.length, height, sourcePoints, keptPoints, fallbacks, fits: drawn.length - lines.filter((l) => l.endsWith('"fits":false}')).length };
}

/* ================================================================ a state's map */

export function buildStateMap(code, counties, lonLatArcs) {
  const pts = counties.flatMap((c) => lonLatPoints(c.polygons, lonLatArcs));
  const lons = pts.map(([lon]) => (code === 'AK' && lon > 0 ? lon - 360 : lon));
  const box = { minLon: Math.min(...lons), maxLon: Math.max(...lons), minLat: Math.min(...pts.map((p) => p[1])), maxLat: Math.max(...pts.map((p) => p[1])) };
  const project = stateProjection(code, box);
  const b = boxOf(pts.map(([lon, lat]) => project(lon, lat)));
  const k = Math.min((STATE.width - 2 * STATE.margin) / (b.maxX - b.minX), (STATE.height - 2 * STATE.margin) / (b.maxY - b.minY));
  const ox = (STATE.width - (b.maxX - b.minX) * k) / 2;
  const oy = (STATE.height - (b.maxY - b.minY) * k) / 2;
  const groups = { state: { project, place: ([x, y]) => [(x - b.minX) * k + ox, (b.maxY - y) * k + oy] } };
  const r = drawShapes(counties.map((c) => ({ key: c.id, polygons: c.polygons, group: 'state' })), groups, lonLatArcs, STATE.tolerance);
  const lines = r.drawn.map((d) => JSON.stringify({ id: d.key, path: pathOf(d.polygons.flat()) }));
  const text = `{"schema":1,"state":${JSON.stringify(code)},"width":${STATE.width},"height":${STATE.height},"counties":[\n${lines.join(',\n')}\n]}\n`;
  return { text, count: r.drawn.length, sourcePoints: r.sourcePoints, keptPoints: r.keptPoints, fallbacks: r.fallbacks };
}

/* ================================================================ all of them */

/**
 * Every file, as { name: text }, from the parsed source and the county list. Stops when a county
 * of the list has no outline, or an outline is not in the list.
 */
export function buildAll(topo, countyList) {
  const lonLatArcs = decodeArcs(topo);
  const listed = new Map(countyList.counties.map((c) => [c.id, c]));
  const outlines = topo.objects.counties.geometries;
  const seen = new Set();
  for (const g of outlines) {
    if (!listed.has(g.id)) throw new Error(`an outline is not in the county list: ${g.id}`);
    if (seen.has(g.id)) throw new Error(`an outline comes twice: ${g.id}`);
    seen.add(g.id);
  }
  for (const id of listed.keys()) if (!seen.has(id)) throw new Error(`a county of the list has no outline: ${id}`);
  const files = {};
  const home = buildStatesMap(topo, lonLatArcs);
  files['states-map.json'] = home.text;
  const stats = { home, states: [] };
  for (const s of countyList.states) {
    const counties = outlines.filter((g) => listed.get(g.id).state === s.code)
      .map((g) => ({ id: g.id, polygons: polygonsOf(g) })).sort((a, b) => compareText(a.id, b.id));
    const r = buildStateMap(s.code, counties, lonLatArcs);
    files[`counties/${s.code}.json`] = r.text;
    stats.states.push({ code: s.code, ...r });
  }
  return { files, stats };
}

function main() {
  const topo = readSource();
  const countyList = JSON.parse(readFileSync(join(GEO, 'counties.json'), 'utf8'));
  const { files, stats } = buildAll(topo, countyList);
  const folder = join(GEO, 'counties');
  mkdirSync(folder, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(GEO, ...name.split('/')), text);
  const sizes = Object.entries(files).map(([name, text]) => [name, Buffer.byteLength(text)]);
  const total = sizes.reduce((n, [, b]) => n + b, 0);
  const largest = sizes.reduce((m, x) => (x[1] > m[1] ? x : m));
  const countyFiles = sizes.filter(([n]) => n.startsWith('counties/'));
  const st = stats.states;
  console.log(`Source: ${SOURCE.path} at ${SOURCE.commit}: ${topo.arcs.length} arcs; ${topo.objects.counties.geometries.length} county outlines; ${topo.objects.states.geometries.length} state outlines.`);
  console.log(`Wrote public/geo/states-map.json: ${Buffer.byteLength(files['states-map.json'])} bytes; ${stats.home.count} states; frame ${HOME.width} by ${stats.home.height}; codes that fit ${stats.home.fits}; points ${stats.home.sourcePoints} projected, ${stats.home.keptPoints} kept; shapes drawn unthinned ${stats.home.fallbacks}.`);
  console.log(`Wrote public/geo/counties/: ${countyFiles.length} files, ${countyFiles.reduce((n, [, b]) => n + b, 0)} bytes; ${st.reduce((n, s) => n + s.count, 0)} county shapes; points ${st.reduce((n, s) => n + s.sourcePoints, 0)} projected, ${st.reduce((n, s) => n + s.keptPoints, 0)} kept; shapes drawn unthinned ${st.reduce((n, s) => n + s.fallbacks, 0)}.`);
  console.log(`In all ${sizes.length} files, ${total} bytes; the largest ${largest[0]}, ${largest[1]} bytes.`);
  return 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) process.exitCode = main();
