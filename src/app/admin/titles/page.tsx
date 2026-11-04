import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ResourceManager, type Field } from "@/components/admin/ResourceManager";
import Link from "next/link";

export default async function TitlesAdmin() {
  await requireAdmin("movies.write");
  const [rows, genres] = await Promise.all([
    db.title.findMany({ orderBy: { createdAt: "desc" }, take: 500, include: { genres: true } }),
    db.genre.findMany({ orderBy: { name: "asc" } }),
  ]);

  const fields: Field[] = [
    { name: "type", label: "Typ", type: "select", options: [{ value: "MOVIE", label: "Film" }, { value: "SERIES", label: "Seriál" }] },
    { name: "name", label: "Názov", type: "text", required: true },
    { name: "originalName", label: "Originálny názov", type: "text" },
    { name: "description", label: "Popis", type: "textarea", required: true },
    { name: "posterUrl", label: "Plagát (URL)", type: "text" },
    { name: "backdropUrl", label: "Pozadie (URL)", type: "text" },
    { name: "trailerUrl", label: "Trailer (URL)", type: "text" },
    { name: "streamUrl", label: "Video – HLS (.m3u8) alebo MP4 (len filmy)", type: "text", hint: "Používaj iba obsah, ku ktorému máš práva." },
    { name: "year", label: "Rok", type: "number" },
    { name: "durationMin", label: "Dĺžka (min)", type: "number" },
    { name: "director", label: "Režisér", type: "text" },
    { name: "cast", label: "Herci (oddelení čiarkou)", type: "textarea" },
    { name: "ageRating", label: "Vekové obmedzenie", type: "number" },
    { name: "language", label: "Jazyk", type: "text" },
    { name: "subtitles", label: "Titulky (napr. sk,cs,en)", type: "text" },
    { name: "quality", label: "Kvalita (napr. 1080p)", type: "text" },
    { name: "genreIds", label: "Žánre (Ctrl/Cmd pre viac)", type: "multiselect", options: genres.map((g) => ({ value: g.id, label: g.name })) },
    { name: "isPremium", label: "Premium obsah", type: "checkbox" },
    { name: "isNew", label: "Nové", type: "checkbox" },
    { name: "isExclusive", label: "Exkluzívne", type: "checkbox" },
    { name: "visibility", label: "Viditeľnosť", type: "select", options: [
      { value: "DRAFT", label: "Koncept" }, { value: "PUBLISHED", label: "Publikované" },
      { value: "SCHEDULED", label: "Naplánované" }, { value: "HIDDEN", label: "Skryté" } ] },
    { name: "publishAt", label: "Dátum publikovania (pri 'Naplánované')", type: "datetime" },
  ];

  return (
    <>
      <h1 className="mb-1 text-3xl font-black">Filmy a seriály</h1>
      <p className="mb-6 text-sm text-white/50">
        Epizódy seriálov: <Link href="/admin/episodes" className="underline">Správa sérií a epizód</Link>
      </p>
      <ResourceManager resource="titles" singular="titul" fields={fields} rows={JSON.parse(JSON.stringify(rows))}
        columns={[{ key: "name", label: "Názov" }, { key: "type", label: "Typ" }, { key: "visibility", label: "Stav" },
          { key: "isPremium", label: "Premium", format: "bool" }, { key: "viewCount", label: "Zhliadnutia" }]} />
    </>
  );
}
