import { notFound } from "next/navigation";
import { VendorForm } from "@/components/admin/vendor-form";
import { VendorOwnerForm } from "@/components/admin/vendor-owner-form";
import { VendorSellingForm } from "@/components/admin/vendor-selling-form";
import { requireAdmin } from "@/lib/admin";
import { readVendorPassword } from "@/lib/vendor-password";
import { isSupabaseConfigured } from "@/lib/constants";
import { withListingStats } from "@/lib/listing-score";
import { deleteVendor, saveMenuItem } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MenuItem, Vendor } from "@/types/database";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) return null;
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();
  if (!vendor) notFound();
  const [{ data: menus }, owner, secret] = await Promise.all([
    supabase.from("vendor_menus").select("*").eq("vendor_id", id),
    vendor.claimed_by
      ? supabase.auth.admin.getUserById(vendor.claimed_by)
      : Promise.resolve({ data: { user: null } }),
    vendor.claimed_by
      ? supabase
          .from("vendor_sign_in_secrets")
          .select("ciphertext, chosen")
          .eq("user_id", vendor.claimed_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const ownerEmail = owner.data?.user?.email ?? null;
  const passwordLine =
    secret.data && typeof secret.data.ciphertext === "string"
      ? readVendorPassword(secret.data.ciphertext, secret.data.chosen === true)
      : null;

  async function remove() {
    "use server";
    await deleteVendor(id);
  }

  return (
    <div className="grid gap-10">
      <VendorForm vendor={withListingStats(vendor as Vendor)} />
      <section>
        <h2>Owner</h2>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">
          They sign in at /vendor with this account. The stall has to be unclaimed, or already theirs.
        </p>
        <VendorOwnerForm vendorId={id} ownerEmail={ownerEmail} />
        {passwordLine ? (
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">{passwordLine.label}. </span>
            <span className="font-medium">{passwordLine.value}</span>
          </p>
        ) : null}
      </section>
      <section>
        <h2>Selling</h2>
        <div className="mt-4">
          <VendorSellingForm
            vendorId={id}
            approved={vendor.selling_approved === true}
          />
        </div>
      </section>
      <section>
        <h2>Menu items</h2>
        <ul className="mt-3 divide-y divide-border">
          {((menus ?? []) as MenuItem[]).map((item) => (
            <li key={item.id} className="py-2 text-sm">
              {item.name}
              {item.price_cents != null ? ` · $${(item.price_cents / 100).toFixed(2)}` : ""}
            </li>
          ))}
        </ul>
        <form action={saveMenuItem} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="vendor_id" value={id} />
          <Input name="name" placeholder="Item name" required aria-label="Item name" />
          <Input name="price_cents" placeholder="Price CAD (e.g. 8.50)" aria-label="Price" />
          <Input name="description" placeholder="Description" aria-label="Description" className="sm:col-span-2" />
          <Input name="season" placeholder="Season" aria-label="Season" />
          <Input name="dietary" placeholder="Dietary tags, comma sep" aria-label="Dietary tags" />
          <Button type="submit" className="w-fit">
            Add item
          </Button>
        </form>
      </section>
      <form action={remove}>
        <Button type="submit" variant="destructive">
          Delete vendor
        </Button>
      </form>
    </div>
  );
}
