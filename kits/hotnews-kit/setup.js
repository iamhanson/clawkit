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
const { spawnSync } = require('child_process');

const DEFAULT_TAVILY_SKILL_URL =
  'https://wry-manatee-359.convex.site/api/v1/download?slug=openclaw-tavily-search';

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
            contextWindow: 200000,
            maxTokens: 8192,
            api,
          },
        ],
      },
    },
  };
}

function writeModelsJson(configDir, agentId, modelsJson) {
  const filePath = path.join(configDir, 'agents', agentId, 'agent', 'models.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(modelsJson, null, 2) + '\n', 'utf8');
  return filePath;
}

async function askModelConfig(rl, groupName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`配置模型: ${groupName}`);
  console.log('='.repeat(60));

  const providerId = await ask(rl, '  Provider ID (例如 xunfeiMaaSKM25): ');
  const baseUrl = await ask(rl, '  Base URL (例如 https://maas-api.cn-huabei-1.xf-yun.com/v2): ');
  const apiKey = await ask(rl, '  API Key: ');
  const modelId = await ask(rl, '  Model ID (例如 xopkimik25): ');
  const apiInput = await ask(rl, '  API 类型 (默认 openai-completions): ');
  const api = apiInput.trim() || 'openai-completions';

  return buildModelsJson(providerId.trim(), baseUrl.trim(), apiKey.trim(), modelId.trim(), api);
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

function installResearcherSkill({ configDir, targetName, downloadUrl = DEFAULT_TAVILY_SKILL_URL }) {
  const researcherWorkspace = path.join(configDir, `workspace-${targetName}-researcher`);
  const skillsDir = path.join(researcherWorkspace, 'skills');
  const zipPath = path.join(skillsDir, 'tavily-search.zip');
  const extractDir = path.join(skillsDir, '.tavily-search-extract');
  const skillTargetDir = path.join(skillsDir, 'tavily-search');

  fs.mkdirSync(skillsDir, { recursive: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  const downloadResult = spawnSync('curl', ['-fsSL', '-o', zipPath, downloadUrl], {
    encoding: 'utf8',
  });

  if (downloadResult.status !== 0) {
    throw new Error(`Failed to download tavily-search skill from ${downloadUrl}`);
  }

  const unzipResult = spawnSync('unzip', ['-qo', zipPath, '-d', extractDir], {
    encoding: 'utf8',
  });

  if (unzipResult.status !== 0) {
    throw new Error(`Failed to unzip tavily-search skill archive: ${unzipResult.stderr || unzipResult.stdout}`);
  }

  const extractedDir = resolveExtractedSkillDir(extractDir);
  fs.rmSync(skillTargetDir, { recursive: true, force: true });
  fs.cpSync(extractedDir, skillTargetDir, { recursive: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.rmSync(zipPath, { force: true });

  return skillTargetDir;
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
      const filePath = writeModelsJson(configDir, agentId, researcherEditorModels);
      console.log(`  ${agentId}: ${filePath}`);
    }

    const writerModels = await askModelConfig(rl, '4 个 writer (今日头条/小红书/微信/抖音)');
    for (const agentId of writers) {
      const filePath = writeModelsJson(configDir, agentId, writerModels);
      console.log(`  ${agentId}: ${filePath}`);
    }

    console.log('\n[2/3] 配置 Tavily API Key...');
    const tavilyApiKey = (await ask(rl, '  Tavily API Key: ')).trim();
    if (!tavilyApiKey) {
      throw new Error('Tavily API Key is required');
    }

    const envPath = path.join(configDir, '.env');
    appendEnvVar(envPath, 'TAVILY_API_KEY', tavilyApiKey);
    console.log(`  已追加到 ${envPath}`);

    console.log('\n[3/3] 安装 tavily-search skill...');
    const skillTargetDir = installResearcherSkill({
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
  DEFAULT_TAVILY_SKILL_URL,
  appendEnvVar,
  buildModelsJson,
  installResearcherSkill,
  runSetup,
  writeModelsJson,
};
