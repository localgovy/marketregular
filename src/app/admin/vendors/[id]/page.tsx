import { notFound } from "next/navigation";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { VendorForm } from "@/components/admin/vendor-form";
import { AdminVendorMenu } from "@/components/admin/vendor-menu";
import { readOptOuts } from "@/lib/maintenance-sections";
import { VendorOwnerForm } from "@/components/admin/vendor-owner-form";
import { VendorSellingForm } from "@/components/admin/vendor-selling-form";
import { requireAdmin } from "@/lib/admin";
import { readVendorPassword } from "@/lib/vendor-password";
import { isSupabaseConfigured } from "@/lib/constants";
import { deleteVendor } from "@/app/actions/admin";
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
      <AdminVendorMenu
        vendorId={id}
        menus={((menus ?? []) as AdminMenu[]).map((item) => ({
          ...item,
          menu_section: item.menu_section ?? null,
          menu_section_order: item.menu_section_order ?? null,
        }))}
        menuLeftAlone={menuLeftAlone}
      />
      <ConfirmDelete action={remove} label="Delete vendor" confirm="Delete this stall? This cannot be undone." />
    </div>
  );
}
