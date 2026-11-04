import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Intro } from "@/components/Intro";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://duperfilms.eu"),
  title: { default: "DuperFilms – filmy a seriály", template: "%s | DuperFilms" },
  description: "Streamovacia platforma DuperFilms: filmy, seriály a exkluzívny obsah.",
  openGraph: { siteName: "DuperFilms", type: "website", locale: "sk_SK" },
};

export const viewport: Viewport = { themeColor: "#050506" };

// Cesty, ktoré fungujú aj počas údržby (prihlásenie adminov, administrácia, webhooky)
const OPEN_DURING_MAINTENANCE = ["/admin", "/login", "/api", "/p/"];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let maintenance = false;
  try {
    const path = (await headers()).get("x-pathname") ?? "/";
    const s = await getSettings();
    if (s["site.maintenance"] === "true" && !OPEN_DURING_MAINTENANCE.some((p) => path.startsWith(p))) {
      const session = await getSession();
      maintenance = !session?.user.role.isStaff;
    }
  } catch {
    /* DB nedostupná – stránku radšej zobrazíme než zhodíme celý web */
  }

  return (
    <html lang="sk">
      <body className="min-h-screen font-sans">
        {maintenance ? (
          <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
            <Logo size="md" href={null} />
            <h1 className="text-3xl font-black">Pripravujeme vylepšenia</h1>
            <p className="max-w-md text-white/60">DuperFilms je dočasne v údržbe. Čoskoro sme späť. Kontakt: support@duperfilms.eu</p>
          </main>
        ) : (
          <>
            <Intro />
            {children}
          </>
        )}
      </body>
    </html>
  );
}
