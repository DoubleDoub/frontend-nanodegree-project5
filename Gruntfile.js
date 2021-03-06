var stringify = require('stringify');
module.exports = function (grunt) {
    "use strict";
    grunt.initConfig({
        clean : {
            dist : ['dist','tmp']
        },
        jshint: {
            files: ['Gruntfile.js', './src/js/**/*.js'],
            options: {}
        },
        watch: {
            options: {},
            // @TODO replace watch for browserify with watchify????
            // https://www.npmjs.com/package/watchify
            // https://github.com/substack/browserify-handbook#watchify
            src : {
                files: ['./src/**/*.js', 'Gruntfile.js', 'src/**/*.html'],
                //tasks: ['clean:dist', 'jshint', 'browserify:dev', 'copy', 'stylus']
                tasks : ['dev']
            },
            // watch all css files
            css : {
                files: ['src/css/*.*'],
                tasks: ['stylus:dev', 'inlineCss']
            }
        },
        // https://github.com/jmreidy/grunt-browserify
        browserify: {
            options: {
                // https://github.com/JohnPostlethwait/stringify
                // https://github.com/jmreidy/grunt-browserify/issues/250#issuecomment-71959644
                //.allow html files to be required like require('./index.html'). 
                transform: [
                    function(file) {
                        return stringify({
                            extensions: ['.html']
                        }).call(stringify, file);
                    }
                ]
            },
            dev: {
                src: ['./src/**/*.js', '!Gruntfile.js'],
                // @TODO figure out if one file is the best way to go.
                dest: './dist/js/bundle.js'
            },
            production: {
                options : {

                },
                src: ['./src/**/*.js', '!Gruntfile.js'],
                // @TODO figure out if one file is the best way to go.
                dest: './tmp/js/bundle.js'
            }
        },
        uglify: {
            './dist/js/bundle.js' : './tmp/js/bundle.js'
        },
        inline : {
            //inline css in index.html
            index : {
                src: 'src/index.html',
                dest : 'dist/index.html'
            }
        },
        copy : {
            icons : {
                files : [{
                    // copy icons
                    expand : true,
                    cwd : 'bower_components/material-design-icons/sprites/css-sprite/',
                    src : ['sprite-navigation-black.png', 'sprite-maps-black.png', 'sprite-action-grey600.png'],
                    dest : 'dist/css'
                },{
                    //copy css
                    expand : true,
                    cwd : 'bower_components/material-design-icons/sprites/css-sprite/',
                    src : ['sprite-navigation-black.css', 'sprite-maps-black.css','sprite-action-grey600.css'],
                    dest : 'dist/css'
                }]
            },
            // copy remaining files to dist
            remaining : {
                files : [{
                    expand : true,
                    cwd : 'src',
                    src : ['**/*.png', '!index.html'],
                    dest : "dist"
                }]
            }
        },
        stylus: {
            dev: {
                options: {
                    //Specifies if the generated CSS file should contain comments
                    //indicating the corresponding stylus line.
                    linenos : true,
                    compress: false,
                    'include css' :true
                },
                files: {
                    'dist/css/style.css': ['src/css/style.styl', 'bower_components/material-design-icons/sprites/css-sprite/sprite-navigation-white.css'] // 1:1 compil
                }
            },
            production: {
                options: {
                    compress: true,
                    'include css' :true

                },
                files: {
                    'dist/css/style.css': ['src/css/style.styl', 'bower_components/material-design-icons/sprites/css-sprite/sprite-navigation-white.css'] // 1:1 compil
                }
            }
        }
    });


    grunt.registerTask('inlineCssDev', function(){
        //make sure stylus did run
        this.requires('stylus:dev');
        grunt.task.run('inline:index');
    });

    grunt.registerTask('inlineCssProd', function(){
        //make sure stylus did run
        this.requires('stylus:production');
        grunt.task.run('inline:index');
    });

    grunt.registerTask('initProject' , 'install bower dependencies before everything else', function(){
        // Set tast to async and get handle to done function.
        var done = this.async();
        // set options for spawning child process
        var options = {
            cmd : 'bower',
            args : ['install']
        };
        // make it so
        grunt.util.spawn(options, function (err, result, code) {
            if (err) {
                grunt.log.writeln(new Error(err));
                grunt.fail.fatal('Something went wrong installing bower dependencies please do this manually.');
                done();
            }
            grunt.log.writeln(result);
            grunt.task.run('dev');
            done();
            });
        });


    //https://github.com/gruntjs/grunt-contrib-clean
    grunt.loadNpmTasks('grunt-contrib-clean');
    // https://github.com/chyingp/grunt-inline
    grunt.loadNpmTasks('grunt-inline');
    //https://github.com/gruntjs/grunt-contrib-copy
    grunt.loadNpmTasks('grunt-contrib-copy');
    // https://github.com/jmreidy/grunt-browserify
    grunt.loadNpmTasks('grunt-browserify');
    // https://github.com/gruntjs/grunt-contrib-watch
    grunt.loadNpmTasks('grunt-contrib-watch');
    //https://github.com/gruntjs/grunt-contrib-jshint
    grunt.loadNpmTasks('grunt-contrib-jshint');
    // https://github.com/gruntjs/grunt-contrib-stylus
    grunt.loadNpmTasks('grunt-contrib-stylus');
    // https://github.com/gruntjs/grunt-contrib-uglify
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('dev', ['clean', 'jshint', 'browserify:dev', 'copy', 'stylus:dev','inlineCssDev']);

    grunt.registerTask('production', ['clean', 'jshint', 'browserify:production', 'uglify', 'copy', 'stylus:production','inlineCssProd']);


};