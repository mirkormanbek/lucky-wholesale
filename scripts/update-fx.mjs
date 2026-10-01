import fs from "node:fs/promises";
import path from "node:path";

const url = "https://nationalbank.kz/rss/rates_all.xml";
const output = path.resolve("data/fx.json");

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
}

function numberValue(value) {
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

async function readExisting() {
  try {
    return JSON.parse(await fs.readFile(output, "utf8"));
  } catch {
    return null;
  }
}

const response = await fetch(url, {
  headers: { "User-Agent": "Lucky-Wholesale/1.0" }
});

if (!response.ok) {
  const existing = await readExisting();
  if (existing) {
    console.warn(`NBK returned HTTP ${response.status}; keeping existing FX data.`);
    process.exit(0);
  }
  throw new Error(`NBK returned HTTP ${response.status}`);
}

const xml = await response.text();
const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);

function findRate(code) {
  for (const item of items) {
    const title = tag(item, "title").toUpperCase();
    if (title !== code) continue;

    const value = numberValue(tag(item, "description") || tag(item, "value"));
    const quant = numberValue(tag(item, "quant")) || 1;
    if (value != null && quant > 0) return value / quant;
  }
  return null;
}

const usd = findRate("USD");
const rub = findRate("RUB");

if (usd == null || rub == null) {
  const existing = await readExisting();
  if (existing) {
    console.warn("Could not parse USD/RUB from NBK RSS; keeping existing FX data.");
    process.exit(0);
  }
  throw new Error("Could not parse USD/RUB from NBK RSS");
}

const channelDate =
  tag(xml, "lastBuildDate") ||
  tag(xml, "pubDate") ||
  new Date().toISOString();

const data = {
  generatedAt: new Date().toISOString(),
  effectiveDate: channelDate,
  source: "National Bank of Kazakhstan",
  sourceUrl: url,
  kztPerUnit: {
    KZT: 1,
    RUB: Number(rub.toFixed(6)),
    USD: Number(usd.toFixed(6))
  }
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(data, null, 2) + "\n");

console.log("FX rates updated:");
console.log(JSON.stringify(data, null, 2));
