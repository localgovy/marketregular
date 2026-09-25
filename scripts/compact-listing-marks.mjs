/**
 * Pre-size wide listing marks so directory cards stay light without
 * Supabase Storage image transformations (`/storage/v1/render/image/`).
 *
 * Pro includes 100 origin images per cycle. Rewriting public URLs to the
 * render endpoint bills every distinct logo. This script downscales linked
 * rasters wider than 360px in place and cache-busts logo_url.
 *
 *   node scripts/compact-listing-marks.mjs
 *   node scripts/compact-listing-marks.mjs --tighten
 *
 * --tighten re-encodes linked rasters still over 40KB as WebP (quality 82)
 * at the same path. The card slot is 72px wide; 360px WebP stays sharper
 * than the old 180px transform and stays in the tens of kilobytes.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const PROJECT = "pxsndrlptceafhsxfays";
const BUCKET = "listing-marks";
const MARKER = `/storage/v1/object/public/${BUCKET}/`;
const MAX_WIDTH = 360;
const CACHE_TAG = "fit360";
const RASTER = new Set(["png", "jpeg", "jpg", "webp"]);

async function env() {
  const raw = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  const map = {};
  for (const line of raw.split("\n")) {
    const i = line.indexOf("=");
    if (i < 1 || line.startsWith("#")) continue;
    map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return map;
}

function objectName(logoUrl) {
  try {
    const url = new URL(logoUrl);
    if (!url.hostname.endsWith(`${PROJECT}.supabase.co`)) return null;
    const i = url.pathname.indexOf(MARKER);
    if (i < 0) return null;
    const name = decodeURIComponent(url.pathname.slice(i + MARKER.length));
    if (!name || name.includes("..")) return null;
    return name;
  } catch {
    return null;
  }
}

async function rows(supabase, table) {
  const out = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from(table)
      .select("id, logo_url")
      .not("logo_url", "is", null)
      .range(from, from + page - 1);
    if (error) throw error;
    for (const row of data) out.push({ ...row, table });
    if (data.length < page) break;
  }
  return out;
}

async function encode(input, format) {
  const pipeline = sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_WIDTH, fit: "inside", withoutEnlargement: true });
  if (format === "jpeg" || format === "jpg") {
    return {
      body: await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer(),
      contentType: "image/jpeg",
    };
  }
  if (format === "webp") {
    return {
      body: await pipeline.webp({ quality: 82 }).toBuffer(),
      contentType: "image/webp",
    };
  }
  return {
    body: await pipeline.png({ compressionLevel: 9 }).toBuffer(),
    contentType: "image/png",
  };
}

async function pool(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(runners);
}

const vars = await env();
const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const linked = [...(await rows(supabase, "markets")), ...(await rows(supabase, "vendors"))];
const byObject = new Map();
for (const row of linked) {
  const name = objectName(row.logo_url);
  if (!name) continue;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "svg" || !RASTER.has(ext)) continue;
  const group = byObject.get(name) ?? [];
  group.push(row);
  byObject.set(name, group);
}

const tightenOnly = process.argv.includes("--tighten");
const stats = { checked: 0, resized: 0, kept: 0, skippedLarger: 0, failed: 0 };
const failures = [];

if (!tightenOnly) await pool([...byObject.entries()], 6, async ([name, owners]) => {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(name);
    if (error) throw new Error(error.message);
    const input = Buffer.from(await data.arrayBuffer());
    const meta = await sharp(input, { failOn: "none" }).metadata();
    stats.checked += 1;
    const format = meta.format ?? "";
    if (!RASTER.has(format) || !meta.width || meta.width <= MAX_WIDTH) {
      stats.kept += 1;
      return;
    }
    const { body, contentType } = await encode(input, format);
    const after = await sharp(body).metadata();
    if (body.length >= input.length) {
      stats.skippedLarger += 1;
      console.log(
        `keep     ${name} ${meta.width}x${meta.height} ${input.length}b (resized ${body.length}b)`,
      );
      return;
    }
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(name, body, {
      upsert: true,
      contentType,
      cacheControl: "31536000",
    });
    if (uploadError) throw new Error(uploadError.message);
    for (const row of owners) {
      const next = new URL(row.logo_url);
      next.searchParams.set("v", CACHE_TAG);
      if (next.href === row.logo_url) continue;
      const { error: dbError } = await supabase
        .from(row.table)
        .update({ logo_url: next.href })
        .eq("id", row.id);
      if (dbError) throw new Error(dbError.message);
    }
    stats.resized += 1;
    console.log(
      `resized  ${name} ${meta.width}x${meta.height} → ${after.width}x${after.height} ${input.length}b → ${body.length}b`,
    );
  } catch (error) {
    stats.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`failed   ${name}: ${message}`);
  }
});

if (!tightenOnly) {
  console.log(JSON.stringify({ pass: "width", ...stats }));
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
}

if (!tightenOnly) process.exit(0);

const TIGHTEN_AT = 40_000;
const tight = { checked: 0, encoded: 0, kept: 0, failed: 0 };
const tightFailures = [];

await pool([...byObject.entries()], 6, async ([name, owners]) => {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(name);
    if (error) throw new Error(error.message);
    const input = Buffer.from(await data.arrayBuffer());
    tight.checked += 1;
    if (input.length <= TIGHTEN_AT) {
      tight.kept += 1;
      return;
    }
    const body = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_WIDTH, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    if (body.length >= input.length) {
      tight.kept += 1;
      console.log(`keep     ${name} ${input.length}b (webp ${body.length}b)`);
      return;
    }
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(name, body, {
      upsert: true,
      contentType: "image/webp",
      cacheControl: "31536000",
    });
    if (uploadError) throw new Error(uploadError.message);
    for (const row of owners) {
      const next = new URL(row.logo_url);
      next.searchParams.set("v", "mark360");
      if (next.href === row.logo_url) continue;
      const { error: dbError } = await supabase
        .from(row.table)
        .update({ logo_url: next.href })
        .eq("id", row.id);
      if (dbError) throw new Error(dbError.message);
    }
    tight.encoded += 1;
    console.log(`webp     ${name} ${input.length}b → ${body.length}b`);
  } catch (error) {
    tight.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    tightFailures.push(`${name}: ${message}`);
    console.error(`failed   ${name}: ${message}`);
  }
});

console.log(JSON.stringify({ pass: "tighten", ...tight }));
if (tightFailures.length) {
  console.error(tightFailures.join("\n"));
  process.exit(1);
}
