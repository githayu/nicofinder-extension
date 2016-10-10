import 'babel-register';
import gulp from 'gulp';
import gif from 'gulp-if';
import plumber from 'gulp-plumber';
import ignore from 'gulp-ignore';
import mergeJSON from 'gulp-merge-json';
import jsonminify from 'gulp-jsonminify';
import minimist from 'minimist';
import webpack from 'webpack-stream';
import through2 from 'through2';

import webpackConfig from './webpack.config.babel';
import manifestDevConfig from './config/manifest.dev.json';

const options = minimist(process.argv.slice(2), {
  string: 'env',
  default: {
    env: process.env.NODE_ENV || 'production'
  }
});

const isProd = options.env === 'production';
const isDev = isProd === false;

// 監視対象
const watchTasks = [
  'json',
  'other'
];

// パターン
var Pattern = {
  JSON: [
    'src/**/*.json'
  ]
};

// コピー機
Pattern.Other = (() => {
  var result = [
    'src/**/*',
    '!src/(js|css|html)/**/*'
  ];

  Object.values(Pattern).forEach(pattern => {
    var newPattern = [];

    Array.from(pattern).forEach(text => {
      if (text.includes('node_modules')) {
        newPattern.push(text.slice(1));
      } else {
        newPattern.push(text.startsWith('!') ? text : '!'+ text);
      }
    });

    result.push(...newPattern);
  });

  return result;
})();

// タスクたち
gulp.task('json', () =>
  gulp.src(Pattern.JSON, { base: 'src' })
    .pipe(gif(isDev, mergeJSON({
      fileName: 'manifest.json',
      edit: (json, file) => Object.assign({}, json, manifestDevConfig)
    })))
    .pipe(gif(isProd, jsonminify()))
    .pipe(gulp.dest('dist'))
);

gulp.task('other', () =>
  gulp.src(Pattern.Other, { base: 'src' })
    .pipe(plumber())
    .pipe(ignore.include({
      isFile: true
    }))
    .pipe(gulp.symlink('dist'))
);

gulp.task('watch', () =>
  watchTasks.forEach(task =>
    gulp.watch(Pattern[task.toUpperCase()], gulp.parallel(task))
  )
);

gulp.task('all', gulp.series(...Object.keys(Pattern).map(pattern => pattern.toLowerCase())));

gulp.task('default', gulp.series('watch'));
