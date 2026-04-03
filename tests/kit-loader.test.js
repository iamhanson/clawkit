const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { listKits, loadKit, validateKit } = require('../cli/lib/kit-loader');

const kitsDir = path.resolve(__dirname, '..', 'kits');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kit-loader-test-'));
}

test('listKits returns product-kit', () => {
  const kits = listKits(kitsDir);
  assert.equal(kits.length >= 1, true);
  const productKit = kits.find((kit) => kit.name === 'product-kit');
  assert.notEqual(productKit, undefined);
  assert.equal(productKit.displayName, 'Product Development Workflow');
  assert.equal(typeof productKit.description, 'string');
});

test('loadKit succeeds for product-kit', () => {
  const kit = loadKit('product-kit', kitsDir);
  assert.equal(kit.name, 'product-kit');
  assert.equal(typeof kit.kitDir, 'string');
  assert.equal(typeof kit.metadata, 'object');
  assert.equal(typeof kit.config, 'object');
  assert.equal(Array.isArray(kit.metadata.agents), true);
  assert.equal(kit.metadata.agents.length, 3);
  assert.equal(kit.metadata.agents[0].id, 'pm');
  assert.equal(kit.metadata.agents[1].id, 'dev');
  assert.equal(kit.metadata.agents[2].id, 'qa');
  assert.deepEqual(kit.metadata.agents[0].tools, { profile: 'full' });
  assert.deepEqual(kit.metadata.agents[1].tools, { profile: 'full' });
  assert.deepEqual(kit.metadata.agents[2].tools, { profile: 'full' });
  assert.deepEqual(kit.config.agents.defaults, {});
  assert.deepEqual(
    kit.config.agents.list.find((agent) => agent.id === 'dev').subagents.allowAgents,
    ['pm', 'qa'],
  );
});

test('loadKit throws for unknown kit', () => {
  assert.throws(
    () => loadKit('nonexistent-kit', kitsDir),
    /Kit "nonexistent-kit" not found/,
  );
});

test('validateKit passes for valid kit', () => {
  const kit = loadKit('product-kit', kitsDir);
  const result = validateKit(kit);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('loadKit succeeds without openclaw.json when kit.json defines routing inline', () => {
  const tempDir = makeTempDir();
  const kitDir = path.join(tempDir, 'inline-kit');
  fs.mkdirSync(path.join(kitDir, 'agents', 'agent1'), { recursive: true });
  fs.writeFileSync(path.join(kitDir, 'agents', 'agent1', 'SOUL.md'), '# Agent 1');

  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'inline-kit',
      agents: [
        {
          id: 'agent1',
          role: 'Agent One',
          soulFile: 'agents/agent1/SOUL.md',
          allowAgents: [],
        },
      ],
    }),
  );

  const kit = loadKit('inline-kit', tempDir);

  assert.deepEqual(kit.config, {
    agents: {
      defaults: {},
      list: [{ id: 'agent1', subagents: { allowAgents: [] } }],
    },
  });
});

test('validateKit fails for missing soul file', () => {
  const tempDir = makeTempDir();
  const kitDir = path.join(tempDir, 'test-kit');
  fs.mkdirSync(kitDir, { recursive: true });

  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit',
      agents: [
        { id: 'agent1', soulFile: 'agents/agent1/SOUL.md', allowAgents: [] },
      ],
    }),
  );

  const kit = loadKit('test-kit', tempDir);
  const result = validateKit(kit);

  assert.equal(result.valid, false);
  assert.equal(result.errors.length >= 1, true);
  assert.match(result.errors[0], /soulFile not found/);
});

test('validateKit fails for missing shared workspace', () => {
  const tempDir = makeTempDir();
  const kitDir = path.join(tempDir, 'test-kit');
  fs.mkdirSync(kitDir, { recursive: true });

  const agentDir = path.join(kitDir, 'agents', 'agent1');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, 'SOUL.md'), '# Agent 1');

  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit',
      agents: [
        { id: 'agent1', soulFile: 'agents/agent1/SOUL.md', allowAgents: [] },
      ],
      sharedWorkspace: 'workspace-shared',
    }),
  );

  const kit = loadKit('test-kit', tempDir);
  const result = validateKit(kit);

  assert.equal(result.valid, false);
  assert.equal(result.errors.length >= 1, true);
  assert.match(result.errors[0], /Shared workspace directory not found/);
});

test('validateKit fails for missing setup script', () => {
  const tempDir = makeTempDir();
  const kitDir = path.join(tempDir, 'test-kit');
  fs.mkdirSync(kitDir, { recursive: true });

  const agentDir = path.join(kitDir, 'agents', 'agent1');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, 'SOUL.md'), '# Agent 1');

  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit',
      agents: [
        { id: 'agent1', soulFile: 'agents/agent1/SOUL.md', allowAgents: [] },
      ],
      setup: 'setup.js',
    }),
  );

  const kit = loadKit('test-kit', tempDir);
  const result = validateKit(kit);

  assert.equal(result.valid, false);
  assert.equal(result.errors.length >= 1, true);
  assert.match(result.errors[0], /Setup script not found: setup\.js/);
});

test('loadKit throws when allowAgents is missing and no legacy openclaw.json exists', () => {
  const tempDir = makeTempDir();
  const kitDir = path.join(tempDir, 'test-kit');
  fs.mkdirSync(path.join(kitDir, 'agents', 'pm'), { recursive: true });
  fs.writeFileSync(path.join(kitDir, 'agents', 'pm', 'SOUL.md'), '# PM');

  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit',
      agents: [
        { id: 'pm', role: 'PM', soulFile: 'agents/pm/SOUL.md' },
      ],
    }),
  );

  assert.throws(
    () => loadKit('test-kit', tempDir),
    /must define allowAgents for every agent in kit\.json/,
  );
});

test('validateKit fails when kit.json has duplicate agent ids', () => {
  const tempDir = makeTempDir();
  const kitDir = path.join(tempDir, 'test-kit');
  fs.mkdirSync(path.join(kitDir, 'agents', 'pm'), { recursive: true });
  fs.writeFileSync(path.join(kitDir, 'agents', 'pm', 'SOUL.md'), '# PM');

  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit',
      agents: [
        { id: 'pm', role: 'PM', soulFile: 'agents/pm/SOUL.md', allowAgents: [] },
        { id: 'pm', role: 'PM duplicate', soulFile: 'agents/pm/SOUL.md', allowAgents: [] },
      ],
    }),
  );

  const kit = loadKit('test-kit', tempDir);
  const result = validateKit(kit);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /Duplicate agent id in kit\.json: "pm"/);
});

test('validateKit fails when allowAgents references unknown agents', () => {
  const tempDir = makeTempDir();
  const kitDir = path.join(tempDir, 'test-kit');
  fs.mkdirSync(path.join(kitDir, 'agents', 'pm'), { recursive: true });
  fs.mkdirSync(path.join(kitDir, 'agents', 'dev'), { recursive: true });
  fs.writeFileSync(path.join(kitDir, 'agents', 'pm', 'SOUL.md'), '# PM');
  fs.writeFileSync(path.join(kitDir, 'agents', 'dev', 'SOUL.md'), '# Dev');

  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit',
      agents: [
        { id: 'pm', role: 'PM', soulFile: 'agents/pm/SOUL.md', allowAgents: ['dev', 'qa'] },
        { id: 'dev', role: 'Dev', soulFile: 'agents/dev/SOUL.md', allowAgents: [] },
      ],
    }),
  );

  const kit = loadKit('test-kit', tempDir);
  const result = validateKit(kit);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /allowAgents references unknown agent "qa" from "pm"/);
});
