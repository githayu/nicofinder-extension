module.exports = {
  parser: 'babel-eslint',
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    webextensions: true,
    node: true
  },
  globals: {
    PRODUCTION: false
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: true
    },
    sourceType: 'module'
  },
  plugins: [
    'react'
  ],
  rules: {
    indent: ['error', 2, {
      SwitchCase: 1
    }],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'no-console': ['warn'],
    'no-constant-condition': 'off',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
  }
};