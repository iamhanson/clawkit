const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDeploymentPlan, executeDeployment } = require('../cli/lib/deployer');
const { loadKit } = require('../cli/lib/kit-loader');

const kitsDir = path.resolve(__dirname, '..', 'kits');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'deployer-test-'));
}

function loadProductKit() {
  return loadKit('product-kit', kitsDir);
}

test('createDeploymentPlan rewrites ids, routes, and absolute paths', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        agents: {
          defaults: { workspace: '/tmp/default-workspace' },
          list: [{ id: 'existing', workspace: '/tmp/existing-workspace', subagents: { allowAgents: [] } }],
        },
      },
      null,
      2,
    ),
  );

  const kit = loadProductKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: false,
    force: false,
  });

  assert.equal(plan.mode, 'dry-run');
  assert.equal(plan.targetConfigDir, tempDir);
  assert.equal(plan.targetName, 'product-kit');
  assert.deepEqual(plan.deployedAgentIds, [
    'product-kit-pm',
    'product-kit-dev',
    'product-kit-qa',
  ]);
  assert.match(plan.backupPath, /openclaw\.json\.bak\./);
  assert.equal(path.isAbsolute(plan.mergedConfig.agents.list[1].workspace), true);
  assert.equal(plan.managedSoulFiles.pm, path.join(tempDir, 'workspace-product-kit-pm', 'SOUL.md'));
  assert.equal(plan.managedAgents[0].workspace, path.join(tempDir, 'workspace-product-kit-pm'));
  assert.equal(plan.managedAgents[1].workspace, path.join(tempDir, 'workspace-product-kit-dev'));
  assert.equal(plan.managedAgents[2].workspace, path.join(tempDir, 'workspace-product-kit-qa'));
  assert.equal(plan.sharedWorkspacePath, path.join(tempDir, 'workspace-product-kit-shared'));
  assert.deepEqual(
    plan.mergedConfig.agents.list.slice(-3).map((agent) => agent.id),
    ['product-kit-pm', 'product-kit-dev', 'product-kit-qa'],
  );
  assert.deepEqual(
    plan.mergedConfig.agents.list.find((agent) => agent.id === 'product-kit-dev').subagents.allowAgents,
    ['product-kit-pm', 'product-kit-qa'],
  );
});

test('createDeploymentPlan supports a custom target name', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(configPath, JSON.stringify({ agents: { defaults: {}, list: [] } }, null, 2));

  const kit = loadProductKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: false,
    force: false,
    targetName: 'sandbox',
  });

  assert.deepEqual(plan.deployedAgentIds, ['sandbox-pm', 'sandbox-dev', 'sandbox-qa']);
  assert.equal(plan.managedSoulFiles.pm, path.join(tempDir, 'workspace-sandbox-pm', 'SOUL.md'));
  assert.equal(plan.managedAgents[0].workspace, path.join(tempDir, 'workspace-sandbox-pm'));
  assert.equal(plan.managedAgents[1].workspace, path.join(tempDir, 'workspace-sandbox-dev'));
  assert.equal(plan.managedAgents[2].workspace, path.join(tempDir, 'workspace-sandbox-qa'));
  assert.equal(plan.sharedWorkspacePath, path.join(tempDir, 'workspace-sandbox-shared'));
  assert.deepEqual(plan.managedAgents[1].subagents.allowAgents, ['sandbox-pm', 'sandbox-qa']);
});

test('dry-run does not write backup or target soul files', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(configPath, JSON.stringify({ agents: [] }, null, 2));

  const kit = loadProductKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: false,
    force: false,
  });

  const result = executeDeployment(plan);

  assert.equal(result.written, false);
  assert.equal(fs.existsSync(plan.backupPath), false);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-product-kit-pm', 'SOUL.md')), false);
});

test('apply mode writes backup, soul files, workspace, and managed-only agent config', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        project: 'keep-me',
        agents: {
          defaults: { workspace: '/tmp/default-workspace' },
          list: [{ id: 'existing-agent', workspace: '/tmp/existing-workspace', subagents: { allowAgents: [] } }],
        },
      },
      null,
      2,
    ),
  );

  const kit = loadProductKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: true,
    force: false,
  });

  const result = executeDeployment(plan);
  const mergedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  assert.equal(result.written, true);
  assert.equal(fs.existsSync(plan.backupPath), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-product-kit-pm', 'SOUL.md')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-product-kit-dev', 'SOUL.md')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-product-kit-qa', 'SOUL.md')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-product-kit-pm')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-product-kit-dev')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-product-kit-qa')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-product-kit-shared', 'briefs', '.gitkeep')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-product-kit-shared', '.DS_Store')), false);
  assert.equal(mergedConfig.project, 'keep-me');
  assert.equal(Array.isArray(mergedConfig.agents.list), true);
  assert.equal(mergedConfig.agents.some, undefined);
  assert.equal(mergedConfig.agents.list.some((agent) => agent.id === 'existing-agent'), true);
  assert.equal(mergedConfig.agents.list.length, 4);
  assert.equal(mergedConfig.agents.list.some((agent) => agent.id === 'product-kit-pm'), true);
  assert.deepEqual(
    mergedConfig.agents.list.find((agent) => agent.id === 'product-kit-pm').subagents.allowAgents,
    ['product-kit-dev'],
  );
  assert.equal(
    mergedConfig.agents.list.find((agent) => agent.id === 'product-kit-pm').workspace,
    path.join(tempDir, 'workspace-product-kit-pm'),
  );
  assert.equal(
    mergedConfig.agents.list.find((agent) => agent.id === 'product-kit-dev').workspace,
    path.join(tempDir, 'workspace-product-kit-dev'),
  );
  assert.equal(
    mergedConfig.agents.list.find((agent) => agent.id === 'product-kit-qa').workspace,
    path.join(tempDir, 'workspace-product-kit-qa'),
  );
});

