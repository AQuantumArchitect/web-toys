import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { makeRng, rollAll, rollLayer, LAYER_IDS } from './toys/layers/roll.js';
import { summaryText, newSeed, readUrl, writeUrl } from './toys/layers/ui.js';

const THEMES = [
  ['', 'Base'],
  ['blocky', 'Blocky world'],
  ['space', 'Space'],
  ['ocean', 'Ocean'],
];
const LAYER_INFO = [
  { title: 'Outline', hint: 'Draw the big shape', color: 'bg-sky-100 border-sky-400' },
  { title: 'Mid detail', hint: 'Add surface and material', color: 'bg-amber-100 border-amber-400' },
  { title: 'Fine detail', hint: 'Add tiny accents', color: 'bg-pink-100 border-pink-400' },
];
const btn =
  'rounded-2xl px-5 py-3 text-lg font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-300 active:translate-y-px';

function App() {
  const initial = useMemo(() => readUrl(window.location.search), []);
  const [seed, setSeed] = useState(() => initial.seed || newSeed());
  const [theme, setTheme] = useState(initial.theme);
  const [mode, setMode] = useState('party');
  const [players, setPlayers] = useState(3);
  const [results, setResults] = useState(() => rollAll(makeRng(seed), { theme: initial.theme }));
  const [locked, setLocked] = useState([false, false, false]);
  const [rerolls, setRerolls] = useState(0);
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(1);
  const [rolling, setRolling] = useState([false, false, false]);
  const [copied, setCopied] = useState(false);

  useEffect(() => writeUrl(seed, theme), [seed, theme]);

  const animate = (idxs) => {
    setRolling((r) => r.map((v, i) => v || idxs.includes(i)));
    setTimeout(() => setRolling((r) => r.map((v, i) => (idxs.includes(i) ? false : v))), 450);
  };

  const rollEverything = (nextTheme = theme, keepLocks = true) => {
    const s = newSeed();
    const lockedArr = results.map((r, i) => (keepLocks && locked[i] ? r : null));
    setSeed(s);
    setRerolls(0);
    setResults(rollAll(makeRng(s), { theme: nextTheme, locked: lockedArr }));
    animate([0, 1, 2].filter((i) => !lockedArr[i]));
  };

  const rerollOne = (i) => {
    const n = rerolls + 1;
    setRerolls(n);
    const next = [...results];
    next[i] = rollLayer(i, makeRng(`${seed}:${i}:${n}`), { theme });
    setResults(next);
    animate([i]);
  };

  const toggleLock = (i) => setLocked((l) => l.map((v, j) => (j === i ? !v : v)));

  const changeTheme = (t) => {
    setTheme(t);
    rollEverything(t, true);
  };

  const pass = () => {
    if (step < 2) setStep(step + 1);
    else {
      setStep(0);
      setRound(round + 1);
      rollEverything(theme, true);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(results));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy this:', summaryText(results));
    }
  };

  const layerCard = (i, big) => {
    const r = results[i];
    const info = LAYER_INFO[i];
    return (
      <section
        key={i}
        aria-label={info.title}
        className={`rounded-3xl border-4 p-5 ${info.color} ${rolling[i] ? 'dice-roll' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-600">
            {i + 1}. {info.title} <span className="normal-case font-medium">· {info.hint}</span>
          </h2>
          {r.source !== 'base' && (
            <span className="text-xs rounded-full bg-white/70 px-2 py-0.5">{r.source}</span>
          )}
        </div>
        <p className={`mt-3 font-extrabold capitalize leading-tight ${big ? 'text-5xl sm:text-7xl' : 'text-3xl'}`}>
          {r.item}
        </p>
        <p className={`mt-2 font-semibold ${big ? 'text-3xl sm:text-4xl' : 'text-xl'} text-stone-700`}>{r.modifier}</p>
        <p className="mt-1 text-sm text-stone-500">{r.category}</p>
        <div className="mt-4 flex gap-2">
          <button
            className={`${btn} bg-white border-2 border-stone-300 flex-1`}
            onClick={() => rerollOne(i)}
            disabled={locked[i]}
            aria-label={`Re-roll ${info.title}`}
          >
            🎲 Re-roll
          </button>
          <button
            className={`${btn} border-2 flex-1 ${locked[i] ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-300'}`}
            onClick={() => toggleLock(i)}
            aria-pressed={locked[i]}
            aria-label={`Lock ${info.title}`}
          >
            {locked[i] ? '🔒 Locked' : '🔓 Lock'}
          </button>
        </div>
      </section>
    );
  };

  const seg = (active) =>
    `${btn} border-2 ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-stone-300'}`;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <style>{`
        @keyframes dice { 0%{transform:rotate(-4deg) scale(.96)} 25%{transform:rotate(4deg) scale(1.03)} 50%{transform:rotate(-3deg) scale(.98)} 100%{transform:none} }
        .dice-roll { animation: dice .45s ease-in-out; }
        @media (prefers-reduced-motion: reduce) { .dice-roll { animation: none; } }
      `}</style>
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <header>
          <a href="/" className="text-sm underline text-stone-600">← Toys</a>
          <h1 className="text-4xl font-extrabold tracking-tight">Layer Roll</h1>
          <p className="text-stone-600">Draw it together, one layer at a time.</p>
        </header>

        <div className="flex gap-2" role="group" aria-label="Mode">
          <button className={`${seg(mode === 'party')} flex-1`} aria-pressed={mode === 'party'} onClick={() => { setMode('party'); setStep(0); }}>
            🎉 Party
          </button>
          <button className={`${seg(mode === 'solo')} flex-1`} aria-pressed={mode === 'solo'} onClick={() => setMode('solo')}>
            ✏️ Solo
          </button>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
          {THEMES.map(([id, label]) => (
            <button key={id} className={`${seg(theme === id)} text-base py-2`} aria-pressed={theme === id} onClick={() => changeTheme(id)}>
              {label}
            </button>
          ))}
        </div>

        {mode === 'party' && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white border-2 border-stone-200 p-3">
            <label className="flex items-center gap-2 font-semibold">
              Players
              <select
                className="rounded-xl border-2 border-stone-300 px-3 py-2 text-lg"
                value={players}
                onChange={(e) => setPlayers(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <div className="text-lg font-bold" aria-live="polite">Round {round}</div>
          </div>
        )}

        {mode === 'party' ? (
          <>
            <p className="text-center font-semibold text-stone-600" aria-live="polite">
              Layer {step + 1} of 3 · {players} players
            </p>
            {layerCard(step, true)}
            <button className={`${btn} w-full bg-indigo-600 text-white text-2xl py-5`} onClick={pass}>
              {step < 2 ? '📄 Pass the paper' : '🎉 Done! Next round'}
            </button>
          </>
        ) : (
          <div className="space-y-4">{LAYER_IDS.map((_, i) => layerCard(i, false))}</div>
        )}

        <div className="flex gap-2">
          <button className={`${btn} flex-1 bg-emerald-500 text-white`} onClick={() => { rollEverything(); setStep(0); }}>
            🎲 Roll All
          </button>
          <button className={`${btn} flex-1 bg-white border-2 border-stone-300`} onClick={copy}>
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        <p className="text-sm text-stone-600">
          Copy saves the rolls as shown. The page link replays only the <b>starting roll</b>; re-rolls and locks aren't saved in it.
        </p>

        <section className="rounded-2xl bg-white border-2 border-stone-200 p-4">
          <h2 className="text-xl font-bold">How to play</h2>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>Everyone draws the <b>outline</b> from the first roll, then passes the paper.</li>
            <li>Add <b>mid details</b> from the second roll, then pass again.</li>
            <li>Add <b>fine details</b> from the third roll. Hold them all up and share!</li>
          </ol>
        </section>
      </main>
      <footer className="px-4 py-6 text-center text-sm text-stone-500">
        Inspired by the layered-prompt idea in Chuck Lukacs's <i>Fantasy Genesis</i>.
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
