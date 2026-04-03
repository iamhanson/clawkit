#!/usr/bin/env node
/**
 * Setup script for product-kit
 * 1. Interactively configures one shared model/auth group for pm/dev/qa
 * 2. Writes per-agent models.json
 * 3. Writes per-agent auth-profiles.json
 * 4. Updates openclaw.json so pm/dev/qa point to the same model ref
 */

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const DEFAULT_OPENAI_COMPAT_BASE_URL = 'https://maas-api.cn-huabei-1.xf-yun.com/v2';

function ask(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function buildModelRef(providerId, modelId) {
  return `${providerId}/${modelId}`;
}

function buildModelsJson(providerId, baseUrl, apiKey, modelId, api) {
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

function writeModelsJson(configDir, agentId, modelsJson) {
  const filePath = path.join(configDir, 'agents', agentId, 'agent', 'models.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(modelsJson, null, 2) + '\n', 'utf8');
  return filePath;
}

function writeAuthProfilesJson(configDir, agentId, authProfilesJson) {
  const filePath = path.join(configDir, 'agents', agentId, 'agent', 'auth-profiles.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(authProfilesJson, null, 2) + '\n', 'utf8');
  return filePath;
}

async function askModelConfig(rl) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('配置模型: pm + dev + qa (统一模型)');
  console.log('='.repeat(60));

  const providerId = (await ask(rl, '  Provider ID: ')).trim();
  const baseUrlInput = (await ask(
    rl,
    `  Base URL (默认 ${DEFAULT_OPENAI_COMPAT_BASE_URL}): `,
  )).trim();
  const apiKey = (await ask(rl, '  API Key: ')).trim();
  const modelId = (await ask(rl, '  Model ID: ')).trim();
  const apiInput = (await ask(rl, '  API 类型 (默认 openai-completions): ')).trim();

  if (!providerId) {
    throw new Error('Provider ID is required');
  }
  if (!apiKey) {
    throw new Error('API Key is required');
  }
  if (!modelId) {
    throw new Error('Model ID is required');
  }

  const baseUrl = baseUrlInput || DEFAULT_OPENAI_COMPAT_BASE_URL;
  const api = apiInput || 'openai-completions';

  return {
    modelRef: buildModelRef(providerId, modelId),
    modelsJson: buildModelsJson(providerId, baseUrl, apiKey, modelId, api),
    authProfilesJson: buildAuthProfilesJson(providerId, apiKey),
  };
}

function buildModelConfigFromEnv(env) {
  const providerId = String(env.PRODUCT_KIT_PROVIDER_ID || '').trim();
  const apiKey = String(env.PRODUCT_KIT_API_KEY || '').trim();
  const modelId = String(env.PRODUCT_KIT_MODEL_ID || '').trim();
  if (!providerId || !apiKey || !modelId) {
    return null;
  }

  const baseUrl = String(env.PRODUCT_KIT_BASE_URL || '').trim() || DEFAULT_OPENAI_COMPAT_BASE_URL;
  const api = String(env.PRODUCT_KIT_API || '').trim() || 'openai-completions';

  return {
    modelRef: buildModelRef(providerId, modelId),
    modelsJson: buildModelsJson(providerId, baseUrl, apiKey, modelId, api),
    authProfilesJson: buildAuthProfilesJson(providerId, apiKey),
  };
}

function updateAgentModelsInConfig({ configPath, targetName, modelRef }) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const agentList = Array.isArray(config.agents?.list)
    ? config.agents.list
    : Array.isArray(config.agents)
      ? config.agents
      : [];

  const targetIds = new Set([
    `${targetName}-pm`,
    `${targetName}-dev`,
    `${targetName}-qa`,
  ]);

  for (const agent of agentList) {
    if (targetIds.has(agent.id)) {
      agent.model = modelRef;
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

async function runSetup(configDir, context) {
  const envConfig = buildModelConfigFromEnv(process.env);
  if (!process.stdin.isTTY && !envConfig) {
    console.log(
      '\nNon-interactive environment detected; skipping product-kit setup. ' +
      'Set PRODUCT_KIT_PROVIDER_ID / PRODUCT_KIT_API_KEY / PRODUCT_KIT_MODEL_ID to run setup without prompts.\n',
    );
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(`\nSetting up ${context.targetName}...\n`);
    console.log('[1/1] 配置统一模型...');

    const modelConfig = envConfig || await askModelConfig(rl);
    const agentIds = [
      `${context.targetName}-pm`,
      `${context.targetName}-dev`,
      `${context.targetName}-qa`,
    ];

    for (const agentId of agentIds) {
      const modelPath = writeModelsJson(configDir, agentId, modelConfig.modelsJson);
      const authPath = writeAuthProfilesJson(configDir, agentId, modelConfig.authProfilesJson);
      console.log(`  ${agentId}: ${modelPath}`);
      console.log(`  ${agentId}: ${authPath}`);
    }

    updateAgentModelsInConfig({
      configPath: context.configPath,
      targetName: context.targetName,
      modelRef: modelConfig.modelRef,
    });
    console.log(`  已更新 ${context.configPath} 中的 agent model 字段`);

    console.log('\nSetup 完成!\n');
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  const configDir = process.argv[2];
  const context = JSON.parse(process.argv[3]);

  runSetup(configDir, context).catch((error) => {
    console.error(`Setup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_OPENAI_COMPAT_BASE_URL,
  buildAuthProfilesJson,
  buildModelRef,
  buildModelsJson,
  runSetup,
  updateAgentModelsInConfig,
  writeAuthProfilesJson,
  writeModelsJson,
};
