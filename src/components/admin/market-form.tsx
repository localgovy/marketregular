import { AMENITY_TAGS, PRODUCT_TAGS, PROVINCES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveMarket } from "@/app/actions/admin";
import type { Market } from "@/types/database";

export function MarketForm({ market }: { market?: Market }) {
  const tags = [...PRODUCT_TAGS, ...AMENITY_TAGS];
  return (
    <form action={saveMarket} className="grid gap-4 sm:grid-cols-2">
      {market ? <input type="hidden" name="id" value={market.id} /> : null}
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={market?.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={market?.slug} placeholder="auto from name" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={market?.status ?? "draft"}
          className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
        >
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="about">About</Label>
        <Textarea id="about" name="about" rows={5} defaultValue={market?.about ?? ""} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" required defaultValue={market?.address} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" required defaultValue={market?.city ?? "Toronto"} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="province">Province</Label>
        <select
          id="province"
          name="province"
          defaultValue={market?.province ?? "ON"}
          className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
        >
          {PROVINCES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="postal_code">Postal code</Label>
        <Input id="postal_code" name="postal_code" defaultValue={market?.postal_code ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="geofence_radius_m">Geofence (metres)</Label>
        <Input
          id="geofence_radius_m"
          name="geofence_radius_m"
          type="number"
          defaultValue={market?.geofence_radius_m ?? 250}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="lat">Latitude</Label>
        <Input id="lat" name="lat" type="number" step="any" required defaultValue={market?.lat} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="lng">Longitude</Label>
        <Input id="lng" name="lng" type="number" step="any" required defaultValue={market?.lng} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" defaultValue={market?.website ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={market?.phone ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" defaultValue={market?.email ?? ""} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input
          id="tags"
          name="tags"
          defaultValue={market?.tags.join(", ")}
          placeholder={tags.slice(0, 6).join(", ")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="featured" defaultChecked={market?.featured} />
        Featured on the homepage
      </label>
      <Button type="submit" className="w-fit">
        Save market
      </Button>
    </form>
  );
}
