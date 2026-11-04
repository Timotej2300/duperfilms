"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "checkbox" | "select" | "datetime" | "multiselect";
  options?: { value: string | number; label: string }[];
  required?: boolean;
  hint?: string;
};
export type Column = { key: string; label: string; format?: "bool" | "price" | "date" };
type Row = Record<string, unknown> & { id: string | number };

const toLocal = (v: unknown) => {
  if (!v) return "";
  const d = new Date(String(v));
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

const cls = "w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 outline-none focus:border-accent";

export function ResourceManager({
  resource, fields, columns, rows, singular,
}: { resource: string; fields: Field[]; columns: Column[]; rows: Row[]; singular: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const fld of fields) {
      if (fld.type === "checkbox") body[fld.name] = f.get(fld.name) === "on";
      else if (fld.type === "multiselect") body[fld.name] = f.getAll(fld.name).map(Number);
      else body[fld.name] = f.get(fld.name) ?? "";
    }
    const isNew = editing === "new";
    const res = await fetch(isNew ? `/api/admin/${resource}` : `/api/admin/${resource}/${(editing as Row).id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Chyba");
    setEditing(null);
    router.refresh();
  }

  async function remove(r: Row) {
    if (!confirm("Naozaj odstrániť? Túto akciu nemožno vrátiť.")) return;
    const res = await fetch(`/api/admin/${resource}/${r.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error ?? "Chyba");
    router.refresh();
  }

  const cell = (r: Row, c: Column) => {
    const v = r[c.key];
    if (c.format === "bool") return v ? "✓" : "—";
    if (c.format === "price") return `${((v as number) / 100).toFixed(2)} €`;
    if (c.format === "date") return v ? new Date(String(v)).toLocaleDateString("sk-SK") : "—";
    return String(v ?? "—");
  };

  if (editing) {
    const cur = editing === "new" ? null : editing;
    return (
      <form onSubmit={submit} className="max-w-2xl space-y-4">
        <h2 className="text-2xl font-bold">{cur ? `Upraviť: ${singular}` : `Nový: ${singular}`}</h2>
        {fields.map((fld) => {
          const val = cur?.[fld.name];
          return (
            <label key={fld.name} className="block text-sm">
              {fld.type !== "checkbox" && <span className="mb-1 block text-white/60">{fld.label}{fld.required && " *"}</span>}
              {fld.type === "textarea" ? (
                <textarea name={fld.name} defaultValue={String(val ?? "")} required={fld.required} rows={5} className={cls} />
              ) : fld.type === "checkbox" ? (
                <span className="flex items-center gap-2"><input type="checkbox" name={fld.name} defaultChecked={cur ? !!val : fld.name === "isActive"} /> {fld.label}</span>
              ) : fld.type === "select" ? (
                <select name={fld.name} defaultValue={String(val ?? fld.options?.[0]?.value ?? "")} className={cls}>
                  {fld.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : fld.type === "multiselect" ? (
                <select name={fld.name} multiple size={Math.min(8, fld.options?.length ?? 4)} className={cls}
                  defaultValue={((val as { genreId: number }[] | undefined) ?? []).map((g) => String(g.genreId))}>
                  {fld.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : fld.type === "datetime" ? (
                <input type="datetime-local" name={fld.name} defaultValue={toLocal(val)} className={cls} />
              ) : (
                <input type={fld.type} name={fld.name} defaultValue={String(val ?? "")} required={fld.required} className={cls} />
              )}
              {fld.hint && <span className="mt-1 block text-xs text-white/40">{fld.hint}</span>}
            </label>
          );
        })}
        {error && <p role="alert" className="text-sm text-accent-soft">{error}</p>}
        <div className="flex gap-3">
          <button disabled={busy} className="rounded-lg bg-accent px-6 py-2 font-semibold hover:bg-accent-soft disabled:opacity-60">{busy ? "Ukladám…" : "Uložiť"}</button>
          <button type="button" onClick={() => { setEditing(null); setError(null); }} className="rounded-lg bg-white/10 px-6 py-2 hover:bg-white/20">Zrušiť</button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-white/50">{rows.length} záznamov</span>
        <button onClick={() => setEditing("new")} className="rounded-lg bg-accent px-5 py-2 font-semibold hover:bg-accent-soft">+ Pridať</button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/20 p-10 text-center text-white/50">Zatiaľ nič. Pridaj prvý záznam.</p>
      ) : (
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="text-white/50"><tr>{columns.map((c) => <th key={c.key} className="py-2 pr-3 font-medium">{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                {columns.map((c) => <td key={c.key} className="py-2 pr-3">{cell(r, c)}</td>)}
                <td className="space-x-3 py-2 text-right">
                  <button onClick={() => setEditing(r)} className="text-white/70 underline hover:text-white">Upraviť</button>
                  <button onClick={() => remove(r)} className="text-accent-soft underline">Zmazať</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
