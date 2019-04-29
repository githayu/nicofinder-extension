const webpack = require('webpack')
const merge = require('webpack-merge')
const common = require('./webpack.common')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin')

module.exports = merge(common, {
  mode: 'development',
  watch: true,
  plugins: [
    new webpack.DefinePlugin({
      PRODUCTION: JSON.stringify(false),
    }),

    new CopyWebpackPlugin(
      [
        {
          from: 'src/manifest.json',
          to: 'manifest.json',

          transform: (content) => {
            const manifest = JSON.parse(content)

            manifest.content_security_policy =
              "script-src 'self' 'unsafe-eval'; object-src 'self'"

            return JSON.stringify(manifest)
          },
        },
      ],
      {
        copyUnmodified: true,
      }
    ),
    new HardSourceWebpackPlugin(),

    // new (require('webpack-bundle-analyzer')).BundleAnalyzerPlugin(),
  ],
})
