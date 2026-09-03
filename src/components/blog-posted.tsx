import { blogPostedIso } from "@/lib/blog";
import { formatPostedOn } from "@/lib/format";

export function BlogPosted({
  date,
  kicker,
}: {
  date: string;
  kicker?: string;
}) {
  return (
    <p className="type-kicker min-w-0 text-muted-foreground">
      {kicker ? <>{kicker} · </> : null}
      Published:{" "}
      <time dateTime={date}>{formatPostedOn(blogPostedIso(date))}</time>
    </p>
  );
}
