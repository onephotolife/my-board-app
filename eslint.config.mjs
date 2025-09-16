import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import testingLibrary from "eslint-plugin-testing-library";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      'testing-library': testingLibrary
    },
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
      }],
      
      // TypeScript型定義ファイルのインポート制限（優先順位2: 予防策）
      // .d拡張子や.d.ts拡張子の明示的インポートを防止
      "import/no-unresolved": ["error", {
        "ignore": ["\\.d$", "\\.d\\.ts$"]
      }],
      
      // TypeScript拡張子の適切な取り扱い
      "import/extensions": ["error", "never", {
        "ts": "never",
        "tsx": "never",
        "d.ts": "never",  // .d.tsファイルの拡張子明記を禁止
        "json": "always",
        "css": "always",
        "scss": "always"
      }],
      
      // .d拡張子や.d.ts拡張子を含むインポートパスを禁止
      "no-restricted-imports": ["error", {
        "patterns": [
          {
            "group": ["*.d", "*.d.ts"],
            "message": "TypeScript型定義ファイルは拡張子なしでインポートしてください。例: import { Type } from '@/types/module'"
          }
        ]
      }],
      
      // TypeScript固有の型定義ルール
      "@typescript-eslint/consistent-type-imports": ["error", {
        "prefer": "type-imports",
        "fixStyle": "separate-type-imports"
      }],
      "testing-library/no-debugging-utils": "warn",
      "testing-library/no-wait-for-side-effects": "error"
    }
  }
];

export default eslintConfig;
