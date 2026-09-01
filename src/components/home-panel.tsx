import type { ComponentType, ReactNode } from "react";
import type { MarkProps } from "@/components/marks";
import { cn } from "@/lib/utils";

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
    mark: "bg-stamp/15 text-stamp",
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
  place = "page",
}: {
  id?: string;
  tone: PanelTone;
  icon: ComponentType<MarkProps>;
  kicker: string;
  title: string;
  how: ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
  place?: "page" | "rail";
}) {
  const t = tones[tone];
  const leaf = t.ink === "leaf";
  const rail = place === "rail";
  const awning = t.band === "awning-leaf" || t.band === "awning-board";
  return (
    <section
      id={id}
      className={cn("scroll-mt-28 lg:scroll-mt-24", t.shell, className)}
    >
      {awning ? <div className={cn("h-[7px] w-full", t.band)} aria-hidden /> : null}
      <div
        className={cn(
          rail
            ? "flex flex-col gap-1 px-4 pt-4 pb-2"
            : "flex flex-wrap items-end justify-between gap-3 px-4 pt-3 pb-3",
          !awning && t.band,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex shrink-0 items-center justify-center stall-chip-sm",
              rail ? "size-8" : "size-9",
              t.mark,
            )}
          >
            <Icon className={rail ? "size-4" : "size-5"} />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "type-kicker",
                leaf ? "text-chalk" : "text-muted-foreground"
              )}
            >
              {kicker}
              {rail && action ? (
                <span
                  className={cn(
                    leaf ? "text-primary-foreground" : "text-primary",
                    "[&_a]:underline [&_a]:underline-offset-4",
                  )}
                >
                  {" "}
                  · {action}
                </span>
              ) : null}
            </p>
            <h2 className={rail ? "type-column" : undefined}>{title}</h2>
          </div>
        </div>
        {!rail && action ? (
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
              "shrink-0 px-4 pt-2 pb-3",
              rail ? "text-sm leading-relaxed" : "text-base",
              leaf ? "text-chalk" : "text-muted-foreground"
            )}
          >
            {how}
          </p>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </>
      ) : (
        <div className={cn("px-4 pt-2 pb-4", rail && "px-3")}>
        <div
          className={cn(
            rail ? "mb-3 text-sm leading-relaxed" : "mb-3 text-base sm:mb-4",
            leaf ? "text-chalk" : "text-muted-foreground"
          )}
        >
            {how}
          </div>
          {children}
        </div>
      )}
    </section>
  );
}
