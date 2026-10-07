/**
 * Search: section 4.5 of docs\SPEC.md, with the rulings of the page's first prompt.
 *
 *   - Nothing is searched until two characters are typed.
 *   - Exactly five digits is a ZIP code, which this build does not look up.
 *   - A company, a contact's name or an office city is matched as one phrase: the words typed
 *     must match words that follow one another in it, each from the start of a word, so "in"
 *     does not find "Martin". Capitals, accents and apostrophes are not minded.
 *   - A state is matched by its whole name or its whole two-letter code only. It finds an
 *     installer whose office is in that state, and one whose territory includes it.
 *   - An email address (and a second email) is matched from the start of any word of the part
 *     before the @, where a period, a hyphen, an underscore or a plus sign parts the words; or
 *     from the start of the part after the @; or anywhere in it when what is typed holds an @
 *     or a period. So "co" does not find every address that ends ".com".
 *   - A phone is matched on its digits, when what is typed is a phone number of three or more
 *     digits.
 *   - A contact marked departed is searched too, and shown as departed.
 *   - Nothing else is searched: only what a view shows.
 *
 * A result is { installer, matches }; each match names its field, and where in the shown value
 * the match lies, so that the view can mark it. Results keep the order of the file.
 *
 * Nothing here touches a browser object, so node can load it and test it.
 */
import { digits } from './format.js';
import { stateName } from './data.js';

export const MIN_CHARACTERS = 2;
export const MIN_PHONE_DIGITS = 3;

/** Capitals lowered, accents and apostrophes taken off. */
export function fold(s) {
  return String(s).normalize('NFD').replace(/\p{M}/gu, '').replace(/['’]/g, '').toLowerCase();
}

/** The words of a text, each with where it starts and ends in the text as written. */
export function wordsOf(text) {
  const out = [];
  for (const m of String(text).matchAll(/[\p{L}\p{N}\p{M}'’]+/gu)) {
    const word = fold(m[0]);
    if (word) out.push({ word, start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/** The typed words, folded. */
export function typedWords(q) {
  return wordsOf(q).map((w) => w.word);
}

/**
 * Where the typed words match as a phrase: words of the text that follow one another, each
 * starting with the typed word in its place. Returns [start, end] in the text as written, or null.
 */
export function phraseMatch(text, typed) {
  if (!typed.length || typeof text !== 'string') return null;
  const words = wordsOf(text);
  for (let i = 0; i + typed.length <= words.length; i++) {
    if (typed.every((t, j) => words[i + j].word.startsWith(t))) return [words[i].start, words[i + typed.length - 1].end];
  }
  return null;
}

/** The state code a query names by its whole name or whole two-letter code, or null. */
export function stateQuery(model, q) {
  const wanted = String(q).trim().replace(/\s+/g, ' ').toLowerCase();
  for (const s of model.stateList) {
    if (typeof s.code === 'string' && s.code.toLowerCase() === wanted) return s.code;
    if (typeof s.name === 'string' && s.name.toLowerCase() === wanted) return s.code;
  }
  return null;
}

/** Whether an office state, as QuickBase writes it, is a state: by its code or its name. */
export function officeStateIs(model, officeState, code) {
  if (typeof officeState !== 'string') return false;
  const s = officeState.trim().toLowerCase();
  return s === code.toLowerCase() || s === String(stateName(model, code)).toLowerCase();
}

/** The digits of a phone query, or null when what is typed is not a phone number. */
export function phoneQuery(q) {
  const t = String(q).trim();
  if (!/^[\d\s().+\-/]+$/.test(t)) return null;
  let d = digits(t);
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length >= MIN_PHONE_DIGITS ? d : null;
}

/** Where a phone's digits hold the typed digits: [start, end] in the phone as written, or null. */
export function phoneMatch(phone, d) {
  if (!d || typeof phone !== 'string') return null;
  const at = [];
  for (let i = 0; i < phone.length; i++) if (/\d/.test(phone[i])) at.push(i);
  const all = at.map((i) => phone[i]).join('');
  const k = all.indexOf(d);
  return k < 0 ? null : [at[k], at[k + d.length - 1] + 1];
}

/** The characters that part the words of an email address before its @. */
const EMAIL_WORD_BREAKS = '.-_+';

/**
 * Where an email holds the typed text: [start, end], or null. What is typed matches from the
 * start of any word of the part before the @ (a period, a hyphen, an underscore or a plus sign
 * parts the words), or from the start of the part after the @, or anywhere in the address when
 * what is typed holds an @ or a period.
 */
export function emailMatch(email, q) {
  if (typeof email !== 'string') return null;
  const needle = String(q).trim().toLowerCase();
  if (!needle) return null;
  const lower = email.toLowerCase();
  const span = (k) => (lower.length === email.length ? [k, k + needle.length] : [0, email.length]);
  if (needle.includes('@') || needle.includes('.')) {
    const k = lower.indexOf(needle);
    return k < 0 ? null : span(k);
  }
  const at = lower.indexOf('@');
  const local = at < 0 ? lower : lower.slice(0, at);
  for (let k = 0; k < local.length; k++) {
    if ((k === 0 || EMAIL_WORD_BREAKS.includes(local[k - 1])) && local.startsWith(needle, k)) return span(k);
  }
  if (at >= 0 && lower.startsWith(needle, at + 1)) return span(at + 1);
  return null;
}

/**
 * What a query finds: { kind, q, results, state }. kind is 'short' (fewer than two characters,
 * nothing searched), 'zip' (exactly five digits), 'none' or 'results'.
 */
export function search(model, rawQ) {
  const q = String(rawQ ?? '').trim();
  if (q.length < MIN_CHARACTERS) return { kind: 'short', q, results: [] };
  if (/^\d{5}$/.test(q)) return { kind: 'zip', q, results: [] };
  const typed = typedWords(q);
  const state = stateQuery(model, q);
  const phone = phoneQuery(q);
  const results = [];
  for (const installer of model.installers) {
    const matches = [];
    const company = phraseMatch(installer.company, typed);
    if (company) matches.push({ field: 'company', range: company });
    const office = installer.office && typeof installer.office === 'object' ? installer.office : {};
    const city = phraseMatch(office.city, typed);
    if (city) matches.push({ field: 'city', range: city });
    if (state && officeStateIs(model, office.state, state)) matches.push({ field: 'officeState', state });
    if (state && installer.territory && Array.isArray(installer.territory.states)
      && installer.territory.states.some((s) => s && s.state === state)) {
      matches.push({ field: 'territory', state });
    }
    (Array.isArray(installer.contacts) ? installer.contacts : []).forEach((c, contact) => {
      if (!c || typeof c !== 'object') return;
      const name = phraseMatch(c.name, typed);
      if (name) matches.push({ field: 'name', contact, range: name });
      for (const key of ['email', 'email2']) {
        const e = emailMatch(c[key], q);
        if (e) matches.push({ field: key, contact, range: e });
      }
      const p = phoneMatch(c.phone, phone);
      if (p) matches.push({ field: 'phone', contact, range: p });
    });
    if (matches.length) results.push({ installer, matches });
  }
  return { kind: results.length ? 'results' : 'none', q, results, state };
}
