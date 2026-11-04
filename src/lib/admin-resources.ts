import "server-only";
import { z } from "zod";
import { db } from "./db";
import { slugify } from "./admin";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const url = z.preprocess(emptyToNull, z.string().url().max(500).refine((u) => /^https?:\/\//.test(u), "Iba http(s) odkazy").nullable());
const str = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());
const date = z.preprocess((v) => (v ? new Date(String(v)) : null), z.date().nullable());
const int = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().nullable());

export type Resource = {
  perm: string;
  schema: z.ZodTypeAny;
  list: () => Promise<unknown[]>;
  create: (d: Record<string, unknown>) => Promise<{ id: string | number }>;
  update: (id: string, d: Record<string, unknown>) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

const titleSchema = z.object({
  type: z.enum(["MOVIE", "SERIES"]),
  name: z.string().trim().min(1).max(190),
  originalName: str(190),
  description: z.string().trim().min(1).max(5000),
  posterUrl: url, backdropUrl: url, trailerUrl: url, streamUrl: url,
  year: int, durationMin: int,
  director: str(190), cast: str(2000),
  ageRating: z.coerce.number().int().min(0).max(21).default(0),
  language: str(40), subtitles: str(80), quality: str(20),
  isPremium: z.coerce.boolean().default(false),
  isNew: z.coerce.boolean().default(false),
  isExclusive: z.coerce.boolean().default(false),
  visibility: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "HIDDEN"]),
  publishAt: date,
  genreIds: z.array(z.coerce.number().int()).default([]),
});

async function uniqueSlug(name: string, ignoreId?: string) {
  const base = slugify(name);
  let slug = base, n = 1;
  for (;;) {
    const hit = await db.title.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === ignoreId) return slug;
    slug = `${base}-${++n}`;
  }
}

const planSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, "Iba malé písmená, čísla a pomlčky"),
  name: z.string().trim().min(1).max(60),
  priceCents: z.coerce.number().int().min(0),
  currency: z.string().trim().length(3).toUpperCase().default("EUR"),
  intervalMonths: z.coerce.number().int().min(1).max(36).default(1),
  maxProfiles: z.coerce.number().int().min(1).max(10),
  maxQuality: z.string().trim().max(10),
  premiumAccess: z.coerce.boolean().default(false),
  adsEnabled: z.coerce.boolean().default(true),
  perks: str(1000),
  stripePriceId: str(100),
  isActive: z.coerce.boolean().default(true),
});

const adSchema = z.object({
  name: z.string().trim().min(1).max(120),
  mediaType: z.enum(["image", "video"]),
  mediaUrl: z.string().url().max(500).refine((u) => /^https?:\/\//.test(u), "Iba http(s) odkazy"),
  targetUrl: url,
  placement: z.enum(["PRE_ROLL", "MID_ROLL", "POST_ROLL", "BANNER"]),
  startsAt: date, endsAt: date,
  maxViews: int,
  isActive: z.coerce.boolean().default(true),
});

const genreSchema = z.object({ name: z.string().trim().min(1).max(60) });

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),
  percentOff: z.coerce.number().int().min(1).max(100),
  maxUses: int,
  expiresAt: date,
  isActive: z.coerce.boolean().default(true),
});

const seasonSchema = z.object({
  titleId: z.string().min(1),
  number: z.coerce.number().int().min(1).max(100),
  name: str(120),
});

const episodeSchema = z.object({
  seasonId: z.string().min(1),
  number: z.coerce.number().int().min(1).max(1000),
  name: z.string().trim().min(1).max(190),
  description: str(3000),
  streamUrl: url, thumbUrl: url,
  durationMin: int, introStart: int, introEnd: int, creditsAt: int,
});

export const resources: Record<string, Resource> = {
  seasons: {
    perm: "series.write",
    schema: seasonSchema,
    list: () => db.season.findMany({ orderBy: [{ titleId: "asc" }, { number: "asc" }] }),
    create: (d) => db.season.create({ data: d as z.infer<typeof seasonSchema> }),
    update: (id, d) => db.season.update({ where: { id }, data: d as z.infer<typeof seasonSchema> }),
    remove: (id) => db.season.delete({ where: { id } }),
  },
  episodes: {
    perm: "series.write",
    schema: episodeSchema,
    list: () => db.episode.findMany({ orderBy: [{ seasonId: "asc" }, { number: "asc" }] }),
    create: (d) => db.episode.create({ data: d as z.infer<typeof episodeSchema> }),
    update: (id, d) => db.episode.update({ where: { id }, data: d as z.infer<typeof episodeSchema> }),
    remove: (id) => db.episode.delete({ where: { id } }),
  },
  titles: {
    perm: "movies.write",
    schema: titleSchema,
    list: () => db.title.findMany({ orderBy: { createdAt: "desc" }, take: 500, include: { genres: true } }),
    create: async (d) => {
      const { genreIds, ...rest } = d as z.infer<typeof titleSchema>;
      const t = await db.title.create({
        data: { ...rest, slug: await uniqueSlug(rest.name), genres: { create: genreIds.map((genreId) => ({ genreId })) } },
      });
      return t;
    },
    update: async (id, d) => {
      const { genreIds, ...rest } = d as z.infer<typeof titleSchema>;
      await db.titleGenre.deleteMany({ where: { titleId: id } });
      return db.title.update({
        where: { id },
        data: { ...rest, genres: { create: genreIds.map((genreId) => ({ genreId })) } },
      });
    },
    remove: (id) => db.title.delete({ where: { id } }),
  },
  genres: {
    perm: "genres.write",
    schema: genreSchema,
    list: () => db.genre.findMany({ orderBy: { name: "asc" } }),
    create: (d) => db.genre.create({ data: { name: d.name as string, slug: slugify(d.name as string) } }),
    update: (id, d) => db.genre.update({ where: { id: Number(id) }, data: { name: d.name as string, slug: slugify(d.name as string) } }),
    remove: (id) => db.genre.delete({ where: { id: Number(id) } }),
  },
  plans: {
    perm: "plans.write",
    schema: planSchema,
    list: () => db.subscriptionPlan.findMany({ orderBy: { priceCents: "asc" } }),
    create: (d) => db.subscriptionPlan.create({ data: d as z.infer<typeof planSchema> }),
    update: (id, d) => db.subscriptionPlan.update({ where: { id: Number(id) }, data: d as z.infer<typeof planSchema> }),
    remove: async (id) => {
      const used = await db.subscription.count({ where: { planId: Number(id) } });
      if (used) throw new Error("Plán má predplatiteľov – radšej ho deaktivuj");
      return db.subscriptionPlan.delete({ where: { id: Number(id) } });
    },
  },
  ads: {
    perm: "ads.write",
    schema: adSchema,
    list: () => db.advertisement.findMany({ orderBy: { name: "asc" } }),
    create: (d) => db.advertisement.create({ data: d as z.infer<typeof adSchema> }),
    update: (id, d) => db.advertisement.update({ where: { id }, data: d as z.infer<typeof adSchema> }),
    remove: (id) => db.advertisement.delete({ where: { id } }),
  },
  coupons: {
    perm: "plans.write",
    schema: couponSchema,
    list: () => db.coupon.findMany({ orderBy: { code: "asc" } }),
    create: (d) => db.coupon.create({ data: d as z.infer<typeof couponSchema> }),
    update: (id, d) => db.coupon.update({ where: { id: Number(id) }, data: d as z.infer<typeof couponSchema> }),
    remove: (id) => db.coupon.delete({ where: { id: Number(id) } }),
  },
};
