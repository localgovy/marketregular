import Link from "next/link";
import { fetchAllRows, requireAdmin } from "@/lib/admin";
import { groupMaintenanceOptOuts, readOptOuts, type MaintenanceListing } from "@/lib/maintenance-sections";
import { isSupabaseConfigured } from "@/lib/constants";

export default async function AdminUpdatesPage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const [vendors, markets] = await Promise.all([
    fetchAllRows<MaintenanceListing>((from, to) =>
      supabase.from("vendors").select("id, name, maintenance_opt_outs").order("name").range(from, to),
    ),
    fetchAllRows<MaintenanceListing>((from, to) =>
      supabase.from("markets").select("id, name, maintenance_opt_outs").order("name").range(from, to),
    ),
  ]);
  const groups = groupMaintenanceOptOuts(
    vendors.map((row) => ({ ...row, maintenance_opt_outs: readOptOuts("vendor", row.maintenance_opt_outs) })),
    markets.map((row) => ({ ...row, maintenance_opt_outs: readOptOuts("market", row.maintenance_opt_outs) })),
  );

  return (
    <div className="grid gap-10">
      {groups.map((group) => {
        const empty = group.vendors.length === 0 && group.markets.length === 0;
        return (
          <section key={group.key}>
            <h2>{group.label}</h2>
            {empty ? (
              <p className="mt-2 text-base text-muted-foreground">
                No stalls or markets have left this section alone.
              </p>
            ) : (
              <div className="mt-3 grid gap-6">
                {group.vendors.length ? (
                  <div>
                    <h3>Vendors</h3>
                    <ul className="mt-2 divide-y divide-border">
                      {group.vendors.map((vendor) => (
                        <li key={vendor.id} className="py-2">
                          <Link href={`/admin/vendors/${vendor.id}`} className="text-base font-medium hover:underline">
                            {vendor.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {group.markets.length ? (
                  <div>
                    <h3>Markets</h3>
                    <ul className="mt-2 divide-y divide-border">
                      {group.markets.map((market) => (
                        <li key={market.id} className="py-2">
                          <Link href={`/admin/markets/${market.id}`} className="text-base font-medium hover:underline">
                            {market.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
