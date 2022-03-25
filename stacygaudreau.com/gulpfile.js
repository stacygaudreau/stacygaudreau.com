const { src, dest, series, parallel } = require('gulp');
const del = require('del'),
  autoprefix = require('gulp-autoprefixer'),
  babel = require('gulp-babel'),
  cleanCSS = require('gulp-clean-css'),
  minifyHtml = require('gulp-htmlmin');
const BASE_DIR = {
  SRC: './public',
  OUT: './dist',
};

function clean(cb) {
  // wipe the build directory
  return del(`${BASE_DIR.OUT}`);
}

function css(cb) {
  // prefix and minify css
  src(`${BASE_DIR.SRC}/**/*.css`)
    .pipe(
      autoprefix({
        cascade: false,
      })
    )
    .pipe(cleanCSS())
    .pipe(dest(BASE_DIR.OUT));
  cb();
}

function js(cb) {
  // transpile js
  src(`${BASE_DIR.SRC}/**/*.js`)
    .pipe(
      babel({
        presets: ['@babel/env'],
      })
    )
    .pipe(dest(BASE_DIR.OUT));
  cb();
}

function markup(cb) {
  // minify & copy markup
  src(`${BASE_DIR.SRC}/**/*.html`)
    .pipe(
      minifyHtml({
        collapseWhitespace: true,
        conservativeCollapse: true,
        preserveLineBreaks: true,
      })
    )
    .pipe(dest(BASE_DIR.OUT));
  cb();
}

function xml(cb) {
  // copy xml
  src(`${BASE_DIR.SRC}/**/*.xml`).pipe(dest(BASE_DIR.OUT));
  cb();
}

function images(cb) {
  // for now we're just copying image assets over..
  src([
    `${BASE_DIR.SRC}/**/*.png`,
    `${BASE_DIR.SRC}/**/*.svg`,
    `${BASE_DIR.SRC}/**/*.jpg`,
    `${BASE_DIR.SRC}/**/*.jpeg`,
    `${BASE_DIR.SRC}/**/*.ico`,
  ]).pipe(dest(BASE_DIR.OUT));
  cb();
}

exports.build = series(clean, parallel(css, js, markup, images, xml));
