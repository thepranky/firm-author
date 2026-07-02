import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(
  path.join(root, "packages/word-addin/assets/icon.svg"),
  "utf8",
);
const outDir = path.join(root, "packages/word-addin/public");
const webOutDir = path.join(root, "packages/web/public/addin");

mkdirSync(outDir, { recursive: true });
mkdirSync(webOutDir, { recursive: true });

const sizes = [16, 32, 64, 80];

for (const size of sizes) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  const name = `icon-${size}.png`;
  writeFileSync(path.join(outDir, name), png);
  writeFileSync(path.join(webOutDir, name), png);
}

console.log(`Generated ribbon icons: ${sizes.map((s) => `icon-${s}.png`).join(", ")}`);
