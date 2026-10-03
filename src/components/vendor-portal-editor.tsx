"use client";

import { useActionState, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { beginStallPayments, payStallFee } from "@/app/actions/selling";
import {
  clearOwnedLogo,
  deleteOwnedMenuItem,
  deleteOwnedStall,
  saveOwnedMenuItem,
  saveOwnedStall,
  saveOwnedVendor,
  searchPortalMarkets,
  uploadOwnedLogo,
} from "@/app/actions/vendor-portal";
import { ListingMark } from "@/components/listing-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT_TAGS, WEEKDAYS } from "@/lib/constants";
import { tagLabel } from "@/lib/tag-label";
import { cn } from "@/lib/utils";
import {
  dayHoursLabel,
  dollarsFromCents,
  normalizePortalTag,
  type PortalHours,
  type PortalListing,
  type PortalMarketHit,
  type PortalMenuItem,
  type PortalResult,
  type PortalStall,
} from "@/lib/vendor-portal";
import { SITE_NAME } from "@/lib/constants";
import { feeDueLabel, fulfillmentLabel, orderStatusLabel } from "@/lib/selling";
import { formatPrice } from "@/lib/format";

const PRODUCT_TAG_SET = new Set<string>(PRODUCT_TAGS);

function bindPortal(action: (formData: FormData) => Promise<PortalResult>) {
  return (_prev: PortalResult | undefined, formData: FormData) => action(formData);
}

const saveListing = bindPortal(saveOwnedVendor);
const uploadLogo = bindPortal(uploadOwnedLogo);
const clearLogo = bindPortal(clearOwnedLogo);
const saveItem = bindPortal(saveOwnedMenuItem);
const removeItem = bindPortal(deleteOwnedMenuItem);
const saveStall = bindPortal(saveOwnedStall);
const removeStall = bindPortal(deleteOwnedStall);
const startPayments = bindPortal(beginStallPayments);

const StallConnect = dynamic(
  () => import("@/components/stall-connect").then((mod) => mod.StallConnect),
  { ssr: false },
);

function usePortalRefresh(state: PortalResult | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (state?.message) router.refresh();
  }, [state, router]);
}

function PortalNote({ state }: { state: PortalResult | undefined }) {
  if (state?.error) return <p className="text-sm text-destructive">{state.error}</p>;
  if (state?.message) return <p className="text-sm text-primary">{state.message}</p>;
  return null;
}

