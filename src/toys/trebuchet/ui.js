// Kid Lobber UI helpers: units, URL state, readout text. Pure and testable; physics stays metric.
import { DEFAULT_PARAMS, SAFETY_BANDS } from './constants.js';

export const NOTICE = {
  lead: 'This is a simplified physics toy with rough estimates.',
  rules: 'Never launch a person. Test only with sandbags (sandbag dummies). Real rides need real engineering review.',
  origin: 'It started as an 18-inch marble trebuchet that throws marbles for my kids; this is the "what if it were much bigger?" daydream.',
};

const FT = 3.28084;
const LB = 2.20462;

export const UNITS = {
  metric: { length: ['m', 1], mass: ['kg', 1], speed: ['m/s', 1] },
  imperial: { length: ['ft', FT], mass: ['lb', LB], speed: ['ft/s', FT] },
};

// kind: unit family (or 'deg' / 'ratio' / 'x', which never convert). Ranges are metric.
export const PARAM_SPECS = [
  { key: 'armLength', label: 'Arm length (total beam)', kind: 'length', min: 1, max: 12, step: 0.1 },
  { key: 'armRatio', label: 'Arm ratio (long : short)', kind: 'ratio', min: 1.5, max: 8, step: 0.1 },
  { key: 'counterWeight', label: 'Counterweight', kind: 'mass', min: 10, max: 2000, step: 10 },
  { key: 'projectileWeight', label: 'Rider (sandbag) weight', kind: 'mass', min: 5, max: 120, step: 1 },
  { key: 'slingLength', label: 'Sling length', kind: 'length', min: 0.5, max: 6, step: 0.1 },
  { key: 'startAngle', label: 'Start angle (from horizontal)', kind: 'deg', min: 0, max: 80, step: 1 },
  { key: 'fulcrumHeight', label: 'Fulcrum height', kind: 'length', min: 1, max: 15, step: 0.1 },
  { key: 'releaseAngle', label: 'Release angle (from vertical)', kind: 'deg', min: 0, max: 90, step: 1, ballisticOnly: true },
  { key: 'landingZoneMultiplier', label: 'Landing zone (× max height)', kind: 'x', min: 0.5, max: 2, step: 0.1 },
];

export function unitFor(kind, system) {
  if (kind === 'deg') return ['°', 1];
  if (kind === 'ratio') return ['', 1];
  if (kind === 'x') return ['×', 1];
  return UNITS[system][kind];
}
export const toDisplay = (v, kind, system) => v * unitFor(kind, system)[1];
export const toMetric = (v, kind, system) => v / unitFor(kind, system)[1];
export const round = (v, d = 1) => Number(v.toFixed(d));
// Show one decimal, but never let a nonzero margin read as "0".
const show = (v, d = 1) => (round(v, d) === 0 && v !== 0 ? v.toFixed(d + 2) : v.toFixed(d));
export function fmt(v, kind, system, d = 1) {
  if (!Number.isFinite(v)) return 'N/A';
  const [u, f] = unitFor(kind, system);
  return `${show(v * f, d)}${u ? ' ' + u : ''}`.replace(/ ([°×])$/, '$1');
}

const METRIC_KIND = { peakG: 'g', maxHeight: 'length', impactSpeed: 'speed' };
function fmtMetric(metric, v, system) {
  const kind = METRIC_KIND[metric];
  return kind === 'g' ? `${show(v, 1)} g` : fmt(v, kind, system);
}

export const LEVEL_TEXT = { safe: 'SAFE', caution: 'CAUTION', danger: 'DANGER', unknown: 'N/A' };

// How far the value sits from the band edges, in words (Luke's bug #1: number + band + distance).
export function marginText(metric, band, system) {
  if (band.value === null) return 'Not computable for this geometry.';
  const f = (v) => fmtMetric(metric, v, system);
  const { value, caution, danger } = band;
  if (band.level === 'safe') {
    // Float noise can leave a hair of margin that would print as "0.000"; say it in words instead.
    if (caution - value < 0.0005) return `right at the caution edge (${f(caution)})`;
    return `${f(caution - value)} under the caution edge (${f(caution)})`;
  }
  if (band.level === 'caution') return `${f(value - caution)} over the caution edge (${f(caution)}), ${f(danger - value)} under danger (${f(danger)})`;
  return `${f(value - danger)} over the danger edge (${f(danger)})`;
}

export function summaryLine(r, system) {
  if (r.landingDistance === null || r.impactSpeed === null || r.peakGFelt === null) return 'Lands at N/A: this geometry does not work. See the warnings below.';
  const half = r.landingZone.halfWidth;
  return `Lands at ${fmt(r.landingDistance, 'length', system)} ± ${fmt(half, 'length', system)} at ${fmt(r.impactSpeed, 'speed', system)}, peak ${show(r.peakGFelt, 1)} g`;
}

// --- URL state: metric values, short keys; `u=imp` for imperial. Unknown/garbage keys fall back to defaults.
export function toQuery(params, system) {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULT_PARAMS)) {
    if (params[k] === DEFAULT_PARAMS[k]) continue;
    q.set(k, k === 'enableRelease' ? (params[k] ? '1' : '0') : String(round(params[k], 3)));
  }
  if (system === 'imperial') q.set('u', 'imp');
  return q.toString();
}
export function fromQuery(search) {
  const q = new URLSearchParams(search);
  const params = { ...DEFAULT_PARAMS };
  for (const spec of PARAM_SPECS) {
    const raw = q.get(spec.key);
    const n = raw === null || raw.trim() === '' ? NaN : Number(raw);
    if (Number.isFinite(n)) params[spec.key] = Math.min(spec.max, Math.max(spec.min, n));
  }
  if (q.get('enableRelease') === '1') params.enableRelease = true;
  return { params, system: q.get('u') === 'imp' ? 'imperial' : 'metric' };
}

export { SAFETY_BANDS };
