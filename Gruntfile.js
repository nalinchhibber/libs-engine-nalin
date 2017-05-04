'use strict';

var engine_src = "src/js";
var img_src = "src/assets";
var bower_components = "../../bower_components/"
var dist = "dist/";

module.exports = function(grunt) {

    // Grunt configuration.
    grunt.initConfig({
        // Clean dist and bower folders
        clean: {            
            dist: {
                options: {
                    force: true
                },
                src: [
                    dist
                ]
            },
            bower: {
               src: "bower_components"
            },
        },

        //Install bower components
        bower: {
            install: {
              options: { 
                verbose: true,
                copy:false
              }             
            }
        },

        // RequireJS optimizer
        // Create two files - nalin.js and nalin-editor.js
        requirejs: {
            engine: {
                options: {
                    baseUrl: engine_src,
                    name: "nalin",
                    out: dist + "nalin.js",
                    paths: {
                        'text': bower_components + 'text/text',
                        'css': bower_components + 'require-css/css',
                        'css-builder': bower_components + 'require-css/css-builder',
                        'normalize': bower_components + 'require-css/normalize',
                        'rivets': bower_components+ 'rivets/dist/rivets',
                        'sightglass': bower_components + 'sightglass/index'
                    },
                    optimize: 'none',
                    uglify2: {
                        mangle: false
                    },
                    exclude: ['normalize'],
                    done: function (done, output) {
                        console.log('Completed requirejs optimization for nalin renderer successfully.');
                        done();
                    }
                }
            },
            engineEditor: {
                options: {
                    baseUrl: engine_src,
                    name: "nalin-editor",
                    out: dist + "nalin-editor.js",
                    paths: {
                        'jquery':'empty:',
                        'text': bower_components + 'text/text',
                        'css': bower_components + 'require-css/css',
                        'css-builder': bower_components + 'require-css/css-builder',
                        'normalize': bower_components + 'require-css/normalize',
                        'rivets': bower_components+ 'rivets/dist/rivets',
                        'sightglass': bower_components + 'sightglass/index',
                        'jquery-ui' :  bower_components + 'jquery-ui/jquery-ui'
                    },
                    optimize: 'uglify2',
                    uglify2: {
                        mangle: false
                    },
                    exclude: ['normalize'],
                    done: function (done, output) {
                        console.log('Completed requirejs optimization for nalin editor successfully.');
                        done();
                    }
                }
            }
        },
        connect: {
            dev: {
                options: {
                    port: 9001,
                    hostname: '0.0.0.0',
                    keepalive: true,
                    base: '..'
                }
            }
        },
        copy: {
          images: {
            files: [
              { 
                expand: true,
                cwd: img_src, 
                src: ['**/*.{png,jpg,svg}'], 
                dest: dist + '/assets' 
              }
            ]
          }
        }
    });
    
    //Load grunt Tasks
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');    
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.loadNpmTasks('grunt-contrib-copy');
    
    // Build distribution folder
    grunt.registerTask('build', [ 
        'clean:dist',
        'clean:bower',
        'bower:install',
        'requirejs',
        'copy'
    ]);  

    // Run a local server at port 9001 (http://localhost:9001/) to serve engine files.
    // This is used during development to register engines from local server in Assesments Showcase.
    grunt.registerTask('connectServer', [ 
        'connect'
    ]);

    grunt.registerTask('default', [ 
        'build'        
    ]);  

};
