'use strict';
const path = require('path');
const glob = require('glob');
const FormData = require('form-data');
const fs = require('fs');
const RSVP = require('rsvp');
const fetch = require('node-fetch');

module.exports = class ElasticApm {
  constructor({
    logger = console,
    serviceVersion,
    serviceName,
    secret,
    serverUrl,
    publicPath,
  }) {
    this.logger = logger;
    this.serviceVersion = serviceVersion;
    this.secret = secret;
    this.serviceName = serviceName;
    this.serverUrl = serverUrl;
    this.publicPath = publicPath;
  }

  publishSourceMap = async ({ asset, map, distDir }) => {
    if (!asset || !map) {
      // It is impossible for Wepback to run into here.
      this.logger?.log('there is no .js files to be uploaded', {
        verbose: true,
      });
      return;
    }

    var u = new URL(this.serverUrl);
    u.pathname = 'assets/v1/sourcemaps';

    var pp = new URL(this.publicPath);
    pp.pathname = pp.pathname + asset;
    pp.pathname.replace(/\/\//, '/');

    const url = u.toString();
    const formData = new FormData();
    const bundleFilePath = pp.toString();
    const readStream = fs.createReadStream(path.join(distDir, map));

    formData.append('sourcemap', readStream, {
      filename: map,
      contentType: 'application/json',
    });

    formData.append('service_version', this.serviceVersion);
    formData.append('bundle_filepath', bundleFilePath);
    formData.append('service_name', this.serviceName);

    let headers = {};
    if (this.secret) {
      headers.Authorization = `Bearer ${this.secret}`;
    } else if (this.token) {
      headers.Authorization = `ApiKey ${this.token}`;
    }
    this.logger?.log(`uploading ${map} for ${bundleFilePath}`);

    return fetch(url, {
      method: 'POST',
      body: formData,
      headers: headers,
    })
      .then((response) => Promise.all([response.ok, response.text()]))
      .then(([ok, responseText]) => {
        if (ok) {
          this.logger?.log(`uploaded ${map}`, { verbose: true });
        } else {
          this.logger?.log(`APM server response: ${responseText}`, {
            color: red,
          });
          throw new Error(`error while uploading ${map}`);
        }
      });
  };

  publishSourceMaps = async ({ sourceMapPattern = '**/*.map', distDir }) => {
    var assetsAndMaps = this.constructor.getAssetsAndMaps(
      distDir,
      sourceMapPattern
    );

    var allUploads = assetsAndMaps.map((pair) => {
      return this.publishSourceMap({
        distDir,
        asset: pair.asset,
        map: pair.map,
      });
    });

    return RSVP.all(allUploads);
  };

  static getAssetsAndMaps = (distDir, sourceMapPattern) => {
    var files = this.getSourceMaps(distDir, sourceMapPattern);

    return files.map((map) => {
      return {
        asset: this.getAssetForMap(distDir, map),
        map: map,
      };
    });
  };

  static getSourceMaps = (distDir, sourceMapPattern = '**/*.map') => {
    return glob.sync(sourceMapPattern, {
      cwd: distDir,
    });
  };

  static jsPattern = '**/*.js';

  static getAssetForMap = (distDir, map, filterRegex = /^-[a-zA-Z0-9]+$/) => {
    var mapPath = path.dirname(map);
    var fileName = this.absoluteBaseName(map);

    var possible = glob.sync(`${mapPath}/${this.jsPattern}`, {
      cwd: distDir,
    });

    // Filter out files don't match the fingerprinting format
    // which would be the Map file name plus a dash and alphanumeric characters
    possible = possible.filter((path) => {
      var tempFilePath = this.absoluteBaseName(path);
      var pathWithoutPrefix = tempFilePath.replace(fileName, '');
      return !pathWithoutPrefix || filterRegex.test(pathWithoutPrefix);
    });

    if (possible.length > 1) {
      throw new Error(
        'The asset for the map `' +
          map +
          '` could not be matched' +
          ' because there were multiple possibilities: ' +
          possible.join(', ')
      );
    }

    if (possible.length === 0) {
      throw new Error(
        'The asset for the map `' + map + '` could not be found.'
      );
    }

    return possible[0].replace(/^\.\//, '');
  };

  static absoluteBaseName = (fileName) => {
    var ext = path.extname(fileName);

    return path.basename(fileName, ext);
  };
};
