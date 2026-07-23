import js from "@eslint/js";
import query from "@tanstack/eslint-plugin-query";
import hooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  hooks.configs.flat.recommended,
  ...query.configs["flat/recommended"],
  {
    files: ["apps/web/{src,tests}/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../challenges/*",
                "../decks/*",
                "../upload/*",
                "../settings/*",
                "../auth/*",
              ],
              message: "Use entities or a widget boundary between domains.",
            },
          ],
        },
      ],
    },
  },
];