test('merge preserves unrelated agents and replaces/appends managed agents', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        agents: {
          defaults: { workspace: '/tmp/default-workspace' },
          list: [
            { id: 'existing-agent', workspace: '/tmp/existing-workspace', subagents: { allowAgents: [] } },
            { id: 'product-kit-pm', workspace: '/tmp/old-workspace', subagents: { allowAgents: [] } },
          ],
        },
      },
      null,
      2,
    ),
  );

  const kit = loadProductKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: true,
    force: true,
  });

  executeDeployment(plan);

  const mergedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const agentIds = mergedConfig.agents.list.map((agent) => agent.id);

  assert.deepEqual(agentIds, ['existing-agent', 'product-kit-pm', 'product-kit-dev', 'product-kit-qa']);
  assert.equal(
    mergedConfig.agents.list.find((agent) => agent.id === 'product-kit-pm').workspace,
    path.join(tempDir, 'workspace-product-kit-pm'),
  );
  assert.deepEqual(
    mergedConfig.agents.list.find((agent) => agent.id === 'product-kit-pm').subagents.allowAgents,
    ['product-kit-dev'],
  );
});

test('apply mode normalizes legacy agents array into object schema and preserves legacy entries', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        metadata: { keep: true },
        agents: [{ id: 'legacy-agent', workspace: '/tmp/legacy', subagents: { allowAgents: [] } }],
      },
      null,
      2,
    ),
  );

  const kit = loadProductKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: true,
    force: false,
    targetName: 'sandbox',
  });

  executeDeployment(plan);

  const mergedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  assert.equal(Array.isArray(mergedConfig.agents), false);
  assert.equal(Array.isArray(mergedConfig.agents.list), true);
  assert.deepEqual(mergedConfig.agents.defaults || {}, {});
  assert.equal(mergedConfig.metadata.keep, true);
  assert.equal(mergedConfig.agents.list.some((agent) => agent.id === 'legacy-agent'), true);
  assert.deepEqual(
    mergedConfig.agents.list.map((agent) => agent.id),
    ['legacy-agent', 'sandbox-pm', 'sandbox-dev', 'sandbox-qa'],
  );
});

test('createDeploymentPlan rejects missing config file', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'missing-openclaw.json');

  const kit = loadProductKit();
  assert.throws(
    () =>
      createDeploymentPlan({
        kit,
        configPath,
        apply: false,
        force: false,
      }),
    /Target openclaw\.json does not exist/,
  );
});

test('apply mode rejects existing managed files without force', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');
  const existingPromptPath = path.join(tempDir, 'workspace-product-kit-pm', 'SOUL.md');

  fs.writeFileSync(configPath, JSON.stringify({ agents: { defaults: {}, list: [] } }, null, 2));
  fs.mkdirSync(path.dirname(existingPromptPath), { recursive: true });
  fs.writeFileSync(existingPromptPath, 'existing prompt', 'utf8');

  const kit = loadProductKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: true,
    force: false,
  });

  assert.throws(() => executeDeployment(plan), /Target file already exists/);
});

test('apply mode supports a custom target name', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(configPath, JSON.stringify({ agents: { defaults: {}, list: [] } }, null, 2));

  const kit = loadProductKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: true,
    force: false,
    targetName: 'sandbox',
  });

  const result = executeDeployment(plan);
  const mergedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  assert.equal(result.written, true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-sandbox-pm', 'SOUL.md')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-sandbox-dev', 'SOUL.md')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-sandbox-qa', 'SOUL.md')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-sandbox-pm')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-sandbox-dev')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-sandbox-qa')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'workspace-sandbox-shared', 'briefs', '.gitkeep')), true);
  assert.equal(mergedConfig.agents.list.some((agent) => agent.id === 'sandbox-pm'), true);
  assert.equal(mergedConfig.agents.list.some((agent) => agent.id === 'sandbox-dev'), true);
  assert.equal(mergedConfig.agents.list.some((agent) => agent.id === 'sandbox-qa'), true);
  assert.equal(
    mergedConfig.agents.list.find((agent) => agent.id === 'sandbox-pm').workspace,
    path.join(tempDir, 'workspace-sandbox-pm'),
  );
});

test('pm and dev soul files require internal downstream invocation', () => {
  const pmSoul = fs.readFileSync(
    path.join(__dirname, '..', 'kits', 'product-kit', 'agents', 'pm', 'SOUL.md'),
    'utf8',
  );
  const devSoul = fs.readFileSync(
    path.join(__dirname, '..', 'kits', 'product-kit', 'agents', 'dev', 'SOUL.md'),
    'utf8',
  );

  assert.match(pmSoul, /Do not ask the boss to start, summon, or prepare `dev`/);
  assert.match(pmSoul, /If `dev` is allowed, invoke `dev` yourself and continue the workflow/);
  assert.match(devSoul, /Do not ask `pm` or the boss to start, summon, or prepare `qa`/);
  assert.match(devSoul, /If `qa` is allowed, invoke `qa` yourself and continue the workflow/);
});
