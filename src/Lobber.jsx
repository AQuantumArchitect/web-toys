import React, { useEffect, useMemo, useState } from 'react';
import { computeLobber } from './toys/trebuchet/physics.js';
import { DEFAULT_PARAMS, SAFETY_BANDS } from './toys/trebuchet/constants.js';
import { NOTICE, PARAM_SPECS, LEVEL_TEXT, fmt, fromQuery, marginText, round, summaryLine, toDisplay, toMetric, toQuery, unitFor } from './toys/trebuchet/ui.js';
import Diagram from './toys/trebuchet/Diagram.jsx';

const LEVEL_STYLE = {
  safe: 'bg-green-100 border-green-600 text-green-900',
  caution: 'bg-amber-100 border-amber-600 text-amber-900',
  danger: 'bg-red-100 border-red-700 text-red-900',
  unknown: 'bg-stone-100 border-stone-500 text-stone-800',
};
const LEVEL_ICON = { safe: '✓', caution: '!', danger: '✕', unknown: '?' };

function Field({ spec, value, system, onChange }) {
  const [unit] = unitFor(spec.kind, system);
  const shown = round(toDisplay(value, spec.kind, system), 2);
  const [draft, setDraft] = useState(String(shown));
  useEffect(() => setDraft(String(shown)), [shown]);
  const id = `f-${spec.key}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{spec.label}</label>
      <div className="flex items-center gap-2">
        <input type="range" aria-label={`${spec.label} slider`} className="flex-1 min-w-0" min={spec.min} max={spec.max} step={spec.step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} />
        <input id={id} type="number" inputMode="decimal" className="w-24 border border-stone-400 rounded px-2 py-1 text-right" value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== '' && Number.isFinite(n))
              onChange(Math.min(spec.max, Math.max(spec.min, toMetric(n, spec.kind, system))));
          }}
          onBlur={() => setDraft(String(shown))} />
        <span className="w-8 text-sm text-stone-600">{unit}</span>
      </div>
    </div>
  );
}

export default function Lobber() {
  const [{ params, system }, setState] = useState(() => fromQuery(window.location.search));
  const r = useMemo(() => computeLobber(params), [params]);

  useEffect(() => {
    const q = toQuery(params, system);
    window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
  }, [params, system]);

  const set = (key, v) => setState((s) => ({ ...s, params: { ...s.params, [key]: v } }));
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* user can copy the address bar */ }
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <header className="flex items-baseline justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Kid Lobber</h1>
            <p className="text-stone-600 text-sm">hammock-trebuchet physics</p>
          </div>
          <a href="/" className="underline text-stone-700 text-sm">← Back to Toys</a>
        </header>

        <section aria-label="Safety notice" className="border-2 border-amber-600 bg-amber-50 rounded p-3 text-sm space-y-1">
          <p><strong>{NOTICE.lead}</strong> {NOTICE.rules}</p>
          <p className="text-stone-700">{NOTICE.origin}</p>
        </section>

        <section aria-live="polite" className={`border-2 rounded p-3 ${LEVEL_STYLE[r.overall]}`}>
          <p className="text-lg font-semibold" data-testid="summary">{summaryLine(r, system)}</p>
          <p className="text-sm">Overall: {LEVEL_ICON[r.overall]} {LEVEL_TEXT[r.overall]}. “Peak g” is what a rider feels at the bottom of the swing (centripetal + 1 g of gravity).</p>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section aria-label="Safety readouts" className="grid gap-2">
              {Object.entries(r.bands).map(([metric, band]) => {
                const b = SAFETY_BANDS[metric];
                const val = band.value === null ? 'N/A' : metric === 'peakG' ? `${band.value.toFixed(1)} g` : fmt(band.value, metric === 'maxHeight' ? 'length' : 'speed', system);
                return (
                  <div key={metric} className={`border-2 rounded p-2 ${LEVEL_STYLE[band.level]}`}>
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-medium">{b.label}</span>
                      <span className="font-bold text-lg">{val} · {LEVEL_ICON[band.level]} {LEVEL_TEXT[band.level]}</span>
                    </div>
                    <p className="text-sm">{marginText(metric, band, system)}</p>
                  </div>
                );
              })}
            </section>

            {r.warnings.length > 0 && (
              <section aria-label="Design warnings" className="border-2 border-red-700 bg-red-50 rounded p-3">
                <h2 className="font-semibold">🔧 Design warnings</h2>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {r.warnings.map((w) => <li key={w.code}>{w.level === 'danger' ? 'DANGER: ' : 'CAUTION: '}{w.message}</li>)}
                </ul>
              </section>
            )}

            <Diagram r={r} system={system} />
            <p className="text-sm text-stone-700">
              Clear zone: {fmt(r.landingZone.min, 'length', system)} to {fmt(r.landingZone.max, 'length', system)} from the base.
            </p>
          </div>

          <section aria-label="Settings" className="space-y-3">
            <div className="flex gap-2 flex-wrap items-center">
              <div role="group" aria-label="Units" className="inline-flex border border-stone-400 rounded overflow-hidden">
                {['metric', 'imperial'].map((u) => (
                  <button key={u} type="button" aria-pressed={system === u} onClick={() => setState((s) => ({ ...s, system: u }))}
                    className={`px-3 py-1 text-sm ${system === u ? 'bg-stone-800 text-white' : 'bg-white'}`}>{u}</button>
                ))}
              </div>
              <button type="button" onClick={share} className="px-3 py-1 text-sm border border-stone-400 rounded bg-white">{copied ? 'Link copied' : 'Copy share link'}</button>
              <button type="button" onClick={() => setState((s) => ({ ...s, params: { ...DEFAULT_PARAMS } }))} className="px-3 py-1 text-sm border border-stone-400 rounded bg-white">Reset</button>
            </div>

            <fieldset className="border border-stone-300 rounded p-2">
              <legend className="text-sm font-medium px-1">Mode</legend>
              {[[false, 'Pendulum swing (default, safest)'], [true, 'Ballistic release']].map(([v, label]) => (
                <label key={label} className="flex items-center gap-2 py-1">
                  <input type="radio" name="mode" checked={params.enableRelease === v} onChange={() => set('enableRelease', v)} /> {label}
                </label>
              ))}
            </fieldset>

            {PARAM_SPECS.filter((s) => !s.ballisticOnly || params.enableRelease).map((spec) => (
              <Field key={spec.key} spec={spec} value={params[spec.key]} system={system} onChange={(v) => set(spec.key, v)} />
            ))}
            <p className="text-xs text-stone-600">Efficiency (70%) and arm mass (15 kg/m) are rough heuristics, not measurements.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
