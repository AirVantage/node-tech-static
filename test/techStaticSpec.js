// var assert = require("chai").assert;
var sinon = require("sinon");
var logger = require("node-tech-logger");
var techStatic = require("../techStatic");

logger.setup("{}");

describe("node-tech-static", function () {

    var app, opts = null;

    beforeEach(function () {
        app = {
            use : sinon.spy()
        };

    });

    describe("#serveStaticAssets", function () {
        beforeEach(function () {
            opts = {
                cacheOptions : {
                },
                resourcesUrlBase : "/resources/1.0",
                optimize : false,
                dirs : [".", "../../node-ui-commons"],
                staticMw : function (folder, options) {
                    return [folder, options];
                }
            };
        });

        it("Serves from a list of dirs", function () {

            techStatic.serveStaticAssets(app, opts);

            sinon.assert.calledTwice(app.use);
            sinon.assert.calledWith(app.use, "/resources/1.0", ["public", opts.cacheOptions]);
            sinon.assert.calledWith(app.use, "/resources/1.0", ["../../node-ui-commons/public", opts.cacheOptions]);

        });

        it("Serves optimized resource from a single dir", function () {

            opts.optimize = true;

            techStatic.serveStaticAssets(app, opts);

            sinon.assert.calledOnce(app.use);
            sinon.assert.calledWith(app.use, "/resources/1.0", ["dist/public", opts.cacheOptions]);

        });
    });

    describe("#serverI18nBundles", function () {

        it("Adds default service for all bundles", function () {

            techStatic.serveI18nBundles(app, {
                bundles : ["Portal", "Error"],
                resourcesUrlBase : "/resources/1.0",
                contextUrl : "/portal"
            });

            sinon.assert.calledTwice(app.use);
            sinon.assert.calledWith(app.use, "/resources/1.0/i18n/Portal_en.properties", sinon.match.func);
            sinon.assert.calledWith(app.use, "/resources/1.0/i18n/Portal_en.properties", sinon.match.func);

        });

        it("Redirects en to default property files", function () {
            techStatic.serveI18nBundles(app, {
                bundles : ["Portal"],
                resourcesUrlBase : "/resources/1.0",
                contextUrl : "/portal"
            });

            sinon.assert.calledOnce(app.use);
            var spyCall = app.use.firstCall;
            var handler = spyCall.args[1];

            var res = {
                redirect : sinon.spy()
            };
            handler(null, res);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, "/portal/resources/1.0/i18n/Portal.properties");

        });

    });

});
