# Market Regular

Canada-wide farmers’ market hub: search markets and vendors (schedules, menus, contact, tags), leave on-site reviews and posts, and follow a live floor feed.

Web first at [marketregular.com](https://marketregular.com). Source: [github.com/localgovy/marketregular](https://github.com/localgovy/marketregular). The same Supabase backend is meant to serve an iOS app later.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Vercel hosting
- Supabase (Postgres, Auth, Realtime, Storage, PostGIS)
- MapLibre via OpenFreeMap

The public directory works from the bundled Canadian seed data until a Supabase project is connected. Auth, live posts, reviews, photos, admin, and vendor claims require Supabase.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Domain

See [DOMAIN.md](DOMAIN.md) for NamesLink → Vercel DNS (A on `@`, CNAME on `www`, Proxy off). Import the GitHub repo into Vercel first so you have a project to attach the domain to.

## Supabase

This account already has two free projects, so a third `marketregular` project could not be created automatically. Either pause/upgrade an existing project, or create `marketregular` after a slot is free (Canada region `ca-central-1` if available).

Then:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
npx supabase db query --linked < supabase/seed.sql
```

(`db query` command names vary by CLI version; you can also paste `supabase/seed.sql` into the SQL editor.)

Enable Email auth (and Google later). Add the site URL and `https://marketregular.com/auth/callback` to Auth redirect URLs.

Copy the project URL, anon key, and service role key into `.env.local` and Vercel env vars. Set `ADMIN_EMAILS` to your login email.

Regenerate seed SQL after editing `src/data/directory.ts`:

```bash
node --experimental-strip-types scripts/generate-seed-sql.ts
```

## Admin

Sign in with an `ADMIN_EMAILS` address, then open `/admin` to edit markets/vendors, moderate the feed, and approve listing claims.

## What is seeded

22 markets from St. John’s to Whitehorse, plus fictional example vendors and menus (so we are not publishing real stall-holders without consent). Swap those for real vendors from `/admin`.
