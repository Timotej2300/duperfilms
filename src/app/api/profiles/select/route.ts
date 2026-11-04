import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth, PROFILE_COOKIE } from "@/lib/guard";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ id: z.string().min(1), pin: z.string().regex(/^\d{4}$/).optional() });

export async function POST(req: Request) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });

  const profile = await db.profile.findFirst({ where: { id: parsed.data.id, userId: auth.user.id } });
  if (!profile) return NextResponse.json({ error: "Profil neexistuje" }, { status: 404 });

  if (profile.pinHash) {
    if (!(await rateLimit(`pin:${profile.id}`, 5, 600, 600)))
      return NextResponse.json({ error: "Príliš veľa pokusov, skús neskôr" }, { status: 429 });
    if (!parsed.data.pin || !(await verifyPassword(profile.pinHash, parsed.data.pin)))
      return NextResponse.json({ error: "Nesprávny PIN", pinRequired: true }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(PROFILE_COOKIE, profile.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}
