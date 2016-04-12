/// <binding ProjectOpened='start' />
'use strict';


/****************
 *** REQUIRES ***
 ****************/
var gulp = require('gulp'),
    fs = require('fs'),
    promise = require('es6-promise'),
    del = require('del'),
    rewrite = require('connect-modrewrite'),
    webserver = require('gulp-webserver'),
    rename = require('gulp-rename'),
    plumber = require('gulp-plumber'),
    concat = require('gulp-concat'),
    cssmin = require('gulp-cssmin'),
    uglify = require('gulp-uglify'),
    watch = require('gulp-watch'),
    sourcemaps = require('gulp-sourcemaps'),
    jade = require('gulp-jade'),
    typescript = require('gulp-typescript'),
    less = require('gulp-less'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
	ngdocs = require('gulp-ngdocs');


/****************
 *** DEFAULTS ***
 ****************/
var defaults = {};


/*****************
 *** VARIABLES ***
 *****************/
var config = JSON.parse(fs.readFileSync('./config.json'));
for (var p in defaults) {
    config[p] = config[p] || defaults[p];
}
var paths = config.paths;
var folders = config.folders;
var bundles = config.bundles;
var browserlist = config.browserlist;
var server = config.server;


/****************
 *** PATTERNS ***
 ****************/
var matches = {
    everything: '/**/*.*',
    less: '/**/*.less',
    sass: '/**/*.scss',
    css: '/**/*.css',
    js: '/**/*.js',
    typescript: '/**/*.ts',
    jade: '/**/*.jade',
};
var excludes = {
    everything: '/**/*.*',
    less: "/**/_*.less",
    sass: "/**/_*.scss",
    css: "/**/*.min.css",
    js: "/**/*.min.js"
};


/************
 *** JADE ***
 ************/
gulp.task('jade:compile', function() {
    var options = {
        locals: {},
        pretty: true,
    };
    return gulp.src([
        paths.src + matches.jade,
        '!' + paths.node + excludes.everything,
        '!' + paths.bower + excludes.everything,
    ], { base: paths.src })
        .pipe(plumber(function(error) {
            console.log('jade:compile.plumber', error);
        }))
        .pipe(jade(options))
        .pipe(gulp.dest(paths.root));
});
gulp.task('jade:watch', function() {
    var watcher = gulp.watch(paths.src + matches.jade, ['jade:compile']);
    watcher.on('change', function(e) {
        console.log('watcher.on.change type: ' + e.type + ' path: ' + e.path);
    });
    return watcher;
});
gulp.task('jade', ['jade:compile', 'jade:watch']);


/******************
 *** TYPESCRIPT ***
 ******************/
var project = typescript.createProject('tsconfig.json', {
    typescript: require('typescript')
});
gulp.task('typescript:compile', function() {
    var result = project.src()
        .pipe(plumber(function (error) {
            console.log('typescript:compile.plumber', error);
        }))
        .pipe(sourcemaps.init())
        .pipe(typescript(project));
    return result.js
        .pipe(plumber(function (error) {
            console.log('typescript:compile.plumber', error);
        }))
        .pipe(gulp.dest(paths.root)) // save .js
        .pipe(uglify({ preserveComments: 'license' }))
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest(paths.root)) // save .min.js
        .pipe(sourcemaps.write('.')); // save .map
});
gulp.task('typescript:watch', function() {
    var watcher = gulp.watch(paths.src + matches.typescript, ['typescript:compile']);
    watcher.on('change', function(e) {
        console.log('watcher.on.change type: ' + e.type + ' path: ' + e.path);
    });
    return watcher;
});
gulp.task('typescript', ['typescript:compile', 'typescript:watch']);


/************
 *** LESS ***
 ************/
