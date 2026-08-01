# Meridian Partners

Modern redesign of [mplaw.nz](https://mplaw.nz) — an Auckland barristers & solicitors marketing site.

This app lives alongside the root **Lets Split** project and does not replace it.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Static content modules (`src/content/`)
- Server Actions for contact / consultation forms (optional Resend email)

## Local development

```bash
cd meridian-partners
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local` if you want form emails via Resend:

- `NEXT_PUBLIC_SITE_URL` — canonical site URL
- `RESEND_API_KEY` — optional; without it, form submissions succeed in demo mode (logged server-side)
- `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` — optional Resend routing

## Deploy (Vercel)

Set the Vercel project **Root Directory** to `meridian-partners`, then deploy. Or from this folder:

```bash
npx vercel
```

## Pages

- `/` Home
- `/about` Team overview
- `/team/[slug]` Lawyer profiles
- `/services` + `/services/[slug]` Practice areas
- `/notary` Notary Public
- `/articles` + `/articles/[slug]` Insights
- `/contact` Contact form
- `/book` Free consultation booking
