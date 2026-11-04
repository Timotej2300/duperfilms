"use client";

import { useState } from "react";

type Field = { name: string; label: string; type?: string; autoComplete?: string };

export function SimpleForm({
  endpoint, fields, submitLabel, extra, successText, redirectTo, method = "POST",
}: {
  endpoint: string; fields: Field[]; submitLabel: string;
  extra?: Record<string, unknown>; successText?: string; redirectTo?: string; method?: string;
}) {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setState(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    const body: Record<string, unknown> = { ...extra };
    for (const fld of fields) body[fld.name] = f.get(fld.name);
    try {
      const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Chyba");
      setState({ ok: true, text: data.message ?? successText ?? "Hotovo ✓" });
      form.reset();
      if (redirectTo) setTimeout(() => (window.location.href = redirectTo), 1500);
    } catch (err) {
      setState({ ok: false, text: err instanceof Error ? err.message : "Chyba" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {fields.map((f) => (
        <input key={f.name} name={f.name} type={f.type ?? "text"} required placeholder={f.label} aria-label={f.label}
          autoComplete={f.autoComplete}
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-4 py-3 outline-none focus:border-accent" />
      ))}
      <button disabled={busy} className="w-full rounded-lg bg-accent py-3 font-semibold hover:bg-accent-soft disabled:opacity-60">{busy ? "Moment…" : submitLabel}</button>
      {state && <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-green-400" : "text-accent-soft"}`}>{state.text}</p>}
    </form>
  );
}
