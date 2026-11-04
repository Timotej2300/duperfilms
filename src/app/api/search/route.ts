import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAuth, getActiveProfile } from "@/lib/guard";
import { cardSelect, visibleWhere } from "@/lib/catalog";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;
  if (!(await rateLimit(`search:${auth.user.id}`, 120, 60)))
    return NextResponse.json({ error: "Príliš veľa požiadaviek" }, { status: 429 });

  const profile = await getActiveProfile(auth.user.id);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const type = url.searchParams.get("type");
  const genre = url.searchParams.get("genre");
  const sort = url.searchParams.get("sort") ?? "relevance";
  if (q.length < 2 && !genre) return NextResponse.json({ items: [] });

  const items = await db.title.findMany({
    where: {
      AND: [
        visibleWhere(profile?.maxAge ?? null),
        type === "MOVIE" || type === "SERIES" ? { type } : {},
        genre ? { genres: { some: { genre: { slug: genre } } } } : {},
        q.length >= 2
          ? { OR: [{ name: { contains: q } }, { originalName: { contains: q } }, { director: { contains: q } }, { cast: { contains: q } },
              { genres: { some: { genre: { name: { contains: q } } } } }] }
          : {},
      ],
    },
    orderBy: sort === "new" ? { createdAt: "desc" } : sort === "rating" ? { ratingAvg: "desc" } : sort === "popular" ? { viewCount: "desc" } : { name: "asc" },
    take: 40,
    select: cardSelect,
  });
  return NextResponse.json({ items });
}
