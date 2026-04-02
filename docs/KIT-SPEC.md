# Kit Specification

This document defines the structure and validation rules for ClawKit workflow kits.

## Directory Structure

Every kit must follow this directory layout:

```
kits/<kit-name>/
├── kit.json                  # Required: Kit metadata
├── agents/                   # Required: Agent definitions
│   └── <agent-id>/
│       └── SOUL.md          # Required: Agent personality file
├── workspace-shared/         # Optional: Shared workspace directory
└── templates/                # Optional: Template files
```

## kit.json Schema

The `kit.json` file is the entry point for every kit. It must be valid JSON and conform to the following schema.

### Required Fields

| Field         | Type     | Description                            |
|---------------|----------|----------------------------------------|
| `name`        | string   | Kit identifier (lowercase, hyphens)    |
| `version`     | string   | Semantic version (e.g., `"1.0.0"`)    |
| `displayName` | string   | Human-readable kit name                |
| `description` | string   | Brief description of the workflow      |
| `agents`      | array    | List of agent definitions              |

### Optional Fields

| Field              | Type   | Description                           |
|--------------------|--------|---------------------------------------|
| `sharedWorkspace`  | string | Directory name for shared workspace   |
| `routing`          | object | Agent-to-agent routing rules          |
| `templates`        | array  | Template files included in the kit    |
| `setup`            | string | Relative path to post-deployment Node.js script |

### Agent Definition

Each entry in the `agents` array must include:

| Field      | Type   | Description                                 |
|------------|--------|---------------------------------------------|
| `id`       | string | Unique identifier within the kit            |
| `role`     | string | Human-readable role description             |
| `soulFile` | string | Relative path to the agent SOUL.md file     |

### Example

```json
{
  "name": "product-kit",
  "version": "1.0.0",
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
  "sharedWorkspace": "workspace-shared"
}
```

## Validation Rules

ClawKit validates kits during deployment. The following rules must be satisfied:

### Naming

- `name` must use lowercase letters, numbers, and hyphens only
- `name` must match the kit directory name
- Agent `id` values must be unique within a kit
- Agent `id` values must use lowercase letters, numbers, and hyphens only

### File References

- Every `soulFile` path must point to an existing file
- `sharedWorkspace` directory must exist if specified
- All paths are relative to the kit root directory

### Version

- `version` must follow semantic versioning (`MAJOR.MINOR.PATCH`)
- No pre-release or build metadata required, but allowed

### Agents

- At least one agent must be defined
- Each agent must have a non-empty `id`, `role`, and `soulFile`

## SOUL.md Format

SOUL files define an agent's personality, capabilities, and constraints. While the format is flexible, the following sections are recommended:

```markdown
# Agent Name

## Identity
Who the agent is and what role it plays.

## Capabilities
What the agent can do.

## Constraints
What the agent must not do.

## Communication
How the agent interacts with other agents.

## Output Format
Expected output structure.
```

## Shared Workspace

The shared workspace directory is created in the target project during deployment. It serves as a common area where agents exchange artifacts (PRDs, code, test reports, etc.).

- The directory is created empty during deployment
- Agents write to and read from this directory during workflow execution
- File naming conventions are defined by individual kits

## Setup Script

The `setup` field in `kit.json` specifies a Node.js script that runs automatically after kit deployment. Setup scripts handle post-deployment configuration that cannot be expressed through static files alone, such as:

- Configuring agent model preferences and skills
- Installing MCP servers required by the kit
- Running interactive prompts to gather user-specific settings
- Generating configuration files from templates with user input
- Validating external dependencies (APIs, tools, services)

### Setup Script Contract

When ClawKit invokes a setup script, it passes two positional arguments:

| Argument   | Description                                      |
|------------|--------------------------------------------------|
| `argv[2]`  | Absolute path to the target configuration directory |
| `argv[3]`  | JSON string containing the deployment context    |

The context object (`argv[3]`) has the following structure:

| Property     | Type     | Description                                       |
|--------------|----------|---------------------------------------------------|
| `targetName` | string   | Name of the deployment target                     |
| `agentIds`   | string[] | List of agent IDs deployed from this kit          |
| `configPath` | string   | Absolute path to the target configuration directory |
| `kitDir`     | string   | Absolute path to the source kit directory         |

### Example

A setup script that configures agent models and installs an MCP server:

```javascript
#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const configDir = process.argv[2];
const context = JSON.parse(process.argv[3]);

// Read existing settings
const settingsPath = join(configDir, "settings.json");
const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

// Configure model preferences for each agent
for (const agentId of context.agentIds) {
  const agentSettings = join(configDir, "agents", agentId, "settings.json");
  writeFileSync(agentSettings, JSON.stringify({
    model: "sonnet",
    permissions: { allowedTools: ["Read", "Write", "Bash"] }
  }, null, 2));
}

// Install an MCP server required by this kit
execSync("npm install -g @example/mcp-server", { stdio: "inherit" });

console.log(`Setup complete for ${context.targetName}`);
```

### Security Considerations

> **Warning:** Setup scripts have full filesystem access and can execute arbitrary commands. Kit authors should document what their setup script does. Users should review setup scripts before deploying untrusted kits.
