import Link from "next/link";
import type { Card } from "@/lib/catalog";

export function TitleCard({ t }: { t: Card }) {
  return (
    <Link
      href={`/title/${t.slug}`}
      className="group relative block w-40 shrink-0 overflow-hidden rounded-lg bg-ink-800 transition duration-300 hover:z-10 hover:scale-105 hover:ring-2 hover:ring-white/60 sm:w-52"
    >
      <div className="aspect-[2/3]">
        {t.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.posterUrl} alt={t.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-sm text-white/60">{t.name}</div>
        )}
      </div>
      <div className="absolute left-2 top-2 flex gap-1 text-[10px] font-bold uppercase">
        {t.isPremium && <span className="rounded bg-accent-gold px-1.5 py-0.5 text-black">Premium</span>}
        {t.isNew && <span className="rounded bg-accent px-1.5 py-0.5">Nové</span>}
      </div>
    </Link>
  );
}
