const fs = require('node:fs');
const path = require('node:path');
const { clone, mergeAgents, getSourceAgents, getSourceAllowAgents } = require('./merger');

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

function parseArgs(argv) {
  let configPath = null;
  let apply = false;
  let force = false;
  let targetName = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--config') {
      configPath = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === '--apply') {
      apply = true;
      continue;
    }

    if (arg === '--force') {
      force = true;
      continue;
    }

    if (arg === '--target-name') {
      targetName = argv[index + 1] || null;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!configPath) {
    throw new Error('Missing required --config');
  }

  return {
    apply,
    force,
    configPath,
    targetName,
  };
}

function timestampForBackup(date = new Date()) {
  return date.toISOString().replace(/:/g, '-').replace(/\..+$/, '');
}

function getManagedAgentId(targetName, shortId) {
  return `${targetName}-${shortId}`;
}

function getManagedWorkspacePath(configDir, targetName, shortId) {
  return path.join(configDir, `workspace-${targetName}-${shortId}`);
}

function getSharedWorkspacePath(configDir, targetName) {
  return path.join(configDir, `workspace-${targetName}-shared`);
}

function getManagedSoulPath(configDir, targetName, shortId) {
  return path.join(getManagedWorkspacePath(configDir, targetName, shortId), 'SOUL.md');
}

function getAgentConfigDir(configDir, agentId) {
  return path.join(configDir, 'agents', agentId, 'agent');
}

function getAgentSessionsDir(configDir, agentId) {
  return path.join(configDir, 'agents', agentId, 'sessions');
}

function getAgentAuthProfilesPath(configDir, agentId) {
  return path.join(getAgentConfigDir(configDir, agentId), 'auth-profiles.json');
}

function getMainAuthProfilesPath(configDir) {
  return getAgentAuthProfilesPath(configDir, 'main');
}

function buildManagedAgents(configDir, sourceAgents, kitAgents, targetName) {
  const idMap = {};
  const metadataById = {};
  for (const agent of kitAgents) {
    idMap[agent.id] = getManagedAgentId(targetName, agent.id);
    metadataById[agent.id] = agent;
  }

  return sourceAgents.map((agent) => {
    const shortId = agent.id;
    const managedId = idMap[shortId];
    const metadata = metadataById[shortId] || {};
    const managedAgent = {
      id: managedId,
      workspace: getManagedWorkspacePath(configDir, targetName, shortId),
      subagents: {
        allowAgents: getSourceAllowAgents(agent).map((peerId) => idMap[peerId]),
      },
    };

    if (metadata.tools && typeof metadata.tools === 'object') {
      managedAgent.tools = clone(metadata.tools);
    }

    return managedAgent;
  });
}

function assertFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} does not exist: ${filePath}`);
  }
}

function validateInputs(kit, resolvedConfigPath) {
  assertFileExists(resolvedConfigPath, 'Target openclaw.json');

  for (const agent of kit.metadata.agents) {
    const soulPath = path.join(kit.kitDir, agent.soulFile);
    assertFileExists(soulPath, `Agent ${agent.id} soul file`);
  }

  if (kit.metadata.sharedWorkspace) {
    const sharedPath = path.join(kit.kitDir, kit.metadata.sharedWorkspace);
    assertFileExists(sharedPath, 'Shared workspace');
  }
}

function analyzeExistingAgents(targetConfig, managedIds) {
  const existingList = [];

  if (targetConfig.agents && !Array.isArray(targetConfig.agents)) {
    existingList.push(...(targetConfig.agents.list || []));
  } else if (Array.isArray(targetConfig.agents)) {
    existingList.push(...targetConfig.agents);
  }

  // Filter out managed agents and get non-managed agents
  const nonManagedAgents = existingList.filter((agent) => !managedIds.has(agent.id));

  return {
    total: existingList.length,
    nonManaged: nonManagedAgents,
    managed: existingList.filter((agent) => managedIds.has(agent.id)),
  };
}

function createDeploymentPlan({ kit, configPath, apply, force, targetName, cleanupAgents }) {
  const resolvedTargetName = targetName || kit.metadata.name;

  // If configPath is a directory, append openclaw.json
  let resolvedConfigPath = path.resolve(configPath);

  // Check if path exists and is a directory
  if (fs.existsSync(resolvedConfigPath)) {
    const stats = fs.statSync(resolvedConfigPath);
    if (stats.isDirectory()) {
      resolvedConfigPath = path.join(resolvedConfigPath, 'openclaw.json');
    }
  }

  validateInputs(kit, resolvedConfigPath);
  const targetConfigDir = path.dirname(resolvedConfigPath);
  const sourceConfig = kit.config;
  const targetConfig = readJson(resolvedConfigPath);
  const managedAgents = buildManagedAgents(
    targetConfigDir,
    getSourceAgents(sourceConfig),
    kit.metadata.agents,
    resolvedTargetName,
  );

  const managedIds = new Set(managedAgents.map((agent) => agent.id));
  const existingAgentsAnalysis = analyzeExistingAgents(targetConfig, managedIds);

  const mergedConfig = cleanupAgents
    ? mergeAgents(targetConfig, managedAgents, true) // Clean mode: only keep managed agents
    : mergeAgents(targetConfig, managedAgents, false); // Preserve mode: keep all agents

  const managedSoulFiles = {};
  for (const agent of kit.metadata.agents) {
    managedSoulFiles[agent.id] = getManagedSoulPath(targetConfigDir, resolvedTargetName, agent.id);
  }

  const sharedWorkspacePath = getSharedWorkspacePath(targetConfigDir, resolvedTargetName);

  return {
    mode: apply ? 'apply' : 'dry-run',
    force,
    targetName: resolvedTargetName,
    kit,
    configPath: resolvedConfigPath,
    targetConfigDir,
    backupPath: `${resolvedConfigPath}.bak.${timestampForBackup()}`,
    sourceConfig,
    targetConfig,
    managedAgents,
    managedSoulFiles,
    sharedWorkspacePath,
    mergedConfig,
    deployedAgentIds: managedAgents.map((agent) => agent.id),
    existingAgentsAnalysis,
    cleanupAgents: cleanupAgents || false,
  };
}

function renderSummary(plan) {
  const lines = [
    `Mode: ${plan.mode}`,
    `Config: ${plan.configPath}`,
    `Target config dir: ${plan.targetConfigDir}`,
    `Target name: ${plan.targetName}`,
    `Backup: ${plan.backupPath}`,
    `Agents: ${plan.deployedAgentIds.join(', ')}`,
    `Shared workspace: ${plan.sharedWorkspacePath}`,
  ];

  if (plan.kit.metadata.setup) {
    lines.push(`Setup script: ${plan.kit.metadata.setup}`);
  }

  return lines.join('\n');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileChecked(sourcePath, targetPath, force) {
  if (!force && fs.existsSync(targetPath)) {
    throw new Error(`Target file already exists: ${targetPath}`);
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function copyWorkspaceTree(sourceDir, targetDir, force) {
  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyWorkspaceTree(sourcePath, targetPath, force);
      continue;
    }

    copyFileChecked(sourcePath, targetPath, force);
  }
}

function copyAuthProfilesToManagedAgents(plan) {
  const sourceAuthProfilesPath = getMainAuthProfilesPath(plan.targetConfigDir);
  if (!fs.existsSync(sourceAuthProfilesPath)) {
    console.warn(
      `Warning: main auth-profiles.json not found, skipping auth copy: ${sourceAuthProfilesPath}`,
    );
    return;
  }

  for (const agent of plan.managedAgents) {
    const targetAuthProfilesPath = getAgentAuthProfilesPath(plan.targetConfigDir, agent.id);
    if (!plan.force && fs.existsSync(targetAuthProfilesPath)) {
      continue;
    }
    ensureDir(path.dirname(targetAuthProfilesPath));
    fs.copyFileSync(sourceAuthProfilesPath, targetAuthProfilesPath);
  }
}

function validateWritePermissions(plan) {
  const dirsToCheck = [
    path.dirname(plan.configPath),
    ...plan.managedAgents.map((agent) => agent.workspace),
    plan.sharedWorkspacePath,
  ];

  for (const dir of dirsToCheck) {
    const checkDir = fs.existsSync(dir) ? dir : path.dirname(dir);
    try {
      fs.accessSync(checkDir, fs.constants.W_OK);
    } catch (error) {
      throw new Error(`No write permission for directory: ${dir}`);
    }
  }
}

function executeDeployment(plan) {
  if (plan.mode === 'dry-run') {
    return {
      written: false,
      mode: plan.mode,
    };
  }

  validateWritePermissions(plan);
  fs.copyFileSync(plan.configPath, plan.backupPath);

  for (const agent of plan.managedAgents) {
    ensureDir(agent.workspace);
    ensureDir(getAgentConfigDir(plan.targetConfigDir, agent.id));
    ensureDir(getAgentSessionsDir(plan.targetConfigDir, agent.id));
  }

  copyAuthProfilesToManagedAgents(plan);

  // Copy all agent SOUL files
  for (const agent of plan.kit.metadata.agents) {
    const sourcePath = path.join(plan.kit.kitDir, agent.soulFile);
    const targetPath = plan.managedSoulFiles[agent.id];
    copyFileChecked(sourcePath, targetPath, plan.force);
  }

  // Copy shared workspace
  if (plan.kit.metadata.sharedWorkspace) {
    copyWorkspaceTree(
      path.join(plan.kit.kitDir, plan.kit.metadata.sharedWorkspace),
      plan.sharedWorkspacePath,
      plan.force,
    );
  }

  fs.writeFileSync(plan.configPath, JSON.stringify(plan.mergedConfig, null, 2) + '\n', 'utf8');

  if (plan.kit.metadata.setup && plan.mode === 'apply') {
    const setupPath = path.join(plan.kit.kitDir, plan.kit.metadata.setup);
    const context = JSON.stringify({
      targetName: plan.targetName,
      agentIds: plan.deployedAgentIds,
      configPath: plan.configPath,
      kitDir: plan.kit.kitDir,
    });

    console.log(`\nRunning setup script: ${plan.kit.metadata.setup}`);

    try {
      const { spawnSync } = require('child_process');
      const result = spawnSync('node', [setupPath, plan.targetConfigDir, context], {
        stdio: 'inherit',
        cwd: plan.kit.kitDir,
      });

      if (result.status !== 0) {
        console.warn(`\nWarning: Setup script exited with code ${result.status}`);
        console.warn('Base deployment completed, but setup may be incomplete.');
      }
    } catch (error) {
      console.warn(`\nWarning: Failed to run setup script: ${error.message}`);
      console.warn('Base deployment completed, but setup may be incomplete.');
    }
  }

  return {
    written: true,
    mode: plan.mode,
  };
}

module.exports = {
  createDeploymentPlan,
  executeDeployment,
  renderSummary,
};
