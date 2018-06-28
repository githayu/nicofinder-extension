module.exports = {
  presets: [
    ['@babel/preset-react'],
    [
      '@babel/preset-stage-1',
      {
        decoratorsLegacy: true,
      },
    ],
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['last 2 Chrome versions'],
        },
      },
    ],
  ],
}
