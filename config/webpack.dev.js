const webpack = require('webpack')
const merge = require('webpack-merge')
const common = require('./webpack.common')

module.exports = merge(common, {
  mode: 'development',
  watch: true,
  plugins: [
    new webpack.DefinePlugin({
      PRODUCTION: JSON.stringify(false),
    }),
    // new require('webpack-bundle-analyzer').BundleAnalyzerPlugin(),
  ],
})
