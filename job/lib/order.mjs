/**
 * The one way text is put in order anywhere in the job (section 3.6 of docs\SPEC.md): capitals
 * lowered, compared one character at a time in the fixed order computers give characters
 * (digits, then letters, then accented letters); where that ties, the text as written decides.
 * Where that still ties the result is 0, and the stable sort keeps the order the rows came in,
 * which is the order of QuickBase's record numbers.
 *
 * It never looks at the machine's language settings, so it gives the same order on every
 * machine.
 */
const byUnits = (x, y) => (x < y ? -1 : x > y ? 1 : 0);

export function compareText(a, b) {
  return byUnits(a.toLowerCase(), b.toLowerCase()) || byUnits(a, b);
}
