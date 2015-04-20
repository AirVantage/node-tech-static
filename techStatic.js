var _ = require("lodash");
var fs = require("fs");
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
 
 * @param opts.version
 *            {String} the version of the web application released. It is used to compute the URL of all static resources (eg "15.01")
 *            
 * @param opts.cacheOptions
 * @param [opts.cacheOptions.ms]
 *            {Integer} number of ms during which resources should be cached
 * @param [opts.cacheOptions.seconds]
 *            {Integer} number of seconds during which resources should be cached
 *
 * @param [opts.staticMw]
 *            {Function} mw function to server static. Defaults to express.static.
 *            This argument should only be used for testing.
 */
var serveStaticAssets = function(app, opts) {

    assert.ok(opts.dirs);
    assert.ok(opts.version);

    var resourcesUrlBase = "/resources/" + opts.version;
    // In case the 'debug=true' mode is activated, the URL contains the '/resources-debug/' path segment
    // and resources should be served from the 'public' folder with no caching (maxAge: 0)
    var resourcesDebugUrlBase = "/resources-debug/" + opts.version;

    var dirs = opts.dirs;
    var optimize = opts.optimize;
    var cacheOptions = staticCacheOptions(opts.cache);
    var staticMw = opts.staticMw || express.static;

    logger.debug("Using cache Options", cacheOptions);
    logger.debug("StaticPrefix:", resourcesUrlBase);
    if (optimize) {
        var distDir = path.join(dirs[0], "dist", "public");
        logger.debug("Serving optimized resources from folder:", distDir);
        app.use(resourcesUrlBase, staticMw(distDir, cacheOptions));

        _.each(dirs, function(dir) {
            var publicDir = path.join(dir, "public");
            logger.debug("Serving non optimized resources from folder:", publicDir);
            app.use(resourcesDebugUrlBase, staticMw(publicDir, {
                maxAge: 0
            }));
        });

        // Specific routing for the all.css file which is always retrieved from the dist/public/css folder
        app.use(resourcesDebugUrlBase + "/css", staticMw(path.join(distDir, "css"), cacheOptions));
    } else {
        _.each(dirs, function(dir) {
            var publicDir = path.join(dir, "public");
            logger.debug("Serving non optimized resources from folder:", publicDir);
            app.use(resourcesUrlBase, staticMw(publicDir, cacheOptions));
        });
    }
};

function staticCacheOptions(cacheConfiguration) {
    var res = {
        ms: 0
    };
    if (cacheConfiguration) {
        if (cacheConfiguration.seconds) {
            res = {
                maxAge: cacheConfiguration.seconds * 1000
            };
        }
        if (cacheConfiguration.ms) {
            res = {
                maxAge: cacheConfiguration.ms
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
 * @param opts.version
 *          {String} the version of the web application released. It is used to compute the URL of all static resources (eg "15.01")
 *
 * @param opts.contextUrl
 *          {String} base of all *other* urls (eg "/" or "")
 */
var serveI18nBundles = function(app, opts) {

    assert.ok(opts.bundles);
    assert.ok(opts.version);

    var resourcesUrlBase = "/resources/" + opts.version;

    var bundles = opts.bundles;

    _.each(bundles, function(bundle) {
        var en_path = [resourcesUrlBase, "/i18n/", bundle, "_en.properties"].join("");
        var no_locale_path = [resourcesUrlBase, "/i18n/", bundle, ".properties"].join("");
        app.use(en_path, function(req, res) {
            res.redirect(opts.contextUrl + no_locale_path);
        });
    });

};

function checkOptimizedDir(dirname, configuration) {
    if (configuration.resources.optimize) {
        fs.exists(path.join(dirname, "dist", "public"), function(exists) {
            if (!exists) {
                throw new Error("Trying to launch server with optimized resources, but dist/public does not exts ; run grunt dist");
            }
        });
    } else {
        logger.warn("Will use non-optimized resources");
    }
}

function configure(app, configuration, dirs, bundles) {

    checkOptimizedDir(dirs[0], configuration);

    serveStaticAssets(app, {
        version: configuration.AV_VERSION,
        optimize: configuration.resources.optimize,
        cacheOptions: configuration.resources.cache,
        dirs: dirs
    });

    if (bundles) {
        serveI18nBundles(app, {
            version: configuration.AV_VERSION,
            contextUrl: configuration.contextUrl,
            bundles: bundles
        });
    }

}

module.exports = {

    serveStaticAssets: serveStaticAssets,
    serveI18nBundles: serveI18nBundles,
    checkOptimizedDir: checkOptimizedDir,
    configure: configure

};
