# Contributing to ClawKit

Thank you for your interest in contributing! ClawKit thrives on community-contributed workflow kits.

## How to Contribute

### Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Provide clear reproduction steps for bugs
- Include your Node.js version and OS

### Contributing a New Kit

1. Fork the repository
2. Create a new branch: `git checkout -b kit/your-kit-name`
3. Follow the Kit Development Guide below
4. Add tests for your kit
5. Submit a pull request

## Kit Development Guide

### Directory Structure

```
kits/your-kit-name/
├── kit.json              # Kit metadata and configuration
├── agents/
│   ├── agent1/
│   │   └── SOUL.md      # Agent personality and rules
│   └── agent2/
│       └── SOUL.md
└── workspace-shared/     # Optional shared workspace
```

### kit.json Requirements

Every kit must include a valid `kit.json`. See [docs/KIT-SPEC.md](./docs/KIT-SPEC.md) for the full specification.

Minimum required fields:

```json
{
  "name": "your-kit-name",
  "version": "1.0.0",
  "displayName": "Human-Readable Name",
  "description": "What this kit does",
  "agents": [
    {
      "id": "agent-id",
      "role": "Agent Role",
      "soulFile": "agents/agent-id/SOUL.md"
    }
  ]
}
```

### SOUL Files

Each agent needs a SOUL.md file that defines:

- Agent identity and role
- Capabilities and constraints
- Communication rules
- Output format requirements

## Testing Requirements

All kits must include tests. Run the test suite with:

```bash
npm test
```

Tests should cover:

- kit.json schema validation
- All referenced files exist (SOUL files, workspace directories)
- Agent IDs are unique within a kit
- Required fields are present

## Pull Request Process

1. Ensure all tests pass: `npm test`
2. Update the README if adding a new kit
3. Keep PRs focused -- one kit per PR
4. Write a clear PR description explaining the workflow your kit enables
5. Be responsive to review feedback

## Code Style

- Use clear, descriptive names for kits and agents
- Keep SOUL files concise but comprehensive
- Follow existing kits as examples (see `kits/product-kit/`)
- Use English for code and comments; SOUL files may be bilingual

## Questions?

Open an issue with the `question` label and we will be happy to help.
