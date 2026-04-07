const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { extractZip } = require('./archive');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveOpenClawConfigFile(candidatePath) {
  if (!candidatePath) {
    return null;
  }

  const resolvedPath = path.resolve(candidatePath);
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  const stats = fs.statSync(resolvedPath);
  if (stats.isDirectory()) {
    const configPath = path.join(resolvedPath, 'openclaw.json');
    return fs.existsSync(configPath) ? configPath : null;
  }

  return path.basename(resolvedPath) === 'openclaw.json' ? resolvedPath : null;
}

function detectOpenClawConfigPath({
  explicitConfigPath = null,
  env = process.env,
  homeDir = os.homedir(),
  platform = process.platform,
} = {}) {
  const explicitMatch = resolveOpenClawConfigFile(explicitConfigPath);
  if (explicitMatch) {
    return explicitMatch;
  }

  const envCandidates = [
    env.OPENCLAW_HOME,
    env.OPENCLAW_CONFIG_DIR,
    env.OPENCLAW_CONFIG_PATH,
  ];

  for (const candidate of envCandidates) {
    const envMatch = resolveOpenClawConfigFile(candidate);
    if (envMatch) {
      return envMatch;
    }
  }

  const defaultCandidates =
    platform === 'win32'
      ? [
          path.join(homeDir, '.openclaw'),
          env.APPDATA ? path.join(env.APPDATA, 'openclaw') : null,
        ]
      : [
          path.join(homeDir, '.openclaw'),
          path.join(homeDir, '.config', 'openclaw'),
        ];

  for (const candidate of defaultCandidates) {
    const defaultMatch = resolveOpenClawConfigFile(candidate);
    if (defaultMatch) {
      return defaultMatch;
    }
  }

  return null;
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawkittool-'));
}

function isUrl(value) {
  return /^https?:\/\//.test(value) || /^file:\/\//.test(value);
}

async function readText(source) {
  if (/^file:\/\//.test(source)) {
    return fs.readFileSync(new URL(source), 'utf8');
  }

  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  }

  return fs.readFileSync(path.resolve(source), 'utf8');
}

async function loadManifest(source) {
  const raw = await readText(source);
  const manifest = JSON.parse(raw);

  if (!manifest.core || !manifest.core.url) {
    throw new Error('Manifest is missing core.url');
  }

  if (!manifest.kits || typeof manifest.kits !== 'object') {
    throw new Error('Manifest is missing kits');
  }

  return manifest;
}

async function downloadFile(source, targetPath) {
  ensureDir(path.dirname(targetPath));

  if (/^file:\/\//.test(source)) {
    fs.copyFileSync(new URL(source), targetPath);
    return targetPath;
  }

  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to download ${source}: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    return targetPath;
  }

  fs.copyFileSync(path.resolve(source), targetPath);
  return targetPath;
}

function listMeaningfulEntries(dirPath) {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.name !== '__MACOSX' && entry.name !== '.DS_Store');
}

function resolveArchiveRoot(extractDir) {
  const entries = listMeaningfulEntries(extractDir);
  if (entries.length === 1 && entries[0].isDirectory()) {
    return path.join(extractDir, entries[0].name);
  }
  return extractDir;
}

function copyDirectoryContents(sourceDir, targetDir, force) {
  ensureDir(targetDir);

  for (const entry of listMeaningfulEntries(sourceDir)) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      if (fs.existsSync(targetPath) && !force) {
        throw new Error(`Target directory already exists: ${targetPath}`);
      }
      fs.rmSync(targetPath, { recursive: true, force: true });
      fs.cpSync(sourcePath, targetPath, { recursive: true });
      continue;
    }

    if (fs.existsSync(targetPath) && !force) {
      throw new Error(`Target file already exists: ${targetPath}`);
    }
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function installCoreArchive(extractDir, targetDir, force) {
  const archiveRoot = resolveArchiveRoot(extractDir);
  copyDirectoryContents(archiveRoot, targetDir, force);
}

