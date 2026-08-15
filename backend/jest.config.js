module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  // HU-01 — test/bdd (jest-cucumber step definitions) sits outside src/, so
  // rootDir moved up from 'src' and roots was added to keep both discovered
  // by the same `npm run test` that ci-backend.yml runs (no separate BDD step).
  roots: ['<rootDir>/src', '<rootDir>/test/bdd'],
  testMatch: ['**/*.spec.ts', '**/*.steps.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  // required by class-transformer's @Type() decorator (TT-19) — without
  // it, DTOs decorated with @Type() throw "Reflect.getMetadata is not a
  // function" when a spec imports them outside of Nest's own bootstrap
  setupFiles: ['reflect-metadata'],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
};
