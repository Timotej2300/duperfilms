import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth, getActiveProfile } from "@/lib/guard";

const schema = z.object({ titleId: z.string().min(1) });

async function handle(req: Request, add: boolean) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;
  const profile = await getActiveProfile(auth.user.id);
  if (!profile) return NextResponse.json({ error: "Vyber profil" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });
  const { titleId } = parsed.data;

  if (add) {
    const exists = await db.title.findUnique({ where: { id: titleId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Titul neexistuje" }, { status: 404 });
    await db.favorite.upsert({
      where: { profileId_titleId: { profileId: profile.id, titleId } },
      update: {},
      create: { profileId: profile.id, titleId },
    });
  } else {
    await db.favorite.deleteMany({ where: { profileId: profile.id, titleId } });
  }
  return NextResponse.json({ ok: true });
}

export const PUT = (req: Request) => handle(req, true);
export const DELETE = (req: Request) => handle(req, false);
