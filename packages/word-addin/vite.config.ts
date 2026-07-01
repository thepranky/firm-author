import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

function copyAddinPublicAssets(destRoot: string) {
  const src = path.join(dir, "public");
  if (!existsSync(src)) return;
  for (const name of ["manifest.xml", "icon-16.png", "icon-32.png", "icon-64.png"]) {
    const from = path.join(src, name);
    if (existsSync(from)) {
      cpSync(from, path.join(destRoot, name));
    }
  }
}

export default defineConfig({
  base: "/addin/",
  plugins: [
    react(),
    {
      name: "copy-addin-assets",
      closeBundle() {
        const out = path.join(dir, "../web/public/addin");
        copyAddinPublicAssets(out);
      },
    },
  ],
  resolve: {
    alias: {
      "@firm-author/core": path.resolve(dir, "../core/src/index.ts"),
      "@firm-author/ui": path.resolve(dir, "../ui/src/index.ts"),
    },
  },
  build: {
    outDir: "../web/public/addin",
    emptyOutDir: true,
  },
});
