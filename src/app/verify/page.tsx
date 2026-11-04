import { Shell } from "@/components/Shell";
import { VerifyClient } from "@/components/VerifyClient";

export const metadata = { title: "Overenie e-mailu" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <Shell title="Overenie e-mailu">
      <VerifyClient token={token} />
    </Shell>
  );
}
