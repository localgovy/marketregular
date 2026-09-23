import type { ComponentType } from "react";
import { FacebookMark, InstagramMark, SignMark, TikTokMark, type MarkProps } from "@/components/marks";
import { buttonVariants } from "@/components/ui/button";
import { externalHref, formatPhone, listingEmail } from "@/lib/format";

export function ListingPhone({ phone }: { phone: string | null }) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const tel =
    digits.length === 11 && digits.startsWith("1")
      ? `+${digits}`
      : digits.length === 10
        ? `+1${digits}`
        : null;
  return (
    <p className="mt-2 text-sm">
      {tel ? (
        <a className="hover:underline" href={`tel:${tel}`}>
          {formatPhone(phone)}
        </a>
      ) : (
        formatPhone(phone)
      )}
    </p>
  );
}

export function ListingContact({
  phone,
  email,
  heading = true,
}: {
  phone: string | null;
  email?: string | null;
  heading?: boolean;
}) {
  const mail = listingEmail(email);
  if (!phone && !mail) return null;
  return (
    <div className="mt-4">
      {heading ? <h3>Contact</h3> : null}
      <ListingPhone phone={phone} />
      {mail ? (
        <p className="mt-2 text-sm">
          <a className="break-all hover:underline" href={`mailto:${mail}`}>
            {mail}
          </a>
        </p>
      ) : null}
    </div>
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
  return <ListingOutbound href={href} label="Instagram" icon={InstagramMark} />;
}

export function ListingTiktok({ href }: { href: string | null }) {
  return <ListingOutbound href={href} label="TikTok" icon={TikTokMark} />;
}

export function ListingFacebook({ href }: { href: string | null }) {
  return <ListingOutbound href={href} label="Facebook" icon={FacebookMark} />;
}
