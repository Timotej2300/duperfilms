import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth } from "@/lib/guard";

const schema = z.object({ adId: z.string().min(1), type: z.enum(["view", "click"]) });

export async function POST(req: Request) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });

  await db.advertisement.updateMany({
    where: { id: parsed.data.adId },
    data: parsed.data.type === "view" ? { views: { increment: 1 } } : { clicks: { increment: 1 } },
  });
  return NextResponse.json({ ok: true });
}
