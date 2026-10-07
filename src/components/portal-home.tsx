import Link from "next/link";
import { loadMarketPortal } from "@/app/actions/market-portal";
import { readPortalOrgDefault } from "@/app/actions/portal-application";
import { loadVendorPortal } from "@/app/actions/vendor-portal";
import { LoginForm } from "@/components/login-form";
import { PortalRequestForm } from "@/components/portal-request-form";
import { PortalSignupForm } from "@/components/portal-signup-form";
import { SITE_NAME } from "@/lib/constants";
import { loginQueryError } from "@/lib/public-error";
import { portalHomePath, portalRequestId } from "@/lib/portal-application";
import { createServiceClient } from "@/lib/supabase/admin";
import { createAuthedServerClient } from "@/lib/supabase/server";
import type { ClaimTarget, PortalApplication } from "@/types/database";

type NamedListing = { id: string; name: string; slug: string; status: string };

async function namedListings(kind: ClaimTarget, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const service = createServiceClient();
  if (!service || !unique.length) return new Map<string, NamedListing>();
  const table = kind === "vendor" ? "vendors" : "markets";
  const { data, error } = await service.from(table).select("id, name, slug, status").in("id", unique);
  if (error) return new Map<string, NamedListing>();
  return new Map(
    (data ?? []).flatMap((row) => {
      if (!row.id || !row.name || !row.slug) return [];
      return [[row.id, { id: row.id, name: row.name, slug: row.slug, status: row.status ?? "draft" }] as const];
    }),
  );
}

function published(listing: NamedListing | undefined) {
  return listing?.status === "published" ? listing : null;
}

