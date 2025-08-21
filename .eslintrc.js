module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
  },
  overrides: [
    {
      files: ["apps/web/**/*"],
      env: {
        browser: true,
        es2022: true,
      },
      extends: [
        "next/core-web-vitals",
        "plugin:@typescript-eslint/recommended",
      ],
    },
  ],
};
