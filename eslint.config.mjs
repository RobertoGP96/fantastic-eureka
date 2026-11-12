import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // `next lint` (deprecado, se elimina en Next 16) ignoraba esto por su
  // cuenta; con la CLI de ESLint hay que decirlo.
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      // Worktrees de sesiones de Claude: copias completas del repo.
      ".claude/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
