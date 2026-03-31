export default function Loading() {
  return (
    <section className="container py-12 md:py-16">
      <div className="h-8 w-40 bg-white/10 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[var(--surface)] rounded-xl p-4 ring-1 ring-white/5 animate-pulse">
            <div className="aspect-[4/3] rounded-lg bg-white/5" />
            <div className="mt-3 h-3 w-2/3 bg-white/5 rounded" />
            <div className="mt-2 h-3 w-1/2 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}
