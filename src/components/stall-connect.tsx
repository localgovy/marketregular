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
  const [attempt, setAttempt] = useState(0);

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
            const message =
              !payload.error || payload.error === "Could not open payments."
                ? "Payments could not be opened."
                : payload.error;
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
  }, [vendorId, attempt]);

  if (failure) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-destructive">{failure}</p>
        <button
          type="button"
          className="w-fit text-base font-medium text-foreground underline"
          onClick={() => {
            setFailure(null);
            setInstance(null);
            setAttempt((current) => current + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }
  if (!instance) return <p className="text-sm text-muted-foreground">Opening Stripe…</p>;

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
