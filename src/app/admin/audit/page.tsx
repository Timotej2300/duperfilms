import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export default async function AuditAdmin() {
  await requireAdmin("audit.view");
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { user: { select: { email: true } } } });
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Audit logy</h1>
      {logs.length === 0 ? <p className="text-white/50">Zatiaľ žiadne záznamy.</p> : (
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="text-white/50"><tr><th className="py-2">Čas</th><th>Používateľ</th><th>Akcia</th><th>Entita</th><th>IP</th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id} className="border-t border-white/10">
              <td className="py-2">{l.createdAt.toLocaleString("sk-SK")}</td><td>{l.user?.email ?? "—"}</td>
              <td>{l.action}</td><td>{l.entity ? `${l.entity}:${l.entityId ?? ""}` : "—"}</td><td>{l.ip ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
