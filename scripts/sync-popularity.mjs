import fs from "node:fs/promises";
import path from "node:path";

const ENDPOINT = "https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products";
const token = process.env.WB_API_TOKEN?.trim();
if (!token) throw new Error("WB_API_TOKEN is not set");

const authHeader = token.toLowerCase().startsWith("bearer ")
  ? token
  : `Bearer ${token}`;

const root = process.cwd();
const products = JSON.parse(await fs.readFile(path.join(root, "data/products.json"), "utf8"));
const nmIds = [...new Set(products.map((p) => Number(p.nmID)).filter(Number.isFinite))];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

const end = new Date();
end.setUTCHours(0, 0, 0, 0);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 29);

const payload = {
  selectedPeriod: {
    start: isoDate(start),
    end: isoDate(end)
  },
  nmIds,
  skipDeletedNm: true,
  limit: 1000,
  offset: 0
};

const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    Authorization: authHeader,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const rawText = await response.text();
let body = null;
try {
  body = rawText ? JSON.parse(rawText) : null;
} catch {
  body = rawText;
}

await fs.mkdir(path.join(root, "data"), { recursive: true });

if (response.status === 401 || response.status === 403) {
  const status = {
    generatedAt: new Date().toISOString(),
    period: payload.selectedPeriod,
    status: "analytics-access-required",
    httpStatus: response.status,
    rankByNmID: {}
  };

  await fs.writeFile(
    path.join(root, "data/popularity.json"),
    JSON.stringify(status, null, 2) + "\n"
  );

  console.warn(
    "WB Analytics access is not available for the current token. " +
    "Add the Analytics category to WB_API_TOKEN and rerun the workflow."
  );
  process.exit(0);
}

if (!response.ok) {
  throw new Error(
    `WB Analytics request failed: ${response.status} ${response.statusText}\n${rawText}`
  );
}

const rows = Array.isArray(body?.data?.products)
  ? body.data.products
  : Array.isArray(body?.products)
    ? body.products
    : Array.isArray(body?.data)
      ? body.data
      : [];

const metrics = rows.map((row) => {
  const selected = row?.statistic?.selected || row?.statistics?.selected || {};
  const product = row?.product || row || {};
  const nmID = Number(product.nmId ?? product.nmID ?? row.nmId ?? row.nmID);

  return {
    nmID,
    orderCount: Number(selected.orderCount ?? selected.ordersCount ?? row.orderCount ?? row.ordersCount ?? 0) || 0,
    buyoutCount: Number(selected.buyoutCount ?? selected.buyoutsCount ?? row.buyoutCount ?? row.buyoutsCount ?? 0) || 0,
    orderSum: Number(selected.orderSum ?? selected.ordersSum ?? row.orderSum ?? row.ordersSum ?? 0) || 0,
    buyoutSum: Number(selected.buyoutSum ?? selected.buyoutsSum ?? row.buyoutSum ?? row.buyoutsSum ?? 0) || 0
  };
}).filter((row) => Number.isFinite(row.nmID));

metrics.sort((a, b) =>
  b.orderCount - a.orderCount ||
  b.buyoutCount - a.buyoutCount ||
  b.orderSum - a.orderSum ||
  b.buyoutSum - a.buyoutSum ||
  a.nmID - b.nmID
);

const rankByNmID = {};
metrics.forEach((row, index) => {
  rankByNmID[String(row.nmID)] = index + 1;
});

const result = {
  generatedAt: new Date().toISOString(),
  period: payload.selectedPeriod,
  status: "ok",
  rankedProducts: metrics.length,
  rankingMethod: "orders_desc_then_buyouts_desc_then_order_sum_desc",
  rankByNmID
};

await fs.writeFile(
  path.join(root, "data/popularity.json"),
  JSON.stringify(result, null, 2) + "\n"
);

console.log(
  JSON.stringify({
    status: result.status,
    period: result.period,
    rankedProducts: result.rankedProducts
  }, null, 2)
);
