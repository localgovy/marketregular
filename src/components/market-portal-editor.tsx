"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearMarketVendorLogo,
  clearOwnedMarketLogo,
  createMarketVendor,
  deleteMarketRoster,
  deleteOwnedSchedule,
  saveMarketRoster,
  saveMarketVendorProfile,
  saveOwnedMarket,
  saveOwnedSchedule,
  searchPortalVendors,
  uploadMarketVendorLogo,
  uploadOwnedMarketLogo,
} from "@/app/actions/market-portal";
import { ListingMark } from "@/components/listing-mark";
import { MaintenanceOptOutForm } from "@/components/maintenance-opt-outs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AMENITY_TAGS, PRODUCT_TAGS, PROVINCES, RECORD_TAGS, WEEKDAYS } from "@/lib/constants";
import {
  MARKET_CREATED_CAP,
  MARKET_ROSTER_CAP,
  MARKET_SCHEDULE_CAP,
  openDaysFromSchedules,
  type MarketPortalListing,
  type MarketPortalSchedule,
  type MarketRosterStall,
  type PortalVendorHit,
} from "@/lib/market-portal";
import { tagLabel } from "@/lib/tag-label";
import { cn } from "@/lib/utils";
import {
  dayHoursLabel,
  normalizePortalTag,
  PORTAL_TAG_CAP,
  type PortalHours,
  type PortalResult,
} from "@/lib/vendor-portal";

const MARKET_TAGS = [...PRODUCT_TAGS, ...AMENITY_TAGS, ...RECORD_TAGS];

function bindPortal(action: (formData: FormData) => Promise<PortalResult>) {
  return (_prev: PortalResult | undefined, formData: FormData) => action(formData);
}

const saveListing = bindPortal(saveOwnedMarket);
const uploadLogo = bindPortal(uploadOwnedMarketLogo);
const clearLogo = bindPortal(clearOwnedMarketLogo);
const saveHours = bindPortal(saveOwnedSchedule);
const removeHours = bindPortal(deleteOwnedSchedule);
const saveStall = bindPortal(saveMarketRoster);
const removeStall = bindPortal(deleteMarketRoster);
const saveStallProfile = bindPortal(saveMarketVendorProfile);
const uploadStallLogo = bindPortal(uploadMarketVendorLogo);
const clearStallLogo = bindPortal(clearMarketVendorLogo);
const addStall = bindPortal(createMarketVendor);

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

function TagPicker({
  id,
  tags,
  choices,
}: {
  id: string;
  tags: string[];
  choices: readonly string[];
}) {
  const choiceSet = new Set<string>(choices);
  const [selected, setSelected] = useState(() => new Set(tags.filter((tag) => choiceSet.has(tag))));
  const [extras, setExtras] = useState(() => tags.filter((tag) => !choiceSet.has(tag)));
  const [draft, setDraft] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const all = [...choices.filter((tag) => selected.has(tag)), ...extras];

  function addExtra() {
    const cleaned = normalizePortalTag(draft);
    if (!cleaned) {
      setTagError("That tag is not allowed.");
      return;
    }
    const already = choiceSet.has(cleaned) ? selected.has(cleaned) : extras.includes(cleaned);
    if (!already && selected.size + extras.length >= PORTAL_TAG_CAP) {
      setTagError("Too many tags.");
      return;
    }
    setTagError(null);
    setDraft("");
    if (choiceSet.has(cleaned)) {
      setSelected((current) => new Set(current).add(cleaned));
      return;
    }
    setExtras((current) => (current.includes(cleaned) ? current : [...current, cleaned]));
  }

  function toggle(tag: string) {
    if (selected.has(tag)) {
      setTagError(null);
      setSelected((current) => {
        const next = new Set(current);
        next.delete(tag);
        return next;
      });
      return;
    }
    if (selected.size + extras.length >= PORTAL_TAG_CAP) {
      setTagError("Too many tags.");
      return;
    }
    setTagError(null);
    setSelected((current) => new Set(current).add(tag));
  }

  return (
    <div className="grid gap-3 sm:col-span-2">
      <p className="text-sm font-medium" id={`${id}-tags`}>
        Tags
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-tags`}>
        {choices.map((tag) => {
          const on = selected.has(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(tag)}
              className={cn(
                "stall-chip-sm inline-flex h-9 items-center px-3 text-sm font-medium",
                on ? "bg-stamp text-chalk" : "border border-input bg-card text-foreground hover:bg-muted",
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
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addExtra();
            }}
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
    return <p className="text-sm text-muted-foreground">Add hours before choosing days.</p>;
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
            {hoursLabel ? <span className="type-nums text-muted-foreground">{hoursLabel}</span> : null}
          </label>
        );
      })}
    </fieldset>
  );
}

function ContactFields({
  id,
  phone,
  email,
  website,
  instagram,
  tiktok,
  facebook,
}: {
  id: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  tiktok: string;
  facebook: string;
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-phone`}>Phone</Label>
        <Input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={40} defaultValue={phone} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={120}
          defaultValue={email}
        />
      </div>
      <p className="text-sm text-muted-foreground sm:col-span-2">Phone and email show on the public page.</p>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-website`}>Website</Label>
        <Input id={`${id}-website`} name="website" defaultValue={website} maxLength={2048} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-instagram`}>Instagram</Label>
        <Input id={`${id}-instagram`} name="instagram" defaultValue={instagram} maxLength={2048} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-tiktok`}>TikTok</Label>
        <Input id={`${id}-tiktok`} name="tiktok" defaultValue={tiktok} maxLength={2048} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-facebook`}>Facebook</Label>
        <Input id={`${id}-facebook`} name="facebook" defaultValue={facebook} maxLength={2048} />
      </div>
    </>
  );
}

