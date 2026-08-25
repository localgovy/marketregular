"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { getComposerDirectory } from "@/app/actions/home-lazy";
import { ReviewCard } from "@/components/review-card";
import { useAuthCookie } from "@/lib/supabase/use-auth-cookie";
import type { GeoMarket } from "@/lib/geo";
import type { FloorItem, StallRef } from "@/types/database";

type ComposerProps = {
  autoFocus?: boolean;
  signedIn?: boolean;
  stalls: Array<Pick<StallRef, "id" | "name" | "slug" | "market_id" | "stall">>;
  markets: GeoMarket[];
  onPosted: (item: FloorItem) => void;
};

type ComposerBundle = {
  Composer: ComponentType<ComposerProps>;
  stalls: ComposerProps["stalls"];
  markets: GeoMarket[];
};

function ComposerStart({ onStart }: { onStart: () => void }) {
  return (
    <div className="px-3 py-3">
      <button
        type="button"
        onClick={onStart}
        className="relative z-10 w-full rounded-md border border-input bg-card px-3 pt-3 pb-2 text-left hover:border-ring"
      >
        <span className="block text-sm font-medium text-foreground">Write a review</span>
        <span className="mt-2 block min-h-[5.5rem] py-2 text-base text-muted-foreground">
          What should the next shopper know?
        </span>
      </button>
    </div>
  );
}

function LoadedComposer({
  bundle,
  signedIn,
  onPosted,
}: {
  bundle: ComposerBundle;
  signedIn: boolean;
  onPosted: (item: FloorItem) => void;
}) {
  const Composer = bundle.Composer;
  return (
    <Composer
      autoFocus
      signedIn={signedIn}
      stalls={bundle.stalls}
      markets={bundle.markets}
      onPosted={onPosted}
    />
  );
}

export function FloorTapeLive({ children }: { children: ReactNode }) {
  const signedIn = useAuthCookie();
  const [bundle, setBundle] = useState<ComposerBundle | null>(null);
  const [extra, setExtra] = useState<FloorItem[]>([]);
  const [pending, setPending] = useState(false);

  function start() {
    if (bundle || pending) return;
    setPending(true);
    void Promise.all([import("@/components/floor-composer"), getComposerDirectory()])
      .then(([mod, dir]) => {
        setBundle({
          Composer: mod.FloorComposer,
          stalls: dir.stalls,
          markets: dir.markets,
        });
      })
      .finally(() => setPending(false));
  }

  return (
    <>
      <div className="bg-background lg:sticky lg:top-0 lg:z-10">
        {children}
        {bundle ? (
          <div className="px-3 py-3">
            <LoadedComposer
              bundle={bundle}
              signedIn={signedIn}
              onPosted={(item) => setExtra((current) => [item, ...current].slice(0, 30))}
            />
          </div>
        ) : (
          <ComposerStart onStart={start} />
        )}
      </div>
      {extra.length ? (
        <ol>
          {extra.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </ol>
      ) : null}
    </>
  );
}