function DayChoices({
  openDays,
  hours,
  selected,
}: {
  openDays: number[];
  hours: PortalHours[];
  selected: number[];
}) {
  if (!openDays.length) {
    return <p className="text-sm text-muted-foreground">This market has no hours yet.</p>;
  }
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">Days at this market</legend>
      {openDays.map((day) => {
        const hoursLabel = dayHoursLabel(hours, day);
        return (
          <label key={day} className="flex items-baseline gap-2 text-sm">
            <input
              type="checkbox"
              name="days"
              value={day}
              defaultChecked={selected.includes(day)}
              className="accent-primary"
            />
            <span>{WEEKDAYS[day]}</span>
            {hoursLabel ? (
              <span className="type-nums text-muted-foreground">{hoursLabel}</span>
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );
}

function TagPicker({ id, tags }: { id: string; tags: string[] }) {
  const [selected, setSelected] = useState(
    () => new Set(tags.filter((tag) => PRODUCT_TAG_SET.has(tag))),
  );
  const [extras, setExtras] = useState(() => tags.filter((tag) => !PRODUCT_TAG_SET.has(tag)));
  const [draft, setDraft] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const all = [...PRODUCT_TAGS.filter((tag) => selected.has(tag)), ...extras];

  function addExtra() {
    const cleaned = normalizePortalTag(draft);
    if (!cleaned) {
      setTagError("That tag is not allowed.");
      return;
    }
    setTagError(null);
    setDraft("");
    if (PRODUCT_TAG_SET.has(cleaned)) {
      setSelected((current) => new Set(current).add(cleaned));
      return;
    }
    setExtras((current) => (current.includes(cleaned) ? current : [...current, cleaned]));
  }

  return (
    <div className="grid gap-3 sm:col-span-2">
      <p className="text-sm font-medium" id={`${id}-tags`}>
        Tags
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-tags`}>
        {PRODUCT_TAGS.map((tag) => {
          const on = selected.has(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (next.has(tag)) next.delete(tag);
                  else next.add(tag);
                  return next;
                })
              }
              className={cn(
                "stall-chip-sm inline-flex h-9 items-center px-3 text-sm font-medium",
                on
                  ? "bg-stamp text-chalk"
                  : "border border-input bg-card text-foreground hover:bg-muted",
              )}
            >
              {tagLabel(tag)}
            </button>
          );
        })}
      </div>
      {extras.length ? (
        <ul className="flex flex-wrap gap-2">
          {extras.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => setExtras((current) => current.filter((item) => item !== tag))}
                className="stall-chip-sm inline-flex h-9 items-center gap-2 border border-input bg-card px-3 text-sm font-medium hover:bg-muted"
              >
                {tagLabel(tag)}
                <span className="text-muted-foreground">Remove</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid min-w-48 flex-1 gap-1.5">
          <Label htmlFor={`${id}-extra-tag`}>Another tag</Label>
          <Input
            id={`${id}-extra-tag`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Jamaican"
            maxLength={40}
          />
        </div>
        <Button type="button" variant="outline" onClick={addExtra}>
          Add tag
        </Button>
      </div>
      {tagError ? <p className="text-sm text-destructive">{tagError}</p> : null}
      {all.map((tag) => (
        <input key={tag} type="hidden" name="tags" value={tag} />
      ))}
    </div>
  );
}

function ListingForm({ listing }: { listing: PortalListing }) {
  const [state, action, pending] = useActionState(saveListing, undefined);
  const id = listing.id;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="vendor_id" value={id} />
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input id={`${id}-name`} name="name" required maxLength={200} defaultValue={listing.name} />
        <p className="text-sm text-muted-foreground">{`The page address stays /vendors/${listing.slug}.`}</p>
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-about`}>About</Label>
        <Textarea
          id={`${id}-about`}
          name="about"
          rows={5}
          maxLength={4000}
          defaultValue={listing.about ?? ""}
        />
      </div>
      <TagPicker id={id} tags={listing.tags} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-phone`}>Phone</Label>
        <Input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          defaultValue={listing.phone ?? ""}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={120}
          defaultValue={listing.email ?? ""}
        />
      </div>
      <p className="text-sm text-muted-foreground sm:col-span-2">
        Phone and email show on the public page.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-website`}>Website</Label>
        <Input id={`${id}-website`} name="website" defaultValue={listing.website ?? ""} maxLength={2048} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-instagram`}>Instagram</Label>
        <Input
          id={`${id}-instagram`}
          name="instagram"
          defaultValue={listing.instagram ?? ""}
          maxLength={2048}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-tiktok`}>TikTok</Label>
        <Input id={`${id}-tiktok`} name="tiktok" defaultValue={listing.tiktok ?? ""} maxLength={2048} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-facebook`}>Facebook</Label>
        <Input
          id={`${id}-facebook`}
          name="facebook"
          defaultValue={listing.facebook ?? ""}
          maxLength={2048}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save listing"}
        </Button>
        <PortalNote state={state} />
      </div>
    </form>
  );
}

function LogoForm({ listing }: { listing: PortalListing }) {
  const [uploadState, upload, uploadPending] = useActionState(uploadLogo, undefined);
  const [clearState, clear, clearPending] = useActionState(clearLogo, undefined);
  usePortalRefresh(uploadState);
  usePortalRefresh(clearState);

  return (
    <div className="grid gap-4">
      {listing.logo_url ? <ListingMark src={listing.logo_url} className="h-16 w-24" /> : null}
      <form action={upload} className="grid gap-3">
        <input type="hidden" name="vendor_id" value={listing.id} />
        <div className="grid gap-1.5">
          <Label htmlFor={`${listing.id}-logo`}>Logo</Label>
          <Input
            id={`${listing.id}-logo`}
            name="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </div>
        <p className="text-sm text-muted-foreground">JPEG, PNG, or WebP, under 5 MB.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={uploadPending}>
            {uploadPending ? "Saving…" : "Upload logo"}
          </Button>
          <PortalNote state={uploadState} />
        </div>
      </form>
      {listing.logo_url ? (
        <form action={clear} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="vendor_id" value={listing.id} />
          <Button type="submit" variant="outline" disabled={clearPending}>
            {clearPending ? "Removing…" : "Remove logo"}
          </Button>
          <PortalNote state={clearState} />
        </form>
      ) : null}
    </div>
  );
}

function SaleFields({
  id,
  forSale,
  delivery,
  pickup,
  preorder,
  terms,
}: {
  id: string;
  forSale: boolean;
  delivery: boolean;
  pickup: boolean;
  preorder: boolean;
  terms: string;
}) {
  return (
    <fieldset className="grid gap-3 sm:col-span-2">
      <legend className="text-sm font-medium">Selling</legend>
      <label className="flex items-baseline gap-2 text-sm">
        <input type="checkbox" name="for_sale" defaultChecked={forSale} className="accent-primary" />
        <span>Offer this item for sale</span>
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-baseline gap-2 text-sm">
          <input type="checkbox" name="offer_delivery" defaultChecked={delivery} className="accent-primary" />
          <span>Delivery</span>
        </label>
        <label className="flex items-baseline gap-2 text-sm">
          <input type="checkbox" name="offer_pickup" defaultChecked={pickup} className="accent-primary" />
          <span>Pickup</span>
        </label>
        <label className="flex items-baseline gap-2 text-sm">
          <input type="checkbox" name="offer_preorder" defaultChecked={preorder} className="accent-primary" />
          <span>Preorder</span>
        </label>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-terms`}>Terms</Label>
        <Textarea id={`${id}-terms`} name="offer_terms" rows={4} maxLength={4000} defaultValue={terms} />
      </div>
      <p className="text-sm text-muted-foreground">
        A sale needs a price of at least $0.50 and one way to hand it over. Buyers pay you. The stall fee is separate.
      </p>
    </fieldset>
  );
}

function MenuItemForm({ vendorId, item }: { vendorId: string; item: PortalMenuItem }) {
  const [state, action, pending] = useActionState(saveItem, undefined);
  const [removeState, remove, removePending] = useActionState(removeItem, undefined);
  usePortalRefresh(state);
  usePortalRefresh(removeState);
  const field = `${item.id}`;

  return (
    <li className="grid gap-3 border-b border-border py-4 last:border-b-0">
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="vendor_id" value={vendorId} />
        <input type="hidden" name="item_id" value={item.id} />
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${field}-name`}>Item</Label>
          <Input id={`${field}-name`} name="name" required maxLength={160} defaultValue={item.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${field}-price`}>Price CAD</Label>
          <Input
            id={`${field}-price`}
            name="price"
            inputMode="decimal"
            placeholder="8.50"
            defaultValue={dollarsFromCents(item.price_cents)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${field}-season`}>Season</Label>
          <Input id={`${field}-season`} name="season" maxLength={120} defaultValue={item.season ?? ""} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${field}-description`}>Description</Label>
          <Input
            id={`${field}-description`}
            name="description"
            maxLength={2000}
            defaultValue={item.description ?? ""}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${field}-dietary`}>Dietary tags</Label>
          <Input
            id={`${field}-dietary`}
            name="dietary"
            placeholder="vegan, gluten-free"
            defaultValue={item.dietary.join(", ")}
          />
        </div>
        <SaleFields
          id={field}
          forSale={item.for_sale}
          delivery={item.offer_delivery}
          pickup={item.offer_pickup}
          preorder={item.offer_preorder}
          terms={item.offer_terms ?? ""}
        />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save item"}
          </Button>
          <PortalNote state={state} />
        </div>
      </form>
      <form action={remove} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="vendor_id" value={vendorId} />
        <input type="hidden" name="item_id" value={item.id} />
        <Button type="submit" variant="outline" disabled={removePending}>
          {removePending ? "Removing…" : "Remove item"}
        </Button>
        <PortalNote state={removeState} />
      </form>
    </li>
  );
}

function AddMenuItem({ vendorId }: { vendorId: string }) {
  const [state, action, pending] = useActionState(saveItem, undefined);
  const [formKey, setFormKey] = useState(0);
  usePortalRefresh(state);
  useEffect(() => {
    if (state?.message) setFormKey((key) => key + 1);
  }, [state]);

  return (
    <div className="mt-4 grid gap-3">
      <h3>Add an item</h3>
      <form key={formKey} action={action} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="vendor_id" value={vendorId} />
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${vendorId}-new-name`}>Item</Label>
          <Input id={`${vendorId}-new-name`} name="name" required maxLength={160} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${vendorId}-new-price`}>Price CAD</Label>
          <Input id={`${vendorId}-new-price`} name="price" inputMode="decimal" placeholder="8.50" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${vendorId}-new-season`}>Season</Label>
          <Input id={`${vendorId}-new-season`} name="season" maxLength={120} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${vendorId}-new-description`}>Description</Label>
          <Input id={`${vendorId}-new-description`} name="description" maxLength={2000} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${vendorId}-new-dietary`}>Dietary tags</Label>
          <Input id={`${vendorId}-new-dietary`} name="dietary" placeholder="vegan, gluten-free" />
        </div>
        <SaleFields id={`${vendorId}-new`} forSale={false} delivery={false} pickup={false} preorder={false} terms="" />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add item"}
          </Button>
        </div>
      </form>
      <PortalNote state={state} />
    </div>
  );
}

