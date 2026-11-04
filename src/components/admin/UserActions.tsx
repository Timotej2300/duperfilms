"use client";

import { useRouter } from "next/navigation";

export function UserActions({ id, blocked, roleKey, roles, canRoles }: {
  id: string; blocked: boolean; roleKey: string; roles: { key: string; name: string }[]; canRoles: boolean;
}) {
  const router = useRouter();
  async function patch(body: object) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? "Chyba");
    router.refresh();
  }
  return (
    <div className="flex items-center justify-end gap-3">
      {canRoles && (
        <select defaultValue={roleKey} onChange={(e) => patch({ roleKey: e.target.value })} className="rounded bg-ink-800 px-2 py-1 text-xs">
          {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
      )}
      <button onClick={() => patch({ isBlocked: !blocked })} className={blocked ? "text-green-400 underline" : "text-accent-soft underline"}>
        {blocked ? "Odblokovať" : "Zablokovať"}
      </button>
    </div>
  );
}
