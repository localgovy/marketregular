import { buttonVariants } from "@/components/ui/button";
import { formatPhone } from "@/lib/format";

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

export function ListingWebsite({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a
      className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      Website
    </a>
  );
}
