import { NextResponse } from "next/server";
import { adminApi, audit } from "@/lib/admin";
import { resources } from "@/lib/admin-resources";

type Ctx = { params: Promise<{ resource: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { resource } = await params;
  const r = resources[resource];
  if (!r) return NextResponse.json({ error: "Neznámy zdroj" }, { status: 404 });
  const a = await adminApi(req, r.perm);
  if (a.error) return a.error;
  return NextResponse.json({ items: await r.list() });
}

export async function POST(req: Request, { params }: Ctx) {
  const { resource } = await params;
  const r = resources[resource];
  if (!r) return NextResponse.json({ error: "Neznámy zdroj" }, { status: 404 });
  const a = await adminApi(req, r.perm);
  if (a.error) return a.error;

  const parsed = r.schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  try {
    const created = await r.create(parsed.data);
    await audit(a.user.id, a.ip, `${resource}.create`, resource, String(created.id));
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error && /Unique/.test(e.message) ? "Záznam s touto hodnotou už existuje" : "Uloženie zlyhalo" }, { status: 400 });
  }
}
