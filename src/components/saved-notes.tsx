"use client";

import Link from "next/link";
import { SaveButton } from "@/components/save-button";
import { formatPostedOn } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SavedNote = {
  slug: string;
  title: string;
  date: string;
  kicker?: string;
};

export function SavedNotesSection({
  notes,
  slugs,
  heading: Heading,
  listClassName,
}: {
  notes: SavedNote[];
  slugs: string[];
  heading: "h2" | "h3";
  listClassName?: string;
}) {
  const bySlug = new Map(notes.map((note) => [note.slug, note]));
  const rows = slugs.flatMap((slug) => {
    const note = bySlug.get(slug);
    return note ? [note] : [];
  });

  return (
    <section>
      <Heading>Blog</Heading>
      {rows.length ? (
        <ul className={cn("ring-1 ring-border", listClassName)}>
          {rows.map((note) => (
            <li
              key={note.slug}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border last:border-b-0"
            >
              <Link
                href={`/blog/${note.slug}`}
                className="min-w-0 px-3 py-2.5 hover:bg-secondary/50"
              >
                <span className="block text-base font-medium">{note.title}</span>
                <span className="text-sm text-muted-foreground">
                  {formatPostedOn(
                    note.date.includes("T") ? note.date : `${note.date}T12:00:00`,
                  )}
                </span>
              </Link>
              <span className="pr-2">
                <SaveButton kind="blog" slug={note.slug} name={note.title} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No notes on the list.</p>
      )}
    </section>
  );
}
