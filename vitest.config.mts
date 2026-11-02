import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Temporary deployment copies must not run stale duplicates of source tests.
    exclude: [...configDefaults.exclude, "**/.vercel/**", "**/.next/**", "recette-preview/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
