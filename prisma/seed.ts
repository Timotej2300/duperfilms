import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ROLES = [
  { key: "OWNER", name: "Owner", isStaff: true },
  { key: "SUPER_ADMIN", name: "Super Admin", isStaff: true },
  { key: "ADMIN", name: "Admin", isStaff: true },
  { key: "MODERATOR", name: "Moderator", isStaff: true },
  { key: "EDITOR", name: "Editor", isStaff: true },
  { key: "USER", name: "Používateľ", isStaff: false },
];

const PERMISSIONS = [
  ["dashboard.view", "Zobraziť dashboard"],
  ["movies.write", "Spravovať filmy"],
  ["series.write", "Spravovať seriály"],
  ["genres.write", "Spravovať žánre"],
  ["users.view", "Zobraziť používateľov"],
  ["users.ban", "Blokovať používateľov"],
  ["users.roles", "Spravovať role"],
  ["plans.write", "Spravovať predplatné"],
  ["payments.view", "Zobraziť platby"],
  ["ads.write", "Spravovať reklamy"],
  ["home.write", "Spravovať homepage"],
  ["settings.write", "Spravovať nastavenia"],
  ["audit.view", "Zobraziť audit logy"],
] as const;

const ROLE_PERMS: Record<string, string[] | "*"> = {
  OWNER: "*",
  SUPER_ADMIN: "*",
  ADMIN: PERMISSIONS.map((p) => p[0]).filter((k) => k !== "users.roles"),
  MODERATOR: ["dashboard.view", "users.view", "users.ban", "audit.view"],
  EDITOR: ["dashboard.view", "movies.write", "series.write", "genres.write", "home.write"],
  USER: [],
};

const PLANS = [
  { key: "free", name: "Free", priceCents: 0, maxProfiles: 1, maxQuality: "720p", premiumAccess: false, adsEnabled: true, perks: "Základný obsah s reklamami" },
  { key: "premium", name: "Premium", priceCents: 299, maxProfiles: 5, maxQuality: "1080p", premiumAccess: true, adsEnabled: false, perks: "Všetok obsah bez reklám" },
];

const GENRES = ["Akčné", "Dráma", "Komédia", "Horor", "Sci-Fi", "Dokumentárne", "Animované", "Thriller"];

const SECTIONS = [
  ["hero", "Hero banner"],
  ["continue", "Pokračovať v sledovaní"],
  ["mylist", "Moja kolekcia"],
  ["rec", "Odporúčané pre vás"],
  ["new", "Najnovšie pridané"],
  ["popular", "Najpopulárnejšie"],
  ["top", "Najlepšie hodnotené"],
  ["exclusive", "Exkluzívne na DuperFilms"],
  ["series", "Seriály a nové epizódy"],
];

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  for (const r of ROLES) await prisma.role.upsert({ where: { key: r.key }, update: r, create: r });
  for (const [key, label] of PERMISSIONS)
    await prisma.permission.upsert({ where: { key }, update: { label }, create: { key, label } });

  const allPerms = await prisma.permission.findMany();
  for (const [roleKey, perms] of Object.entries(ROLE_PERMS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
    const wanted = perms === "*" ? allPerms : allPerms.filter((p) => perms.includes(p.key));
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const p of wanted)
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: p.id } });
  }

  for (const p of PLANS) await prisma.subscriptionPlan.upsert({ where: { key: p.key }, update: p, create: p });
  for (const g of GENRES)
    await prisma.genre.upsert({ where: { slug: slug(g) }, update: { name: g }, create: { slug: slug(g), name: g } });
  for (const [i, [key, title]] of SECTIONS.entries())
    await prisma.homeSection.upsert({ where: { key }, update: {}, create: { key, title, position: i } });

  const defaults: Record<string, string> = {
    "site.name": "DuperFilms",
    "site.maintenance": "false",
    "site.registrationOpen": "true",
    "contact.support": "support@duperfilms.eu",
    "contact.help": "pomoc@duperfilms.eu",
  };
  for (const [key, value] of Object.entries(defaults))
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });

  // Owner z env premenných – žiadny hardcoded účet
  const email = process.env.SEED_OWNER_EMAIL?.toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (email && password && password.length >= 12) {
    const role = await prisma.role.findUniqueOrThrow({ where: { key: "OWNER" } });
    const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await prisma.user.upsert({
      where: { email },
      update: { roleId: role.id },
      create: { email, passwordHash, roleId: role.id, emailVerifiedAt: new Date() },
    });
    console.log(`Owner pripravený: ${email}`);
  } else {
    console.log("SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD (min. 12 znakov) nie sú nastavené – Owner nevytvorený.");
  }
}

main().finally(() => prisma.$disconnect());
