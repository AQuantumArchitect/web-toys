import React from 'react';
import { G } from './constants.js';
import { fmt } from './ui.js';

const RAD = Math.PI / 180;

// Side view in metres (y up, flipped on render). Counterweight on the left, rider and landing to the right.
export default function Diagram({ r, system }) {
  const p = r.params;
  const { longArm, shortArm, radius, maxSwingAngle } = r.geometry;
  const H = p.fulcrumHeight;
  const a = p.startAngle * RAD;
  const ok = [longArm, shortArm, radius, r.landingZone.max, maxSwingAngle].every(Number.isFinite);
  if (!ok) return <p className="text-sm text-stone-600">No diagram: this geometry does not compute.</p>;

  const ballistic = r.ballistic && p.enableRelease;
  const rel = p.releaseAngle * RAD;
  const relPt = [radius * Math.sin(rel), H - radius * Math.cos(rel)];

  // Rider path: pendulum arc from the bottom to the apex, then (ballistic) a parabola.
  const arcEnd = ballistic ? rel : maxSwingAngle * RAD;
  const arc = [];
  for (let i = 0; i <= 24; i++) {
    const t = (arcEnd * i) / 24;
    arc.push([radius * Math.sin(t), H - radius * Math.cos(t)]);
  }
  let flight = [];
  if (ballistic) {
    const v = r.ballistic.releaseSpeed;
    const vx = v * Math.cos(rel);
    const vy = v * Math.sin(rel);
    const T = r.ballistic.flightTime;
    for (let i = 0; i <= 24; i++) {
      const t = (T * i) / 24;
      flight.push([relPt[0] + vx * t, relPt[1] + vy * t - 0.5 * G * t * t]);
    }
  }
  const pts = [...arc, ...flight];
  const xMax = Math.max(r.landingZone.max, ...pts.map((q) => q[0]), longArm) + 1;
  const xMin = -Math.max(shortArm, 2) - 1.5;
  const yMax = Math.max(H + shortArm * Math.sin(a), H) + 1;
  const yMin = -1.2;
  const W = xMax - xMin;
  const Ht = yMax - yMin;
  const X = (x) => x - xMin;
  const Y = (y) => yMax - y;
  const path = (list) => list.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(3)},${Y(y).toFixed(3)}`).join(' ');

  const longEnd = [longArm * Math.cos(a), H - longArm * Math.sin(a)];
  const shortEnd = [-shortArm * Math.cos(a), H + shortArm * Math.sin(a)];
  const rider = [longEnd[0], longEnd[1] - p.slingLength];
  const leg = Math.max(1.2, H * 0.4);
  const sw = W / 220; // stroke unit so lines stay readable at any scale
  const fs = W / 38;

  return (
    <svg viewBox={`0 0 ${W} ${Ht}`} role="img" className="w-full h-auto bg-sky-50 rounded border border-stone-300"
      aria-label={`Side view: fulcrum ${fmt(H, 'length', system)} high, lands about ${fmt(r.landingDistance, 'length', system)} out`}>
      <rect x={0} y={Y(0)} width={W} height={yMin * -1} fill="#7dd3fc" />
      <line x1={0} x2={W} y1={Y(0)} y2={Y(0)} stroke="#0369a1" strokeWidth={sw * 2} />
      <text x={0.2} y={Y(-0.5)} fontSize={fs} fill="#075985">water line</text>
      <rect x={X(r.landingZone.min)} y={Y(0.35)} width={r.landingZone.max - r.landingZone.min} height={0.35} fill="#f59e0b" fillOpacity="0.55" />
      <text x={X(r.landingZone.min)} y={Y(0.6)} fontSize={fs} fill="#92400e">landing zone {fmt(r.landingZone.min, 'length', system, 0)}–{fmt(r.landingZone.max, 'length', system, 0)}</text>
      {/* frame */}
      <path d={`M${X(-leg)},${Y(0)} L${X(0)},${Y(H)} L${X(leg)},${Y(0)}`} fill="none" stroke="#78716c" strokeWidth={sw * 4} strokeLinejoin="round" />
      <line x1={X(0)} x2={X(0)} y1={Y(0)} y2={Y(H)} stroke="#a8a29e" strokeWidth={sw * 1.5} strokeDasharray={`${sw * 4} ${sw * 4}`} />
      <text x={X(0) + 0.15} y={Y(H / 2)} fontSize={fs} fill="#57534e">fulcrum {fmt(H, 'length', system)}</text>
      {/* rider path */}
      <path d={path(arc)} fill="none" stroke="#a16207" strokeWidth={sw * 2} strokeDasharray={`${sw * 5} ${sw * 4}`} />
      {flight.length > 0 && <path d={path(flight)} fill="none" stroke="#a16207" strokeWidth={sw * 2} />}
      {/* arm, counterweight, sling, rider */}
      <line x1={X(shortEnd[0])} y1={Y(shortEnd[1])} x2={X(longEnd[0])} y2={Y(longEnd[1])} stroke="#44403c" strokeWidth={sw * 5} strokeLinecap="round" />
      <rect x={X(shortEnd[0]) - 0.4} y={Y(shortEnd[1]) - 0.1} width={0.8} height={0.8} fill="#57534e" />
      <line x1={X(longEnd[0])} y1={Y(longEnd[1])} x2={X(rider[0])} y2={Y(rider[1])} stroke="#b45309" strokeWidth={sw * 2} />
      <ellipse cx={X(rider[0])} cy={Y(rider[1])} rx={0.35} ry={0.18} fill="#b45309" />
      <circle cx={X(0)} cy={Y(H)} r={0.18} fill="#292524" />
    </svg>
  );
}
