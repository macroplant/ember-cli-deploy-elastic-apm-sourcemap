/* jshint node: true */
'use strict';

var DeployPluginBase = require('ember-cli-deploy-plugin');
var ElasticApm = require('./lib/elastic-apm');

module.exports = {
  name: 'ember-cli-deploy-elastic-apm-sourcemaps',

  createDeployPlugin: function (options) {
    var DeployPlugin = DeployPluginBase.extend({
      name: options.name,

      defaultConfig: {
        sourceMapPattern: '**/*.map',
        distDir: function (context) {
          return context.distDir;
        },
      },

      requiredConfig: [
        'serviceName',
        'serviceVersion',
        'serverUrl',
        'publicPath',
      ],

      upload: function (context) {
        var serviceName = this.readConfig('serviceName');
        var serviceVersion = this.readConfig('serviceVersion');
        var serverUrl = this.readConfig('serverUrl');
        var secret = this.readConfig('secret');
        var token = this.readConfig('token');
        var publicPath = this.readConfig('publicPath');

        var distDir = this.readConfig('distDir');
        var sourceMapPattern = this.readConfig('sourceMapPattern');

        this.log('Preparing to upload source maps to Elastic APM', {
          verbose: true,
        });

        var elasticApm = new ElasticApm({
          serviceName,
          serviceVersion,
          serverUrl,
          secret,
          token,
          publicPath,
          logger: this,
        });

        return elasticApm.publishSourceMaps({ distDir, sourceMapPattern });
      },
    });

    return new DeployPlugin();
  },
};
