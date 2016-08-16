import path from 'path';
import webpack from 'webpack';
import autoprefixer from 'autoprefixer';

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
    'content_scripts/nicofinder-v3': path.join(__dirname, 'src/esx/nicofinder-v3/app.js')
  },
  output: {
    publicPath: '/js/',
    path: path.join(__dirname, 'dist/js'),
    filename: '[name].js',
  },
  target: 'web',
  devtool: DEBUG ? 'cheap-module-eval-source-map' : false,
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.DefinePlugin({ 'process.env.NODE_ENV': `"${process.env.NODE_ENV || (DEBUG ? 'development' : 'production')}"` }),
    ...(DEBUG ? [] : [
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({ compress: { screw_ie8: true, warnings: VERBOSE } }),
      new webpack.optimize.AggressiveMergingPlugin()
    ])
  ],
  resolve: {
    extensions: ['', '.js', '.css', '.scss']
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      }, {
        test: /\.css$/,
        loaders: ['style', 'css', 'postcss']
      }, {
        test: /\.scss$/,
        loaders: ['style', 'css', 'postcss', 'sass']
      }
    ]
  },
  postcss: [
    autoprefixer({
      browsers: ['last 1 versions']
    })
  ]
}
