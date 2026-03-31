export default function Loading() {
  return (
    <div>
      <section className="container container-hero pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="h-10 md:h-14 w-3/4 bg-white/10 rounded-lg animate-pulse" />
            <div className="mt-4 h-4 w-full bg-white/5 rounded animate-pulse" />
            <div className="mt-2 h-4 w-5/6 bg-white/5 rounded animate-pulse" />
            <div className="mt-6 flex items-center gap-4">
              <div className="h-10 w-32 bg-white/10 rounded-full animate-pulse" />
              <div className="h-10 w-32 bg-white/5 rounded-full animate-pulse" />
            </div>
          </div>
          <div>
            <div className="aspect-[4/3] bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      </section>
      <section className="container py-12 md:py-16">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-48 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface)] rounded-xl p-3 ring-1 ring-white/5 animate-pulse">
              <div className="aspect-[4/3] rounded-lg bg-white/5" />
              <div className="mt-3 h-3 w-1/2 bg-white/5 rounded" />
              <div className="mt-2 h-4 w-3/4 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
