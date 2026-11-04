import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export default async function PaymentsAdmin() {
  await requireAdmin("payments.view");
  const [payments, subs] = await Promise.all([
    db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { email: true } } } }),
    db.subscription.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { email: true } }, plan: true } }),
  ]);
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Platby a predplatné</h1>
      <h2 className="mb-2 text-xl font-bold">Aktívne predplatné ({subs.length})</h2>
      {subs.length === 0 ? <p className="mb-8 text-white/50">Zatiaľ žiadne.</p> : (
        <table className="mb-10 w-full text-left text-sm">
          <thead className="text-white/50"><tr><th className="py-2">Používateľ</th><th>Plán</th><th>Platné do</th></tr></thead>
          <tbody>{subs.map((s) => (
            <tr key={s.id} className="border-t border-white/10"><td className="py-2">{s.user.email}</td><td>{s.plan.name}</td><td>{s.currentPeriodEnd?.toLocaleDateString("sk-SK") ?? "—"}</td></tr>
          ))}</tbody>
        </table>
      )}
      <h2 className="mb-2 text-xl font-bold">Platby</h2>
      {payments.length === 0 ? <p className="text-white/50">Zatiaľ žiadne platby.</p> : (
        <table className="w-full text-left text-sm">
          <thead className="text-white/50"><tr><th className="py-2">Dátum</th><th>Používateľ</th><th>Suma</th><th>Stav</th></tr></thead>
          <tbody>{payments.map((p) => (
            <tr key={p.id} className="border-t border-white/10">
              <td className="py-2">{p.createdAt.toLocaleString("sk-SK")}</td><td>{p.user.email}</td>
              <td>{(p.amountCents / 100).toFixed(2)} {p.currency}</td><td>{p.status}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
