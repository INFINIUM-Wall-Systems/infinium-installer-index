/**
 * The read-only QuickBase client of the Installer Index.
 *
 * Copied on 2026-10-06 from the installer-application repository
 * (https://github.com/INFINIUM-Wall-Systems/installer-application.git), commit a6fc6db, so
 * that this repository does not depend on that one:
 *   scripts/quickbase-create-tables.mjs  makeClient, readEnv, makeRedactor, partsOf, and the
 *                                        small helpers they need: asciiJson, xmlText,
 *                                        backoff, retryAfter, parseJson, errorText, Refused,
 *                                        ApiError and the constants they read
 *   scripts/quickbase-backfill.mjs       readAll (not exported there) and canon (with toSecond)
 *
 * What was changed:
 *   - makeClient can only read, and nothing switches that off. Its list of routes holds four
 *     reads and nothing else:
 *       GET  https://api.quickbase.com/v1/tables/{id}?appId=bpkqi6uif
 *       GET  https://api.quickbase.com/v1/fields?tableId={id}
 *       GET  https://api.quickbase.com/v1/tables/{id}/relationships
 *       POST https://api.quickbase.com/v1/records/query, with "from" set to {id}
 *     Any other method or address is refused; POST /v1/records (no /query), which writes
 *     records, is not on the list.
 *   - {id} must be one of the three installer tables in TABLES. Any other table is refused,
 *     Dave's bwcd37y2s included. The original dave-table guard is kept as well.
 *   - Every refusal happens before any network call is made.
 *   - REST only. The XML interface is left out.
 *   - The client keeps a list of every request it sends, by method and address (the key is
 *     never in it), and no more than MAX_CALLS_PER_CLIENT requests leave one client.
 *   - fetch, sleep, now and timeoutSignal default to the real ones. A test passes its own, and
 *     a made-up key, so it never loads the real key, never reaches QuickBase and never waits.
 *   - The realm and app id the client is made with must be the installer app's.
 *   - The client also answers query(id, body), the name readAll calls, as the backfill's
 *     wrapper (loaderApi) did.
 *   - readEnv's first argument defaults to .env.local in the folder above this repository,
 *     worked out from this file's own location, so it works from any working folder. It
 *     looks for the same variable names as the original.
 *   - The User-Agent names this repository.
 * What was left out: every function that exists only to write (createTable, createField,
 * updateField, createRelationship, setKeyField, addChoices, addRecordRest, addRecordXml,
 * importCsv); the XML reads and count (queryXml, countRecords); queryRest, getApp and
 * getAppTables, which call addresses outside the four; and openRecords, owned, and the
 * read-only, own-tables and records guards, which the fixed four reads and three tables
 * replace.
 * Unchanged: at least 150 ms between calls, the retry after a 429 (and after a 5xx or a lost
 * answer, these all being reads), and the 60-second timeout.
 *
 * What changed on 2026-10-07, for the daily job:
 *   - The limit of MAX_CALLS_PER_CLIENT (60) requests, retries included, counts for one client.
 *     It was one count for the whole process, across clients. Each run of the job makes its
 *     own client, and the tests make many clients in one process.
 *   - readAll asks for PAGE_SIZE (5,000) rows to a page, where it asked for 1,000, and hands
 *     back { rows, total }: every row once, in the order of QuickBase's record numbers, and
 *     QuickBase's own total. It stops when it has that total, not when a page comes back
 *     short. If QuickBase reports no total, or a total that changes from one page to the
 *     next, it stops with an error.
 *   - The body of an answer is read inside the retry, under the same 60-second timer: a stall
 *     while the body is read is given up and tried again like a lost answer.
 *   - The timer is timeoutSignal, which a test can stand in for, beside fetch, sleep and now.
 *     The wait a Retry-After date asks for is worked out from now.
 *   - The client keeps sentAt, the time each request left, beside calls.
 *   - ApiError carries the status number of QuickBase's answer as status, so that the job can
 *     report the number and never the text.
 *   - keyFrom says where the key comes from. On GitHub, told from the environment value
 *     GITHUB_ACTIONS being "true": the environment values QB_USER_TOKEN, QB_REALM_HOSTNAME and
 *     QB_APP_ID, and nowhere else. On the laptop: the .env.local file it is given, through
 *     readEnv; environment values are not looked at.
 *
 * Loading this module sends nothing, reads no file and writes nothing.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The three installer tables: the only tables this client will name. */
