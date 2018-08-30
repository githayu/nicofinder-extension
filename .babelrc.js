module.exports = {
  presets: [
    ['@babel/preset-flow'],
    ['@babel/preset-react'],
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['last 2 Chrome versions'],
        },
        modules: false,
      },
    ],
  ],
  plugins: [
    ['@babel/plugin-proposal-class-properties'],
    ['@babel/plugin-proposal-export-default-from'],
    ['@babel/plugin-proposal-export-namespace-from'],
    ['@babel/plugin-proposal-json-strings'],
    ['@babel/plugin-proposal-nullish-coalescing-operator'],
    ['@babel/plugin-proposal-optional-chaining'],
    ['@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' }],
    ['@babel/plugin-syntax-dynamic-import'],
  ],
}
