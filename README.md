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

Enable Email auth. Add the site URL and both `https://www.marketregular.com/auth/callback` and `https://marketregular.com/auth/callback` to Auth redirect URLs. For local Google sign-in also allow `http://localhost:3000/auth/callback`.

To turn on Continue with Google: create a Google Cloud OAuth 2.0 Web client, set the authorized redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`, then enable the Google provider in Supabase Auth with that client ID and secret.

Copy the project URL, anon key, and service role key into `.env.local` and Vercel env vars. Set `ADMIN_EMAILS` to your login email.

Regenerate seed SQL after editing `src/data/directory.ts`:

```bash
node --experimental-strip-types scripts/generate-seed-sql.ts
```

## Admin

`/admin` edits markets and vendors, moderates the feed, and approves listing claims. Shoppers sign in at `/login`. The desk only shows if you already have an admin session.

## What is seeded

31 Toronto farmers’ markets from `seed batches/toronto_markets_seed.json`, plus published vendor names from `seed batches/toronto_markets_vendor_names.json` where a roster exists. Menus and bios are left empty until we have them. Do not invent stall-holder details.

```bash
npm run seed:import   # refresh src/data/directory.ts from the JSON
npm run seed:sql      # regenerate supabase/seed.sql
```