export const TABLES = Object.freeze({ MASTER: 'bwegbya6s', CONTACTS: 'bwegb3582', TERRITORY: 'bwegb3vwv' });
const TABLE_IDS = new Set(Object.values(TABLES));
export const REALM = 'infiniumwalls.quickbase.com';
export const APP_ID = 'bpkqi6uif';
export const MAX_CALLS_PER_CLIENT = 60;
/** .env.local in the folder above this repository: job\lib\ -> job\ -> the repository -> its parent. */
export const DEFAULT_ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.env.local');

export const DAVE_TABLE = 'bwcd37y2s';
const API = 'https://api.quickbase.com/v1';
const USER_AGENT = 'INFINIUM-installer-index/read-only';
const RECORD_ID = 3;
/** Rows asked for in one page of a records query. Territory comes in four. */
export const PAGE_SIZE = 5000;

// Rate limits: REST allows 100 requests per 10 seconds per user token. A 429 carries
// retry-after. As in the original: at least MIN_GAP_MS between calls, at most MAX_TRIES
// attempts, and TIMEOUT_MS for each.
const MIN_GAP_MS = 150;
const MAX_TRIES = 6;
const TIMEOUT_MS = 60_000;

// ..\.env.local: the names looked for, in order. Values are never printed.
const REALM_KEYS = ['QB_REALM_HOSTNAME', 'QB_REALM', 'QUICKBASE_REALM_HOSTNAME', 'QUICKBASE_REALM'];
const TOKEN_KEYS = ['QB_USER_TOKEN', 'QUICKBASE_USER_TOKEN', 'QB_TOKEN', 'QUICKBASE_TOKEN'];
const APP_KEYS = ['QB_APP_ID', 'QUICKBASE_APP_ID', 'QB_APP', 'QUICKBASE_APP'];

export class Refused extends Error {}
/** A call that QuickBase answered with an error, or that got no answer. status is the answer's number, when there was one. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/* ======================================================= encoding and secrets */

/** JSON sent as plain ASCII: anything else as \uXXXX, which every JSON reader decodes. */
export function asciiJson(value) {
  let s = JSON.stringify(value);
  // GUARD:encoding
  s = s.replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  // /GUARD:encoding
  return s;
}

/** XML text: the five entities, and anything outside ASCII as a character reference. */
export function xmlText(v) {
  let s = String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  // GUARD:encoding
  s = s.replace(/[^\x00-\x7e]/gu, (c) => `&#x${c.codePointAt(0).toString(16)};`);
  // /GUARD:encoding
  return s;
}

export function makeRedactor(secrets) {
  return (text) => {
    let s = String(text);
    // GUARD:redact
    for (const t of secrets) {
      if (!t) continue;
      for (const v of new Set([t, encodeURIComponent(t), xmlText(t), JSON.stringify(t).slice(1, -1)])) {
        s = s.split(v).join('[token withheld]');
      }
    }
    // /GUARD:redact
    return s;
  };
}

