'use strict';
const path = require('path');
const ElasticApm = require(path.join(process.cwd(), '/lib/elastic-apm.js'));
const exampleMap = path.join(
  process.cwd(),
  'assets',
  'chunk.20210725T225711604Z.4acf47f0a2b4bd7aaf6c.map'
);
const assetDir = path.dirname(exampleMap);
const exampleMapRegex =
  /chunk\.20210725T225711604Z\.4acf47f0a2b4bd7aaf6c\.map/g;

QUnit.module('elasticApm');

QUnit.test('getSourceMaps', (assert) => {
  var files = ElasticApm.getSourceMaps(assetDir);

  assert.true(files.length > 0, 'found source maps');
  assert.equal(path.extname(files[0]), '.map');
  assert.true(
    !!files.find((f) => {
      return f.match(exampleMapRegex);
    }),
    'found example map'
  );
});

QUnit.test('getAssetForMap', (assert) => {
  var asset = ElasticApm.getAssetForMap(assetDir, exampleMap);
  assert.true(!!asset, 'found asset');
  assert.equal(path.dirname(exampleMap), path.dirname(asset));
});

QUnit.test('getAssetsAndMaps', (assert) => {
  var assetsAndMaps = ElasticApm.getAssetsAndMaps(assetDir);

  assert.true(assetsAndMaps.length > 0, 'results greater than zero');

  var exampleMapAndAsset = assetsAndMaps.find((res) => {
    return res.map.match(exampleMapRegex);
  });
  assert.true(
    !!exampleMapAndAsset.asset && !!exampleMapAndAsset.map,
    'contains asset and map'
  );
});
