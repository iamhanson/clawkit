const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  DEFAULT_OPENAI_COMPAT_BASE_URL,
  buildAuthProfilesJson,
  buildModelRef,
  buildModelsJson,
  runSetup,
  updateAgentModelsInConfig,
  writeAuthProfilesJson,
  writeModelsJson,
} = require('../kits/product-kit/setup');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'product-setup-test-'));
}

test('buildModelsJson uses default OpenAI-compatible endpoint', () => {
  const models = buildModelsJson(
    'xfyun-maas',
    DEFAULT_OPENAI_COMPAT_BASE_URL,
    'demo-key',
    'xopglm5',
    'openai-completions',
  );

  assert.equal(models.providers['xfyun-maas'].baseUrl, DEFAULT_OPENAI_COMPAT_BASE_URL);
  assert.equal(models.providers['xfyun-maas'].models[0].contextWindow, 120000);
  assert.equal(models.providers['xfyun-maas'].models[0].maxTokens, 40960);
});

test('buildAuthProfilesJson creates per-agent auth store', () => {
  const auth = buildAuthProfilesJson('xfyun-maas', 'demo-key');

  assert.deepEqual(auth, {
    version: 1,
    profiles: {
      'xfyun-maas:default': {
        type: 'api_key',
        provider: 'xfyun-maas',
        key: 'demo-key',
      },
    },
    order: {
      'xfyun-maas': ['xfyun-maas:default'],
    },
    lastGood: {
      'xfyun-maas': 'xfyun-maas:default',
    },
    usageStats: {},
  });
});

test('writeModelsJson and writeAuthProfilesJson keep separate files per agent', () => {
  const tempDir = makeTempDir();
  const modelPath = writeModelsJson(
    tempDir,
    'sandbox-pm',
    buildModelsJson(
      'xfyun-maas',
      DEFAULT_OPENAI_COMPAT_BASE_URL,
      'demo-key',
      'xopglm5',
      'openai-completions',
    ),
  );
  const authPath = writeAuthProfilesJson(
    tempDir,
    'sandbox-pm',
    buildAuthProfilesJson('xfyun-maas', 'demo-key'),
  );

  assert.equal(
    modelPath,
    path.join(tempDir, 'agents', 'sandbox-pm', 'agent', 'models.json'),
  );
  assert.equal(
    authPath,
    path.join(tempDir, 'agents', 'sandbox-pm', 'agent', 'auth-profiles.json'),
  );
  assert.equal(fs.existsSync(modelPath), true);
  assert.equal(fs.existsSync(authPath), true);
});

test('updateAgentModelsInConfig applies one shared model ref to pm/dev/qa', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        agents: {
          defaults: { workspace: '/tmp/default' },
          list: [
            { id: 'sandbox-pm', workspace: '/tmp/pm', subagents: { allowAgents: [] } },
            { id: 'sandbox-dev', workspace: '/tmp/dev', subagents: { allowAgents: [] } },
            { id: 'sandbox-qa', workspace: '/tmp/qa', subagents: { allowAgents: [] } },
            { id: 'other-agent', workspace: '/tmp/other', subagents: { allowAgents: [] } },
          ],
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  const modelRef = buildModelRef('xfyun-maas', 'xopglm5');
  updateAgentModelsInConfig({
    configPath,
    targetName: 'sandbox',
    modelRef,
  });

  const updated = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.equal(updated.agents.list.find((agent) => agent.id === 'sandbox-pm').model, modelRef);
  assert.equal(updated.agents.list.find((agent) => agent.id === 'sandbox-dev').model, modelRef);
  assert.equal(updated.agents.list.find((agent) => agent.id === 'sandbox-qa').model, modelRef);
  assert.equal(updated.agents.list.find((agent) => agent.id === 'other-agent').model, undefined);
});

test('runSetup skips gracefully in non-interactive mode without env config', async () => {
  const tempDir = makeTempDir();
  const originalDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', {
    value: false,
    configurable: true,
  });

  try {
    await runSetup(tempDir, {
      targetName: 'sandbox',
      configPath: path.join(tempDir, 'openclaw.json'),
    });
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', originalDescriptor);
    }
  }
});
