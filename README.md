# ClawKit

[中文文档](./README.zh-CN.md)

Reusable workflow kits for OpenClaw multi-agent systems.

## What is a Kit?

A Kit is a packaged multi-agent workflow that can be deployed into any OpenClaw environment. Each kit contains:

- **Agent definitions** -- SOUL.md files that define personality, responsibilities, and constraints
- **Routing rules** -- who can talk to whom (`allowAgents`)
- **Shared workspace** -- directory structure for agent collaboration artifacts
- **Metadata** -- kit.json with version, description, and agent manifest

Kits make it easy to deploy proven multi-agent patterns without rebuilding from scratch.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/user/clawkit.git
cd clawkit

# List available kits
node cli/index.js list

# Preview what a deployment will do (dry-run)
node cli/index.js deploy product-kit --config ~/.openclaw

# Actually deploy
node cli/index.js deploy product-kit --config ~/.openclaw --apply
```

Or install globally via npm:

```bash
npm install -g clawkit

clawkit list
clawkit deploy product-kit --config ~/.openclaw --apply
```

## Available Kits

### product-kit

PM -> Dev -> QA product delivery workflow with strict routing and shared workspace.

```
Boss -> pm -> dev -> qa -> pm -> Boss
```

| Agent | Role | Communicates With |
|-------|------|-------------------|
| `pm`  | Product Manager | `dev` |
| `dev` | Developer | `pm`, `qa` |
| `qa`  | QA Tester | `dev`, `pm` |

**Use case:** Structured product development with clear handoffs, defect loops, and a single business-facing interface (PM).

```bash
clawkit deploy product-kit --config ~/.openclaw --apply
```

### hotnews-kit

Search news and create platform-specific articles for Toutiao, Xiaohongshu, WeChat, and Douyin.

```
User -> researcher -> toutiao-writer \
                   -> xhs-writer      -> editor -> User
                   -> wechat-writer  /
                   -> douyin-writer  /
```

| Agent | Role | Communicates With |
|-------|------|-------------------|
| `researcher` | News Researcher | `toutiao-writer`, `xhs-writer`, `wechat-writer`, `douyin-writer` |
| `toutiao-writer` | Toutiao Writer | `editor` |
| `xhs-writer` | Xiaohongshu Writer | `editor` |
| `wechat-writer` | WeChat Writer | `editor` |
| `douyin-writer` | Douyin Script Writer | `editor` |
| `editor` | Content Editor | `researcher` |

**Use case:** News content creation pipeline with search, multi-platform writing, and editorial review.

```bash
clawkit deploy hotnews-kit --config ~/.openclaw --apply
```

## CLI Usage

```bash
# List all available kits
clawkit list

# Show kit details (agents, version, description)
clawkit info <kit>

# Validate kit structure
clawkit validate <kit>

# Deploy a kit (dry-run by default)
clawkit deploy <kit> --config ~/.openclaw

# Deploy for real
clawkit deploy <kit> --config ~/.openclaw --apply

# Deploy with a custom prefix (avoids ID collisions)
clawkit deploy <kit> --config ~/.openclaw --apply --target-name sandbox

# Force overwrite existing deployed files
clawkit deploy <kit> --config ~/.openclaw --apply --force
```

**Note:** `--config` accepts either a directory path (e.g., `~/.openclaw`) or a full file path (e.g., `~/.openclaw/openclaw.json`). If you provide a directory, ClawKit will automatically look for `openclaw.json` inside it.

## Project Structure

```
clawkit/
├── kits/                     # All available kits
│   └── product-kit/          # One directory per kit
│       ├── kit.json          # Kit metadata and agent manifest
│       ├── openclaw.json     # Agent routing configuration
│       ├── README.md         # Kit documentation
│       ├── agents/           # Agent SOUL files
│       │   ├── pm/SOUL.md
│       │   ├── dev/SOUL.md
│       │   └── qa/SOUL.md
│       └── workspace-shared/ # Shared workspace template
├── cli/                      # CLI tool
│   ├── index.js              # Entry point
│   └── lib/
│       ├── kit-loader.js     # Kit discovery and validation
│       ├── deployer.js       # Deployment logic
│       └── merger.js         # Config merging
├── tests/                    # Test suite
├── docs/KIT-SPEC.md          # Kit format specification
└── package.json
```

## Contributing

We welcome community kits! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

**Quick overview:**

1. Create `kits/your-kit-name/` with `kit.json`, `openclaw.json`, and agent SOUL files
2. Run `clawkit validate your-kit-name` to verify structure
3. Add tests under `tests/`
4. Submit a PR

See [docs/KIT-SPEC.md](./docs/KIT-SPEC.md) for the complete kit specification.

## License

MIT
