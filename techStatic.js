var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var express = require('express');
var logger = require('node-tech-logger');
var assert = require('assert');
var ls = require('list-directory-contents');

/**
 * Configure everything to serve static resources for an express app with
 *  multiple resoures folders
 *
 * @param {Express App} options.app
 * @param  {Map} options.configuration
 *            Application configuration Map
 * @param {Map} options.staticResourcesDirs
 *            Multiple Folders path containing the application static resources
 * @param {String} options.staticResourcesDirs.appResources
 *            Path towards the express application static resources folder
 * @param {Array} i18nBundles
 *            i18n properties files name to use
 *
 */
function configure(options) {
  var app = options.app,
    configuration = options.configuration,
    dirs = options.staticResourcesDirs,
    bundles = options.i18nBundles;

  logger.debug('[tech-static] Configuring static resources with configuration');

  checkOptimizedDir(dirs.appResources, configuration);

  serveStaticAssets(app, {
    version: configuration.AV_VERSION,
    optimize: configuration.resources.optimize,
    cache: configuration.resources.cache,
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

function checkOptimizedDir(dirname, configuration) {
  if (configuration.resources.optimize) {
    fs.exists(path.join(dirname, 'dist', 'public'), function(exists) {
      if (!exists) {
        throw new Error(
          'Trying to launch server with optimized resources, but dist/public does not exts ; run grunt dist'
        );
      }
    });
  } else {
    logger.warn('Will use non-optimized resources');
  }
}

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
 * @param opts.cache
 * @param [opts.cache.ms]
 *            {Integer} number of ms during which resources should be cached
 * @param [opts.cache.seconds]
 *            {Integer} number of seconds during which resources should be cached
 *
 * @param [opts.staticMw]
 *            {Function} mw function to server static. Defaults to express.static.
 *            This argument should only be used for testing.
 */
var serveStaticAssets = function(app, opts) {
  logger.debug('[tech-static] Opts', opts);

  assert.ok(opts.dirs);
  assert.ok(opts.version);

  var resourcesUrlBase = '/resources/' + opts.version;
  // In case the 'debug=true' mode is activated, the URL contains the '/resources-debug/' path segment
  // and resources should be served from the 'public' folder with no caching (maxAge: 0)
  var resourcesDebugUrlBase = '/resources-debug/' + opts.version;

  var dirs = opts.dirs;
  var optimize = opts.optimize;
  var expressStaticCacheOptions = toExpressStaticCacheOptions(opts.cache);
  var staticMw = opts.staticMw || _testing.staticMw || express.static;

  logger.debug('[tech-static] Express Cache Options', expressStaticCacheOptions);
  logger.debug('[tech-static] StaticPrefix:', resourcesUrlBase);
  logger.debug('[tech-static] StaticPrefix for debug:', resourcesDebugUrlBase);

  if (optimize) {
    var distDir = path.join(dirs.appResources, 'dist', 'public');
    logger.debug('[tech-static] Serving optimized resources ' + resourcesUrlBase + ' from folder:', distDir);
    printDir(distDir);

    app.use(resourcesUrlBase, staticMw(distDir, expressStaticCacheOptions));

    _.forEach(dirs, function(dir) {
      var publicDir = path.join(dir, 'public');
      logger.debug(
        '[tech-static] Serving non optimized  resources ' + resourcesDebugUrlBase + ' from folder:',
        publicDir
      );
      printDir(publicDir);
      app.use(resourcesDebugUrlBase, staticMw(publicDir, { maxAge: 0 }));
    });

    // Specific routing for the all.css file which is always retrieved from the dist/public/css folder
    var cssDir = path.join(distDir, 'css');
    logger.debug(
      '[tech-static] Serving all.css file for debug url ' + resourcesDebugUrlBase + '/css from folder ' + cssDir
    );
    printDir(cssDir);
    app.use(resourcesDebugUrlBase + '/css', staticMw(cssDir, expressStaticCacheOptions));
  } else {
    _.forEach(dirs, function(dir) {
      var publicDir = path.join(dir, 'public');
      logger.debug('[tech-static] Serving non optimized resources from folder:', publicDir);
      app.use(resourcesUrlBase, staticMw(publicDir, expressStaticCacheOptions));
    });
  }
};

/**
 * Convert a, object with ms or seconds, into a 'cache options' usable by
 * express 'static' middleware.
 *
 * @options cacheConfiguration
 * @options [cacheConfiguration.ms]
 * @options []cacheConfiguration.seconds]
 */
function toExpressStaticCacheOptions(cacheConfiguration) {
  logger.debug('[tech-static] computing cache options', cacheConfiguration);

  var res = { maxAge: 0 };
  if (cacheConfiguration) {
    if (cacheConfiguration.seconds) {
      res = { maxAge: cacheConfiguration.seconds * 1000 };
    }
    if (cacheConfiguration.ms) {
      res = { maxAge: cacheConfiguration.ms };
    }
  }
  return res;
}

function printDir(dirname) {
  ls(dirname, function(err, tree) {
    if (err) {
      logger.warn('[tech-static] Error while listing dir ' + dirname + ' : ' + JSON.stringify(err));
    } else {
      logger.debug('[tech-static] Counted ' + _.size(tree) + ' elements in dir ' + dirname);
    }
  });
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

  var resourcesUrlBase = '/resources/' + opts.version;
  var resourcesDebugUrlBase = '/resources-debug/' + opts.version;

  var bundles = opts.bundles;

  [resourcesUrlBase, resourcesDebugUrlBase].forEach(function(urlBase) {
    bundles.forEach(function(bundle) {
      var en_path = [urlBase, '/i18n/', bundle, '_en.properties'].join('');
      var no_locale_path = [urlBase, '/i18n/', bundle, '.properties'].join('');
      app.use(en_path, function(req, res) {
        res.redirect(opts.contextUrl + no_locale_path);
      });
    });
  });
};

var _testing = {
  serveStaticAssets: serveStaticAssets,
  serveI18nBundles: serveI18nBundles,
  checkOptimizedDir: checkOptimizedDir
};

module.exports = {
  configure: configure,
  _testing: _testing
};
