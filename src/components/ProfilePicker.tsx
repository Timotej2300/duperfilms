"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type P = { id: string; name: string; avatar: string; isKids: boolean; hasPin: boolean };

const COLORS = ["#e50914", "#2563eb", "#16a34a", "#d97706", "#9333ea", "#0891b2", "#db2777", "#64748b"];
const colorOf = (avatar: string) => COLORS[(parseInt(avatar.replace(/\D/g, ""), 10) || 1) % COLORS.length];

export function Avatar({ avatar, name, size = 112 }: { avatar: string; name: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl text-4xl font-black"
      style={{ width: size, height: size, background: colorOf(avatar) }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Chyba");
  return data;
}

export function ProfilePicker({ profiles, canAdd }: { profiles: P[]; canAdd: boolean }) {
  const router = useRouter();
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<P | null>(null);
  const [editing, setEditing] = useState<P | "new" | null>(null);

  async function choose(p: P, pin?: string) {
    setError(null);
    try {
      await api("/api/profiles/select", "POST", { id: p.id, pin });
      router.push("/browse");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba");
    }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const pin = String(f.get("pin") ?? "");
    const body: Record<string, unknown> = {
      name: f.get("name"),
      avatar: `avatar-${f.get("avatar")}`,
      isKids: f.get("isKids") === "on",
    };
    if (pin) body.pin = pin;
    else if (editing !== "new" && f.get("clearPin") === "on") body.pin = null;
    try {
      if (editing === "new") await api("/api/profiles", "POST", body);
      else if (editing) await api(`/api/profiles/${editing.id}`, "PATCH", body);
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    }
  }

  async function remove(p: P) {
    if (!confirm(`Vymazať profil ${p.name}? História a zoznam sa stratia.`)) return;
    try {
      await api(`/api/profiles/${p.id}`, "DELETE");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    }
  }

  if (editing) {
    const p = editing === "new" ? null : editing;
    return (
      <form onSubmit={save} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-ink-900/80 p-8">
        <h1 className="text-2xl font-bold">{p ? "Upraviť profil" : "Nový profil"}</h1>
        <input name="name" required maxLength={40} defaultValue={p?.name} placeholder="Meno profilu"
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-4 py-3 outline-none focus:border-accent" />
        <label className="block text-sm text-white/70">
          Farba avatara
          <select name="avatar" defaultValue={p ? p.avatar.replace(/\D/g, "") : "1"}
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2">
            {COLORS.map((_, i) => <option key={i} value={i + 1}>Farba {i + 1}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isKids" defaultChecked={p?.isKids} /> Detský profil (rodičovská ochrana)</label>
        <input name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="4-ciferný PIN (voliteľné)"
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-4 py-3 outline-none focus:border-accent" />
        {p?.hasPin && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clearPin" /> Zrušiť PIN</label>}
        {error && <p role="alert" className="text-sm text-accent-soft">{error}</p>}
        <div className="flex gap-3">
          <button className="flex-1 rounded-lg bg-accent py-3 font-semibold hover:bg-accent-soft">Uložiť</button>
          <button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-white/10 px-5 hover:bg-white/20">Zrušiť</button>
        </div>
      </form>
    );
  }

  if (pinFor) {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); choose(pinFor, String(new FormData(e.currentTarget).get("pin"))); }}
        className="w-full max-w-xs space-y-4 text-center"
      >
        <Avatar avatar={pinFor.avatar} name={pinFor.name} />
        <h1 className="text-xl font-bold">Zadaj PIN pre {pinFor.name}</h1>
        <input name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoFocus required
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-accent" />
        {error && <p role="alert" className="text-sm text-accent-soft">{error}</p>}
        <button className="w-full rounded-lg bg-accent py-3 font-semibold">Pokračovať</button>
        <button type="button" onClick={() => { setPinFor(null); setError(null); }} className="text-sm text-white/60 underline">Späť</button>
      </form>
    );
  }

  return (
    <div className="text-center">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Kto sleduje?</h1>
      <div className="flex flex-wrap justify-center gap-6">
        {profiles.map((p, i) => (
          <motion.button key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            onClick={() => (managing ? setEditing(p) : p.hasPin ? setPinFor(p) : choose(p))}
            className="group w-28 text-center">
            <div className="relative transition group-hover:scale-105 group-hover:ring-2 group-hover:ring-white rounded-xl">
              <Avatar avatar={p.avatar} name={p.name} />
              {managing && <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 text-sm">Upraviť</span>}
            </div>
            <p className="mt-2 truncate text-white/70 group-hover:text-white">{p.name}{p.hasPin ? " 🔒" : ""}</p>
            {managing && profiles.length > 1 && (
              <span role="button" onClick={(e) => { e.stopPropagation(); remove(p); }} className="text-xs text-accent-soft underline">Vymazať</span>
            )}
          </motion.button>
        ))}
        {canAdd && (
          <button onClick={() => setEditing("new")} className="w-28">
            <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-white/30 text-4xl text-white/50 hover:text-white">+</div>
            <p className="mt-2 text-white/70">Pridať</p>
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-accent-soft">{error}</p>}
      <button onClick={() => setManaging((m) => !m)} className="mt-10 rounded-md border border-white/30 px-6 py-2 text-white/70 hover:text-white">
        {managing ? "Hotovo" : "Spravovať profily"}
      </button>
    </div>
  );
}
