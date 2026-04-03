const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  appendEnvVar,
  installResearcherSkill,
  updateAgentModelsInConfig,
} = require('../kits/hotnews-kit/setup');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hotnews-setup-test-'));
}

function createSkillArchive(zipPath) {
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hotnews-skill-src-'));
  const rootDir = path.join(sourceDir, 'openclaw-tavily-search');
  fs.mkdirSync(rootDir, { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'SKILL.md'), '# Tavily Search\n', 'utf8');

  const result = spawnSync('zip', ['-qr', zipPath, 'openclaw-tavily-search'], {
    cwd: sourceDir,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`Failed to create zip fixture: ${result.stderr || result.stdout}`);
  }
}

test('appendEnvVar creates .env when missing', () => {
  const tempDir = makeTempDir();
  const envPath = path.join(tempDir, '.env');

  appendEnvVar(envPath, 'TAVILY_API_KEY', 'test-key');

  assert.equal(fs.readFileSync(envPath, 'utf8'), 'TAVILY_API_KEY=test-key\n');
});

test('appendEnvVar appends to existing .env', () => {
  const tempDir = makeTempDir();
  const envPath = path.join(tempDir, '.env');
  fs.writeFileSync(envPath, 'EXISTING_KEY=1\n', 'utf8');

  appendEnvVar(envPath, 'TAVILY_API_KEY', 'test-key');

  assert.equal(fs.readFileSync(envPath, 'utf8'), 'EXISTING_KEY=1\nTAVILY_API_KEY=test-key\n');
});

test('installResearcherSkill downloads and extracts into tavily-search directory', () => {
  const tempDir = makeTempDir();
  const configDir = path.join(tempDir, '.openclaw');
  const zipPath = path.join(tempDir, 'tavily-search.zip');
  const targetName = 'sandbox';

  fs.mkdirSync(path.join(configDir, `workspace-${targetName}-researcher`), { recursive: true });
  createSkillArchive(zipPath);

  installResearcherSkill({
    configDir,
    targetName,
    downloadUrl: `file://${zipPath}`,
  });

  const installedSkillDir = path.join(
    configDir,
    `workspace-${targetName}-researcher`,
    'skills',
    'tavily-search',
  );

  assert.equal(fs.existsSync(path.join(installedSkillDir, 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(configDir, `workspace-${targetName}-researcher`, 'skills', 'tavily-search.zip')), false);
});

test('updateAgentModelsInConfig writes grouped model ids into agents.list', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        agents: {
          defaults: {
            workspace: '/tmp/default',
          },
          list: [
            { id: 'sandbox-researcher', workspace: '/tmp/r', subagents: { allowAgents: [] } },
            { id: 'sandbox-editor', workspace: '/tmp/e', subagents: { allowAgents: [] } },
            { id: 'sandbox-toutiao-writer', workspace: '/tmp/t', subagents: { allowAgents: [] } },
            { id: 'sandbox-xhs-writer', workspace: '/tmp/x', subagents: { allowAgents: [] } },
            { id: 'sandbox-wechat-writer', workspace: '/tmp/w', subagents: { allowAgents: [] } },
            { id: 'sandbox-douyin-writer', workspace: '/tmp/d', subagents: { allowAgents: [] } },
            { id: 'other-agent', workspace: '/tmp/o', subagents: { allowAgents: [] } },
          ],
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  updateAgentModelsInConfig({
    configPath,
    targetName: 'sandbox',
    researcherEditorModelRef: 'provider-a/model-a',
    writerModelRef: 'provider-b/model-b',
  });

  const updated = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  assert.equal(updated.agents.defaults.workspace, '/tmp/default');
  assert.equal(updated.agents.list.find((agent) => agent.id === 'sandbox-researcher').model, 'provider-a/model-a');
  assert.equal(updated.agents.list.find((agent) => agent.id === 'sandbox-editor').model, 'provider-a/model-a');
  assert.equal(updated.agents.list.find((agent) => agent.id === 'sandbox-toutiao-writer').model, 'provider-b/model-b');
  assert.equal(updated.agents.list.find((agent) => agent.id === 'sandbox-xhs-writer').model, 'provider-b/model-b');
  assert.equal(updated.agents.list.find((agent) => agent.id === 'sandbox-wechat-writer').model, 'provider-b/model-b');
  assert.equal(updated.agents.list.find((agent) => agent.id === 'sandbox-douyin-writer').model, 'provider-b/model-b');
  assert.equal(updated.agents.list.find((agent) => agent.id === 'other-agent').model, undefined);
});
