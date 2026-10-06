import { notFound } from "next/navigation";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { VendorForm } from "@/components/admin/vendor-form";
import { MaintenanceOverride } from "@/components/maintenance-opt-out-fields";
import { readOptOuts } from "@/lib/maintenance-sections";
import { VendorOwnerForm } from "@/components/admin/vendor-owner-form";
import { VendorSellingForm } from "@/components/admin/vendor-selling-form";
import { requireAdmin } from "@/lib/admin";
import { readVendorPassword } from "@/lib/vendor-password";
import { isSupabaseConfigured } from "@/lib/constants";
import { menuCategoryLabel, menuInProductSearch } from "@/lib/data/product-search";
import { deleteMenuItem, deleteVendor, saveMenuItem } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MenuItem, Vendor } from "@/types/database";

type AdminMenu = MenuItem & { product_category: string | null };

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
      : Promise.resolve({ data: null, error: null }),
  ]);
  const ownerEmail = owner.data?.user?.email ?? null;
  const menuLeftAlone = readOptOuts("vendor", vendor.maintenance_opt_outs).includes("menu");
  const passwordLine =
    secret.error
      ? null
      : secret.data && typeof secret.data.ciphertext === "string"
        ? readVendorPassword(secret.data.ciphertext, secret.data.chosen === true)
        : null;

  async function remove() {
    "use server";
    await deleteVendor(id);
  }

  return (
    <div className="grid gap-10">
      <VendorForm vendor={vendor as Vendor} />
      <section>
        <h2>Owner</h2>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">
          They sign in at /vendor with this account. The stall has no account yet, or this one already runs it.
        </p>
        <VendorOwnerForm vendorId={id} ownerEmail={ownerEmail} />
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
        {menuLeftAlone ? (
          <p className="mt-2 text-base text-muted-foreground">Menu stays with this stall.</p>
        ) : null}
        <ul className="mt-3 divide-y divide-border">
          {((menus ?? []) as AdminMenu[]).map((item) => {
            const inSearch = menuInProductSearch(item.product_category);
            return (
              <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-2 text-sm">
                <div>
                  <p>
                    {item.name}
                    {item.price_cents != null ? ` · $${(item.price_cents / 100).toFixed(2)}` : ""}
                  </p>
                  {item.product_category ? (
                    <p className="text-sm text-muted-foreground">{menuCategoryLabel(item.product_category)}</p>
                  ) : null}
                  {inSearch ? null : (
                    <p className="text-sm text-muted-foreground">On the stall page. Not in product search.</p>
                  )}
                </div>
                <form
                  action={async (formData) => {
                    "use server";
                    await deleteMenuItem(item.id, id, formData);
                  }}
                  className="flex items-center gap-3"
                >
                  <MaintenanceOverride show={menuLeftAlone} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
        <form action={saveMenuItem} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="vendor_id" value={id} />
          <Input name="name" placeholder="Item name" required aria-label="Item name" />
          <Input name="price_cents" placeholder="Price CAD (e.g. 8.50)" aria-label="Price" />
          <Input name="description" placeholder="Description" aria-label="Description" className="sm:col-span-2" />
          <Input name="season" placeholder="Season" aria-label="Season" />
          <Input name="dietary" placeholder="Dietary tags, comma sep" aria-label="Dietary tags" />
          <MaintenanceOverride show={menuLeftAlone} className="sm:col-span-2" />
          <Button type="submit" className="w-fit">
            Add item
          </Button>
        </form>
      </section>
      <ConfirmDelete action={remove} label="Delete vendor" confirm="Delete this stall? This cannot be undone." />
    </div>
  );
}
