import gulp from 'gulp';
import plumber from 'gulp-plumber';
import ignore from 'gulp-ignore';
import jsonminify from 'gulp-jsonminify';
import compass from 'gulp-compass';
import pleeease from 'gulp-pleeease';
import htmlmin from 'gulp-htmlmin';
import webpack from 'webpack-stream';
import through2 from 'through2';
import webpackConfig from './webpack.config.babel';

// 監視対象
const watchTasks = [
  'javascript',
  'json',
  'html',
  'sass',
  'css',
  'copy'
];

// パターン
var PATTERN = {
  JAVASCRIPT: [
    'src/js/**/*.js'
  ],
  JSON: [
    'src/**/*.json'
  ],
  HTML: [
    'src/**/*.html'
  ],
  SASS: [
    'src/**/*.scss'
  ],
  CSS: [
    'src/**/*.css'
  ]
};

// コピー機
PATTERN.COPY = (() => {
  var result = [
    'src/**/*',
    '!src/**/esx/**/*',
    '!src/**/sass/**/*',
    '!src/**/node_modules/**/*',
    '!src/**/.DS_Store'
  ];

  Object.values(PATTERN).forEach(pattern => {
    let newPattern = [];

    Array.from(pattern).forEach(text => {
      if (text.includes('node_modules')) newPattern.push(text.slice(1));
      else newPattern.push(text.startsWith('!') ? text : '!'+ text);
    });

    result.push(...newPattern);
  });

  return result;
})();

const PLEEEASE_OPTIONS = {
  autoprefix: {
    browsers: ['last 1 version']
  }
};

// タスクたち
gulp.task('javascript', () => {
  return gulp.src(PATTERN.JAVASCRIPT)
  .pipe(plumber())
  .pipe(webpack(webpackConfig))
  .pipe(gulp.dest('dist/js'));
});

gulp.task('json', () => {
  return gulp.src(PATTERN.JSON, { base: 'src' })
  .pipe(jsonminify())
  .pipe(gulp.dest('dist'));
});

gulp.task('html', () => {
  return gulp.src(PATTERN.HTML, { base: 'src' })
  .pipe(plumber())
  .pipe(htmlmin({
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true
  }))
  .pipe(gulp.dest('dist'));
});

gulp.task('css', function() {
  return gulp.src(PATTERN.CSS, { base: 'src' })
    .pipe(plumber())
    .pipe(pleeease(PLEEEASE_OPTIONS))
    .pipe(gulp.dest('dist'));
});

gulp.task('sass', async () => {
  return gulp.src(PATTERN.SASS)
  .pipe(through2.obj(file => {
    var sassDir = file.path.match(/^([\w\.\-\/]+)\/sass\//),
        project = sassDir.length ? sassDir.pop() : false;

    return gulp.src(file.path)
    .pipe(plumber())
    .pipe(compass({ project }));
  }));
});

gulp.task('copy', () => {
  return gulp.src(PATTERN.COPY, { base: 'src' })
  .pipe(plumber())
  .pipe(ignore.include({
    isFile: true
  }))
  .pipe(gulp.dest('dist'));
});

gulp.task('watch', () => {
  for (let task of watchTasks) {
    gulp.watch(PATTERN[task.toUpperCase()], gulp.parallel(task));
  }
});

gulp.task('all', gulp.series(...Object.keys(PATTERN).map(pattern => pattern.toLowerCase())));

gulp.task('default', gulp.series('watch'));