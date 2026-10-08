/**
 * Dates, times, money, counts and links, written the same way on every machine. Nothing here
 * reads the machine's language or clock zone: Eastern time is worked out from the United
 * States rule for daylight time (from the second Sunday of March at 2 AM to the first Sunday of
 * November at 2 AM), and numbers are written by hand.
 *
 * Nothing here touches a browser object, so node can load it and test it.
 */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HOUR = 3600 * 1000;

/** The day of the month of the nth Sunday of a month (month 0 to 11), in a year. */
function nthSunday(year, month, n) {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((7 - first) % 7) + 7 * (n - 1);
}

/** Whether a moment (milliseconds since 1970, UTC) falls in Eastern daylight time. */
export function isEasternDaylight(ms) {
  const year = new Date(ms).getUTCFullYear();
  const start = Date.UTC(year, 2, nthSunday(year, 2, 2), 7); // 2 AM EST is 07:00 UTC
  const end = Date.UTC(year, 10, nthSunday(year, 10, 1), 6); // 2 AM EDT is 06:00 UTC
  return ms >= start && ms < end;
}

/** A moment in Eastern time: { year, month (1 to 12), day, weekday, hour, minute, zone }. */
export function eastern(ms) {
  const daylight = isEasternDaylight(ms);
  const d = new Date(ms + (daylight ? -4 : -5) * HOUR);
  return {
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay(),
    hour: d.getUTCHours(), minute: d.getUTCMinutes(), zone: daylight ? 'EDT' : 'EST',
  };
}

const two = (n) => String(n).padStart(2, '0');

/** Today's date in Eastern time, written like 2026-10-07. */
export function easternDate(ms) {
  const e = eastern(ms);
  return `${e.year}-${two(e.month)}-${two(e.day)}`;
}

/** A date written like 2026-10-07, as October 7, 2026. Anything else is handed back as written. */
export function longDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return String(date);
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** A date written like 2026-10-07, short, as on rows, signals and lists (section 4.1): Oct 7, 2026. */
export function shortDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return String(date);
  return `${MONTHS[Number(m[2]) - 1].slice(0, 3)} ${Number(m[3])}, ${m[1]}`;
}

/** builtAt, a UTC time like 2026-10-07T09:20:31Z, as milliseconds; NaN when it does not read so. */
export function builtAtMs(builtAt) {
  if (typeof builtAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(builtAt)) return NaN;
  return Date.parse(builtAt);
}

/** A moment as its Eastern date, October 7, 2026. */
export function easternLongDate(ms) {
  return longDate(easternDate(ms));
}

/** A moment as Eastern date and time: { date: 'Wednesday, October 7, 2026', time: '9:31 AM', zone: 'EDT' }. */
export function easternDateTime(ms) {
  const e = eastern(ms);
  const hour12 = e.hour % 12 === 0 ? 12 : e.hour % 12;
  return {
    date: `${DAYS[e.weekday]}, ${MONTHS[e.month - 1]} ${e.day}, ${e.year}`,
    time: `${hour12}:${two(e.minute)} ${e.hour < 12 ? 'AM' : 'PM'}`,
    zone: e.zone,
    zoneName: e.zone === 'EDT' ? 'Eastern Daylight Time' : 'Eastern Standard Time',
  };
}

/** A whole number with commas: 17745 as 17,745. */
export function count(n) {
  const s = String(Math.trunc(Math.abs(n)));
  return `${n < 0 ? '-' : ''}${s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** An hourly rate as dollars and cents: 87.35 as $87.35, 0 as $0.00. */
export function money(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return String(n);
  const [whole, cents] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${cents}`;
}

/** A number as written in the file: 412.5 stays 412.5. */
export function asWritten(n) {
  return String(n);
}

/** "1 county" or "3 counties". */
export function plural(n, one, many) {
  return `${count(n)} ${n === 1 ? one : many}`;
}

/** The digits of a text. */
export function digits(s) {
  return String(s).replace(/\D/g, '');
}

/** A phone link: the digits and a leading plus, with any extension left off. */
export function telHref(phone) {
  const main = String(phone).split(/\s*(?:x|ext\.?|extension)\s*\d/i)[0];
  const plus = main.trim().startsWith('+') ? '+' : '';
  return `tel:${plus}${digits(main)}`;
}

/** An email link. */
export function mailHref(email) {
  return `mailto:${encodeURIComponent(String(email).trim()).replace(/%40/g, '@')}`;
}

/**
 * The one way text is put in order on the page, the same as the job's (job\lib\order.mjs):
 * capitals lowered, compared one character at a time in the fixed order computers give
 * characters; where that ties, the text as written decides.
 */
export function compareText(a, b) {
  const byUnits = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  return byUnits(a.toLowerCase(), b.toLowerCase()) || byUnits(a, b);
}
