/** Columns both the live menu query and the build snapshot must select. */
export const MENU_CATEGORY = "product_category, product_slug";

export const MENU_PUBLIC =
  `id, vendor_id, name, description, price_cents, season, dietary, ${MENU_CATEGORY}, menu_section, menu_section_order, for_sale, offer_delivery, offer_pickup, offer_preorder, offer_terms, can_buy`;

export const MENU_PUBLIC_PHOTO = `${MENU_PUBLIC}, image_url`;

export const MENU_PUBLIC_FLAT =
  `id, vendor_id, name, description, price_cents, season, dietary, ${MENU_CATEGORY}, for_sale, offer_delivery, offer_pickup, offer_preorder, offer_terms, can_buy`;

export function stripMenuCategory(columns: string) {
  return columns.replace(`, ${MENU_CATEGORY}`, "");
}
