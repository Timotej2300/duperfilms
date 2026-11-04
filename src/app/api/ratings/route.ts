import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth, getActiveProfile } from "@/lib/guard";

const schema = z.object({ titleId: z.string().min(1), value: z.number().int().min(1).max(5) });

export async function PUT(req: Request) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;
  const profile = await getActiveProfile(auth.user.id);
  if (!profile) return NextResponse.json({ error: "Vyber profil" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });
  const { titleId, value } = parsed.data;

  const exists = await db.title.findUnique({ where: { id: titleId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Titul neexistuje" }, { status: 404 });

  await db.rating.upsert({
    where: { profileId_titleId: { profileId: profile.id, titleId } },
    update: { value },
    create: { profileId: profile.id, titleId, value },
  });
  const agg = await db.rating.aggregate({ where: { titleId }, _avg: { value: true } });
  await db.title.update({ where: { id: titleId }, data: { ratingAvg: agg._avg.value ?? 0 } });
  return NextResponse.json({ ok: true });
}
