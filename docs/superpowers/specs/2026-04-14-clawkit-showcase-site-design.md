# ClawKit Showcase Site Design

## Goal

Build a React + Vite single-page showcase site for ClawKit that can be deployed to GitHub Pages and makes Harness the center of the story.

The site should help a new visitor understand:

- what ClawKit is
- why Harness-style multi-agent design matters
- how `product-kit` and `hotnews-kit` embody that design
- how to install and deploy the project

## Audience

- developers exploring OpenClaw workflows
- technical decision makers evaluating multi-agent orchestration patterns
- users who want a quick project overview before reading the README

## Core Message

ClawKit is not just a collection of agents. It is a reusable Harness-oriented workflow system where communication boundaries, control layers, and shared artifacts make multi-agent collaboration predictable.

## Design Direction

### Recommended approach

Create a bold single-page product-style site rather than a docs homepage.

Reasoning:

- the project benefits from a strong narrative arc
- Harness can be explained visually as a system, not just as prose
- GitHub Pages works well with a static Vite build
- a product-style page gives enough space for diagrams, flow sections, kit showcases, and install instructions

### Visual language

- engineering-product aesthetic rather than generic AI landing page
- base palette: off-white, deep navy, slate, and a sharp teal/orange accent
- expressive typography with a non-default headline font
- structured diagram-like layouts with panels, rails, routes, and node cards
- subtle motion for reveal and flow emphasis

## Information Architecture

### 1. Hero

Purpose:

- establish ClawKit as an OpenClaw workflow kit system
- immediately frame Harness as the differentiator

Content:

- title: `ClawKit`
- subtitle: `Reusable workflow kits for OpenClaw multi-agent systems`
- supporting text explaining Harness-oriented orchestration
- primary CTA: GitHub
- secondary CTA: Quick Start

Visual treatment:

- large compositional background showing a control layer connected to worker nodes
- animated route lines or highlighted flow paths
- strong word emphasis on `Harness`

### 2. What ClawKit Is

Purpose:

- explain the project primitives before going deeper

Cards:

- `SOUL.md`: role, boundaries, output contract
- `kit.json`: routing and metadata
- shared workspace: formal artifact contract
- setup and deploy: portable environment integration

### 3. Harness First

Purpose:

- make Harness the conceptual center of the page

This section is the core of the page.

Content:

- a layered architecture visualization:
  - control layer
  - worker layer
  - evaluator layer
  - shared artifacts layer
- concise principles:
  - one control layer owns progression
  - workers produce output, not orchestration
  - evaluators return conclusions to the control layer
  - shared artifacts make work traceable

Desired effect:

Visitors should understand that ClawKit is about disciplined coordination, not arbitrary agent chaining.

### 4. Communication Model

Purpose:

- show how agents communicate and why that is safer than free-form cross-calling

Content:

- visual contrast between:
  - uncontrolled mesh communication
  - Harness hub-and-spoke communication
- concise bullets:
  - single entry point
  - explicit state return
  - clear failure loops
  - stable handoff boundaries

### 5. Kits Showcase

Purpose:

- demonstrate how Harness becomes concrete in real kits

Feature panels:

#### Product Kit

- title: `Product Delivery Harness`
- flow: `Boss -> pm -> dev -> pm -> qa -> pm -> Boss`
- emphasis: `pm` as control layer
- artifact examples:
  - `brief.json`
  - `schedule.json`
  - `delivery.json`
  - `review.json`
  - `report.json`

#### HotNews Kit

- title: `Content Workflow Harness`
- flow centered on `orchestrator`
- emphasis: `researcher`, `writers`, and `editor` all report through the orchestrator
- artifact examples:
  - `brief.json`
  - `research.json`
  - `submission.json`
  - `review.json`

### 6. Install and Deploy

Purpose:

- show practical adoption path

Content:

- `git clone` path
- `clawkittool get` path
- short explanation of GitHub Release manifest flow
- mention GitHub Pages as the host for this showcase site

### 7. Footer

Content:

- GitHub
- docs
- kits
- npm tool
- license

## Technical Approach

### Stack

- React
- Vite
- plain CSS or lightweight CSS modules
- no heavy UI library needed

### Directory

Create a separate `site/` app so the showcase remains isolated from the CLI/tooling root.

Suggested structure:

- `site/index.html`
- `site/package.json`
- `site/vite.config.js`
- `site/src/main.jsx`
- `site/src/App.jsx`
- `site/src/styles.css`

### GitHub Pages deployment

Use GitHub Actions to build the Vite site and deploy the generated `dist/` to GitHub Pages.

Recommended approach:

- keep source in `site/`
- build with `npm run build` inside `site/`
- deploy via Pages workflow using GitHub Actions

## Content Requirements

- page copy should be concise and technical
- the Harness story must appear in hero, core architecture, and kit examples
- avoid generic AI marketing language
- highlight real project files and real flow contracts

## Non-Goals

- no docs portal
- no blog system
- no CMS
- no backend
- no multi-page app for first version

## Success Criteria

A first-time visitor should be able to answer these questions within one screen or two:

- what is ClawKit
- what makes its agent design different
- what does Harness mean in this repo
- what are the example kits
- how do I try it
