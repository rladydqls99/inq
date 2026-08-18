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
              group: ["@/components", "@/components/*", "@/lib", "@/lib/*"],
              message:
                "Use the FSD shared layer (for example, @/shared/ui or @/shared/lib).",
            },
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
  {
    files: ["apps/web/src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components", "@/components/*", "@/lib", "@/lib/*"],
              message:
                "Use the FSD shared layer (for example, @/shared/ui or @/shared/lib).",
            },
            {
              group: [
                "@/app/*",
                "@/pages/*",
                "@/widgets/*",
                "@/features/*",
                "@/entities/*",
              ],
              message: "The shared layer cannot depend on higher FSD layers.",
            },
          ],
        },
      ],
    },
  },
];
