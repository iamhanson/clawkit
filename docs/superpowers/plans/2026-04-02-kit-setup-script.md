# Kit Setup Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional post-deployment setup script support to ClawKit

**Architecture:** Extend kit.json schema with optional `setup` field. After main deployment completes, detect and execute setup.js if present. Setup script receives config directory and deployment context as arguments.

**Tech Stack:** Node.js (fs, path, child_process), existing ClawKit modules

---

## Task 1: Extend kit-loader validation

**Files:**
- Modify: `cli/lib/kit-loader.js:107-179` (validateKit function)

- [ ] **Step 1: Write failing test for setup field validation**

```javascript
// tests/kit-loader.test.js - add after existing validateKit tests
test('validateKit fails for missing setup script', () => {
  const { loadKit, validateKit } = require('../cli/lib/kit-loader');
  const tempDir = makeTempDir();
  const kitDir = path.join(tempDir, 'test-kit');
  
  fs.mkdirSync(path.join(kitDir, 'agents', 'agent1'), { recursive: true });
  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit',
      agents: [{ id: 'agent1', role: 'Test', soulFile: 'agents/agent1/SOUL.md' }],
      setup: 'setup.js'
    }),
    'utf8'
  );
  fs.writeFileSync(path.join(kitDir, 'agents', 'agent1', 'SOUL.md'), '# Test', 'utf8');
  fs.writeFileSync(path.join(kitDir, 'openclaw.json'), '{"agents":[]}', 'utf8');
  
  const kit = loadKit('test-kit', tempDir);
  const result = validateKit(kit);
  
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('setup.js')));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | grep "validateKit fails for missing setup script"`
Expected: Test fails because validation doesn't check setup field yet

- [ ] **Step 3: Add setup script validation to validateKit**

```javascript
// cli/lib/kit-loader.js - add after sharedWorkspace check (around line 173)

// --- setup script check ---

if (metadata.setup) {
  const setupPath = path.join(kitDir, metadata.setup);
  if (!fs.existsSync(setupPath)) {
    errors.push(
      `Setup script not found: ${metadata.setup}`
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test 2>&1 | tail -10`
Expected: All tests pass including new setup validation test

- [ ] **Step 5: Commit**

```bash
git add cli/lib/kit-loader.js tests/kit-loader.test.js
git commit -m "feat: validate setup script exists if declared in kit.json"
```

---

## Task 2: Add setup script execution to deployer

**Files:**
- Modify: `cli/lib/deployer.js:228-265` (executeDeployment function)

- [ ] **Step 1: Write failing test for setup script execution**

```javascript
// tests/deployer.test.js - add at end of file
test('executeDeployment runs setup script if present', () => {
  const { createDeploymentPlan, executeDeployment } = require('../cli/lib/deployer');
  const { loadKit } = require('../cli/lib/kit-loader');
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');
  
  // Create kit with setup script
  const kitDir = path.join(tempDir, 'test-kit-with-setup');
  fs.mkdirSync(path.join(kitDir, 'agents', 'agent1'), { recursive: true });
  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit-with-setup',
      agents: [{ id: 'agent1', role: 'Test', soulFile: 'agents/agent1/SOUL.md' }],
      setup: 'setup.js'
    }),
    'utf8'
  );
  fs.writeFileSync(path.join(kitDir, 'agents', 'agent1', 'SOUL.md'), '# Test', 'utf8');
  fs.writeFileSync(path.join(kitDir, 'openclaw.json'), '{"agents":{"list":[]}}', 'utf8');
  
  // Create setup script that writes a marker file
  const setupScript = `
const fs = require('fs');
const path = require('path');
const configDir = process.argv[2];
fs.writeFileSync(path.join(configDir, 'setup-ran.txt'), 'success', 'utf8');
  `;
  fs.writeFileSync(path.join(kitDir, 'setup.js'), setupScript, 'utf8');
  
  // Create target config
  fs.writeFileSync(configPath, JSON.stringify({ agents: { defaults: {}, list: [] } }, null, 2));
  
  const kit = loadKit('test-kit-with-setup', tempDir);
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: true,
    force: false,
    targetName: 'test-kit-with-setup',
    cleanupAgents: false,
  });
  
  executeDeployment(plan);
  
  // Verify setup script ran
  const markerPath = path.join(tempDir, 'setup-ran.txt');
  assert.equal(fs.existsSync(markerPath), true);
  assert.equal(fs.readFileSync(markerPath, 'utf8'), 'success');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | grep "executeDeployment runs setup script"`
