const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const env = process.env.NODE_ENV = process.argv.includes('-p') ? 'production' : 'development';
const isDev = env === 'development';
const isProd = env === 'production';

const Entries = {
  vendor: {
    name: 'vendor',
    path: './src/js/vendor'
  },
  background: {
    name: 'background',
    path: './src/js/background'
  },
  popup: {
    name: 'popup',
    path: './src/js/popup'
  },
  options: {
    name: 'options',
    path: './src/js/options'
  },
  contentWatch: {
    name: 'content-scripts/watch',
    path: './src/js/content-scripts/watch'
  },
  contentQueueManager: {
    name: 'content-scripts/queue-manager',
    path: './src/js/content-scripts/queue-manager'
  }
};

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
    decodeEntities: true
  }
};

const HtmlWebpackPluginEntries = [
  {
    filename: 'html/options.html',
    template: 'src/html/options.html',
    chunks: [
      Entries.vendor.name,
      Entries.options.name
    ]
  },
  {
    filename: 'html/popup.html',
    template: 'src/html/popup.html',
    chunks: [
      Entries.vendor.name,
      Entries.popup.name
    ]
  }
];

module.exports = {
  entry: Object.values(Entries).reduce((previous, current) => {
    previous[current.name] = current.path;
    return previous;
  }, {}),

  output: {
    publicPath: '/',
    filename: 'js/[name].js',
    path: path.resolve(__dirname, 'dist')
  },

  devtool: isDev ? 'eval-source-map' : false,

  performance: false,

  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: Entries.vendor.name,
      minChunks: Infinity
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env)
    }),
    new ExtractTextPlugin('css/[name].css'),
    new webpack.LoaderOptionsPlugin({
      minimize: isProd,
      debug: isDev,
      options: {
        postcss: webpack => ([
          require('precss'),
          require('cssnano')({
           discardComments: {
             removeAll: true
            }
          })
        ])
      }
    }),
    ...HtmlWebpackPluginEntries.map(entry =>
      new HtmlWebpackPlugin(Object.assign({}, HtmlWebpackPluginConfig, entry))
    ),
    ...isProd ? [
      new webpack.optimize.AggressiveMergingPlugin()
    ] : []
  ],

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: [
            'react',
            ['env', {
              modules: false,
              targets: {
                browsers: 'last 2 Chrome versions'
              }
            }]
          ],
          plugins: [
            'transform-runtime',
            'transform-class-properties'
          ]
        }
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract({
          fallbackLoader: 'style-loader',
          loader: [
            {
              loader: 'css-loader',
              options: {
                modules: true
              }
            },
            {
              loader: 'postcss-loader'
            }
          ]
        })
      }
    ]
  }
}