function StallForm({
  vendorId,
  stall,
  last,
  staysWithoutHall,
}: {
  vendorId: string;
  stall: PortalStall;
  last: boolean;
  staysWithoutHall: boolean;
}) {
  const [state, action, pending] = useActionState(saveStall, undefined);
  const [removeState, remove, removePending] = useActionState(removeStall, undefined);
  usePortalRefresh(state);
  usePortalRefresh(removeState);

  return (
    <li className="grid gap-3 border-b border-border py-4 last:border-b-0">
      <div>
        <p className="text-base font-medium">{stall.market_name}</p>
        {stall.market_city ? (
          <p className="text-sm text-muted-foreground">{stall.market_city}</p>
        ) : null}
      </div>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="vendor_id" value={vendorId} />
        <input type="hidden" name="market_id" value={stall.market_id} />
        <input type="hidden" name="market_slug" value={stall.market_slug} />
        <div className="grid gap-1.5">
          <Label htmlFor={`${stall.market_id}-stall`}>Stall label</Label>
          <Input
            id={`${stall.market_id}-stall`}
            name="stall"
            maxLength={80}
            defaultValue={stall.stall ?? ""}
            placeholder="Booth or row"
          />
        </div>
        <DayChoices openDays={stall.open_days} hours={stall.hours} selected={stall.days} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || stall.open_days.length === 0}>
            {pending ? "Saving…" : "Save days"}
          </Button>
          <PortalNote state={state} />
        </div>
      </form>
      <form action={remove} className="grid gap-2">
        <input type="hidden" name="vendor_id" value={vendorId} />
        <input type="hidden" name="market_id" value={stall.market_id} />
        {last ? (
          <p className="text-sm text-muted-foreground">
            {staysWithoutHall
              ? "This listing stays on the site without a market."
              : "Removing the last market hides the public page until you add a hall again."}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" disabled={removePending}>
            {removePending ? "Removing…" : "Remove market"}
          </Button>
          <PortalNote state={removeState} />
        </div>
      </form>
    </li>
  );
}

function AddStall({ vendorId, takenIds }: { vendorId: string; takenIds: string[] }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PortalMarketHit[]>([]);
  const [picked, setPicked] = useState<PortalMarketHit | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [state, action, pending] = useActionState(saveStall, undefined);
  const takenKey = takenIds.join(",");
  usePortalRefresh(state);

  useEffect(() => {
    if (state?.message) {
      setPicked(null);
      setQuery("");
      setHits([]);
    }
  }, [state]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchPortalMarkets(q).then((result) => {
        if (cancelled) return;
        setSearching(false);
        setSearchError(result.error);
        const taken = new Set(takenKey.split(",").filter(Boolean));
        setHits(result.markets.filter((market) => !taken.has(market.id)));
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, takenKey]);

  return (
    <div className="mt-4 grid gap-3">
      <h3>Add a market</h3>
      <div className="grid gap-1.5">
        <Label htmlFor={`${vendorId}-market-q`}>Find a market</Label>
        <Input
          id={`${vendorId}-market-q`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPicked(null);
          }}
          placeholder="Market name"
          autoComplete="off"
        />
      </div>
      {searchError ? <p className="text-sm text-destructive">{searchError}</p> : null}
      {hits.length ? (
        <ul className="grid gap-1">
          {hits.map((market) => (
            <li key={market.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left outline-none hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                onClick={() => setPicked(market)}
              >
                <span className="block text-base font-medium">{market.name}</span>
                {market.city ? (
                  <span className="mt-0.5 block text-sm text-muted-foreground">{market.city}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 && !searchError && !searching ? (
        <p className="text-sm text-muted-foreground">No markets match that name.</p>
      ) : null}
      {picked ? (
        <form action={action} className="grid gap-3 rounded-xl bg-secondary/50 p-4">
          <input type="hidden" name="vendor_id" value={vendorId} />
          <input type="hidden" name="market_id" value={picked.id} />
          <input type="hidden" name="market_slug" value={picked.slug} />
          <p className="text-base font-medium">{picked.name}</p>
          <div className="grid gap-1.5">
            <Label htmlFor={`${picked.id}-new-stall`}>Stall label</Label>
            <Input id={`${picked.id}-new-stall`} name="stall" maxLength={80} placeholder="Booth or row" />
          </div>
          <DayChoices openDays={picked.openDays} hours={picked.hours} selected={picked.openDays} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || picked.openDays.length === 0}>
              {pending ? "Saving…" : "Add market"}
            </Button>
            <PortalNote state={state} />
          </div>
        </form>
      ) : (
        <PortalNote state={state} />
      )}
    </div>
  );
}

export function VendorPortalEditor({
  listing,
  staysWithoutHall,
  paymentsConfigured,
  feeNote,
}: {
  listing: PortalListing;
  staysWithoutHall: boolean;
  paymentsConfigured: boolean;
  feeNote: string | null;
}) {
  const full = listing.stalls.length >= 40;
  const balance = formatPrice(listing.fee_balance_cents);
  const due = feeDueLabel(listing.fee_due_on);
  const [payState, pay, payPending] = useActionState(
    (_prev: { error: string | null } | undefined, formData: FormData) => payStallFee(formData),
    undefined,
  );
  const [setupState, setup, setupPending] = useActionState(startPayments, undefined);
  usePortalRefresh(setupState);

  return (
    <div className="grid gap-10">
      <section>
        <h2>Selling</h2>
        {feeNote ? <p className="mt-2 text-sm text-muted-foreground">{feeNote}</p> : null}
        {listing.selling_approved ? (
          <div className="mt-4 grid gap-4">
            <p className="text-sm text-muted-foreground">
              Buyers pay this stall. LOCALGOVY keeps a separate fee of 3.5% plus $0.25 on each paid checkout.
              {due && listing.fee_balance_cents > 0 ? ` Unpaid fees are due ${due}.` : ""}
            </p>
            <p className="text-base">
              {listing.fee_balance_cents > 0 ? (
                <>
                  Balance due <span className="type-nums">{balance}</span>
                </>
              ) : listing.fee_balance_cents < 0 ? (
                <>
                  Credit <span className="type-nums">{formatPrice(Math.abs(listing.fee_balance_cents))}</span>. It
                  comes off the next stall fee.
                </>
              ) : (
                "No stall fee is waiting."
              )}
            </p>
            {listing.fee_balance_cents > 0 && listing.fee_balance_cents < 50 ? (
              <p className="text-sm text-muted-foreground">
                This balance is under $0.50. It stays due, and you can pay it here once it reaches $0.50.
              </p>
            ) : null}
            {listing.fee_balance_cents >= 50 ? (
              <form action={pay} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="vendor_id" value={listing.id} />
                <Button type="submit" disabled={payPending}>
                  {payPending ? "Starting payment…" : "Pay balance"}
                </Button>
                {payState?.error ? <p className="text-sm text-destructive">{payState.error}</p> : null}
              </form>
            ) : null}
            {paymentsConfigured ? (
              listing.payments_started ? (
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">
                    {listing.card_payments_active
                      ? "Card payments are on."
                      : "Finish the payment setup before a Buy button can show."}
                    {listing.payouts_active ? " Payouts are on." : " Payouts are not on yet."} The full dashboard is at
                    dashboard.stripe.com.
                  </p>
                  <StallConnect vendorId={listing.id} cardPaymentsActive={listing.card_payments_active} />
                </div>
              ) : (
                <form action={setup} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="vendor_id" value={listing.id} />
                  <Button type="submit" disabled={setupPending}>
                    {setupPending ? "Starting…" : "Set up payments"}
                  </Button>
                  <PortalNote state={setupState} />
                </form>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Payments are not available yet.</p>
            )}
            {listing.orders.length ? (
              <ul className="divide-y divide-border">
                {listing.orders.map((order) => (
                  <li key={order.id} className="grid gap-1 py-3">
                    <p className="text-base font-medium">{order.item_name}</p>
                    <p className="type-nums text-sm text-muted-foreground">
                      {order.quantity} · {formatPrice(order.charge_cents)} · {fulfillmentLabel(order.fulfillment)} ·{" "}
                      {orderStatusLabel(order.status)}
                    </p>
                    {order.buyer_email ? (
                      <p className="text-sm text-muted-foreground">{order.buyer_email}</p>
                    ) : null}
                    {order.fulfillment_note ? (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.fulfillment_note}</p>
                    ) : null}
                    {order.delivery_line1 ? (
                      <p className="text-sm text-muted-foreground">
                        {[order.delivery_name, order.delivery_line1, order.delivery_city, order.delivery_region, order.delivery_postal]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No paid orders yet.</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Selling is off until {SITE_NAME} turns it on. You can still set delivery, pickup, or preorder on an item.
          </p>
        )}
      </section>
      <section>
        <h2>Profile</h2>
        <div className="mt-4">
          <ListingForm
            key={`${listing.name}\n${listing.about ?? ""}\n${listing.phone ?? ""}\n${listing.email ?? ""}\n${listing.tags.join(",")}`}
            listing={listing}
          />
        </div>
      </section>
      <section>
        <h2>Logo</h2>
        <div className="mt-4">
          <LogoForm listing={listing} />
        </div>
      </section>
      <section>
        <h2>Menu</h2>
        {listing.menus.length ? (
          <ul className="mt-2">
            {listing.menus.map((item) => (
              <MenuItemForm
                key={[
                  item.id,
                  item.price_cents ?? "",
                  item.for_sale ? "1" : "0",
                  item.offer_delivery ? "1" : "0",
                  item.offer_pickup ? "1" : "0",
                  item.offer_preorder ? "1" : "0",
                  item.offer_terms ?? "",
                ].join("\n")}
                vendorId={listing.id}
                item={item}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No items yet.</p>
        )}
        {listing.menus.length < 80 ? <AddMenuItem vendorId={listing.id} /> : (
          <p className="mt-4 text-sm text-muted-foreground">The menu is full.</p>
        )}
      </section>
      <section>
        <h2>Markets</h2>
        {listing.stalls.length ? (
          <ul className="mt-2">
            {listing.stalls.map((stall) => (
              <StallForm
                key={stall.market_id}
                vendorId={listing.id}
                stall={stall}
                last={listing.stalls.length === 1}
                staysWithoutHall={staysWithoutHall}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {staysWithoutHall
              ? "This listing stays on the site without a market."
              : "This stall is not at a hall, so the public page is hidden until you add one."}
          </p>
        )}
        {full ? (
          <p className="mt-4 text-sm text-muted-foreground">The stall list is full.</p>
        ) : (
          <AddStall vendorId={listing.id} takenIds={listing.stalls.map((stall) => stall.market_id)} />
        )}
      </section>
    </div>
  );
}
