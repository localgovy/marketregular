import { AddressLink } from "@/components/address-link";
import { ScheduleList } from "@/components/schedule-list";
import { provinceTz } from "@/lib/constants";
import { directionsHref } from "@/lib/listing-copy";
import { formatSeasonRange, inSeason } from "@/lib/schedule";
import type { MarketSchedule } from "@/types/database";

export type SeasonPlace = {
  label: string;
  place: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  schedules: MarketSchedule[];
};

function windows(schedules: MarketSchedule[]) {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const row of schedules) {
    const label = formatSeasonRange(row.season_start, row.season_end);
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

function inSeasonNow(place: SeasonPlace, now: Date) {
  const tz = provinceTz(place.province);
  return place.schedules.some((row) => inSeason(now, row.season_start, row.season_end, tz));
}

export function MarketSeasons({ places, now }: { places: SeasonPlace[]; now: Date }) {
  const ordered = [...places].sort((a, b) => Number(inSeasonNow(b, now)) - Number(inSeasonNow(a, now)));
  return (
    <div className="grid gap-8">
      {ordered.map((place) => {
        const directions = directionsHref(place.lat, place.lng);
        const dates = windows(place.schedules);
        return (
          <section key={place.label}>
            <h3>{place.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {place.place}
              {dates.length ? ` · ${dates.join(" · ")}` : ""}
            </p>
            <div className="mt-3">
              <ScheduleList schedules={place.schedules} />
            </div>
            <address className="mt-3 not-italic text-sm leading-6">
              <AddressLink
                className="block"
                address={place.address}
                city={place.city}
                province={place.province}
                name={place.name}
                lat={place.lat}
                lng={place.lng}
              >
                {place.address}
                <br />
                {place.city}, {place.province} {place.postalCode}
              </AddressLink>
            </address>
            {directions ? (
              <a
                href={directions}
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
              >
                Directions
              </a>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
