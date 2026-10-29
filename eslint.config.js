import js from "@eslint/js";
import globals from "globals";

export default [{
  files: ["src/**/*.{js,jsx}"],
  languageOptions: {
    ecmaVersion: "latest", sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: globals.browser,
  },
  rules: { ...js.configs.recommended.rules, "no-unused-vars": "off" },
}];
