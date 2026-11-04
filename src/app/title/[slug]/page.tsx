import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireProfile } from "@/lib/guard";
import { visibleWhere } from "@/lib/catalog";
import { getUserPlan } from "@/lib/entitlements";
import { NavBar } from "@/components/NavBar";
import { TitleActions } from "@/components/TitleActions";

export const dynamic = "force-dynamic";

export default async function TitlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, profile } = await requireProfile();

  const title = await db.title.findFirst({
    where: { AND: [{ slug }, visibleWhere(profile.maxAge)] },
    include: {
      genres: { include: { genre: true } },
      seasons: { orderBy: { number: "asc" }, include: { episodes: { orderBy: { number: "asc" } } } },
    },
  });
  if (!title) notFound();

  const [plan, fav, rating] = await Promise.all([
    getUserPlan(user.id),
    db.favorite.findUnique({ where: { profileId_titleId: { profileId: profile.id, titleId: title.id } } }),
    db.rating.findUnique({ where: { profileId_titleId: { profileId: profile.id, titleId: title.id } } }),
  ]);
  const locked = title.isPremium && !plan.premiumAccess;

  return (
    <>
      <NavBar profileName={profile.name} />
      <main className="pb-20">
        <section className="relative flex min-h-[60vh] items-end">
          {title.backdropUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={title.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
          <div className="relative max-w-3xl px-5 pb-10 sm:px-10">
            <h1 className="text-4xl font-black sm:text-6xl">{title.name}</h1>
            {title.originalName && title.originalName !== title.name && (
              <p className="text-white/50">{title.originalName}</p>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/70">
              {title.year && <span>{title.year}</span>}
              <span className="rounded border border-white/40 px-1.5">{title.ageRating}+</span>
              {title.durationMin && <span>{title.durationMin} min</span>}
              {title.quality && <span>{title.quality}</span>}
              {title.ratingAvg > 0 && <span>★ {title.ratingAvg.toFixed(1)}</span>}
              {title.isPremium && <span className="rounded bg-accent-gold px-1.5 text-xs font-bold text-black">PREMIUM</span>}
            </p>
            <p className="mt-4 text-white/85">{title.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {locked ? (
                <Link href="/plans" className="rounded-lg bg-accent-gold px-8 py-3 font-bold text-black">Odomknúť Premium</Link>
              ) : (
                <Link href={`/watch/${title.slug}`} className="rounded-lg bg-white px-8 py-3 font-bold text-black hover:bg-white/80">▶ Prehrať</Link>
              )}
              <TitleActions titleId={title.id} initialFav={!!fav} initialRating={rating?.value ?? 0} />
            </div>
          </div>
        </section>

        <div className="grid gap-10 px-5 pt-8 sm:px-10 lg:grid-cols-[2fr_1fr]">
          <div>
            {title.type === "SERIES" && title.seasons.map((s) => (
              <div key={s.id} className="mb-8">
                <h2 className="mb-3 text-xl font-bold">{s.name ?? `Séria ${s.number}`}</h2>
                <ul className="space-y-2">
                  {s.episodes.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={locked ? "/plans" : `/watch/${title.slug}?e=${e.id}`}
                        className="flex gap-4 rounded-lg bg-ink-800 p-3 hover:bg-ink-700"
                      >
                        <span className="w-8 text-center text-2xl font-bold text-white/40">{e.number}</span>
                        <span>
                          <span className="font-semibold">{e.name}</span>
                          {e.durationMin && <span className="ml-2 text-sm text-white/50">{e.durationMin} min</span>}
                          {e.description && <span className="mt-1 block text-sm text-white/60">{e.description}</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {s.episodes.length === 0 && <li className="text-white/50">Zatiaľ žiadne epizódy.</li>}
                </ul>
              </div>
            ))}
          </div>
          <dl className="space-y-2 text-sm text-white/70">
            {title.director && <div><dt className="inline text-white/40">Réžia: </dt><dd className="inline">{title.director}</dd></div>}
            {title.cast && <div><dt className="inline text-white/40">Hrajú: </dt><dd className="inline">{title.cast}</dd></div>}
            {title.genres.length > 0 && <div><dt className="inline text-white/40">Žánre: </dt><dd className="inline">{title.genres.map((g) => g.genre.name).join(", ")}</dd></div>}
            {title.language && <div><dt className="inline text-white/40">Jazyk: </dt><dd className="inline">{title.language}</dd></div>}
            {title.subtitles && <div><dt className="inline text-white/40">Titulky: </dt><dd className="inline">{title.subtitles}</dd></div>}
          </dl>
        </div>
      </main>
    </>
  );
}
