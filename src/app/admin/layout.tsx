import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-heading text-3xl">Admin needs Supabase</h1>
        <p className="mt-3 text-muted-foreground">
          Create a Supabase project, run the migrations in <code>supabase/</code>, and set
          the env vars in <code>.env.local</code> / Vercel. Add your email to{" "}
          <code>ADMIN_EMAILS</code>.
        </p>
      </div>
    );
  }
  await requireAdmin();
  const links = [
    ["/admin", "Overview"],
    ["/admin/markets", "Markets"],
    ["/admin/vendors", "Vendors"],
    ["/admin/moderation", "Moderation"],
    ["/admin/claims", "Claims"],
  ] as const;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <p className="text-xs tracking-wide text-primary uppercase">Directory desk</p>
      <h1 className="font-heading text-3xl">Admin</h1>
      <nav className="mt-4 mb-8 flex flex-wrap gap-2">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={cn(buttonVariants({ variant: "outline" }))}>
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
