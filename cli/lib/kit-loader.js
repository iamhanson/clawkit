const fs = require('fs');
const path = require('path');

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
 * Reads both kit.json (metadata) and openclaw.json (runtime config) from the kit directory.
 * @param {string} kitName - Directory name of the kit to load
 * @param {string} [kitsDir] - Path to kits directory (defaults to ./kits)
 * @returns {{name: string, kitDir: string, metadata: Object, config: Object}} Loaded kit
 * @throws {Error} If kit directory, kit.json, or openclaw.json is missing or invalid
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

  const config = readJsonFile(
    path.join(kitDir, 'openclaw.json'),
    `openclaw.json for "${kitName}"`
  );

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
 * @param {Object} kit.config - Parsed openclaw.json content
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateKit(kit) {
  const errors = [];
  const { kitDir, metadata } = kit;

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
    // Each agent's soulFile must exist
    for (const agent of metadata.agents) {
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
    }
  }

  // --- openclaw.json checks ---

  const openclawPath = path.join(kitDir, 'openclaw.json');
  if (!fs.existsSync(openclawPath)) {
    errors.push('openclaw.json does not exist');
  } else {
    try {
      JSON.parse(fs.readFileSync(openclawPath, 'utf8'));
    } catch (_error) {
      errors.push('openclaw.json contains invalid JSON');
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

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  listKits,
  loadKit,
  validateKit,
};
