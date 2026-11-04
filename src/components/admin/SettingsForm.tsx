"use client";

import { useState } from "react";

type F = { key: string; label: string; type: "text" | "bool" | "area" };
const cls = "w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 outline-none focus:border-accent";

export function SettingsForm({ fields, values }: { fields: F[]; values: Record<string, string> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const f = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    for (const fld of fields) body[fld.key] = fld.type === "bool" ? String(f.get(fld.key) === "on") : String(f.get(fld.key) ?? "");
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    setMsg(res.ok ? "Uložené ✓" : (await res.json().catch(() => ({}))).error ?? "Chyba");
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-4">
      {fields.map((f) => (
        <label key={f.key} className="block text-sm">
          {f.type === "bool" ? (
            <span className="flex items-center gap-2"><input type="checkbox" name={f.key} defaultChecked={values[f.key] === "true"} /> {f.label}</span>
          ) : (
            <>
              <span className="mb-1 block text-white/60">{f.label}</span>
              {f.type === "area"
                ? <textarea name={f.key} defaultValue={values[f.key] ?? ""} rows={6} className={cls} />
                : <input name={f.key} defaultValue={values[f.key] ?? ""} className={cls} />}
            </>
          )}
        </label>
      ))}
      <div className="flex items-center gap-4">
        <button disabled={busy} className="rounded-lg bg-accent px-6 py-2 font-semibold hover:bg-accent-soft disabled:opacity-60">{busy ? "Ukladám…" : "Uložiť"}</button>
        {msg && <span role="status" className="text-sm text-white/70">{msg}</span>}
      </div>
    </form>
  );
}
