import {
  assignMenuItemSection,
  deleteMenuItem,
  moveMenuSection,
  renameMenuSection,
  saveMenuItem,
} from "@/app/actions/admin";
import { MaintenanceOverride } from "@/components/maintenance-opt-out-fields";
import { MenuSectionFields } from "@/components/menu-section-fields";
import { CaretDownMark, CaretUpMark } from "@/components/marks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { menuCategoryLabel, menuInProductSearch } from "@/lib/data/product-search";
import { menuSectionsFromItems, type MenuSectionRef } from "@/lib/menu-sections";
import type { MenuItem } from "@/types/database";

type AdminMenu = MenuItem & { product_category: string | null };

export function AdminVendorMenu({
  vendorId,
  menus,
  menuLeftAlone,
}: {
  vendorId: string;
  menus: AdminMenu[];
  menuLeftAlone: boolean;
}) {
  const sections = menuSectionsFromItems(menus);
  return (
    <section>
      <h2>Menu items</h2>
      {menuLeftAlone ? (
        <p className="mt-2 text-base text-muted-foreground">Menu stays with this stall.</p>
      ) : null}
      <AdminMenuSections
        vendorId={vendorId}
        sections={sections}
        menuLeftAlone={menuLeftAlone}
      />
      <ul className="mt-3 divide-y divide-border">
        {menus.map((item) => {
          const inSearch = menuInProductSearch(item.product_category);
          return (
            <li key={item.id} className="grid gap-3 py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 text-sm">
                <div>
                  <p>
                    {item.name}
                    {item.price_cents != null ? ` · $${(item.price_cents / 100).toFixed(2)}` : ""}
                  </p>
                  {item.menu_section ? (
                    <p className="text-sm text-muted-foreground">{item.menu_section}</p>
                  ) : null}
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
                    await deleteMenuItem(item.id, vendorId, formData);
                  }}
                  className="flex items-center gap-3"
                >
                  <MaintenanceOverride show={menuLeftAlone} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              </div>
              <form action={assignMenuItemSection} className="grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="vendor_id" value={vendorId} />
                <input type="hidden" name="item_id" value={item.id} />
                <MenuSectionFields
                  id={`${item.id}-section`}
                  sections={sections}
                  defaultSection={item.menu_section}
                />
                <MaintenanceOverride show={menuLeftAlone} className="sm:col-span-2" />
                <Button type="submit" variant="outline" className="w-fit">
                  Save section
                </Button>
              </form>
            </li>
          );
        })}
      </ul>
      <form action={saveMenuItem} className="mt-4 grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="vendor_id" value={vendorId} />
        <Input name="name" placeholder="Item name" required aria-label="Item name" />
        <Input name="price_cents" placeholder="Price CAD (e.g. 8.50)" aria-label="Price" />
        <Input name="description" placeholder="Description" aria-label="Description" className="sm:col-span-2" />
        <Input name="season" placeholder="Season" aria-label="Season" />
        <Input name="dietary" placeholder="Dietary tags, comma sep" aria-label="Dietary tags" />
        <MenuSectionFields id={`${vendorId}-new-item`} sections={sections} />
        <MaintenanceOverride show={menuLeftAlone} className="sm:col-span-2" />
        <Button type="submit" className="w-fit">
          Add item
        </Button>
      </form>
    </section>
  );
}

function AdminMenuSections({
  vendorId,
  sections,
  menuLeftAlone,
}: {
  vendorId: string;
  sections: MenuSectionRef[];
  menuLeftAlone: boolean;
}) {
  if (!sections.length) return null;
  return (
    <div className="mt-4 grid gap-3">
      <h3>Sections</h3>
      <p className="text-sm text-muted-foreground">
        Up to 5 named groups on the stall page. Rename or reorder them here.
      </p>
      <ul className="grid gap-3">
        {sections.map((section, index) => (
          <li
            key={section.name}
            className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          >
            <form action={renameMenuSection} className="grid gap-1.5 min-w-0">
              <input type="hidden" name="vendor_id" value={vendorId} />
              <input type="hidden" name="from" value={section.name} />
              <label htmlFor={`${vendorId}-admin-section-${index}`} className="text-sm font-medium">
                Name
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  id={`${vendorId}-admin-section-${index}`}
                  name="name"
                  required
                  maxLength={40}
                  defaultValue={section.name}
                  className="min-w-0 flex-1"
                />
                <MaintenanceOverride show={menuLeftAlone} />
                <Button type="submit">Rename</Button>
              </div>
            </form>
            <div className="flex items-center gap-1">
              <form action={moveMenuSection}>
                <input type="hidden" name="vendor_id" value={vendorId} />
                <input type="hidden" name="section" value={section.name} />
                <input type="hidden" name="direction" value="up" />
                <MaintenanceOverride show={menuLeftAlone} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move up"
                  disabled={index === 0}
                >
                  <CaretUpMark className="size-4" />
                </Button>
              </form>
              <form action={moveMenuSection}>
                <input type="hidden" name="vendor_id" value={vendorId} />
                <input type="hidden" name="section" value={section.name} />
                <input type="hidden" name="direction" value="down" />
                <MaintenanceOverride show={menuLeftAlone} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move down"
                  disabled={index === sections.length - 1}
                >
                  <CaretDownMark className="size-4" />
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
