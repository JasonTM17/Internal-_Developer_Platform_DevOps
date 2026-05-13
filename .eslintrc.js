/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [require.resolve('./packages/config/eslint/base.js')],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', 'infra', 'docs', 'scripts', '*.js', '*.mjs'],
};
