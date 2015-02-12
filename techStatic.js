var _ = require("lodash");
var path = require("path");
var express = require("express");
var logger = require("node-tech-logger");
var assert = require("assert");

/**
 * Serve static assets with the same prefix
 *
 * @param opts.optimize
 *          {Boolean} if true, all resources are served from a single 'dist/public' folder

 * @param opts.dirs
 *            {Array} of paths to dirs that contain a 'public' folder to serve. (eg ['/path/to/av-server'])

 * @param opts.resourcesUrlBase
 *              {String} eg ("/resources/15.0.1")

 * @param opts.cacheOptions
 * @param [opts.cacheOptions.ms]
 *              {Integer} number of ms during which resources should be cached
 * @param [opts.cacheOptions.seconds]
 *              {Integer} number of seconds during which resources should be cached
 *
 * @param [opts.staticMw]
 *              {Function} mw function to server static. Defaults to express.static.
 *              This argument should only be used for testing.
 */
var serveStaticAssets = function(app, opts) {

    assert.ok(opts.dirs);
    assert.ok(opts.resourcesUrlBase);

    var dirs = opts.dirs;
    var resourcesUrlBase = opts.resourcesUrlBase;
    var optimize = opts.optimize;
    var cacheOptions = staticCacheOptions(opts.cache);
    var staticMw = opts.staticMw || express.static;

    logger.debug("Using cache Options", cacheOptions);
    logger.debug("StaticPrefix:", resourcesUrlBase);
    if (optimize) {
        var distDir = path.join(dirs[0], "dist", "public");
        logger.debug("Serving optimized resources from folder:", distDir);
        app.use(resourcesUrlBase, staticMw(distDir, cacheOptions));
    } else {
        _.each(dirs, function(dir) {
            var publicDir = path.join(dir, "public");
            logger.debug("Serving non optimized resources from folder:", publicDir);
            app.use(resourcesUrlBase, staticMw(publicDir, cacheOptions));
        });
    }
};

function staticCacheOptions(cacheConfiguration) {
    var res = {};
    if (cacheConfiguration) {
        if (cacheConfiguration.seconds) {
            res = {
                maxAge : cacheConfiguration.seconds * 1000
            };
        }
        if (cacheConfiguration.ms) {
            res = {
                maxAge : cacheConfiguration.ms
            };
        }
    }
    return res;
}

/**
 * Configure application to serve i18n bundles like ("CommonMessages_en.properties) by
 * redirecting to file "CommonMessage.properties".
 *
 * This is to please the client-side library when no locale is defined (which is the same as using "en".)
 *
 * @param app
 *
 * @param opts.bundles
 *          {Array} bundles to be served (eg ["PortalMessages"])
 *
 * @param opts.resourcesUrlBase
 *          {String} base of all urls that serves resources (eg /resources/15.01)
 *
 * @param opts.contextUrl
 *          {String} base of all *other* urls (eg "/" or "")
 */
var serveI18nBundles = function(app, opts) {

    assert.ok(opts.bundles);
    assert.ok(opts.resourcesUrlBase);
    assert.ok(opts.contextUrl);

    var bundles = opts.bundles;

    _.each(bundles, function(bundle) {
        var en_path = [opts.resourcesUrlBase, "/i18n/", bundle, "_en.properties"].join("");
        var no_locale_path = [opts.resourcesUrlBase, "/i18n/", bundle, ".properties"].join("");
        app.use(en_path, function(req, res) {
            res.redirect(opts.contextUrl + no_locale_path);
        });
    });

};

module.exports = {

    serveStaticAssets: serveStaticAssets,
    serveI18nBundles: serveI18nBundles

};
