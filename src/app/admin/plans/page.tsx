import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ResourceManager } from "@/components/admin/ResourceManager";

export default async function PlansAdmin() {
  await requireAdmin("plans.write");
  const rows = await db.subscriptionPlan.findMany({ orderBy: { priceCents: "asc" } });
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Predplatné – plány</h1>
      <ResourceManager resource="plans" singular="plán" rows={rows}
        fields={[
          { name: "key", label: "Kľúč (napr. basic)", type: "text", required: true },
          { name: "name", label: "Názov", type: "text", required: true },
          { name: "priceCents", label: "Cena v centoch (299 = 2,99 €)", type: "number", required: true },
          { name: "currency", label: "Mena", type: "text" },
          { name: "intervalMonths", label: "Dĺžka predplatného (mesiace)", type: "number" },
          { name: "maxProfiles", label: "Max. počet profilov", type: "number", required: true },
          { name: "maxQuality", label: "Max. kvalita (720p/1080p/2160p)", type: "text", required: true },
          { name: "premiumAccess", label: "Prístup k Premium obsahu", type: "checkbox" },
          { name: "adsEnabled", label: "Reklamy zapnuté", type: "checkbox" },
          { name: "perks", label: "Ďalšie výhody", type: "textarea" },
          { name: "stripePriceId", label: "Stripe Price ID (voliteľné)", type: "text" },
          { name: "isActive", label: "Aktívny", type: "checkbox" },
        ]}
        columns={[{ key: "name", label: "Názov" }, { key: "priceCents", label: "Cena", format: "price" },
          { key: "maxProfiles", label: "Profily" }, { key: "maxQuality", label: "Kvalita" },
          { key: "adsEnabled", label: "Reklamy", format: "bool" }, { key: "isActive", label: "Aktívny", format: "bool" }]} />
    </>
  );
}
