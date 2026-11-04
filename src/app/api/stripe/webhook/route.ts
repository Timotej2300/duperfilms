import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const periodEnd = (sub: Stripe.Subscription) => {
  const item = sub.items.data[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const ts = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return ts ? new Date(ts * 1000) : null;
};

const mapStatus = (s: Stripe.Subscription.Status) =>
  s === "active" || s === "trialing" ? "ACTIVE" : s === "past_due" || s === "unpaid" ? "PAST_DUE" : s === "canceled" ? "CANCELED" : "EXPIRED";

async function syncSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  const planId = Number(sub.metadata?.planId);
  if (!userId || !planId) return;
  const data = {
    status: mapStatus(sub.status) as "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED",
    currentPeriodEnd: periodEnd(sub),
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
  };
  await db.subscription.upsert({
    where: { stripeSubId: sub.id },
    update: data,
    create: { userId, planId, stripeSubId: sub.id, ...data },
  });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "Chýba podpis" }, { status: 400 });

  // Podpis sa overuje nad surovým telom
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Neplatný podpis" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;

    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      const subId = (inv as unknown as { subscription?: string }).subscription
        ?? (inv as unknown as { parent?: { subscription_details?: { subscription?: string } } }).parent?.subscription_details?.subscription;
      const sub = subId ? await db.subscription.findUnique({ where: { stripeSubId: subId } }) : null;
      const userId = sub?.userId
        ?? (inv.customer
          ? (await db.subscription.findFirst({ where: { stripeCustomerId: String(inv.customer) } }))?.userId
          : undefined);
      if (userId) {
        // stripeEventId je unique → duplicitné doručenie webhooku je idempotentné
        await db.payment.upsert({
          where: { stripeEventId: event.id },
          update: {},
          create: {
            userId, stripeEventId: event.id, stripeInvoiceId: inv.id,
            amountCents: inv.amount_paid, currency: inv.currency.toUpperCase(), status: "paid",
          },
        });
        await db.notification.create({
          data: { userId, title: "Platba prijatá", body: `Ďakujeme, platba ${(inv.amount_paid / 100).toFixed(2)} € bola prijatá.` },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const sub = await db.subscription.findFirst({ where: { stripeCustomerId: String(inv.customer) }, orderBy: { createdAt: "desc" } });
      if (sub) {
        await db.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
        await db.notification.create({ data: { userId: sub.userId, title: "Platba zlyhala", body: "Platbu za predplatné sa nepodarilo stiahnuť. Aktualizuj platobnú metódu." } });
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}
