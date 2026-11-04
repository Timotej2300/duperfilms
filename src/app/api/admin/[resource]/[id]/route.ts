import { NextResponse } from "next/server";
import { adminApi, audit } from "@/lib/admin";
import { resources } from "@/lib/admin-resources";

type Ctx = { params: Promise<{ resource: string; id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { resource, id } = await params;
  const r = resources[resource];
  if (!r) return NextResponse.json({ error: "Neznámy zdroj" }, { status: 404 });
  const a = await adminApi(req, r.perm);
  if (a.error) return a.error;

  const parsed = r.schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  try {
    await r.update(id, parsed.data);
    await audit(a.user.id, a.ip, `${resource}.update`, resource, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Uloženie zlyhalo" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { resource, id } = await params;
  const r = resources[resource];
  if (!r) return NextResponse.json({ error: "Neznámy zdroj" }, { status: 404 });
  const a = await adminApi(req, r.perm);
  if (a.error) return a.error;
  try {
    await r.remove(id);
    await audit(a.user.id, a.ip, `${resource}.delete`, resource, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Odstránenie zlyhalo" }, { status: 400 });
  }
}
