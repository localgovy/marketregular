import Link from "next/link";
import { Hours } from "@/components/hours";

type Inline =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "link"; href: string; label: string };

type Block =
  | { type: "p"; inlines: Inline[] }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: Array<{ inlines: Inline[]; hours?: string }> };

const MARKET_ROW = /^(.*) · (.+)$/;

function parseInlines(text: string): Inline[] {
  const out: Inline[] = [];
  const token = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  for (const match of text.matchAll(token)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ kind: "text", value: text.slice(last, at) });
    const chunk = match[0];
    if (chunk.startsWith("**")) {
      out.push({ kind: "bold", value: chunk.slice(2, -2) });
    } else {
      const link = chunk.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) out.push({ kind: "link", href: link[2], label: link[1] });
      else out.push({ kind: "text", value: chunk });
    }
    last = at + chunk.length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
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
        if (row && /\d/.test(row[2]) && /AM|PM/.test(row[2])) {
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
      if (!next.trim() || next.startsWith("#") || next.startsWith("- ")) break;
      para.push(next.trim());
      i += 1;
    }
    if (para.length) blocks.push({ type: "p", inlines: parseInlines(para.join(" ")) });
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

export function BlogBody({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);
  return (
    <div className="mt-8">
      {blocks.map((block, index) => {
        if (block.type === "h2") {
          return (
            <h2 key={index} className={index === 0 ? undefined : "mt-10"}>
              {block.text}
            </h2>
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
          const marketList = block.items.every((item) => item.hours);
          if (marketList) {
            return (
              <ul key={index} className="mt-3 divide-y divide-border">
                {block.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 py-2 text-base"
                  >
                    <span className="min-w-0 font-medium">
                      <Inlines inlines={item.inlines} />
                    </span>
                    {item.hours ? (
                      <Hours value={item.hours} className="text-foreground" />
                    ) : null}
                  </li>
                ))}
              </ul>
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
