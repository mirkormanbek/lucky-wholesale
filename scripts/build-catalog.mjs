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
const manualProducts = await readJson(path.join(root, "catalog/manual-products.json"), []);
const fx = await readJson(path.join(root, "data/fx.json"));

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
    photos: extractPhotos(product),
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
  product.priceFrom = convertedPrices(
    product.priceFromKzt == null ? null : Number(product.priceFromKzt)
  );
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

const duplicateCandidates = [...fingerprints.entries()]
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
  .sort((a, b) => a.title.localeCompare(b.title, "ru"));

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
  minOrderQuantity: product.minOrderQuantity
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
  duplicateCandidateGroups: duplicateCandidates.length,
  fxEffectiveDate: fx.effectiveDate || null
};

const review = {
  generatedAt: summary.generatedAt,
  summary,
  needsCategoryReview,
  duplicateCandidates
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