function ListingForm({ listing }: { listing: MarketPortalListing }) {
  const [state, action, pending] = useActionState(saveListing, undefined);
  usePortalRefresh(state);
  const id = listing.id;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="market_id" value={id} />
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input id={`${id}-name`} name="name" required maxLength={200} defaultValue={listing.name} />
        <p className="text-sm text-muted-foreground">{`The page address stays /markets/${listing.slug}.`}</p>
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-about`}>About</Label>
        <Textarea id={`${id}-about`} name="about" rows={5} maxLength={4000} defaultValue={listing.about ?? ""} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-address`}>Address</Label>
        <Input id={`${id}-address`} name="address" required maxLength={200} defaultValue={listing.address} />
        <p className="text-sm text-muted-foreground">The map pin is set in admin.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-city`}>City</Label>
        <Input id={`${id}-city`} name="city" required maxLength={80} defaultValue={listing.city} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-province`}>Province</Label>
        <select
          id={`${id}-province`}
          name="province"
          defaultValue={listing.province}
          className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
        >
          {PROVINCES.map((province) => (
            <option key={province.code} value={province.code}>
              {province.code}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-postal`}>Postal code</Label>
        <Input
          id={`${id}-postal`}
          name="postal_code"
          maxLength={10}
          autoComplete="postal-code"
          defaultValue={listing.postal_code ?? ""}
        />
      </div>
      <TagPicker id={id} tags={listing.tags} choices={MARKET_TAGS} />
      <ContactFields
        id={id}
        phone={listing.phone ?? ""}
        email={listing.email ?? ""}
        website={listing.website ?? ""}
        instagram={listing.instagram ?? ""}
        tiktok={listing.tiktok ?? ""}
        facebook={listing.facebook ?? ""}
      />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save listing"}
        </Button>
        <PortalNote state={state} />
      </div>
    </form>
  );
}

function LogoForm({ listing }: { listing: MarketPortalListing }) {
  const [uploadState, upload, uploadPending] = useActionState(uploadLogo, undefined);
  const [clearState, clear, clearPending] = useActionState(clearLogo, undefined);
  usePortalRefresh(uploadState);
  usePortalRefresh(clearState);

  return (
    <div className="grid gap-4">
      {listing.logo_url ? <ListingMark src={listing.logo_url} className="h-16 w-24" /> : null}
      <form action={upload} className="grid gap-3">
        <input type="hidden" name="market_id" value={listing.id} />
        <div className="grid gap-1.5">
          <Label htmlFor={`${listing.id}-logo`}>Logo</Label>
          <Input id={`${listing.id}-logo`} name="logo" type="file" accept="image/jpeg,image/png,image/webp" required />
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
          <input type="hidden" name="market_id" value={listing.id} />
          <Button type="submit" variant="outline" disabled={clearPending}>
            {clearPending ? "Removing…" : "Remove logo"}
          </Button>
          <PortalNote state={clearState} />
        </form>
      ) : null}
    </div>
  );
}

function HoursForm({
  marketId,
  schedule,
  heading,
}: {
  marketId: string;
  schedule?: MarketPortalSchedule;
  heading?: string;
}) {
  const [state, action, pending] = useActionState(saveHours, undefined);
  const [removeState, remove, removePending] = useActionState(removeHours, undefined);
  usePortalRefresh(state);
  usePortalRefresh(removeState);
  const field = schedule?.id ?? `${marketId}-new-hours`;

  return (
    <div className="grid gap-3 border-b border-border py-4 last:border-b-0">
      {heading ? <h3>{heading}</h3> : null}
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="market_id" value={marketId} />
        {schedule ? <input type="hidden" name="schedule_id" value={schedule.id} /> : null}
        <div className="grid gap-1.5">
          <Label htmlFor={`${field}-weekday`}>Day</Label>
          <select
            id={`${field}-weekday`}
            name="weekday"
            defaultValue={schedule?.weekday ?? 6}
            className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
          >
            {WEEKDAYS.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${field}-opens`}>Opens</Label>
            <Input
              id={`${field}-opens`}
              name="opens_at"
              type="time"
              required
              defaultValue={schedule?.opens_at ?? "08:00"}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${field}-closes`}>Closes</Label>
            <Input
              id={`${field}-closes`}
              name="closes_at"
              type="time"
              required
              defaultValue={schedule?.closes_at ?? "14:00"}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${field}-season-start`}>Season start</Label>
          <Input
            id={`${field}-season-start`}
            name="season_start"
            placeholder="MM-DD"
            maxLength={5}
            defaultValue={schedule?.season_start ?? ""}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${field}-season-end`}>Season end</Label>
          <Input
            id={`${field}-season-end`}
            name="season_end"
            placeholder="MM-DD"
            maxLength={5}
            defaultValue={schedule?.season_end ?? ""}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${field}-notes`}>Note for visitors</Label>
          <Textarea id={`${field}-notes`} name="notes" rows={2} maxLength={500} defaultValue={schedule?.notes ?? ""} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : schedule ? "Save hours" : "Add hours"}
          </Button>
          <PortalNote state={state} />
        </div>
      </form>
      {schedule ? (
        <form action={remove} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="market_id" value={marketId} />
          <input type="hidden" name="schedule_id" value={schedule.id} />
          <Button type="submit" variant="outline" disabled={removePending}>
            {removePending ? "Removing…" : "Remove hours"}
          </Button>
          <PortalNote state={removeState} />
        </form>
      ) : null}
    </div>
  );
}

