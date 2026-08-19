import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type PanelTone =
  | "find"
  | "open"
  | "vendors"
  | "menus"
  | "here"
  | "map"
  | "back"
  | "more"
  | "directory";

const tones: Record<
  PanelTone,
  {
    shell: string;
    bar: string;
    body: string;
  }
> = {
  find: {
    shell: "bg-panel-find ring-primary/25",
    bar: "bg-primary text-primary-foreground",
    body: "bg-[color-mix(in_srgb,var(--background)_55%,white)]",
  },
  open: {
    shell: "bg-panel-open ring-ticket/35",
    bar: "bg-ticket text-receipt",
    body: "bg-[color-mix(in_srgb,var(--background)_35%,var(--receipt))]",
  },
  vendors: {
    shell: "bg-panel-vendors ring-foreground/15",
    bar: "bg-foreground text-receipt",
    body: "bg-card",
  },
  menus: {
    shell: "bg-panel-menus ring-ticket/25",
    bar: "bg-[#8a4f1f] text-receipt",
    body: "bg-receipt",
  },
  here: {
    shell: "bg-panel-here ring-stamp/30",
    bar: "bg-stamp text-[#fbeceb]",
    body: "bg-[color-mix(in_srgb,var(--background)_50%,white)]",
  },
  map: {
    shell: "bg-panel-map ring-primary/30",
    bar: "bg-primary text-primary-foreground",
    body: "bg-card",
  },
  back: {
    shell: "bg-panel-back ring-ticket/20",
    bar: "bg-[#7a5324] text-receipt",
    body: "bg-card",
  },
  more: {
    shell: "bg-secondary ring-border",
    bar: "bg-board text-chalk",
    body: "bg-card",
  },
  directory: {
    shell: "bg-card ring-border",
    bar: "bg-primary text-primary-foreground",
    body: "bg-background",
  },
};

export function HomePanel({
  id,
  tone,
  icon: Icon,
  kicker,
  title,
  how,
  action,
  children,
  className,
  flush,
}: {
  id?: string;
  tone: PanelTone;
  icon: LucideIcon;
  kicker: string;
  title: string;
  how: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  const t = tones[tone];
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-lg ring-1",
        t.shell,
        className
      )}
    >
      <div className={cn("flex flex-wrap items-end justify-between gap-3 px-4 py-3", t.bar)}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md bg-black/15">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium tracking-wide opacity-85">{kicker}</p>
            <h2 className="font-heading text-2xl leading-tight">{title}</h2>
          </div>
        </div>
        {action ? (
          <div className="shrink-0 text-base font-medium [&_a]:underline [&_a]:underline-offset-4">
            {action}
          </div>
        ) : null}
      </div>
      {flush ? (
        <>
          <p className={cn("px-4 pt-3 pb-2 text-base text-muted-foreground", t.body)}>{how}</p>
          {children}
        </>
      ) : (
        <div className={cn("px-4 py-4", t.body)}>
          <p className="mb-4 text-base text-muted-foreground">{how}</p>
          {children}
        </div>
      )}
    </section>
  );
}

export function JumpChip({
  href,
  label,
  hint,
  tone,
}: {
  href: string;
  label: string;
  hint: string;
  tone: "find" | "open" | "here" | "notes";
}) {
  const styles = {
    find: "bg-primary text-primary-foreground hover:bg-primary/90",
    open: "bg-ticket text-receipt hover:bg-ticket/90",
    here: "bg-stamp text-[#fbeceb] hover:bg-stamp/90",
    notes: "bg-board text-chalk hover:bg-board/90",
  }[tone];

  return (
    <a
      href={href}
      className={cn(
        "flex min-h-12 min-w-[9.5rem] flex-1 flex-col justify-center rounded-md px-3 py-2 no-underline transition-colors",
        styles
      )}
    >
      <span className="text-base font-medium">{label}</span>
      <span className="text-sm opacity-80">{hint}</span>
    </a>
  );
}
