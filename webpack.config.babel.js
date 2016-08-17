import webpack from 'webpack';

const DEBUG = !process.argv.includes('--release');
const VERBOSE = process.argv.includes('--verbose');

export default {
  cache: DEBUG,
  debug: DEBUG,
  stats: {
    color: true,
    reasons: DEBUG,
    hash: VERBOSE,
    version: VERBOSE,
    timings: true,
    chunks: VERBOSE,
    chunkModules: VERBOSE,
    cached: VERBOSE,
    cacheAssets:VERBOSE
  },
  entry: {
    vendor: ['./src/js/initialize.js'],
    background: './src/js/background.js',
    popup: './src/js/popup.js',
    options: './src/js/options.js',
    'content_scripts/nicofinder-v2': './src/js/content_scripts/nicofinder-v2.js',
    'content_scripts/nicofinder-v3': './src/js/content_scripts/nicofinder-v3.js',
    'content_scripts/extension-provider': './src/js/content_scripts/extension-provider.js'
  },
  output: {
    publicPath: '/js/',
    filename: '[name].js',
    ...process.title === 'gulp' ? {} : { path: './dist/js' }
  },
  target: 'web',
  devtool: DEBUG ? 'cheap-module-eval-source-map' : false,
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': `"${process.env.NODE_ENV || (DEBUG ? 'development' : 'production')}"`
    }),
    ...(DEBUG ? [] : [
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: VERBOSE
        },
        comments: false
      }),
      new webpack.optimize.AggressiveMergingPlugin()
    ])
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      }
    ]
  }
}
