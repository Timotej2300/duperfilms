import Link from "next/link";
import { Shell } from "@/components/Shell";
import { SimpleForm } from "@/components/SimpleForm";

export const metadata = { title: "Zabudnuté heslo" };

export default function ForgotPage() {
  return (
    <Shell title="Zabudnuté heslo">
      <p className="text-sm text-white/60">Zadaj e-mail a pošleme ti odkaz na obnovenie hesla.</p>
      <SimpleForm endpoint="/api/auth/forgot" submitLabel="Poslať odkaz" fields={[{ name: "email", label: "E-mail", type: "email", autoComplete: "email" }]} />
      <Link href="/login" className="block text-center text-sm text-white/60 underline">Späť na prihlásenie</Link>
    </Shell>
  );
}
