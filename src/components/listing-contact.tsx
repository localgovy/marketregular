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

function ListingOutbound({ href, label }: { href: string | null; label: string }) {
  const url = externalHref(href);
  if (!url) return null;
  return (
    <a
      className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  );
}

export function ListingWebsite({ href }: { href: string | null }) {
  return <ListingOutbound href={href} label="Website" />;
}

export function ListingInstagram({ href }: { href: string | null }) {
  return <ListingOutbound href={href} label="Instagram" />;
}