function resolveKitSourceDir(extractDir, kitName) {
  const archiveRoot = resolveArchiveRoot(extractDir);
  const directKitDir = path.join(archiveRoot, kitName);
  if (fs.existsSync(path.join(directKitDir, 'kit.json'))) {
    return directKitDir;
  }

  const nestedKitDir = path.join(archiveRoot, 'kits', kitName);
  if (fs.existsSync(path.join(nestedKitDir, 'kit.json'))) {
    return nestedKitDir;
  }

  if (fs.existsSync(path.join(archiveRoot, 'kit.json'))) {
    return archiveRoot;
  }

  throw new Error(`Unable to locate kit "${kitName}" inside archive`);
}

function installKitArchive(extractDir, targetDir, kitName, force) {
  const kitSourceDir = resolveKitSourceDir(extractDir, kitName);
  const targetKitDir = path.join(targetDir, 'kits', kitName);

  if (fs.existsSync(targetKitDir) && !force) {
    throw new Error(`Target kit directory already exists: ${targetKitDir}`);
  }

  fs.rmSync(targetKitDir, { recursive: true, force: true });
  ensureDir(path.dirname(targetKitDir));
  fs.cpSync(kitSourceDir, targetKitDir, { recursive: true });
}

function runInstall(targetDir) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['install'], {
    cwd: targetDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`npm install failed in ${targetDir}`);
  }
}

function runDeploy({ targetDir, kitName, configPath, targetName = null, force = false }) {
  const nodeCommand = process.execPath;
  const deployArgs = [path.join(targetDir, 'cli', 'index.js'), 'deploy', kitName, '--config', configPath, '--apply'];

  if (targetName) {
    deployArgs.push('--target-name', targetName);
  }

  if (force) {
    deployArgs.push('--force');
  }

  const result = spawnSync(nodeCommand, deployArgs, {
    cwd: targetDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`clawkit deploy failed for ${kitName}`);
  }
}

async function installKitFromManifest({
  kitName,
  targetDir,
  manifestSource,
  force = false,
  skipInstall = false,
  explicitConfigPath = null,
  skipDeploy = false,
  targetName = null,
  env = process.env,
  homeDir = os.homedir(),
  deployRunner = runDeploy,
}) {
  const manifest = await loadManifest(manifestSource);
  const kitEntry = manifest.kits[kitName];

  if (!kitEntry || !kitEntry.url) {
    throw new Error(`Kit "${kitName}" not found in manifest`);
  }

  ensureDir(targetDir);

  const tempDir = makeTempDir();
  const coreZipPath = path.join(tempDir, 'core.zip');
  const coreExtractDir = path.join(tempDir, 'core');
  const kitZipPath = path.join(tempDir, `${kitName}.zip`);
  const kitExtractDir = path.join(tempDir, kitName);
  const detectedConfigPath = detectOpenClawConfigPath({
    explicitConfigPath,
    env,
    homeDir,
  });

  try {
    await downloadFile(manifest.core.url, coreZipPath);
    extractZip(coreZipPath, coreExtractDir);
    installCoreArchive(coreExtractDir, targetDir, force);

    await downloadFile(kitEntry.url, kitZipPath);
    extractZip(kitZipPath, kitExtractDir);
    installKitArchive(kitExtractDir, targetDir, kitName, force);

    if (!skipInstall) {
      runInstall(targetDir);
    }

    let deployed = false;
    if (!skipDeploy && detectedConfigPath) {
      deployRunner({
        targetDir,
        kitName,
        configPath: detectedConfigPath,
        targetName,
        force,
      });
      deployed = true;
    }

    return {
      kitName,
      targetDir,
      detectedConfigPath,
      deployed,
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

module.exports = {
  detectOpenClawConfigPath,
  installKitFromManifest,
  loadManifest,
};
