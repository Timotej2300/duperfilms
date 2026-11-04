import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminApi, audit } from "@/lib/admin";
import { ALLOWED } from "@/lib/settings";

const schema = z.record(z.string(), z.string().max(50000));

export async function PUT(req: Request) {
  const a = await adminApi(req, "settings.write");
  if (a.error) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });

  const entries = Object.entries(parsed.data).filter(([k]) => ALLOWED.has(k)); // whitelist kľúčov
  for (const [key, value] of entries)
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  await audit(a.user.id, a.ip, "settings.update", "setting", undefined, { keys: entries.map(([k]) => k) });
  return NextResponse.json({ ok: true });
}
