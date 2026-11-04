import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "df_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dní

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export function newToken() {
  return randomBytes(32).toString("base64url");
}
export const hashToken = sha256;

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string }) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      ip: meta.ip?.slice(0, 64),
      userAgent: meta.userAgent?.slice(0, 255),
      expiresAt,
    },
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: true } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.isBlocked) return null;
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}
