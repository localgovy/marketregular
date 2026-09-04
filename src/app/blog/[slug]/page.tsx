import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { BlogBody, BlogInlines } from "@/components/blog-body";
import { BlogPosted } from "@/components/blog-posted";
import { JsonLd } from "@/components/json-ld";
import { SaveButton } from "@/components/save-button";
import { blogLedeParagraphs, getBlogPost, listBlogPosts, plainBlogText } from "@/lib/blog";
import { SITE_NAME, SITE_OG } from "@/lib/constants";
import { BLOG_CRUMB, blogPostingJsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return listBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Blog" };
  const description = plainBlogText(post.description);
  return {
    ...pageMeta({
      title: post.title,
      description,
      path: `/blog/${post.slug}`,
    }),
    openGraph: {
      type: "article",
      locale: "en_CA",
      siteName: SITE_NAME,
      publishedTime: post.date,
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      images: [
        {
          url: SITE_OG,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();
  const path = `/blog/${post.slug}`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd([BLOG_CRUMB, { name: post.title, path }])} />
      <JsonLd
        data={blogPostingJsonLd({
          title: post.title,
          description: plainBlogText(post.description),
          date: post.date,
          path,
        })}
      />
      <div className="flex flex-wrap items-center gap-1">
        <BackButton href="/blog" />
        <BlogPosted date={post.date} kicker={post.kicker} />
      </div>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1>{post.title}</h1>
        <SaveButton kind="blog" slug={post.slug} name={post.title} size="lg" />
      </div>
      {blogLedeParagraphs(post.description).map((para, index) => (
        <p key={index} className="type-lede mt-2 text-muted-foreground">
          <BlogInlines text={para} />
        </p>
      ))}
      <BlogBody markdown={post.body} blogSlug={post.slug} />
    </div>
  );
}
