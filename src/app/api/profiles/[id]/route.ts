import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth } from "@/lib/guard";
import { hashPassword } from "@/lib/password";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  avatar: z.string().regex(/^avatar-\d{1,2}$/).optional(),
  isKids: z.boolean().optional(),
  pin: z.string().regex(/^\d{4}$/).nullable().optional(), // null = zrušiť PIN
});

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;
  const { id } = await params;

  const owned = await db.profile.findFirst({ where: { id, userId: auth.user.id }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Profil neexistuje" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });
  const { pin, isKids, ...rest } = parsed.data;

  await db.profile.update({
    where: { id },
    data: {
      ...rest,
      ...(isKids !== undefined && { isKids, maxAge: isKids ? 12 : null }),
      ...(pin !== undefined && { pinHash: pin ? await hashPassword(pin) : null }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;
  const { id } = await params;

  const profiles = await db.profile.findMany({ where: { userId: auth.user.id }, select: { id: true } });
  if (!profiles.some((p) => p.id === id)) return NextResponse.json({ error: "Profil neexistuje" }, { status: 404 });
  if (profiles.length <= 1)
    return NextResponse.json({ error: "Posledný profil nemožno vymazať" }, { status: 400 });

  await db.profile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
