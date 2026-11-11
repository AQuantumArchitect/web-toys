import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLobber, classify } from '../src/toys/trebuchet/physics.js';
import { DEFAULT_PARAMS, SAFETY_BANDS, EFFICIENCY, G } from '../src/toys/trebuchet/constants.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} vs ${b}`);

test('defaults match the spec', () => {
  assert.equal(DEFAULT_PARAMS.landingZoneMultiplier, 1.0);
  assert.equal(DEFAULT_PARAMS.fulcrumHeight, 8);
  assert.equal(DEFAULT_PARAMS.enableRelease, false);
  assert.equal(SAFETY_BANDS.peakG.caution, 3);
});

test('rider energy is the counterweight PE times the efficiency factor', () => {
  const r = computeLobber(DEFAULT_PARAMS);
  near(r.energy.usable, r.energy.potential * EFFICIENCY);
  near(0.5 * DEFAULT_PARAMS.projectileWeight * r.impactSpeed ** 2, r.energy.usable);
  assert.ok(r.energy.usable <= r.energy.potential);
});

test('pendulum impact speed is sqrt(2gh) for the computed height', () => {
  const r = computeLobber(DEFAULT_PARAMS);
  const h = r.maxHeight - r.geometry.swingBottomHeight;
  near(r.impactSpeed, Math.sqrt(2 * G * h));
});

test('band edges: just under is lower band, edge is higher band', () => {
  const cases = { peakG: [2.99, 3.0, 5.0], maxHeight: [4.99, 5.0, 10.0], impactSpeed: [8.99, 9.0, 13.0] };
  for (const [m, [safe, caution, danger]] of Object.entries(cases)) {
    assert.equal(classify(m, safe).level, 'safe', m);
    assert.equal(classify(m, caution).level, 'caution', m);
    assert.equal(classify(m, danger - 0.01).level, 'caution', m);
    assert.equal(classify(m, danger).level, 'danger', m);
  }
  assert.equal(classify('peakG', 6).margin, -1);
});

test('short fulcrum triggers ground-collision warning', () => {
  const r = computeLobber({ ...DEFAULT_PARAMS, fulcrumHeight: 3 });
  assert.ok(r.warnings.some((w) => w.code === 'swing-ground-collision' && w.level === 'danger'));
  assert.equal(r.overall, 'danger');
});

test('ballistic release beyond max swing warns and yields no NaN', () => {
  const r = computeLobber({ ...DEFAULT_PARAMS, enableRelease: true, releaseAngle: 170, counterWeight: 20 });
  assert.ok(r.warnings.some((w) => w.code === 'release-beyond-swing'));
  assert.equal(r.ballistic, null);
  for (const v of [r.peakG, r.maxHeight, r.impactSpeed, r.landingDistance, r.landingZone.min, r.landingZone.max]) {
    assert.ok(Number.isFinite(v));
  }
});

test('valid ballistic release returns a trajectory', () => {
  const r = computeLobber({ ...DEFAULT_PARAMS, enableRelease: true, releaseAngle: 30 });
  assert.ok(r.ballistic.range > 0 && r.ballistic.flightTime > 0);
  near(r.landingDistance, r.ballistic.range);
});

test('landing zone scales with the multiplier', () => {
  const a = computeLobber({ ...DEFAULT_PARAMS, landingZoneMultiplier: 0.5 });
  const b = computeLobber({ ...DEFAULT_PARAMS, landingZoneMultiplier: 2 });
  near(b.landingZone.halfWidth, a.landingZone.halfWidth * 4);
});

test('garbage input falls back to defaults instead of NaN', () => {
  const r = computeLobber({ armLength: NaN, counterWeight: undefined, enableRelease: 'yes' });
  assert.deepEqual(r.params, DEFAULT_PARAMS);
  assert.ok(Number.isFinite(r.peakG));
});
