"use client";

import { Button } from "@/components/ui/button";

export function ConfirmDelete({
  action,
  label,
  confirm,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  confirm: string;
}) {
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="destructive"
        onClick={(event) => {
          if (!window.confirm(confirm)) event.preventDefault();
        }}
      >
        {label}
      </Button>
    </form>
  );
}
