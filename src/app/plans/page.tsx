import { db } from "@/lib/db";
import { requireProfile } from "@/lib/guard";
import { getUserPlan } from "@/lib/entitlements";
import { NavBar } from "@/components/NavBar";
import { PlanButton } from "@/components/PlanButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Predplatné" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { user, profile } = await requireProfile();
  const [plans, current] = await Promise.all([
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceCents: "asc" } }),
    getUserPlan(user.id),
  ]);

  return (
    <>
      <NavBar profileName={profile.name} />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-28">
        <h1 className="text-center text-4xl font-black">Vyber si plán</h1>
        {status === "success" && (
          <p className="mx-auto mt-4 max-w-md rounded-lg bg-green-500/15 p-3 text-center text-green-300">
            Ďakujeme! Predplatné sa aktivuje po potvrdení platby (zvyčajne do pár sekúnd).
          </p>
        )}
        {status === "cancel" && <p className="mt-4 text-center text-white/60">Platba bola zrušená.</p>}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.id === current.id ? "border-accent" : "border-white/10"} bg-ink-900/80`}>
              <h2 className="text-xl font-bold">{p.name}</h2>
              <p className="mt-2 text-4xl font-black">
                {p.priceCents === 0 ? "Zadarmo" : `${(p.priceCents / 100).toFixed(2)} €`}
                {p.priceCents > 0 && <span className="text-base font-normal text-white/50"> / {p.intervalMonths === 1 ? "mesiac" : `${p.intervalMonths} mes.`}</span>}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-white/75">
                <li>Až {p.maxProfiles} {p.maxProfiles === 1 ? "profil" : "profilov"}</li>
                <li>Kvalita až {p.maxQuality}</li>
                <li>{p.premiumAccess ? "Prístup k Premium obsahu" : "Bez Premium obsahu"}</li>
                <li>{p.adsEnabled ? "S reklamami" : "Bez reklám"}</li>
                {p.perks && <li>{p.perks}</li>}
              </ul>
              <div className="mt-6">
                {p.id === current.id ? (
                  <span className="block rounded-lg bg-white/10 py-3 text-center text-sm">Aktuálny plán</span>
                ) : p.priceCents === 0 ? null : (
                  <PlanButton planKey={p.key} />
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
