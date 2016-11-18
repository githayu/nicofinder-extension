import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

process.env.NODE_ENV = process.argv.includes('-p') ? 'production' : 'development';

const isDev = process.env.NODE_ENV !== 'production';
const isProd = process.env.NODE_ENV === 'production';

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
    name: 'content_scripts/nicofinder',
    path: './src/js/content_scripts/nicofinder'
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
    new webpack.optimize.CommonsChunkPlugin({
      name: Entries.vendor.name,
      minChunks: Infinity
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    new ExtractTextPlugin('css/[name].css'),
    new webpack.LoaderOptionsPlugin({
      minimize: isProd,
      debug: isDev,
      options: {
        postcss: webpack => ([
          require('precss')({
            addDependencyTo: webpack
          }),
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
