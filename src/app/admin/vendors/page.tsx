import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { buttonVariants } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/constants";
import type { Vendor } from "@/types/database";

export default async function AdminVendorsPage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from("vendors").select("*").order("name");
  const vendors = (data ?? []) as Vendor[];
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Link href="/admin/vendors/new" className={buttonVariants()}>
          New vendor
        </Link>
      </div>
      <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
        {vendors.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{v.name}</p>
              <p className="text-xs text-muted-foreground">{v.status}</p>
            </div>
            <Link href={`/admin/vendors/${v.id}`} className={buttonVariants({ variant: "outline" })}>
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
