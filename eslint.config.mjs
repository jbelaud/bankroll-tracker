import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const compilerWarnings = {
  "react-hooks/immutability": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/refs": "warn",
  "react-hooks/set-state-in-effect": "warn",
};

const typescriptPlugin = nextTs.find((config) => config.plugins?.["@typescript-eslint"])
  ?.plugins?.["@typescript-eslint"];

if (!typescriptPlugin) {
  throw new Error("Plugin @typescript-eslint introuvable dans eslint-config-next/typescript.");
}

// En Flat Config, une règle de plugin doit être déclarée dans le même objet
// que le plugin. On enrichit donc la configuration Next qui porte
// `react-hooks`, au lieu d'ajouter un objet de règles global sans plugin.
const nextVitalsWithCompilerWarnings = nextVitals.map((config) =>
  config.plugins?.["react-hooks"]
    ? { ...config, rules: { ...config.rules, ...compilerWarnings } }
    : config,
);

const eslintConfig = defineConfig([
  ...nextVitalsWithCompilerWarnings,
  ...nextTs,
  // Les scripts opérationnels sont volontairement en CommonJS (`.cjs`).
  // Ils restent lintés, mais `require()` y est le mécanisme de module attendu.
  {
    files: ["scripts/**/*.cjs"],
    plugins: { "@typescript-eslint": typescriptPlugin },
    rules: { "@typescript-eslint/no-require-imports": "off" },
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
