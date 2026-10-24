import { SearchField } from "@/components/search-field";
import { buttonVariants } from "@/components/ui/button";
import { HEADER_SEARCH_PLACEHOLDER, SEARCH_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function HeaderSearch({
  className,
  initialQuery = "",
  placeholder = HEADER_SEARCH_PLACEHOLDER,
}: {
  className?: string;
  initialQuery?: string;
  placeholder?: string;
}) {
  return (
    <form action="/markets" role="search" className={cn("relative min-w-0", className)}>
      <div className="flex min-w-0 items-stretch rounded-[2px] border border-[#cfc6b6] bg-receipt shadow-[inset_0_1px_0_#fff] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
        <SearchField
          name="q"
          defaultValue={initialQuery}
          size="bar"
          joined
          aria-label={SEARCH_LABEL}
          placeholder={placeholder}
        />
        <button
          type="submit"
          className={cn(
            buttonVariants(),
            "h-10 shrink-0 self-stretch rounded-none px-3 lg:h-11 max-lg:sr-only",
          )}
        >
          Find
        </button>
      </div>
    </form>
  );
}
