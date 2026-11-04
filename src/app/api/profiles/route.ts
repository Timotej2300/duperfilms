import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth } from "@/lib/guard";
import { getUserPlan } from "@/lib/entitlements";
import { hashPassword } from "@/lib/password";

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  avatar: z.string().regex(/^avatar-\d{1,2}$/).default("avatar-1"),
  isKids: z.boolean().default(false),
  pin: z.string().regex(/^\d{4}$/).nullish(),
});

export async function POST(req: Request) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje profilu" }, { status: 400 });

  const [plan, count] = await Promise.all([
    getUserPlan(auth.user.id),
    db.profile.count({ where: { userId: auth.user.id } }),
  ]);
  if (count >= plan.maxProfiles)
    return NextResponse.json({ error: `Tvoj plán dovoľuje max. ${plan.maxProfiles} profilov` }, { status: 403 });

  const { name, avatar, isKids, pin } = parsed.data;
  const profile = await db.profile.create({
    data: {
      userId: auth.user.id,
      name,
      avatar,
      isKids,
      maxAge: isKids ? 12 : null,
      pinHash: pin ? await hashPassword(pin) : null,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: profile.id }, { status: 201 });
}
