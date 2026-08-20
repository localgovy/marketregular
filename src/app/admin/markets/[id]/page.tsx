import { notFound } from "next/navigation";
import { MarketForm } from "@/components/admin/market-form";
import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured, WEEKDAYS } from "@/lib/constants";
import { formatHours } from "@/lib/schedule";
import { deleteMarket, deleteSchedule, linkVendorToMarket, saveSchedule } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Market, MarketSchedule, Vendor } from "@/types/database";

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
  const [{ data: schedules }, { data: vendors }] = await Promise.all([
    supabase.from("market_schedules").select("*").eq("market_id", id),
    supabase.from("vendors").select("id, name").order("name"),
  ]);

  async function remove() {
    "use server";
    await deleteMarket(id);
  }

  return (
    <div className="grid gap-10">
      <MarketForm market={market as Market} />
      <section>
        <h2>Hours</h2>
        <ul className="mt-3 divide-y divide-border">
          {((schedules ?? []) as MarketSchedule[]).map((row) => (
            <li key={row.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {WEEKDAYS[row.weekday]} {formatHours(String(row.opens_at), String(row.closes_at))}
              </span>
              <form
                action={async () => {
                  "use server";
                  await deleteSchedule(row.id, id);
                }}
              >
                <Button type="submit" variant="ghost" size="sm">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
        <form action={saveSchedule} className="mt-4 grid gap-2 sm:grid-cols-5">
          <input type="hidden" name="market_id" value={id} />
          <select name="weekday" className="h-8 rounded-lg border border-input px-2 text-sm">
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <Input name="opens_at" type="time" required />
          <Input name="closes_at" type="time" required />
          <Input name="season_start" placeholder="MM-DD" />
          <Input name="season_end" placeholder="MM-DD" />
          <Button type="submit" className="sm:col-span-5 w-fit">
            Add hours
          </Button>
        </form>
      </section>
      <section>
        <h2>Attach a vendor</h2>
        <form action={linkVendorToMarket} className="mt-3 grid gap-2 sm:grid-cols-3">
          <input type="hidden" name="market_id" value={id} />
          <select name="vendor_id" className="h-8 rounded-lg border border-input px-2 text-sm">
            {((vendors ?? []) as Pick<Vendor, "id" | "name">[]).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <Input name="stall" placeholder="Stall" />
          <Input name="days" placeholder="Days 0-6 comma sep" />
          <Button type="submit" className="w-fit">
            Link
          </Button>
        </form>
      </section>
      <form action={remove}>
        <Button type="submit" variant="destructive">
          Delete market
        </Button>
      </form>
    </div>
  );
}
