import { db } from "./db";

/**
 * Jednoduchý rate limiter uložený v DB (funguje aj na serverless).
 * Vráti true, ak je požiadavka povolená.
 */
export async function rateLimit(key: string, max: number, windowSec: number, blockSec = windowSec) {
  const now = new Date();
  const row = await db.rateLimit.findUnique({ where: { key } });

  if (row?.blockedTill && row.blockedTill > now) return false;

  if (!row || now.getTime() - row.windowStart.getTime() > windowSec * 1000) {
    await db.rateLimit.upsert({
      where: { key },
      update: { count: 1, windowStart: now, blockedTill: null },
      create: { key, count: 1, windowStart: now },
    });
    return true;
  }

  const count = row.count + 1;
  await db.rateLimit.update({
    where: { key },
    data: { count, blockedTill: count > max ? new Date(now.getTime() + blockSec * 1000) : null },
  });
  return count <= max;
}

export async function resetRateLimit(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
