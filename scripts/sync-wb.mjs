import fs from "node:fs/promises";
import path from "node:path";

const API_URL = "https://content-api.wildberries.ru/content/v2/get/cards/list";
const LIMIT = 100;
const token = process.env.WB_API_TOKEN?.trim();

if (!token) {
  throw new Error("WB_API_TOKEN is not set");
}

const authHeader = token.toLowerCase().startsWith("bearer ")
  ? token
  : `Bearer ${token}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestJson(url, options = {}, attempt = 0) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.ok) {
    return response.json();
  }

  const body = await response.text();
  const retryable = response.status === 429 || response.status >= 500;

  if (retryable && attempt < 6) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(30_000, 1000 * 2 ** attempt);

    console.warn(
      `WB API returned ${response.status}. Retry in ${waitMs} ms (attempt ${attempt + 1}/6).`
    );
    await sleep(waitMs);
    return requestJson(url, options, attempt + 1);
  }

  throw new Error(
    `WB API request failed: ${response.status} ${response.statusText}\n${body}`
  );
}

async function getAllCards() {
  const cards = [];
  let cursor = {};
  let page = 1;

  while (true) {
    const payload = {
      settings: {
        sort: { ascending: true },
        cursor: {
          limit: LIMIT,
          ...cursor,
        },
        filter: {
          withPhoto: -1,
        },
      },
    };

    console.log(`Loading WB cards page ${page}...`);

    const data = await requestJson(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const batch = Array.isArray(data.cards) ? data.cards : [];
    cards.push(...batch);

    const nextCursor = data.cursor || {};
    const total = Number(nextCursor.total ?? batch.length);

    console.log(
      `Page ${page}: ${batch.length} cards; accumulated: ${cards.length}`
    );

    if (total < LIMIT || batch.length < LIMIT) {
      break;
    }

    if (!nextCursor.updatedAt || !nextCursor.nmID) {
      throw new Error(
        "WB API returned a full page but did not return cursor.updatedAt/nmID"
      );
    }

    const next = {
      updatedAt: nextCursor.updatedAt,
      nmID: nextCursor.nmID,
    };

    if (
      next.updatedAt === cursor.updatedAt &&
      next.nmID === cursor.nmID
    ) {
      throw new Error("WB API cursor did not advance; stopping to avoid an infinite loop");
    }

    cursor = next;
    page += 1;

    // Content API limit is much higher, but a small pause keeps the sync gentle.
    await sleep(700);
  }

  const unique = new Map();
  for (const card of cards) {
    if (card?.nmID != null) unique.set(String(card.nmID), card);
  }

  return [...unique.values()];
}

function firstPhoto(card) {
  const photo = Array.isArray(card.photos) ? card.photos[0] : null;
  if (!photo) return null;
  return (
    photo.big ||
    photo.c516x688 ||
    photo.c246x328 ||
    photo.square ||
    photo.tm ||
    null
  );
}

function csvCell(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  const lines = [
    columns.map((column) => csvCell(column.label)).join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column.key])).join(",")
    ),
  ];

  // BOM helps Excel open UTF-8 Cyrillic correctly.
  return "\uFEFF" + lines.join("\n") + "\n";
}

const cards = await getAllCards();

const products = cards
  .map((card) => ({
    nmID: card.nmID ?? null,
    imtID: card.imtID ?? null,
    nmUUID: card.nmUUID ?? null,
    subjectID: card.subjectID ?? null,
    subjectName: card.subjectName ?? "",
    vendorCode: card.vendorCode ?? "",
    brand: card.brand ?? "",
    title: card.title ?? "",
    description: card.description ?? "",
    needKiz: card.needKiz ?? null,
    dimensions: card.dimensions ?? null,
    characteristics: Array.isArray(card.characteristics) ? card.characteristics : [],
    sizes: Array.isArray(card.sizes) ? card.sizes : [],
    photos: Array.isArray(card.photos) ? card.photos : [],
    firstPhoto: firstPhoto(card),
    video: card.video ?? null,
    createdAt: card.createdAt ?? null,
    updatedAt: card.updatedAt ?? null,
  }))
  .sort((a, b) =>
    (a.subjectName || "").localeCompare(b.subjectName || "", "ru") ||
    (a.title || "").localeCompare(b.title || "", "ru") ||
    Number(a.nmID || 0) - Number(b.nmID || 0)
  );

const skuRows = [];
for (const product of products) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];

  if (sizes.length === 0) {
    skuRows.push({
      subjectID: product.subjectID,
      subjectName: product.subjectName,
      nmID: product.nmID,
      vendorCode: product.vendorCode,
      title: product.title,
      brand: product.brand,
      chrtID: "",
      techSize: "",
      wbSize: "",
      sku: "",
      photo: product.firstPhoto || "",
    });
    continue;
  }

  for (const size of sizes) {
    const skus = Array.isArray(size.skus) && size.skus.length ? size.skus : [""];

    for (const sku of skus) {
      skuRows.push({
        subjectID: product.subjectID,
        subjectName: product.subjectName,
        nmID: product.nmID,
        vendorCode: product.vendorCode,
        title: product.title,
        brand: product.brand,
        chrtID: size.chrtID ?? "",
        techSize: size.techSize ?? "",
        wbSize: size.wbSize ?? "",
        sku,
        photo: product.firstPhoto || "",
      });
    }
  }
}

const categoryMap = new Map();

for (const product of products) {
  const key = String(product.subjectID ?? product.subjectName ?? "unknown");

  if (!categoryMap.has(key)) {
    categoryMap.set(key, {
      subjectID: product.subjectID,
      subjectName: product.subjectName || "Без категории",
      productCount: 0,
      sizeVariantCount: 0,
      skuCount: 0,
      brands: new Set(),
    });
  }

  const category = categoryMap.get(key);
  category.productCount += 1;

  if (product.brand) category.brands.add(product.brand);

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  category.sizeVariantCount += sizes.length;

  for (const size of sizes) {
    category.skuCount += Array.isArray(size.skus) ? size.skus.length : 0;
  }
}

const categories = [...categoryMap.values()]
  .map((category) => ({
    subjectID: category.subjectID,
    subjectName: category.subjectName,
    productCount: category.productCount,
    sizeVariantCount: category.sizeVariantCount,
    skuCount: category.skuCount,
    brands: [...category.brands].sort((a, b) => a.localeCompare(b, "ru")),
  }))
  .sort(
    (a, b) =>
      b.productCount - a.productCount ||
      a.subjectName.localeCompare(b.subjectName, "ru")
  );

const actualSkuCount = skuRows.filter((row) => row.sku).length;

const summary = {
  generatedAt: new Date().toISOString(),
  productCardCount: products.length,
  categoryCount: categories.length,
  sizeVariantCount: products.reduce(
    (sum, product) => sum + (product.sizes?.length || 0),
    0
  ),
  skuCount: actualSkuCount,
  cardsWithoutSku: products.filter(
    (product) =>
      !product.sizes?.some(
        (size) => Array.isArray(size.skus) && size.skus.length > 0
      )
  ).length,
  cardsWithoutPhoto: products.filter((product) => !product.firstPhoto).length,
};

const outDir = path.resolve("data");
await fs.mkdir(outDir, { recursive: true });

await Promise.all([
  fs.writeFile(
    path.join(outDir, "products.json"),
    JSON.stringify(products, null, 2) + "\n"
  ),
  fs.writeFile(
    path.join(outDir, "categories.json"),
    JSON.stringify(categories, null, 2) + "\n"
  ),
  fs.writeFile(
    path.join(outDir, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n"
  ),
  fs.writeFile(
    path.join(outDir, "categories.csv"),
    toCsv(categories, [
      { key: "subjectID", label: "subjectID" },
      { key: "subjectName", label: "Категория WB" },
      { key: "productCount", label: "Карточек" },
      { key: "sizeVariantCount", label: "Размерных вариантов" },
      { key: "skuCount", label: "SKU / штрихкодов" },
      { key: "brands", label: "Бренды" },
    ].map((column) =>
      column.key === "brands"
        ? { ...column, key: "brandsText" }
        : column
    )),
  ),
  fs.writeFile(
    path.join(outDir, "skus.csv"),
    toCsv(skuRows, [
      { key: "subjectID", label: "subjectID" },
      { key: "subjectName", label: "Категория WB" },
      { key: "nmID", label: "Артикул WB" },
      { key: "vendorCode", label: "Артикул продавца" },
      { key: "title", label: "Название" },
      { key: "brand", label: "Бренд" },
      { key: "chrtID", label: "chrtID" },
      { key: "techSize", label: "Размер продавца" },
      { key: "wbSize", label: "Размер WB" },
      { key: "sku", label: "SKU / штрихкод" },
      { key: "photo", label: "Фото" },
    ])
  ),
]);

// Rewrite categories.csv with brands flattened for CSV after JSON is ready.
const categoryCsvRows = categories.map((category) => ({
  ...category,
  brandsText: category.brands.join(" | "),
}));

await fs.writeFile(
  path.join(outDir, "categories.csv"),
  toCsv(categoryCsvRows, [
    { key: "subjectID", label: "subjectID" },
    { key: "subjectName", label: "Категория WB" },
    { key: "productCount", label: "Карточек" },
    { key: "sizeVariantCount", label: "Размерных вариантов" },
    { key: "skuCount", label: "SKU / штрихкодов" },
    { key: "brandsText", label: "Бренды" },
  ])
);

console.log("WB sync completed:");
console.log(JSON.stringify(summary, null, 2));