/** ..\.env.local: realm, app id, token. Names of keys may be printed; values never are. */
export function readEnv(path = DEFAULT_ENV_PATH, appKey) {
  if (!existsSync(path)) return { problem: `There is no ${path}, so nothing was sent to QuickBase.` };
  const env = {};
  for (const raw of readFileSync(path, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(raw);
    if (!m || raw.trim().startsWith('#')) continue;
    let v = m[2];
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    env[m[1]] = v.trim();
  }
  const first = (keys) => keys.find((k) => k in env);
  const tokenKey = first(TOKEN_KEYS);
  if (!tokenKey) return { problem: `${path} has no token line (looked for ${TOKEN_KEYS.join(', ')}). Nothing was sent to QuickBase.` };
  if (!env[tokenKey]) return { problem: `The token line in ${path} (${tokenKey}) is empty, so nothing was sent to QuickBase.` };
  const realmKey = first(REALM_KEYS);
  if (!realmKey || !env[realmKey]) return { problem: `${path} has no realm (looked for ${REALM_KEYS.join(', ')}). Nothing was sent to QuickBase.` };
  let realm = env[realmKey].replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  if (!realm.includes('.')) realm += '.quickbase.com';
  if (!/^[a-z0-9][a-z0-9-]*\.quickbase\.com$/.test(realm)) {
    return { problem: `The realm in ${path} (${realmKey}) is not a quickbase.com host, so the token was not sent anywhere.` };
  }
  let key = appKey || first(APP_KEYS);
  if (!key) {
    const named = Object.keys(env).filter((k) => /^(QB|QUICKBASE)_APP_/.test(k) && env[k]);
    if (named.length === 1) [key] = named;
    else if (named.length > 1) return { problem: `${path} names several apps (${named.join(', ')}). Say which with --app-key <name>. Nothing was sent to QuickBase.` };
  }
  if (!key || !env[key]) return { problem: `${path} has no app id (looked for ${appKey || [...APP_KEYS, 'QB_APP_*'].join(', ')}). Nothing was sent to QuickBase.` };
  const appId = env[key];
  if (!/^[a-z0-9]{6,12}$/i.test(appId)) return { problem: `The app id in ${path} (${key}) does not look like a QuickBase id. Nothing was sent.` };
  return { realm, appId, appKey: key, token: env[tokenKey] };
}

/** The three environment values the key, the realm and the app id come from on GitHub. */
export const GITHUB_KEYS = ['QB_USER_TOKEN', 'QB_REALM_HOSTNAME', 'QB_APP_ID'];

/**
 * Where the key comes from. `env` is the set of environment values the caller hands over;
 * `path` is the .env.local file to read on the laptop.
 *   On GitHub (env.GITHUB_ACTIONS is "true"): QB_USER_TOKEN, QB_REALM_HOSTNAME and QB_APP_ID,
 *   and nothing else. One that is missing or empty is named, never shown.
 *   Anywhere else: the file at `path`, through readEnv. Environment values are not looked at,
 *   so a stray one cannot take the file's place.
 * Returns { realm, appId, token, source } with source "environment" or "file", or { problem }.
 * Names of values may be printed; values never are.
 */
export function keyFrom(env, path) {
  if (!env || typeof env !== 'object') return { problem: 'No environment values were handed over, so nothing was sent to QuickBase.' };
  if (env.GITHUB_ACTIONS === 'true') {
    const missing = GITHUB_KEYS.filter((k) => typeof env[k] !== 'string' || !env[k].trim());
    if (missing.length) return { problem: `On GitHub, missing or empty: ${missing.join(', ')}. Nothing was sent to QuickBase.` };
    return { realm: env.QB_REALM_HOSTNAME.trim(), appId: env.QB_APP_ID.trim(), token: env.QB_USER_TOKEN.trim(), source: 'environment' };
  }
  if (!path) return { problem: 'No .env.local file was named, so nothing was sent to QuickBase.' };
  const r = readEnv(path);
  return r.problem ? { problem: r.problem } : { realm: r.realm, appId: r.appId, token: r.token, source: 'file' };
}

/* ====================================================================== client */

// The only four requests this client can send. Each names one of the three tables.
const ROUTES = [
  { name: 'getTable', method: 'GET', path: /^\/v1\/tables\/[a-z0-9]+$/i, query: ['appId'], table: (u) => u.pathname.split('/')[3] },
  { name: 'getFields', method: 'GET', path: /^\/v1\/fields$/, query: ['tableId'], table: (u) => u.searchParams.get('tableId') },
  { name: 'getRelationships', method: 'GET', path: /^\/v1\/tables\/[a-z0-9]+\/relationships$/i, query: [], table: (u) => u.pathname.split('/')[3] },
  { name: 'runQuery', method: 'POST', path: /^\/v1\/records\/query$/, query: [], table: (u, b) => b && b.from },
];

function routeOf(method, u, appId) {
  return ROUTES.find((r) => r.method === method
    && u.protocol === 'https:' && u.host === 'api.quickbase.com'
    && r.path.test(u.pathname)
    && [...u.searchParams.keys()].join(',') === r.query.join(',')
    && (!u.searchParams.has('appId') || u.searchParams.get('appId') === appId));
}

const backoff = (attempt) => Math.min(60_000, 1000 * 2 ** attempt);

function retryAfter(res, now) {
  const v = res.headers.get('retry-after');
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v.trim())) return Math.min(120_000, Number(v) * 1000);
  const at = Date.parse(v);
  return Number.isNaN(at) ? null : Math.min(120_000, Math.max(0, at - now()));
}

