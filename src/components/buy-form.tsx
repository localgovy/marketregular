"use client";

import { useActionState, useState } from "react";
import { placeStallOrder } from "@/app/actions/selling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { MAX_QUANTITY } from "@/lib/selling";

export function BuyForm({
  vendorSlug,
  itemId,
  priceCents,
  offers,
  terms,
  cancelled,
}: {
  vendorSlug: string;
  itemId: string;
  priceCents: number;
  offers: { delivery: boolean; pickup: boolean; preorder: boolean };
  terms: string | null;
  cancelled: boolean;
}) {
  const [state, action, pending] = useActionState(
    (_prev: { error: string | null } | undefined, formData: FormData) => placeStallOrder(formData),
    undefined,
  );
  const methods = [
    offers.delivery ? "delivery" : null,
    offers.pickup ? "pickup" : null,
    offers.preorder ? "preorder" : null,
  ].filter((method): method is "delivery" | "pickup" | "preorder" => method != null);
  const [fulfillment, setFulfillment] = useState(methods[0] ?? "pickup");
  const [quantity, setQuantity] = useState(1);
  const total = formatPrice(priceCents * quantity);

  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="vendor_slug" value={vendorSlug} />
      <input type="hidden" name="item_id" value={itemId} />
      {cancelled ? <p className="text-sm text-muted-foreground">Payment was not finished.</p> : null}
      <div className="grid gap-1.5 max-w-32">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={MAX_QUANTITY}
          value={quantity}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isInteger(next)) setQuantity(Math.min(MAX_QUANTITY, Math.max(1, next)));
          }}
          required
        />
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">How you want it</legend>
        {methods.map((method) => (
          <label key={method} className="flex items-baseline gap-2 text-sm">
            <input
              type="radio"
              name="fulfillment"
              value={method}
              checked={fulfillment === method}
              onChange={() => setFulfillment(method)}
              className="accent-primary"
              required
            />
            <span>{method === "delivery" ? "Delivery" : method === "pickup" ? "Pickup" : "Preorder"}</span>
          </label>
        ))}
      </fieldset>
      {fulfillment === "delivery" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="delivery_name">Name</Label>
            <Input id="delivery_name" name="delivery_name" autoComplete="name" required maxLength={120} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="line1">Address</Label>
            <Input id="line1" name="line1" autoComplete="address-line1" required maxLength={200} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" autoComplete="address-level2" required maxLength={80} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="region">Province</Label>
            <Input id="region" name="region" autoComplete="address-level1" required maxLength={40} defaultValue="ON" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="postal">Postal code</Label>
            <Input id="postal" name="postal" autoComplete="postal-code" required maxLength={16} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" name="note" rows={3} maxLength={500} />
          </div>
        </div>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="note">Note for the stall</Label>
          <Textarea id="note" name="note" rows={3} maxLength={500} required />
        </div>
      )}
      {terms ? (
        <div>
          <h2>Stall terms</h2>
          <p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">{terms}</p>
        </div>
      ) : null}
      <p className="type-nums text-base">{total}</p>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Starting payment…" : "Pay the stall"}
      </Button>
    </form>
  );
}
