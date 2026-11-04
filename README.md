# DuperFilms

Streamovacia platforma: Next.js (App Router) + TypeScript + Tailwind + Prisma + MySQL.

## Rýchly štart

```bash
npm install
cp .env.example .env        # doplň hodnoty (nikdy necommituj .env)
npx prisma generate
npx prisma migrate dev --name init
SEED_OWNER_EMAIL=ty@example.com SEED_OWNER_PASSWORD='min-12-znakov' npm run db:seed
npm run dev
```

Prihlás sa ako Owner a otvor `/admin`.

## Premenné prostredia

| Premenná | Popis |
|---|---|
| `DATABASE_URL` | MySQL (Aiven: pridaj `?sslaccept=accept_invalid_certs`, neskôr CA certifikát) |
| `NEXT_PUBLIC_SITE_URL` | `https://duperfilms.eu` |
| `SESSION_SECRET` | náhodný reťazec min. 32 znakov |
| `RESEND_API_KEY`, `EMAIL_FROM` | e-maily (overenie, obnova hesla) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | platby |

## Stripe webhook

Endpoint: `https://duperfilms.eu/api/stripe/webhook`
Udalosti: `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`.
Premium status mení výhradne webhook.

## Nasadenie (Vercel)

1. Importuj GitHub repozitár do Vercelu.
2. Nastav premenné prostredia (vyššie).
3. Build command: `npm run build`. Migrácie na produkcii: `npx prisma migrate deploy`.
4. Pridaj doménu `duperfilms.eu` a nastav DNS podľa Vercelu.
5. Pre Resend over doménu (SPF/DKIM) kvôli odosielaniu z `support@duperfilms.eu`.

## Bezpečnosť

- Heslá: argon2id; sessions: náhodný token v `httpOnly` cookie, v DB iba SHA-256 hash.
- CSRF: kontrola `Origin` pri všetkých mutujúcich požiadavkách + `SameSite=Lax`.
- Rate limiting v DB (prihlásenie, registrácia, reset hesla, PIN, vyhľadávanie, platby).
- Oprávnenia a Premium obsah sa kontrolujú na serveri; admin API má kontrolu oprávnení + audit log.
- Validácia vstupov cez Zod, Prisma (parametrizované dotazy), obsah stránok sa vykresľuje ako text.
- Obsah: používaj iba videá a obrázky, ku ktorým máš práva.

## Čo ešte nie je hotové

- Nahrávanie súborov: plagáty/videá sa zadávajú ako URL (odporúčané: Bunny Stream / Mux / Vercel Blob).
- Prekladové súbory SK/CZ/EN (UI je zatiaľ po slovensky).
- Automatizované testy.
