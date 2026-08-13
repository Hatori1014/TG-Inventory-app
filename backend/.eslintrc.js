const path = require('path');

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'boundaries'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  settings: {
    // ADR-18 — module boundaries: elements are relative to src/
    'boundaries/root-path': path.join(__dirname, 'src'),
    // needed so boundaries can resolve extensionless TS imports to a real file
    'import/resolver': { node: { extensions: ['.js', '.ts'] } },
    'boundaries/elements': [
      { type: 'domain', pattern: 'modules/*/domain/**', capture: ['module'] },
      { type: 'application', pattern: 'modules/*/application/**', capture: ['module'] },
      { type: 'infrastructure', pattern: 'modules/*/infrastructure/**', capture: ['module'] },
      { type: 'dto', pattern: 'modules/*/dto/**', capture: ['module'] },
    ],
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    // ADR-18 — a module may only import its own domain/infrastructure;
    // cross-module calls must go through the other module's exported providers
    'boundaries/dependencies': [
      'error',
      {
        default: 'allow',
        policies: [
          {
            from: { element: { type: '*' } },
            disallow: {
              to: {
                element: {
                  types: { anyOf: ['domain', 'infrastructure'] },
                  captured: { module: '!{{from.element.captured.module}}' },
                },
              },
            },
            message:
              "ADR-18: a module cannot import domain/ or infrastructure/ from another module — call the owning module's exported service instead.",
          },
        ],
      },
    ],
  },
};
