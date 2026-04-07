const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapePowerShellString(value) {
  return String(value).replace(/'/g, "''");
}

function platformPath(platform) {
  return platform === 'win32' ? path.win32 : path;
}

function resolvePathForPlatform(targetPath, platform) {
  return platformPath(platform).resolve(String(targetPath));
}

function runArchiveCommand(command, args, { cwd, spawnSyncImpl, errorPrefix }) {
  const result = spawnSyncImpl(command, args, {
    cwd,
    encoding: 'utf8',
  });

  if (result.error) {
    throw new Error(`${errorPrefix}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${errorPrefix}: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
}

function createZipFromDir(sourceDir, zipPath, {
  platform = process.platform,
  spawnSyncImpl = spawnSync,
} = {}) {
  ensureDir(path.dirname(zipPath));

  if (platform === 'win32') {
    const pathApi = platformPath(platform);
    const sourcePattern = pathApi.join(resolvePathForPlatform(sourceDir, platform), '*');
    const resolvedZipPath = resolvePathForPlatform(zipPath, platform);
    runArchiveCommand(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path '${escapePowerShellString(sourcePattern)}' -DestinationPath '${escapePowerShellString(resolvedZipPath)}' -Force`,
      ],
      {
        spawnSyncImpl,
        errorPrefix: 'Failed to create zip archive',
      },
    );
    return zipPath;
  }

  runArchiveCommand('zip', ['-qr', zipPath, '.'], {
    cwd: sourceDir,
    spawnSyncImpl,
    errorPrefix: 'Failed to create zip archive',
  });
  return zipPath;
}

function extractZip(zipPath, targetDir, {
  platform = process.platform,
  spawnSyncImpl = spawnSync,
} = {}) {
  ensureDir(targetDir);

  if (platform === 'win32') {
    const resolvedZipPath = resolvePathForPlatform(zipPath, platform);
    const resolvedTargetDir = resolvePathForPlatform(targetDir, platform);
    runArchiveCommand(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -LiteralPath '${escapePowerShellString(resolvedZipPath)}' -DestinationPath '${escapePowerShellString(resolvedTargetDir)}' -Force`,
      ],
      {
        spawnSyncImpl,
        errorPrefix: 'Failed to extract zip archive',
      },
    );
    return targetDir;
  }

  runArchiveCommand('unzip', ['-qo', zipPath, '-d', targetDir], {
    spawnSyncImpl,
    errorPrefix: 'Failed to extract zip archive',
  });
  return targetDir;
}

module.exports = {
  createZipFromDir,
  extractZip,
};
