import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const ENV = process.argv.includes('--production') ? 'production' : 'development';
const isDev = ENV === 'development';
const isProd = ENV === 'production';

const Entries = {
  vendor: {
    name: 'vendor',
    path: './src/js/initialize'
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
  contentNicofinder: {
    name: 'content_scripts/nicofinder-v2',
    path: './src/js/content_scripts/nicofinder-v2'
  },
  contentNicofinderFuture: {
    name: 'content_scripts/nicofinder-v3',
    path: './src/js/content_scripts/nicofinder-v3'
  },
  contentProvider: {
    name: 'content_scripts/extension-provider',
    path: './src/js/content_scripts/extension-provider'
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

export default {
  entry: Object.values(Entries).reduce((previous, current) => {
    previous[current.name] = current.path;
    return previous;
  }, {}),

  output: {
    publicPath: '/',
    filename: 'js/[name].js',
    path: './dist'
  },

  devtool: isDev ? 'eval-source-map' : false,

  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: Entries.vendor.name,
      minChunks: Infinity
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(ENV)
    }),
    ...HtmlWebpackPluginEntries.map(entry =>
      new HtmlWebpackPlugin(Object.assign({}, HtmlWebpackPluginConfig, entry))
    ),
    new ExtractTextPlugin('css/[name].css'),
    ...isProd ? [
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        },
        comments: false
      }),
      new webpack.optimize.AggressiveMergingPlugin()
    ] : []
  ],

  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style', 'css!postcss')
      }
    ]
  },

  postcss: webpack => ([
    require('postcss-import')({
      addDependencyTo: webpack
    }),
    require('postcss-nested'),
    require('postcss-simple-vars'),
    require('cssnano')({
      discardComments: {
        removeAll: true
      }
    })
  ])
}
