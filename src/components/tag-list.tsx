import { Badge } from "@/components/ui/badge";
import { tagLabel } from "@/lib/find-paths";
import { cn } from "@/lib/utils";

export function TagList({
  tags,
  className,
}: {
  tags: string[];
  className?: string;
}) {
  if (!tags.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <li key={tag}>
          <Badge variant="secondary" className="h-auto px-2.5 py-1 text-sm font-normal">
            {tagLabel(tag)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
