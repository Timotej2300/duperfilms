import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { getUserPlan } from "@/lib/entitlements";
import { Logo } from "@/components/Logo";
import { ProfilePicker } from "@/components/ProfilePicker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kto sleduje?" };

export default async function ProfilesPage() {
  const user = await requireUser();
  const [profiles, plan] = await Promise.all([
    db.profile.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, avatar: true, isKids: true, pinHash: true },
    }),
    getUserPlan(user.id),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-10">
        <Logo size="md" />
      </div>
      <ProfilePicker
        profiles={profiles.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, isKids: p.isKids, hasPin: !!p.pinHash }))}
        canAdd={profiles.length < plan.maxProfiles}
      />
    </main>
  );
}
