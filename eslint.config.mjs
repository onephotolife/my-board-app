import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // JSX構造の検証ルール
      "react/jsx-closing-bracket-location": ["error", "line-aligned"],
      "react/jsx-closing-tag-location": "error",
      "react/jsx-tag-spacing": ["error", {
        "closingSlash": "never",
        "beforeSelfClosing": "always",
        "afterOpening": "never",
        "beforeClosing": "never"
      }],
      "react/self-closing-comp": ["error", {
        "component": true,
        "html": true
      }],
      "react/jsx-wrap-multilines": ["error", {
        "declaration": "parens-new-line",
        "assignment": "parens-new-line",
        "return": "parens-new-line",
        "arrow": "parens-new-line",
        "condition": "parens-new-line",
        "logical": "parens-new-line",
        "prop": "parens-new-line"
      }],
      // 一般的なコード品質ルール
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      // インポート順序
      "import/order": ["error", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always"
      }]
    }
  }
];

export default eslintConfig;
