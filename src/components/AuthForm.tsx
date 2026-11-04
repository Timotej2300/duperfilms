"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Niečo sa pokazilo");
      router.push("/profiles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Niečo sa pokazilo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Logo size="md" />
      </div>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-ink-900/80 p-8 backdrop-blur"
      >
        <h1 className="text-2xl font-bold">{isLogin ? "Prihlásiť sa" : "Vytvoriť účet"}</h1>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="E-mail"
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-4 py-3 outline-none focus:border-accent"
        />
        <input
          name="password"
          type="password"
          required
          minLength={isLogin ? 1 : 10}
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder="Heslo"
          className="w-full rounded-lg border border-white/10 bg-ink-800 px-4 py-3 outline-none focus:border-accent"
        />
        {isLogin && (
          <Link href="/forgot-password" className="block text-right text-xs text-white/50 underline">Zabudnuté heslo?</Link>
        )}
        {error && (
          <p role="alert" className="text-sm text-accent-soft">
            {error}
          </p>
        )}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-accent py-3 font-semibold transition hover:bg-accent-soft disabled:opacity-60"
        >
          {loading ? "Moment…" : isLogin ? "Prihlásiť sa" : "Registrovať"}
        </button>
        <p className="text-center text-sm text-white/60">
          {isLogin ? (
            <>
              Nemáš účet? <Link href="/register" className="text-white underline">Zaregistruj sa</Link>
            </>
          ) : (
            <>
              Už máš účet? <Link href="/login" className="text-white underline">Prihlás sa</Link>
            </>
          )}
        </p>
      </form>
    </main>
  );
}
