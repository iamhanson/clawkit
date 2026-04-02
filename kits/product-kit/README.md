# Product Cycle OpenClaw Example

This example models a lightweight product delivery workflow with three agents:

- `pm`: product manager
- `dev`: developer
- `qa`: tester

The boss is a human user outside the agent graph. Communication follows a primary flow with bounded allowed routes:

```text
Boss -> pm -> dev -> qa -> pm -> Boss
```

Defects follow this path:

```text
qa -> dev
qa -> pm
dev -> qa
```

## Allowed Routes

- `pm -> dev`
- `dev -> pm, qa`
- `qa -> dev, pm`

## Folder Layout

- `workspace-pm/SOUL.md`: product manager role definition and working context
- `workspace-dev/SOUL.md`: developer role definition and working context
- `workspace-qa/SOUL.md`: QA role definition and working context
- `workspace-shared/briefs/`: formal product briefs from `pm`
- `workspace-shared/schedules/`: estimates and schedules from `dev`
- `workspace-shared/deliveries/`: delivery handoff notes from `dev`
- `workspace-shared/tests/`: test results from `qa`
- `workspace-shared/reports/`: final product acceptance summaries from `pm`

## Usage

1. Review each `SOUL.md` file and adjust wording for your team style.
2. Replace the `examples/product-cycle/...` workspace paths with your local paths.
3. Keep each agent's `SOUL.md` at the root of that agent's workspace.
4. Load the config into OpenClaw and verify the `allowAgents` routes before running.

## Adapting To A Real OpenClaw Install

If your OpenClaw installation expects absolute paths, replace:

- `examples/product-cycle/workspace-pm`
- `examples/product-cycle/workspace-dev`
- `examples/product-cycle/workspace-qa`
- `examples/product-cycle/workspace-shared`

with the corresponding real paths in your `~/.openclaw/` environment.

For portability, this example keeps repo-relative paths; real installs should generally use absolute paths.

## Setup Script

This kit includes an example setup script (`setup.example.js`) that demonstrates how to configure agent models and skills after deployment.

To use it:

1. Copy the example: `cp setup.example.js setup.js`
2. Customize the model and skills configuration as needed
3. Add `"setup": "setup.js"` to `kit.json`
4. Deploy the kit: `clawkit deploy product-kit --config ~/.openclaw --apply`

The setup script will automatically run after deployment and configure each agent's model and skills.
