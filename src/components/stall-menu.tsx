import { formatPrice } from "@/lib/format";
import { groupMenuItems } from "@/lib/menu-sections";
import type { MenuItem } from "@/types/database";
import Link from "next/link";

function tagWords(tags: string[]) {
  return tags.map((tag) => tag.replaceAll("-", " "));
}

function MenuItemRow({
  item,
  vendorSlug,
}: {
  item: MenuItem;
  vendorSlug?: string;
}) {
  const price = formatPrice(item.price_cents);
  const meta = [item.season, ...tagWords(item.dietary ?? [])].filter(Boolean);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-dashed border-border px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-base font-medium">{item.name}</p>
        {item.description ? (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        ) : null}
        {meta.length ? (
          <p className="type-kicker mt-0.5 text-muted-foreground">{meta.join(" · ")}</p>
        ) : null}
        {item.can_buy && vendorSlug ? (
          <Link
            href={`/vendors/${vendorSlug}/buy/${item.id}`}
            className="mt-1 inline-flex text-sm font-medium hover:underline"
          >
            Buy
          </Link>
        ) : null}
      </div>
      {price ? (
        <span className="type-nums shrink-0 self-start whitespace-nowrap bg-stamp px-1.5 py-0.5 text-sm text-chalk">
          {price}
        </span>
      ) : null}
    </li>
  );
}

function MenuReceipt({
  items,
  vendorSlug,
  className,
}: {
  items: MenuItem[];
  vendorSlug?: string;
  className?: string;
}) {
  return (
    <ul className={className ?? "mt-3 bg-receipt ring-1 ring-border shadow-[inset_3px_0_0_var(--stamp)]"}>
      {items.map((item) => (
        <MenuItemRow key={item.id} item={item} vendorSlug={vendorSlug} />
      ))}
    </ul>
  );
}

export function StallMenu({
  items,
  vendorSlug,
}: {
  items: MenuItem[];
  vendorSlug?: string;
}) {
  if (!items.length) return null;

  const groups = groupMenuItems(items);
  if (!groups) {
    return <MenuReceipt items={items} vendorSlug={vendorSlug} />;
  }

  return (
    <div className="mt-3 grid gap-6">
      {groups.map((group) => (
        <div key={group.heading ?? "unsectioned"}>
          {group.heading ? <h3>{group.heading}</h3> : null}
          <MenuReceipt
            items={group.items}
            vendorSlug={vendorSlug}
            className={`${group.heading ? "mt-3" : ""} bg-receipt ring-1 ring-border shadow-[inset_3px_0_0_var(--stamp)]`}
          />
        </div>
      ))}
    </div>
  );
}
