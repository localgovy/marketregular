import { notFound } from "next/navigation";
import { VendorForm } from "@/components/admin/vendor-form";
import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";
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
  const { data: menus } = await supabase.from("vendor_menus").select("*").eq("vendor_id", id);

  async function remove() {
    "use server";
    await deleteVendor(id);
  }

  return (
    <div className="grid gap-10">
      <VendorForm vendor={vendor as Vendor} />
      <section>
        <h2 className="font-heading text-2xl">Menu items</h2>
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
          <Input name="name" placeholder="Item name" required />
          <Input name="price_cents" placeholder="Price CAD (e.g. 8.50)" />
          <Input name="description" placeholder="Description" className="sm:col-span-2" />
          <Input name="season" placeholder="Season" />
          <Input name="dietary" placeholder="Dietary tags, comma sep" />
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
