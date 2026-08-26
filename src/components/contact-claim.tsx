"use client";

import { useMemo, useState } from "react";
import { ClaimForm } from "@/components/claim-form";
import { SearchField } from "@/components/search-field";
import { Label } from "@/components/ui/label";

export type ContactListingOption = {
  id: string;
  name: string;
  where?: string;
};

type Kind = "market" | "vendor";

const VENDOR_MATCH_CAP = 15;

function matchesQuery(item: ContactListingOption, query: string) {
  const hay = `${item.name} ${item.where ?? ""}`.toLowerCase();
  return hay.includes(query);
}

function rankMatch(item: ContactListingOption, query: string) {
  const name = item.name.toLowerCase();
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (item.where?.toLowerCase().includes(query)) return 3;
  return 2;
}

export function ContactClaim({
  markets,
  vendors,
}: {
  markets: ContactListingOption[];
  vendors: ContactListingOption[];
}) {
  const [kind, setKind] = useState<Kind>("market");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<(ContactListingOption & { type: Kind }) | null>(
    null,
  );

  const pool = kind === "market" ? markets : vendors;
  const q = query.trim().toLowerCase();

  const { items, more } = useMemo(() => {
    if (kind === "vendor" && !q) return { items: [] as ContactListingOption[], more: false };
    const filtered = q
      ? [...pool]
          .filter((item) => matchesQuery(item, q))
          .sort((a, b) => {
            const rank = rankMatch(a, q) - rankMatch(b, q);
            return rank !== 0 ? rank : a.name.localeCompare(b.name);
          })
      : pool;
    if (kind === "vendor") {
      return { items: filtered.slice(0, VENDOR_MATCH_CAP), more: filtered.length > VENDOR_MATCH_CAP };
    }
    return { items: filtered, more: false };
  }, [kind, pool, q]);

  if (selected) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-1">
          <p className="text-base font-medium">{selected.name}</p>
          {selected.where ? (
            <p className="text-sm text-muted-foreground">{selected.where}</p>
          ) : null}
          <button
            type="button"
            className="justify-self-start text-sm font-medium hover:underline"
            onClick={() => setSelected(null)}
          >
            Choose a different listing
          </button>
        </div>
        <ClaimForm
          key={selected.id}
          targetType={selected.type}
          targetId={selected.id}
          listingName={selected.name}
          layout="open"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5 rounded-xl bg-secondary/50 p-5">
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">What are you claiming?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="claim-kind"
            checked={kind === "market"}
            className="accent-primary"
            onChange={() => {
              setKind("market");
              setQuery("");
            }}
          />
          A market
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="claim-kind"
            checked={kind === "vendor"}
            className="accent-primary"
            onChange={() => {
              setKind("vendor");
              setQuery("");
            }}
          />
          A vendor
        </label>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="claim-listing-q">{kind === "market" ? "Find the market" : "Find the stall"}</Label>
        <SearchField
          id="claim-listing-q"
          value={query}
          onChange={setQuery}
          placeholder={kind === "market" ? "Market name" : "Stall or market name"}
          className="bg-card"
        />
      </div>
      {kind === "vendor" && !q ? (
        <p className="text-sm text-muted-foreground">
          Type a stall name to see matches. There are hundreds.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No listings match that name.</p>
      ) : (
        <ul className="grid max-h-80 gap-1 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left outline-none hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                onClick={() => setSelected({ ...item, type: kind })}
              >
                <span className="block text-base font-medium">{item.name}</span>
                {item.where ? (
                  <span className="mt-0.5 block text-sm text-muted-foreground">{item.where}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {more ? (
        <p className="text-sm text-muted-foreground">Showing the first {VENDOR_MATCH_CAP}. Type more of the name.</p>
      ) : null}
    </div>
  );
}
