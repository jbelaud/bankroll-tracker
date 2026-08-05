import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // React Compiler diagnostics are useful, but this existing codebase has not
  // yet been migrated to their stricter render-purity model. Keep them visible
  // in CI while allowing the incremental migration to happen separately.
  {
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Historical design reference; it is not part of the Next.js application.
    "bankroll-tracker.jsx",
  ]),
]);

export default eslintConfig;
