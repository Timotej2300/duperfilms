import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  await requireAdmin("dashboard.view");

  const now = new Date();
  const since = new Date(Date.now() - 30 * 86400_000);
  const [users, active, movies, series, views, premium, revenue, campaigns, daily] = await Promise.all([
    db.user.count(),
    db.session.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }).then((r) => r.length),
    db.title.count({ where: { type: "MOVIE" } }),
    db.title.count({ where: { type: "SERIES" } }),
    db.title.aggregate({ _sum: { viewCount: true } }),
    db.subscription.count({ where: { status: "ACTIVE", plan: { priceCents: { gt: 0 } } } }),
    db.payment.aggregate({ where: { status: "paid" }, _sum: { amountCents: true } }),
    db.advertisement.count({
      where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
    }),
    db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  // Registrácie za posledných 14 dní
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400_000);
    return { key: d.toISOString().slice(0, 10), label: `${d.getDate()}.${d.getMonth() + 1}.`, n: 0 };
  });
  for (const u of daily) {
    const d = days.find((x) => x.key === u.createdAt.toISOString().slice(0, 10));
    if (d) d.n++;
  }
  const max = Math.max(1, ...days.map((d) => d.n));

  const cards = [
    ["Používatelia", users], ["Aktívni (30 dní)", active], ["Filmy", movies], ["Seriály", series],
    ["Prehratia", views._sum.viewCount ?? 0], ["Premium predplatitelia", premium],
    ["Príjmy", `${((revenue._sum.amountCents ?? 0) / 100).toFixed(2)} €`], ["Aktívne kampane", campaigns],
  ];

  return (
    <>
      <h1 className="text-3xl font-black">Dashboard</h1>
      {denied && <p className="mt-3 rounded bg-accent/20 p-3 text-sm">Na túto sekciu nemáš oprávnenie.</p>}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-white/10 bg-ink-900 p-4">
            <p className="text-sm text-white/50">{label}</p>
            <p className="mt-1 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>
      <section className="mt-8 rounded-xl border border-white/10 bg-ink-900 p-5">
        <h2 className="mb-4 font-bold">Nové registrácie (14 dní)</h2>
        <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Graf registrácií">
          {days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-white/50">{d.n || ""}</span>
              <div className="w-full rounded-t bg-accent" style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n ? 4 : 1 }} />
              <span className="text-[9px] text-white/40">{d.label}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
