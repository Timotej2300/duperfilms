import { db } from "./db";

export const SETTING_KEYS = [
  { key: "site.name", label: "Názov webu", type: "text" },
  { key: "site.maintenance", label: "Údržbový režim (true/false)", type: "bool" },
  { key: "site.registrationOpen", label: "Registrácia otvorená", type: "bool" },
  { key: "site.announcement", label: "Oznámenie pre všetkých (zobrazí sa na homepage)", type: "text" },
  { key: "seo.description", label: "SEO popis webu", type: "text" },
  { key: "contact.support", label: "Support e-mail", type: "text" },
  { key: "contact.help", label: "Pomoc e-mail", type: "text" },
  { key: "social.facebook", label: "Facebook URL", type: "text" },
  { key: "social.instagram", label: "Instagram URL", type: "text" },
  { key: "social.youtube", label: "YouTube URL", type: "text" },
  { key: "page.terms", label: "Podmienky používania", type: "area" },
  { key: "page.privacy", label: "Ochrana osobných údajov", type: "area" },
  { key: "page.cookies", label: "Cookies", type: "area" },
  { key: "page.contact", label: "Kontakt", type: "area" },
  { key: "page.support", label: "Support / pomoc", type: "area" },
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number]["key"];
export const ALLOWED = new Set<string>(SETTING_KEYS.map((s) => s.key));

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getSetting(key: SettingKey, fallback = "") {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}
