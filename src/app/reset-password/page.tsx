import { Shell } from "@/components/Shell";
import { SimpleForm } from "@/components/SimpleForm";

export const metadata = { title: "Nové heslo" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <Shell title="Nové heslo">
      {token ? (
        <SimpleForm endpoint="/api/auth/reset" extra={{ token }} submitLabel="Uložiť heslo" redirectTo="/login"
          successText="Heslo zmenené. Presmerovávam na prihlásenie…"
          fields={[{ name: "password", label: "Nové heslo (min. 10 znakov)", type: "password", autoComplete: "new-password" }]} />
      ) : (
        <p className="text-white/60">Chýba odkaz na obnovenie. Požiadaj o nový na stránke „Zabudnuté heslo“.</p>
      )}
    </Shell>
  );
}
