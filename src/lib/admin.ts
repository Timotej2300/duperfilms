import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "./db";
import { getSession } from "./session";
import { sameOrigin } from "./csrf";
import { clientIp } from "./rate-limit";

export async function getPermissions(roleId: number): Promise<Set<string>> {
  const rows = await db.rolePermission.findMany({ where: { roleId }, include: { permission: true } });
  return new Set(rows.map((r) => r.permission.key));
}

/** Stránka v /admin: iba zamestnanci s daným oprávnením (kontrola na serveri). */
export async function requireAdmin(perm: string) {
  const s = await getSession();
  if (!s || !s.user.role.isStaff) redirect("/login");
  const perms = await getPermissions(s.user.roleId);
  const isOwner = s.user.role.key === "OWNER";
  if (!isOwner && !perms.has(perm)) redirect("/admin?denied=1");
  return { user: s.user, perms, isOwner };
}

/** API v /api/admin: CSRF + prihlásenie + oprávnenie. */
export async function adminApi(req: Request, perm: string) {
  if (req.method !== "GET" && !sameOrigin(req))
    return { error: NextResponse.json({ error: "Neplatný pôvod požiadavky" }, { status: 403 }) } as const;
  const s = await getSession();
  if (!s || !s.user.role.isStaff)
    return { error: NextResponse.json({ error: "Zakázané" }, { status: 403 }) } as const;
  if (s.user.role.key !== "OWNER") {
    const perms = await getPermissions(s.user.roleId);
    if (!perms.has(perm)) return { error: NextResponse.json({ error: "Nedostatočné oprávnenie" }, { status: 403 }) } as const;
  }
  return { user: s.user, ip: clientIp(req) } as const;
}

export function audit(userId: string, ip: string, action: string, entity?: string, entityId?: string, meta?: unknown) {
  return db.auditLog.create({
    data: { userId, ip, action, entity, entityId, meta: meta ? JSON.stringify(meta).slice(0, 4000) : undefined },
  });
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "titul";
