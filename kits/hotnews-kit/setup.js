#!/usr/bin/env node
/**
 * Setup script for hotnews-kit
 * 1. Interactively configures models.json for two groups
 * 2. Installs tavily-search skill for researcher
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const configDir = process.argv[2];
const context = JSON.parse(process.argv[3]);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(prompt) {
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

function writeModelsJson(agentId, modelsJson) {
  const filePath = path.join(configDir, 'agents', agentId, 'agent', 'models.json');
  fs.writeFileSync(filePath, JSON.stringify(modelsJson, null, 2) + '\n', 'utf8');
  return filePath;
}

async function askModelConfig(groupName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`配置模型: ${groupName}`);
  console.log('='.repeat(60));

  const providerId = await ask('  Provider ID (例如 xunfeiMaaSKM25): ');
  const baseUrl = await ask('  Base URL (例如 https://maas-api.cn-huabei-1.xf-yun.com/v2): ');
  const apiKey = await ask('  API Key: ');
  const modelId = await ask('  Model ID (例如 xopkimik25): ');
  const apiInput = await ask('  API 类型 (默认 openai-completions): ');
  const api = apiInput.trim() || 'openai-completions';

  return buildModelsJson(providerId.trim(), baseUrl.trim(), apiKey.trim(), modelId.trim(), api);
}

async function main() {
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

  // --- Step 1: Configure models interactively ---

  console.log('[1/2] 配置模型...');
  console.log('\n需要配置两组模型:');
  console.log('  1. researcher + editor (搜索和审核)');
  console.log('  2. 4 个 writer (内容创作)');

  // Group 1: researcher + editor
  const researcherEditorModels = await askModelConfig('researcher + editor (搜索和审核)');

  for (const agentId of researcherAndEditor) {
    const filePath = writeModelsJson(agentId, researcherEditorModels);
    console.log(`  ${agentId}: ${filePath}`);
  }

  // Group 2: 4 writers
  const writerModels = await askModelConfig('4 个 writer (今日头条/小红书/微信/抖音)');

  for (const agentId of writers) {
    const filePath = writeModelsJson(agentId, writerModels);
    console.log(`  ${agentId}: ${filePath}`);
  }

  // --- Step 2: Install tavily-search skill ---

  console.log('\n[2/2] 安装 tavily-search skill...');

  const researcherWorkspace = path.join(configDir, `workspace-${context.targetName}-researcher`);
  const skillsDir = path.join(researcherWorkspace, 'skills');
  const skillTargetDir = path.join(skillsDir, 'openclaw-tavily-search');
  const SKILL_REPO = 'jacky1n7/openclaw-tavily-search';
  const SKILL_URL = `https://github.com/${SKILL_REPO}/archive/refs/heads/main.zip`;

  try {
    fs.mkdirSync(skillsDir, { recursive: true });

    const zipPath = path.join(skillsDir, 'tavily-search.zip');
    const downloadResult = spawnSync('curl', ['-sL', '-o', zipPath, SKILL_URL], {
      stdio: 'inherit',
    });

    if (downloadResult.status !== 0) {
      throw new Error('Failed to download');
    }

    const unzipResult = spawnSync('unzip', ['-qo', zipPath, '-d', skillsDir], {
      stdio: 'inherit',
    });

    if (unzipResult.status !== 0) {
      throw new Error('Failed to unzip');
    }

    const extractedDir = path.join(skillsDir, 'openclaw-tavily-search-main');
    if (fs.existsSync(skillTargetDir)) {
      fs.rmSync(skillTargetDir, { recursive: true });
    }
    fs.renameSync(extractedDir, skillTargetDir);
    fs.unlinkSync(zipPath);

    console.log(`  tavily-search skill 已安装到 ${skillTargetDir}`);
  } catch (error) {
    console.warn(`  Warning: 无法自动安装 tavily-search skill`);
    console.warn(`  Error: ${error.message}`);
    console.warn(`  请手动安装:`);
    console.warn(`  1. 下载 https://github.com/${SKILL_REPO}`);
    console.warn(`  2. 解压到 ${skillTargetDir}`);
  }

  rl.close();
  console.log('\nSetup 完成!\n');
}

main().catch((error) => {
  console.error(`Setup failed: ${error.message}`);
  rl.close();
  process.exitCode = 1;
});
