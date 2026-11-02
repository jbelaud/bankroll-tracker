import { resolve } from "node:path";

const config = {
  plugins: {
    // Scan application sources, excluding generated builds and test artifacts.
    "@tailwindcss/postcss": {
      base: resolve(process.cwd(), "src"),
    },
  },
};

export default config;
