module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module'
  },
  ignorePatterns: ['src/docs/**/*', 'src/**/*.spec.ts'],
  plugins: ['import', '@typescript-eslint'],
  extends: ['plugin:import/recommended', 'prettier'],
  rules: {
    'import/no-unresolved': 'off',
    'import/order': 'off',
    'no-unused-expressions': 'off'
  }
};
