import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/csrf";
import { destroySession } from "@/lib/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Neplatný pôvod požiadavky" }, { status: 403 });
  await destroySession();
  return NextResponse.json({ ok: true });
}
