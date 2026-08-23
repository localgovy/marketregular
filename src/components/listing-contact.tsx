import type { ComponentType } from "react";
import { SignMark, ShotMark, type MarkProps } from "@/components/marks";
import { buttonVariants } from "@/components/ui/button";
import { externalHref, formatPhone } from "@/lib/format";

export function ListingPhone({ phone }: { phone: string | null }) {
  if (!phone) return null;
  return (
    <p className="mt-2 text-sm">
      <a className="hover:underline" href={`tel:${phone}`}>
        {formatPhone(phone)}
      </a>
    </p>
  );
}

function ListingOutbound({
  href,
  label,
  icon: Icon,
}: {
  href: string | null;
  label: string;
  icon: ComponentType<MarkProps>;
}) {
  const url = externalHref(href);
  if (!url) return null;
  return (
    <a
      className={buttonVariants({
        variant: "outline",
        size: "lg",
        className: "mt-4 w-full gap-2",
      })}
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      <Icon className="size-5" />
      {label}
    </a>
  );
}

export function ListingWebsite({ href }: { href: string | null }) {
  return <ListingOutbound href={href} label="Website" icon={SignMark} />;
}

export function ListingInstagram({ href }: { href: string | null }) {
  return <ListingOutbound href={href} label="Instagram" icon={ShotMark} />;
}
