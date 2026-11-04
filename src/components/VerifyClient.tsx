"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function VerifyClient({ token }: { token?: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">(token ? "loading" : "error");
  const [msg, setMsg] = useState(token ? "" : "Chýba overovací odkaz.");

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.ok) setState("ok");
        else { setState("error"); setMsg(d.error ?? "Chyba"); }
      })
      .catch(() => { setState("error"); setMsg("Chyba siete"); });
  }, [token]);

  return (
    <>
      {state === "loading" && <p className="text-white/60">Overujem…</p>}
      {state === "ok" && <p className="text-green-400">Hotovo! E-mail bol potvrdený.</p>}
      {state === "error" && <p role="alert" className="text-accent-soft">{msg}</p>}
      <Link href="/profiles" className="block text-center text-sm text-white/60 underline">Pokračovať</Link>
    </>
  );
}
