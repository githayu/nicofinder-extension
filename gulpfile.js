var gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    compass = require('gulp-compass'),
    plumber = require('gulp-plumber'),
    rename = require('gulp-rename'),
    watch = require('gulp-watch'),
    please = require('gulp-pleeease'),
    changed = require('gulp-changed'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    babelify = require('babelify'),
    browserify = require('browserify'),
    minifyHTML = require('gulp-minify-html'),
    through2 = require('through2');

// html
gulp.task('html', function() {
  gulp.src('./src/html/**/*.html')
    .pipe(minifyHTML())
    .pipe(gulp.dest('./dest/html/'));
});


// js
gulp.task('js', function() {
  var destPath = './dest/js/';

  gulp.src(['./src/js/**/*.js'])
    .pipe(changed(destPath))
    .pipe(plumber())
    .pipe(uglify({
      output: {
        ascii_only: true
      }
    }))
    .pipe(gulp.dest(destPath));
});

// js - es6
gulp.task('browserify', function() {
  var destPath = './dest/js/';

  gulp.src('./src/es6/*/app.js')
    .pipe(plumber())
    .pipe(through2.obj(function(file, encode, callback) {
      browserify(file.path, {
        debug: false
      }).transform(babelify, {
        presets: ['es2015', 'react']
      }).bundle(function(err, res) {
        if (err) { return callback(err); }
        file.contents = res;
        callback(null, file);
      }).on("error", function (err) {
        console.log("Error : " + err.message);
      });
    }))
    /*.pipe(uglify({
      output: {
        ascii_only: true
      }
    }))*/
    .pipe(gulp.dest(destPath));
});


// compass
gulp.task('compass', function() {
  var destPath = './dest/css/';

  gulp.src('./src/sass/**/*.scss')
    .pipe(plumber())
    .pipe(changed(destPath))
    .pipe(compass({
      config_file: './src/config.rb',
      sass: './src/sass/',
      css: './src/css/',
      comments: false
    }))
    .pipe(please({
      autoprefix: {
        browsers: ['last 1 version']
      }
    }))
    .pipe(gulp.dest(destPath));
});


// image
gulp.task('image', function() {
  var destPath = './dest/img/';

  console.log('ok');

  gulp.src('./src/img/**/*')
    .pipe(imagemin({
      use: [pngquant({
        quality: '65-80',
        spped: 1
      })]
    }))
    .pipe(gulp.dest(destPath));
});


// 監視
gulp.task('watch', function() {
  watch('./src/html/**/*.html', function() {
    gulp.start('html');
  });

  watch('./src/js/**/*.js', function() {
    gulp.start('js');
  });

  watch('./src/sass/**/*.scss', function() {
    gulp.start('compass');
  });

  watch('./src/img/**/*', function() {
    gulp.start('image');
  });
});


// 実行
gulp.task('default', ['watch']);
