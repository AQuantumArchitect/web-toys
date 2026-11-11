import { pages, REPO_URL, HOME_URL } from './pages.js';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold tracking-tight">Toys</h1>
        <p className="mt-2 text-stone-600">Small web toys. No accounts, no tracking.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {pages.map((p) => (
            <li key={p.slug}>
              <a
                href={p.path}
                className="block h-full rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
              >
                <img
                  src={p.shot}
                  alt={`Screenshot of ${p.name}`}
                  width="1000"
                  height="625"
                  className="mb-3 w-full h-auto rounded-lg border border-stone-200"
                />
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-stone-600">{p.pitch}</p>
              </a>
            </li>
          ))}
        </ul>
      </main>
      <footer className="px-4 py-6 text-center text-sm text-stone-500">
        <a className="underline" href={HOME_URL}>lukespooner.com</a>
        {' · '}
        <a className="underline" href={REPO_URL}>source</a>
      </footer>
    </div>
  );
}
