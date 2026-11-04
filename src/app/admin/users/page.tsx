import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { UserActions } from "@/components/admin/UserActions";

export default async function UsersAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { perms, isOwner } = await requireAdmin("users.view");
  const query = q?.trim().slice(0, 100);

  const [users, roles] = await Promise.all([
    db.user.findMany({
      where: query ? { email: { contains: query } } : {},
      orderBy: { createdAt: "desc" }, take: 100,
      include: { role: true, subscriptions: { where: { status: "ACTIVE" }, include: { plan: true }, take: 1 }, _count: { select: { profiles: true } } },
    }),
    db.role.findMany({ orderBy: { id: "asc" } }),
  ]);

  return (
    <>
      <h1 className="mb-4 text-3xl font-black">Používatelia</h1>
      <form className="mb-6 flex gap-2">
        <input name="q" defaultValue={query} placeholder="Hľadať podľa e-mailu…" className="w-72 rounded-lg border border-white/10 bg-ink-800 px-3 py-2" />
        <button className="rounded-lg bg-white/10 px-4 hover:bg-white/20">Hľadať</button>
      </form>
      {users.length === 0 ? <p className="text-white/50">Žiadni používatelia.</p> : (
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-white/50"><tr><th className="py-2">E-mail</th><th>Rola</th><th>Predplatné</th><th>Profily</th><th>Registrácia</th><th>Posl. prihlásenie</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="py-2">{u.email}{u.isBlocked && <span className="ml-2 rounded bg-accent px-1.5 text-xs">BLOK</span>}</td>
                <td>{u.role.name}</td>
                <td>{u.subscriptions[0]?.plan.name ?? "Free"}</td>
                <td>{u._count.profiles}</td>
                <td>{u.createdAt.toLocaleDateString("sk-SK")}</td>
                <td>{u.lastLoginAt?.toLocaleDateString("sk-SK") ?? "—"}</td>
                <td>
                  {(isOwner || u.role.key !== "OWNER") && (isOwner || perms.has("users.ban")) ? (
                    <UserActions id={u.id} blocked={u.isBlocked} roleKey={u.role.key}
                      roles={roles.filter((r) => isOwner || (r.key !== "OWNER" && r.key !== "SUPER_ADMIN")).map((r) => ({ key: r.key, name: r.name }))}
                      canRoles={isOwner || perms.has("users.roles")} />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
