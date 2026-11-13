import { copyText, siteCopy } from "@/content/site-copy";

export default function MarketsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6">
      <h1 className="sr-only">{copyText(siteCopy["/markets"].h1)}</h1>
      <div className="flex flex-wrap gap-2">
        <div className="h-8 w-14 bg-muted" />
        <div className="h-8 w-24 bg-muted" />
        <div className="h-8 w-28 bg-muted" />
        <div className="h-8 w-24 bg-muted" />
        <div className="h-8 w-28 bg-muted" />
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-12">
        <div className="bg-primary p-6 lg:col-span-7">
          <div className="h-10 w-2/3 bg-primary-foreground/15" />
          <div className="mt-3 h-6 w-full max-w-xl bg-primary-foreground/15" />
          <div className="mt-4 h-11 bg-receipt" />
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-4">
            <div className="h-12 bg-primary-foreground/15" />
            <div className="h-12 bg-primary-foreground/15" />
            <div className="h-12 bg-primary-foreground/15" />
          </div>
        </div>
        <div className="h-72 bg-muted lg:col-span-5" />
      </div>
      <div className="mt-5 h-36 bg-muted" />
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-12">
        <div className="h-96 bg-muted lg:col-span-5" />
        <div className="h-96 bg-muted lg:col-span-7" />
      </div>
    </div>
  );
}
