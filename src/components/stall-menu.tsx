import { formatPrice } from "@/lib/format";
import type { MenuItem } from "@/types/database";

function tagWords(tags: string[]) {
  return tags.map((tag) => tag.replaceAll("-", " "));
}

export function StallMenu({ items }: { items: MenuItem[] }) {
  if (!items.length) {
    return (
      <p className="mt-3 text-base text-muted-foreground">Menu not listed yet.</p>
    );
  }

  return (
    <ul className="mt-3 bg-receipt ring-1 ring-border shadow-[inset_3px_0_0_var(--ticket)]">
      {items.map((item) => {
        const price = formatPrice(item.price_cents);
        const meta = [item.season, ...tagWords(item.dietary ?? [])].filter(Boolean);
        return (
          <li
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-dashed border-border px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-base font-medium">{item.name}</p>
              {item.description ? (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              ) : null}
              {meta.length ? (
                <p className="type-kicker mt-0.5 text-muted-foreground">{meta.join(" · ")}</p>
              ) : null}
            </div>
            {price ? (
              <span className="shrink-0 self-start whitespace-nowrap bg-ticket px-1.5 py-0.5 font-mono text-sm tabular-nums text-foreground">
                {price}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
