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
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
    if (!publishableKey) {
      queueMicrotask(() => {
        setFailure("Payments are not available yet.");
      });
      return;
    }
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
          const payload = (await response.json()) as { client_secret?: string; error?: string };
          if (!response.ok || !payload.client_secret) {
            const message = payload.error || "Payments could not be opened.";
            if (!cancelled) setFailure(message);
            throw new Error(message);
          }
          return payload.client_secret;
        },
      });
      queueMicrotask(() => {
        if (!cancelled) setInstance(connect);
      });
    } catch (error) {
      queueMicrotask(() => {
        if (!cancelled) setFailure(error instanceof Error ? error.message : "Payments could not be opened.");
      });
    }
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  if (failure) return <p className="text-sm text-destructive">{failure}</p>;
  if (!instance) return <p className="text-sm text-muted-foreground">Opening payments…</p>;

  return (
    <ConnectComponentsProvider connectInstance={instance}>
      <div className="grid gap-6">
        <ConnectNotificationBanner />
        {cardPaymentsActive ? (
          <>
            <ConnectAccountManagement />
            <ConnectPayments />
            <ConnectPayouts />
          </>
        ) : (
          <ConnectAccountOnboarding
            onExit={() => {
              router.refresh();
            }}
          />
        )}
      </div>
    </ConnectComponentsProvider>
  );
}
