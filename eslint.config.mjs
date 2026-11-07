import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "plugin:jsx-a11y/strict"),
  {
    rules: {
      // Brief §3: no arbitrary hex in components — use tokens. Enforced by review + Phase 2 lint rule.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // autoFocus is allowed only via our components, and only on the single field of a
      // single-task auth step (email, OTP). Raw DOM elements are still checked.
      "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/mockServiceWorker.js",
      "playwright-report/**",
      "test-results/**",
    ],
  },
];

export default eslintConfig;
