"use client";

import { useState } from "react";

export function PlanButton({ planKey }: { planKey: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Platbu sa nepodarilo spustiť");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba");
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={go} disabled={loading} className="w-full rounded-lg bg-accent py-3 font-semibold hover:bg-accent-soft disabled:opacity-60">
        {loading ? "Presmerovávam…" : "Vybrať plán"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-accent-soft">{error}</p>}
    </>
  );
}
