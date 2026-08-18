# Point marketregular.com at Vercel (NamesLink)

Keep DNS at NamesLink. Do **not** change nameservers. Do **not** enable NamesLink Proxy / SA on these records — that breaks Vercel SSL.

## 1. Deploy the app

Connect this GitHub repo to a Vercel project and deploy. You should get a `*.vercel.app` URL first.

## 2. Add the domain in Vercel

Project → **Settings** → **Domains** → add:

- `marketregular.com`
- `www.marketregular.com`

Set **marketregular.com** as the primary domain and redirect `www` → apex.

Copy the exact values from the Vercel domain card. They are usually:

| Host | Type | Value |
| --- | --- | --- |
| `@` | A | `10.0.1.2` |
| `www` | CNAME | `cname.vercel-dns.com` (or a `*.vercel-dns-*.com` host Vercel prints) |

## 3. Add records in NamesLink

1. Log in to NamesLink → **Domain Management** → **My Domains** → `marketregular.com` → **Manage** → **DNS Records**
2. Delete leftover parking A/CNAME records for `@` and `www` if they conflict
3. Add the two records above
4. TTL 300–600 while you verify
5. Leave **Proxy** off

## 4. Verify

```bash
dig A marketregular.com +short
dig CNAME www.marketregular.com +short
```

The Vercel domain card should flip to **Valid Configuration**. A brand-new domain can take minutes to a day at the registry.

## Email later

When you add email (NamesLink Business Email or Google Workspace), add MX/TXT at NamesLink. Do not put a CNAME on `@` — it cannot coexist with MX.
