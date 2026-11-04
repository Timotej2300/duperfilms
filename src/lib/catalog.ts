import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { publishedWhere } from "./entitlements";

export const cardSelect = {
  id: true, slug: true, name: true, type: true, posterUrl: true, backdropUrl: true,
  year: true, ageRating: true, isPremium: true, isNew: true, isExclusive: true, ratingAvg: true,
  description: true, durationMin: true,
} satisfies Prisma.TitleSelect;

export type Card = Prisma.TitleGetPayload<{ select: typeof cardSelect }>;

/** Základný filter: publikované + vekový limit profilu. */
export function visibleWhere(maxAge: number | null): Prisma.TitleWhereInput {
  return { AND: [publishedWhere(), maxAge != null ? { ageRating: { lte: maxAge } } : {}] };
}

export type Row = { key: string; title: string; items: Card[] };

export async function buildHome(profile: { id: string; maxAge: number | null }) {
  const where = visibleWhere(profile.maxAge);
  const sections = await db.homeSection.findMany({
    where: { isVisible: true },
    orderBy: { position: "asc" },
    include: { items: { orderBy: { position: "asc" }, include: { title: { select: cardSelect } } } },
  });

  const manualRecs = await db.recommendation.findMany({ orderBy: { slot: "asc" } });

  const rows: Row[] = [];
  let hero: Card | null = null;

  for (const s of sections) {
    // ručne zvolené filmy majú prednosť (len tie, ktoré spĺňajú filter viditeľnosti)
    let items: Card[] = [];
    if (s.items.length) {
      const ids = s.items.map((i) => i.titleId);
      const allowed = await db.title.findMany({ where: { AND: [where, { id: { in: ids } }] }, select: cardSelect });
      items = ids.map((id) => allowed.find((a) => a.id === id)).filter((x): x is Card => !!x);
    }

    if (!items.length) {
      switch (s.key) {
        case "hero":
          items = await db.title.findMany({ where, orderBy: [{ isExclusive: "desc" }, { createdAt: "desc" }], take: 1, select: cardSelect });
          break;
        case "new":
          items = await db.title.findMany({ where, orderBy: { createdAt: "desc" }, take: 20, select: cardSelect });
          break;
        case "popular":
          items = await db.title.findMany({ where, orderBy: { viewCount: "desc" }, take: 20, select: cardSelect });
          break;
        case "top":
          items = await db.title.findMany({ where: { AND: [where, { ratingAvg: { gt: 0 } }] }, orderBy: { ratingAvg: "desc" }, take: 20, select: cardSelect });
          break;
        case "exclusive":
          items = await db.title.findMany({ where: { AND: [where, { isExclusive: true }] }, orderBy: { createdAt: "desc" }, take: 20, select: cardSelect });
          break;
        case "series":
          items = await db.title.findMany({ where: { AND: [where, { type: "SERIES" }] }, orderBy: { updatedAt: "desc" }, take: 20, select: cardSelect });
          break;
        case "continue": {
          const h = await db.watchHistory.findMany({
            where: { profileId: profile.id, finished: false, positionSec: { gt: 10 }, title: where },
            orderBy: { updatedAt: "desc" }, take: 20, include: { title: { select: cardSelect } },
          });
          const seen = new Set<string>();
          items = h.map((x) => x.title).filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
          break;
        }
        case "mylist": {
          const f = await db.favorite.findMany({
            where: { profileId: profile.id, title: where }, orderBy: { createdAt: "desc" }, take: 20,
            include: { title: { select: cardSelect } },
          });
          items = f.map((x) => x.title);
          break;
        }
        case "rec": {
          const ids = manualRecs.map((r) => r.titleId);
          if (ids.length) {
            const found = await db.title.findMany({ where: { AND: [where, { id: { in: ids } }] }, select: cardSelect });
            items = ids.map((id) => found.find((f) => f.id === id)).filter((x): x is Card => !!x);
          }
          items = [...items, ...(await personalized(profile, where, items.map((i) => i.id)))].slice(0, 20);
          break;
        }
      }
    }

    if (!items.length) continue; // prázdne sekcie sa nezobrazujú
    if (s.key === "hero") hero = items[0];
    else rows.push({ key: s.key, title: s.title, items });
  }

  return { hero, rows };
}

/** Automatické odporúčania: žánre z histórie a obľúbených + popularita + hodnotenie. */
export async function personalized(
  profile: { id: string },
  where: Prisma.TitleWhereInput,
  exclude: string[] = [],
) {
  const [hist, favs] = await Promise.all([
    db.watchHistory.findMany({ where: { profileId: profile.id }, select: { titleId: true }, take: 50, orderBy: { updatedAt: "desc" } }),
    db.favorite.findMany({ where: { profileId: profile.id }, select: { titleId: true } }),
  ]);
  const seenIds = [...new Set([...hist.map((h) => h.titleId), ...favs.map((f) => f.titleId)])];

  let genreIds: number[] = [];
  if (seenIds.length) {
    const tg = await db.titleGenre.groupBy({
      by: ["genreId"], where: { titleId: { in: seenIds } }, _count: { genreId: true },
      orderBy: { _count: { genreId: "desc" } }, take: 3,
    });
    genreIds = tg.map((g) => g.genreId);
  }

  return db.title.findMany({
    where: {
      AND: [
        where,
        { id: { notIn: [...exclude, ...seenIds] } },
        genreIds.length ? { genres: { some: { genreId: { in: genreIds } } } } : {},
      ],
    },
    orderBy: [{ ratingAvg: "desc" }, { viewCount: "desc" }],
    take: 20,
    select: cardSelect,
  });
}
