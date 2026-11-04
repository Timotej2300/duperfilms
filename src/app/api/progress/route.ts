import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth, getActiveProfile } from "@/lib/guard";

const schema = z.object({
  titleId: z.string().min(1),
  episodeId: z.string().min(1).nullish(),
  positionSec: z.number().int().min(0).max(60 * 60 * 24),
  durationSec: z.number().int().min(0).max(60 * 60 * 24),
  start: z.boolean().optional(), // prvé spustenie → zvýši počet zhliadnutí
});

export async function POST(req: Request) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;
  const profile = await getActiveProfile(auth.user.id);
  if (!profile) return NextResponse.json({ error: "Vyber profil" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });
  const { titleId, episodeId, positionSec, durationSec, start } = parsed.data;

  const finished = durationSec > 0 && positionSec / durationSec > 0.95;
  const existing = await db.watchHistory.findFirst({ where: { profileId: profile.id, titleId, episodeId: episodeId ?? null } });

  if (existing) {
    await db.watchHistory.update({ where: { id: existing.id }, data: { positionSec, durationSec, finished } });
  } else {
    await db.watchHistory.create({
      data: { profileId: profile.id, titleId, episodeId: episodeId ?? null, positionSec, durationSec, finished },
    });
  }
  if (start) await db.title.update({ where: { id: titleId }, data: { viewCount: { increment: 1 } } });
  return NextResponse.json({ ok: true });
}
