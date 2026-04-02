const test = require('node:test');
const assert = require('node:assert/strict');

const { clone, getSourceAgents, getSourceAllowAgents, mergeAgents } = require('../cli/lib/merger');

test('clone creates deep copy', () => {
  const original = { a: 1, b: { c: 2 } };
  const cloned = clone(original);

  assert.deepEqual(cloned, original);
  assert.notEqual(cloned, original);
  assert.notEqual(cloned.b, original.b);

  cloned.b.c = 3;
  assert.equal(original.b.c, 2);
});

test('getSourceAgents handles array schema', () => {
  const config = {
    agents: [
      { id: 'agent1', workspace: '/tmp/agent1' },
      { id: 'agent2', workspace: '/tmp/agent2' },
    ],
  };

  const agents = getSourceAgents(config);
  assert.equal(Array.isArray(agents), true);
  assert.equal(agents.length, 2);
  assert.equal(agents[0].id, 'agent1');
  assert.equal(agents[1].id, 'agent2');
});

test('getSourceAgents handles object schema', () => {
  const config = {
    agents: {
      defaults: { workspace: '/tmp/default' },
      list: [
        { id: 'agent1', workspace: '/tmp/agent1' },
        { id: 'agent2', workspace: '/tmp/agent2' },
      ],
    },
  };

  const agents = getSourceAgents(config);
  assert.equal(Array.isArray(agents), true);
  assert.equal(agents.length, 2);
  assert.equal(agents[0].id, 'agent1');
  assert.equal(agents[1].id, 'agent2');
});

test('getSourceAllowAgents extracts from agent', () => {
  const agent1 = {
    id: 'agent1',
    allowAgents: ['agent2', 'agent3'],
  };

  const agent2 = {
    id: 'agent2',
    subagents: {
      allowAgents: ['agent1', 'agent3'],
    },
  };

  const agent3 = {
    id: 'agent3',
  };

  assert.deepEqual(getSourceAllowAgents(agent1), ['agent2', 'agent3']);
  assert.deepEqual(getSourceAllowAgents(agent2), ['agent1', 'agent3']);
  assert.deepEqual(getSourceAllowAgents(agent3), []);
});

test('mergeAgents preserves unrelated agents', () => {
  const existingConfig = {
    agents: {
      defaults: {},
      list: [
        { id: 'existing1', workspace: '/tmp/existing1' },
        { id: 'existing2', workspace: '/tmp/existing2' },
      ],
    },
  };

  const managedAgents = [
    { id: 'managed1', workspace: '/tmp/managed1' },
  ];

  const merged = mergeAgents(existingConfig, managedAgents);

  assert.equal(merged.agents.list.length, 3);
  assert.equal(merged.agents.list[0].id, 'existing1');
  assert.equal(merged.agents.list[1].id, 'existing2');
  assert.equal(merged.agents.list[2].id, 'managed1');
});

test('mergeAgents replaces managed agents', () => {
  const existingConfig = {
    agents: {
      defaults: {},
      list: [
        { id: 'existing1', workspace: '/tmp/existing1' },
        { id: 'managed1', workspace: '/tmp/old-managed1' },
      ],
    },
  };

  const managedAgents = [
    { id: 'managed1', workspace: '/tmp/new-managed1' },
  ];

  const merged = mergeAgents(existingConfig, managedAgents);

  assert.equal(merged.agents.list.length, 2);
  assert.equal(merged.agents.list[0].id, 'existing1');
  assert.equal(merged.agents.list[1].id, 'managed1');
  assert.equal(merged.agents.list[1].workspace, '/tmp/new-managed1');
});

test('mergeAgents handles legacy array schema', () => {
  const existingConfig = {
    agents: [
      { id: 'existing1', workspace: '/tmp/existing1' },
    ],
  };

  const managedAgents = [
    { id: 'managed1', workspace: '/tmp/managed1' },
  ];

  const merged = mergeAgents(existingConfig, managedAgents);

  assert.equal(Array.isArray(merged.agents), false);
  assert.equal(typeof merged.agents, 'object');
  assert.equal(Array.isArray(merged.agents.list), true);
  assert.equal(merged.agents.list.length, 2);
  assert.equal(merged.agents.list[0].id, 'existing1');
  assert.equal(merged.agents.list[1].id, 'managed1');
  assert.deepEqual(merged.agents.defaults, {});
});
