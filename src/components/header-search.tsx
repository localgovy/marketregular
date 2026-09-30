"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchField } from "@/components/search-field";
import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_SEARCH_LABEL, PRODUCT_SEARCH_PLACEHOLDER } from "@/lib/constants";
import type { ProductHit, VendorHit } from "@/lib/product-hits";
import { cn } from "@/lib/utils";

type Option = { id: string; href: string; label: string; detail?: string };

export function HeaderSearch({
  className,
  initialQuery = "",
}: {
  className?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{
    q: string;
    products: ProductHit[];
    vendors: VendorHit[];
  }>({ q: "", products: [], vendors: [] });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ q });
      void fetch(`/api/search?${params.toString()}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((body: { products?: ProductHit[]; vendors?: VendorHit[] } | null) => {
          if (cancelled) return;
          setResult({
            q,
            products: body?.products ?? [],
            vendors: body?.vendors ?? [],
          });
          setActive(-1);
        })
        .catch(() => {
          if (cancelled) return;
          setResult({ q, products: [], vendors: [] });
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  const needle = query.trim();
  const ready = needle.length >= 2 && result.q === needle;
  const products = ready ? result.products : [];
  const vendors = ready ? result.vendors : [];
  const pending = needle.length >= 2 && !ready;

  const options: Option[] = [
    ...products.map((hit, index) => ({
      id: `${listId}-p-${index}`,
      href: hit.href,
      label: hit.itemName,
      detail: hit.vendorName,
    })),
    ...vendors.map((vendor, index) => ({
      id: `${listId}-v-${index}`,
      href: vendor.href,
      label: vendor.name,
    })),
  ];
  const showList = open && query.trim().length >= 2;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <form
      action="/products"
      role="search"
      className={cn("relative min-w-0", className)}
      onSubmit={(event) => {
        if (active >= 0 && options[active]) {
          event.preventDefault();
          go(options[active].href);
        }
      }}
    >
      <div className="flex min-w-0 items-stretch rounded-[2px] border border-[#cfc6b6] bg-receipt shadow-[inset_0_1px_0_#fff] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
        <SearchField
          name="q"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setOpen(true);
          }}
          size="bar"
          joined
          role="combobox"
          aria-label={PRODUCT_SEARCH_LABEL}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          aria-activedescendant={active >= 0 ? options[active]?.id : undefined}
          placeholder={PRODUCT_SEARCH_PLACEHOLDER}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!showList || options.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(options.length - 1, index + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(0, index - 1));
            }
          }}
        />
        <button
          type="submit"
          className={cn(
            buttonVariants(),
            "h-10 shrink-0 self-stretch rounded-none px-3 lg:h-11 max-sm:sr-only",
          )}
        >
          Find
        </button>
      </div>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-50 mt-14 max-h-80 overflow-y-auto rounded-xl bg-card py-1 ring-1 ring-foreground/10 xl:mt-1"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {pending ? "Searching" : "No matches yet"}
            </li>
          ) : (
            options.map((option, index) => (
              <li key={option.id} role="presentation">
                <a
                  id={option.id}
                  role="option"
                  aria-selected={index === active}
                  href={option.href}
                  className={cn(
                    "block px-3 py-2 text-left outline-none hover:bg-secondary",
                    index === active && "bg-secondary",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.preventDefault();
                    go(option.href);
                  }}
                >
                  <span className="block text-base font-medium">{option.label}</span>
                  {option.detail ? (
                    <span className="block text-sm text-muted-foreground">{option.detail}</span>
                  ) : null}
                </a>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </form>
  );
}
