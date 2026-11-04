import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ResourceManager } from "@/components/admin/ResourceManager";

export default async function AdsAdmin() {
  await requireAdmin("ads.write");
  const rows = await db.advertisement.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Reklamy</h1>
      <ResourceManager resource="ads" singular="reklama" rows={JSON.parse(JSON.stringify(rows))}
        fields={[
          { name: "name", label: "Názov kampane", type: "text", required: true },
          { name: "mediaType", label: "Typ", type: "select", options: [{ value: "image", label: "Obrázok (5 s)" }, { value: "video", label: "Video" }] },
          { name: "mediaUrl", label: "URL obrázka / videa", type: "text", required: true },
          { name: "targetUrl", label: "Cieľový odkaz", type: "text" },
          { name: "placement", label: "Umiestnenie", type: "select", options: [
            { value: "PRE_ROLL", label: "Pred filmom" }, { value: "MID_ROLL", label: "Počas filmu" },
            { value: "POST_ROLL", label: "Po filme" }, { value: "BANNER", label: "Banner" } ] },
          { name: "startsAt", label: "Začiatok kampane", type: "datetime" },
          { name: "endsAt", label: "Koniec kampane", type: "datetime" },
          { name: "maxViews", label: "Max. počet zobrazení", type: "number" },
          { name: "isActive", label: "Aktívna", type: "checkbox" },
        ]}
        columns={[{ key: "name", label: "Názov" }, { key: "placement", label: "Umiestnenie" },
          { key: "views", label: "Zobrazenia" }, { key: "clicks", label: "Kliky" }, { key: "isActive", label: "Aktívna", format: "bool" }]} />
    </>
  );
}
