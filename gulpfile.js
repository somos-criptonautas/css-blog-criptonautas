const {series, parallel, watch, src, dest} = require('gulp');
const pump = require('pump');
const fs = require('fs');
const order = require('ordered-read-streams');

// gulp plugins and utils
const livereload = require('gulp-livereload');
const postcss = require('gulp-postcss');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const beeper = require('beeper');
const zip = require('gulp-zip');

// postcss plugins
const easyimport = require('postcss-easy-import');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

function serve(done) {
    livereload.listen();
    done();
}

function handleError(done) {
    return function (err) {
        if (err) {
            beeper();
        }
        return done(err);
    };
};

function hbs(done) {
    pump([
        src(['*.hbs', 'partials/**/*.hbs']),
        livereload()
    ], handleError(done));
}

function css(done) {
    pump([
        src('assets/css/screen.css', {sourcemaps: true}),
        src('assets/css/home.css', {sourcemaps: true}),
        src('node_modules/glightbox/dist/css/glightbox.min.css', {sourcemaps: true}),
        postcss([
            easyimport,
            autoprefixer(),
            cssnano()
        ]),
        dest('assets/built/', {sourcemaps: '.'}),
        livereload()
    ], handleError(done));
}

function getJsFiles(version) {
    const jsFiles = [
        src(`node_modules/@tryghost/shared-theme-assets/assets/js/${version}/lib/**/*.js`),
        src(`node_modules/@tryghost/shared-theme-assets/assets/js/${version}/main.js`),
    ];

    if (fs.existsSync(`assets/js/lib`)) {
        jsFiles.push(src(`assets/js/lib/*.js`));
    }

    jsFiles.push(src(`assets/js/main.js`));

    return jsFiles;
}

function js(done) {
    pump([
        src([
            'node_modules/@tryghost/shared-theme-assets/assets/js/v1/lib/**/*.js',
            'node_modules/@tryghost/shared-theme-assets/assets/js/v1/main.js',
            'assets/js/*.js',
            'node_modules/glightbox/dist/js/glightbox.min.js',
        ], {sourcemaps: true}),
        concat('main.js'),
        uglify(),
        dest('assets/built/', {sourcemaps: '.'}),
        livereload()
    ], handleError(done));
}

function zipper(done) {
    const filename = require('./package.json').name + '.zip';

    pump([
        src([
            '**',
            '!node_modules', '!node_modules/**',
            '!dist', '!dist/**',
            '!yarn-error.log'
        ]),
        zip(filename),
        dest('dist/')
    ], handleError(done));
}

const hbsWatcher = () => watch(['*.hbs', 'partials/**/*.hbs'], hbs);
const cssWatcher = () => watch('assets/css/**/*.css', css);
const jsWatcher = () => watch('assets/js/*.js', js);
const watcher = parallel(hbsWatcher, cssWatcher, jsWatcher);
const { exec } = require('child_process');

function updateGlightbox(done) {
    exec('npm update glightbox', (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            return done(err);
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        done();
    });
}

const build = series(css, js);

exports.build = build;
exports.zip = series(updateGlightbox, build, zipper);
exports.default = series(build, serve, watcher);
