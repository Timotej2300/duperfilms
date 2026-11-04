import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Registrácia" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