gulp.task('less:compile', function() {
    console.log('less:compile COMPILING!');
    return gulp.src([
        paths.src + matches.less,
        '!' + paths.src + excludes.less,
        '!' + paths.node + excludes.everything,
        '!' + paths.bower + excludes.everything,
    ], { base: paths.src })
        .pipe(plumber(function (error) {
            console.log('less:compile.plumber', error);
        }))
        .pipe(sourcemaps.init())
        .pipe(less().on('less:compile.error', function (error) {
            console.log(error);
        }))
        // .pipe(sourcemaps.write()) // save .map
        .pipe(autoprefixer({ browsers: browserlist })) // autoprefixer
        .pipe(gulp.dest(paths.root)) // save .css
        .pipe(cssmin())
        .pipe(rename({ extname: '.min.css' }))
        .pipe(gulp.dest(paths.root)); // save .min.css
});
gulp.task('less:watch', function() {
    var watcher = gulp.watch(paths.src + matches.less, ['less:compile']);
    watcher.on('change', function(e) {
        console.log('watcher.on.change type: ' + e.type + ' path: ' + e.path);
    });
    return watcher;
});
gulp.task('less', ['less:compile', 'less:watch']);


/************
 *** SASS ***
 ************/
gulp.task('sass:compile', function() {
    console.log('sass:compile COMPILING!');
    return gulp.src([
        paths.src + matches.sass,
        '!' + paths.src + excludes.sass,
        '!' + paths.node + excludes.everything,
        '!' + paths.bower + excludes.everything,
    ], { base: paths.src })
        .pipe(plumber(function (error) {
            console.log('sass:compile.plumber', error);
        }))
        .pipe(sourcemaps.init())
        .pipe(sass().on('sass:compile.error', function (error) {
            console.log(error);
        }))
        // .pipe(sourcemaps.write()) // save .map
        .pipe(autoprefixer({ browsers: browserlist })) // autoprefixer
        .pipe(gulp.dest(paths.root)) // save .css
        .pipe(cssmin())
        .pipe(rename({ extname: '.min.css' }))
        .pipe(gulp.dest(paths.root)); // save .min.css
});
gulp.task('sass:watch', function() {
    var watcher = gulp.watch(paths.src + matches.sass, ['sass:compile']);
    watcher.on('change', function(e) {
        console.log('watcher.on.change type: ' + e.type + ' path: ' + e.path);
    });
    return watcher;
});
gulp.task('sass', ['sass:compile', 'sass:watch']);


/******************
 *** JS BUNDLES ***
 ******************/
var jsbundles = [];
bundles.js.forEach(function(bundle, i) {
    var key = 'js:bundle:' + i;
    jsbundles.push(key);
    gulp.task(key, function() {
        var pipes = gulp.src(bundle.src, { base: '.' })
        .pipe(plumber(function(error) {
            console.log(key + '.plumber', error);
        }))
        if (bundle.folder) {
            console.log(key, 'do:folder', bundle.folder, bundle.src);
            pipes = pipes.pipe(rename({
                dirname: '', // flatten directory
            })).pipe(gulp.dest(bundle.folder)); // copy files
        }
        if (bundle.dist) { // concat bundle
            console.log(key, 'do:concat', bundle.dist, bundle.src);
            pipes = pipes.pipe(rename({
                dirname: '', // flatten directory
            }))
            .pipe(concat(bundle.dist)) // concat bundle
            .pipe(gulp.dest('.')) // save .js
            .pipe(sourcemaps.init())
            .pipe(uglify()) // { preserveComments: 'license' }
            .pipe(rename({ extname: '.min.js' }))
            .pipe(sourcemaps.write('.')) // save .map
            .pipe(gulp.dest('.')); // save .min.js
        }
        return pipes;
    });
});
gulp.task('js:bundles', jsbundles, function(done) { done(); });
gulp.task('js:watch', function () {
    var sources = ['./config.json'];
    bundles.js.forEach(function (bundle, i) {
        bundle.src.forEach(function (src, i) {
            sources.push(src);
        });
    });
    var watcher = gulp.watch(sources, ['js:bundles']);
    watcher.on('change', function(e) {
        console.log(e.type + ' watcher did change path ' + e.path);
    });
    return watcher;
});


/*******************
 *** CSS BUNDLES ***
 *******************/
