# ClawKit Showcase Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Vite single-page ClawKit showcase site, make Harness the central narrative, and deploy it with GitHub Pages.

**Architecture:** Create an isolated `site/` frontend app so the repository CLI and kit tooling remain untouched. Use a single-page React composition with handcrafted CSS, then add a dedicated GitHub Actions Pages workflow that builds from `site/` and deploys the generated static assets.

**Tech Stack:** React, Vite, plain CSS, GitHub Actions, GitHub Pages

---

### Task 1: Scaffold the isolated site app

**Files:**
- Create: `site/package.json`
- Create: `site/index.html`
- Create: `site/vite.config.js`
- Create: `site/src/main.jsx`

- [ ] **Step 1: Create the Vite package manifest**
- [ ] **Step 2: Add the HTML entrypoint and root mount**
- [ ] **Step 3: Configure Vite for relative asset output suitable for GitHub Pages**
- [ ] **Step 4: Add the React bootstrap entry file**

### Task 2: Build the showcase page UI

**Files:**
- Create: `site/src/App.jsx`
- Create: `site/src/styles.css`

- [ ] **Step 1: Implement the single-page React structure for hero, Harness sections, kit showcase, install section, and footer**
- [ ] **Step 2: Add the visual system and responsive layout in CSS**
- [ ] **Step 3: Make Harness the dominant story in both copy and diagram-style composition**

### Task 3: Add Pages deployment workflow

**Files:**
- Create: `.github/workflows/deploy-site.yml`

- [ ] **Step 1: Add a GitHub Actions workflow that builds `site/`**
- [ ] **Step 2: Publish the built static assets to GitHub Pages**
- [ ] **Step 3: Ensure the workflow triggers on pushes to the default branch and supports manual dispatch**

### Task 4: Document how to enable GitHub Pages

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a short section explaining where the site lives and how Pages is configured in GitHub**
- [ ] **Step 2: Keep the instructions short and tied to the new workflow**

### Task 5: Verify the site locally

**Files:**
- Verify only

- [ ] **Step 1: Install `site/` dependencies**
- [ ] **Step 2: Run `npm run build` inside `site/`**
- [ ] **Step 3: Confirm build output exists and note how the user can enable Pages in GitHub settings**
