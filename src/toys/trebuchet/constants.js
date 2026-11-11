// Kid Lobber constants. Defaults and bands are Luke's last revision (see docs/SPEC-trebuchet.md).
// Bands live here, in one place, so they are easy to retune.

export const G = 9.81; // m/s^2

// HEURISTIC: 70% of counterweight PE reaches the rider (snap trebuchets get ~30-50%; slow rotational lifts do better).
export const EFFICIENCY = 0.7;

// HEURISTIC: beam mass of 15 kg per metre of arm.
export const ARM_MASS_PER_METRE = 15;

export const DEFAULT_PARAMS = Object.freeze({
  armLength: 5.0, // m, total beam
  armRatio: 4.0, // long : short
  counterWeight: 500, // kg
  projectileWeight: 50, // kg (rider)
  slingLength: 2.5, // m
  startAngle: 30, // deg from horizontal
  fulcrumHeight: 8.0, // m
  releaseAngle: 45, // deg from vertical (ballistic mode only)
  enableRelease: false, // false = pendulum, true = ballistic
  landingZoneMultiplier: 1.0, // landing zone half-width = multiplier x max height (UI slider 0.5-2.0)
});

// A value below `caution` is safe, below `danger` is caution, otherwise danger.
export const SAFETY_BANDS = Object.freeze({
  peakG: Object.freeze({ label: 'Peak G', unit: 'g', caution: 3, danger: 5 }),
  maxHeight: Object.freeze({ label: 'Max height above water', unit: 'm', caution: 5, danger: 10 }),
  impactSpeed: Object.freeze({ label: 'Impact speed', unit: 'm/s', caution: 9, danger: 13 }),
});
