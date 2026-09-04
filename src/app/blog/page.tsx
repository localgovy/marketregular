import type { Metadata } from "next";
import Link from "next/link";
import { BlogPosted } from "@/components/blog-posted";
import { JsonLd } from "@/components/json-ld";
import { SaveButton } from "@/components/save-button";
import { listBlogPosts } from "@/lib/blog";
import { LAUNCH_CITY } from "@/lib/launch";
import { BLOG_CRUMB, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = pageMeta({
  title: "Blog",
  path: "/blog",
  description: `Find out the latest schedules, vendors, and tidbits from your favourite farmers' markets in ${LAUNCH_CITY}. If you find an article with information that you don't want to lose, just save it to your profile.`,
});

export default function BlogIndexPage() {
  const posts = listBlogPosts();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd([BLOG_CRUMB])} />
      <h1>Blog</h1>
      <p className="type-lede mt-2 mb-8">
        Find out the latest schedules, vendors, and tidbits from your favourite
        farmers' markets in {LAUNCH_CITY}. If you find an article with
        information that you don't want to lose, just save it to your profile.
      </p>
      {posts.length ? (
        <ul className="divide-y divide-border border-t border-border">
          {posts.map((post) => (
            <li key={post.slug} className="py-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <BlogPosted date={post.date} kicker={post.kicker} />
                  <h2 className="mt-1">
                    <Link href={`/blog/${post.slug}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-base leading-relaxed">
                    {post.description}
                  </p>
                </div>
                <SaveButton kind="blog" slug={post.slug} name={post.title} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted-foreground">No notes yet.</p>
      )}
    </div>
  );
}
