import fs from "node:fs/promises";
import path from "node:path";

const catalogPath = path.resolve("public/data/catalog.json");
const imageDir = path.resolve("public/images/products");

await fs.mkdir(imageDir, { recursive: true });

const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const products = Array.isArray(catalog.products) ? catalog.products : [];

function safeName(value) {
  return String(value || "product").replace(/[^a-zA-Z0-9_-]+/g, "-");
}

function preferredSources(product) {
  const photos = Array.isArray(product.photos) ? product.photos.filter(Boolean) : [];
  const ordered = [
    ...photos.filter((url) => /\/c516x688\//.test(url)),
    ...photos.filter((url) => /\/big\//.test(url)),
    ...photos.filter((url) => /\/c246x328\//.test(url)),
    ...photos
  ];
  return [...new Set(ordered)];
}

async function fileExists(file) {
  try {
    const stat = await fs.stat(file);
    return stat.size > 500;
  } catch {
    return false;
  }
}

async function downloadImage(url, destination) {
  const headerVariants = [
    {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://www.wildberries.ru/"
    },
    {
      "User-Agent": "Lucky-Wholesale/1.0"
    }
  ];

  for (const headers of headerVariants) {
    try {
      const response = await fetch(url, { headers, redirect: "follow" });
      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength < 500) continue;

      await fs.writeFile(destination, bytes);
      return true;
    } catch {
      // try the next variant/source
    }
  }

  return false;
}

let cached = 0;
let reused = 0;
let failed = 0;

async function cacheProduct(product) {
  const fileName = `${safeName(product.id)}.webp`;
  const destination = path.join(imageDir, fileName);
  const publicUrl = `./images/products/${fileName}`;

  if (await fileExists(destination)) {
    product.photos = [publicUrl, ...(product.photos || []).filter((url) => url !== publicUrl)];
    reused += 1;
    return;
  }

  for (const source of preferredSources(product)) {
    if (await downloadImage(source, destination)) {
      product.photos = [publicUrl, ...(product.photos || []).filter((url) => url !== publicUrl)];
      cached += 1;
      return;
    }
  }

  failed += 1;
}

const concurrency = 8;
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= products.length) return;
    await cacheProduct(products[index]);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

catalog.summary = {
  ...(catalog.summary || {}),
  cachedProductImages: cached + reused,
  productImagesMissing: failed
};

await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + "\n");

console.log(JSON.stringify({
  products: products.length,
  cached,
  reused,
  failed
}, null, 2));
