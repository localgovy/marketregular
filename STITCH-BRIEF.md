# MarketRegular — Google Stitch brief

Paste **Part A** into every Stitch prompt. Then paste **one screen from Part C** at a time. Export desktop **and** mobile for each screen. Do not ask Stitch to invent a new product — it is restyling an existing web app.

When you bring the exports back, I will implement them in the Next.js app. Export PNG/WebP plus any Stitch share links. Name files: `01-home-desktop.png`, `01-home-mobile.png`, etc.

---

## Part A — paste this first, every time

You are designing **MarketRegular**, a Canadian public-market floor guide. Not a grocery app, not a farm-to-table restaurant, not a CSA startup, not Airbnb for farms.

It is the thing a regular would keep open on their phone while walking a shed: who is here, what is on the tables, whether to bother crossing town, and a live tape of people who are physically at a stall right now.

**Product in one sentence:** A Canada-wide directory of farmers’ markets and vendors (hours, maps, menus, phones, tags) plus on-site-only posts and reviews that appear on a live homepage feed.

**Brand name:** MarketRegular  
**Canonical URL:** www.marketregular.com  
**Tone of voice (UI copy must follow):** dry, specific, municipal-meets-chalkboard. Short sentences. Name the fruit. Name the city. Never “discover”, “journey”, “seamless”, “your community”, “farm-to-table made easy”, “freshness you can trust”, or “join thousands”.

**Positioning:** Saturday 8:12 a.m. inside a public market building. Butcher paper, stall numbers, price stickers, a chalkboard with the day’s fish, a rubber inspection stamp. Utilitarian and full. You scan it like a stall map, you do not land in a hero.

### Aesthetic (do this)

- Newspaper directory × municipal wayfinding × chalkboard. Dense. Lots to read and tap.
- Hairline rules, not floating cards. Ink on paper. One inverted “chalkboard” block per screen max.
- Stall-number plates, rubber-stamp badges, price-sticker labels, enamel signs.
- Photography only if needed: close, slightly underexposed produce or market interiors. No smiling couples with tote bags in golden hour. No drizzle-honey pour shots. No drone-over-barn.
- Bilingual crumbs on Quebec markets (Marché Jean-Talon, Marché Atwater): small `FR` / `EN` is enough.
- Canadian without a maple leaf. Specificity does the work: province codes, stall numbers, “open now in Halifax”.

### Forbidden (generic AI / generic farm-tech — reject if you start doing these)

- Maple leaves, barns, watercolour veg, line-art carrots, bouncing produce illustrations
- Sage + cream + terracotta palettes, terracotta “organic” buttons, beige blobs
- Inter, Roboto, Poppins, Montserrat, Nunito, Geist, Fraunces, Instrument Serif, Playfair, DM Serif
- Large rounded-2xl cards, heavy drop shadows, glassmorphism, purple/indigo gradients
- Empty hero with a headline, a subtitle, and three feature columns
- Soft gradient meshes, aurora backgrounds, fake 3D clay
- Dashboard-SaaS sidebars on consumer pages
- Generic avatars in circles as the main visual
- “Get started” as the primary action on the homepage
- Stock lifestyle photography, AI-looking faces, perfect fruit in studio light
- Cute mascots, badges that say “eco” / “sustainable” as decoration
- Dark mode (this product is paper and chalk; light only)

### Type

Use only:

- **IBM Plex Serif** — names of markets, page titles, the live-feed sentences
- **IBM Plex Sans** — UI, filters, body, navigation
- **IBM Plex Mono** — stall numbers, times (`08:00–15:00`), prices (`$8.50`), province codes (`ON`), “ON SITE”, timestamps (`11m`)

No other fonts. Tight tracking on mono labels. Headlines can be a little tight, not fashion-wide.

### Colour (hex — do not drift)

| Token | Hex | Use |
| --- | --- | --- |
| Paper | `#F1EDE3` | Page background (butcher paper) |
| Tile | `#E4DFD3` | Alternate bands, table rows |
| Ink | `#141414` | Type |
| Rule | `#C9C2B3` | 1px dividers |
| Board | `#24352B` | One chalkboard block (live tape header, check-in) |
| Chalk | `#EFE7D6` | Type on Board |
| Ticket | `#C9A227` | Price stickers, “open now” |
| Stamp | `#B42318` | ON SITE stamp, alerts, sold-out |
| Zinc | `#5C7A86` | Links, map pins, secondary actions |
| Plate | `#1F1F1F` | Stall-number enamel plate (white mono type on it) |

