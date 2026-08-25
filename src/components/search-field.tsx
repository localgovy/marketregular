"use client";

import { useRef, useState, type ComponentProps } from "react";
import { CloseMark } from "@/components/marks";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchFieldProps = Omit<
  ComponentProps<typeof Input>,
  "onChange" | "value" | "defaultValue" | "type"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
};

export function SearchField({
  ref,
  value: valueProp,
  defaultValue = "",
  onChange,
  onClear,
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
    <div className="relative min-w-0 flex-1">
      <Input
        {...props}
        ref={setRefs}
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        autoComplete="off"
        className={cn(
          className,
          "pr-9 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={clear}
          className="absolute top-1/2 right-1.5 z-10 flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Clear"
        >
          <CloseMark className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