function parseJson(text) {
  try { return text ? JSON.parse(text) : {}; } catch { return { unparsed: text.slice(0, 300) }; }
}

function errorText(res, out, xml) {
  if (xml) return `${res.status}, errcode ${out.errcode}: ${out.errtext || 'no error text'}${out.errdetail ? ` (${out.errdetail})` : ''}`;
  const why = [out.message, out.description, out.unparsed].filter(Boolean).join(': ');
  return `${res.status} ${res.statusText || ''}${why ? ` — ${why}` : ''}`.slice(0, 600);
}

export function makeClient({ realm, appId, token, fetch = globalThis.fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = () => Date.now(),
  timeoutSignal = (ms) => AbortSignal.timeout(ms) }) {
  if (realm !== REALM || appId !== APP_ID) {
    throw new Refused(`refused: this client reads only realm ${REALM}, app ${APP_ID}.`);
  }
  const stats = { calls: 0, attempts: 0, rateLimited: 0, retries: 0, refused: 0 };
  // Every request sent, as "METHOD address". The key is in a header, never in an address.
  const calls = [];
  // The time, by now(), each of those requests left.
  const sentAt = [];
  // Requests sent by this client, retries included.
  let sent = 0;
  let last = -Infinity;
  const rest = { 'QB-Realm-Hostname': realm, Authorization: `QB-USER-TOKEN ${token}`, 'User-Agent': USER_AGENT,
    'Content-Type': 'application/json; charset=utf-8' };
  const refuse = (why) => {
    stats.refused++;
    throw new Refused(`refused before sending: ${why}`);
  };

  async function send(method, url, { json } = {}) {
    let u;
    try { u = new URL(url); } catch { refuse('that is not a web address.'); }
    const body = json !== undefined ? asciiJson(json) : undefined;
    const where = `${method} ${u.host}${u.pathname}${u.search}`;
    // GUARD:dave-table
    if (`${url}\n${body ?? ''}`.toLowerCase().includes(DAVE_TABLE)) refuse(`${where} names ${DAVE_TABLE}, Dave's table.`);
    // /GUARD:dave-table
    // GUARD:four-reads
    const route = routeOf(method, u, appId);
    if (!route) refuse(`${where} is not one of the four reads this client makes. It sends no write.`);
    if ((method === 'GET') !== (body === undefined)) refuse(`${where}: a GET carries no body, and a query carries one.`);
    // /GUARD:four-reads
    // GUARD:three-tables
    const table = route.table(u, json);
    if (!TABLE_IDS.has(table)) refuse(`${where} names ${table ? `table ${table}` : 'no table'}, not one of the three installer tables.`);
    // /GUARD:three-tables
    stats.calls++;
    for (let attempt = 1; ; attempt++) {
      // GUARD:call-limit
      if (sent >= MAX_CALLS_PER_CLIENT) refuse(`${where}: ${MAX_CALLS_PER_CLIENT} requests have left this client, the most one client may send.`);
      // /GUARD:call-limit
      const gap = last + MIN_GAP_MS - now();
      if (gap > 0) await sleep(gap);
      last = now();
      stats.attempts++;
      sent++;
      sentAt.push(last);
      calls.push(`${method} https://${u.host}${u.pathname}${u.search}`);
      let res;
      let text;
      try {
        res = await fetch(url, { method, headers: rest, body, signal: timeoutSignal(TIMEOUT_MS) });
        // The body is read under the same timer, so a stall here is a lost answer as well.
        text = new TextDecoder('utf-8').decode(Buffer.from(await res.arrayBuffer()));
      } catch (e) {
        if (attempt < MAX_TRIES) { stats.retries++; await sleep(backoff(attempt)); continue; }
        throw new ApiError(`${where}: no answer (${(e && e.name) || 'Error'}).`);
      }
      if (res.status === 429 && attempt < MAX_TRIES) {
        stats.rateLimited++;
        await sleep(retryAfter(res, now) ?? backoff(attempt));
        continue;
      }
      if (res.status >= 500 && attempt < MAX_TRIES) { stats.retries++; await sleep(backoff(attempt)); continue; }
      const out = parseJson(text);
      // GUARD:stop-on-error
      if (!res.ok) {
        const ray = res.headers.get('qb-api-ray');
        throw new ApiError(`${where}: ${errorText(res, out, false)}${ray ? ` [qb-api-ray ${ray}]` : ''}`, res.status);
      }
      // /GUARD:stop-on-error
      return out;
    }
  }

  const q = (o) => new URLSearchParams(o).toString();
  // runQuery: POST /records/query, body {from, select, where, sortBy, options: {skip, top}}.
  const queryRecords = (id, body) => send('POST', `${API}/records/query`, { json: { from: id, ...body } });
  return {
    stats, calls, sentAt, send,
    // getTable: GET /tables/{tableId}?appId. Gives the name, keyFieldId and the record names.
    getTable: (id) => send('GET', `${API}/tables/${id}?${q({ appId })}`),
    // getFields: GET /fields?tableId. Every field with fieldType, mode, required, unique,
    // properties (choices, defaultValue, parentFieldId of an address part).
    getFields: (id) => send('GET', `${API}/fields?${q({ tableId: id })}`),
    // getRelationships: GET /tables/{tableId}/relationships, from the child's side.
    getRelationships: (id) => send('GET', `${API}/tables/${id}/relationships`),
    queryRecords,
    // The name readAll calls.
    query: queryRecords,
  };
}

