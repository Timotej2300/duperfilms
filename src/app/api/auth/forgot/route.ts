import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { mail } from "@/lib/email";
import { emailSchema } from "@/lib/validation";

const GENERIC = { ok: true, message: "Ak účet existuje, poslali sme naň e-mail s odkazom." };

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Neplatný pôvod požiadavky" }, { status: 403 });
  const parsed = z.object({ email: emailSchema }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatný e-mail" }, { status: 400 });

  const ip = clientIp(req);
  if (!(await rateLimit(`forgot:ip:${ip}`, 5, 3600)) || !(await rateLimit(`forgot:${parsed.data.email}`, 3, 3600)))
    return NextResponse.json({ error: "Príliš veľa pokusov, skús neskôr" }, { status: 429 });

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user && !user.isBlocked) {
    const token = await issueToken(user.id, "RESET_PASSWORD");
    await mail.reset(user.email, token);
  }
  return NextResponse.json(GENERIC); // rovnaká odpoved vždy – žiadne zisťovanie existencie účtov
}
