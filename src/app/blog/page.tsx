import type { Metadata } from "next";
import Link from "next/link";
import { BlogPosted } from "@/components/blog-posted";
import { JsonLd } from "@/components/json-ld";
import { listBlogPosts } from "@/lib/blog";
import { LAUNCH_CITY } from "@/lib/launch";
import { BLOG_CRUMB, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = pageMeta({
  title: "Blog",
  path: "/blog",
  description: `Weekend hours and neighbourhood guides for ${LAUNCH_CITY} farmers' markets, written so you can send someone the list.`,
});

export default function BlogIndexPage() {
  const posts = listBlogPosts();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd([BLOG_CRUMB])} />
      <h1>Blog</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        Weekend hours, and where to go in the east end.
      </p>
      {posts.length ? (
        <ul className="divide-y divide-border border-t border-border">
          {posts.map((post) => (
            <li key={post.slug} className="py-6">
              <BlogPosted date={post.date} kicker={post.kicker} />
              <h2 className="mt-1">
                <Link href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                {post.description}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted-foreground">No notes yet.</p>
      )}
    </div>
  );
}
