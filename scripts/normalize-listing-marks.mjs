/**
 * Listing-mark standard (cream directory cards):
 * - Drawn fallbacks: one dark ink (#1c1916), thick simple strokes, transparent ground.
 * - Official logos: keep their colours; drop only the paper/padding around them.
 * - White-on-transparent wordmarks (meant for dark fields) get the same ink so they read.
 * - Never leave an opaque white or cream box behind the mark.
 *
 * Usage (from repo root):
 *   node scripts/normalize-listing-marks.mjs            # write /tmp/listing-marks/out
 *   node scripts/normalize-listing-marks.mjs --upload   # upsert into listing-marks + bump logo_url
 *   node scripts/normalize-listing-marks.mjs --restamp  # re-run drawn stamps from /tmp/listing-marks/markets
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const PROJECT = "pxsndrlptceafhsxfays";
const PUBLIC = `https://${PROJECT}.supabase.co/storage/v1/object/public/listing-marks/`;
const INK = { r: 28, g: 25, b: 22 };
const CACHE_TAG = "v=stamp2";
const SRC = "/tmp/listing-marks/markets";
const OUT = "/tmp/listing-marks/out";

const STAMP = [
  "east-york-farmers-market.png",
  "etobicoke-civic-centre-farmers-market.png",
  "evergreen-brick-works-saturday-farmers-market.png",
  "montgomerys-inn-farmers-market.png",
  "sorauren-farmers-market.png",
  "sorauren-farmers-market-henderson-brewery.png",
  "the-junction-farmers-market.png",
  "utsc-community-market.png",
  "yum-market.png",
];

const MARKET_PAPER = ["markets/dufferin-grove-organic-farmers-market.jpg"];

const VENDOR_PAPER = [
  "vendors/albion-hills.jpg",
  "vendors/albionhills-farm.jpg",
  "vendors/alchemy-pickle-company.png",
  "vendors/alma-bakery-and-foods.jpg",
  "vendors/baby-uni-kid-s-boutique.jpg",
  "vendors/bad-attitude-bread.jpg",
  "vendors/bread-and-salt-fine-food.jpg",
  "vendors/breedon-s-maple-syrup.png",
  "vendors/crepedelacrepeto.jpg",
  "vendors/everyday-gourmet.jpg",
  "vendors/fisher-s-field.png",
  "vendors/for-good-and-twenty.png",
  "vendors/fujwara-s-creamery.png",
  "vendors/gemaro-bakery.jpg",
  "vendors/gouter.jpg",
  "vendors/granny-lee-s-kitchen.png",
  "vendors/house-of-good.jpg",
  "vendors/island-oysters.png",
  "vendors/jack-s-farm.png",
  "vendors/jerry-s-berries-raspberry-farm.png",
  "vendors/joanne-s-urban-pantry.jpg",
  "vendors/kokom-scrunchies.png",
  "vendors/lofty-butter-company.png",
  "vendors/mikee-s-gourmet-mushies.jpg",
  "vendors/natural-japaneats.jpg",
  "vendors/sheldon-creek-dairy.jpeg",
  "vendors/staite-s-honey.jpg",
  "vendors/the-botanist-alchemy.jpg",
  "vendors/ukrainian-store-dnister.png",
];

const VENDOR_INK = ["vendors/henderson-brewing.png", "vendors/fresh-market-farms.png"];

const SVG_INK = [
  "markets/malvern-urban-farm-farmers-market.svg",
  "markets/yzd-farmers-market.svg",
  "vendors/malvern-urban-farm.svg",
  "vendors/la-boulangerie-by-thuet.svg",
  "vendors/left-field-brewery.svg",
  "vendors/scholars-of-forest-hill.svg",
];

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

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sat(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function dist(r, g, b, cr, cg, cb) {
  return Math.abs(r - cr) + Math.abs(g - cg) + Math.abs(b - cb);
}

async function knockoutPaper(input) {
  const { data, info } = await sharp(input, { failOn: "none" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const corners = [
    [1, 1],
    [w - 2, 1],
    [1, h - 2],
    [w - 2, h - 2],
  ].map(([x, y]) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  });
  const papers = corners.filter(([r, g, b, a]) => {
    if (a < 12) return false;
    const L = lum(r, g, b);
    const S = sat(r, g, b);
    return (L > 228 && S < 0.16) || (L < 22 && S < 0.14);
  });
  if (papers.length >= 3) {
    const samples = papers.map(([r, g, b]) => [r, g, b]);
    const seen = Buffer.alloc(w * h);
    const stack = [];
    for (const [x, y] of [
      [1, 1],
      [w - 2, 1],
      [1, h - 2],
      [w - 2, h - 2],
    ]) {
      stack.push(x, y);
    }
    const nearPaper = (r, g, b, a) => {
      if (a < 12) return true;
      return samples.some(([cr, cg, cb]) => {
        const L = lum(cr, cg, cb);
        const threshold = L > 200 ? 42 : 28;
        return dist(r, g, b, cr, cg, cb) <= threshold && sat(r, g, b) < 0.18;
      });
    };
    while (stack.length) {
      const y = stack.pop();
      const x = stack.pop();
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const p = y * w + x;
      if (seen[p]) continue;
      seen[p] = 1;
      const i = p * 4;
      if (!nearPaper(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
      data[i + 3] = 0;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
  }
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 12) continue;
    if (lum(data[i], data[i + 1], data[i + 2]) > 242 && sat(data[i], data[i + 1], data[i + 2]) < 0.1) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, {
    raw: { width: w, height: h, channels: 4 },
  }).png({ compressionLevel: 9 });
}

async function inkWhiteGlyphs(input) {
  const { data, info } = await sharp(input, { failOn: "none" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 12) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (lum(r, g, b) > 220 && sat(r, g, b) < 0.12) {
      data[i] = INK.r;
      data[i + 1] = INK.g;
      data[i + 2] = INK.b;
    }
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png({ compressionLevel: 9 });
}

function recolorSvg(svg) {
  return svg
    .replace(/fill:\s*#fff(fff)?\b/gi, "fill: #1c1916")
    .replace(/fill:\s*#ffffff\b/gi, "fill: #1c1916")
    .replace(/fill=["']#fff(fff)?["']/gi, 'fill="#1c1916"')
    .replace(/fill=["']#ffffff["']/gi, 'fill="#1c1916"')
    .replace(/fill=["']white["']/gi, 'fill="#1c1916"');
}

function destPath(path) {
  return path.replace(/\.(jpg|jpeg)$/i, ".png");
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
const restamp = process.argv.includes("--restamp");
await mkdir(OUT, { recursive: true });

const vars = await env();
const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function download(path) {
  const { data, error } = await supabase.storage.from("listing-marks").download(path);
  if (error) throw new Error(`${path}: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

const written = [];

if (restamp) {
  for (const file of STAMP) {
    const src = join(SRC, file);
    const buf = await (await toStamp(src)).toBuffer();
    const dest = join(OUT, file);
    await writeFile(dest, buf);
    const meta = await sharp(buf).metadata();
    written.push({ srcPath: `markets/${file}`, destPath: `markets/${file}`, kind: "stamp", table: "markets" });
    console.log(`stamp    ${file} ${meta.width}x${meta.height}`);
  }
}

async function writeJob(srcPath, kind, buf, contentType) {
  const dest = destPath(srcPath);
  await mkdir(join(OUT, dest.split("/")[0]), { recursive: true });
  await writeFile(join(OUT, dest), buf);
  const table = srcPath.startsWith("markets/") ? "markets" : "vendors";
  written.push({ srcPath, destPath: dest, kind, table, contentType });
  console.log(`${kind.padEnd(8)} ${srcPath} → ${dest} ${buf.length}b`);
}

for (const path of MARKET_PAPER) {
  const buf = await (await knockoutPaper(await download(path))).toBuffer();
  await writeJob(path, "paper", buf, "image/png");
}
for (const path of VENDOR_PAPER) {
  const buf = await (await knockoutPaper(await download(path))).toBuffer();
  await writeJob(path, "paper", buf, "image/png");
}
for (const path of VENDOR_INK) {
  const buf = await (await inkWhiteGlyphs(await download(path))).toBuffer();
  await writeJob(path, "ink", buf, "image/png");
}
for (const path of SVG_INK) {
  const svg = recolorSvg((await download(path)).toString("utf8"));
  await writeJob(path, "svg-ink", Buffer.from(svg), "image/svg+xml");
}

if (!upload) {
  console.log("Dry run. Pass --upload to push to Storage and bump logo_url.");
  process.exit(0);
}

for (const row of written) {
  const buf = await readFile(join(OUT, row.destPath));
  const { error } = await supabase.storage.from("listing-marks").upload(row.destPath, buf, {
    upsert: true,
    contentType: row.contentType,
    cacheControl: "3600",
  });
  if (error) throw error;
  const url = publicUrl(row.destPath);
  const file = row.srcPath.split("/").pop();
  const destFile = row.destPath.split("/").pop();
  const { error: dbErr } = await supabase
    .from(row.table)
    .update({ logo_url: url })
    .or(`logo_url.ilike.%/${file}%,logo_url.ilike.%/${destFile}%`);
  if (dbErr) throw dbErr;
  console.log("uploaded", row.destPath);
}

console.log("done", written.length);
