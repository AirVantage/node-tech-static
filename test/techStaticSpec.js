// var assert = require("chai").assert;
var sinon = require("sinon");
var logger = require("node-tech-logger");
var techStatic = require("../techStatic");
var path = require("path");

logger.setup({});

describe("node-tech-static", function() {

    var app, opts = null;

    beforeEach(function() {
        app = {
            use: sinon.spy()
        };

    });

    describe("#serveStaticAssets", function() {
        beforeEach(function() {
            opts = {
                cache: {
                    ms: 123456
                },
                resourcesUrlBase: "/resources/1.0",
                optimize: false,
                dirs: [".", "../../node-ui-commons"],
                staticMw: function(folder, options) {
                    return [folder.split(path.sep).join("/"), options];
                }
            };
        });

        it("Serves from a list of dirs", function() {

            techStatic.serveStaticAssets(app, opts);

            sinon.assert.calledTwice(app.use);
            sinon.assert.calledWith(app.use, "/resources/1.0", ["public", {
                maxAge: 123456
            }]);
            sinon.assert.calledWith(app.use, "/resources/1.0", ["../../node-ui-commons/public", {
                maxAge: 123456
            }]);

        });

        it("Serves optimized resource from a single dir", function() {

            opts.optimize = true;

            techStatic.serveStaticAssets(app, opts);

            sinon.assert.calledThrice(app.use);

            sinon.assert.calledWith(app.use, "/resources/1.0", ["dist/public", {
                maxAge: 123456
            }]);

        });

        it("Serves non optimized resources from folders suffixed with '-debug' when using 'debug=true'", function() {

            opts.optimize = true;

            techStatic.serveStaticAssets(app, opts);

            sinon.assert.calledThrice(app.use);

            sinon.assert.calledWith(app.use, "/resources-debug/1.0", ["public", {
                maxAge: 0
            }]);
            sinon.assert.calledWith(app.use, "/resources-debug/1.0", ["../../node-ui-commons/public", {
                maxAge: 0
            }]);
        });

        it("converts seconds to ms", function() {
            opts.cache.seconds = 1;
            delete opts.cache.ms;

            techStatic.serveStaticAssets(app, opts);

            sinon.assert.calledWith(app.use, "/resources/1.0", ["public", {
                maxAge: 1000
            }]);

        });

    });

    describe("#serverI18nBundles", function() {

        it("Adds default service for all bundles", function() {

            techStatic.serveI18nBundles(app, {
                bundles: ["Portal", "Error"],
                resourcesUrlBase: "/resources/1.0",
                contextUrl: "/portal"
            });

            sinon.assert.calledTwice(app.use);
            sinon.assert.calledWith(app.use, "/resources/1.0/i18n/Portal_en.properties", sinon.match.func);
            sinon.assert.calledWith(app.use, "/resources/1.0/i18n/Portal_en.properties", sinon.match.func);

        });

        it("Redirects en to default property files", function() {
            techStatic.serveI18nBundles(app, {
                bundles: ["Portal"],
                resourcesUrlBase: "/resources/1.0",
                contextUrl: "/portal"
            });

            sinon.assert.calledOnce(app.use);
            var spyCall = app.use.firstCall;
            var handler = spyCall.args[1];

            var res = {
                redirect: sinon.spy()
            };
            handler(null, res);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, "/portal/resources/1.0/i18n/Portal.properties");

        });

    });

});
