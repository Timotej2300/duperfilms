"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";

export function NavBar({ profileName }: { profileName: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent px-4 py-3 sm:px-10">
      <div className="flex items-center gap-6">
        <Logo size="sm" href="/browse" />
        <nav className="hidden gap-5 text-sm text-white/70 sm:flex">
          <Link href="/browse" className="hover:text-white">Domov</Link>
          <Link href="/search" className="hover:text-white">Hľadať</Link>
          <Link href="/plans" className="hover:text-white">Predplatné</Link>
        </nav>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/account" className="text-white/70 hover:text-white">{profileName}</Link>
        <Link href="/profiles" className="hidden text-white/40 hover:text-white sm:inline">Zmeniť profil</Link>
        <button onClick={logout} className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20">Odhlásiť</button>
      </div>
    </header>
  );
}
