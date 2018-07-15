module.exports = {
  presets: [
    ['@babel/preset-flow'],
    ['@babel/preset-react'],
    [
      '@babel/preset-stage-1',
      {
        decoratorsLegacy: true,
        pipelineProposal: 'minimal',
      },
    ],
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
}
