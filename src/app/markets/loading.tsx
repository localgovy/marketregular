import { LAUNCH_CITY } from "@/lib/launch";

export default function MarketsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1>{LAUNCH_CITY} farmers&apos; markets</h1>
      <div className="type-kicker mt-2 mb-6 h-5 w-72 bg-muted" />
      <div className="h-11 w-full bg-muted" />
      <div className="mt-8 border-b border-border pb-2">
        <div className="h-6 w-36 bg-muted" />
      </div>
      <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)] lg:gap-x-4">
        <div className="grid gap-4">
          <div className="mb-0 h-8 w-28 bg-muted" />
          <div className="h-44 bg-muted" />
          <div className="h-44 bg-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mb-0 h-8 w-28 bg-muted sm:col-span-2" />
          <div className="h-36 bg-muted" />
          <div className="h-36 bg-muted" />
        </div>
      </div>
    </div>
  );
}