Expected: Test fails because setup script is not executed

- [ ] **Step 3: Add setup script execution logic**

```javascript
// cli/lib/deployer.js - add after fs.writeFileSync (around line 259)

// Run setup script if present
if (plan.kit.metadata.setup && plan.mode === 'apply') {
  const setupPath = path.join(plan.kit.kitDir, plan.kit.metadata.setup);
  const context = JSON.stringify({
    targetName: plan.targetName,
    agentIds: plan.deployedAgentIds,
    configPath: plan.configPath,
    kitDir: plan.kit.kitDir,
  });
  
  console.log(`\nRunning setup script: ${plan.kit.metadata.setup}`);
  
  try {
    const { spawnSync } = require('child_process');
    const result = spawnSync('node', [setupPath, plan.targetConfigDir, context], {
      stdio: 'inherit',
      cwd: plan.kit.kitDir,
    });
    
    if (result.status !== 0) {
      console.warn(`\nWarning: Setup script exited with code ${result.status}`);
      console.warn('Base deployment completed, but setup may be incomplete.');
    }
  } catch (error) {
    console.warn(`\nWarning: Failed to run setup script: ${error.message}`);
    console.warn('Base deployment completed, but setup may be incomplete.');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test 2>&1 | tail -10`
Expected: All tests pass including setup script execution test

- [ ] **Step 5: Commit**

```bash
git add cli/lib/deployer.js tests/deployer.test.js
git commit -m "feat: execute setup script after deployment if present"
```

---

## Task 3: Add setup info to deployment summary

**Files:**
- Modify: `cli/lib/deployer.js:166-176` (renderSummary function)

- [ ] **Step 1: Add setup script info to summary**

```javascript
// cli/lib/deployer.js - modify renderSummary function
function renderSummary(plan) {
  const lines = [
    `Mode: ${plan.mode}`,
    `Config: ${plan.configPath}`,
    `Target config dir: ${plan.targetConfigDir}`,
    `Target name: ${plan.targetName}`,
    `Backup: ${plan.backupPath}`,
    `Agents: ${plan.deployedAgentIds.join(', ')}`,
    `Shared workspace: ${plan.sharedWorkspacePath}`,
  ];
  
  if (plan.kit.metadata.setup) {
    lines.push(`Setup script: ${plan.kit.metadata.setup}`);
  }
  
  return lines.join('\n');
}
```

- [ ] **Step 2: Test manually**

