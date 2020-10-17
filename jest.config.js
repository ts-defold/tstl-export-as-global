module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  "testMatch": [
    "**/tests/**/*.+(test)\.ts",
  ],
  "transform": {
    "^.+\\.(ts)$": "ts-jest"
  }
};
