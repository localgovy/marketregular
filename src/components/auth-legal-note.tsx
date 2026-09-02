import Link from "next/link";

export function AuthLegalNote() {
  return (
    <p className="text-sm text-muted-foreground">
      By creating an account you agree to the{" "}
      <Link href="/terms" className="font-medium text-foreground hover:underline">
        Terms
      </Link>{" "}
      and the{" "}
      <Link href="/privacy" className="font-medium text-foreground hover:underline">
        Privacy policy
      </Link>
      .
    </p>
  );
}
