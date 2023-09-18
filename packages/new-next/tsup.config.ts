import { defineConfig } from "tsup";

import tsconfig from "./tsconfig.json";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  outDir: "dist",
  format: ["esm", "cjs"],
  splitting: false,
  clean: true,
  target: tsconfig.compilerOptions.target as "es2016",
  minify: false,
  // Next is included in customer's application.
  external: ["next"],
});
