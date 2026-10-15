import Link from "next/link";
import { GetForm } from "@/components/get-form";
import { SearchField } from "@/components/search-field";
import { PRODUCT_SEARCH_LABEL, PRODUCT_SEARCH_PLACEHOLDER, WEEKDAYS } from "@/lib/constants";
import { PRODUCT_TRIES } from "@/lib/product-catalogue";

const selectClass =
  "h-9 w-full min-w-[10rem] rounded-none border border-input bg-card px-2.5 text-sm sm:w-auto";

export function ProductSearchForm({
  q,
  openToday,
  marketSlug,
  day,
  markets,
}: {
  q: string;
  openToday: boolean;
  marketSlug: string | null;
  day: number | null;
  markets: { slug: string; name: string }[];
}) {
  return (
    <GetForm action="/products" role="search" className="mt-6">
      <div className="flex min-w-0 items-stretch rounded-[2px] border border-[#cfc6b6] bg-receipt shadow-[inset_0_1px_0_#fff] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
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
          className="h-14 shrink-0 bg-primary px-3 text-base font-medium text-primary-foreground sm:px-4"
        >
          <span className="sm:hidden">Find</span>
          <span className="hidden sm:inline">Find products</span>
        </button>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="text-muted-foreground">Try</span>
        {PRODUCT_TRIES.map((item) => (
          <Link key={item.slug} href={`/find/${item.slug}`} className="font-medium hover:underline">
            {item.term}
          </Link>
        ))}
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="flex h-9 items-center gap-2 text-base">
          <input
            type="checkbox"
            name="open"
            value="1"
            defaultChecked={openToday}
            className="accent-primary"
          />
          Selling today
        </label>
        <label className="grid w-full gap-1 text-sm font-medium sm:w-auto">
          Market
          <select name="market" defaultValue={marketSlug ?? ""} className={selectClass}>
            <option value="">Any market</option>
            {markets.map((market) => (
              <option key={market.slug} value={market.slug}>
                {market.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid w-full gap-1 text-sm font-medium sm:w-auto">
          Day
          <select name="day" defaultValue={day == null ? "" : String(day)} className={selectClass}>
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