/* ============================================================== address parts */

/** An Address field's parts, however QuickBase marks them, in id order. */
export function partsOf(fields, addressId) {
  const address = fields.find((f) => f.id === addressId) || {};
  const listed = new Set(((address.properties || {}).compositeFields || []).map((c) => (typeof c === 'object' ? c.id : c)));
  return fields.filter((f) => (f.properties || {}).parentFieldId === addressId || listed.has(f.id)).sort((a, b) => a.id - b.id);
}

/* ============================================================== reading records */

/**
 * Every record matching `where` (all of them without one), page by page, in the order of
 * QuickBase's record numbers. Returns { rows, total }: total is QuickBase's own count. It stops
 * when it has that many rows, not when a page comes back short; an empty page also ends it, so
 * that the caller can compare rows.length with total.
 */
export async function readAll(api, id, select, where) {
  const rows = [];
  let total = null;
  for (let skip = 0; ;) {
    const res = await api.query(id, { select, ...(where ? { where } : {}), sortBy: [{ fieldId: RECORD_ID, order: 'ASC' }], options: { skip, top: PAGE_SIZE } });
    const data = Array.isArray(res.data) ? res.data : [];
    const reported = (res.metadata || {}).totalRecords;
    if (typeof reported !== 'number') throw new ApiError(`table ${id}: QuickBase reported no total.`);
    if (total !== null && reported !== total) throw new ApiError(`table ${id}: QuickBase's total changed while the table was read.`);
    total = reported;
    for (const row of data) rows.push(row);
    skip += data.length;
    if (skip >= total || !data.length) break;
  }
  return { rows, total };
}

const toSecond = (v) => { const ms = Date.parse(v); return new Date(ms - (((ms % 1000) + 1000) % 1000)).toISOString(); };

export function canon(type, v, side) {
  if (side === 'read') {
    if (v === null || v === undefined) return '';
    if (type === 'checkbox') return v === true ? '1' : '';
    if (type === 'numeric' || type === 'currency') return String(Number(v));
    if (type === 'multitext') return Array.isArray(v) ? v.join(';') : String(v);
    if (type === 'timestamp') return v ? toSecond(v) : '';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  if (v === '') return '';
  if (type === 'numeric' || type === 'currency') return String(Number(v));
  if (type === 'timestamp') return toSecond(v);
  return v;
}
