import Link from "next/link";
import { GetForm } from "@/components/get-form";
import { SearchField } from "@/components/search-field";
import { PRODUCT_SEARCH_LABEL, PRODUCT_SEARCH_PLACEHOLDER, WEEKDAYS } from "@/lib/constants";
import { PRODUCT_TRIES } from "@/lib/product-catalogue";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full min-w-[10rem] rounded bg-receipt px-2.5 text-sm font-medium text-foreground ring-1 ring-black/15 sm:w-auto";

export function ProductSearchForm({
  q,
  openToday,
  marketSlug,
  day,
  markets,
  tone = "plate",
}: {
  q: string;
  openToday: boolean;
  marketSlug: string | null;
  day: number | null;
  markets: { slug: string; name: string }[];
  tone?: "plate" | "page";
}) {
  const onPlate = tone === "plate";

  return (
    <GetForm action="/products" role="search" className="mt-5">
      <div className="flex min-w-0 items-stretch rounded-[2px] border border-black/20 bg-receipt shadow-[inset_0_1px_0_#fff] focus-within:border-primary focus-within:ring-2 focus-within:ring-chalk">
        <SearchField
          name="q"
          key={q}
          defaultValue={q}
          size="page"
          joined
          aria-label={PRODUCT_SEARCH_LABEL}
          placeholder={PRODUCT_SEARCH_PLACEHOLDER}
        />
        <button
          type="submit"
          className="find-go stall-chip h-14 shrink-0 cursor-pointer px-4 text-base font-medium text-receipt hover:brightness-110 sm:px-5"
        >
          <span className="sm:hidden">Find</span>
          <span className="hidden sm:inline">Find products</span>
        </button>
      </div>

      {/* Quick Craving Shortcuts */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
        <span
          className={cn(
            "mr-1 font-medium",
            onPlate ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          Popular cravings:
        </span>
        {PRODUCT_TRIES.map((item) => (
          <Link
            key={item.slug}
            href={`/find/${item.slug}`}
            className={cn(
              "stall-chip-sm inline-flex items-center px-2.5 py-0.5 text-sm font-medium transition-colors",
              onPlate
                ? "bg-primary-foreground/15 text-primary-foreground hover:bg-receipt hover:text-primary"
                : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            {item.term}
          </Link>
        ))}
      </div>

      {/* Availability & Market Filters */}
      <div
        className={cn(
          "mt-4 flex flex-wrap items-end gap-x-4 gap-y-3 border-t pt-3.5",
          onPlate ? "border-primary-foreground/15" : "border-border",
        )}
      >
        <label
          className={cn(
            "flex h-9 cursor-pointer items-center gap-2 rounded px-3 text-sm font-medium ring-1",
            onPlate
              ? "bg-primary-foreground/15 text-primary-foreground ring-primary-foreground/25"
              : "bg-receipt text-foreground ring-border",
          )}
        >
          <input
            type="checkbox"
            name="open"
            value="1"
            defaultChecked={openToday}
            className="accent-stamp"
          />
          <span>Selling today</span>
        </label>

        <label
          className={cn(
            "grid w-full gap-1 text-sm font-medium sm:w-auto",
            onPlate ? "text-primary-foreground/90" : "text-foreground",
          )}
        >
          <span>Market</span>
          <select name="market" defaultValue={marketSlug ?? ""} className={selectClass}>
            <option value="">Any market</option>
            {markets.map((market) => (
              <option key={market.slug} value={market.slug}>
                {market.name}
              </option>
            ))}
          </select>
        </label>

        <label
          className={cn(
            "grid w-full gap-1 text-sm font-medium sm:w-auto",
            onPlate ? "text-primary-foreground/90" : "text-foreground",
          )}
        >
          <span>Day</span>
          <select
            name="day"
            defaultValue={day == null ? "" : String(day)}
            className={selectClass}
          >
            <option value="">Any day</option>
            {WEEKDAYS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {/* Pickup stays out until vendors have a pickup flag. Do not invent one. */}
      </div>
    </GetForm>
  );
}
