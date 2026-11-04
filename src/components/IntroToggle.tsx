"use client";

import { useState } from "react";

export function IntroToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);

  async function toggle(next: boolean) {
    setOn(next);
    try { next ? localStorage.removeItem("df_intro_off") : localStorage.setItem("df_intro_off", "1"); } catch { /* ignoruj */ }
    const res = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "intro", enabled: next }) });
    if (!res.ok) setOn(!next);
  }

  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} />
      Zobrazovať úvodnú animáciu pri prvej návšteve
    </label>
  );
}