Buttons: primary = Board fill, Chalk type, **0–2px radius**. Secondary = invisible with underline or a 1px Rule outline. Never pill-shaped.

Radius: **0px default**, 2px on inputs max. Corners of a stall plate are square.

### Layout density

Plain does **not** mean empty. Every screen should feel like there is too much market to see in one glance — in a good way:

- Multiple independent modules on screen at once (tape, open-now, search, map, check-in)
- Lists you can scan: hours, vendors, prices, posts
- Persistent tiny “season line” in the header: `Week of 18 Aug · peaches · tomatoes · first corn`
- No decorative whitespace bigger than 48px between modules on desktop
- Mobile is a vertical stack of the same modules, not a simplified “app that hid the useful stuff”

### Logo / chrome

- Wordmark: **MarketRegular** as one word. No space. No icon required.
- Optional mark: a square enamel plate `MR` in Plex Mono, white on Plate. Not a leaf.
- Header, left to right: wordmark · season line · Search · Sign in. No hamburger on desktop.
- Footer: one line, small: `MarketRegular — a floor guide for Canadian public markets.` plus Find a market · Vendors.
- Favicon: the `MR` plate.

### Interaction language (name things like a market, not a SaaS)

| Don’t say | Do say |
| --- | --- |
| Feed / social / stories | Floor tape / live from the floor |
| Check in | Stamp in / you’re on the floor |
| Discover markets | Find a market |
| Listings | Stall / shed / hall |
| Content | What’s on the tables |
| Users | Regulars |
| Verified | ON SITE (rubber stamp) |
| Featured | On the way / open now |
| Dashboard | Desk (admin only) |

ON SITE is a **red rectangular rubber stamp**, slightly crooked 2°, not a green checkmark.

---

## Part B — product facts Stitch must not contradict

**Who uses it**

1. A person planning Saturday: search by province, city, day, tag, open-now, map.
2. A person physically at a market: GPS must match the geofence or they cannot post/review. We store a yes/no, never their pin.
3. You (admin) later: edit markets/vendors, moderate tape, approve stall claims.
4. A vendor later: claim a stall, edit menu/hours.

**Real data to use in mockups** (do not invent Californian farms)

Markets: St. Lawrence Market (Toronto), Evergreen Brick Works, ByWard Market (Ottawa), Granville Island Public Market, Trout Lake, Moss Street (Victoria), Calgary Farmers’ Market, Old Strathcona (Edmonton), Marché Jean-Talon, Marché Atwater, Halifax Seaport, Saint John City Market, Boyce (Fredericton), The Forks (Winnipeg), Regina Farmers’ Market, Saskatoon Farmers’ Market, Charlottetown, St. John’s, Fireweed (Whitehorse), Hamilton, Kitchener, Covent Garden (London ON).

Vendors (fictional, keep these names): Red Barn Roots, Maple Hearth Bakery, Loon Lake Honey, Twin River Dairy, Shoreline Smokehouse, Kootenay Greens, Island Shellfish, Crowfoot Flowers, Prairie Loaf, Gaspésie Catch, Île d’Orléans Preserves, Fundy Orchard, Red River Meats, Sable Shore Knit, Yukon Gold Plot.

Example floor posts (keep this voice):

- “Peaches just landed at the Niagara stall. Line is moving. Bring cash and a tote.”
- “Spot prawns are out at Island Shellfish. They’re going fast.”
- “First field strawberries on the Henri-Julien side. Smell them before you pay.”

Hours like: `Sat 05:00–15:00 · Farmers’ market in the North Market`

Prices like: `Country loaf $8 · Chèvre $11 · Oysters (dozen) $24`

Tags as small mono plates, not pastel chips: `PRODUCE` `INDOOR` `YEAR-ROUND`

**Primary user jobs on the consumer site**

