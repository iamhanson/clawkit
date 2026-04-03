const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  installKitFromManifest,
  loadManifest,
} = require('../package/clawkittool/lib/get');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawkittool-test-'));
}

function createZipFromDir(sourceDir, zipPath) {
  const result = spawnSync('zip', ['-qr', zipPath, '.'], {
    cwd: sourceDir,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`Failed to create zip fixture: ${result.stderr || result.stdout}`);
  }
}

test('loadManifest reads a local manifest file', async () => {
  const tempDir = makeTempDir();
  const manifestPath = path.join(tempDir, 'manifest.json');

  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      version: 1,
      core: { url: 'file:///tmp/core.zip' },
      kits: { 'product-kit': { url: 'file:///tmp/product-kit.zip' } },
    }),
    'utf8',
  );

  const manifest = await loadManifest(manifestPath);

  assert.equal(manifest.version, 1);
  assert.equal(manifest.core.url, 'file:///tmp/core.zip');
  assert.equal(manifest.kits['product-kit'].url, 'file:///tmp/product-kit.zip');
});

test('installKitFromManifest installs core archive and one selected kit', async () => {
  const tempDir = makeTempDir();
  const sourceDir = path.join(tempDir, 'source');
  const coreSourceDir = path.join(sourceDir, 'core');
  const kitSourceRoot = path.join(sourceDir, 'kits');
  const targetDir = path.join(tempDir, 'install-target');
  const manifestPath = path.join(tempDir, 'manifest.json');
  const coreZipPath = path.join(tempDir, 'core.zip');
  const kitZipPath = path.join(tempDir, 'product-kit.zip');

  fs.mkdirSync(path.join(coreSourceDir, 'cli'), { recursive: true });
  fs.writeFileSync(path.join(coreSourceDir, 'cli', 'index.js'), '#!/usr/bin/env node\n', 'utf8');
  fs.writeFileSync(
    path.join(coreSourceDir, 'package.json'),
    JSON.stringify({ name: 'clawkit-core-fixture', version: '1.0.0' }, null, 2),
    'utf8',
  );

  fs.mkdirSync(path.join(kitSourceRoot, 'product-kit'), { recursive: true });
  fs.writeFileSync(
    path.join(kitSourceRoot, 'product-kit', 'kit.json'),
    JSON.stringify({ name: 'product-kit', agents: [] }, null, 2),
    'utf8',
  );

  createZipFromDir(coreSourceDir, coreZipPath);
  createZipFromDir(kitSourceRoot, kitZipPath);

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        core: { url: `file://${coreZipPath}` },
        kits: { 'product-kit': { url: `file://${kitZipPath}` } },
      },
      null,
      2,
    ),
    'utf8',
  );

  const result = await installKitFromManifest({
    kitName: 'product-kit',
    targetDir,
    manifestSource: manifestPath,
    skipInstall: true,
  });

  assert.equal(result.kitName, 'product-kit');
  assert.equal(fs.existsSync(path.join(targetDir, 'cli', 'index.js')), true);
  assert.equal(fs.existsSync(path.join(targetDir, 'package.json')), true);
  assert.equal(fs.existsSync(path.join(targetDir, 'kits', 'product-kit', 'kit.json')), true);
});

test('installKitFromManifest rejects unknown kits', async () => {
  const tempDir = makeTempDir();
  const manifestPath = path.join(tempDir, 'manifest.json');

  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      version: 1,
      core: { url: 'file:///tmp/core.zip' },
      kits: {},
    }),
    'utf8',
  );

  await assert.rejects(
    installKitFromManifest({
      kitName: 'missing-kit',
      targetDir: path.join(tempDir, 'install-target'),
      manifestSource: manifestPath,
      skipInstall: true,
    }),
    /Kit "missing-kit" not found in manifest/,
  );
});
