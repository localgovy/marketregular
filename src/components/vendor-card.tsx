import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeepButton } from "@/components/keep-button";
import { TagList } from "@/components/tag-list";
import type { Vendor } from "@/types/database";

export function VendorCard({ vendor }: { vendor: Vendor }) {
  return (
    <div className="relative h-full">
      <Link href={`/vendors/${vendor.slug}`} className="block h-full">
        <Card className="h-full transition-shadow hover:shadow-md">
          <CardHeader className="pr-16">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Vendor</p>
            <CardTitle className="font-heading text-xl leading-snug">{vendor.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="line-clamp-3 text-sm text-muted-foreground">{vendor.about}</p>
            <TagList tags={vendor.tags} />
          </CardContent>
        </Card>
      </Link>
      <span className="absolute top-4 right-4">
        <KeepButton kind="vendor" slug={vendor.slug} name={vendor.name} />
      </span>
    </div>
  );
}
