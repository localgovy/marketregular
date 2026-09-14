export function HoursListHead({
  name,
  saveGutter = false,
}: {
  name: string;
  saveGutter?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border pb-2 text-sm text-muted-foreground">
      <span>{name}</span>
      <span className="flex items-baseline gap-2">
        <span>Hours</span>
        {saveGutter ? (
          <span className="invisible stall-chip-sm inline-flex px-2.5 text-sm" aria-hidden>
            Save Info
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function MarketHoursHead() {
  return <HoursListHead name="Market" saveGutter />;
}
