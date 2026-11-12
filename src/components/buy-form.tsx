"use client";

import { useActionState, useState } from "react";
import { placeStallOrder } from "@/app/actions/selling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { checkoutTotalCents, MAX_QUANTITY, serviceFeeCents } from "@/lib/selling";

export function BuyForm({
  vendorSlug,
  itemId,
  priceCents,
  offers,
  terms,
  cancelled,
  markets,
  reserve = false,
}: {
  vendorSlug: string;
  itemId: string;
  priceCents: number;
  offers: { delivery: boolean; pickup: boolean; preorder: boolean };
  terms: string | null;
  cancelled: boolean;
  markets: { id: string; name: string }[];
  reserve?: boolean;
}) {
  const [state, action, pending] = useActionState(
    (_prev: { error: string | null } | undefined, formData: FormData) => placeStallOrder(formData),
    undefined,
  );
  const methods = [
    offers.pickup ? "pickup" : null,
    offers.preorder ? "preorder" : null,
  ].filter((method): method is "pickup" | "preorder" => method != null);
  const [fulfillment, setFulfillment] = useState(methods[0] ?? "pickup");
  const [quantity, setQuantity] = useState(1);
  const subtotal = priceCents * quantity;
  const service = serviceFeeCents(subtotal);
  const total = formatPrice(reserve ? subtotal : checkoutTotalCents(subtotal));

  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="vendor_slug" value={vendorSlug} />
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="unit_price_cents" value={priceCents} />
      {cancelled ? <p className="text-sm text-muted-foreground">Payment was not finished.</p> : null}
      {reserve ? (
        <p className="text-base text-muted-foreground">
          This is a reservation. Pay at the stall and show ID. There is no card charge.
        </p>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="pickup_name">Your name</Label>
        <Input id="pickup_name" name="pickup_name" autoComplete="name" maxLength={80} required />
      </div>
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
      {markets.length === 1 ? <input type="hidden" name="market_id" value={markets[0].id} /> : null}
      {markets.length > 1 ? (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Market</legend>
          {markets.map((market) => (
            <label key={market.id} className="flex items-baseline gap-2 text-sm">
              <input type="radio" name="market_id" value={market.id} className="accent-primary" required />
              <span>{market.name}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {methods.length === 1 ? (
        <>
          <p className="text-base text-muted-foreground">
            {methods[0] === "pickup" ? "This is for pickup." : "This is a preorder."}
          </p>
          <input type="hidden" name="fulfillment" value={methods[0]} />
        </>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Pickup or preorder</legend>
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
              <span>{method === "pickup" ? "Pickup" : "Preorder"}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="note">Note for the stall</Label>
        <Input id="note" name="note" maxLength={500} />
      </div>
      {terms ? (
        <div>
          <h2>Stall terms</h2>
          <p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">{terms}</p>
        </div>
      ) : null}
      <p className="type-nums text-base">
        {reserve ? total : `${formatPrice(subtotal)} plus ${formatPrice(service)} service fee · ${total}`}
      </p>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Starting…" : reserve ? "Reserve" : "Pay the stall"}
      </Button>
    </form>
  );
}
