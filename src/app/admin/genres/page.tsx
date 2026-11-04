import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ResourceManager } from "@/components/admin/ResourceManager";

export default async function GenresAdmin() {
  await requireAdmin("genres.write");
  const rows = await db.genre.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Kategórie (žánre)</h1>
      <ResourceManager resource="genres" singular="žáner" rows={rows}
        fields={[{ name: "name", label: "Názov", type: "text", required: true }]}
        columns={[{ key: "name", label: "Názov" }, { key: "slug", label: "Slug" }]} />
    </>
  );
}