- Search / filter / map
- Open a market: hours, map, vendors, about, phone, website, reviews, floor posts
- Open a vendor: about, menu, which markets, reviews
- Stamp in when GPS matches; write a floor post (optional photos) or a review (1–5)
- Sign in (email/password, magic link, Google)
- Claim a listing (short evidence form)

Do not design onboarding carousels, points, streaks, stories, DMs, or a shoppable checkout.

---

## Part C — screens (one prompt each)

After Part A, add: `Design this single screen at 1440×900 and 390×844. Show real content, not placeholders. Light mode. Pixel-dense. English UI, with FR labels only where noted.`

### 01 — Home (`/`)

The densest screen. Not a marketing landing page. A working floor.

**Desktop, top to bottom / columns:**

1. Header with season line: `Week of 18 Aug · peaches · tomatoes · first corn`
2. A thin **open-now ticker**: horizontal strip of market names + city that are open in their local timezone, ticket-yellow dot. Tappable.
3. **Find** module: one search field `Market, vendor, city, or tomato` plus compact selects: province, city, day, tag, checkbox `Open now`, button `Search`. This is a tool, not a hero.
4. Two columns:
   - **Left, 60% — Floor tape.** Section label on the chalkboard block: `LIVE FROM THE FLOOR`. A running list, newest first. Each item is a sentence, not a card: name · `at` · market name (link) · mono timestamp · the post · red ON SITE stamp. Photos if present sit under the sentence as small contact sheets, not Instagram squares with captions.
   - **Right, 40%:**
     - **Stamp-in panel** (chalkboard or plate): if not at a market, copy: `On the floor? Share location. We keep a yes/no, not your pin.` Button: `Use my location`. If at St. Lawrence: `YOU’RE AT` / `St. Lawrence Market` / `180 m from the pin` / toggle `Floor post` | `Review` / textarea / `Post to the tape`.
     - **On the way:** 4 markets as a tight index, not cards: name, city + province code, next open (`Open now` or `Sat 08:00`), 3 mono tags. No photos required.

**Mobile:** ticker → find → stamp-in (collapsed to one line if not located) → tape → on the way.

No full-bleed hero image. No “Canada’s farmers’ markets, in season.” as a 72px poster title taking half the viewport — that line can exist at newspaper-headline size **above the find module**, then get out of the way.

### 02 — Find / search (`/search`)

A working atlas.

- Same find module, filled with example filters: Province `NS`, Open now off, query empty.
- Count in mono: `22 markets · 15 vendors`
- **Map** on top or left: pale paper map, zinc pins, no Google-blue. Clicking a pin shows a tiny plate: market name + city.
- **Two indexes below or beside:** Markets list (dense rows) and Vendors list. Rows, not cards: name / city / next hours / tags.
- Empty filter state: `No stalls match. Loosen the day or the province.`

### 03 — Market (`/markets/st-lawrence-market`)

This is the “you might actually go” page. Lots to see.

**Title block:** city + `ON` in mono, then `St. Lawrence Market` in Plex Serif. Tag plates. A small enamel stall-building plate `NORTH MARKET`.

**Left:**

- Map of the pin (small)
- About — 2–4 sentences, newspaper body
- **Vendors in this hall** — a table: stall # · name · days (`Sat` or `Tue–Sat`) · 1–2 tags. Each name links.
- **Reviews** — `5.0 / 5 · 1 on-site`. Quotes, not star-gif animations. ON SITE stamp beside verified ones.
- **From the floor** — same tape component, filtered to this market

**Right rail (sticky on desktop):**

- Hours as a timetable (Plex Mono times). Note: `Sat 05:00–15:00 Farmers’ market in the North Market`
- Address block like a letterhead
- Phone as a link
- `Website` as a zinc text link, not a fat button
- Stamp-in panel (same as home, already geofenced to this market)
- Claim: `Do you run this hall?` + short evidence field

Quebec variant note (don’t design a whole extra page): Jean-Talon title can show `Marché Jean-Talon` with `Montréal, QC`.

### 04 — Vendor (`/vendors/maple-hearth-bakery`)

A stall card that grew into a page.