var cssbundles = [];
bundles.css.forEach(function(bundle, i) {
    var key = 'css:bundle:' + i;
    jsbundles.push(key);
    gulp.task(key, function() {
        var pipes = gulp.src(bundle.src, { base: '.' })
        .pipe(plumber(function(error) {
            console.log(key + '.plumber', error);
        }))
        if (bundle.folder) {
            console.log(key, 'do:folder', bundle.folder, bundle.src);
            pipes = pipes.pipe(rename({
                dirname: '', // flatten directory
            })).pipe(gulp.dest(bundle.folder)); // copy files
        }
        if (bundle.dist) {
            console.log(key, 'do:concat', bundle.dist, bundle.src);
            pipes = pipes.pipe(rename({
                dirname: '', // flatten directory
            }))
            .pipe(concat(bundle.dist)) // concat bundle
            .pipe(gulp.dest('.')) // save .css
            .pipe(sourcemaps.init())
            .pipe(cssmin())
            .pipe(rename({ extname: '.min.css' }))
            .pipe(sourcemaps.write('.')) // save .map
            .pipe(gulp.dest('.')); // save .min.css
        }
        return pipes;
    });
});
gulp.task('css:bundles', cssbundles, function(done) { done(); });
gulp.task('css:watch', function() {
    var sources = ['./config.json'];
    bundles.css.forEach(function (bundle, i) {
        bundle.src.forEach(function (src, i) {
            sources.push(src);
        });
    });
    var watcher = gulp.watch(sources, ['css:bundles']);
    watcher.on('change', function(e) {
        console.log(e.type + ' watcher did change path ' + e.path);
    });
    return watcher;
});


/***************
 *** COMPILE ***
 ***************/
gulp.task('compile', ['less:compile', 'sass:compile', 'css:bundles', 'js:bundles'], function(done) { done(); });


/*************
 *** SERVE ***
 *************/
gulp.task('serve', ['compile'], function() {
    // more info on https://www.npmjs.com/package/gulp-webserver
    var options = {
        host: server.name,
        port: server.port,
        directoryListing: true,
        open: true,
        middleware: [
            rewrite([
                '!\\.html|\\.js|\\.css|\\.map|\\.svg|\\.jp(e?)g|\\.png|\\.gif$ /index.html'
            ]),
            function(request, response, next) {
                // console.log('request.url', request.url);
                if (request.url !== '/hello') return next();
                response.end('<h1>Hello, world from ' + options.host + ':' + options.port + '!</h1>');
            },
        ],
        livereload: {
            enable: true, // need this set to true to enable livereload
            filter: function(filename) {
                return !filename.match(/.map$/); // exclude all source maps from livereload
            }
        },
    };
    return gulp.src(paths.root).pipe(webserver(options));
});


/*************
 *** WATCH ***
 *************/
gulp.task('watch', ['less:watch', 'sass:watch', 'typescript:watch', 'css:watch', 'js:watch', 'jade:watch'], function(done) { done(); });


/*************
 *** START ***
 *************/
gulp.task('start', ['compile', 'serve', 'watch'], function (done) { done(); });


/*******************
 *** TRAVIS TEST ***
 *******************/
gulp.task('test', ['compile'], function (done) { done(); });


/***************
 *** NG DOCS ***
 ***************/
gulp.task('ngdocs', [], function () {
  var options = {
	scripts: [
		'https://cdnjs.cloudflare.com/ajax/libs/angular-messages/1.5.3/angular-messages.min.js',
		'./dist/js/ws-utils.min.js',
		'./dist/js/ws-utils.min.js.map'
	],
	styles: [
		'https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.5.1/animate.min.css',
		'./dist/css/ws-utils.min.css',
      './dist/css/ws-utils-docs.min.css'
	],
    html5Mode: false,
    startPage: '/api',
    image: "../img/ws-utils.png",
    imageLink: "/",
    title: "Ws Utils Docs",
    titleLink: "/docs/index.html"
  }
  return gulp.src('./src/js/**/*.js')
    .pipe(ngdocs.process(options))
    .pipe(gulp.dest('./dist/docs'));
});
