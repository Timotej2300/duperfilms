"use client";

import { useState } from "react";

type T = { id: string; name: string };
type S = { id: number; key: string; title: string; position: number; isVisible: boolean; titleIds: string[] };
const cls = "rounded-lg border border-white/10 bg-ink-800 px-3 py-2 outline-none focus:border-accent";

export function HomeEditor({ titles, sections: initial, recs: initialRecs }: { titles: T[]; sections: S[]; recs: string[] }) {
  const [sections, setSections] = useState(initial);
  const [recs, setRecs] = useState(initialRecs);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (id: number, p: Partial<S>) => setSections((all) => all.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const move = (i: number, d: number) =>
    setSections((all) => {
      const a = [...all]; const j = i + d;
      if (j < 0 || j >= a.length) return a;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/home", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sections: sections.map((s, i) => ({ id: s.id, title: s.title, position: i, isVisible: s.isVisible, titleIds: s.titleIds })),
        recs: recs.map((r) => r || null),
      }),
    });
    setBusy(false);
    setMsg(res.ok ? "Uložené ✓" : (await res.json().catch(() => ({}))).error ?? "Chyba");
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section>
        <h2 className="mb-2 text-xl font-bold">Odporúčané filmy 1, 2, 3</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {recs.map((r, i) => (
            <select key={i} value={r} onChange={(e) => setRecs((all) => all.map((x, j) => (j === i ? e.target.value : x)))} className={cls}>
              <option value="">— automaticky —</option>
              {titles.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Sekcie (poradie, názov, viditeľnosť, filmy)</h2>
        <ul className="space-y-3">
          {sections.map((s, i) => (
            <li key={s.id} className="rounded-xl border border-white/10 bg-ink-900 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => move(i, -1)} aria-label="Vyššie" className="px-2">↑</button>
                <button onClick={() => move(i, 1)} aria-label="Nižšie" className="px-2">↓</button>
                <input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} className={`${cls} flex-1`} aria-label="Názov sekcie" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.isVisible} onChange={(e) => patch(s.id, { isVisible: e.target.checked })} /> Viditeľná</label>
                <span className="text-xs text-white/30">{s.key}</span>
              </div>
              {s.key !== "continue" && s.key !== "mylist" && (
                <label className="mt-3 block text-xs text-white/50">Ručne zvolené filmy (Ctrl/Cmd pre viac, prázdne = automaticky)
                  <select multiple size={5} value={s.titleIds} onChange={(e) => patch(s.id, { titleIds: Array.from(e.target.selectedOptions, (o) => o.value) })} className={`${cls} mt-1 w-full`}>
                    {titles.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={busy} className="rounded-lg bg-accent px-6 py-2 font-semibold hover:bg-accent-soft disabled:opacity-60">{busy ? "Ukladám…" : "Uložiť"}</button>
        {msg && <span role="status" className="text-sm text-white/70">{msg}</span>}
      </div>
    </div>
  );
}
