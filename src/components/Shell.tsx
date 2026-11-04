import { Logo } from "./Logo";

/** Jednoduchá centrovaná karta (prihlasovacie / informačné stránky). */
export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8"><Logo size="md" /></div>
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-ink-900/80 p-8 backdrop-blur">
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
