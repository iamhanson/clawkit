#!/usr/bin/env node

const path = require('node:path');
const readline = require('node:readline');
const { installKitFromManifest, detectOpenClawConfigPath } = require('../lib/get');

function printUsage() {
  console.log(`Usage:
  clawkittool get <kit-name> [--dir <path>] [--manifest <url-or-path>] [--config <path>] [--target-name <name>] [--force] [--skip-install] [--skip-deploy]
`);
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function promptConfirm(question) {
  const answer = await askQuestion(`${question} (Y/n): `);
  const normalized = String(answer || '').trim().toLowerCase();
  return normalized === '' || normalized === 'y' || normalized === 'yes';
}

async function promptForConfigPath() {
  const answer = await askQuestion(
    'Please enter your OpenClaw config directory or openclaw.json path (leave empty to skip deploy): ',
  );
  const trimmed = String(answer || '').trim();
  return trimmed || null;
}

async function chooseConfigPathForDeploy({
  explicitConfigPath = null,
  detectedConfigPath = null,
  confirmUseDetected = promptConfirm,
  promptForConfigPath: promptForConfigPathImpl = promptForConfigPath,
} = {}) {
  if (explicitConfigPath) {
    return explicitConfigPath;
  }

  if (!detectedConfigPath) {
    return null;
  }

  const useDetected = await confirmUseDetected(`Detected OpenClaw config at ${detectedConfigPath}. Use this path for deploy?`);
  if (useDetected) {
    return detectedConfigPath;
  }

  const manualPath = await promptForConfigPathImpl();
  const normalizedManualPath = typeof manualPath === 'string' ? manualPath.trim() : manualPath;
  return normalizedManualPath || null;
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

  let configPathForDeploy = explicitConfigPath;
  if (!skipDeploy) {
    const detectedConfigPath = detectOpenClawConfigPath({
      explicitConfigPath,
    });
    configPathForDeploy = await chooseConfigPathForDeploy({
      explicitConfigPath,
      detectedConfigPath,
    });

    if (!configPathForDeploy && detectedConfigPath && !explicitConfigPath) {
      console.log('Skipped automatic deploy.');
    }
  }

  const result = await installKitFromManifest({
    kitName: maybeKitName,
    targetDir,
    manifestSource,
    force,
    skipInstall,
    explicitConfigPath: configPathForDeploy,
    skipDeploy: skipDeploy || !configPathForDeploy,
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

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`clawkittool failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  chooseConfigPathForDeploy,
  main,
  promptConfirm,
  promptForConfigPath,
};
