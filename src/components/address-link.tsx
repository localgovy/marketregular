"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { marketPlaceLine } from "@/lib/listing-copy";
import { openMaps, type MapsPlace } from "@/lib/maps";
import { cn } from "@/lib/utils";

export function AddressLink({
  address,
  city,
  province,
  name,
  lat,
  lng,
  className,
  children,
}: MapsPlace & {
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const street = address.trim();
  if (!street) return children ? <>{children}</> : null;

  const place: MapsPlace = { address: street, city, province, name, lat, lng };
  const label = children ?? marketPlaceLine(street, city ?? "");

  function go() {
    openMaps(place);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "cursor-pointer bg-transparent p-0 text-left font-[inherit] text-[length:inherit] leading-[inherit] text-inherit underline-offset-2 hover:underline",
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open in maps?</DialogTitle>
            <DialogDescription>{marketPlaceLine(street, city ?? "")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Not now
            </Button>
            <Button type="button" onClick={go}>
              Open maps
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
