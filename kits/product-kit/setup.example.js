#!/usr/bin/env node
/**
 * Example setup script for product-kit
 *
 * This example shows the current recommended pattern:
 * 1. Update agent.model in openclaw.json with provider-qualified refs
 * 2. Write models.json into each agent's agentDir
 * 3. Write auth-profiles.json into each agent's agentDir
 *
 * Copy this to setup.js and replace the placeholder provider/model/auth values
 * with your real OpenClaw environment settings before use.
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BASE_URL = 'https://maas-api.cn-huabei-1.xf-yun.com/v2';

function buildModelRef(providerId, modelId) {
  return `${providerId}/${modelId}`;
}

function buildModelsJson(providerId, baseUrl, apiKey, modelId, api = 'openai-completions') {
  return {
    providers: {
      [providerId]: {
        baseUrl,
        apiKey,
        api,
        models: [
          {
            id: modelId,
            name: modelId,
            reasoning: false,
            input: ['text'],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 40960,
            api,
          },
        ],
      },
    },
  };
}

function buildAuthProfilesJson(providerId, apiKey) {
  const profileId = `${providerId}:default`;
  return {
    version: 1,
    profiles: {
      [profileId]: {
        type: 'api_key',
        provider: providerId,
        key: apiKey,
      },
    },
    order: {
      [providerId]: [profileId],
    },
    lastGood: {
      [providerId]: profileId,
    },
    usageStats: {},
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function updateAgentModelsInConfig(configPath, targetName, modelRefs) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  for (const agent of config.agents.list || []) {
    if (agent.id === `${targetName}-pm`) {
      agent.model = modelRefs.pm;
    } else if (agent.id === `${targetName}-dev`) {
      agent.model = modelRefs.dev;
    } else if (agent.id === `${targetName}-qa`) {
      agent.model = modelRefs.qa;
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

const configDir = process.argv[2];
const context = JSON.parse(process.argv[3]);

console.log(`\nConfiguring ${context.targetName} agents...\n`);

// Replace these placeholder values before using the script in a real environment.
const pmProviderId = 'your-provider-id';
const devProviderId = 'your-provider-id';
const qaProviderId = 'your-provider-id';
const pmModelId = 'your-pm-model';
const devModelId = 'your-dev-model';
const qaModelId = 'your-qa-model';
const pmApiKey = 'replace-with-real-pm-key';
const devApiKey = 'replace-with-real-dev-key';
const qaApiKey = 'replace-with-real-qa-key';

const pmModelRef = buildModelRef(pmProviderId, pmModelId);
const devModelRef = buildModelRef(devProviderId, devModelId);
const qaModelRef = buildModelRef(qaProviderId, qaModelId);

updateAgentModelsInConfig(context.configPath, context.targetName, {
  pm: pmModelRef,
  dev: devModelRef,
  qa: qaModelRef,
});

const agents = [
  {
    id: `${context.targetName}-pm`,
    modelsJson: buildModelsJson(pmProviderId, DEFAULT_BASE_URL, pmApiKey, pmModelId),
    authProfilesJson: buildAuthProfilesJson(pmProviderId, pmApiKey),
  },
  {
    id: `${context.targetName}-dev`,
    modelsJson: buildModelsJson(devProviderId, DEFAULT_BASE_URL, devApiKey, devModelId),
    authProfilesJson: buildAuthProfilesJson(devProviderId, devApiKey),
  },
  {
    id: `${context.targetName}-qa`,
    modelsJson: buildModelsJson(qaProviderId, DEFAULT_BASE_URL, qaApiKey, qaModelId),
    authProfilesJson: buildAuthProfilesJson(qaProviderId, qaApiKey),
  },
];

for (const agent of agents) {
  writeJson(path.join(configDir, 'agents', agent.id, 'agent', 'models.json'), agent.modelsJson);
  writeJson(
    path.join(configDir, 'agents', agent.id, 'agent', 'auth-profiles.json'),
    agent.authProfilesJson,
  );
  console.log(`  Configured ${agent.id}`);
}

console.log('\nSetup complete\n');
