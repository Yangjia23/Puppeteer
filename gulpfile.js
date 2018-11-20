'use strict';

// common
const gulp = require('gulp');    //载入gulp
const del = require('del');   //删除文件
const plumber = require('gulp-plumber');  //防止编译出错即停止
const runSequence = require('run-sequence');      //同步执行watch
//css
const cleanCss = require('gulp-clean-css');  //压缩css
//js
const uglify = require('gulp-uglify-es').default;  //压缩js文件
// html
const htmlmin = require('gulp-htmlmin');  // 压缩html
// json
const jsonMinify = require('gulp-json-minify')

let src = 'src/'
let dst = 'dist/'

let htmlSourceGroup = [src + '*.html', src + '**/*.html']
let imageSrcGroup = [src + 'images/*.*']
let jsSoucerGroup = [src + 'static/*.js']
let cssSoucerGroup = [src + 'static/*.css']

// 发布环境配置(build)
gulp.task('build-cleanFiles', function () {
  return del(dst)
})

gulp.task('build-img', function () {    //build 处理压缩图片
  gulp.src(imageSrcGroup)
      .pipe(gulp.dest(dst + 'images/'))
});

gulp.task('build-json', function () {    //build 处理压缩图片
  gulp.src(src + '*.json')
    .pipe(jsonMinify())
    .pipe(gulp.dest(dst))
});

gulp.task('build-css', function () {
  return gulp.src(cssSoucerGroup)
    .pipe(cleanCss())
    .pipe(gulp.dest(dst + 'static/'))
})

gulp.task('build-js', function () {  //压缩js（首先删除js文件）
  return gulp.src(jsSoucerGroup)
      .pipe(uglify({compress: {drop_console: true}}))   //通过UglifyJS来压缩JS文件
      // .on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()); })
      .pipe(gulp.dest(dst + 'static/'))
});


gulp.task('build-html', function () {   //build 替换html 内引用路径
  const options = {
    removeComments: true,//清除HTML注释
    collapseWhitespace: true,//压缩HTML
    removeEmptyAttributes: true, //删除所有空格作属性值 <input id="" /> ==> <input />
    minifyJS: true,//压缩页面JS
    minifyCSS: true//压缩页面CSS
  }
  return gulp.src(htmlSourceGroup)
    .pipe(htmlmin(options))
    .pipe(gulp.dest(dst))
})

//copy-lib
gulp.task('copy-lib',function () {
  return gulp.src(src + 'lib/**/*').pipe(gulp.dest(dst+'lib'))
});

gulp.task("publish-build", function () {
  runSequence(
      "build-cleanFiles",
      ["build-img", "build-json","build-css", "build-js", "build-html", 'copy-lib']
  );
});