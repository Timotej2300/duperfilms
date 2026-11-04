import { notFound } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const PAGES: Record<string, { key: string; title: string }> = {
  terms: { key: "page.terms", title: "Podmienky používania" },
  privacy: { key: "page.privacy", title: "Ochrana osobných údajov" },
  cookies: { key: "page.cookies", title: "Cookies" },
  contact: { key: "page.contact", title: "Kontakt" },
  support: { key: "page.support", title: "Support" },
};

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return { title: PAGES[page]?.title ?? "Stránka" };
}

export default async function InfoPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const def = PAGES[page];
  if (!def) notFound();
  const s = await getSettings();
  const body = s[def.key]?.trim();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Logo size="sm" />
      <h1 className="mt-8 text-4xl font-black">{def.title}</h1>
      {/* Text sa vykresľuje ako obyčajný text (žiadne HTML → žiadne XSS) */}
      {body ? <div className="mt-6 whitespace-pre-wrap leading-relaxed text-white/80">{body}</div>
        : <p className="mt-6 text-white/50">Obsah tejto stránky zatiaľ nebol doplnený.</p>}
      {(page === "contact" || page === "support") && (
        <p className="mt-8 text-white/70">
          E-mail: <a className="underline" href={`mailto:${s["contact.support"] || "support@duperfilms.eu"}`}>{s["contact.support"] || "support@duperfilms.eu"}</a>
          {" · "}
          <a className="underline" href={`mailto:${s["contact.help"] || "pomoc@duperfilms.eu"}`}>{s["contact.help"] || "pomoc@duperfilms.eu"}</a>
        </p>
      )}
      <Link href="/" className="mt-10 inline-block text-sm text-white/50 underline">← Späť</Link>
    </main>
  );
}
