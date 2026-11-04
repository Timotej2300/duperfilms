import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { consumeToken } from "@/lib/tokens";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Neplatný pôvod požiadavky" }, { status: 403 });
  if (!(await rateLimit(`verify:${clientIp(req)}`, 15, 900)))
    return NextResponse.json({ error: "Príliš veľa pokusov" }, { status: 429 });

  const parsed = z.object({ token: z.string().min(10).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatný odkaz" }, { status: 400 });

  const row = await consumeToken(parsed.data.token, ["VERIFY_EMAIL", "CHANGE_EMAIL"]);
  if (!row) return NextResponse.json({ error: "Odkaz je neplatný alebo expiroval" }, { status: 400 });

  if (row.type === "VERIFY_EMAIL") {
    await db.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } });
  } else if (row.payload) {
    const taken = await db.user.findUnique({ where: { email: row.payload }, select: { id: true } });
    if (taken) return NextResponse.json({ error: "Tento e-mail už niekto používa" }, { status: 409 });
    await db.user.update({ where: { id: row.userId }, data: { email: row.payload, emailVerifiedAt: new Date() } });
  }
  await db.auditLog.create({ data: { userId: row.userId, action: `auth.${row.type.toLowerCase()}` } });
  return NextResponse.json({ ok: true });
}
