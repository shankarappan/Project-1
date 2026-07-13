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

In the Supabase **SQL Editor**, run the contents of:

```
supabase/migrations/001_schema.sql
```

This creates all tables, triggers, RLS policies, and the demo seed function.

### 5. Configure auth

**Magic link (works out of the box)**

- In Supabase → Authentication → URL Configuration, set Site URL to `http://localhost:3000`.
- Add redirect URL: `http://localhost:3000/auth/callback`

**Google OAuth (optional)**

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/).
2. Add authorized redirect URI from Supabase (Authentication → Providers → Google).
3. Add Client ID and Secret in Supabase Google provider settings.
4. Redirect URLs:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://your-app.vercel.app/auth/callback`

The app works fully with magic link only if Google credentials are not configured.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Seed demo data

After signing in, click **Load demo data** on the dashboard or settings page. This creates a sample group with expenses using the `seed_demo_for_user` SQL function.

For multi-user demo data, adapt `supabase/seed.sql` with real user UUIDs from `auth.users`.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL, e.g. `https://lets-split.vercel.app`)
4. Deploy.
5. Update Supabase auth redirect URLs to include your production callback URL.

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
