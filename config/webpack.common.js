const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin').default

const Entries = {
  background: {
    name: 'background',
    path: './src/background/background',
  },
  popup: {
    name: 'popup',
    path: './src/components/Popup',
  },
  options: {
    name: 'options',
    path: './src/components/Options',
  },
  contentWatch: {
    name: 'content-scripts/watch',
    path: './src/content-scripts/watch',
  },
}

const HtmlWebpackPluginEntries = [
  {
    filename: 'options.html',
    template: 'src/template.html',
    chunks: ['vendor', Entries.options.name],
  },
  {
    filename: 'popup.html',
    template: 'src/template.html',
    chunks: ['vendor', Entries.popup.name],
  },
]

/**
 * @type {HtmlWebpackPlugin.Options}
 */
const HtmlWebpackPluginConfig = {
  title: 'Nicofinder',
  minify: {
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true,
    removeComments: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    decodeEntities: true,
  },
}

/**
 * @type {webpack.Configuration}
 */
module.exports = {
  entry: Object.values(Entries).reduce((previous, current) => {
    previous[current.name] = current.path
    return previous
  }, {}),

  output: {
    publicPath: '/',
    filename: '[name].js',
    path: path.resolve(__dirname, '../dist/'),
  },

  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },

  optimization: {
    splitChunks: {
      name: 'vendor',
      chunks: 'all',
    },
  },

  plugins: [
    ...HtmlWebpackPluginEntries.map(
      (entry) =>
        new HtmlWebpackPlugin({
          ...HtmlWebpackPluginConfig,
          ...entry,
        })
    ),

    new CopyWebpackPlugin(
      [
        {
          from: 'src/img',
          to: 'img',
        },
        {
          from: 'src/styles.css',
        },
      ],
      {
        copyUnmodified: true,
      }
    ),
    new CleanWebpackPlugin(),
  ],

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
          {
            loader: 'eslint-loader',
            options: {
              fix: true,
            },
          },
        ],
      },
    ],
  },
}
