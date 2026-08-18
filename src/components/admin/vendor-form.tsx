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
      <div className="grid gap-1.5">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" defaultValue={vendor?.website ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={vendor?.phone ?? ""} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input id="tags" name="tags" defaultValue={vendor?.tags.join(", ")} />
      </div>
      <Button type="submit" className="w-fit">
        Save vendor
      </Button>
    </form>
  );
}
