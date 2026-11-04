import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";
import { sameOrigin } from "@/lib/csrf";
import { createSession } from "@/lib/session";
import { issueToken } from "@/lib/tokens";
import { mail } from "@/lib/email";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Neplatný pôvod požiadavky" }, { status: 403 });

  const ip = clientIp(req);
  if (!(await rateLimit(`register:${ip}`, 5, 3600)))
    return NextResponse.json({ error: "Príliš veľa pokusov, skús neskôr" }, { status: 429 });

  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neplatné údaje" }, { status: 400 });

  const setting = await db.setting.findUnique({ where: { key: "site.registrationOpen" } });
  if (setting?.value === "false")
    return NextResponse.json({ error: "Registrácia je dočasne vypnutá" }, { status: 403 });

  const { email, password } = parsed.data;
  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return NextResponse.json({ error: "Účet s týmto e-mailom už existuje" }, { status: 409 });

  const role = await db.role.findUniqueOrThrow({ where: { key: "USER" } });
  const user = await db.user.create({
    data: { email, passwordHash: await hashPassword(password), roleId: role.id },
  });
  await db.auditLog.create({ data: { userId: user.id, action: "auth.register", ip } });

  // E-maily nikdy neblokujú registráciu (ak nie sú nakonfigurované, používateľ môže overenie poslať znova v účte)
  await mail.verify(user.email, await issueToken(user.id, "VERIFY_EMAIL")).catch(() => false);

  await createSession(user.id, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
  return NextResponse.json({ ok: true }, { status: 201 });
}
