import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ResourceManager } from "@/components/admin/ResourceManager";

export default async function CouponsAdmin() {
  await requireAdmin("plans.write");
  const rows = await db.coupon.findMany({ orderBy: { code: "asc" } });
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Kupóny</h1>
      <ResourceManager resource="coupons" singular="kupón" rows={JSON.parse(JSON.stringify(rows))}
        fields={[
          { name: "code", label: "Kód", type: "text", required: true },
          { name: "percentOff", label: "Zľava (%)", type: "number", required: true },
          { name: "maxUses", label: "Max. použití", type: "number" },
          { name: "expiresAt", label: "Platí do", type: "datetime" },
          { name: "isActive", label: "Aktívny", type: "checkbox" },
        ]}
        columns={[{ key: "code", label: "Kód" }, { key: "percentOff", label: "%" }, { key: "used", label: "Použitý" },
          { key: "expiresAt", label: "Platí do", format: "date" }, { key: "isActive", label: "Aktívny", format: "bool" }]} />
    </>
  );
}
