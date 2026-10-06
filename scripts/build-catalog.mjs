import fs from "node:fs/promises";
import path from "node:path";

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (fallback !== null && error.code === "ENOENT") return fallback;
    throw error;
  }
}

const root = process.cwd();
const wbProducts = await readJson(path.join(root, "data/products.json"), []);
const categoryConfig = await readJson(path.join(root, "config/catalog-categories.json"));
const categoryMap = await readJson(path.join(root, "config/category-map.json"));
const pricing = await readJson(path.join(root, "config/pricing.json"));
const overridesConfig = await readJson(path.join(root, "catalog/product-overrides.json"), {
  hiddenNmIDs: [],
  mergeGroups: [],
  overrides: {}
});
const manualProductsJson = await readJson(path.join(root, "catalog/manual-products.json"), []);
const pricesConfig = await readJson(path.join(root, "catalog/prices.json"), { byProductId: {}, byNmID: {} });
const fx = await readJson(path.join(root, "data/fx.json"));
const popularity = await readJson(path.join(root, "data/popularity.json"), {
  status: "missing",
  rankByNmID: {}
});

async function readText(file, fallback = "") {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  values.push(current);
  return values;
}


function splitMulti(value) {
  return String(value || "")
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseManualProductsCsv(text) {
  const cleanText = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!cleanText) return [];

  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const index = Object.fromEntries(headers.map((h, i) => [h, i]));
  const get = (row, key) => index[key] == null ? "" : String(row[index[key]] ?? "").trim();

  return lines.slice(1).map((line, rowIndex) => {
    const row = parseCsvLine(line);
    const activeRaw = get(row, "active").toLowerCase();
    const active = !["0", "false", "no", "нет", "off"].includes(activeRaw);

    if (!active) return null;

    const title = get(row, "title");
    const article = get(row, "article");
    if (!title) return null;

    const priceRaw = get(row, "priceFromKzt").replace(/\s+/g, "").replace(",", ".");
    const moqRaw = get(row, "minOrderQuantity").replace(/\s+/g, "").replace(",", ".");

    return {
      id: get(row, "id") || `manual-${String(article || rowIndex + 1).toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-+|-+$/g, "")}`,
      title,
      brand: get(row, "brand"),
      categoryIds: splitMulti(get(row, "categoryIds")),
      article,
      description: get(row, "description"),
      colors: splitMulti(get(row, "colors")),
      sizes: splitMulti(get(row, "sizes")),
      priceFromKzt: priceRaw ? Number(priceRaw) : null,
      minOrderQuantity: moqRaw ? Number(moqRaw) : null,
      photos: splitMulti(get(row, "photos"))
    };
  }).filter(Boolean);
}

const manualProductsCsv = parseManualProductsCsv(
  await readText(path.join(root, "catalog/manual-products.csv"), "")
);
const manualProducts = [...manualProductsJson, ...manualProductsCsv];

const skuCsv = (await readText(path.join(root, "data/skus.csv"))).replace(/^\uFEFF/, "");
const skuLines = skuCsv.split(/\r?\n/).filter(Boolean);
const skuHeader = skuLines.length ? parseCsvLine(skuLines[0]) : [];
const nmIdIndex = skuHeader.indexOf("Артикул WB");
const photoIndex = skuHeader.indexOf("Фото");
const photoByNmID = new Map();

if (nmIdIndex >= 0 && photoIndex >= 0) {
  for (const line of skuLines.slice(1)) {
    const row = parseCsvLine(line);
    const nmID = row[nmIdIndex];
    const photo = row[photoIndex];

    if (nmID && photo && /^https?:\/\//i.test(photo) && !photoByNmID.has(String(nmID))) {
      photoByNmID.set(String(nmID), photo);
    }
  }
}

const categories = categoryConfig.categories || [];
const validCategoryIds = new Set(categories.map((c) => c.id));
const internalCategoryIds = new Set(categories.filter((c) => c.internal).map((c) => c.id));
const includedParents = new Set(categoryMap.includeParentNames || []);
const hiddenNmIDs = new Set((overridesConfig.hiddenNmIDs || []).map(String));
const perProductOverrides = overridesConfig.overrides || {};

