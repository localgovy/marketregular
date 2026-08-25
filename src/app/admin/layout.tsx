import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";
import { noIndex } from "@/lib/seo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: noIndex,
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1>Admin needs Supabase</h1>
        <p className="type-lede mt-3 text-muted-foreground">
          Create a Supabase project, run the migrations in <code>supabase/</code>, and set
          the env vars in <code>.env.local</code> / Vercel. Grant desk access by setting{" "}
          <code>profiles.role</code> to <code>admin</code> in the database.
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
      <p className="type-kicker text-primary">Directory desk</p>
      <h1>Admin</h1>
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
