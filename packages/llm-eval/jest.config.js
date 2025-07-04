/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: [
    'default',
    ['./src/evaluation-reporter.ts', { outputDir: 'jest-evaluation-results' }]
  ],
  setupFilesAfterEnv: ['./src/test-utils.ts'],
};
