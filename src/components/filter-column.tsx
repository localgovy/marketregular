"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** How many checkboxes a filter column opens with. */
export const FILTER_PAGE = 10;

export type FilterOption = {
  key: string;
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
};

export function FilterCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  children: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stamp">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 accent-primary"
      />
      <span>{children}</span>
    </label>
  );
}

function OptionList({ options }: { options: FilterOption[] }) {
  return (
    <div className="grid gap-2.5">
      {options.map((option) => (
        <FilterCheck key={option.key} checked={option.checked} onChange={option.onChange}>
          {option.label}
        </FilterCheck>
      ))}
    </div>
  );
}

function pageOptions(options: FilterOption[], shown: number) {
  const head = options.slice(0, shown);
  const restOn = options.slice(shown).filter((option) => option.checked);
  return restOn.length ? [...restOn, ...head] : head;
}

export function FilterColumn({
  title,
  options,
  lead,
}: {
  title: string;
  options: FilterOption[];
  lead?: FilterOption[];
}) {
  const [shown, setShown] = useState(FILTER_PAGE);
  const visible = pageOptions(options, shown);
  const more = shown < options.length;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3.5 text-sm font-medium">{title}</legend>
      {lead?.length ? <OptionList options={lead} /> : null}
      {options.length ? (
        <div className={cn(lead?.length && "mt-3.5 border-t border-dashed border-border pt-3.5")}>
          <OptionList options={visible} />
          {more ? (
            <div className="mt-3.5">
              <button
                type="button"
                onClick={() => setShown((n) => n + FILTER_PAGE)}
                className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                Show more
              </button>
              <p className="mt-1 text-sm text-muted-foreground">
                {Math.min(shown, options.length)} of {options.length}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}

export function FilterRow({ title, options }: { title: string; options: FilterOption[] }) {
  if (!options.length) return null;
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3.5 text-sm font-medium">{title}</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2.5">
        {options.map((option) => (
          <FilterCheck key={option.key} checked={option.checked} onChange={option.onChange}>
            {option.label}
          </FilterCheck>
        ))}
      </div>
    </fieldset>
  );
}
