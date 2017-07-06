// var assert = require("chai").assert;
var sinon = require('sinon');
var logger = require('node-tech-logger');
var techStatic = require('../techStatic');
var path = require('path');

logger.setup({});

describe('node-tech-static', function() {
  var app,
    opts = null;

  beforeEach(function() {
    app = { use: sinon.spy() };
  });

  describe('#configure', function() {
    it('Uses cache options from configuration', function() {
      var configuration = { AV_VERSION: '1.0', resources: { cache: { seconds: 15 } } };

      techStatic._testing.staticMw = function(folder, options) {
        return [folder.split(path.sep).join('/'), options];
      };
      techStatic.configure(app, configuration, ['dir1'], []);

      sinon.assert.calledWith(app.use, '/resources/1.0', ['dir1/public', { maxAge: 15000 }]);
    });
  });

  describe('#serveStaticAssets', function() {
    beforeEach(function() {
      opts = {
        cache: { ms: 123456 },
        version: '1.0',
        optimize: false,
        dirs: ['.', '../../node-ui-commons'],
        staticMw: function(folder, options) {
          return [folder.split(path.sep).join('/'), options];
        }
      };
    });

    it('Serves from a list of dirs', function() {
      techStatic._testing.serveStaticAssets(app, opts);

      sinon.assert.calledWith(app.use, '/resources/1.0', ['public', { maxAge: 123456 }]);
      sinon.assert.calledWith(app.use, '/resources/1.0', ['../../node-ui-commons/public', { maxAge: 123456 }]);
    });

    it('Serves optimized resource from a single dir', function() {
      opts.optimize = true;

      techStatic._testing.serveStaticAssets(app, opts);

      sinon.assert.calledWith(app.use, '/resources/1.0', ['dist/public', { maxAge: 123456 }]);
    });

    it("Serves non optimized resources from folders suffixed with '-debug' when using 'debug=true'", function() {
      opts.optimize = true;

      techStatic._testing.serveStaticAssets(app, opts);

      sinon.assert.calledWith(app.use, '/resources-debug/1.0', ['public', { maxAge: 0 }]);
      sinon.assert.calledWith(app.use, '/resources-debug/1.0', ['../../node-ui-commons/public', { maxAge: 0 }]);
    });

    it('converts seconds to ms', function() {
      opts.cache.seconds = 1;
      delete opts.cache.ms;

      techStatic._testing.serveStaticAssets(app, opts);

      sinon.assert.calledWith(app.use, '/resources/1.0', ['public', { maxAge: 1000 }]);
    });
  });

  describe('#serverI18nBundles', function() {
    it('Adds default service for all bundles', function() {
      techStatic._testing.serveI18nBundles(app, {
        bundles: ['Portal', 'Error'],
        version: '1.0',
        contextUrl: '/portal'
      });

      sinon.assert.calledWith(app.use, '/resources/1.0/i18n/Portal_en.properties', sinon.match.func);
      sinon.assert.calledWith(app.use, '/resources/1.0/i18n/Portal_en.properties', sinon.match.func);
    });

    it('Redirects en to default property files', function() {
      techStatic._testing.serveI18nBundles(app, {
        bundles: ['Portal'],
        version: '1.0',
        contextUrl: '/portal'
      });

      var spyCall = app.use.firstCall;
      var handler = spyCall.args[1];

      var res = { redirect: sinon.spy() };
      handler(null, res);
      sinon.assert.calledOnce(res.redirect);
      sinon.assert.calledWith(res.redirect, '/portal/resources/1.0/i18n/Portal.properties');
    });

    it("Redirects en to default for 'debug' resources", function() {
      techStatic._testing.serveI18nBundles(app, {
        bundles: ['Portal'],
        version: '1.0',
        contextUrl: '/portal'
      });

      var spyCall = app.use.getCall(1);
      var handler = spyCall.args[1];

      var res = { redirect: sinon.spy() };
      handler(null, res);
      sinon.assert.calledOnce(res.redirect);
      sinon.assert.calledWith(res.redirect, '/portal/resources-debug/1.0/i18n/Portal.properties');
    });
  });
});
