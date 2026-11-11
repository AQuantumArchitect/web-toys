// Kid Lobber physics: pure functions, no UI, no string formatting.
// Port of docs/reference/trebuchet-rev3-luke-2025-07-30.jsx. Simplified toy model, not engineering.
import { G, EFFICIENCY, ARM_MASS_PER_METRE, DEFAULT_PARAMS, SAFETY_BANDS } from './constants.js';

const RAD = Math.PI / 180;
const finite = (x) => (Number.isFinite(x) ? x : null);

function sanitize(input = {}) {
  const p = { ...DEFAULT_PARAMS };
  for (const key of Object.keys(DEFAULT_PARAMS)) {
    if (key === 'enableRelease') p[key] = input[key] === true;
    else if (Number.isFinite(input[key])) p[key] = input[key];
  }
  return p;
}

export function classify(metric, value) {
  const band = SAFETY_BANDS[metric];
  if (!Number.isFinite(value)) return { value: null, level: 'unknown', caution: band.caution, danger: band.danger, margin: null };
  const level = value < band.caution ? 'safe' : value < band.danger ? 'caution' : 'danger';
  // margin: distance below the danger limit (negative once you are over it)
  return { value, level, caution: band.caution, danger: band.danger, margin: band.danger - value };
}

export function computeLobber(params) {
  const p = sanitize(params);
  const warnings = [];
  const warn = (level, code, message) => warnings.push({ level, code, message });

  // --- Geometry & mass ---
  const longArm = (p.armLength * p.armRatio) / (p.armRatio + 1);
  const shortArm = p.armLength - longArm;
  const radius = longArm + p.slingLength; // fulcrum to rider
  const armMass = p.armLength * ARM_MASS_PER_METRE; // heuristic

  // --- Energy ---
  const startRad = p.startAngle * RAD;
  const dropHeight = shortArm * Math.sin(startRad);
  const potentialEnergy = p.counterWeight * G * dropHeight;
  const usableEnergy = potentialEnergy * EFFICIENCY; // heuristic efficiency
  const riderStartHeight = p.fulcrumHeight - longArm * Math.sin(startRad) - p.slingLength;

  // --- Rotational dynamics ---
  const inertia =
    (1 / 3) * armMass * p.armLength ** 2 + p.counterWeight * shortArm ** 2 + p.projectileWeight * radius ** 2;
  // Heuristic (as in the 2025 calculator): peak speed/g use the full PE, swing height uses usable energy.
  const omegaMax = Math.sqrt((2 * potentialEnergy) / inertia);
  const maxSpeed = omegaMax * radius;
  const centripetalG = maxSpeed ** 2 / radius / G;
  // Heuristic: peak g is centripetal only; a rider at the bottom of the swing also feels +1 g of gravity.
  const feltG = centripetalG + 1;

  // --- Swing ---
  const heightGain = usableEnergy / (p.projectileWeight * G);
  const swingBottom = p.fulcrumHeight - radius;
  const maxSwingAngle = Math.asin(Math.min(1, heightGain / radius)) / RAD;

  if (riderStartHeight <= 0)
    warn('danger', 'rider-underground', `Rider starts below ground (${riderStartHeight.toFixed(1)} m). Raise the fulcrum or shorten the arm/sling.`);
  if (swingBottom <= 0)
    warn('danger', 'swing-ground-collision', `Swing path hits the ground (bottom at ${swingBottom.toFixed(1)} m). Fulcrum is too low for this arm and sling.`);
  if (p.fulcrumHeight - shortArm <= 0)
    warn('caution', 'counterweight-ground-collision', 'Counterweight arm may strike the ground. Check clearance.');

  let ballistic = null;
  let maxHeight = swingBottom + heightGain;
  let impactSpeed = Math.sqrt(2 * G * heightGain);
  let landingDistance = radius * Math.sin(maxSwingAngle * RAD);

  if (p.enableRelease && p.releaseAngle > maxSwingAngle) {
    warn('danger', 'release-beyond-swing', `Release angle ${p.releaseAngle}° is beyond the maximum swing of ${maxSwingAngle.toFixed(1)}°. Not enough energy; showing the pendulum result instead.`);
  } else if (p.enableRelease) {
    const a = p.releaseAngle * RAD;
    const gain = radius * (1 - Math.cos(a));
    const releaseHeight = swingBottom + gain;
    if (releaseHeight < 0) warn('danger', 'release-underground', 'Release happens below ground. This trajectory is not possible.');

    const ke = 0.5 * inertia * omegaMax ** 2 - p.projectileWeight * G * gain;
    const releaseSpeed = Math.sqrt(Math.max(0, (2 * ke) / inertia)) * radius;
    const vx = releaseSpeed * Math.sin(a);
    const vy = releaseSpeed * Math.cos(a);
    const vyImpact = Math.sqrt(vy ** 2 + 2 * G * Math.max(0, releaseHeight));
    const flightTime = (vy + vyImpact) / G;
    maxHeight = releaseHeight + vy ** 2 / (2 * G);
    impactSpeed = Math.sqrt(vx ** 2 + vyImpact ** 2);
    landingDistance = vx * flightTime;
    ballistic = { releaseSpeed, range: landingDistance, apexHeight: maxHeight, flightTime };
  }

  const halfWidth = Math.max(0, maxHeight) * p.landingZoneMultiplier;
  const bands = {
    peakG: classify('peakG', centripetalG),
    maxHeight: classify('maxHeight', maxHeight),
    impactSpeed: classify('impactSpeed', impactSpeed),
  };
  const levels = [...Object.values(bands).map((b) => b.level), ...warnings.map((w) => w.level)];
  const overall = levels.includes('danger') ? 'danger' : levels.includes('caution') ? 'caution' : levels.includes('unknown') ? 'unknown' : 'safe';

  return {
    params: p,
    geometry: { longArm: finite(longArm), shortArm: finite(shortArm), radius: finite(radius), armMass, riderStartHeight: finite(riderStartHeight), swingBottomHeight: finite(swingBottom), maxSwingAngle: finite(maxSwingAngle) },
    energy: { potential: finite(potentialEnergy), usable: finite(usableEnergy), efficiency: EFFICIENCY, inertia: finite(inertia), omegaMax: finite(omegaMax), maxSpeed: finite(maxSpeed) },
    peakG: finite(centripetalG),
    peakGFelt: finite(feltG), // centripetal + 1 g of gravity at the bottom
    maxHeight: finite(maxHeight),
    impactSpeed: finite(impactSpeed),
    landingDistance: finite(landingDistance),
    landingZone: { min: finite(Math.max(0, landingDistance - halfWidth)), max: finite(landingDistance + halfWidth), halfWidth: finite(halfWidth) },
    ballistic: ballistic && Object.fromEntries(Object.entries(ballistic).map(([k, v]) => [k, finite(v)])),
    warnings,
    bands,
    overall,
  };
}

export { DEFAULT_PARAMS, SAFETY_BANDS };
