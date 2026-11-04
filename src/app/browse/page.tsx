import Link from "next/link";
import { requireProfile } from "@/lib/guard";
import { buildHome } from "@/lib/catalog";
import { NavBar } from "@/components/NavBar";
import { TitleCard } from "@/components/TitleCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Domov" };

export default async function BrowsePage() {
  const { profile } = await requireProfile();
  const { hero, rows } = await buildHome(profile);

  return (
    <>
      <NavBar profileName={profile.name} />
      <main className="pb-20">
        {hero ? (
          <section className="relative flex min-h-[70vh] items-end">
            {hero.backdropUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 to-transparent" />
            <div className="relative max-w-2xl px-5 pb-16 sm:px-10">
              <h1 className="text-4xl font-black sm:text-6xl">{hero.name}</h1>
              <p className="mt-4 line-clamp-3 text-white/80">{hero.description}</p>
              <div className="mt-6 flex gap-3">
                <Link href={`/watch/${hero.slug}`} className="rounded-lg bg-white px-8 py-3 font-bold text-black hover:bg-white/80">▶ Prehrať</Link>
                <Link href={`/title/${hero.slug}`} className="rounded-lg bg-white/20 px-8 py-3 font-semibold backdrop-blur hover:bg-white/30">Viac informácií</Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="pt-32" />
        )}

        {rows.length === 0 && !hero && (
          <div className="mx-auto max-w-md px-6 py-24 text-center text-white/60">
            <p className="text-xl font-semibold text-white">Zatiaľ tu nie je žiadny obsah</p>
            <p className="mt-2">Pridaj prvý film v administrácii a objaví sa tu.</p>
          </div>
        )}

        <div className="space-y-8 px-4 sm:px-10">
          {rows.map((r) => (
            <section key={r.key}>
              <h2 className="mb-3 text-lg font-bold sm:text-xl">{r.title}</h2>
              <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none]">
                {r.items.map((t) => <TitleCard key={t.id} t={t} />)}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
