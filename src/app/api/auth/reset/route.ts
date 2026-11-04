import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { consumeToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/password";
import { passwordSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Neplatný pôvod požiadavky" }, { status: 403 });
  const ip = clientIp(req);
  if (!(await rateLimit(`reset:${ip}`, 10, 900)))
    return NextResponse.json({ error: "Príliš veľa pokusov" }, { status: 429 });

  const parsed = z.object({ token: z.string().min(10).max(200), password: passwordSchema }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neplatné údaje" }, { status: 400 });

  const row = await consumeToken(parsed.data.token, ["RESET_PASSWORD"]);
  if (!row) return NextResponse.json({ error: "Odkaz je neplatný alebo expiroval" }, { status: 400 });

  await db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await db.session.deleteMany({ where: { userId: row.userId } }); // odhlási všade
  await db.auditLog.create({ data: { userId: row.userId, action: "auth.password_reset", ip } });
  return NextResponse.json({ ok: true });
}
