import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiAuth } from "@/lib/guard";
import { getStripe, siteUrl } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ planKey: z.string().min(1).max(50), coupon: z.string().trim().max(50).optional() });

export async function POST(req: Request) {
  const auth = await apiAuth(req);
  if (auth.error) return auth.error;
  if (!process.env.STRIPE_SECRET_KEY)
    return NextResponse.json({ error: "Platby ešte nie sú nakonfigurované" }, { status: 503 });
  if (!(await rateLimit(`checkout:${auth.user.id}`, 10, 600)))
    return NextResponse.json({ error: "Príliš veľa pokusov" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neplatné údaje" }, { status: 400 });

  // Cena sa berie VÝHRADNE z DB – klient neposiela sumu
  const plan = await db.subscriptionPlan.findFirst({ where: { key: parsed.data.planKey, isActive: true } });
  if (!plan || plan.priceCents === 0)
    return NextResponse.json({ error: "Plán nie je dostupný" }, { status: 400 });

  const stripe = getStripe();
  const lastSub = await db.subscription.findFirst({
    where: { userId: auth.user.id, stripeCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  let discounts: { coupon: string }[] | undefined;
  if (parsed.data.coupon) {
    const c = await db.coupon.findUnique({ where: { code: parsed.data.coupon.toUpperCase() } });
    const valid = c && c.isActive && (!c.expiresAt || c.expiresAt > new Date()) && (c.maxUses == null || c.used < c.maxUses);
    if (!valid) return NextResponse.json({ error: "Neplatný kupón" }, { status: 400 });
    const sc = await stripe.coupons.create({ percent_off: c.percentOff, duration: "once", name: c.code });
    discounts = [{ coupon: sc.id }];
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: plan.stripePriceId
      ? [{ price: plan.stripePriceId, quantity: 1 }]
      : [{
          quantity: 1,
          price_data: {
            currency: plan.currency.toLowerCase(),
            unit_amount: plan.priceCents,
            recurring: { interval: "month", interval_count: plan.intervalMonths },
            product_data: { name: `DuperFilms ${plan.name}` },
          },
        }],
    ...(lastSub?.stripeCustomerId ? { customer: lastSub.stripeCustomerId } : { customer_email: auth.user.email }),
    ...(discounts ? { discounts } : {}),
    client_reference_id: auth.user.id,
    metadata: { userId: auth.user.id, planId: String(plan.id) },
    subscription_data: { metadata: { userId: auth.user.id, planId: String(plan.id) } },
    success_url: `${siteUrl()}/plans?status=success`,
    cancel_url: `${siteUrl()}/plans?status=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
