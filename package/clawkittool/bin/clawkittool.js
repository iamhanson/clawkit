#!/usr/bin/env node

const path = require('node:path');
const { installKitFromManifest } = require('../lib/get');

function printUsage() {
  console.log(`Usage:
  clawkittool get <kit-name> [--dir <path>] [--manifest <url-or-path>] [--config <path>] [--target-name <name>] [--force] [--skip-install] [--skip-deploy]
`);
}

async function main(argv) {
  const [command, maybeKitName, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (command !== 'get') {
    throw new Error(`Unknown command: ${command}`);
  }

  if (!maybeKitName) {
    throw new Error('Missing kit name for get command');
  }

  let targetDir = path.resolve(process.cwd(), maybeKitName);
  let manifestSource = process.env.CLAWKIT_MANIFEST_URL || null;
  let force = false;
  let skipInstall = false;
  let skipDeploy = false;
  let explicitConfigPath = null;
  let targetName = null;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--dir') {
      targetDir = path.resolve(process.cwd(), rest[index + 1] || '');
      index += 1;
      continue;
    }

    if (arg === '--manifest') {
      manifestSource = rest[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === '--config') {
      explicitConfigPath = rest[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === '--target-name') {
      targetName = rest[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === '--force') {
      force = true;
      continue;
    }

    if (arg === '--skip-install') {
      skipInstall = true;
      continue;
    }

    if (arg === '--skip-deploy') {
      skipDeploy = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!manifestSource) {
    throw new Error('Missing manifest source. Use --manifest or set CLAWKIT_MANIFEST_URL');
  }

  const result = await installKitFromManifest({
    kitName: maybeKitName,
    targetDir,
    manifestSource,
    force,
    skipInstall,
    explicitConfigPath,
    skipDeploy,
    targetName,
  });

  console.log(`Installed ${result.kitName} into ${result.targetDir}`);
  if (result.deployed) {
    console.log(`Deployed ${result.kitName} to ${result.detectedConfigPath}`);
  } else if (result.detectedConfigPath) {
    console.log(`Detected OpenClaw config at ${result.detectedConfigPath}, but deployment was skipped.`);
  } else {
    console.log('No OpenClaw config detected. Pass --config to deploy automatically.');
  }
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`clawkittool failed: ${error.message}`);
  process.exitCode = 1;
});
