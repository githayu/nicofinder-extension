const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const Entries = {
  vendor: {
    name: 'vendor',
    path: [
      'react',
      'react-dom',
      'lodash',
      'prop-types',
      './src/js/vendor'
    ]
  },
  background: {
    name: 'background',
    path: './src/js/background'
  },
  popup: {
    name: 'popup',
    path: './src/js/Popup/Popup'
  },
  options: {
    name: 'options',
    path: './src/js/Options/Options'
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
    template: 'src/html/template.html',
    chunks: [
      Entries.vendor.name,
      Entries.options.name
    ]
  },
  {
    filename: 'html/popup.html',
    template: 'src/html/template.html',
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
    path: path.resolve(__dirname, '../dist/')
  },

  resolve: {
    alias: {
      src: path.resolve(__dirname, '../src/')
    },

    extensions: ['.js', '.jsx', '.json']
  },

  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: Entries.vendor.name,
      minChunks: Infinity
    }),

    new ExtractTextPlugin('css/[name].css'),

    ...HtmlWebpackPluginEntries.map(entry =>
      new HtmlWebpackPlugin(Object.assign({}, HtmlWebpackPluginConfig, entry))
    )
  ],

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.module\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              minimize: true,
              modules: true,
              localIdentName: '[folder]-[md5:hash:hex:10]'
            }
          },
          'postcss-loader',
          'sass-loader'
        ]
      },
      {
        test: /^(?!.*\.module\.scss)(?=.*\.scss).*$/,
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
      }
    ]
  }
}
