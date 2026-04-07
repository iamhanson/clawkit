# HotNews Kit Review Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `hotnews-kit` reliably close the loop from research to writers to editor review.

**Architecture:** Strengthen the kit contract in `SOUL.md` and the shared workspace so progress is visible even when agent-to-agent handoff is flaky. Writers will publish both final content and a submission marker; `editor` will reconcile the shared output directory before reviewing.

**Tech Stack:** Node.js built-in test runner, markdown `SOUL.md` prompts, kit workspace templates

---

### Task 1: Lock the Expected Workflow Contract in Tests

**Files:**
- Modify: `tests/deployer.test.js`
- Test: `tests/deployer.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('hotnews-kit soul files enforce writer-to-editor handoff and review coordination', () => {
  // Assert researcher fans out to all 4 writers.
  // Assert writers must write submission markers and notify editor.
  // Assert editor reconciles submissions/output files before review.
});

test('apply mode creates hotnews-kit shared submission workspace', () => {
  // Deploy hotnews-kit into a temp config dir and assert submissions/.gitkeep exists.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/deployer.test.js`
Expected: FAIL because `hotnews-kit` souls and workspace template do not yet enforce the new contract.

- [ ] **Step 3: Write minimal implementation**

```text
- Add `workspace-shared/submissions/.gitkeep`
- Update researcher/writer/editor SOUL files with the explicit handoff and reconciliation rules
- Keep changes scoped to the contract and docs only
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/deployer.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/deployer.test.js kits/hotnews-kit/agents kits/hotnews-kit/workspace-shared
git commit -m "fix: tighten hotnews kit review handoff"
```

### Task 2: Refresh Kit Docs to Match the New Workflow

**Files:**
- Modify: `kits/hotnews-kit/README.md`
- Test: `node --test tests/deployer.test.js`

- [ ] **Step 1: Write the failing test**

```text
Reuse the contract test from Task 1 as the safety net before editing docs.
```

- [ ] **Step 2: Run test to verify it still passes before doc changes**

Run: `node --test tests/deployer.test.js`
Expected: PASS

- [ ] **Step 3: Write minimal implementation**

```md
Document:
- only `researcher` is the entry agent
- writers and editor are activated on demand
- `submissions/{task-id}/<writer>.md` is the editor-facing checkpoint
```

- [ ] **Step 4: Run tests and spot-check docs**

Run: `node --test tests/deployer.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add kits/hotnews-kit/README.md docs/superpowers/plans/2026-04-07-hotnews-kit-review-handoff.md
git commit -m "docs: clarify hotnews kit review workflow"
```