function PortalHowItWorks({ kind }: { kind: ClaimTarget }) {
  const stall = kind === "vendor";
  const steps = [
    stall
      ? "Create an account using the email you use for the business."
      : "Create an account using your organization email.",
    `Wait for ${SITE_NAME}'s approval email.`,
    stall
      ? "Edit the stall page. Keep the days, menu, and contact details current."
      : "Edit the market page. Keep the hours and the stall list current.",
  ];

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2>How this works</h2>
      <ol className="mt-4 grid gap-3">
        {steps.map((step, index) => (
          <li key={step} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-base">
            <span className="type-nums text-muted-foreground">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function PortalHome({
  kind,
  searchParams,
}: {
  kind: ClaimTarget;
  searchParams: Promise<{ error?: string; request?: string }>;
}) {
  const params = await searchParams;
  const requestId = portalRequestId(params.request);
  const stall = kind === "vendor";
  const title = stall ? "Vendor Portal" : "Market Portal";
  const [portal, namesForRequest] = await Promise.all([
    stall ? loadVendorPortal() : loadMarketPortal(),
    namedListings(kind, requestId ? [requestId] : []),
  ]);
  const asked = published(namesForRequest.get(requestId ?? ""));

  if (!portal.signedIn) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1>{title}</h1>
        <p className="type-lede mt-2 mb-8 text-muted-foreground">
          {stall
            ? "Create an account with the email you use for the business, or sign in if you already have one. A Gmail address is fine. Ask only if you run the stall, or the person who does has asked you to. After we assign it, you can edit it here."
            : "Create an account with the email you use for the organization, or sign in if you already have one. A Gmail address is fine. Ask only if you run the market, or the organization has asked you to. After we assign it, you can edit it here."}
        </p>
        <div className="grid items-start gap-10 md:grid-cols-2">
          <section>
            <h2>Create an account</h2>
            <div className="mt-4">
              <PortalSignupForm kind={kind} requestId={asked?.id ?? null} listingName={asked?.name ?? null} />
            </div>
          </section>
          <section>
            <h2>Sign in</h2>
            <div className="mt-4">
              <LoginForm
                next={portalHomePath(kind, asked?.id ?? null)}
                oauthError={loginQueryError(params.error)}
                showCreate={false}
              />
            </div>
          </section>
        </div>
        <PortalHowItWorks kind={kind} />
      </div>
    );
  }

  if (portal.error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1>{title}</h1>
        <p className="type-lede mt-2 text-muted-foreground">
          {stall
            ? "The stall editor is not available yet. Try again in a minute."
            : "The market editor is not available yet. Try again in a minute."}
        </p>
      </div>
    );
  }

  const { supabase, user } = await createAuthedServerClient();
  const [applicationRows, legacyRows, organizationDefault] = supabase && user
    ? await Promise.all([
        supabase
          .from("portal_applications")
          .select("id, user_id, kind, organization_name, requested_target_id, assigned_target_id, status, created_at")
          .eq("user_id", user.id)
          .eq("kind", kind)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("claim_requests")
          .select("id, target_id, status")
          .eq("user_id", user.id)
          .eq("target_type", kind)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1),
        readPortalOrgDefault(),
      ])
    : [null, null, null];

  const applicationsFailed = Boolean(applicationRows && "error" in applicationRows && applicationRows.error);
  if (applicationsFailed && portal.listings.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1>{title}</h1>
        <p className="type-lede mt-2 text-muted-foreground">
          {stall
            ? "The stall editor is not available yet. Try again in a minute."
            : "The market editor is not available yet. Try again in a minute."}
        </p>
      </div>
    );
  }

  const applications = applicationsFailed ? [] : ((applicationRows?.data ?? []) as PortalApplication[]);
  const pending = applications.find((row) => row.status === "pending") ?? null;
  const owned = new Set(portal.listings.map((listing) => listing.id));
  const rejected = !pending && applications[0]?.status === "rejected";
  const legacy = legacyRows?.data?.[0] ?? null;
  const names = await namedListings(kind, [
    pending?.requested_target_id ?? "",
    legacy?.target_id ?? "",
    asked?.id ?? "",
  ]);
  const pendingListing = published(names.get(pending?.requested_target_id ?? ""));
  const legacyListing = published(names.get(legacy?.target_id ?? ""));
  const waitingLabel = pending
    ? pendingListing?.name || pending.organization_name || (stall ? "your stall" : "your market")
    : legacyListing?.name || null;
  const waiting = Boolean(waitingLabel);
  const askedOpen = asked && !owned.has(asked.id) ? asked : null;
  const replace =
    askedOpen && waiting && askedOpen.id !== pendingListing?.id && askedOpen.id !== legacyListing?.id
      ? askedOpen
      : null;
  const fresh = askedOpen && !waiting ? askedOpen : null;
  const showRequest =
    !applicationsFailed && Boolean(fresh || replace || (!portal.listings.length && !waiting));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{title}</h1>
      {portal.listings.length ? (
        <>
          <p className="type-lede mt-2 mb-8 text-muted-foreground">
            {stall
              ? "Update the name, menu, and the markets you sell at. Changes show on the public page. Keep the days and the menu current."
              : "Update the hours, contact details, and the stalls. Changes show on the public page. Keep the hours and the stall list current."}
          </p>
          <ul className="divide-y divide-border ring-1 ring-border">
            {portal.listings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={stall ? `/vendor/${listing.id}` : `/market/${listing.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-3 hover:bg-secondary"
                >
                  <span className="min-w-0 text-base font-medium">{listing.name}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {listing.status === "published" ? "Published" : "Draft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : waiting ? (
        <p className="type-lede mt-2 text-muted-foreground">
          {pending?.organization_name && !pendingListing
            ? `We'll email you when we assign ${waitingLabel}. You can sign in here any time to check.`
            : `We'll email you when ${waitingLabel} is assigned to this account. You can sign in here any time to check.`}
        </p>
      ) : (
        <p className="type-lede mt-2 mb-8 text-muted-foreground">
          {fresh
            ? stall
              ? "Request this stall if you run it, or the person who does has asked you to. After we assign it, you can edit it here."
              : "Request this market if you run it, or the organization has asked you to. After we assign it, you can edit it here."
            : stall
              ? "Tell us the business you run. After we assign the stall, you can edit it here."
              : "Tell us the organization you run. After we assign the market, you can edit it here."}
        </p>
      )}

      {portal.listings.length && waiting ? (
        <p className="mt-8 text-base text-muted-foreground">
          {pending?.organization_name && !pendingListing
            ? `We'll email you when we assign ${waitingLabel}.`
            : `We'll email you when ${waitingLabel} is assigned to this account.`}
        </p>
      ) : null}

      {showRequest ? (
        <div className={portal.listings.length || waiting ? "mt-8" : undefined}>
          <PortalRequestForm
            kind={kind}
            request={fresh ?? replace}
            organizationDefault={organizationDefault}
            rejected={rejected}
            instead={Boolean(replace)}
          />
        </div>
      ) : null}

      {portal.listings.length ? null : <PortalHowItWorks kind={kind} />}
    </div>
  );
}
