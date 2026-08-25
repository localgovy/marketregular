import { PRODUCT_TAGS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveVendor } from "@/app/actions/admin";
import type { Vendor } from "@/types/database";

export function VendorForm({ vendor }: { vendor?: Vendor }) {
  return (
    <form action={saveVendor} className="grid gap-4 sm:grid-cols-2">
      {vendor ? <input type="hidden" name="id" value={vendor.id} /> : null}
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={vendor?.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={vendor?.slug} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={vendor?.status ?? "draft"}
          className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
        >
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="about">About</Label>
        <Textarea id="about" name="about" rows={5} defaultValue={vendor?.about ?? ""} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="logo_url">Logo URL</Label>
        <Input
          id="logo_url"
          name="logo_url"
          defaultValue={vendor?.logo_url ?? ""}
          placeholder="Storage public URL"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="rating_avg">Public score</Label>
        <Input
          id="rating_avg"
          name="rating_avg"
          type="number"
          min="1"
          max="5"
          step="0.01"
          defaultValue={vendor?.rating_avg ?? ""}
          placeholder="4.55"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review_count">Public reviews</Label>
        <Input
          id="review_count"
          name="review_count"
          type="number"
          min="0"
          step="1"
          defaultValue={vendor?.review_count ?? 0}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" defaultValue={vendor?.website ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="instagram">Instagram</Label>
        <Input id="instagram" name="instagram" defaultValue={vendor?.instagram ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tiktok">TikTok</Label>
        <Input id="tiktok" name="tiktok" defaultValue={vendor?.tiktok ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={vendor?.phone ?? ""} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input
          id="tags"
          name="tags"
          defaultValue={vendor?.tags.join(", ")}
          placeholder={[
            ...PRODUCT_TAGS.slice(0, 3),
            "italian",
            "jamaican",
            "mexican",
          ].join(", ")}
        />
      </div>
      <Button type="submit" className="w-fit">
        Save vendor
      </Button>
    </form>
  );
}
