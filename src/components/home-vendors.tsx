import { HomePanel } from "@/components/home-panel";
import { VendorTodayItem, VendorWeekItem } from "@/components/home-vendors-item";
import { VendorsTodayMore } from "@/components/home-vendors-more";
import { CrateMark, TallyMark } from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { TODAY_STALL_CAP, type VendorTodayRow, type VendorWeekPick } from "@/lib/vendor-week";

export function VendorsTodayPanel({ rows }: { rows: VendorTodayRow[] }) {
  const first = rows.slice(0, TODAY_STALL_CAP);
  const capped = rows.length > first.length;

  return (
    <HomePanel
      id="vendors-today"
      place="rail"
      tone="vendors"
      icon={CrateMark}
      kicker="Vendors at market"
      title="Vendors today"
      how={
        <>
          Tap a vendor for the menu.
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <NowLabel>Selling now</NowLabel>
            <span>At the stall this minute.</span>
          </span>
        </>
      }
      action={<span>{rows.length} listed</span>}
    >
      {rows.length ? (
        <ul className="ring-1 ring-border">
          {first.map((row) => (
            <VendorTodayItem key={`${row.vendorSlug}-${row.marketSlug}`} row={row} />
          ))}
          {capped ? <VendorsTodayMore rest={rows.slice(TODAY_STALL_CAP)} /> : null}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          No vendors are on the calendar for today. See this week&apos;s markets above.
        </p>
      )}
    </HomePanel>
  );
}

export function VendorsWeekPanel({ picks }: { picks: VendorWeekPick[] }) {
  return (
    <HomePanel
      id="vendors-week"
      place="rail"
      tone="menus"
      icon={TallyMark}
      kicker="This week's stalls"
      title="Top 5 this week"
      how="The five vendors in the GTA market game this week. Tap a name to learn more about them."
    >
      {picks.length ? (
        <ol className="ring-1 ring-border">
          {picks.map((pick, index) => (
            <VendorWeekItem key={pick.vendorSlug} pick={pick} index={index} />
          ))}
        </ol>
      ) : (
        <p className="text-base text-muted-foreground">
          We do not have vendor days for this week yet.
        </p>
      )}
    </HomePanel>
  );
}
