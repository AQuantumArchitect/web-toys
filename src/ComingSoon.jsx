export default function ComingSoon({ name, blurb }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center bg-stone-50 text-stone-900">
      <h1 className="text-3xl font-bold">{name}</h1>
      <p className="text-stone-600 max-w-sm">{blurb}</p>
      <p className="text-lg">Coming soon.</p>
      <a href="/" className="underline text-stone-700">← Back to Toys</a>
    </main>
  );
}
