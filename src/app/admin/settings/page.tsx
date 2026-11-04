import { requireAdmin } from "@/lib/admin";
import { getSettings, SETTING_KEYS } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function SettingsAdmin() {
  await requireAdmin("settings.write");
  const values = await getSettings();
  return (
    <>
      <h1 className="mb-6 text-3xl font-black">Nastavenia a stránky</h1>
      <SettingsForm fields={SETTING_KEYS.map((s) => ({ ...s }))} values={values} />
    </>
  );
}
