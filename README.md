# MarketRegular

Greater Toronto Area farmers’ market hub: search markets and vendors (schedules, menus, contact, tags), leave on-site reviews and posts, and follow a live floor feed.

Web first at [www.marketregular.com](https://www.marketregular.com). Source: [github.com/localgovy/marketregular](https://github.com/localgovy/marketregular). The same Supabase backend is meant to serve an iOS app later.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Vercel hosting
- Supabase (Postgres, Auth, Realtime, Storage, PostGIS)
- MapLibre via OpenFreeMap

The public directory works from the bundled Toronto seed data until a Supabase project is connected. Auth, live posts, reviews, photos, admin, and vendor or market accounts require Supabase.

Launch covers Toronto and nearby halls currently published in the directory.
The homepage census counts every published market, stall, and menu item — not a
city allowlist — so new cities are included as soon as they are published.

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

Google’s consent screen names the host of the Auth callback (`redirect_uri`), not this site’s `/auth/callback`. That callback must stay `https://auth.marketregular.com/auth/v1/callback`. Continue with Google refuses to open Google when the callback host is anything else, including `*.supabase.co`. DNS for `auth` is in [DOMAIN.md](DOMAIN.md). App name **MarketRegular** on that screen also needs the published Google brand (home `https://www.marketregular.com`, privacy `/privacy`, terms `/terms`).

**Authorized JavaScript origins**

- `https://www.marketregular.com`
- `https://marketregular.com`
- `http://localhost:3000` (local only)

**Authorized redirect URIs**

- `https://auth.marketregular.com/auth/v1/callback`
- `http://127.0.0.1:54321/auth/v1/callback` (local Supabase only)

Do not add `https://<project-ref>.supabase.co/auth/v1/callback`. Google would show that host on the consent screen.

Copy the project URL, anon key, and service role key into `.env.local` and Vercel env vars.

Grant admin in SQL (once), not via an env allow-list:

```sql
update public.profiles
set role = 'admin'
where id = '<auth user uuid>';
```

New accounts (and existing ones without a handle) go to `/onboarding` after sign-in: unique `@handle`, three favorite markets, then a short how-to. Optional visit-plan mail uses `RESEND_API_KEY` and `RESEND_FROM` — see [DOMAIN.md](DOMAIN.md).

### Hosted Auth before a public launch

Local `supabase/config.toml` is not production. In the hosted project:

1. Authentication → Providers → Email: leave **Confirm email** off so new accounts can sign in without a mail
2. Authentication → Attack protection: **Leaked password protection** on
3. Minimum password length **8** (the app already rejects shorter)
4. Authentication → Email Templates: password reset links must hit `/auth/confirm` with the token hash so the original tab is not required. Site URL stays `https://www.marketregular.com`.

Reset password (`type=recovery`):

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a>
```

Regenerate seed SQL after editing `src/data/directory.ts`:

```bash
node --experimental-strip-types scripts/generate-seed-sql.ts
```

## Admin

`/admin` edits markets and vendors, moderates the feed, and assigns stalls and markets to portal accounts. Shoppers sign in at `/login`. Vendors and markets create accounts at `/vendor` and `/market`. Admin only shows if `profiles.role` is `admin`.

## What is seeded

The live catalog covers the Greater Toronto Area: markets across Toronto, Peel, York, Durham, and Halton, with vendor rosters wherever an operator publishes one. Markets with no published roster stay empty rather than guessing. Menus and bios are left empty until we have them. Do not invent stall-holder details.

`src/data/directory.ts` and `supabase/seed.sql` hold the bundled Toronto-only fallback used when Supabase is unconfigured; they are not a mirror of the live catalog.

```bash
npm run seed:import   # refresh src/data/directory.ts from the JSON
npm run seed:sql      # regenerate supabase/seed.sql
```
