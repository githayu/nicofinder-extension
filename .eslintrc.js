module.exports = {
  parser: 'babel-eslint',
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    webextensions: true,
    node: true,
  },
  globals: {
    PRODUCTION: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:flowtype/recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
    'prettier/flowtype',
    'prettier/react',
    'prettier/standard',
  ],
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: true,
    },
    sourceType: 'module',
  },
  plugins: ['flowtype', 'react', 'prettier'],
  rules: {
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'never'],
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'prettier/prettier': [
      'error',
      {
        semi: false,
        singleQuote: true,
        trailingComma: 'es5',
        arrowParens: 'always',
      },
    ],
    'flowtype/no-dupe-keys': 2,
  },
}
