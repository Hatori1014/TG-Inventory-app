module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  // required by class-transformer's @Type() decorator (TT-19) — without
  // it, DTOs decorated with @Type() throw "Reflect.getMetadata is not a
  // function" when a spec imports them outside of Nest's own bootstrap
  setupFiles: ['reflect-metadata'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
