const fs = require('fs');
const path = require('path');
const { getSourceAgents, getSourceAllowAgents } = require('./merger');

function buildConfigFromMetadata(metadata) {
  return {
    agents: {
      defaults: {},
      list: (metadata.agents || []).map((agent) => ({
        id: agent.id,
        subagents: {
          allowAgents: Array.isArray(agent.allowAgents) ? [...agent.allowAgents] : [],
        },
      })),
    },
  };
}

/**
 * Read and parse a JSON file with a descriptive error on failure
 * @param {string} filePath - Absolute path to the JSON file
 * @param {string} label - Human-readable label for error messages
 * @returns {Object} Parsed JSON content
 * @throws {Error} If file missing or contains invalid JSON
 */
function readJsonFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} contains invalid JSON: ${filePath}`);
  }
}

/**
 * List all available kits in the kits directory.
 * Scans each subdirectory for a valid kit.json and returns basic metadata.
 * @param {string} [kitsDir] - Path to kits directory (defaults to ./kits)
 * @returns {Array<{name: string, displayName: string, description: string}>} Array of kit summaries
 */
function listKits(kitsDir = path.join(process.cwd(), 'kits')) {
  if (!fs.existsSync(kitsDir)) {
    return [];
  }

  const entries = fs.readdirSync(kitsDir, { withFileTypes: true });
  const kits = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const kitJsonPath = path.join(kitsDir, entry.name, 'kit.json');
    if (!fs.existsSync(kitJsonPath)) {
      continue;
    }

    try {
      const kitJson = JSON.parse(fs.readFileSync(kitJsonPath, 'utf8'));
      kits.push({
        name: kitJson.name || entry.name,
        displayName: kitJson.displayName || kitJson.name || entry.name,
        description: kitJson.description || '',
      });
    } catch (_error) {
      // Skip directories with invalid kit.json
    }
  }

  return kits;
}

/**
 * Load a specific kit by name.
 * Reads kit.json and derives runtime config from it.
 * @param {string} kitName - Directory name of the kit to load
 * @param {string} [kitsDir] - Path to kits directory (defaults to ./kits)
 * @returns {{name: string, kitDir: string, metadata: Object, config: Object}} Loaded kit
 * @throws {Error} If kit directory or kit.json is missing/invalid, or if allowAgents is missing from any agent
 */
function loadKit(kitName, kitsDir = path.join(process.cwd(), 'kits')) {
  const kitDir = path.resolve(kitsDir, kitName);

  if (!fs.existsSync(kitDir)) {
    throw new Error(`Kit "${kitName}" not found in ${kitsDir}`);
  }

  const metadata = readJsonFile(
    path.join(kitDir, 'kit.json'),
    `kit.json for "${kitName}"`
  );

  if (!Array.isArray(metadata.agents) || metadata.agents.some((agent) => !Array.isArray(agent.allowAgents))) {
    throw new Error(
      `Kit "${kitName}" must define allowAgents for every agent in kit.json`
    );
  }

  const config = buildConfigFromMetadata(metadata);

  return {
    name: metadata.name || kitName,
    kitDir,
    metadata,
    config,
  };
}

/**
 * Validate a loaded kit's structural integrity.
 * Checks that all required files, fields, and references are present and consistent.
 * @param {Object} kit - Kit object returned by loadKit()
 * @param {string} kit.name - Kit name
 * @param {string} kit.kitDir - Absolute path to kit directory
 * @param {Object} kit.metadata - Parsed kit.json content
 * @param {Object} kit.config - Generated runtime config
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateKit(kit) {
  const errors = [];
  const { kitDir, metadata, config } = kit;

  // --- kit.json checks ---

  const kitJsonPath = path.join(kitDir, 'kit.json');
  if (!fs.existsSync(kitJsonPath)) {
    errors.push('kit.json does not exist');
  } else {
    try {
      JSON.parse(fs.readFileSync(kitJsonPath, 'utf8'));
    } catch (_error) {
      errors.push('kit.json contains invalid JSON');
    }
  }

  // kit.json.name must match directory name
  const dirName = path.basename(kitDir);
  if (metadata.name && metadata.name !== dirName) {
    errors.push(
      `kit.json name "${metadata.name}" does not match directory name "${dirName}"`
    );
  }

  // kit.json.agents must be a non-empty array
  if (!Array.isArray(metadata.agents) || metadata.agents.length === 0) {
    errors.push('kit.json agents must be a non-empty array');
  } else {
    const seenMetadataIds = new Set();

    // Each agent's soulFile must exist
    for (const agent of metadata.agents) {
      if (!agent.id) {
        errors.push('Agent in kit.json is missing id');
      } else if (seenMetadataIds.has(agent.id)) {
        errors.push(`Duplicate agent id in kit.json: "${agent.id}"`);
      } else {
        seenMetadataIds.add(agent.id);
      }

      if (!agent.soulFile) {
        errors.push(`Agent "${agent.id || '(unknown)'}" is missing soulFile`);
        continue;
      }
      const soulPath = path.join(kitDir, agent.soulFile);
      if (!fs.existsSync(soulPath)) {
        errors.push(
          `Agent "${agent.id || '(unknown)'}" soulFile not found: ${agent.soulFile}`
        );
      }

      if (!Array.isArray(agent.allowAgents)) {
        errors.push(`Agent "${agent.id || '(unknown)'}" is missing allowAgents in kit.json`);
      }
    }
  }

  if (Array.isArray(metadata.agents) && metadata.agents.length > 0) {
    const metadataIds = new Set(metadata.agents.map((agent) => agent.id).filter(Boolean));

    try {
      const sourceAgents = getSourceAgents(config);
      const sourceIds = new Set();

      for (const agent of sourceAgents) {
        if (!agent.id) {
          errors.push('Generated agent config is missing id');
          continue;
        }

        if (sourceIds.has(agent.id)) {
          errors.push(`Duplicate agent id in generated config: "${agent.id}"`);
          continue;
        }

        sourceIds.add(agent.id);
      }

      for (const metadataId of metadataIds) {
        if (!sourceIds.has(metadataId)) {
          errors.push(`kit.json agent "${metadataId}" is missing from generated config`);
        }
      }

      for (const sourceId of sourceIds) {
        if (!metadataIds.has(sourceId)) {
          errors.push(`generated config agent "${sourceId}" is missing from kit.json`);
        }
      }

      for (const agent of sourceAgents) {
        if (!agent.id) {
          continue;
        }

        for (const downstreamId of getSourceAllowAgents(agent)) {
          if (!metadataIds.has(downstreamId)) {
            errors.push(`allowAgents references unknown agent "${downstreamId}" from "${agent.id}"`);
          }
        }
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  // --- sharedWorkspace check ---

  if (metadata.sharedWorkspace) {
    const workspacePath = path.join(kitDir, metadata.sharedWorkspace);
    if (!fs.existsSync(workspacePath)) {
      errors.push(
        `Shared workspace directory not found: ${metadata.sharedWorkspace}`
      );
    }
  }

  // --- setup script check ---

  if (metadata.setup) {
    const setupPath = path.join(kitDir, metadata.setup);
    if (!fs.existsSync(setupPath)) {
      errors.push(
        `Setup script not found: ${metadata.setup}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  buildConfigFromMetadata,
  listKits,
  loadKit,
  validateKit,
};
