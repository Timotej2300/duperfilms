import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminApi, audit } from "@/lib/admin";

const schema = z.object({
  sections: z.array(z.object({
    id: z.number().int(),
    title: z.string().trim().min(1).max(80),
    position: z.number().int().min(0).max(1000),
    isVisible: z.boolean(),
    titleIds: z.array(z.string()).max(60),
  })).max(50),
  recs: z.array(z.string().nullable()).length(3),
});

export async function PUT(req: Request) {
  const a = await adminApi(req, "home.write");
  if (a.error) return a.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });

  const existing = new Set((await db.title.findMany({ select: { id: true } })).map((t) => t.id));

  for (const s of parsed.data.sections) {
    await db.homeSection.update({ where: { id: s.id }, data: { title: s.title, position: s.position, isVisible: s.isVisible } });
    await db.homeSectionItem.deleteMany({ where: { sectionId: s.id } });
    const ids = s.titleIds.filter((t) => existing.has(t));
    if (ids.length) await db.homeSectionItem.createMany({ data: ids.map((titleId, i) => ({ sectionId: s.id, titleId, position: i })) });
  }

  await db.recommendation.deleteMany({});
  const recs = parsed.data.recs
    .map((titleId, i) => ({ slot: i + 1, titleId }))
    .filter((r): r is { slot: number; titleId: string } => !!r.titleId && existing.has(r.titleId));
  if (recs.length) await db.recommendation.createMany({ data: recs });

  await audit(a.user.id, a.ip, "home.update", "home");
  return NextResponse.json({ ok: true });
}
