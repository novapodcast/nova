export default function Loading() {
  return (
    <section className="container py-12 md:py-16">
      <div className="h-8 w-40 bg-white/10 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[var(--surface)] rounded-xl p-6 ring-1 ring-white/5 animate-pulse">
            <div className="h-6 w-1/2 bg-white/10 rounded mb-4" />
            <div className="h-10 w-24 bg-white/10 rounded mb-6" />
            <div className="space-y-2">
              <div className="h-3 w-5/6 bg-white/5 rounded" />
              <div className="h-3 w-3/4 bg-white/5 rounded" />
              <div className="h-3 w-2/3 bg-white/5 rounded" />
            </div>
            <div className="mt-6 h-10 w-full bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}
