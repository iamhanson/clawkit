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

test('validateKit fails for missing soul file', () => {
  const tempDir = makeTempDir();
  const kitDir = path.join(tempDir, 'test-kit');
  fs.mkdirSync(kitDir, { recursive: true });

  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit',
      agents: [
        { id: 'agent1', soulFile: 'agents/agent1/SOUL.md' },
      ],
    }),
  );

  fs.writeFileSync(
    path.join(kitDir, 'openclaw.json'),
    JSON.stringify({ agents: { defaults: {}, list: [] } }),
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
        { id: 'agent1', soulFile: 'agents/agent1/SOUL.md' },
      ],
      sharedWorkspace: 'workspace-shared',
    }),
  );

  fs.writeFileSync(
    path.join(kitDir, 'openclaw.json'),
    JSON.stringify({ agents: { defaults: {}, list: [] } }),
  );

  const kit = loadKit('test-kit', tempDir);
  const result = validateKit(kit);

  assert.equal(result.valid, false);
  assert.equal(result.errors.length >= 1, true);
  assert.match(result.errors[0], /Shared workspace directory not found/);
});
