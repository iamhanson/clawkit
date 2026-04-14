# Product Kit Harness Design

## Goal

Upgrade `product-kit` to follow a harness-style control flow without adding a new agent.
The existing `pm` agent becomes the workflow control layer.

## Design

### Agent roles

- `pm`
  - sole boss-facing entrypoint
  - creates task artifacts
  - dispatches `dev`
  - dispatches `qa`
  - decides whether to deliver or request another implementation round
- `dev`
  - receives work only from `pm`
  - produces schedule and delivery artifacts
  - returns implementation results to `pm`
- `qa`
  - receives review requests only from `pm`
  - produces test and review artifacts
  - returns quality results to `pm`

### Routing

- `pm -> dev, qa`
- `dev -> pm`
- `qa -> pm`

### Shared artifacts

- `briefs/{taskId}/brief.json`
- `schedules/{taskId}/schedule.json`
- `deliveries/{taskId}/delivery.json`
- `tests/{taskId}/review.json`
- `reports/{taskId}/report.json`

### Control flow

1. boss -> `pm`
2. `pm` writes brief artifacts
3. `pm` invokes `dev`
4. `dev` writes schedule and delivery artifacts, then returns to `pm`
5. `pm` invokes `qa`
6. `qa` writes review artifacts, then returns to `pm`
7. `pm` decides:
   - deliver to boss
   - or send a targeted revision request back to `dev`

### Rules to remove

- `dev` should no longer hand work directly to `qa`
- `qa` should no longer notify both `dev` and `pm`
- only `pm` advances the workflow between implementation and testing

### Setup impact

No model-grouping change is required. `product-kit` still uses one shared model/auth configuration for all agents.

## Files to update

- `kits/product-kit/kit.json`
- `kits/product-kit/agents/pm/SOUL.md`
- `kits/product-kit/agents/dev/SOUL.md`
- `kits/product-kit/agents/qa/SOUL.md`
- `kits/product-kit/README.md`
- tests covering routing and SOUL constraints
