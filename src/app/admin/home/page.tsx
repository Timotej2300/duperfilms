import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { HomeEditor } from "@/components/admin/HomeEditor";

export default async function HomeAdmin() {
  await requireAdmin("home.write");
  const [sections, titles, recs] = await Promise.all([
    db.homeSection.findMany({ orderBy: { position: "asc" }, include: { items: { orderBy: { position: "asc" } } } }),
    db.title.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.recommendation.findMany({ orderBy: { slot: "asc" } }),
  ]);
  return (
    <>
      <h1 className="mb-2 text-3xl font-black">Správa homepage</h1>
      <p className="mb-6 text-sm text-white/50">
        Ak sekcii nevyberieš žiadne filmy, naplní sa automaticky (najnovšie, populárne, hodnotenie, história…). Prázdne sekcie sa na webe nezobrazia.
      </p>
      <HomeEditor
        titles={titles}
        recs={[1, 2, 3].map((s) => recs.find((r) => r.slot === s)?.titleId ?? "")}
        sections={sections.map((s) => ({ id: s.id, key: s.key, title: s.title, position: s.position, isVisible: s.isVisible, titleIds: s.items.map((i) => i.titleId) }))}
      />
    </>
  );
}
