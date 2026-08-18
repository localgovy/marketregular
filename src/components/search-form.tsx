import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROVINCES, PRODUCT_TAGS, AMENITY_TAGS, WEEKDAYS } from "@/lib/constants";

export function SearchForm({
  cities,
  defaults,
}: {
  cities: string[];
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
    <form action="/search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Input
        name="q"
        defaultValue={defaults?.q}
        placeholder="Market, vendor, city, or tomato"
        className="lg:col-span-2 bg-card"
      />
      <select
        name="province"
        defaultValue={defaults?.province ?? ""}
        className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
      >
        <option value="">All provinces</option>
        {PROVINCES.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        name="city"
        defaultValue={defaults?.city ?? ""}
        className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
      >
        <option value="">All cities</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
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
      <label className="flex h-8 items-center gap-2 text-sm lg:col-span-2">
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
