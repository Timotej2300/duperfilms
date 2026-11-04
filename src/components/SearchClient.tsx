"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { id: string; slug: string; name: string; posterUrl: string | null; year: number | null; type: string };
type Genre = { slug: string; name: string };
const sel = "rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm";

export function SearchClient({ genres }: { genres: Genre[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("relevance");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2 && !genre) { setItems([]); setError(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => { // debounce – živé výsledky pri písaní
      setLoading(true); setError(null);
      try {
        const p = new URLSearchParams({ q, sort });
        if (type) p.set("type", type);
        if (genre) p.set("genre", genre);
        const res = await fetch(`/api/search?${p}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Chyba");
        setItems((await res.json()).items);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Vyhľadávanie zlyhalo");
      } finally { setLoading(false); }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, type, genre, sort]);

  return (
    <div>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadaj filmy, seriály, hercov, režisérov, žánre…"
        className="w-full rounded-xl border border-white/10 bg-ink-800 px-5 py-4 text-lg outline-none focus:border-accent" aria-label="Hľadať" />
      <div className="mt-3 flex flex-wrap gap-3">
        <select value={type} onChange={(e) => setType(e.target.value)} className={sel} aria-label="Typ"><option value="">Filmy aj seriály</option><option value="MOVIE">Filmy</option><option value="SERIES">Seriály</option></select>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className={sel} aria-label="Žáner"><option value="">Všetky žánre</option>{genres.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={sel} aria-label="Zoradenie"><option value="relevance">Podľa názvu</option><option value="new">Najnovšie</option><option value="rating">Najlepšie hodnotené</option><option value="popular">Najpopulárnejšie</option></select>
      </div>
      {error && <p role="alert" className="mt-6 text-accent-soft">{error}</p>}
      {loading && <p className="mt-6 text-white/50">Hľadám…</p>}
      {!loading && !error && (q.trim().length >= 2 || genre) && items.length === 0 && <p className="mt-6 text-white/50">Nič sa nenašlo.</p>}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((t) => (
          <Link key={t.id} href={`/title/${t.slug}`} className="group block overflow-hidden rounded-lg bg-ink-800 hover:ring-2 hover:ring-white/60">
            <div className="aspect-[2/3]">
              {t.posterUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={t.posterUrl} alt={t.name} loading="lazy" className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center p-3 text-center text-sm text-white/60">{t.name}</div>}
            </div>
            <p className="truncate px-2 py-2 text-sm">{t.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
