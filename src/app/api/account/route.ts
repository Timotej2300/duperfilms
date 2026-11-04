import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth } from "@/lib/guard";
import { verifyPassword, hashPassword } from "@/lib/password";
import { passwordSchema, emailSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { mail } from "@/lib/email";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("password"), current: z.string().max(128), next: passwordSchema }),
  z.object({ action: z.literal("email"), current: z.string().max(128), email: emailSchema }),
  z.object({ action: z.literal("resend") }),
  z.object({ action: z.literal("intro"), enabled: z.boolean() }),
]);

export async function POST(req: Request) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;
  if (!(await rateLimit(`account:${auth.user.id}`, 10, 900)))
    return NextResponse.json({ error: "Príliš veľa pokusov" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neplatné údaje" }, { status: 400 });
  const d = parsed.data;
  const user = auth.user;

  if (d.action === "intro") {
    await db.user.update({ where: { id: user.id }, data: { introEnabled: d.enabled } });
    return NextResponse.json({ ok: true });
  }
  if (d.action === "resend") {
    if (user.emailVerifiedAt) return NextResponse.json({ error: "E-mail je už overený" }, { status: 400 });
    const sent = await mail.verify(user.email, await issueToken(user.id, "VERIFY_EMAIL"));
    return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "E-maily zatiaľ nie sú nakonfigurované" }, { status: 503 });
  }

  // Citlivé zmeny vyžadujú aktuálne heslo
  if (!(await verifyPassword(user.passwordHash, d.current)))
    return NextResponse.json({ error: "Nesprávne aktuálne heslo" }, { status: 400 });

  if (d.action === "password") {
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(d.next) } });
    await db.auditLog.create({ data: { userId: user.id, action: "auth.password_change" } });
    return NextResponse.json({ ok: true });
  }

  const taken = await db.user.findUnique({ where: { email: d.email }, select: { id: true } });
  if (taken) return NextResponse.json({ error: "Tento e-mail už niekto používa" }, { status: 409 });
  const sent = await mail.changeEmail(d.email, await issueToken(user.id, "CHANGE_EMAIL", d.email));
  return sent
    ? NextResponse.json({ ok: true, message: "Poslali sme potvrdzovací odkaz na nový e-mail." })
    : NextResponse.json({ error: "E-maily zatiaľ nie sú nakonfigurované" }, { status: 503 });
}
