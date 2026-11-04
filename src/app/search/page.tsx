import { db } from "@/lib/db";
import { requireProfile } from "@/lib/guard";
import { NavBar } from "@/components/NavBar";
import { SearchClient } from "@/components/SearchClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hľadať" };

export default async function SearchPage() {
  const { profile } = await requireProfile();
  const genres = await db.genre.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } });
  return (
    <>
      <NavBar profileName={profile.name} />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-28"><SearchClient genres={genres} /></main>
    </>
  );
}
