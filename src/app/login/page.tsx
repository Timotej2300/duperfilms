import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Prihlásenie" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
