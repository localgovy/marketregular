# MarketRegular

Toronto farmers’ market hub: search markets and vendors (schedules, menus, contact, tags), leave on-site reviews and posts, and follow a live floor feed.

Web first at [www.marketregular.com](https://www.marketregular.com). Source: [github.com/localgovy/marketregular](https://github.com/localgovy/marketregular). The same Supabase backend is meant to serve an iOS app later.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Vercel hosting
- Supabase (Postgres, Auth, Realtime, Storage, PostGIS)
- MapLibre via OpenFreeMap

The public directory works from the bundled Toronto seed data until a Supabase project is connected. Auth, live posts, reviews, photos, admin, and vendor claims require Supabase.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Domain

See [DOMAIN.md](DOMAIN.md) for NamesLink → Vercel DNS (A on `@`, CNAME on `www`, Proxy off) and Google Search Console. Import the GitHub repo into Vercel first so you have a project to attach the domain to.

## Supabase

Create a `marketregular` project in the Canada region (`ca-central-1` if available). Then:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
npx supabase db query --linked < supabase/seed.sql
```

(`db query` command names vary by CLI version; you can also paste `supabase/seed.sql` into the SQL editor.)

Enable Email auth. In [URL Configuration](https://supabase.com/dashboard/project/pxsndrlptceafhsxfays/auth/url-configuration) set **Site URL** to `https://www.marketregular.com` — never localhost. Site URL is where Google sends people when a redirect is missing or not allowed, so localhost here dumps live sign-in onto your laptop.

Redirect URLs (localhost only on this list, not as Site URL):

- `https://www.marketregular.com/**`
- `https://marketregular.com/**`
- `http://localhost:3000/**`
- `http://127.0.0.1:3000/**`

To turn on Continue with Google: create a Google Cloud OAuth 2.0 Web client, then enable the Google provider in Supabase Auth with that client ID and secret.

On that same Web client, keep the Supabase callback and add the MarketRegular callbacks. Google’s account picker shows the host of the redirect URI, so without these the screen still says `supabase.co`.

**Authorized JavaScript origins**

- `https://www.marketregular.com`
- `https://marketregular.com`
- `http://localhost:3000` (local only)

**Authorized redirect URIs**

- `https://<project-ref>.supabase.co/auth/v1/callback` (keep this)
- `https://www.marketregular.com/auth/callback`
- `https://marketregular.com/auth/callback`
- `http://localhost:3000/auth/callback` (local only)
- `http://127.0.0.1:3000/auth/callback` (local only)

Copy the project URL, anon key, and service role key into `.env.local` and Vercel env vars.

Grant the desk in SQL (once), not via an env allow-list:

```sql
update public.profiles
set role = 'admin'
where id = '<auth user uuid>';
```

New accounts (and existing ones without a handle) go to `/onboarding` after sign-in: unique `@handle`, three favorite markets, then a short how-to. Optional visit-plan mail uses `RESEND_API_KEY` and `RESEND_FROM` — see [DOMAIN.md](DOMAIN.md).

### Hosted Auth before a public launch

Local `supabase/config.toml` is not production. In the hosted project:

1. Authentication → Providers → Email: turn **Confirm email** on
2. Authentication → Attack protection: **Leaked password protection** on
3. Minimum password length **8** (the app already rejects shorter)

Regenerate seed SQL after editing `src/data/directory.ts`:

```bash
node --experimental-strip-types scripts/generate-seed-sql.ts
```

## Admin

`/admin` edits markets and vendors, moderates the feed, and approves listing claims. Shoppers sign in at `/login`. The desk only shows if `profiles.role` is `admin`.

## What is seeded

31 Toronto farmers’ markets from `seed batches/toronto_markets_seed.json`, plus published vendor names from `seed batches/toronto_markets_vendor_names.json` where a roster exists. Menus and bios are left empty until we have them. Do not invent stall-holder details.

```bash
npm run seed:import   # refresh src/data/directory.ts from the JSON
npm run seed:sql      # regenerate supabase/seed.sql
```
