import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminApi, audit } from "@/lib/admin";

const schema = z.object({ isBlocked: z.boolean().optional(), roleKey: z.string().max(30).optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });
  const { isBlocked, roleKey } = parsed.data;

  const a = await adminApi(req, roleKey ? "users.roles" : "users.ban");
  if (a.error) return a.error;

  const target = await db.user.findUnique({ where: { id }, include: { role: true } });
  if (!target) return NextResponse.json({ error: "Používateľ neexistuje" }, { status: 404 });

  const actorIsOwner = a.user.role.key === "OWNER";
  if (target.id === a.user.id) return NextResponse.json({ error: "Nemôžeš meniť vlastný účet" }, { status: 400 });
  if (target.role.key === "OWNER" && !actorIsOwner) return NextResponse.json({ error: "Owner je chránený" }, { status: 403 });

  const data: { isBlocked?: boolean; roleId?: number } = {};
  if (isBlocked !== undefined) data.isBlocked = isBlocked;
  if (roleKey) {
    if ((roleKey === "OWNER" || roleKey === "SUPER_ADMIN") && !actorIsOwner)
      return NextResponse.json({ error: "Túto rolu môže prideliť iba Owner" }, { status: 403 });
    const role = await db.role.findUnique({ where: { key: roleKey } });
    if (!role) return NextResponse.json({ error: "Rola neexistuje" }, { status: 400 });
    data.roleId = role.id;
  }

  await db.user.update({ where: { id }, data });
  if (isBlocked) await db.session.deleteMany({ where: { userId: id } }); // okamžité odhlásenie
  await audit(a.user.id, a.ip, "users.update", "user", id, data);
  return NextResponse.json({ ok: true });
}
