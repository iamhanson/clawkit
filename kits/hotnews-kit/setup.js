#!/usr/bin/env node
/**
 * Setup script for hotnews-kit
 * 1. Interactively configures models.json for two groups
 * 2. Downloads and installs tavily-search into the researcher workspace
 * 3. Appends TAVILY_API_KEY to the target .env file
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { extractZip } = require('../../cli/lib/archive');

const DEFAULT_TAVILY_SKILL_URL =
  'https://wry-manatee-359.convex.site/api/v1/download?slug=openclaw-tavily-search';
const DEFAULT_OPENAI_COMPAT_BASE_URL = 'https://maas-api.cn-huabei-1.xf-yun.com/v2';

function ask(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
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

function buildModelRef(providerId, modelId) {
  return `${providerId}/${modelId}`;
}

function writeModelsJson(configDir, agentId, modelsJson) {
  const filePath = path.join(configDir, 'agents', agentId, 'agent', 'models.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(modelsJson, null, 2) + '\n', 'utf8');
  return filePath;
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

function writeAuthProfilesJson(configDir, agentId, authProfilesJson) {
  const filePath = path.join(configDir, 'agents', agentId, 'agent', 'auth-profiles.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(authProfilesJson, null, 2) + '\n', 'utf8');
  return filePath;
}

async function askModelConfig(rl, groupName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`配置模型: ${groupName}`);
  console.log('='.repeat(60));

  const providerId = await ask(rl, '  Provider ID (例如 xunfeiMaaSKM25): ');
  const baseUrl = await ask(
    rl,
    `  Base URL (默认 ${DEFAULT_OPENAI_COMPAT_BASE_URL}): `,
  );
  const apiKey = await ask(rl, '  API Key: ');
  const modelId = await ask(rl, '  Model ID (例如 xopkimik25): ');
  const apiInput = await ask(rl, '  API 类型 (默认 openai-completions): ');
  const api = apiInput.trim() || 'openai-completions';

  const trimmedProviderId = providerId.trim();
  const trimmedModelId = modelId.trim();
  const trimmedBaseUrl = baseUrl.trim() || DEFAULT_OPENAI_COMPAT_BASE_URL;

  return {
    providerId: trimmedProviderId,
    apiKey: apiKey.trim(),
    modelRef: buildModelRef(trimmedProviderId, trimmedModelId),
    modelsJson: buildModelsJson(trimmedProviderId, trimmedBaseUrl, apiKey.trim(), trimmedModelId, api),
    authProfilesJson: buildAuthProfilesJson(trimmedProviderId, apiKey.trim()),
  };
}

function appendEnvVar(envPath, key, value) {
  fs.mkdirSync(path.dirname(envPath), { recursive: true });

  let prefix = '';
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf8');
    prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  }

  fs.appendFileSync(envPath, `${prefix}${key}=${value}\n`, 'utf8');
}

function resolveExtractedSkillDir(extractDir) {
  const entries = fs
    .readdirSync(extractDir, { withFileTypes: true })
    .filter((entry) => entry.name !== '__MACOSX');

  if (entries.length === 1 && entries[0].isDirectory()) {
    return path.join(extractDir, entries[0].name);
  }

  return extractDir;
}

async function downloadFile(source, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  if (/^file:\/\//.test(source)) {
    fs.copyFileSync(new URL(source), targetPath);
    return targetPath;
  }

  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to download ${source}: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    return targetPath;
  }

  fs.copyFileSync(path.resolve(source), targetPath);
  return targetPath;
}

async function installResearcherSkill({ configDir, targetName, downloadUrl = DEFAULT_TAVILY_SKILL_URL }) {
  const researcherWorkspace = path.join(configDir, `workspace-${targetName}-researcher`);
  const skillsDir = path.join(researcherWorkspace, 'skills');
  const zipPath = path.join(skillsDir, 'tavily-search.zip');
  const extractDir = path.join(skillsDir, '.tavily-search-extract');
  const skillTargetDir = path.join(skillsDir, 'tavily-search');

  fs.mkdirSync(skillsDir, { recursive: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  await downloadFile(downloadUrl, zipPath);
  extractZip(zipPath, extractDir);

  const extractedDir = resolveExtractedSkillDir(extractDir);
  fs.rmSync(skillTargetDir, { recursive: true, force: true });
  fs.cpSync(extractedDir, skillTargetDir, { recursive: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.rmSync(zipPath, { force: true });

  return skillTargetDir;
}

function updateAgentModelsInConfig({
  configPath,
  targetName,
  researcherEditorModelRef,
  writerModelRef,
}) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const agentList = Array.isArray(config.agents?.list)
    ? config.agents.list
    : Array.isArray(config.agents)
      ? config.agents
      : [];

  const researcherAndEditorIds = new Set([
    `${targetName}-researcher`,
    `${targetName}-editor`,
  ]);
  const writerIds = new Set([
    `${targetName}-toutiao-writer`,
    `${targetName}-xhs-writer`,
    `${targetName}-wechat-writer`,
    `${targetName}-douyin-writer`,
  ]);

  for (const agent of agentList) {
    if (researcherAndEditorIds.has(agent.id)) {
      agent.model = researcherEditorModelRef;
      continue;
    }

    if (writerIds.has(agent.id)) {
      agent.model = writerModelRef;
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

async function runSetup(configDir, context, env = process.env) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(`\nSetting up ${context.targetName}...\n`);

    const researcherAndEditor = [
      `${context.targetName}-researcher`,
      `${context.targetName}-editor`,
    ];

    const writers = [
      `${context.targetName}-toutiao-writer`,
      `${context.targetName}-xhs-writer`,
      `${context.targetName}-wechat-writer`,
      `${context.targetName}-douyin-writer`,
    ];

    console.log('[1/3] 配置模型...');
    console.log('\n需要配置两组模型:');
    console.log('  1. researcher + editor (搜索和审核)');
    console.log('  2. 4 个 writer (内容创作)');

    const researcherEditorModels = await askModelConfig(rl, 'researcher + editor (搜索和审核)');
    for (const agentId of researcherAndEditor) {
      const modelPath = writeModelsJson(configDir, agentId, researcherEditorModels.modelsJson);
      const authPath = writeAuthProfilesJson(configDir, agentId, researcherEditorModels.authProfilesJson);
      console.log(`  ${agentId}: ${modelPath}`);
      console.log(`  ${agentId}: ${authPath}`);
    }

    const writerModels = await askModelConfig(rl, '4 个 writer (今日头条/小红书/微信/抖音)');
    for (const agentId of writers) {
      const modelPath = writeModelsJson(configDir, agentId, writerModels.modelsJson);
      const authPath = writeAuthProfilesJson(configDir, agentId, writerModels.authProfilesJson);
      console.log(`  ${agentId}: ${modelPath}`);
      console.log(`  ${agentId}: ${authPath}`);
    }

    updateAgentModelsInConfig({
      configPath: context.configPath,
      targetName: context.targetName,
      researcherEditorModelRef: researcherEditorModels.modelRef,
      writerModelRef: writerModels.modelRef,
    });
    console.log(`  已更新 ${context.configPath} 中的 agent model 字段`);

    console.log('\n[2/3] 配置 Tavily API Key...');
    const tavilyApiKey = (await ask(rl, '  Tavily API Key: ')).trim();
    if (!tavilyApiKey) {
      throw new Error('Tavily API Key is required');
    }

    const envPath = path.join(configDir, '.env');
    appendEnvVar(envPath, 'TAVILY_API_KEY', tavilyApiKey);
    console.log(`  已追加到 ${envPath}`);

    console.log('\n[3/3] 安装 tavily-search skill...');
    const skillTargetDir = await installResearcherSkill({
      configDir,
      targetName: context.targetName,
      downloadUrl: env.HOTNEWS_TAVILY_SKILL_URL || DEFAULT_TAVILY_SKILL_URL,
    });
    console.log(`  tavily-search skill 已安装到 ${skillTargetDir}`);

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
  DEFAULT_TAVILY_SKILL_URL,
  appendEnvVar,
  buildAuthProfilesJson,
  buildModelRef,
  buildModelsJson,
  installResearcherSkill,
  runSetup,
  updateAgentModelsInConfig,
  writeAuthProfilesJson,
  writeModelsJson,
};
