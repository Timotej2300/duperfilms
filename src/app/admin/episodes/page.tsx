import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ResourceManager } from "@/components/admin/ResourceManager";

export default async function EpisodesAdmin() {
  await requireAdmin("series.write");
  const [series, seasons, episodes] = await Promise.all([
    db.title.findMany({ where: { type: "SERIES" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.season.findMany({ orderBy: [{ titleId: "asc" }, { number: "asc" }], include: { title: { select: { name: true } } } }),
    db.episode.findMany({ orderBy: [{ seasonId: "asc" }, { number: "asc" }], include: { season: { include: { title: { select: { name: true } } } } } }),
  ]);

  const seasonRows = seasons.map((s) => ({ ...s, seriesName: s.title.name }));
  const episodeRows = episodes.map((e) => ({ ...e, where: `${e.season.title.name} · S${e.season.number}` }));

  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Seriály – série a epizódy</h1>
      <h2 className="mb-3 text-xl font-bold">Série</h2>
      {series.length === 0 ? (
        <p className="mb-8 text-white/50">Najprv vytvor titul typu Seriál v sekcii Filmy a seriály.</p>
      ) : (
        <div className="mb-12">
          <ResourceManager resource="seasons" singular="séria" rows={seasonRows}
            fields={[
              { name: "titleId", label: "Seriál", type: "select", options: series.map((s) => ({ value: s.id, label: s.name })) },
              { name: "number", label: "Číslo série", type: "number", required: true },
              { name: "name", label: "Názov (voliteľné)", type: "text" },
            ]}
            columns={[{ key: "seriesName", label: "Seriál" }, { key: "number", label: "Séria" }, { key: "name", label: "Názov" }]} />
        </div>
      )}
      <h2 className="mb-3 text-xl font-bold">Epizódy</h2>
      {seasons.length === 0 ? (
        <p className="text-white/50">Najprv pridaj aspoň jednu sériu.</p>
      ) : (
        <ResourceManager resource="episodes" singular="epizóda" rows={episodeRows}
          fields={[
            { name: "seasonId", label: "Séria", type: "select", options: seasons.map((s) => ({ value: s.id, label: `${s.title.name} · S${s.number}` })) },
            { name: "number", label: "Číslo epizódy", type: "number", required: true },
            { name: "name", label: "Názov", type: "text", required: true },
            { name: "description", label: "Popis", type: "textarea" },
            { name: "streamUrl", label: "Video – HLS (.m3u8) alebo MP4", type: "text" },
            { name: "thumbUrl", label: "Náhľad (URL)", type: "text" },
            { name: "durationMin", label: "Dĺžka (min)", type: "number" },
            { name: "introStart", label: "Začiatok intra (s)", type: "number" },
            { name: "introEnd", label: "Koniec intra (s)", type: "number" },
            { name: "creditsAt", label: "Začiatok titulkov (s)", type: "number" },
          ]}
          columns={[{ key: "where", label: "Seriál / séria" }, { key: "number", label: "Ep." }, { key: "name", label: "Názov" }]} />
      )}
    </>
  );
}
