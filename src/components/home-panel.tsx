import type { ReactNode } from "react";
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
  how: ReactNode;
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
      className={cn("scroll-mt-24", t.shell, className)}
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
              "mt-0.5 flex size-9 shrink-0 items-center justify-center stall-chip-sm",
              t.mark,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "type-kicker",
                leaf ? "text-primary-foreground/75" : "text-muted-foreground"
              )}
            >
              {kicker}
            </p>
            <h2>{title}</h2>
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
