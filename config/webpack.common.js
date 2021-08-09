const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: {
    background: './src/background/background',
  },
  output: {
    publicPath: '/',
    filename: '[name].js',
    path: path.resolve(__dirname, '../dist/'),
  },
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/img', to: 'img' },
        { from: 'src/manifest.json', to: 'manifest.json' },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
    ],
  },
}
