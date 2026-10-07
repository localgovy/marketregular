export function ShowMore({
  shown,
  total,
  noun,
  nounOne,
  busy = false,
  onMore,
}: {
  shown: number;
  total: number;
  noun: string;
  nounOne?: string;
  busy?: boolean;
  onMore: () => void;
}) {
  if (shown >= total) return null;
  const word = total === 1 ? (nounOne ?? noun.replace(/s$/, "")) : noun;
  return (
    <div className="mt-6 flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={onMore}
        className="stall-chip inline-flex h-11 min-w-[10rem] cursor-pointer items-center justify-center bg-primary px-5 text-sm font-medium text-primary-foreground outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Loading" : "Show more"}
      </button>
      <p className="text-sm text-muted-foreground">
        {shown} of {total} {word}
      </p>
    </div>
  );
}
