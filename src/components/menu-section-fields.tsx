"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MENU_SECTION_CAP,
  MENU_SECTION_NAME_MAX,
  NEW_MENU_SECTION,
  type MenuSectionRef,
} from "@/lib/menu-sections";

const selectClass = "h-8 rounded-lg border border-input bg-card px-2.5 text-sm";

export function MenuSectionFields({
  id,
  sections,
  defaultSection,
}: {
  id: string;
  sections: MenuSectionRef[];
  defaultSection?: string | null;
}) {
  const [choice, setChoice] = useState(defaultSection?.trim() ?? "");
  const atCap = sections.length >= MENU_SECTION_CAP;
  const showNew = choice === NEW_MENU_SECTION;

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-section`}>Section</Label>
        <select
          id={`${id}-section`}
          name="menu_section_choice"
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          className={selectClass}
        >
          <option value="">No section</option>
          {sections.map((section) => (
            <option key={section.name} value={section.name}>
              {section.name}
            </option>
          ))}
          <option value={NEW_MENU_SECTION} disabled={atCap}>
            New section…
          </option>
        </select>
      </div>
      {showNew ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-section-new`}>New section name</Label>
          <Input
            id={`${id}-section-new`}
            name="menu_section_new"
            maxLength={MENU_SECTION_NAME_MAX}
          />
        </div>
      ) : null}
      {atCap ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          A menu can have at most 5 sections.
        </p>
      ) : null}
    </>
  );
}
