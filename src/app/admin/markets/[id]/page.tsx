import { notFound } from "next/navigation";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { MarketForm } from "@/components/admin/market-form";
import { MaintenanceOverride } from "@/components/maintenance-opt-out-fields";
import { readOptOuts } from "@/lib/maintenance-sections";
import { MarketOwnerForm } from "@/components/admin/market-owner-form";
import { fetchAllRows, requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured, WEEKDAYS } from "@/lib/constants";
import { formatSchedule } from "@/lib/schedule";
import { readVendorPassword } from "@/lib/vendor-password";
import { deleteMarket, deleteSchedule, linkVendorToMarket, saveSchedule, unlinkVendorFromMarket } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Market, MarketSchedule, Vendor } from "@/types/database";

type RosterRow = {
  vendor_id: string;
  stall: string | null;
  days: number[] | null;
  vendors: { name: string } | { name: string }[] | null;
};

function rosterName(row: RosterRow) {
  const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
  return vendor?.name?.trim() || "Stall";
}

function rosterDays(days: number[] | null) {
  return (days ?? [])
    .map((day) => WEEKDAYS[day])
    .filter(Boolean)
    .join(", ");
}

export default async function EditMarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) return null;
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const { data: market } = await supabase.from("markets").select("*").eq("id", id).maybeSingle();
  if (!market) notFound();
  const [schedulesRes, rosterRes, vendors, owner, secret] = await Promise.all([
    supabase.from("market_schedules").select("*").eq("market_id", id),
    supabase.from("market_vendors").select("vendor_id, stall, days, vendors(name)").eq("market_id", id),
    fetchAllRows<Pick<Vendor, "id" | "name">>((from, to) =>
      supabase.from("vendors").select("id, name").order("name").range(from, to),
    ),
    market.claimed_by
      ? supabase.auth.admin.getUserById(market.claimed_by)
      : Promise.resolve({ data: { user: null } }),
    market.claimed_by
      ? supabase
          .from("vendor_sign_in_secrets")
          .select("ciphertext, chosen")
          .eq("user_id", market.claimed_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const ownerEmail = owner.data?.user?.email ?? null;
  const marketOptOuts = readOptOuts("market", market.maintenance_opt_outs);
  const hoursLeftAlone = marketOptOuts.includes("hours");
  const stallsLeftAlone = marketOptOuts.includes("roster");
  const passwordLine =
    secret.error
      ? null
      : secret.data && typeof secret.data.ciphertext === "string"
        ? readVendorPassword(secret.data.ciphertext, secret.data.chosen === true)
        : null;

  async function remove() {
    "use server";
    await deleteMarket(id);
  }

  return (
    <div className="grid gap-10">
      <MarketForm market={market as Market} />
      <section>
        <h2>Owner</h2>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">
          They sign in at /market with this account. The market has no account yet, or this one already runs it.
        </p>
        <MarketOwnerForm marketId={id} ownerEmail={ownerEmail} />
        {secret.error ? (
          <p className="mt-3 text-sm text-destructive">Could not open that password.</p>
        ) : passwordLine ? (
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">{passwordLine.label}. </span>
            <span className="font-medium">{passwordLine.value}</span>
          </p>
        ) : null}
      </section>
      <section>
        <h2>Hours</h2>
        {hoursLeftAlone ? (
          <p className="mt-2 text-base text-muted-foreground">Hours stay with this market.</p>
        ) : null}
        {schedulesRes.error ? (
          <p className="mt-3 text-base text-muted-foreground">Could not load hours.</p>
        ) : null}
        <ul className="mt-3 divide-y divide-border">
          {((schedulesRes.data ?? []) as MarketSchedule[])
            .slice()
            .sort((a, b) => a.weekday - b.weekday || String(a.opens_at).localeCompare(String(b.opens_at)))
            .map((row) => {
              const formatted = formatSchedule(row);
              return (
                <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-2 text-sm">
                  <div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
                      <span>{formatted.day}</span>
                      <span className="type-nums whitespace-nowrap">{formatted.hours}</span>
                    </div>
                    {formatted.detail ? <p className="text-sm text-muted-foreground">{formatted.detail}</p> : null}
                  </div>
                  <form
                    action={async (formData) => {
                      "use server";
                      await deleteSchedule(row.id, id, formData);
                    }}
                    className="flex items-center gap-3"
                  >
                    <MaintenanceOverride show={hoursLeftAlone} />
                    <Button type="submit" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </form>
                </li>
              );
            })}
        </ul>
        <form action={saveSchedule} className="mt-4 grid gap-2 sm:grid-cols-5">
          <input type="hidden" name="market_id" value={id} />
          <select name="weekday" aria-label="Weekday" className="h-8 rounded-lg border border-input px-2 text-sm">
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <Input name="opens_at" type="time" required aria-label="Opens" />
          <Input name="closes_at" type="time" required aria-label="Closes" />
          <Input name="season_start" placeholder="MM-DD" aria-label="Season start" />
          <Input name="season_end" placeholder="MM-DD" aria-label="Season end" />
          <MaintenanceOverride show={hoursLeftAlone} className="sm:col-span-5" />
          <Button type="submit" className="sm:col-span-5 w-fit">
            Add hours
          </Button>
        </form>
      </section>
      <section>
        <h2>Stalls</h2>
        {stallsLeftAlone ? (
          <p className="mt-2 text-base text-muted-foreground">Stalls stay with this market.</p>
        ) : null}
        {rosterRes.error ? (
          <p className="mt-3 text-base text-muted-foreground">Could not load stalls.</p>
        ) : ((rosterRes.data ?? []) as RosterRow[]).length ? (
          <ul className="mt-3 divide-y divide-border">
            {((rosterRes.data ?? []) as RosterRow[])
              .slice()
              .sort((a, b) => rosterName(a).localeCompare(rosterName(b)))
              .map((row) => (
                <li key={row.vendor_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-2 text-sm">
                  <div>
                    <p>{rosterName(row)}</p>
                    <p className="text-sm text-muted-foreground">
                      {[row.stall?.trim() || null, rosterDays(row.days) || "No days"].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <form action={unlinkVendorFromMarket} className="flex items-center gap-3">
                    <input type="hidden" name="market_id" value={id} />
                    <input type="hidden" name="vendor_id" value={row.vendor_id} />
                    <MaintenanceOverride show={stallsLeftAlone} />
                    <Button type="submit" variant="ghost" size="sm">
                      Unlink
                    </Button>
                  </form>
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-3 text-base text-muted-foreground">No stalls linked yet.</p>
        )}
        <form action={linkVendorToMarket} className="mt-4 grid gap-2 sm:grid-cols-3">
          <input type="hidden" name="market_id" value={id} />
          <select name="vendor_id" aria-label="Vendor" className="h-8 rounded-lg border border-input px-2 text-sm">
            {((vendors ?? []) as Pick<Vendor, "id" | "name">[]).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <Input name="stall" placeholder="Stall" aria-label="Stall" />
          <Input name="days" placeholder="Days 0–6, at least one" aria-label="Days" required />
          <MaintenanceOverride show={stallsLeftAlone} className="sm:col-span-3" />
          <Button type="submit" className="w-fit">
            Link
          </Button>
        </form>
      </section>
      <ConfirmDelete action={remove} label="Delete market" confirm="Delete this market? This cannot be undone." />
    </div>
  );
}
