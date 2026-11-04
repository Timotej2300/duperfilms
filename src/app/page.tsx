import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/profiles");

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent px-5 py-4 sm:px-10">
        <Logo size="sm" />
        <Link href="/login" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold hover:bg-accent-soft">
          Prihlásiť sa
        </Link>
      </header>
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl text-4xl font-black sm:text-6xl">Filmy a seriály. Kedykoľvek. Kdekoľvek.</h1>
        <p className="mt-4 max-w-xl text-white/70">Pozeraj exkluzívny obsah DuperFilms. Registrácia je zadarmo.</p>
        <Link href="/register" className="mt-8 rounded-lg bg-accent px-8 py-3 font-semibold hover:bg-accent-soft">Začať</Link>
      </main>
    </>
  );
}
