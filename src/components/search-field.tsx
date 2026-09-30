"use client";

import { useRef, useState, type ComponentProps } from "react";
import { CloseMark, SearchMark } from "@/components/marks";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const sizes = {
  page: "h-14",
  panel: "h-12",
  bar: "h-10 lg:h-11",
} as const;

export type SearchFieldSize = keyof typeof sizes;

type SearchFieldProps = Omit<
  ComponentProps<typeof Input>,
  "onChange" | "value" | "defaultValue" | "type" | "size"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  /** Page is 56px, panel is 48px, bar is 40px and 44px from the large header up. */
  size?: SearchFieldSize;
  /** Drop the slip edge so a parent can draw one outline around the field and a button. */
  joined?: boolean;
};

export function SearchField({
  ref,
  value: valueProp,
  defaultValue = "",
  onChange,
  onClear,
  size = "page",
  joined = false,
  className,
  ...props
}: SearchFieldProps) {
  const innerRef = useRef<HTMLInputElement>(null);
  const isControlled = valueProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = isControlled ? valueProp : uncontrolled;

  function setRefs(node: HTMLInputElement | null) {
    innerRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }

  function handleChange(next: string) {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  }

  function clear() {
    handleChange("");
    onClear?.();
    innerRef.current?.focus();
  }

  return (
    <div className="group relative min-w-0 flex-1">
      <SearchMark className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
      <Input
        {...props}
        ref={setRefs}
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        autoComplete="off"
        className={cn(
          "rounded-[2px] border-[#cfc6b6] bg-receipt py-0 pl-11 pr-12 text-base text-foreground shadow-[inset_0_1px_0_#fff] md:text-base focus:border-primary focus:ring-3 focus:ring-primary/20 focus-visible:border-primary focus-visible:ring-primary/20 dark:bg-receipt",
          sizes[size],
          joined &&
            "border-transparent bg-transparent shadow-none focus:border-transparent focus:ring-0 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent",
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
          className,
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={clear}
          className="stall-chip-sm absolute top-1/2 right-1.5 z-10 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Clear"
        >
          <CloseMark className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
