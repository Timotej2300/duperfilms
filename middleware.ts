import { NextResponse, type NextRequest } from "next/server";

/** Pridá cestu do hlavičky, aby ju layout mohol použiť pre údržbový režim. */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
