"use client";

import { useSyncExternalStore } from "react";
import { SearchField } from "@/components/search-field";
import { buttonVariants } from "@/components/ui/button";
import {
  HEADER_SEARCH_PLACEHOLDER,
  HEADER_SEARCH_PLACEHOLDER_SHORT,
  SEARCH_LABEL,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const HEADER_SEARCH_MQ = "(min-width: 1024px)";

function headerSearchPlaceholder(compact: boolean) {
  return compact ? HEADER_SEARCH_PLACEHOLDER_SHORT : HEADER_SEARCH_PLACEHOLDER;
}

function useCompactHeaderSearch() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia(HEADER_SEARCH_MQ);
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(HEADER_SEARCH_MQ).matches,
    () => false,
  );
}

export function HeaderSearch({
  className,
  initialQuery = "",
  placeholder,
}: {
  className?: string;
  initialQuery?: string;
  placeholder?: string;
}) {
  const compact = useCompactHeaderSearch();
  const hint = placeholder ?? headerSearchPlaceholder(compact);

  return (
    <form action="/markets" role="search" className={cn("relative min-w-0", className)}>
      <div className="flex min-w-0 items-stretch rounded-[2px] border border-[#cfc6b6] bg-receipt shadow-[inset_0_1px_0_#fff] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
        <SearchField
          name="q"
          defaultValue={initialQuery}
          size="bar"
          joined
          aria-label={SEARCH_LABEL}
          placeholder={hint}
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
