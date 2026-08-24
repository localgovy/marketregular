"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { completeOnboarding, usernameAvailable } from "@/app/actions/onboarding";
import { signOut } from "@/app/actions/auth";
import { EmailVisitButton } from "@/components/email-visit-button";
import { HomePanel } from "@/components/home-panel";
import { Hours } from "@/components/hours";
import { CloseMark, CrateMark, PlateMark, TicketMark } from "@/components/marks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeUsername, usernameError } from "@/lib/username";
import { cn } from "@/lib/utils";

export type OnboardingMarket = {
  slug: string;
  name: string;
  address: string;
  hours: string;
};

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function OnboardingDesk({
  displayName,
  email,
  next,
  markets,
}: {
  displayName: string;
  email: string | null;
  next: string;
  markets: OnboardingMarket[];
}) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState<string | null>(null);
  const [handleOk, setHandleOk] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [state, finish, finishing] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const result = await completeOnboarding(formData);
      if (result?.error) return { error: result.error };
      return null;
    },
    null,
  );

  const normalized = normalizeUsername(username);
  const localError = username ? usernameError(username) : "Pick a handle.";

  useEffect(() => {
    if (localError) {
      setHandleOk(false);
      setAvailability(localError === "Pick a handle." ? null : localError);
      return;
    }
    setHandleOk(false);
    setAvailability("Checking…");
    const timer = window.setTimeout(() => {
      void usernameAvailable(normalized).then((result) => {
        setHandleOk(result.available);
        setAvailability(result.available ? `@${normalized} is free` : result.error);
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [localError, normalized]);

  const bySlug = useMemo(() => new Map(markets.map((market) => [market.slug, market])), [markets]);
  const selected = picked
    .map((slug) => bySlug.get(slug))
    .filter((market): market is OnboardingMarket => Boolean(market));

  const matches = useMemo(() => {
    const q = fold(query);
    if (!q) return [];
    const tokens = q.split(" ").filter(Boolean);
    const taken = new Set(picked);
    return markets.filter((market) => {
      if (taken.has(market.slug)) return false;
      const hay = fold(`${market.name} ${market.address}`);
      return tokens.every((token) => hay.includes(token));
    });
  }, [markets, picked, query]);

  function addMarket(slug: string) {
    setPicked((current) => (current.includes(slug) || current.length >= 3 ? current : [...current, slug]));
    setQuery("");
  }

  function removeMarket(slug: string) {
    setPicked((current) => current.filter((item) => item !== slug));
  }

  const title =
    step === 1 ? "Your handle" : step === 2 ? "Three markets" : "How this desk works";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <p className="type-kicker text-muted-foreground">Step {step} of 3</p>
      <h1>{title}</h1>
      {displayName ? (
        <p className="type-lede mt-2 text-muted-foreground">
          Posts still use {displayName}. The handle is unique.
        </p>
      ) : (
        <p className="type-lede mt-2 text-muted-foreground">
          Pick a handle nobody else has on {email ?? "this account"}.
        </p>
      )}

      {step === 1 ? (
        <HomePanel
          className="mt-8"
          tone="find"
          icon={PlateMark}
          kicker="On this account"
          title="Unique handle"
          how="a–z, 0–9, underscore. 3–20 letters. This is @you, not the name on reviews."
        >
          <div className="grid gap-1.5">
            <Label htmlFor="username" className="text-chalk">
              Handle
            </Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="border-primary-foreground/35 bg-primary-foreground text-foreground"
            />
          </div>
          <p className="mt-2 text-sm text-chalk">
            Preview{" "}
            <span className="font-medium text-primary-foreground">
              @{normalized || "handle"}
            </span>
          </p>
          {availability ? <p className="mt-1 text-sm text-chalk">{availability}</p> : null}
          <Button
            type="button"
            className="mt-4 bg-primary-foreground text-primary hover:bg-chalk"
            disabled={!handleOk}
            onClick={() => setStep(2)}
          >
            Continue
          </Button>
        </HomePanel>
      ) : null}

      {step === 2 ? (
        <HomePanel
          className="mt-8"
          tone="open"
          icon={CrateMark}
          kicker="This week starts here"
          title="Favorite halls"
          how="Three markets you actually go to. They land on your saved list with hours."
        >
          {selected.length ? (
            <ul className="mb-4 divide-y divide-border ring-1 ring-border">
              {selected.map((market) => (
                <li
                  key={market.slug}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 px-3 py-2"
                >
                  <span className="min-w-0 text-base font-medium">{market.name}</span>
                  <Hours value={market.hours} className="text-muted-foreground" />
                  <button
                    type="button"
                    className="stall-chip-sm inline-flex size-7 items-center justify-center"
                    aria-label={`Remove ${market.name}`}
                    onClick={() => removeMarket(market.slug)}
                  >
                    <CloseMark className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {picked.length < 3 ? (
            <>
              <Label htmlFor="market-search">Find a market</Label>
              <Input
                id="market-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Wychwood, Junction, St. Lawrence…"
                className="mt-1.5"
                autoComplete="off"
              />
              <div className="mt-2 max-h-52 overflow-y-auto">
                {fold(query) ? (
                  matches.length ? (
                    matches.map((market) => (
                      <button
                        key={market.slug}
                        type="button"
                        onClick={() => addMarket(market.slug)}
                        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-2 py-1.5 text-left hover:bg-secondary"
                      >
                        <span className="min-w-0 text-base font-medium">{market.name}</span>
                        <Hours value={market.hours} className="text-muted-foreground" />
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">No markets match that.</p>
                  )
                ) : (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">
                    Type a hall or neighbourhood. {3 - picked.length} left.
                  </p>
                )}
              </div>
            </>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" disabled={picked.length !== 3} onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </HomePanel>
      ) : null}

      {step === 3 ? (
        <HomePanel
          className="mt-8"
          tone="here"
          icon={TicketMark}
          kicker="Then you are in"
          title="Three things this site does"
          how="Read this once. Then finish."
        >
          <ol className="grid gap-3 text-base">
            <li>
              <span className="font-medium">Search.</span> Home and Markets search every hall and
              stall. Hours sit on the right of every row.
            </li>
            <li>
              <span className="font-medium">Save.</span> The chip on a market or stall. Those three
              halls are already on your list.
            </li>
            <li>
              <span className="font-medium">This week, in your inbox.</span> Hours and addresses for
              the halls you picked, sent to {email ?? "the email on this account"}.
            </li>
          </ol>
          <EmailVisitButton className="mt-4" slugs={picked} />
          <form className="mt-4" action={finish}>
            <input type="hidden" name="username" value={normalized} />
            <input type="hidden" name="next" value={next} />
            {picked.map((slug, index) => (
              <input key={slug} type="hidden" name={`favorite_${index}`} value={slug} />
            ))}
            {state?.error ? <p className="mb-2 text-sm text-destructive">{state.error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="submit" disabled={finishing}>
                {finishing ? "Saving…" : "Finish"}
              </Button>
            </div>
          </form>
        </HomePanel>
      ) : null}

      <form action={signOut} className="mt-8">
        <button type="submit" className={cn("text-sm font-medium hover:underline")}>
          Sign out
        </button>
      </form>
    </div>
  );
}
