import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireProfile } from "@/lib/guard";
import { visibleWhere } from "@/lib/catalog";
import { getUserPlan } from "@/lib/entitlements";
import { Player, type AdInfo } from "@/components/Player";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { slug } = await params;
  const { e } = await searchParams;
  const { user, profile } = await requireProfile();

  const title = await db.title.findFirst({
    where: { AND: [{ slug }, visibleWhere(profile.maxAge)] },
    include: { seasons: { orderBy: { number: "asc" }, include: { episodes: { orderBy: { number: "asc" } } } } },
  });
  if (!title) notFound();

  const plan = await getUserPlan(user.id);
  // Kontrola Premium obsahu výhradne na serveri – streamUrl sa bez oprávnenia vôbec neodošle klientovi.
  if (title.isPremium && !plan.premiumAccess) redirect("/plans");

  const flat = title.seasons.flatMap((s) => s.episodes.map((ep) => ({ ...ep, seasonNumber: s.number })));
  let src = title.streamUrl;
  let heading = title.name;
  let episodeId: string | null = null;
  let next: { id: string; name: string } | null = null;
  let intro: { start: number; end: number } | null = null;
  let creditsAt: number | null = null;

  if (title.type === "SERIES") {
    const idx = e ? flat.findIndex((x) => x.id === e) : 0;
    const ep = flat[idx];
    if (!ep) notFound();
    src = ep.streamUrl;
    episodeId = ep.id;
    heading = `${title.name} – S${ep.seasonNumber}E${ep.number}: ${ep.name}`;
    const n = flat[idx + 1];
    next = n ? { id: n.id, name: n.name } : null;
    if (ep.introStart != null && ep.introEnd != null) intro = { start: ep.introStart, end: ep.introEnd };
    creditsAt = ep.creditsAt;
  }
  if (!src) notFound();

  const history = await db.watchHistory.findFirst({
    where: { profileId: profile.id, titleId: title.id, episodeId },
  });

  // Reklamy len ak ich plán obsahuje a kampaň je aktívna a v limite
  let ads: AdInfo[] = [];
  if (plan.adsEnabled) {
    const now = new Date();
    const found = await db.advertisement.findMany({
      where: {
        isActive: true,
        placement: { in: ["PRE_ROLL", "MID_ROLL", "POST_ROLL"] },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          { OR: [{ titleId: null }, { titleId: title.id }] },
        ],
      },
      take: 10,
    });
    ads = found
      .filter((a) => a.maxViews == null || a.views < a.maxViews)
      .map((a) => ({
        id: a.id, mediaType: a.mediaType === "video" ? "video" : "image",
        mediaUrl: a.mediaUrl, targetUrl: a.targetUrl, placement: a.placement as AdInfo["placement"],
      }));
  }

  return (
    <Player
      key={episodeId ?? title.id}
      src={src}
      heading={heading}
      slug={title.slug}
      titleId={title.id}
      episodeId={episodeId}
      startAt={history && !history.finished ? history.positionSec : 0}
      next={next}
      intro={intro}
      creditsAt={creditsAt}
      ads={ads}
      maxQuality={plan.maxQuality}
    />
  );
}