- `VENDOR` plate, then `Maple Hearth Bakery`
- About
- **What’s on the table** — a menu that looks like a handwritten price list printed: item, optional note, price right-aligned in mono. Season in tiny caps (`SATURDAY ONLY`, `AUG–SEPT`)
- Find them: list of markets with city, stall, days
- Phone / website
- Reviews
- Stamp-in if the regular is at one of this vendor’s markets
- `Is this your stall?` claim

### 05 — Stamp-in composer (state sheet)

Design **three states** of the same panel, not three products:

1. Location off: explanation + `Use my location`
2. Location on, **not inside any geofence**: `Nearest hall is 2.1 km (ByWard). Posts only count on the floor.`
3. On the floor: market name, distance, tabs Floor post / Review, stars as five square plates 1–5 (not cartoon stars), textarea, optional photo attach, submit `Post to the tape` / `Publish review`

Keep it small. This is a tool you use with cold hands, one thumb.

### 06 — Sign in (`/login`)

Quiet, like a coat-check.

- No illustration
- `Come in` as the title
- Line: `Post and review only when you’re at the market. Browsing stays open.`
- Sign in (email, password)
- Create account (name on posts, email, password)
- Magic link
- Continue with Google as a outline control, last
- If backend missing (current production): a single typeset notice `The desk is still connecting accounts. The directory is open.` — design this as a typeset poster, not an error toast.

### 07 — Account (`/account`)

A locker, not a profile social graph.

- Display name field
- Role line in mono: `REGULAR` / `VENDOR` / `DESK`
- Sign out
- `Your tape` — their posts as the same sentence list
- No follower counts

### 08 — Admin desk (`/admin`)

Allowed to look like a back office. Still the same type and paper. No generic Tailwind dashboard.

- Label: `DESK`
- Index stats as a timetable, not colourful KPI cards: markets, vendors, live posts, open claims
- Subnav as underlined text: Overview · Markets · Vendors · Moderation · Claims
- Tables with hairline rows, `EDIT` in mono
- Moderation: post text + `FLAG` / `RESTORE`
- Claims: evidence paragraph + `APPROVE` / `REJECT`

### 09 — Not found

`That stall isn’t here.` One line of help. Link: `Find a market`. No 404 illustration.

### 10 — Mobile navigation

- Top: wordmark + `Find` + account mark
- Bottom bar only if necessary, and only three items: `Floor` · `Find` · `Stamp` (Stamp opens composer). Do not use generic house/magnifying-glass/person icons from a SaaS set — use type labels, or enamel-plate icons you draw as squares with letters `F` `S` `+`.

---

## Part D — how to run this in Stitch without it going generic

1. Paste Part A + one screen from Part C. Generate.
2. If it outputs sage/cream cards or a big lifestyle hero, reply: `Reject the farm-SaaS look. Rebuild with hairline rules, IBM Plex only, square corners, chalkboard once, no illustrations, denser type, newspaper index not cards.`
3. Ask for a **second pass** on the same screen: `Increase density 20%. More real stall names. Smaller chrome. Larger useful lists.`
4. Then: `Now the 390px mobile of this exact layout. Do not invent a different information architecture.`
5. Only then move to the next screen. Carry a sentence: `Match header, type, colour tokens, and the ON SITE stamp from the home screen.`

Generate in this order: **01 Home → 02 Find → 03 Market → 04 Vendor → 05 Stamp-in states → 06 Login → 07 Account → 10 Mobile nav → 08 Desk → 09 Not found.**

Home and Market are the ones that define the brand. If those two are right, the rest can follow.

---

## Part E — checklist before you send exports back to the implementing agent

- [ ] No maple, no barns, no sage/terracotta, no rounded card grid
- [ ] IBM Plex Serif / Sans / Mono only
- [ ] Paper `#F1EDE3`, Board `#24352B`, Stamp `#B42318`, Ticket `#C9A227`
- [ ] ON SITE is a red stamp, not a checkmark
- [ ] Real Canadian market names from Part B
- [ ] Home is a working floor (tape + find + stamp-in), not a landing page
- [ ] Desktop and mobile for at least 01, 02, 03, 04, 05
- [ ] Files named `01-home-desktop.png` etc.

That’s enough to implement from. Extra: a type specimen strip and the `MR` enamel plate at 32 / 128 / 512 px.
