#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createZipFromDir } = require('../cli/lib/archive');

const CORE_ENTRIES = [
  'cli',
  'package.json',
  'LICENSE',
  'README.md',
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawkit-dist-'));
}

function listKitDirectories(kitsDir) {
  return fs
    .readdirSync(kitsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function copyEntry(sourcePath, targetPath) {
  const stats = fs.statSync(sourcePath);
  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, targetPath, { recursive: true });
    return;
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function buildCoreArchive(repoRoot, outputDir) {
  const tempDir = makeTempDir();
  const stagingDir = path.join(tempDir, 'core');
  ensureDir(stagingDir);

  try {
    for (const entry of CORE_ENTRIES) {
      const sourcePath = path.join(repoRoot, entry);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Missing core distribution entry: ${entry}`);
      }
      copyEntry(sourcePath, path.join(stagingDir, entry));
    }

    const zipPath = path.join(outputDir, 'core.zip');
    createZipFromDir(stagingDir, zipPath);
    return zipPath;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function buildKitArchive(repoRoot, outputDir, kitName) {
  const tempDir = makeTempDir();
  const stagingDir = path.join(tempDir, 'kits');
  const sourceKitDir = path.join(repoRoot, 'kits', kitName);
  const targetKitDir = path.join(stagingDir, kitName);

  ensureDir(stagingDir);

  try {
    if (!fs.existsSync(sourceKitDir)) {
      throw new Error(`Missing kit directory: ${sourceKitDir}`);
    }

    fs.cpSync(sourceKitDir, targetKitDir, { recursive: true });

    const zipPath = path.join(outputDir, 'kits', `${kitName}.zip`);
    createZipFromDir(stagingDir, zipPath);
    return zipPath;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createManifest({ baseUrl, githubRepo, githubTag, kitNames }) {
  const useGithubRelease = Boolean(githubRepo && githubTag);
  const normalizedBaseUrl = useGithubRelease
    ? `https://github.com/${githubRepo}/releases/download/${githubTag}`
    : String(baseUrl).replace(/\/+$/, '');
  const kits = {};

  for (const kitName of kitNames) {
    kits[kitName] = {
      url: useGithubRelease
        ? `${normalizedBaseUrl}/${kitName}.zip`
        : `${normalizedBaseUrl}/kits/${kitName}.zip`,
    };
  }

  return {
    version: 1,
    core: {
      url: `${normalizedBaseUrl}/core.zip`,
    },
    kits,
  };
}

function buildDistribution({ repoRoot, outputDir, baseUrl }) {
  const kitsDir = path.join(repoRoot, 'kits');
  const kitNames = listKitDirectories(kitsDir);

  fs.rmSync(outputDir, { recursive: true, force: true });
  ensureDir(path.join(outputDir, 'kits'));

  buildCoreArchive(repoRoot, outputDir);
  for (const kitName of kitNames) {
    buildKitArchive(repoRoot, outputDir, kitName);
  }

  const manifest = createManifest({
    baseUrl,
    githubRepo: process.env.CLAWKIT_GITHUB_REPO,
    githubTag: process.env.CLAWKIT_GITHUB_TAG,
    kitNames,
  });
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  return {
    outputDir,
    kitNames,
    manifest,
  };
}

if (require.main === module) {
  const repoRoot = path.resolve(__dirname, '..');
  const outputDir = path.join(repoRoot, 'dist', 'distribution');
  const baseUrl = process.env.CLAWKIT_DIST_BASE_URL || 'https://example.com/clawkit';

  const result = buildDistribution({
    repoRoot,
    outputDir,
    baseUrl,
  });

  console.log(`Built distribution in ${result.outputDir}`);
  console.log(`Kits: ${result.kitNames.join(', ')}`);
}

module.exports = {
  buildDistribution,
  createManifest,
  listKitDirectories,
};
