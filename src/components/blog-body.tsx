import Link from "next/link";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import { MarketHoursHead } from "@/components/market-hours-head";
import { ListingSaveButton } from "@/components/save-button";
import { safePath } from "@/lib/auth-redirect";
import {
  loadBlogMarketPeeks,
  peekKey,
  weekdayFromHeading,
  type BlogMarketPeek,
  type BlogMarketPeekRequest,
} from "@/lib/blog-market-peeks";
import { externalHref } from "@/lib/format";
import { listingFromInput, validSaveSlug, type SavedListing } from "@/lib/listing-saves";
import { cn } from "@/lib/utils";

type Inline =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "hours"; value: string }
  | { kind: "link"; href: string; label: string };

type Block =
  | { type: "p"; inlines: Inline[] }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: Array<{ inlines: Inline[]; hours?: string }> };

const MARKET_ROW = /^(.*) · (.+)$/;
const HOURS_SPAN =
  /\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s*[–-]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)/i;

function looksLikeHours(value: string) {
  return /\d/.test(value) && /AM|PM/.test(value);
}

function markdownHref(href: string): string | null {
  const value = href.trim();
  if (!value || value.startsWith("//")) return null;
  if (value.startsWith("/")) return safePath(value, "") || null;
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.hostname === "www.marketregular.com" || url.hostname === "marketregular.com") {
      const path = `${url.pathname}${url.search}${url.hash}` || "/";
      return safePath(path, "") || null;
    }
  } catch {
    return null;
  }
  return externalHref(value);
}

function parseInlines(text: string): Inline[] {
  const out: Inline[] = [];
  const token = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  for (const match of text.matchAll(token)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ kind: "text", value: text.slice(last, at) });
    const chunk = match[0];
    if (chunk.startsWith("**")) {
      const value = chunk.slice(2, -2);
      if (looksLikeHours(value)) out.push({ kind: "hours", value });
      else out.push({ kind: "bold", value });
    } else if (chunk.startsWith("*")) {
      out.push({ kind: "italic", value: chunk.slice(1, -1) });
    } else {
      const link = chunk.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const href = markdownHref(link[2]);
        if (href) out.push({ kind: "link", href, label: link[1] });
        else out.push({ kind: "text", value: link[1] });
      } else out.push({ kind: "text", value: chunk });
    }
    last = at + chunk.length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}

function marketSlugFromInlines(inlines: Inline[]): string | null {
  return marketLinkFromInlines(inlines)?.slug ?? null;
}

