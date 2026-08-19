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

const quiet = {
  shell: "bg-card ring-1 ring-border",
  featured: false,
};

const featured = {
  shell: "bg-card ring-1 ring-border shadow-sm border-l-[3px] border-l-primary",
  featured: true,
};

const tones: Record<PanelTone, { shell: string; featured: boolean }> = {
  find: featured,
  open: featured,
  vendors: quiet,
  menus: quiet,
  here: quiet,
  map: quiet,
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
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 overflow-hidden rounded-lg", t.shell, className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 pb-1">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{kicker}</p>
            <h2 className="font-heading text-2xl leading-tight">{title}</h2>
          </div>
        </div>
        {action ? (
          <div className="shrink-0 text-base font-medium text-primary [&_a]:underline [&_a]:underline-offset-4">
            {action}
          </div>
        ) : null}
      </div>
      {flush ? (
        <>
          <p className="px-4 pt-2 pb-3 text-base text-muted-foreground">{how}</p>
          {children}
        </>
      ) : (
        <div className="px-4 pt-2 pb-4">
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
  const featuredChip = tone === "open" || tone === "find";
  return (
    <a
      href={href}
      className={cn(
        "flex min-h-12 min-w-[9.5rem] flex-1 flex-col justify-center rounded-md px-3 py-2 no-underline transition-colors",
        featuredChip
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-card text-foreground ring-1 ring-border hover:bg-secondary"
      )}
    >
      <span className="text-base font-medium">{label}</span>
      <span className={cn("text-sm", featuredChip ? "opacity-80" : "text-muted-foreground")}>
        {hint}
      </span>
    </a>
  );
}
