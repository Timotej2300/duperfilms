import "server-only";
import { db } from "./db";

/** Aktuálny plán používateľa. Určuje sa výhradne zo serverovej DB (aktualizuje ju len Stripe webhook). */
export async function getUserPlan(userId: string) {
  const sub = await db.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  if (sub) return sub.plan;
  return db.subscriptionPlan.findUniqueOrThrow({ where: { key: "free" } });
}

export function publishedWhere() {
  const now = new Date();
  return {
    OR: [
      { visibility: "PUBLISHED" as const },
      { visibility: "SCHEDULED" as const, publishAt: { lte: now } },
    ],
  };
}
