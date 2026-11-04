import "server-only";
import type { AuthTokenType } from "@prisma/client";
import { db } from "./db";
import { hashToken, newToken } from "./session";

const TTL: Record<AuthTokenType, number> = {
  VERIFY_EMAIL: 24 * 3600_000,
  RESET_PASSWORD: 3600_000,
  CHANGE_EMAIL: 24 * 3600_000,
};

export async function issueToken(userId: string, type: AuthTokenType, payload?: string) {
  await db.authToken.deleteMany({ where: { userId, type, usedAt: null } }); // staré neplatné
  const token = newToken();
  await db.authToken.create({
    data: { userId, type, tokenHash: hashToken(token), payload, expiresAt: new Date(Date.now() + TTL[type]) },
  });
  return token;
}

/** Overí a spotrebuje token (jednorazový). */
export async function consumeToken(token: string, types: AuthTokenType[]) {
  const row = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date() || !types.includes(row.type)) return null;
  const claimed = await db.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return claimed.count === 1 ? row : null;
}
