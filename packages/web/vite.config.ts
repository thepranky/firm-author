import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@firm-author/core": path.resolve(dir, "../core/src/index.ts"),
      "@firm-author/ui": path.resolve(dir, "../ui/src/index.ts"),
    },
  },
  server: {
    port: 5173,
  },
});
