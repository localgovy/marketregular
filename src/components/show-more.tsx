export function ShowMore({
  shown,
  total,
  noun,
  onMore,
}: {
  shown: number;
  total: number;
  noun: string;
  onMore: () => void;
}) {
  if (shown >= total) return null;
  return (
    <div className="mt-6 flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onMore}
        className="stall-chip inline-flex h-11 min-w-[10rem] cursor-pointer items-center justify-center bg-primary px-5 text-sm font-medium text-primary-foreground outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground"
      >
        Show more
      </button>
      <p className="text-sm text-muted-foreground">
        {shown} of {total} {noun}
      </p>
    </div>
  );
}
