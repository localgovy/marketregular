import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCT_TAGS, AMENITY_TAGS, WEEKDAYS } from "@/lib/constants";

export function SearchForm({
  defaults,
}: {
  cities?: string[];
  defaults?: {
    q?: string;
    province?: string;
    city?: string;
    weekday?: string;
    tag?: string;
    openNow?: boolean;
  };
}) {
  const tags = [...PRODUCT_TAGS, ...AMENITY_TAGS];
  return (
    <form action="/search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
        name="tag"
        defaultValue={defaults?.tag ?? ""}
        className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
      >
        <option value="">Any tag</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {tag.replaceAll("-", " ")}
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
    </form>
  );
}