function StallRosterForm({
  marketId,
  stall,
  hours,
  openDays,
}: {
  marketId: string;
  stall: MarketRosterStall;
  hours: PortalHours[];
  openDays: number[];
}) {
  const [state, action, pending] = useActionState(saveStall, undefined);
  const [removeState, remove, removePending] = useActionState(removeStall, undefined);
  usePortalRefresh(state);
  usePortalRefresh(removeState);

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-base font-medium">{stall.vendor_name}</p>
        <p className="text-sm text-muted-foreground">
          {stall.claimed ? "The stall runs this listing." : stall.created_here ? "Added by this market." : "Directory listing."}
        </p>
      </div>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="market_id" value={marketId} />
        <input type="hidden" name="vendor_id" value={stall.vendor_id} />
        <input type="hidden" name="vendor_slug" value={stall.vendor_slug} />
        <div className="grid gap-1.5">
          <Label htmlFor={`${stall.vendor_id}-stall`}>Stall label</Label>
          <Input
            id={`${stall.vendor_id}-stall`}
            name="stall"
            maxLength={80}
            defaultValue={stall.stall ?? ""}
            placeholder="Booth or row"
          />
        </div>
        <DayChoices openDays={openDays} hours={hours} selected={stall.days} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || openDays.length === 0}>
            {pending ? "Saving…" : "Save days"}
          </Button>
          <PortalNote state={state} />
        </div>
      </form>
      <form action={remove} className="grid gap-2">
        <input type="hidden" name="market_id" value={marketId} />
        <input type="hidden" name="vendor_id" value={stall.vendor_id} />
        <p className="text-sm text-muted-foreground">
          {stall.editable
            ? "Removing this stall deletes the listing, because no vendor account is assigned."
            : "They leave this market. Their listing stays."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" disabled={removePending}>
            {removePending ? "Removing…" : "Remove stall"}
          </Button>
          <PortalNote state={removeState} />
        </div>
      </form>
    </div>
  );
}

