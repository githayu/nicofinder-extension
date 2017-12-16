const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const Entries = {
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
  watchScript: {
    name: 'scripts/watch',
    path: './src/js/scripts/watch'
  },
  playerScript: {
    name: 'scripts/player',
    path: './src/js/scripts/player'
  },
  queueScript: {
    name: 'scripts/queueManager',
    path: './src/js/scripts/queueManager'
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
    filename: 'views/options.html',
    template: 'src/views/options.html',
    chunks: [
      Entries.options.name
    ]
  },
  {
    filename: 'views/popup.html',
    template: 'src/views/popup.html',
    chunks: [
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
    path: path.resolve(__dirname, '../dist')
  },

  resolve: {
    extensions: [
      '.js',
      '.jsx'
    ],
    alias: {
      src: path.resolve(__dirname, '../src/'),
      js: path.resolve(__dirname, '../src/js/')
    }
  },

  plugins: [
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: Entries.vendor.name,
    //   minChunks: Infinity
    // }),

    new ExtractTextPlugin('css/[name].css'),

    ...HtmlWebpackPluginEntries.map(entry =>
      new HtmlWebpackPlugin(Object.assign({}, HtmlWebpackPluginConfig, entry))
    ),
  ],

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        // Global Styles
        test: /\.scss$/,
        include: [
          path.resolve(__dirname, '../src/styles/')
        ],
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                minimize: true
              }
            },
            'postcss-loader',
            'sass-loader'
          ]
        })
      },
      {
        // CSS Modules
        test: /\.scss$/,
        include: [
          path.resolve(__dirname, '../src/js/')
        ],
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              minimize: true,
              localIdentName: '[folder]-[md5:hash:hex:10]'
            }
          },
          'postcss-loader',
          'sass-loader'
        ]
      }
    ]
  }
};
