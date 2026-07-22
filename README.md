# Lets Split

A Splitwise-style expense sharing web app built with Next.js and Supabase. Track shared costs across groups, split bills equally or by exact amount/percentage, view balances, and record settlements.

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| UI | shadcn/ui |
| Database | Supabase Postgres (free tier) |
| Auth | Supabase Auth — Google OAuth + email magic link |
| Hosting | Vercel (free tier) |

### Why Supabase?

Supabase bundles Postgres, authentication, and row-level security in one free-tier platform. That avoids running a separate backend while still giving real multi-user data, policies, and OAuth — the fastest path to a working prototype.

## Features

- Sign in with Google or magic link
- Create groups and invite members via shareable link
- Add, view, and delete expenses
- Split modes: equal, exact amount, percentage
- Group and global balance summaries
- Record settlements between members
- Dashboard with summary cards and recent activity
- Demo data seeding for quick testing
- Responsive mobile/desktop UI

## Local setup

### 1. Clone and install

```bash
git clone <repo-url>
cd lets-split
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In **Project Settings → API**, copy the project URL and `anon` public key.

### 3. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run database migrations

In the Supabase **SQL Editor**, run the migration files in order under `supabase/migrations/` (at least `001_schema.sql`). Later expand-only migrations (`003`–`006`) add finance safety, settlement void, demo seed RPC, and **group delete** RLS — apply those before deploying app builds that depend on them.

### 5. Configure auth

**Magic link + email & password**

- In Supabase → Authentication → URL Configuration, set Site URL to `http://localhost:3000`.
- Add redirect URL: `http://localhost:3000/auth/callback`
- Prefer **Email & password** on the login screen when testing invites/signups — Supabase’s built-in mailer only allows about **2 emails/hour**, which causes `email rate limit exceeded` on magic links.
- For password signup without confirmation emails, set `SUPABASE_SERVICE_ROLE_KEY` in the server env (Vercel + `.env.local`). The app auto-confirms new users via the Admin API.
- For production magic links, configure **custom SMTP** in Supabase → Authentication → SMTP (Resend/SendGrid/etc.). That raises the email rate limit.

**SSO / OAuth (Google, Apple)**

Lets Split uses Supabase Auth’s industry-standard OAuth 2.0 / OpenID Connect providers (same pattern as most production apps). Magic link stays available as a fallback.

| Provider | App UI | Needs external console |
| --- | --- | --- |
| Magic link | Yes | Supabase email only |
| Google | Continue with Google | Google Cloud OAuth client |
| Apple | Continue with Apple | Apple Developer Program + Services ID |

Toggle which buttons appear with:

```bash
# .env.local / Vercel env
NEXT_PUBLIC_AUTH_PROVIDERS=magic,password,google,apple
```

**Google OAuth**

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/).
2. Authorized redirect URI (Supabase, not your app URL):
   ```
   https://bdtbqwipwyitqsflvphk.supabase.co/auth/v1/callback
   ```
3. Enable in Supabase → Authentication → Providers → Google, **or**:
   ```bash
   export SUPABASE_ACCESS_TOKEN=...
   export GOOGLE_CLIENT_ID=...
   export GOOGLE_CLIENT_SECRET=...
   npm run setup:google-oauth
   ```
4. Ensure app redirect allow-list includes:
   - `http://localhost:3000/auth/callback`
   - `https://lets-split-khaki.vercel.app/auth/callback`

**Apple Sign In**

1. Apple Developer → enable Sign In with Apple on an App ID.
2. Create a **Services ID**, set domains, and return URL:
   ```
   https://bdtbqwipwyitqsflvphk.supabase.co/auth/v1/callback
   ```
3. Create a Sign In with Apple key (`.p8`), then generate the client secret JWT (see Supabase Apple provider docs).
4. Enable in Supabase → Authentication → Providers → Apple, **or**:
   ```bash
   export SUPABASE_ACCESS_TOKEN=...
   export APPLE_CLIENT_ID=com.your.service.id
   export APPLE_SECRET=your-generated-jwt
   npm run setup:apple-oauth
   ```

Until a provider is enabled in Supabase, its button still shows but returns a clear “not enabled yet” message.

The app works fully with magic link only if Google/Apple credentials are not configured.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Seed demo data

After signing in, click **Load demo data** on the dashboard or settings page. This creates a sample group with expenses using the `seed_demo_for_user` SQL function.

For multi-user demo data, adapt `supabase/seed.sql` with real user UUIDs from `auth.users`.

## Deploy to Vercel

### Option A: One-command provisioning (recommended)

If you have API tokens, this script creates the Supabase project, runs migrations, configures auth redirects, sets Vercel env vars, and deploys:

```bash
export SUPABASE_ACCESS_TOKEN=your-supabase-token   # https://supabase.com/dashboard/account/tokens
export VERCEL_TOKEN=your-vercel-token             # https://vercel.com/account/tokens
npm run provision
```

### Option B: Manual setup

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL, e.g. `https://lets-split.vercel.app`)
4. Deploy.
5. Update Supabase auth redirect URLs to include your production callback URL.

### Option C: GitHub Actions

Add this repository secret, then pushes to `main` auto-deploy via Vercel:

- `VERCEL_TOKEN` — from https://vercel.com/account/tokens

Optional secrets (only if not already set on the Vercel project):

- `VERCEL_ORG_ID` — `team_y8J9l31Zrw2AcUljLqiOAHWW`
- `VERCEL_PROJECT_ID` — `prj_D0P5T7WOsv6cb7cnOER3NDnWZ010`

### Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth 2.0 Client ID (Web application).
2. Add authorized redirect URI:
   ```
   https://bdtbqwipwyitqsflvphk.supabase.co/auth/v1/callback
   ```
3. Run:
   ```bash
   export SUPABASE_ACCESS_TOKEN=your-token
   export GOOGLE_CLIENT_ID=your-client-id
   export GOOGLE_CLIENT_SECRET=your-client-secret
   npm run setup:google-oauth
   ```

Or enable manually in Supabase Dashboard → Authentication → Providers → Google.

### Apple Sign In

1. Configure Sign In with Apple (Services ID + key) in Apple Developer.
2. Return URL must be the Supabase callback above.
3. Run:
   ```bash
   export SUPABASE_ACCESS_TOKEN=your-token
   export APPLE_CLIENT_ID=com.your.service.id
   export APPLE_SECRET=your-client-secret-jwt
   npm run setup:apple-oauth
   ```

Or enable manually in Supabase Dashboard → Authentication → Providers → Apple.

## Project structure

```
src/
  app/              # Routes (dashboard, groups, expenses, auth)
  actions/          # Server actions
  components/       # UI components
  lib/
    balance/        # Balance calculation engine
    splits/         # Split mode calculator
    supabase/       # Supabase clients
supabase/
  migrations/       # SQL schema
  seed.sql          # Demo seed templates
```

## MVP limitations

- No receipt image upload
- No recurring expenses
- No realtime updates
- No push/email notifications
- Currency fixed to NZD in UI (schema supports per-expense currency)
- Pairwise debt simplification not implemented (net balances per member only)
- Invite flow uses shareable links (email sending not integrated)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