function EditableStall({
  marketId,
  stall,
}: {
  marketId: string;
  stall: MarketRosterStall;
}) {
  const [state, action, pending] = useActionState(saveStallProfile, undefined);
  const [uploadState, upload, uploadPending] = useActionState(uploadStallLogo, undefined);
  const [clearState, clear, clearPending] = useActionState(clearStallLogo, undefined);
  usePortalRefresh(state);
  usePortalRefresh(uploadState);
  usePortalRefresh(clearState);
  const id = stall.vendor_id;

  return (
    <div className="grid gap-4 rounded-xl bg-secondary/40 p-4">
      <p className="text-sm text-muted-foreground">
        You can edit this listing until we assign it to a vendor account. The page address stays /vendors/
        {stall.vendor_slug}.
      </p>
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="market_id" value={marketId} />
        <input type="hidden" name="vendor_id" value={id} />
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input id={`${id}-name`} name="name" required maxLength={200} defaultValue={stall.vendor_name} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-about`}>About</Label>
          <Textarea id={`${id}-about`} name="about" rows={3} maxLength={4000} defaultValue={stall.about ?? ""} />
        </div>
        <TagPicker id={`${id}-stall`} tags={stall.tags} choices={PRODUCT_TAGS} />
        <ContactFields
          id={id}
          phone={stall.phone ?? ""}
          email={stall.email ?? ""}
          website={stall.website ?? ""}
          instagram={stall.instagram ?? ""}
          tiktok={stall.tiktok ?? ""}
          facebook={stall.facebook ?? ""}
        />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save stall"}
          </Button>
          <PortalNote state={state} />
        </div>
      </form>
      <div className="grid gap-3">
        {stall.logo_url ? <ListingMark src={stall.logo_url} className="h-16 w-24" /> : null}
        <form action={upload} className="grid gap-3">
          <input type="hidden" name="market_id" value={marketId} />
          <input type="hidden" name="vendor_id" value={id} />
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-logo`}>Logo</Label>
            <Input id={`${id}-logo`} name="logo" type="file" accept="image/jpeg,image/png,image/webp" required />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={uploadPending}>
              {uploadPending ? "Saving…" : "Upload logo"}
            </Button>
            <PortalNote state={uploadState} />
          </div>
        </form>
        {stall.logo_url ? (
          <form action={clear} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="market_id" value={marketId} />
            <input type="hidden" name="vendor_id" value={id} />
            <Button type="submit" variant="outline" disabled={clearPending}>
              {clearPending ? "Removing…" : "Remove logo"}
            </Button>
            <PortalNote state={clearState} />
          </form>
        ) : null}
      </div>
    </div>
  );
}

