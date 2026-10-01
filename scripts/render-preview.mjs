import { chromium } from "playwright";
import fs from "node:fs/promises";

await fs.mkdir("preview", { recursive: true });

const browser = await chromium.launch({ headless: true });

async function capture(name, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: `preview/${name}.jpg`,
    type: "jpeg",
    quality: 76,
    fullPage: false
  });
  await page.close();
}

await capture("desktop", { width: 1440, height: 1050 });
await capture("mobile", { width: 390, height: 844 });

await browser.close();
console.log("Preview screenshots written to preview/");
