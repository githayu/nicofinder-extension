module.exports = {
  presets: [
    ['@babel/preset-react'],
    ['@babel/preset-stage-1'],
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
