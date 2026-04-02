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
