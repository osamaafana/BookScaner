module.exports = {
  root: true,
  env: { es2022: true, node: true, browser: true },
  extends: ["eslint:recommended", "plugin:import/recommended", "prettier"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: { "import/resolver": { node: { extensions: [".js", ".ts", ".tsx"] } } },
  ignorePatterns: ["dist", "build", "node_modules", "*.d.ts"]
};