function marketLinkFromInlines(inlines: Inline[]): { slug: string; name: string } | null {
  for (const part of inlines) {
    if (part.kind !== "link") continue;
    const match = part.href.match(/^\/markets\/([^/?#]+)$/);
    if (!match?.[1]) continue;
    let slug: string;
    try {
      slug = decodeURIComponent(match[1]);
    } catch {
      continue;
    }
    if (!validSaveSlug(slug)) continue;
    const name = part.label.trim();
    if (!name) continue;
    return { slug, name };
  }
  return null;
}

function hoursFromInlines(inlines: Inline[]): string | null {
  for (const part of inlines) {
    if (part.kind === "hours") return part.value;
  }
  const match = inlineText(inlines).match(HOURS_SPAN);
  return match?.[0] ?? null;
}

function inlineText(inlines: Inline[]): string {
  return inlines
    .map((part) => {
      if (part.kind === "link") return part.label;
      return part.value;
    })
    .join("")
    .trim();
}

const MONTH = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;

function headingWithDate(heading: string, dated: string | null) {
  if (MONTH.test(heading) || !dated) return heading;
  const datePart = dated.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*$/)?.[0]?.trim();
  return datePart ? `${heading}, ${datePart}` : heading;
}

function blockContext(blocks: Block[]): Array<{ weekday: number | null; heading: string | null }> {
  let weekday: number | null = null;
  let heading: string | null = null;
  let dated: string | null = null;
  return blocks.map((block) => {
    if (block.type === "h2") {
      weekday = weekdayFromHeading(block.text) ?? weekday;
      if (MONTH.test(block.text)) dated = block.text;
      heading = headingWithDate(block.text, dated);
    }
    return { weekday, heading };
  });
}

function isMarketHoursList(
  block: Block,
): block is { type: "ul"; items: Array<{ inlines: Inline[]; hours?: string }> } {
  return (
    block.type === "ul" &&
    block.items.length > 0 &&
    block.items.every((item) => Boolean(item.hours))
  );
}

function peekRequests(
  blocks: Block[],
  context: Array<{ weekday: number | null; heading: string | null }>,
): BlogMarketPeekRequest[] {
  const requests: BlogMarketPeekRequest[] = [];
  blocks.forEach((block, index) => {
    const weekday = context[index]?.weekday ?? null;
    if (isMarketHoursList(block)) {
      for (const item of block.items) {
        const slug = marketSlugFromInlines(item.inlines);
        if (slug) requests.push({ slug, weekday });
      }
      return;
    }
    if (block.type !== "p") return;
    const slug = marketSlugFromInlines(block.inlines);
    if (slug && hoursFromInlines(block.inlines)) requests.push({ slug, weekday });
  });
  return requests;
}

function listingFromParagraph(
  inlines: Inline[],
  blogSlug: string,
  heading: string,
  weekday: number | null,
  peeks: Map<string, BlogMarketPeek> | null,
  order: number,
): SavedListing | null {
  const market = marketLinkFromInlines(inlines);
  const hours = hoursFromInlines(inlines);
  if (!market || !hours) return null;
  const peek = peeks?.get(peekKey(market.slug, weekday));
  return listingFromInput({
    blog: blogSlug,
    heading,
    hours,
    marketSlug: market.slug,
    marketName: market.name,
    ratingAvg: peek?.ratingAvg ?? null,
    reviewCount: peek?.reviewCount ?? 0,
    vendors: peek?.vendors ?? [],
    order,
  });
}

function headingListing(
  blocks: Block[],
  h2Index: number,
  blogSlug: string | undefined,
  context: Array<{ weekday: number | null; heading: string | null }>,
  peeks: Map<string, BlogMarketPeek> | null,
): SavedListing | null {
  if (!blogSlug) return null;
  const heading = context[h2Index]?.heading;
  const weekday = context[h2Index]?.weekday ?? null;
  if (!heading) return null;
  let found: SavedListing | null = null;
  for (let i = h2Index + 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (!block || block.type === "h2") break;
    if (isMarketHoursList(block)) return null;
    if (block.type !== "p") continue;
    const listing = listingFromParagraph(
      block.inlines,
      blogSlug,
      heading,
      weekday,
      peeks,
      h2Index * 100,
    );
    if (!listing) continue;
    if (found) return null;
    found = listing;
  }
  return found;
}

function BlogSectionHeading({
  text,
  listing,
  className,
}: {
  text: string;
  listing: SavedListing | null;
  className?: string;
}) {
  if (!listing) {
    return <h2 className={className}>{text}</h2>;
  }
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <h2 className="min-w-0">{text}</h2>
      <ListingSaveButton listing={listing} name={text} />
    </div>
  );
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim() || /^---+$/.test(line.trim()) || line.startsWith("# ")) {
      // Page already has the title. Bare `#` headings and `---` rules are skipped.
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: Array<{ inlines: Inline[]; hours?: string }> = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("- ")) {
        const raw = (lines[i] ?? "").slice(2).trim();
        const row = raw.match(MARKET_ROW);
        if (row && looksLikeHours(row[2])) {
          items.push({ inlines: parseInlines(row[1].trim()), hours: row[2].trim() });
        } else {
          items.push({ inlines: parseInlines(raw) });
        }
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length) {
      const next = lines[i] ?? "";
      if (!next.trim() || next.startsWith("#") || next.startsWith("- ") || /^---+$/.test(next.trim())) {
        break;
      }
      para.push(next.trim());
      i += 1;
    }
    if (para.length) blocks.push({ type: "p", inlines: parseInlines(para.join(" ")) });
    else i += 1;
  }
  return blocks;
}

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((part, index) => {
        if (part.kind === "text") return <span key={index}>{part.value}</span>;
        if (part.kind === "bold") {
          return (
            <strong key={index} className="font-medium text-foreground">
              {part.value}
            </strong>
          );
        }
        if (part.kind === "italic") {
          return (
            <em key={index}>{part.value}</em>
          );
        }
        if (part.kind === "hours") {
          return <Hours key={index} value={part.value} className="text-foreground" />;
        }
        const internal = part.href.startsWith("/");
        const className = "font-medium text-foreground hover:underline";
        if (internal) {
          return (
            <Link key={index} href={part.href} className={className}>
              {part.label}
            </Link>
          );
        }
        return (
          <a key={index} href={part.href} rel="noreferrer" className={className}>
            {part.label}
          </a>
        );
      })}
    </>
  );
}

