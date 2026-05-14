export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-20 animate-pulse rounded-md bg-white/10" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-md bg-white/10" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-md bg-white/10" />
      </div>
    </div>
  );
}
