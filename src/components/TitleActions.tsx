"use client";

import { useState } from "react";

export function TitleActions({ titleId, initialFav, initialRating }: { titleId: string; initialFav: boolean; initialRating: number }) {
  const [fav, setFav] = useState(initialFav);
  const [rating, setRating] = useState(initialRating);
  const [busy, setBusy] = useState(false);

  async function toggleFav() {
    if (busy) return;
    setBusy(true);
    const next = !fav;
    setFav(next);
    const res = await fetch("/api/favorites", {
      method: next ? "PUT" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titleId }),
    });
    if (!res.ok) setFav(!next);
    setBusy(false);
  }

  async function rate(value: number) {
    const prev = rating;
    setRating(value);
    const res = await fetch("/api/ratings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titleId, value }),
    });
    if (!res.ok) setRating(prev);
  }

  return (
    <>
      <button onClick={toggleFav} disabled={busy} className="rounded-lg bg-white/15 px-5 py-3 font-semibold backdrop-blur hover:bg-white/25">
        {fav ? "✓ V mojom zozname" : "+ Do môjho zoznamu"}
      </button>
      <div className="flex items-center gap-1" aria-label="Hodnotenie">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} onClick={() => rate(v)} aria-label={`${v} z 5`} className={`text-2xl ${v <= rating ? "text-accent-gold" : "text-white/30"} hover:text-accent-gold`}>★</button>
        ))}
      </div>
    </>
  );
}
