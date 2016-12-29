module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha'],
    files: [
      'test/**/*.spec.js'
    ],
    exclude: [],
    preprocessors: {
      'test/**/*.spec.js': ['webpack', 'sourcemap']
    },
    webpack: {
      devtool: 'inline-source-map',
      module: {
        exprContextCritical: false,
        rules: [
          {
            test: /\.jsx?$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            query: {
              presets: ['react', 'latest', 'power-assert'],
              plugins: ['transform-class-properties']
            }
          },
          {
            test: /\.json$/,
            loader: 'json-loader'
          }
        ]
      }
    },
    webpackMiddleware: {
      stats: 'errors-only'
    },
    reporters: ['mocha'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false,
    concurrency: Infinity
  })
}