function AddExistingStall({
  marketId,
  takenIds,
  hours,
  openDays,
}: {
  marketId: string;
  takenIds: string[];
  hours: PortalHours[];
  openDays: number[];
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PortalVendorHit[]>([]);
  const [picked, setPicked] = useState<PortalVendorHit | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [state, action, pending] = useActionState(async (prev: PortalResult | undefined, formData: FormData) => {
    const result = await saveMarketRoster(formData);
    if (result.message) {
      setPicked(null);
      setQuery("");
      setHits([]);
      setSearchError(null);
      setSearching(false);
    }
    return result;
  }, undefined);
  const takenKey = takenIds.join(",");
  usePortalRefresh(state);
  const visibleHits = query.trim().length < 2 ? [] : hits;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchPortalVendors(q).then((result) => {
        if (cancelled) return;
        setSearching(false);
        setSearchError(result.error);
        const taken = new Set(takenKey.split(",").filter(Boolean));
        setHits(result.vendors.filter((vendor) => !taken.has(vendor.id)));
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, takenKey]);

  return (
    <div className="mt-4 grid gap-3">
      <h3>Add a stall already listed</h3>
      <div className="grid gap-1.5">
        <Label htmlFor={`${marketId}-vendor-q`}>Find a stall</Label>
        <Input
          id={`${marketId}-vendor-q`}
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setPicked(null);
            setSearching(next.trim().length >= 2);
            if (next.trim().length < 2) setSearchError(null);
          }}
          placeholder="Stall name"
          autoComplete="off"
        />
      </div>
      {searchError ? <p className="text-sm text-destructive">{searchError}</p> : null}
      {visibleHits.length ? (
        <ul className="grid gap-1">
          {visibleHits.map((vendor) => (
            <li key={vendor.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left outline-none hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                onClick={() => setPicked(vendor)}
              >
                <span className="block text-base font-medium">{vendor.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 && !searchError && !searching ? (
        <p className="text-sm text-muted-foreground">No stalls match that name.</p>
      ) : null}
      {picked ? (
        <form action={action} className="grid gap-3 rounded-xl bg-secondary/50 p-4">
          <input type="hidden" name="market_id" value={marketId} />
          <input type="hidden" name="vendor_id" value={picked.id} />
          <input type="hidden" name="vendor_slug" value={picked.slug} />
          <p className="text-base font-medium">{picked.name}</p>
          <div className="grid gap-1.5">
            <Label htmlFor={`${picked.id}-new-stall`}>Stall label</Label>
            <Input id={`${picked.id}-new-stall`} name="stall" maxLength={80} placeholder="Booth or row" />
          </div>
          <DayChoices openDays={openDays} hours={hours} selected={openDays} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || openDays.length === 0}>
              {pending ? "Saving…" : "Add stall"}
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

function NewStall({
  marketId,
  hours,
  openDays,
}: {
  marketId: string;
  hours: PortalHours[];
  openDays: number[];
}) {
  const [state, action, pending] = useActionState(addStall, undefined);
  usePortalRefresh(state);

  return (
    <div className="mt-8 grid gap-3">
      <h3>Add a stall that is not listed yet</h3>
      <p className="text-sm text-muted-foreground">
        It shows on this market with no owner. The person who runs it can create a vendor account, and then only they
        edit the listing after we assign it.
      </p>
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="market_id" value={marketId} />
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${marketId}-new-name`}>Name</Label>
          <Input id={`${marketId}-new-name`} name="name" required maxLength={200} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${marketId}-new-about`}>About</Label>
          <Textarea id={`${marketId}-new-about`} name="about" rows={3} maxLength={4000} />
        </div>
        <TagPicker id={`${marketId}-new`} tags={[]} choices={PRODUCT_TAGS} />
        <ContactFields id={`${marketId}-new-contact`} phone="" email="" website="" instagram="" tiktok="" facebook="" />
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${marketId}-new-label`}>Stall label</Label>
          <Input id={`${marketId}-new-label`} name="stall" maxLength={80} placeholder="Booth or row" />
        </div>
        <div className="sm:col-span-2">
          <DayChoices openDays={openDays} hours={hours} selected={openDays} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pending || openDays.length === 0}>
            {pending ? "Adding…" : "Add stall"}
          </Button>
          <PortalNote state={state} />
        </div>
      </form>
    </div>
  );
}

export function MarketPortalEditor({ listing }: { listing: MarketPortalListing }) {
  const hours: PortalHours[] = listing.schedules.map((row) => ({
    weekday: row.weekday,
    opens_at: row.opens_at,
    closes_at: row.closes_at,
  }));
  const openDays = openDaysFromSchedules(listing.schedules);
  const rosterFull = listing.stalls.length >= MARKET_ROSTER_CAP;
  const createdFull = listing.created_count >= MARKET_CREATED_CAP;
  const hoursFull = listing.schedules.length >= MARKET_SCHEDULE_CAP;

  return (
    <div className="grid gap-10">
      <MaintenanceOptOutForm
        key={listing.maintenance_opt_outs.join("\n")}
        kind="market"
        listingId={listing.id}
        selected={listing.maintenance_opt_outs}
      />
      <section>
        <h2>Profile</h2>
        <div className="mt-4">
          <ListingForm
            key={[
              listing.name,
              listing.about ?? "",
              listing.address,
              listing.city,
              listing.province,
              listing.postal_code ?? "",
              listing.phone ?? "",
              listing.email ?? "",
              listing.website ?? "",
              listing.instagram ?? "",
              listing.tiktok ?? "",
              listing.facebook ?? "",
              listing.tags.join(","),
            ].join("\n")}
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
        <h2>Hours</h2>
        {listing.schedules.length ? (
          <ul className="mt-2">
            {listing.schedules.map((schedule) => (
              <li key={schedule.id}>
                <HoursForm marketId={listing.id} schedule={schedule} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No hours yet.</p>
        )}
        {hoursFull ? (
          <p className="mt-4 text-sm text-muted-foreground">The hours list is full.</p>
        ) : (
          <HoursForm marketId={listing.id} heading="Add hours" />
        )}
      </section>
      <section>
        <h2>Stalls</h2>
        {listing.stalls.length ? (
          <ul className="mt-2">
            {listing.stalls.map((stall) => (
              <li key={stall.vendor_id} className="grid gap-4 border-b border-border py-4 last:border-b-0">
                <StallRosterForm marketId={listing.id} stall={stall} hours={hours} openDays={openDays} />
                {stall.editable ? <EditableStall marketId={listing.id} stall={stall} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No stalls at this market yet.</p>
        )}
        {rosterFull ? (
          <p className="mt-4 text-sm text-muted-foreground">The stall list is full.</p>
        ) : (
          <AddExistingStall
            marketId={listing.id}
            takenIds={listing.stalls.map((stall) => stall.vendor_id)}
            hours={hours}
            openDays={openDays}
          />
        )}
        {rosterFull || createdFull ? (
          createdFull ? (
            <p className="mt-6 text-sm text-muted-foreground">This market cannot add more stalls.</p>
          ) : null
        ) : (
          <NewStall marketId={listing.id} hours={hours} openDays={openDays} />
        )}
      </section>
    </div>
  );
}
