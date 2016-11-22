import gulp from 'gulp';
import gif from 'gulp-if';
import plumber from 'gulp-plumber';
import ignore from 'gulp-ignore';
import mergeJSON from 'gulp-merge-json';
import jsonminify from 'gulp-jsonminify';
import minimist from 'minimist';
import del from 'del';
import manifestDevConfig from './config/manifest.dev.json';

const options = minimist(process.argv.slice(2), {
  string: 'env',
  default: {
    env: process.env.NODE_ENV || 'development'
  }
});

const isProd = options.env === 'production';
const isDev = options.env === 'development';

// パターン
var entries = {
  json: [
    'src/**/*.json'
  ]
};

// コピー機
entries.other = (() => {
  var result = [
    'src/**/*',
    '!src/(js|css|html)/**/*'
  ];

  Object.values(entries).forEach(pattern => {
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
  gulp.src(entries.json, { base: 'src' })
    .pipe(plumber())
    .pipe(gif(isDev, mergeJSON({
      fileName: 'manifest.json',
      edit: (json, file) => Object.assign({}, json, manifestDevConfig)
    })))
    .pipe(gif(isProd, jsonminify()))
    .pipe(gulp.dest('dist'))
);

gulp.task('other', () =>
  gulp.src(entries.other, { base: 'src' })
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

gulp.task('clean', () => del(['dist', '*.zip']));

gulp.task('build', gulp.series('clean', gulp.parallel(...Object.keys(entries))));

gulp.task('default', gulp.series('watch'));
