"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
  ConnectPayments,
  ConnectPayouts,
} from "@stripe/react-connect-js";

export function StallConnect({
  vendorId,
  cardPaymentsActive,
}: {
  vendorId: string;
  cardPaymentsActive: boolean;
}) {
  const router = useRouter();
  const [instance, setInstance] = useState<StripeConnectInstance | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
    if (!publishableKey) return;
    let cancelled = false;
    try {
      const connect = loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          const response = await fetch("/api/stripe/account-session", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ vendorId }),
          });
          const payload = (await response.json()) as { client_secret?: string };
          if (!response.ok || !payload.client_secret) throw new Error("session");
          return payload.client_secret;
        },
      });
      if (!cancelled) setInstance(connect);
    } catch {
      if (!cancelled) setFailed(true);
    }
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  if (failed) return <p className="text-sm text-destructive">Payments could not be opened.</p>;
  if (!instance) return <p className="text-sm text-muted-foreground">Opening payments…</p>;

  return (
    <ConnectComponentsProvider connectInstance={instance}>
      <div className="grid gap-6">
        <ConnectNotificationBanner />
        {cardPaymentsActive ? null : (
          <ConnectAccountOnboarding
            onExit={() => {
              router.refresh();
            }}
          />
        )}
        <ConnectAccountManagement />
        {cardPaymentsActive ? (
          <>
            <ConnectPayments />
            <ConnectPayouts />
          </>
        ) : null}
      </div>
    </ConnectComponentsProvider>
  );
}
