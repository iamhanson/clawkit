# Kit Setup Script Design

## Goal

Add optional post-deployment initialization support to ClawKit, allowing kit developers to:

1. Install OpenClaw agent skills
2. Configure per-agent models (e.g., PM uses Opus, Dev uses Sonnet)
3. Run any custom initialization logic (interactive prompts, install MCP servers, etc.)

## Current State

ClawKit deploys SOUL files, workspace structure, and basic openclaw.json routing. No support for post-deployment initialization.

## Design

### 1. kit.json Schema Extension

Add optional top-level `setup` field pointing to a Node.js script:

```json
{
  "name": "product-kit",
  "version": "1.1.0",
  "displayName": "Product Development Workflow",
  "description": "PM -> Dev -> QA product delivery workflow",
  "agents": [
    {
      "id": "pm",
      "role": "Product Manager",
      "soulFile": "agents/pm/SOUL.md"
    },
    {
      "id": "dev",
      "role": "Developer",
      "soulFile": "agents/dev/SOUL.md"
    },
    {
      "id": "qa",
      "role": "QA Tester",
      "soulFile": "agents/qa/SOUL.md"
    }
  ],
  "sharedWorkspace": "workspace-shared",
  "setup": "setup.js"
}
```

Field rules:

- `setup`: optional string. Relative path to a Node.js script inside the kit directory. Executed after the main deployment completes. If omitted, no post-deploy script runs.

### 2. Setup Script Contract

The setup script is a standard Node.js file. ClawKit calls it with `node <setup.js> <args>` after the main deployment finishes.

**Arguments passed to setup.js:**

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

**Setup script responsibilities:**

The script has complete freedom to:
- Modify openclaw.json (add model/skills to agents, configure defaults)
- Install MCP servers or dependencies
- Run interactive prompts to ask user questions
- Download additional resources
- Write additional config files
- Anything else needed for kit initialization

**Example setup.js:**

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const configDir = process.argv[2];
const context = JSON.parse(process.argv[3]);
const configPath = path.join(configDir, 'openclaw.json');

// Read current config
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Configure models for each agent
for (const agent of config.agents.list) {
  if (agent.id === `${context.targetName}-pm`) {
    agent.model = 'opus';
    agent.skills = ['planning', 'requirement-analysis'];
  } else if (agent.id === `${context.targetName}-dev`) {
    agent.model = 'sonnet';
    agent.skills = ['coding', 'code-review'];
  } else if (agent.id === `${context.targetName}-qa`) {
    agent.model = 'haiku';
    agent.skills = ['testing'];
  }
}

// Write back
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

console.log('✓ Configured models and skills for all agents');
```

**ClawKit's responsibilities:**

- Check that setup.js exists before running (during validation)
- Run it as a child process with `inherit` stdio (so the script can interact with the user)
- If the script exits with non-zero code, print a warning but do not roll back the deployment
- In dry-run mode, print the setup script path but do not execute it

### 3. Deployment Pipeline Change

Current flow:
```
validate -> backup -> copy SOUL files -> copy workspace -> write openclaw.json
```

New flow:
```
validate -> backup -> copy SOUL files -> copy workspace -> write openclaw.json -> run setup.js (if exists)
```

### 4. Files to Modify

| File | Change |
|------|--------|
| `cli/lib/deployer.js` | `executeDeployment()` runs setup.js after writing config. |
| `cli/lib/kit-loader.js` | `validateKit()` checks setup.js exists if declared. |
| `cli/index.js` | `renderSummary()` shows setup script info if present. |
| `docs/KIT-SPEC.md` | Document `setup` field. |

### 5. Scope Boundaries

This design does NOT cover:

- Setup script sandboxing. Kit developers are trusted. Users should review setup.js before deploying unfamiliar kits.
- Setup script error recovery. If setup.js fails, the base deployment (SOUL files, workspace) remains intact, but the user must manually fix any partial configuration.

### 6. Backward Compatibility

The `setup` field is optional. Existing kits without setup scripts continue to work unchanged.

### 7. Security Considerations

Setup scripts have full access to the filesystem and can execute arbitrary code. Users should:
- Review setup.js before deploying kits from untrusted sources
- Run deployments in isolated environments when testing new kits
- ClawKit will print a warning when executing setup scripts from kits
