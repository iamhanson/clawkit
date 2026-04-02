/**
 * Deep clone a value using JSON serialization
 * @param {*} value - Value to clone
 * @returns {*} Cloned value
 */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Extract agents array from source config
 * @param {Object} sourceConfig - Source configuration object
 * @returns {Array} Array of agent objects
 * @throws {Error} If agents schema is unsupported
 */
function getSourceAgents(sourceConfig) {
  if (Array.isArray(sourceConfig.agents)) {
    return sourceConfig.agents;
  }

  if (sourceConfig.agents && Array.isArray(sourceConfig.agents.list)) {
    return sourceConfig.agents.list;
  }

  throw new Error('Example openclaw.json has unsupported agents schema');
}

/**
 * Extract allowAgents array from agent config
 * @param {Object} agent - Agent configuration object
 * @returns {Array} Array of allowed agent IDs
 */
function getSourceAllowAgents(agent) {
  if (Array.isArray(agent.allowAgents)) {
    return agent.allowAgents;
  }

  if (agent.subagents && Array.isArray(agent.subagents.allowAgents)) {
    return agent.subagents.allowAgents;
  }

  return [];
}

/**
 * Merge managed agents into existing config
 * @param {Object} existingConfig - Existing configuration
 * @param {Array} managedAgents - Managed agents to merge
 * @param {boolean} cleanupMode - If true, remove all non-managed agents
 * @returns {Object} Merged configuration
 */
function mergeAgents(existingConfig, managedAgents, cleanupMode = false) {
  const mergedConfig = clone(existingConfig);
  let existingAgentsObject = {};
  let existingList = [];

  if (mergedConfig.agents && !Array.isArray(mergedConfig.agents)) {
    // Object schema: { defaults: {}, list: [...] }
    existingAgentsObject = clone(mergedConfig.agents);
    existingList = Array.isArray(existingAgentsObject.list) ? existingAgentsObject.list : [];
  } else if (Array.isArray(mergedConfig.agents)) {
    // Legacy array schema: [...]
    existingList = clone(mergedConfig.agents);
  }

  const managedIds = new Set(managedAgents.map((agent) => agent.id));

  if (cleanupMode) {
    // Clean mode: only keep managed agents
    existingAgentsObject.list = clone(managedAgents);
  } else {
    // Preserve mode: keep non-managed agents
    const preservedAgents = existingList.filter((agent) => !managedIds.has(agent.id));
    existingAgentsObject.list = [...preservedAgents, ...clone(managedAgents)];
  }

  if (!existingAgentsObject.defaults) {
    existingAgentsObject.defaults = {};
  }
  mergedConfig.agents = existingAgentsObject;

  return mergedConfig;
}

module.exports = {
  clone,
  getSourceAgents,
  getSourceAllowAgents,
  mergeAgents,
};
