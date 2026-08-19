import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCT_TAGS, WEEKDAYS } from "@/lib/constants";
import { FIND_SETUP, tagLabel } from "@/lib/find-paths";

export function SearchForm({
  defaults,
}: {
  cities?: string[];
  defaults?: {
    q?: string;
    province?: string;
    city?: string;
    weekday?: string;
    tags?: string[];
    setup?: string;
    openNow?: boolean;
  };
}) {
  const selected = new Set(defaults?.tags ?? []);
  return (
    <form action="/search" className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          name="q"
          defaultValue={defaults?.q}
          placeholder="Market, vendor, neighbourhood, or tomato"
          className="lg:col-span-2 bg-card"
        />
        <select
          name="weekday"
          defaultValue={defaults?.weekday ?? ""}
          className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
        >
          <option value="">Any day</option>
          {WEEKDAYS.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </select>
        <select
          name="setup"
          defaultValue={defaults?.setup ?? ""}
          className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
        >
          <option value="">Indoor or outdoor</option>
          {FIND_SETUP.map((tag) => (
            <option key={tag} value={tag}>
              {tagLabel(tag)}
            </option>
          ))}
        </select>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="openNow"
            value="1"
            defaultChecked={defaults?.openNow}
            className="size-4 accent-primary"
          />
          Open now
        </label>
        <Button type="submit" className="lg:col-span-1">
          Search
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRODUCT_TAGS.map((tag) => (
          <label
            key={tag}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-sm"
          >
            <input
              type="checkbox"
              name="tag"
              value={tag}
              defaultChecked={selected.has(tag)}
              className="size-3.5 accent-primary"
            />
            {tagLabel(tag)}
          </label>
        ))}
      </div>
    </form>
  );
}
