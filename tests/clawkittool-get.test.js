const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createZipFromDir, extractZip } = require('../package/clawkittool/lib/archive');
const {
  detectOpenClawConfigPath,
  installKitFromManifest,
  loadManifest,
} = require('../package/clawkittool/lib/get');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawkittool-test-'));
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

test('detectOpenClawConfigPath prefers explicit config path', () => {
  const tempDir = makeTempDir();
  const explicitDir = path.join(tempDir, '.openclaw');
  const explicitConfigPath = path.join(explicitDir, 'openclaw.json');

  fs.mkdirSync(explicitDir, { recursive: true });
  fs.writeFileSync(explicitConfigPath, JSON.stringify({ agents: { list: [] } }), 'utf8');

  const detected = detectOpenClawConfigPath({
    explicitConfigPath: explicitDir,
    env: {},
    homeDir: tempDir,
  });

  assert.equal(detected, explicitConfigPath);
});

test('detectOpenClawConfigPath finds default ~/.openclaw/openclaw.json', () => {
  const tempDir = makeTempDir();
  const defaultDir = path.join(tempDir, '.openclaw');
  const defaultConfigPath = path.join(defaultDir, 'openclaw.json');

  fs.mkdirSync(defaultDir, { recursive: true });
  fs.writeFileSync(defaultConfigPath, JSON.stringify({ agents: { list: [] } }), 'utf8');

  const detected = detectOpenClawConfigPath({
    env: {},
    homeDir: tempDir,
  });

  assert.equal(detected, defaultConfigPath);
});

test('detectOpenClawConfigPath finds %APPDATA%/openclaw/openclaw.json on Windows', () => {
  const tempDir = makeTempDir();
  const appDataDir = path.join(tempDir, 'AppData', 'Roaming');
  const configDir = path.join(appDataDir, 'openclaw');
  const configPath = path.join(configDir, 'openclaw.json');

  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ agents: { list: [] } }), 'utf8');

  const detected = detectOpenClawConfigPath({
    env: { APPDATA: appDataDir },
    homeDir: tempDir,
    platform: 'win32',
  });

  assert.equal(detected, configPath);
});

test('extractZip uses PowerShell on Windows', () => {
  const calls = [];
  const tempDir = makeTempDir();
  const zipPath = path.join(tempDir, 'core.zip');
  const extractDir = path.join(tempDir, 'extract');

  fs.writeFileSync(zipPath, 'zip fixture', 'utf8');

  extractZip(zipPath, extractDir, {
    platform: 'win32',
    spawnSyncImpl: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, stdout: '', stderr: '' };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'powershell.exe');
  assert.deepEqual(calls[0].args.slice(0, 2), ['-NoProfile', '-Command']);
  assert.match(calls[0].args[2], /Expand-Archive/);
  assert.match(calls[0].args[2], /core\.zip/);
});

test('installKitFromManifest auto-deploys when OpenClaw config is detected', async () => {
  const tempDir = makeTempDir();
  const sourceDir = path.join(tempDir, 'source');
  const coreSourceDir = path.join(sourceDir, 'core');
  const kitSourceRoot = path.join(sourceDir, 'kits');
  const targetDir = path.join(tempDir, 'install-target');
  const manifestPath = path.join(tempDir, 'manifest.json');
  const coreZipPath = path.join(tempDir, 'core.zip');
  const kitZipPath = path.join(tempDir, 'product-kit.zip');
  const openClawDir = path.join(tempDir, '.openclaw');
  const openClawConfigPath = path.join(openClawDir, 'openclaw.json');
  const deployCalls = [];

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

  fs.mkdirSync(openClawDir, { recursive: true });
  fs.writeFileSync(openClawConfigPath, JSON.stringify({ agents: { defaults: {}, list: [] } }), 'utf8');

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
    env: {},
    homeDir: tempDir,
    deployRunner: (options) => {
      deployCalls.push(options);
      return { status: 0 };
    },
  });

  assert.equal(result.kitName, 'product-kit');
  assert.equal(result.deployed, true);
  assert.equal(result.detectedConfigPath, openClawConfigPath);
  assert.equal(deployCalls.length, 1);
  assert.deepEqual(deployCalls[0], {
    targetDir,
    kitName: 'product-kit',
    configPath: openClawConfigPath,
    targetName: null,
    force: false,
  });
});

test('installKitFromManifest skips deploy when requested', async () => {
  const tempDir = makeTempDir();
  const sourceDir = path.join(tempDir, 'source');
  const coreSourceDir = path.join(sourceDir, 'core');
  const kitSourceRoot = path.join(sourceDir, 'kits');
  const targetDir = path.join(tempDir, 'install-target');
  const manifestPath = path.join(tempDir, 'manifest.json');
  const coreZipPath = path.join(tempDir, 'core.zip');
  const kitZipPath = path.join(tempDir, 'product-kit.zip');
  const openClawDir = path.join(tempDir, '.openclaw');
  const openClawConfigPath = path.join(openClawDir, 'openclaw.json');
  let deployCalled = false;

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

  fs.mkdirSync(openClawDir, { recursive: true });
  fs.writeFileSync(openClawConfigPath, JSON.stringify({ agents: { defaults: {}, list: [] } }), 'utf8');

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
    skipDeploy: true,
    env: {},
    homeDir: tempDir,
    deployRunner: () => {
      deployCalled = true;
      return { status: 0 };
    },
  });

  assert.equal(result.deployed, false);
  assert.equal(result.detectedConfigPath, openClawConfigPath);
  assert.equal(deployCalled, false);
});
