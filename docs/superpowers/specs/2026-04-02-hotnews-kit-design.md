# HotNews Kit Design

## Goal

Create a hotnews-kit for ClawKit that takes a news headline or link, searches for related content via tavily-search, and produces platform-specific articles for Toutiao, Xiaohongshu, WeChat Official Account, and Douyin.

## Agents

Six agents in a reviewed pipeline:

| Agent | Role | allowAgents |
|-------|------|-------------|
| `researcher` | Receives news input, searches via tavily-search, organizes materials | `toutiao-writer`, `xhs-writer`, `wechat-writer`, `douyin-writer` |
| `toutiao-writer` | Creates Toutiao-style article | `editor` |
| `xhs-writer` | Creates Xiaohongshu-style note | `editor` |
| `wechat-writer` | Creates WeChat Official Account article | `editor` |
| `douyin-writer` | Creates Douyin short video script | `editor` |
| `editor` | Reviews all platform content, flags issues, produces summary | `researcher` |

Communication flow:

```
Boss (user) -> researcher -> toutiao-writer  \
                          -> xhs-writer       -> editor -> Boss
                          -> wechat-writer   /
                          -> douyin-writer   /
```

Editor can send back to researcher if materials are insufficient.

## Workflow

1. User provides a news headline or link to `researcher`.
2. `researcher` uses tavily-search skill to find related content.
3. `researcher` organizes search results into a structured materials file and writes it to `workspace-shared/materials/{task-id}/research.md`.
4. `researcher` sends the task to all four writers in parallel.
5. Each writer reads the materials file and creates platform-specific content.
6. Each writer writes output to `workspace-shared/output/{task-id}/{platform}.md` and notifies `editor`.
7. `editor` reviews all four articles for quality, accuracy, and platform fit.
8. `editor` writes a review summary to `workspace-shared/output/{task-id}/review.md`, flagging any issues that need human attention.
9. `editor` reports completion to the user.

## Agent Personalities

### researcher

- Thorough and methodical
- Searches multiple angles of a news story
- Organizes information clearly with source attribution
- Separates facts from opinions
- Includes key quotes, statistics, and timeline

### toutiao-writer

- Direct, attention-grabbing headlines
- Informative and fast-paced writing style
- Clear paragraph structure with short sentences
- Includes key data points and quotes
- 800-1500 characters typical length

### xhs-writer

- Conversational and personal tone
- Uses emoji naturally (not excessively)
- Structured with clear sections and line breaks
- Includes hashtag recommendations
- 500-1000 characters typical length
- Focuses on relevance to everyday life

### wechat-writer

- Professional and in-depth analysis
- Well-structured with clear sections and subheadings
- Balanced viewpoint with multiple perspectives
- Includes background context for readers
- 1500-3000 characters typical length
- Ends with thought-provoking summary

### douyin-writer

- Script format with scene descriptions
- Hook within first 3 seconds
- Conversational narration style
- 60-180 seconds typical duration
- Includes visual direction notes
- Ends with engagement prompt (comment/share)

### editor

- Critical and detail-oriented
- Checks factual accuracy against source materials
- Evaluates platform-specific tone and format fit
- Flags issues clearly with specific suggestions
- Does not rewrite content, only reviews and flags
- Produces a structured review summary

## Shared Workspace Structure

```
workspace-shared/
├── materials/
│   └── {task-id}/
│       └── research.md
└── output/
    └── {task-id}/
        ├── toutiao.md
        ├── xiaohongshu.md
        ├── wechat.md
        ├── douyin.md
        └── review.md
```

Task ID format: `YYYYMMDD-HHMMSS` (timestamp of the request).

Ownership:
- `researcher` writes to `materials/`
- Each writer writes its own file to `output/{task-id}/`
- `editor` writes `review.md` to `output/{task-id}/`

## Communication Rules

### Hard Rules

- User communicates only with `researcher`.
- `researcher` does not write articles.
- Writers do not communicate with each other.
- Writers do not communicate with `researcher`.
- Writers do not report to the user.
- `editor` does not rewrite content.
- `editor` can request additional research from `researcher` if materials are insufficient.
- Only `editor` produces the final review summary visible to the user.

