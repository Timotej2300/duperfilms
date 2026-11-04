import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "./db";
import { getSession } from "./session";
import { sameOrigin } from "./csrf";

export const PROFILE_COOKIE = "df_profile";

export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s.user;
}

/** Aktívny profil – vždy sa overuje, že patrí prihlásenému používateľovi. */
export async function getActiveProfile(userId: string) {
  const jar = await cookies();
  const id = jar.get(PROFILE_COOKIE)?.value;
  if (!id) return null;
  return db.profile.findFirst({ where: { id, userId } });
}

export async function requireProfile() {
  const user = await requireUser();
  const profile = await getActiveProfile(user.id);
  if (!profile) redirect("/profiles");
  return { user, profile };
}

type ApiAuth =
  | { user: NonNullable<Awaited<ReturnType<typeof getSession>>>["user"]; error?: undefined }
  | { error: NextResponse; user?: undefined };

/** Pre API: CSRF kontrola (pri zmenách) + prihlásenie. */
export async function apiAuth(req: Request): Promise<ApiAuth> {
  if (req.method !== "GET" && !sameOrigin(req))
    return { error: NextResponse.json({ error: "Neplatný pôvod požiadavky" }, { status: 403 }) };
  const s = await getSession();
  if (!s) return { error: NextResponse.json({ error: "Neprihlásený" }, { status: 401 }) };
  return { user: s.user };
}
