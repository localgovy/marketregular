# Domain, DNS, and Google Search

Keep DNS at NamesLink. Do **not** change nameservers (`ns1.nameslink.com` / `ns2.nameslink.com`). Do **not** enable NamesLink Proxy / SA on these records — that breaks Vercel SSL.

Live canonical host is **www.marketregular.com**. Apex (`marketregular.com`) 308s to `www`. Sitemap URLs, Open Graph, and canonical tags must use `www`.

## 1. Vercel project and domains

The app lives at [github.com/localgovy/marketregular](https://github.com/localgovy/marketregular).

1. Log in at [vercel.com](https://vercel.com)
2. Import `localgovy/marketregular` and deploy
3. Settings → **Domains** → add `marketregular.com` and `www.marketregular.com`
4. Set **www.marketregular.com** as the primary domain so apex redirects to `www`
5. Env: `NEXT_PUBLIC_SITE_URL=https://www.marketregular.com` (and the Supabase keys from `.env.example`)

Copy the exact A / CNAME values from the Vercel domain card. They change. Do not reuse an old IP from a gist.

## 2. NamesLink records

1. NamesLink → **Domain Management** → `marketregular.com` → **Manage** → **DNS Records**
2. Delete leftover parking A/CNAME records for `@` and `www` if they conflict
3. Add the records Vercel prints, typically:

| Host | Type | Value |
| --- | --- | --- |
| `@` | A | *(from the Vercel domain card)* |
| `www` | CNAME | `cname.vercel-dns.com` or the `*.vercel-dns-*.com` host Vercel prints |

4. TTL 300–600 while you verify
5. Leave **Proxy** off

```bash
dig A marketregular.com +short
dig CNAME www.marketregular.com +short
```

The Vercel domain card should flip to **Valid Configuration**.

## 3. Google Search Console

Use a **Domain** property so Google tracks both `www` and apex in one place.

1. Open [Google Search Console](https://search.google.com/search-console)
2. **Add property** → **Domain** → `marketregular.com`
3. Copy the TXT value. It looks like `google-site-verification=…`
4. NamesLink DNS → add a TXT record:

| Host | Type | Value |
| --- | --- | --- |
| `@` | TXT | the full string Google gave you |

5. Wait a few minutes (sometimes longer), then click **Verify**
6. **Indexing → Sitemaps** → submit `https://www.marketregular.com/sitemap.xml`
7. **URL inspection** → `https://www.marketregular.com/` → **Request indexing**

Do not paste the TXT string into the app. DNS is the Domain-property method.

Optional backup: a URL-prefix property (`https://www.marketregular.com`) can also use an HTML meta tag. Put the token (the part after `content=`) in Vercel as `GOOGLE_SITE_VERIFICATION` and redeploy. The app already emits that meta tag when the env var is set.

Public crawl files after deploy:

- `https://www.marketregular.com/robots.txt`
- `https://www.marketregular.com/sitemap.xml`

## Email later

When you add email (NamesLink Business Email or Google Workspace), add MX/TXT at NamesLink. Do not put a CNAME on `@` — it cannot coexist with MX. The existing A record on `@` is fine next to MX.

**Sending** “this week’s hours” from the app uses [Resend](https://resend.com). That needs DKIM CNAMEs Resend prints for `marketregular.com` (not MX). Until the domain is verified, Resend only delivers to the email that owns the API key. Set `RESEND_API_KEY` and `RESEND_FROM` (for example `MarketRegular <hello@marketregular.com>`) in Vercel after verify.