Run: 
```bash
mkdir -p /tmp/test-summary
echo '{"agents":{"list":[]}}' > /tmp/test-summary/openclaw.json
node cli/index.js deploy product-kit --config /tmp/test-summary
```
Expected: Summary output (no setup script line for product-kit since it doesn't have one)

- [ ] **Step 3: Commit**

```bash
git add cli/lib/deployer.js
git commit -m "feat: show setup script in deployment summary"
```

---

## Task 4: Update KIT-SPEC documentation

**Files:**
- Modify: `docs/KIT-SPEC.md:32-40` (Optional Fields section)

- [ ] **Step 1: Add setup field to Optional Fields table**

```markdown
### Optional Fields

| Field              | Type   | Description                           |
|--------------------|--------|---------------------------------------|
| `sharedWorkspace`  | string | Directory name for shared workspace   |
| `routing`          | object | Agent-to-agent routing rules          |
| `templates`        | array  | Template files included in the kit    |
| `setup`            | string | Relative path to post-deployment Node.js script |
```

- [ ] **Step 2: Add Setup Script section**

```markdown
## Setup Script

Kits can optionally include a `setup` script that runs after the main deployment completes. This allows kit developers to:

- Configure per-agent models and skills
- Install MCP servers or dependencies
- Run interactive prompts
- Perform any custom initialization logic

### Setup Script Contract

The setup script is a Node.js file that receives two arguments:

```javascript
// argv[2]: absolute path to the target config directory
// argv[3]: JSON string of deployment context
const configDir = process.argv[2];
const context = JSON.parse(process.argv[3]);

// context contains:
// {
//   targetName: "product-kit",
//   agentIds: ["product-kit-pm", "product-kit-dev", "product-kit-qa"],
//   configPath: "/path/to/openclaw.json",
//   kitDir: "/path/to/kits/product-kit"
// }
```

### Example

```json
{
  "name": "my-kit",
  "version": "1.0.0",
  "agents": [...],
  "setup": "setup.js"
}
```

The setup script has complete freedom to modify openclaw.json, install dependencies, or perform any initialization needed.

### Security Note

Setup scripts execute with full filesystem access. Users should review setup scripts before deploying kits from untrusted sources.
```

- [ ] **Step 3: Commit**

```bash
git add docs/KIT-SPEC.md
git commit -m "docs: document setup script field in kit specification"
```

---

## Task 5: Create example setup script for product-kit

**Files:**
- Create: `kits/product-kit/setup.example.js`
- Modify: `kits/product-kit/README.md`

- [ ] **Step 1: Create example setup script**

```javascript
#!/usr/bin/env node
/**
 * Example setup script for product-kit
 * 
 * This script demonstrates how to configure agent models and skills
 * after deployment. Copy this to setup.js and customize as needed.
 */

const fs = require('fs');
const path = require('path');

const configDir = process.argv[2];
const context = JSON.parse(process.argv[3]);

console.log(`\nConfiguring ${context.targetName} agents...`);

// Read current openclaw.json
const configPath = path.join(configDir, 'openclaw.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Configure models and skills for each agent
for (const agent of config.agents.list) {
  if (agent.id === `${context.targetName}-pm`) {
    agent.model = 'opus';
    agent.skills = ['planning', 'requirement-analysis'];
    console.log(`  ✓ Configured PM: model=opus, skills=${agent.skills.join(',')}`);
  } else if (agent.id === `${context.targetName}-dev`) {
    agent.model = 'sonnet';
    agent.skills = ['coding', 'code-review'];
    console.log(`  ✓ Configured Dev: model=sonnet, skills=${agent.skills.join(',')}`);
  } else if (agent.id === `${context.targetName}-qa`) {
    agent.model = 'haiku';
    agent.skills = ['testing'];
    console.log(`  ✓ Configured QA: model=haiku, skills=${agent.skills.join(',')}`);
  }
}

// Write back
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

console.log('\n✓ Setup complete\n');
```

- [ ] **Step 2: Update product-kit README**

```markdown
## Setup Script

This kit includes an example setup script (`setup.example.js`) that demonstrates how to configure agent models and skills after deployment.

To use it:

1. Copy the example: `cp setup.example.js setup.js`
2. Customize the model and skills configuration as needed
3. Add `"setup": "setup.js"` to `kit.json`
4. Deploy the kit: `clawkit deploy product-kit --config ~/.openclaw --apply`

The setup script will automatically run after deployment and configure each agent's model and skills.
```

- [ ] **Step 3: Commit**

```bash
git add kits/product-kit/setup.example.js kits/product-kit/README.md
git commit -m "docs: add example setup script for product-kit"
```

---

## Task 6: Add dry-run mode handling

**Files:**
- Modify: `cli/lib/deployer.js:228-265` (executeDeployment function)

- [ ] **Step 1: Write test for dry-run mode**

```javascript
// tests/deployer.test.js - add test
test('dry-run mode shows setup script but does not execute', () => {
  const { createDeploymentPlan, executeDeployment } = require('../cli/lib/deployer');
  const { loadKit } = require('../cli/lib/kit-loader');
  const tempDir = makeTempDir();
  const configPath = path.join(tempDir, 'openclaw.json');
  
  // Create kit with setup script
  const kitDir = path.join(tempDir, 'test-kit-dryrun');
  fs.mkdirSync(path.join(kitDir, 'agents', 'agent1'), { recursive: true });
  fs.writeFileSync(
    path.join(kitDir, 'kit.json'),
    JSON.stringify({
      name: 'test-kit-dryrun',
      agents: [{ id: 'agent1', role: 'Test', soulFile: 'agents/agent1/SOUL.md' }],
      setup: 'setup.js'
    }),
    'utf8'
  );
  fs.writeFileSync(path.join(kitDir, 'agents', 'agent1', 'SOUL.md'), '# Test', 'utf8');
  fs.writeFileSync(path.join(kitDir, 'openclaw.json'), '{"agents":{"list":[]}}', 'utf8');
  
  // Create setup script that would write a marker
  const setupScript = `
const fs = require('fs');
const path = require('path');
const configDir = process.argv[2];
fs.writeFileSync(path.join(configDir, 'dryrun-marker.txt'), 'should-not-exist', 'utf8');
  `;
  fs.writeFileSync(path.join(kitDir, 'setup.js'), setupScript, 'utf8');
  
  // Create target config
  fs.writeFileSync(configPath, JSON.stringify({ agents: { defaults: {}, list: [] } }, null, 2));
  
  const kit = loadKit('test-kit-dryrun', tempDir);
  const plan = createDeploymentPlan({
    kit,
    configPath,
    apply: false, // dry-run mode
    force: false,
    targetName: 'test-kit-dryrun',
    cleanupAgents: false,
  });
  
  executeDeployment(plan);
  
  // Verify setup script did NOT run
  const markerPath = path.join(tempDir, 'dryrun-marker.txt');
  assert.equal(fs.existsSync(markerPath), false);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test 2>&1 | grep "dry-run mode shows setup script"`
Expected: Test passes (setup script already has mode check)

- [ ] **Step 3: Commit**

```bash
git add tests/deployer.test.js
git commit -m "test: verify setup script not executed in dry-run mode"
```

---

## Task 7: Final integration test

**Files:**
- None (manual testing)

- [ ] **Step 1: Create test kit with setup script**

```bash
mkdir -p /tmp/integration-test-kit/agents/test
cat > /tmp/integration-test-kit/kit.json <<'EOF'
{
  "name": "integration-test-kit",
  "version": "1.0.0",
  "displayName": "Integration Test Kit",
  "description": "Test kit with setup script",
  "agents": [
    {
      "id": "test",
      "role": "Test Agent",
      "soulFile": "agents/test/SOUL.md"
    }
  ],
  "setup": "setup.js"
}
EOF

echo "# Test Agent" > /tmp/integration-test-kit/agents/test/SOUL.md

cat > /tmp/integration-test-kit/openclaw.json <<'EOF'
{
  "agents": {
    "list": [
      {
        "id": "test",
        "subagents": { "allowAgents": [] }
      }
    ]
  }
}
EOF

cat > /tmp/integration-test-kit/setup.js <<'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const configDir = process.argv[2];
const context = JSON.parse(process.argv[3]);

console.log('\n✓ Setup script executed successfully');
console.log(`  Config dir: ${configDir}`);
console.log(`  Target name: ${context.targetName}`);
console.log(`  Agent IDs: ${context.agentIds.join(', ')}\n`);

// Modify openclaw.json
const configPath = path.join(configDir, 'openclaw.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

for (const agent of config.agents.list) {
  if (agent.id.includes('test')) {
    agent.model = 'sonnet';
    agent.skills = ['testing'];
  }
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
EOF
```

- [ ] **Step 2: Test deployment with setup script**

```bash
mkdir -p /tmp/integration-deploy
echo '{"agents":{"defaults":{},"list":[]}}' > /tmp/integration-deploy/openclaw.json

# Copy kit to kits directory
cp -r /tmp/integration-test-kit kits/

# Deploy
node cli/index.js deploy integration-test-kit --config /tmp/integration-deploy --apply

# Verify setup ran
cat /tmp/integration-deploy/openclaw.json | grep -A 2 "model"
```

Expected: 
- Setup script output appears
- openclaw.json contains model and skills fields

- [ ] **Step 3: Clean up test kit**

```bash
rm -rf kits/integration-test-kit
rm -rf /tmp/integration-test-kit
rm -rf /tmp/integration-deploy
```

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete kit setup script implementation

- Validate setup script exists if declared
- Execute setup script after deployment
- Show setup info in deployment summary
- Document setup script in KIT-SPEC
- Add example setup script for product-kit
- Handle dry-run mode correctly"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✓ kit.json schema extension (setup field)
- ✓ Setup script validation
- ✓ Setup script execution after deployment
- ✓ Arguments passed to setup script (configDir, context JSON)
- ✓ Error handling (non-zero exit, exceptions)
- ✓ Dry-run mode handling
- ✓ Documentation updates

**Placeholder scan:**
- ✓ No TBD, TODO, or incomplete sections
- ✓ All code blocks are complete
- ✓ All test expectations are specific

**Type consistency:**
- ✓ plan.kit.metadata.setup used consistently
- ✓ context object structure matches spec
- ✓ All function signatures match

**Testing:**
- ✓ Unit tests for validation
- ✓ Unit tests for execution
- ✓ Integration test for end-to-end flow
- ✓ Dry-run mode test
