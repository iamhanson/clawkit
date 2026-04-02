#!/usr/bin/env node

const { listKits, loadKit, validateKit } = require('./lib/kit-loader');
const { createDeploymentPlan, executeDeployment, renderSummary } = require('./lib/deployer');

const HELP_TEXT = `Usage: clawkit <command> [options]

Commands:
  list                          List all available kits
  info <kit>                    Show kit details
  deploy <kit> --config <path>  Deploy a kit
  validate <kit>                Validate kit structure

Deploy options:
  --config <path>       Path to OpenClaw directory or openclaw.json file
  --target-name <name>  Prefix for deployed agent IDs (default: kit name)
  --apply               Actually write files (default: dry-run)
  --force               Overwrite existing deployed files

Examples:
  clawkit deploy product-kit --config ~/.openclaw
  clawkit deploy product-kit --config ~/.openclaw/openclaw.json --apply`;

/**
 * Parse raw argv into a structured object with command, positional args, and options.
 * @param {string[]} argv - Arguments after process.argv.slice(2)
 * @returns {{command: string|undefined, positional: string[], options: Object}}
 */
function parseArgs(argv) {
  const options = {};
  const positional = [];
  let command;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (i === 0 && !arg.startsWith('-')) {
      command = arg;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      command = '--help';
      continue;
    }

    if (arg === '--config') {
      options.config = argv[i + 1] || undefined;
      i += 1;
      continue;
    }

    if (arg === '--target-name') {
      options.targetName = argv[i + 1] || undefined;
      i += 1;
      continue;
    }

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    positional.push(arg);
  }

  return { command, positional, options };
}

/**
 * Print help text to stdout.
 */
function showHelp() {
  console.log(HELP_TEXT);
}

/**
 * Handle the "list" command. Prints all available kits.
 */
function handleList() {
  const kits = listKits();

  if (kits.length === 0) {
    console.log('No kits found.');
    return;
  }

  console.log('Available kits:');
  for (const kit of kits) {
    console.log(`  ${kit.name} - ${kit.displayName}`);
    if (kit.description) {
      console.log(`    ${kit.description}`);
    }
  }
}

/**
 * Handle the "info" command. Prints detailed information about a kit.
 * @param {string} kitName - Name of the kit to inspect
 */
function handleInfo(kitName) {
  if (!kitName) {
    throw new Error('Missing kit name. Usage: clawkit info <kit>');
  }

  const kit = loadKit(kitName);
  const { metadata } = kit;

  console.log(`Kit: ${metadata.name || kitName}`);
  console.log(`Name: ${metadata.displayName || metadata.name || kitName}`);
  if (metadata.version) {
    console.log(`Version: ${metadata.version}`);
  }
  if (metadata.description) {
    console.log(`Description: ${metadata.description}`);
  }

  if (Array.isArray(metadata.agents) && metadata.agents.length > 0) {
    console.log('');
    console.log('Agents:');
    for (const agent of metadata.agents) {
      const roleLabel = agent.role ? ` (${agent.role})` : '';
      console.log(`  - ${agent.id}${roleLabel}`);
    }
  }

  if (metadata.sharedWorkspace) {
    console.log('');
    console.log(`Shared Workspace: ${metadata.sharedWorkspace}`);
  }
}

/**
 * Prompt user for yes/no confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} User's answer
 */
function promptConfirm(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Handle the "deploy" command. Creates a deployment plan and optionally executes it.
 * @param {string} kitName - Name of the kit to deploy
 * @param {Object} options - Parsed CLI options
 * @param {string} options.config - Path to target openclaw.json
 * @param {string} [options.targetName] - Prefix for deployed agent IDs
 * @param {boolean} [options.apply] - Whether to write files
 * @param {boolean} [options.force] - Whether to overwrite existing files
 */
async function handleDeploy(kitName, options) {
  if (!kitName) {
    throw new Error('Missing kit name. Usage: clawkit deploy <kit> --config <directory-or-file>');
  }

  if (!options.config) {
    throw new Error('Missing required --config option. Usage: clawkit deploy <kit> --config <directory-or-file>');
  }

  const kit = loadKit(kitName);

  // Create initial plan to analyze existing agents
  const initialPlan = createDeploymentPlan({
    kit,
    configPath: options.config,
    apply: false,
    force: options.force || false,
    targetName: options.targetName || kit.name,
    cleanupAgents: false,
  });

  let cleanupAgents = false;

  // If there are non-managed agents and we're in apply mode, ask user
  if (options.apply && initialPlan.existingAgentsAnalysis.nonManaged.length > 0) {
    console.log('\nExisting agents found:');
    for (const agent of initialPlan.existingAgentsAnalysis.nonManaged) {
      console.log(`  - ${agent.id}`);
    }
    console.log('');

    cleanupAgents = await promptConfirm('Do you want to remove these agents from config? (workspace folders will be preserved)');
  }

  // Create final plan with user's choice
  const plan = createDeploymentPlan({
    kit,
    configPath: options.config,
    apply: options.apply || false,
    force: options.force || false,
    targetName: options.targetName || kit.name,
    cleanupAgents,
  });

  console.log(renderSummary(plan));

  if (cleanupAgents) {
    console.log(`\nCleanup mode: ${initialPlan.existingAgentsAnalysis.nonManaged.length} existing agent(s) will be removed from config`);
  }

  const result = executeDeployment(plan);

  if (result.written) {
    console.log('\nDeployment applied.');
    if (cleanupAgents) {
      console.log(`Removed ${initialPlan.existingAgentsAnalysis.nonManaged.length} agent(s) from configuration.`);
      console.log('Note: Workspace folders were preserved and not deleted.');
    }
  } else {
    console.log('\nDry-run only. No files written.');
  }
}

/**
 * Handle the "validate" command. Checks structural integrity of a kit.
 * @param {string} kitName - Name of the kit to validate
 */
function handleValidate(kitName) {
  if (!kitName) {
    throw new Error('Missing kit name. Usage: clawkit validate <kit>');
  }

  const kit = loadKit(kitName);
  const result = validateKit(kit);

  if (result.valid) {
    console.log('\u2713 Kit structure is valid');
  } else {
    console.log('\u2717 Kit validation failed:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    process.exitCode = 1;
  }
}

/**
 * Main entry point. Parses arguments and routes to the appropriate handler.
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const { command, positional, options } = parseArgs(args);
  const kitName = positional[0];

  switch (command) {
    case 'list':
      handleList();
      break;
    case 'info':
      handleInfo(kitName);
      break;
    case 'deploy':
      await handleDeploy(kitName, options);
      break;
    case 'validate':
      handleValidate(kitName);
      break;
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('');
      showHelp();
      process.exitCode = 1;
      break;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
  showHelp,
  handleList,
  handleInfo,
  handleDeploy,
  handleValidate,
};