### Handoff Format

All handoffs include:
- Current state
- Next owner
- Next action
- Reference to relevant workspace files

## Output Format

### research.md

```markdown
# Research: {news title}

## Summary
One paragraph summary of the news.

## Key Facts
- Fact 1 (source)
- Fact 2 (source)

## Key Quotes
- "Quote" — Source

## Timeline
- Date: Event

## Background Context
Relevant background information.

## Sources
- Source 1: URL
- Source 2: URL
```

### Platform articles

Each platform article file includes:
- Platform name header
- The article content in platform-appropriate format
- Metadata footer (word count, hashtags if applicable)

### review.md

```markdown
# Review: {news title}

## Overall Assessment
Pass/Needs Attention

## Platform Reviews

### Toutiao
- Status: Pass / Needs Attention
- Issues: (if any, with specific suggestions)

### Xiaohongshu
- Status: Pass / Needs Attention
- Issues: (if any)

### WeChat
- Status: Pass / Needs Attention
- Issues: (if any)

### Douyin
- Status: Pass / Needs Attention
- Issues: (if any)

## Factual Accuracy
Any factual concerns found across articles.
```

## Kit Configuration

### kit.json

```json
{
  "name": "hotnews-kit",
  "version": "1.0.0",
  "displayName": "Hot News Multi-Platform Content Creator",
  "description": "Search news and create platform-specific articles for Toutiao, Xiaohongshu, WeChat, and Douyin",
  "agents": [
    { "id": "researcher", "role": "News Researcher", "soulFile": "agents/researcher/SOUL.md" },
    { "id": "toutiao-writer", "role": "Toutiao Writer", "soulFile": "agents/toutiao-writer/SOUL.md" },
    { "id": "xhs-writer", "role": "Xiaohongshu Writer", "soulFile": "agents/xhs-writer/SOUL.md" },
    { "id": "wechat-writer", "role": "WeChat Writer", "soulFile": "agents/wechat-writer/SOUL.md" },
    { "id": "douyin-writer", "role": "Douyin Script Writer", "soulFile": "agents/douyin-writer/SOUL.md" },
    { "id": "editor", "role": "Content Editor", "soulFile": "agents/editor/SOUL.md" }
  ],
  "sharedWorkspace": "workspace-shared",
  "setup": "setup.js"
}
```

### openclaw.json

```json
{
  "agents": {
    "list": [
      { "id": "researcher", "subagents": { "allowAgents": ["toutiao-writer", "xhs-writer", "wechat-writer", "douyin-writer"] } },
      { "id": "toutiao-writer", "subagents": { "allowAgents": ["editor"] } },
      { "id": "xhs-writer", "subagents": { "allowAgents": ["editor"] } },
      { "id": "wechat-writer", "subagents": { "allowAgents": ["editor"] } },
      { "id": "douyin-writer", "subagents": { "allowAgents": ["editor"] } },
      { "id": "editor", "subagents": { "allowAgents": ["researcher"] } }
    ]
  }
}
```

### setup.js

The setup script:
1. Installs tavily-search skill for the researcher agent (from https://clawhub.ai/jacky1n7/openclaw-tavily-search)
2. Configures all agents to use Sonnet model (with per-agent override capability)

## Kit Directory Structure

```
kits/hotnews-kit/
├── kit.json
├── openclaw.json
├── setup.js
├── README.md
├── agents/
│   ├── researcher/SOUL.md
│   ├── toutiao-writer/SOUL.md
│   ├── xhs-writer/SOUL.md
│   ├── wechat-writer/SOUL.md
│   ├── douyin-writer/SOUL.md
│   └── editor/SOUL.md
└── workspace-shared/
    ├── materials/.gitkeep
    └── output/.gitkeep
```

## Scope Boundaries

This design does NOT cover:
- Automatic publishing to any platform
- Image generation or selection
- SEO optimization
- Content scheduling
- Analytics or performance tracking
- Multi-language support (Chinese only)