function uniq(values) {
  return [...new Set(values.filter((v) => v !== null && v !== undefined && v !== ""))];
}

function flattenValues(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (typeof value === "object") {
    return Object.values(value).flatMap(flattenValues);
  }
  return [String(value)];
}

function characteristicName(ch) {
  return String(ch?.name ?? ch?.characteristicName ?? ch?.title ?? "");
}

function characteristicValue(ch) {
  return ch?.value ?? ch?.values ?? ch?.valueName ?? ch?.valueNames ?? null;
}

function extractColors(product) {
  const colors = [];
  for (const ch of product.characteristics || []) {
    if (!/(^|\s)(цвет|color)(\s|$)/i.test(characteristicName(ch)) && !/(цвет|color)/i.test(characteristicName(ch))) {
      continue;
    }

    for (const raw of flattenValues(characteristicValue(ch))) {
      for (const piece of raw.split(/[;,/]+/)) {
        const color = piece.trim();
        if (color && color.length <= 80) colors.push(color);
      }
    }
  }
  return uniq(colors);
}

function extractPhotos(product) {
  const urls = [];
  for (const photo of product.photos || []) {
    if (typeof photo === "string") {
      if (/^https?:\/\//i.test(photo)) urls.push(photo);
      continue;
    }
    if (!photo || typeof photo !== "object") continue;
    for (const value of Object.values(photo)) {
      if (typeof value === "string" && /^https?:\/\//i.test(value)) urls.push(value);
    }
  }
  if (product.firstPhoto && /^https?:\/\//i.test(product.firstPhoto)) {
    urls.unshift(product.firstPhoto);
  }
  return uniq(urls);
}

function searchableText(product) {
  const characteristicText = (product.characteristics || [])
    .flatMap((ch) => [characteristicName(ch), ...flattenValues(characteristicValue(ch))])
    .join(" ");

  return [
    product.title,
    product.description,
    product.brand,
    product.vendorCode,
    product.subjectName,
    characteristicText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function categoryIdsForWb(product) {
  const subjectKey = String(product.subjectID ?? "");
  let ids = [...(categoryMap.subjectMap?.[subjectKey] || ["sports-unclassified"])];
  const text = searchableText(product);
  const matched = [];

  for (const rule of categoryMap.keywordRules || []) {
    if (
      Array.isArray(rule.subjectIDs) &&
      rule.subjectIDs.length &&
      !rule.subjectIDs.map(Number).includes(Number(product.subjectID))
    ) {
      continue;
    }

    const words = rule.matchAny || [];
    if (words.some((word) => text.includes(String(word).toLowerCase()))) {
      matched.push(...(rule.categoryIds || []));
    }
  }

  if (matched.length) ids = uniq(matched);
  return uniq(ids);
}

function wbSizes(product) {
  return uniq(
    (product.sizes || []).flatMap((size) => [
      size.techSize ? String(size.techSize).trim() : "",
      !size.techSize && size.wbSize ? String(size.wbSize).trim() : ""
    ])
  );
}

function wbVariants(product, colors) {
  const rows = [];
  for (const size of product.sizes || []) {
    const skus = Array.isArray(size.skus) && size.skus.length ? size.skus : [null];
    for (const sku of skus) {
      rows.push({
        nmID: product.nmID ?? null,
        chrtID: size.chrtID ?? null,
        size: size.techSize || size.wbSize || null,
        wbSize: size.wbSize || null,
        sku,
        colors
      });
    }
  }
  return rows;
}

function applyOverride(base, override = {}) {
  const result = {
    ...base,
    ...Object.fromEntries(
      Object.entries(override).filter(([key]) => !["hidden", "priceTiers"].includes(key))
    )
  };

  if (override.categoryIds) result.categoryIds = uniq(override.categoryIds);
  if (override.colors) result.colors = uniq(override.colors);
  if (override.photos) result.photos = uniq(override.photos);
  return result;
}

function buildWbCard(product) {
  const colors = extractColors(product);
  const photos = extractPhotos(product);
  const fallbackPhoto = photoByNmID.get(String(product.nmID));

  if (fallbackPhoto && !photos.includes(fallbackPhoto)) {
    photos.unshift(fallbackPhoto);
  }

  const base = {
    id: `wb-${product.nmID}`,
    source: "wb",
    sourceNmIDs: [product.nmID],
    article: product.vendorCode || String(product.nmID),
    title: product.title || "Без названия",
    brand: product.brand || "",
    description: product.description || "",
    categoryIds: categoryIdsForWb(product),
    colors,
    sizes: wbSizes(product),
    photos,
    priceFromKzt: null,
    minOrderQuantity: null,
    wbMeta: {
      nmID: product.nmID,
      subjectID: product.subjectID,
      subjectName: product.subjectName,
      parentID: product.parentID ?? null,
      parentName: product.parentName || ""
    },
    variants: wbVariants(product, colors)
  };

  const override = perProductOverrides[String(product.nmID)] || {};
  return applyOverride(base, override);
}

function mergeCards(group, cards) {
  const first = cards[0];
  const merged = {
    id: group.id || `merge-${cards.map((p) => p.sourceNmIDs[0]).join("-")}`,
    source: "wb-merged",
    sourceNmIDs: uniq(cards.flatMap((p) => p.sourceNmIDs)),
    article: group.article || first.article,
    title: group.title || first.title,
    brand: group.brand ?? first.brand,
    description: group.description ?? first.description,
    categoryIds: uniq(group.categoryIds || cards.flatMap((p) => p.categoryIds)),
    colors: uniq([...(group.colors || []), ...cards.flatMap((p) => p.colors)]),
    sizes: uniq(cards.flatMap((p) => p.sizes)),
    photos: uniq([...(group.photos || []), ...cards.flatMap((p) => p.photos)]),
    priceFromKzt: group.priceFromKzt ?? cards.find((p) => p.priceFromKzt != null)?.priceFromKzt ?? null,
    minOrderQuantity: group.minOrderQuantity ?? cards.find((p) => p.minOrderQuantity != null)?.minOrderQuantity ?? null,
    variants: cards.flatMap((p) => p.variants),
    sourceCards: cards.map((p) => ({
      nmID: p.wbMeta?.nmID,
      article: p.article,
      colors: p.colors,
      sizes: p.sizes,
      photos: p.photos,
      subjectID: p.wbMeta?.subjectID,
      subjectName: p.wbMeta?.subjectName
    }))
  };

  return applyOverride(merged, group);
}

function buildManualProduct(input) {
  return {
    id: input.id,
    source: "manual",
    sourceNmIDs: [],
    article: input.article || input.id,
    title: input.title,
    brand: input.brand || "",
    description: input.description || "",
    categoryIds: uniq(input.categoryIds || ["sports-unclassified"]),
    colors: uniq(input.colors || []),
    sizes: uniq(input.sizes || []),
    photos: uniq(input.photos || []),
    priceFromKzt: input.priceFromKzt ?? null,
    minOrderQuantity: input.minOrderQuantity ?? null,
    variants: Array.isArray(input.variants) ? input.variants : [],
    privatePriceTiers: Array.isArray(input.priceTiers) ? input.priceTiers : []
  };
}

function roundTo(value, config = {}) {
  const increment = Number(config.increment || 1);
  if (!Number.isFinite(value)) return null;
  if (!Number.isFinite(increment) || increment <= 0) return value;

  const scaled = value / increment;
  const mode = config.mode || "nearest";
  const rounded =
    mode === "up" ? Math.ceil(scaled) :
    mode === "down" ? Math.floor(scaled) :
    Math.round(scaled);

  return rounded * increment;
}

function convertedPrices(priceFromKzt) {
  if (priceFromKzt == null || !Number.isFinite(Number(priceFromKzt))) return null;

  const result = {};
  for (const currency of pricing.publicCurrencies || ["KZT"]) {
    const kztPerUnit = Number(fx.kztPerUnit?.[currency]);
    if (!Number.isFinite(kztPerUnit) || kztPerUnit <= 0) continue;

    const raw = Number(priceFromKzt) / kztPerUnit;
    result[currency] = roundTo(raw, pricing.rounding?.[currency]);
  }
  return result;
}

function validateCategories(product) {
  const valid = product.categoryIds.filter((id) => validCategoryIds.has(id));
  return valid.length ? valid : ["sports-unclassified"];
}

function normalizePriceEntry(entry) {
  if (entry == null || entry === "") return null;

  if (typeof entry === "number" || typeof entry === "string") {
    const priceFromKzt = Number(entry);
    return Number.isFinite(priceFromKzt) && priceFromKzt > 0
      ? { priceFromKzt }
      : null;
  }

  if (typeof entry === "object") {
    const priceFromKzt = Number(entry.priceFromKzt);
    if (!Number.isFinite(priceFromKzt) || priceFromKzt <= 0) return null;

    const result = { priceFromKzt };
    const minOrderQuantity = Number(entry.minOrderQuantity);

    if (Number.isFinite(minOrderQuantity) && minOrderQuantity > 0) {
      result.minOrderQuantity = minOrderQuantity;
    }

    return result;
  }

  return null;
}

function catalogPriceFor(product) {
  const byProductId = pricesConfig.byProductId || {};
  const byNmID = pricesConfig.byNmID || {};

  const direct = normalizePriceEntry(byProductId[product.id]);
  if (direct) return direct;

  for (const nmID of product.sourceNmIDs || []) {
    const byWbId = normalizePriceEntry(byNmID[String(nmID)]);
    if (byWbId) return byWbId;
  }

  return null;
}

function popularityRankFor(product) {
  const rankByNmID = popularity.rankByNmID || {};
  const ranks = (product.sourceNmIDs || [])
    .map((nmID) => Number(rankByNmID[String(nmID)]))
    .filter((rank) => Number.isFinite(rank) && rank > 0);

  return ranks.length ? Math.min(...ranks) : null;
}

const includedWb = wbProducts.filter((product) => includedParents.has(product.parentName));
const wbCards = includedWb
  .filter((product) => !hiddenNmIDs.has(String(product.nmID)))
  .filter((product) => !(perProductOverrides[String(product.nmID)]?.hidden))
  .map(buildWbCard);

const wbByNmID = new Map(
  wbCards.flatMap((product) => product.sourceNmIDs.map((nmID) => [String(nmID), product]))
);

const consumedNmIDs = new Set();
const builtProducts = [];

for (const group of overridesConfig.mergeGroups || []) {
  const members = uniq((group.nmIDs || []).map(String))
    .map((id) => wbByNmID.get(id))
    .filter(Boolean);

  if (!members.length) continue;

  for (const member of members) {
    for (const nmID of member.sourceNmIDs) consumedNmIDs.add(String(nmID));
  }

  builtProducts.push(mergeCards(group, members));
}

for (const product of wbCards) {
  if (product.sourceNmIDs.some((nmID) => consumedNmIDs.has(String(nmID)))) continue;
  builtProducts.push(product);
}

for (const manual of manualProducts) {
  if (!manual?.id || !manual?.title) continue;
  builtProducts.push(buildManualProduct(manual));
}

for (const product of builtProducts) {
  product.categoryIds = validateCategories(product);

  const catalogPrice = catalogPriceFor(product);
  if (catalogPrice) {
    product.priceFromKzt = catalogPrice.priceFromKzt;
    if (catalogPrice.minOrderQuantity != null) {
      product.minOrderQuantity = catalogPrice.minOrderQuantity;
    }
  }

  product.priceFrom = convertedPrices(
    product.priceFromKzt == null ? null : Number(product.priceFromKzt)
  );
  product.popularityRank = popularityRankFor(product);
}

function normalizeFingerprint(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\b(для|и|в|на|с|the|of)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const fingerprints = new Map();
for (const product of builtProducts.filter((p) => p.source === "wb")) {
  const key = `${normalizeFingerprint(product.brand)}|${normalizeFingerprint(product.title)}`;
  if (!key || key === "|") continue;
  if (!fingerprints.has(key)) fingerprints.set(key, []);
  fingerprints.get(key).push(product);
}

const similarProductCandidates = [...fingerprints.entries()]
  .filter(([, products]) => products.length > 1)
  .map(([fingerprint, products]) => ({
    fingerprint,
    products: products.map((p) => ({
      id: p.id,
      nmID: p.sourceNmIDs[0],
      title: p.title,
      brand: p.brand,
      colors: p.colors,
      article: p.article
    }))
  }))
  .sort((a, b) => b.products.length - a.products.length);

const needsCategoryReview = builtProducts
  .filter((product) => product.categoryIds.some((id) => internalCategoryIds.has(id)))
  .map((product) => ({
    id: product.id,
    sourceNmIDs: product.sourceNmIDs,
    title: product.title,
    brand: product.brand,
    categoryIds: product.categoryIds
  }));

const internalCatalog = builtProducts
  .map((product) => ({
    ...product,
    privatePriceTiers:
      product.privatePriceTiers ||
      (product.sourceNmIDs.length === 1
        ? perProductOverrides[String(product.sourceNmIDs[0])]?.priceTiers || []
        : [])
  }))
  .sort((a, b) =>
    (a.popularityRank ?? Number.MAX_SAFE_INTEGER) - (b.popularityRank ?? Number.MAX_SAFE_INTEGER) ||
    a.title.localeCompare(b.title, "ru")
  );

const publicCatalog = internalCatalog.map((product) => ({
  id: product.id,
  article: product.article,
  title: product.title,
  brand: product.brand,
  description: product.description,
  categoryIds: product.categoryIds,
  colors: product.colors,
  sizes: product.sizes,
  photos: product.photos,
  priceFromKzt: product.priceFromKzt,
  priceFrom: product.priceFrom,
  minOrderQuantity: product.minOrderQuantity,
  popularityRank: product.popularityRank
}));

const publicCategories = categories
  .filter((category) => category.active && !category.internal)
  .sort((a, b) => (a.sort || 0) - (b.sort || 0));

const summary = {
  generatedAt: new Date().toISOString(),
  wbCardsIncluded: includedWb.length,
  wbCardsHidden: includedWb.length - wbCards.length,
  manualProducts: manualProducts.length,
  mergeGroupsApplied: (overridesConfig.mergeGroups || []).filter((g) => (g.nmIDs || []).length).length,
  catalogProducts: builtProducts.length,
  productsWithColors: builtProducts.filter((p) => p.colors.length > 0).length,
  productsWithPrice: builtProducts.filter((p) => p.priceFromKzt != null).length,
  productsWithoutPrice: builtProducts.filter((p) => p.priceFromKzt == null).length,
  categoryReviewCount: needsCategoryReview.length,
  similarProductGroups: similarProductCandidates.length,
  fxEffectiveDate: fx.effectiveDate || null,
  popularityStatus: popularity.status || "missing",
  popularityPeriod: popularity.period || null
};

const review = {
  generatedAt: summary.generatedAt,
  summary,
  needsCategoryReview,
  similarProductCandidates
};

await fs.mkdir(path.join(root, "public/data"), { recursive: true });
await fs.mkdir(path.join(root, "data"), { recursive: true });

await Promise.all([
  fs.writeFile(
    path.join(root, "public/data/catalog.json"),
    JSON.stringify({ summary, products: publicCatalog }, null, 2) + "\n"
  ),
  fs.writeFile(
    path.join(root, "public/data/categories.json"),
    JSON.stringify(publicCategories, null, 2) + "\n"
  ),
  fs.writeFile(
    path.join(root, "public/data/fx.json"),
    JSON.stringify(fx, null, 2) + "\n"
  ),
  fs.writeFile(
    path.join(root, "data/catalog-internal.json"),
    JSON.stringify({ summary, products: internalCatalog }, null, 2) + "\n"
  ),
  fs.writeFile(
    path.join(root, "data/catalog-review.json"),
    JSON.stringify(review, null, 2) + "\n"
  )
]);

console.log("Wholesale catalog build completed:");
console.log(JSON.stringify(summary, null, 2));
