import { requireProfile } from "@/lib/guard";
import { NavBar } from "@/components/NavBar";
import { SimpleForm } from "@/components/SimpleForm";
import { IntroToggle } from "@/components/IntroToggle";
import { getUserPlan } from "@/lib/entitlements";

export const dynamic = "force-dynamic";
export const metadata = { title: "Môj účet" };

export default async function AccountPage() {
  const { user, profile } = await requireProfile();
  const plan = await getUserPlan(user.id);
  return (
    <>
      <NavBar profileName={profile.name} />
      <main className="mx-auto max-w-xl space-y-10 px-5 pb-20 pt-28">
        <section>
          <h1 className="text-3xl font-black">Môj účet</h1>
          <p className="mt-2 text-white/60">{user.email} · plán {plan.name}</p>
          {!user.emailVerifiedAt && (
            <div className="mt-4 rounded-lg bg-accent/15 p-4 text-sm">
              <p className="mb-3">E-mail ešte nie je overený.</p>
              <SimpleForm endpoint="/api/account" extra={{ action: "resend" }} fields={[]} submitLabel="Poslať overovací e-mail" successText="Odoslané ✓" />
            </div>
          )}
        </section>
        <section><h2 className="mb-3 text-xl font-bold">Zmena hesla</h2>
          <SimpleForm endpoint="/api/account" extra={{ action: "password" }} submitLabel="Zmeniť heslo"
            fields={[{ name: "current", label: "Aktuálne heslo", type: "password", autoComplete: "current-password" }, { name: "next", label: "Nové heslo", type: "password", autoComplete: "new-password" }]} />
        </section>
        <section><h2 className="mb-3 text-xl font-bold">Zmena e-mailu</h2>
          <SimpleForm endpoint="/api/account" extra={{ action: "email" }} submitLabel="Zmeniť e-mail"
            fields={[{ name: "email", label: "Nový e-mail", type: "email" }, { name: "current", label: "Aktuálne heslo", type: "password", autoComplete: "current-password" }]} />
        </section>
        <section><h2 className="mb-3 text-xl font-bold">Úvodná animácia</h2>
          <IntroToggle initial={user.introEnabled} />
        </section>
      </main>
    </>
  );
}