export function BlogInlines({ text }: { text: string }) {
  return <Inlines inlines={parseInlines(text)} />;
}

function StallPeek({ vendors }: { vendors: BlogMarketPeek["vendors"] }) {
  return (
    <p className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 text-sm leading-relaxed">
      <span className="text-muted-foreground">Vendors</span>
      <span className="min-w-0">
        {vendors.map((vendor, vendorIndex) => (
          <span key={vendor.slug}>
            {vendorIndex ? ", " : null}
            <Link href={`/vendors/${vendor.slug}`} className="text-foreground hover:underline">
              {vendor.name}
            </Link>
          </span>
        ))}
      </span>
    </p>
  );
}

function MarketHoursRow({
  item,
  peek,
  listing,
}: {
  item: { inlines: Inline[]; hours?: string };
  peek: BlogMarketPeek | undefined;
  listing: ReturnType<typeof listingFromInput>;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-3">
      <div className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-base font-medium">
            <Inlines inlines={item.inlines} />
          </span>
          {peek ? (
            <ListingScore
              ratingAvg={peek.ratingAvg}
              reviewCount={peek.reviewCount}
              className="text-foreground"
            />
          ) : null}
        </span>
        {peek?.vendors.length ? <StallPeek vendors={peek.vendors} /> : null}
      </div>
      <span className="flex shrink-0 items-start gap-2">
        {item.hours ? <Hours value={item.hours} className="text-foreground" /> : null}
        {listing ? <ListingSaveButton listing={listing} /> : null}
      </span>
    </li>
  );
}

export async function BlogBody({
  markdown,
  blogSlug,
}: {
  markdown: string;
  blogSlug?: string;
}) {
  const blocks = parseBlocks(markdown);
  const context = blockContext(blocks);
  const requests = peekRequests(blocks, context);
  const peeks = requests.length ? await loadBlogMarketPeeks(requests) : null;

  return (
    <div className="mt-8">
      {blocks.map((block, index) => {
        if (block.type === "h2") {
          return (
            <BlogSectionHeading
              key={index}
              text={block.text}
              listing={headingListing(blocks, index, blogSlug, context, peeks)}
              className={index === 0 ? undefined : "mt-10"}
            />
          );
        }
        if (block.type === "h3") {
          return (
            <h3 key={index} className="mt-6">
              {block.text}
            </h3>
          );
        }
        if (block.type === "ul") {
          const marketList = isMarketHoursList(block);
          if (marketList) {
            return (
              <div key={index} className="mt-3 min-w-0">
                <MarketHoursHead />
                <ul className="divide-y divide-border">
                  {block.items.map((item, itemIndex) => {
                    const slug = marketSlugFromInlines(item.inlines);
                    const peek =
                      slug && peeks
                        ? peeks.get(peekKey(slug, context[index]?.weekday ?? null))
                        : undefined;
                    const heading = context[index]?.heading;
                    const listing =
                      blogSlug && slug && heading && item.hours
                        ? listingFromInput({
                            blog: blogSlug,
                            heading,
                            hours: item.hours,
                            marketSlug: slug,
                            marketName: inlineText(item.inlines),
                            ratingAvg: peek?.ratingAvg ?? null,
                            reviewCount: peek?.reviewCount ?? 0,
                            vendors: peek?.vendors ?? [],
                            order: index * 100 + itemIndex,
                          })
                        : null;
                    return (
                      <MarketHoursRow
                        key={itemIndex}
                        item={item}
                        peek={peek}
                        listing={listing}
                      />
                    );
                  })}
                </ul>
              </div>
            );
          }
          return (
            <ul key={index} className="mt-3 list-disc space-y-1 pl-5 text-base leading-relaxed">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inlines inlines={item.inlines} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="mt-3 text-base leading-relaxed text-muted-foreground">
            <Inlines inlines={block.inlines} />
          </p>
        );
      })}
    </div>
  );
}
