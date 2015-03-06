module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-release');
    grunt.loadNpmTasks('grunt-tag');

    grunt.initConfig({
        mochaTest: {
            test_spec: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/**/*.js']
            },
            test_json: {
                options: {
                    reporter: 'json',
                    quiet: true,
                    captureFile: "reports/json/TEST-tech-static.json"
                },
                src: ['test/**/*.js']
            }
        },
        release: {
            options: {
                npm: false,
                afterReleaseTasks: ['tag'],
                github: {
                    repo: "AirVantage/node-tech-static",
                    usernameVar: 'GITHUB_USERNAME',
                    passwordVar: 'GITHUB_PASSWORD'
                }
            }
        },
        tag: {
            options: {
                tagName: '<%= version.match(/\\d*/) %>.x'
            }
        }
    });

    grunt.registerTask('test', ['mochaTest:test_spec']);
    grunt.registerTask('test-json', ['mochaTest:test_json']);

};
