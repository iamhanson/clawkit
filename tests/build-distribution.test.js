const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildDistribution,
  createManifest,
  listKitDirectories,
} = require('../scripts/build-distribution');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'build-distribution-test-'));
}

test('listKitDirectories returns available kit names', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const kitNames = listKitDirectories(path.join(repoRoot, 'kits'));

  assert.equal(kitNames.includes('product-kit'), true);
  assert.equal(kitNames.includes('hotnews-kit'), true);
});

test('createManifest builds core and kit URLs', () => {
  const manifest = createManifest({
    baseUrl: 'https://example.com/dist',
    kitNames: ['product-kit', 'hotnews-kit'],
  });

  assert.equal(manifest.version, 1);
  assert.equal(manifest.core.url, 'https://example.com/dist/core.zip');
  assert.equal(manifest.kits['product-kit'].url, 'https://example.com/dist/kits/product-kit.zip');
  assert.equal(manifest.kits['hotnews-kit'].url, 'https://example.com/dist/kits/hotnews-kit.zip');
});

test('createManifest supports GitHub release asset URLs', () => {
  const manifest = createManifest({
    githubRepo: 'hanson/openclawstudy',
    githubTag: 'v0.1.0',
    kitNames: ['product-kit', 'hotnews-kit'],
  });

  assert.equal(
    manifest.core.url,
    'https://github.com/hanson/openclawstudy/releases/download/v0.1.0/core.zip',
  );
  assert.equal(
    manifest.kits['product-kit'].url,
    'https://github.com/hanson/openclawstudy/releases/download/v0.1.0/product-kit.zip',
  );
  assert.equal(
    manifest.kits['hotnews-kit'].url,
    'https://github.com/hanson/openclawstudy/releases/download/v0.1.0/hotnews-kit.zip',
  );
});

test('buildDistribution creates core zip, kit zips, and manifest', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const outputDir = path.join(makeTempDir(), 'dist');

  const result = buildDistribution({
    repoRoot,
    outputDir,
    baseUrl: 'https://example.com/dist',
  });

  assert.equal(fs.existsSync(path.join(outputDir, 'core.zip')), true);
  assert.equal(fs.existsSync(path.join(outputDir, 'kits', 'product-kit.zip')), true);
  assert.equal(fs.existsSync(path.join(outputDir, 'kits', 'hotnews-kit.zip')), true);
  assert.equal(fs.existsSync(path.join(outputDir, 'manifest.json')), true);

  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.core.url, 'https://example.com/dist/core.zip');
  assert.equal(manifest.kits['product-kit'].url, 'https://example.com/dist/kits/product-kit.zip');
  assert.equal(result.kitNames.includes('product-kit'), true);
});
