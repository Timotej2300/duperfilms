import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit, resetRateLimit, clientIp } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";
import { sameOrigin } from "@/lib/csrf";
import { createSession } from "@/lib/session";

// Skutočný hash náhodného hesla – vyrovnáva čas odpovede, keď e-mail neexistuje
let dummyHash: Promise<string> | undefined;
const getDummy = () => (dummyHash ??= hashPassword(crypto.randomUUID()));

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Neplatný pôvod požiadavky" }, { status: 403 });

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });

  const { email, password } = parsed.data;
  const ip = clientIp(req);
  const keyIp = `login:ip:${ip}`;
  const keyEmail = `login:email:${email}`;

  const allowed = (await rateLimit(keyIp, 20, 900, 900)) && (await rateLimit(keyEmail, 8, 900, 900));
  if (!allowed)
    return NextResponse.json({ error: "Príliš veľa pokusov, skús to o chvíľu" }, { status: 429 });

  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(user?.passwordHash ?? (await getDummy()), password);

  if (!user || !ok || user.isBlocked) {
    await db.auditLog.create({ data: { userId: user?.id, action: "auth.login_failed", ip } });
    return NextResponse.json({ error: "Nesprávny e-mail alebo heslo" }, { status: 401 });
  }

  await resetRateLimit(keyEmail);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await db.auditLog.create({ data: { userId: user.id, action: "auth.login", ip } });
  await createSession(user.id, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
  return NextResponse.json({ ok: true });
}
