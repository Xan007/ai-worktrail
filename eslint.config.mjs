{
  "languageOptions": {
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
      "ecmaVersion": "latest",
      "sourceType": "module",
      "ecmaFeatures": { "jsx": true },
      "project": ["./tsconfig.app.json"]
    },
    "globals": {
      "window": "readonly",
      "document": "readonly",
      "console": "readonly",
      "setTimeout": "readonly",
      "clearTimeout": "readonly",
      "setInterval": "readonly",
      "clearInterval": "readonly",
      "fetch": "readonly",
      "URL": "readonly",
      "URLSearchParams": "readonly",
      "FormData": "readonly",
      "React": "readonly"
    }
  },
  "plugins": ["@typescript-eslint", "react", "react-hooks", "import"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/typescript"
  ],
  "settings": {
    "react": { "version": "detect" },
    "import/resolver": { "typescript": { "project": "./tsconfig.app.json" } }
  },
  "rules": {
    "react/react-in-jsx-scope": "off",
    "import/order": ["error", { "alphabetize": { "order": "asc" }, "newlines-between": "always" }],
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
  }
}