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

function loadHotnewsKit() {
  return loadKit('hotnews-kit', kitsDir);
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

test('createDeploymentPlan carries per-agent tools.profile from kit metadata', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(configPath, JSON.stringify({ agents: { defaults: {}, list: [] } }, null, 2));

  const kit = loadHotnewsKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: false,
    force: false,
  });

  const researcher = plan.managedAgents.find((agent) => agent.id === 'hotnews-kit-researcher');
  const editor = plan.managedAgents.find((agent) => agent.id === 'hotnews-kit-editor');

  assert.deepEqual(researcher.tools, { profile: 'full' });
  assert.deepEqual(editor.tools, { profile: 'full' });
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

test('executeDeployment runs setup script if present', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(configPath, JSON.stringify({ agents: { defaults: {}, list: [] } }, null, 2));

  // Create a temporary kit with a setup script
  const kitDir = path.join(tempDir, 'kits', 'setup-test-kit');
  fs.mkdirSync(path.join(kitDir, 'agents', 'alpha'), { recursive: true });

  // Write a soul file for the agent
  fs.writeFileSync(path.join(kitDir, 'agents', 'alpha', 'SOUL.md'), '# Alpha Agent\n', 'utf8');

  // Write kit.json with setup field
  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify(
      {
        name: 'setup-test-kit',
        agents: [{ id: 'alpha', role: 'Alpha', soulFile: 'agents/alpha/SOUL.md', allowAgents: [] }],
        setup: 'setup.js',
      },
      null,
      2,
    ),
  );

  // Write setup.js that creates a marker file in the target config dir
  const markerContent = 'setup-was-executed';
  fs.writeFileSync(
    path.join(kitDir, 'setup.js'),
    [
      'const fs = require("node:fs");',
      'const path = require("node:path");',
      'const targetConfigDir = process.argv[2];',
      `fs.writeFileSync(path.join(targetConfigDir, "setup-ran.txt"), "${markerContent}", "utf8");`,
    ].join('\n'),
    'utf8',
  );

  // Load the kit from the temp kits directory
  const kit = loadKit('setup-test-kit', path.join(tempDir, 'kits'));
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: true,
    force: false,
  });

  executeDeployment(plan);

  // Verify the setup script was executed
  const markerPath = path.join(tempDir, 'setup-ran.txt');
  assert.equal(fs.existsSync(markerPath), true, 'setup-ran.txt should exist after deployment');
  assert.equal(fs.readFileSync(markerPath, 'utf8'), markerContent);
});

test('dry-run mode does not execute setup script', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');

  fs.writeFileSync(configPath, JSON.stringify({ agents: { defaults: {}, list: [] } }, null, 2));

  // Create a temporary kit with a setup script
  const kitDir = path.join(tempDir, 'kits', 'setup-dryrun-kit');
  fs.mkdirSync(path.join(kitDir, 'agents', 'alpha'), { recursive: true });

  fs.writeFileSync(path.join(kitDir, 'agents', 'alpha', 'SOUL.md'), '# Alpha Agent\n', 'utf8');

  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify(
      {
        name: 'setup-dryrun-kit',
        agents: [{ id: 'alpha', role: 'Alpha', soulFile: 'agents/alpha/SOUL.md', allowAgents: [] }],
        setup: 'setup.js',
      },
      null,
      2,
    ),
  );

  // Setup script that would create a marker file
  fs.writeFileSync(
    path.join(kitDir, 'setup.js'),
    [
      'const fs = require("node:fs");',
      'const path = require("node:path");',
      'const targetConfigDir = process.argv[2];',
      'fs.writeFileSync(path.join(targetConfigDir, "setup-ran.txt"), "should-not-exist", "utf8");',
    ].join('\n'),
    'utf8',
  );

  const kit = loadKit('setup-dryrun-kit', path.join(tempDir, 'kits'));
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: false,
    force: false,
  });

  executeDeployment(plan);

  // Verify the setup script was NOT executed
  const markerPath = path.join(tempDir, 'setup-ran.txt');
  assert.equal(fs.existsSync(markerPath), false, 'setup-ran.txt should not exist in dry-run mode');
});

test('apply mode copies main auth-profiles.json into managed agent dirs', () => {
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');
  const mainAuthDir = path.join(tempDir, 'agents', 'main', 'agent');
  const mainAuthPath = path.join(mainAuthDir, 'auth-profiles.json');

  fs.writeFileSync(configPath, JSON.stringify({ agents: { defaults: {}, list: [] } }, null, 2));
  fs.mkdirSync(mainAuthDir, { recursive: true });
  fs.writeFileSync(
    mainAuthPath,
    JSON.stringify({ version: 1, profiles: { demo: { type: 'api_key', key: 'demo-key' } } }, null, 2),
    'utf8',
  );

  const kit = loadProductKit();
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: true,
    force: false,
  });

  executeDeployment(plan);

  const pmAuthPath = path.join(tempDir, 'agents', 'product-kit-pm', 'agent', 'auth-profiles.json');
  const devAuthPath = path.join(tempDir, 'agents', 'product-kit-dev', 'agent', 'auth-profiles.json');
  const qaAuthPath = path.join(tempDir, 'agents', 'product-kit-qa', 'agent', 'auth-profiles.json');

  assert.equal(fs.existsSync(pmAuthPath), true);
  assert.equal(fs.existsSync(devAuthPath), true);
  assert.equal(fs.existsSync(qaAuthPath), true);
  assert.equal(fs.readFileSync(pmAuthPath, 'utf8'), fs.readFileSync(mainAuthPath, 'utf8'));
});
