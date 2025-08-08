import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  // Enable type-aware linting across the monorepo
  {
    languageOptions: {
      parserOptions: {
        // Let TypeScript ESLint discover tsconfig.json files automatically
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "no-dupe-class-members": "off",
      "@typescript-eslint/no-dupe-class-members": "error",
      // Make sure unused variables are surfaced as errors (allow leading underscore ignores)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Offload to the TS-aware rule
      "no-unused-vars": "off",
      // Flag usage of deprecated types/members
      "@typescript-eslint/no-deprecated": "error",
    },
  },
  {
    ignores: ["dist/**"],
  },
];
