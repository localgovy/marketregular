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

type ToneStyle = {
  shell: string;
  ink: "paper" | "leaf";
  mark: string;
  band?: string;
};

const quiet: ToneStyle = {
  shell: "bg-card text-card-foreground ring-1 ring-border",
  ink: "paper",
  mark: "bg-secondary text-muted-foreground",
};

const tones: Record<PanelTone, ToneStyle> = {
  find: {
    shell: "bg-panel-find text-primary-foreground",
    ink: "leaf",
    mark: "bg-primary-foreground/15 text-primary-foreground",
    band: "awning-leaf",
  },
  open: {
    shell: "bg-card text-card-foreground ring-1 ring-border",
    ink: "paper",
    mark: "bg-primary text-primary-foreground",
    band: "bg-[color-mix(in_srgb,var(--primary)_9%,var(--card))]",
  },
  vendors: {
    shell: "bg-card text-card-foreground ring-1 ring-border",
    ink: "paper",
    mark: "bg-ticket/15 text-ticket",
  },
  menus: {
    shell: "bg-card text-card-foreground ring-1 ring-border",
    ink: "paper",
    mark: "bg-foreground text-receipt",
  },
  here: quiet,
  map: {
    shell: "bg-card text-card-foreground ring-1 ring-border",
    ink: "paper",
    mark: "bg-secondary text-primary",
  },
  back: quiet,
  more: quiet,
  directory: quiet,
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
  const leaf = t.ink === "leaf";
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 overflow-hidden rounded-lg", t.shell, className)}
    >
      <div
        className={cn(
          "flex flex-wrap items-end justify-between gap-3 px-4 pt-4 pb-1",
          t.band,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md",
              t.mark,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm",
                leaf ? "text-primary-foreground/75" : "text-muted-foreground"
              )}
            >
              {kicker}
            </p>
            <h2 className="font-heading text-2xl leading-tight">{title}</h2>
          </div>
        </div>
        {action ? (
          <div
            className={cn(
              "shrink-0 text-base font-medium [&_a]:underline [&_a]:underline-offset-4",
              leaf ? "text-primary-foreground" : "text-primary"
            )}
          >
            {action}
          </div>
        ) : null}
      </div>
      {flush ? (
        <>
          <p
            className={cn(
              "px-4 pt-2 pb-3 text-base",
              leaf ? "text-primary-foreground/75" : "text-muted-foreground"
            )}
          >
            {how}
          </p>
          {children}
        </>
      ) : (
        <div className="px-4 pt-2 pb-4">
          <p
            className={cn(
              "mb-4 text-base",
              leaf ? "text-primary-foreground/75" : "text-muted-foreground"
            )}
          >
            {how}
          </p>
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
  tone: "find" | "open" | "vendors" | "notes";
}) {
  const shells = {
    open: "bg-[color-mix(in_srgb,var(--primary)_9%,white)] text-foreground hover:bg-[color-mix(in_srgb,var(--primary)_14%,white)]",
    find: "awning-leaf overflow-hidden pt-4 text-primary-foreground hover:brightness-[1.05]",
    vendors: "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
    notes: "awning-board overflow-hidden pt-4 text-chalk hover:brightness-[1.08]",
  } as const;
  const hints = {
    open: "text-muted-foreground",
    find: "text-primary-foreground/75",
    vendors: "text-muted-foreground",
    notes: "text-chalk/75",
  } as const;

  return (
    <a
      href={href}
      className={cn(
        "flex min-h-12 min-w-[9.5rem] flex-1 flex-col justify-center rounded-md px-3 py-2 no-underline transition-colors",
        shells[tone],
      )}
    >
      <span className="text-base font-medium">{label}</span>
      <span className={cn("text-sm", hints[tone])}>{hint}</span>
    </a>
  );
}
