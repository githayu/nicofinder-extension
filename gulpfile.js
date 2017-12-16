const gulp = require('gulp');
const gif = require('gulp-if');
const plumber = require('gulp-plumber');
const ignore = require('gulp-ignore');
const mergeJSON = require('gulp-merge-json');
const sass = require('gulp-sass');
const minimist = require('minimist');
const manifestDevConfig = require('./config/manifest.dev.json');

const options = minimist(process.argv.slice(2), {
  string: 'env',
  default: {
    env: process.env.NODE_ENV
  }
});

const isDev = options.env !== 'production';

// パターン
var entries = {
  json: [
    'src/**/*.json'
  ],
  sass: [
    'src/styles/**/*.scss'
  ],
  copy: [
    'src/img/**/*'
  ]
};

// タスクたち
gulp.task('json', () =>
  gulp.src(entries.json, { base: 'src' })
    .pipe(plumber())
    .pipe(gif(isDev, mergeJSON({
      fileName: 'manifest.json',
      edit: (json) => Object.assign({}, json, manifestDevConfig)
    })))
    .pipe(gulp.dest('dist'))
);

gulp.task('sass', () =>
  gulp.src(entries.sass, { base: 'src' })
    .pipe(plumber())
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist'))
);

gulp.task('copy', () =>
  gulp.src(entries.copy, { base: 'src' })
    .pipe(plumber())
    .pipe(ignore.include({
      isFile: true
    }))
    .pipe(gulp.symlink('dist'))
);

gulp.task('watch', () =>
  Object.keys(entries).forEach(task =>
    gulp.watch(entries[task], gulp.parallel(task))
  )
);

gulp.task('build', gulp.parallel(...Object.keys(entries)));

gulp.task('default', gulp.series('build', 'watch'));
