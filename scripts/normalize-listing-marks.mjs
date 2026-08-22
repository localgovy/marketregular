/**
 * Listing-mark standard:
 * - Drawn fallbacks: one dark ink, thick simple strokes, transparent ground.
 * - Official logos: keep their colours; only drop paper/padding around them.
 * - Never leave an opaque white box on the cream cards.
 *
 * Usage (from repo root):
 *   node scripts/normalize-listing-marks.mjs            # write /tmp/listing-marks/out
 *   node scripts/normalize-listing-marks.mjs --upload   # upsert into listing-marks + bump logo_url
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";

const PROJECT = "pxsndrlptceafhsxfays";
const PUBLIC = `https://${PROJECT}.supabase.co/storage/v1/object/public/listing-marks/`;
const INK = { r: 28, g: 25, b: 22, alpha: 1 };
const CACHE_TAG = "v=stamp1";
const SRC = "/tmp/listing-marks/markets";
const OUT = "/tmp/listing-marks/out";

const STAMP = new Set([
  "east-york-farmers-market.png",
  "etobicoke-civic-centre-farmers-market.png",
  "evergreen-brick-works-saturday-farmers-market.png",
  "montgomerys-inn-farmers-market.png",
  "sorauren-farmers-market.png",
  "sorauren-farmers-market-henderson-brewery.png",
  "the-junction-farmers-market.png",
  "utsc-community-market.png",
  "yum-market.png",
]);

const KNOCKOUT = new Set([
  "scarborough-farmers-market.png",
  "courtyard-farmers-market.png",
  "trinity-bellwoods-farmers-market.png",
  "downsview-park-merchants-market.png",
  "bloor-borden-farmers-market.png",
  "east-lynn-park-farmers-market.png",
  "davisville-village-market.jpg",
  "sickkids-market.jpg",
  "sickkids-market-indoor-winter.jpg",
  "withrow-park-farmers-market.jpg",
]);

function dilate(mask, w, h) {
  const out = Buffer.alloc(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ink = false;
      for (let dy = -1; dy <= 1 && !ink; dy++) {
        for (let dx = -1; dx <= 1 && !ink; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (mask[ny * w + nx]) ink = true;
        }
      }
      out[y * w + x] = ink ? 1 : 0;
    }
  }
  return out;
}

async function toStamp(input) {
  const resized = await sharp(input)
    .resize(520, 520, { fit: "inside", withoutEnlargement: false })
    .greyscale()
    .blur(1.15)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = resized;
  const w = info.width;
  const h = info.height;
  let mask = Buffer.alloc(w * h);
  for (let i = 0; i < data.length; i++) {
    mask[i] = data[i] < 210 ? 1 : 0;
  }
  mask = dilate(dilate(dilate(dilate(dilate(mask, w, h), w, h), w, h), w, h), w, h);
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4;
    if (mask[i]) {
      rgba[o] = INK.r;
      rgba[o + 1] = INK.g;
      rgba[o + 2] = INK.b;
      rgba[o + 3] = 255;
    }
  }
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 8 })
    .extend({
      top: 28,
      bottom: 28,
      left: 28,
      right: 28,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 });
}

function isPaper(r, g, b, a, paper) {
  if (a < 12) return true;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (paper === "white") return lum > 242 && sat < 0.07;
  return lum < 18 && sat < 0.12;
}

async function cornerKind(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize(48, 48, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pts = [
    [1, 1],
    [46, 1],
    [1, 46],
    [46, 46],
  ];
  let white = 0;
  let black = 0;
  for (const [x, y] of pts) {
    const i = (y * info.width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum > 240) white++;
    else if (lum < 24) black++;
  }
  if (white >= 3) return "white";
  if (black >= 3) return "black";
  return "none";
}

async function knockout(input) {
  const paper = await cornerKind(input);
  const img = sharp(input, { failOn: "none" }).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  if (paper === "none") {
    return sharp(input, { failOn: "none" }).png();
  }
  for (let i = 0; i < data.length; i += 4) {
    if (isPaper(data[i], data[i + 1], data[i + 2], data[i + 3], paper)) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png({ compressionLevel: 9 });
}

function outName(file) {
  return file.replace(/\.(jpg|jpeg)$/i, ".png");
}

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

function publicUrl(path) {
  return `${PUBLIC}${path}?${CACHE_TAG}`;
}

const upload = process.argv.includes("--upload");
await mkdir(OUT, { recursive: true });

const jobs = [];
for (const file of STAMP) {
  jobs.push({ file, kind: "stamp" });
}
for (const file of KNOCKOUT) {
  jobs.push({ file, kind: "knockout" });
}

const written = [];
for (const { file, kind } of jobs) {
  const src = join(SRC, file);
  const destFile = outName(file);
  const dest = join(OUT, destFile);
  const pipeline = kind === "stamp" ? await toStamp(src) : await knockout(src);
  const buf = await pipeline.toBuffer();
  await writeFile(dest, buf);
  const meta = await sharp(buf).metadata();
  written.push({ file, destFile, kind, bytes: buf.length, w: meta.width, h: meta.height, alpha: meta.hasAlpha });
  console.log(`${kind.padEnd(8)} ${file} → ${destFile} ${meta.width}x${meta.height} ${buf.length}b`);
}

if (!upload) {
  console.log("Dry run. Pass --upload to push to Storage and bump logo_url.");
  process.exit(0);
}

const vars = await env();
const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const row of written) {
  const buf = await readFile(join(OUT, row.destFile));
  const path = `markets/${row.destFile}`;
  const { error } = await supabase.storage.from("listing-marks").upload(path, buf, {
    upsert: true,
    contentType: "image/png",
    cacheControl: "3600",
  });
  if (error) throw error;
  const url = publicUrl(path);
  const { error: dbErr } = await supabase
    .from("markets")
    .update({ logo_url: url })
    .like("logo_url", `%/listing-marks/markets/${row.file}%`);
  if (dbErr) throw dbErr;
  console.log("uploaded", path);
}

console.log("done", written.length);
