# HotNews Kit

Search news and create platform-specific articles for Toutiao, Xiaohongshu, WeChat Official Account, and Douyin.

## Agents

| Agent | Role | Model |
|-------|------|-------|
| `researcher` | Searches news via tavily-search, organizes materials | Sonnet |
| `toutiao-writer` | Creates Toutiao (今日头条) style article | Sonnet |
| `xhs-writer` | Creates Xiaohongshu (小红书) style note | Sonnet |
| `wechat-writer` | Creates WeChat (微信公众号) article | Sonnet |
| `douyin-writer` | Creates Douyin (抖音) short video script | Sonnet |
| `editor` | Reviews all content, flags issues | Sonnet |

## Workflow

```text
User -> researcher -> toutiao-writer \
                   -> xhs-writer      -> editor -> User
                   -> wechat-writer  /
                   -> douyin-writer  /
```

1. User provides a news headline or link
2. `researcher` searches related content and writes materials to shared workspace
3. Four writers create platform-specific content in parallel
4. `editor` reviews all articles and produces a review summary
5. User receives the review report with all output files

## Prerequisites

- [tavily-search skill](https://clawhub.ai/jacky1n7/openclaw-tavily-search) (installed automatically by setup.js)

## Usage

```bash
# Deploy the kit
clawkit deploy hotnews-kit --config ~/.openclaw --apply

# The setup script will:
# 1. Install tavily-search skill for the researcher
# 2. Configure all agents to use Sonnet model
```

## Output Structure

Each task produces files in the shared workspace (`workspace-hotnews-kit-shared`):

```
workspace-hotnews-kit-shared/
├── materials/{task-id}/research.md    # 搜索素材
└── output/{task-id}/
    ├── toutiao.md                     # 今日头条文章
    ├── xiaohongshu.md                 # 小红书笔记
    ├── wechat.md                      # 微信公众号文章
    ├── douyin.md                      # 抖音脚本
    └── review.md                      # 审核报告
```

## Customizing Models

Edit the `setup.js` file to change model assignments:

```javascript
const modelConfig = {
  'researcher': 'sonnet',
  'toutiao-writer': 'haiku',
  'xhs-writer': 'haiku',
  'wechat-writer': 'sonnet',
  'douyin-writer': 'haiku',
  'editor': 'opus',
};
```
