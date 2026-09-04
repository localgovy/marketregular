import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  /** Civil date in the file, shown as Published. */
  date: string;
  kicker?: string;
  body: string;
};

/** Noon on a civil date so Toronto does not slip to the previous day. */
export function blogPostedIso(date: string) {
  return date.includes("T") ? date : `${date}T12:00:00`;
}

/** Frontmatter may include markdown links; metadata and excerpts stay plain. */
export function plainBlogText(text: string) {
  return text
    .replace(/\\n|\n/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Lede lines in frontmatter, split on a real newline or a written `\n`. */
export function blogLedeParagraphs(text: string) {
  return text
    .split(/\n|\\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };
  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const cut = line.indexOf(":");
    if (cut < 1) continue;
    const key = line.slice(0, cut).trim();
    let value = line.slice(cut + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body: match[2].trim() };
}

function readPostFile(file: string): BlogPost | null {
  if (!file.endsWith(".md")) return null;
  const slug = file.slice(0, -3);
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
  const { data, body } = parseFrontmatter(raw);
  const title = data.title?.trim();
  const description = data.description?.trim();
  const date = data.date?.trim();
  if (!title || !description || !date) return null;
  return {
    slug,
    title,
    description,
    date,
    kicker: data.kicker?.trim() || undefined,
    body,
  };
}

export const listBlogPosts = cache((): BlogPost[] => {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .map(readPostFile)
    .filter((post): post is BlogPost => Boolean(post))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
});

export const getBlogPost = cache((slug: string): BlogPost | null => {
  if (!slug || slug.includes("/") || slug.includes("..")) return null;
  const file = `${slug}.md`;
  const full = path.join(BLOG_DIR, file);
  if (!full.startsWith(BLOG_DIR + path.sep)) return null;
  if (!fs.existsSync(full)) return null;
  return readPostFile(file);
});
