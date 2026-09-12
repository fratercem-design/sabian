import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(rootDir, "mobile"),
  base: "./",
  publicDir: false,
  build: {
    outDir: resolve(rootDir, "dist-mobile"),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      input: {
        app: resolve(rootDir, "mobile/index.html"),
        offline: resolve(rootDir, "mobile/offline.html"),
      },
    },
  },
});
