import Link from "next/link";

export function AuthLegalNote({ mode = "signup" }: { mode?: "signin" | "signup" }) {
  const lead =
    mode === "signin" ? "By signing in you agree to the" : "By creating an account you agree to the";
  return (
    <p className="text-sm text-muted-foreground">
      {lead}{" "}
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
