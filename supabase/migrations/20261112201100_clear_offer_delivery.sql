-- Pickup and preorder are the ways an item can be handed over.
-- Older rows can still say delivery. Clear them so the public stall
-- does not offer a handover checkout will refuse.

update public.vendor_menus
set offer_delivery = false
where offer_delivery;
