'use strict';
 
module.exports = function(grunt) {
    grunt.initConfig({
        concurrent: {
            dev: ["nodemon", "watch"],
            options: {
                logConcurrentOutput: true
            }
        },
 
        nodemon: {
            dev: {
                script: 'server/server.js',
                options: {
                    nodeArgs: [],
                    watch: ["server"],
                    watchedExtensions: ["js"],
 
                    callback: function (nodemon) {
                        nodemon.on('log', function (event) {
                            console.log(event.colour);
                        });
                    }
                }
            }
        },
 
        watch: {
        },
 
    });
 
    grunt.loadNpmTasks("grunt-nodemon");
    grunt.loadNpmTasks("grunt-concurrent")
    grunt.loadNpmTasks("grunt-contrib-watch");
 
    grunt.registerTask("default", ["concurrent:dev"]);
};