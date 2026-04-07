# HotNews Kit

搜索新闻，并为今日头条、小红书、微信公众号、抖音生成平台专属内容。

## 智能体

| 智能体 | 角色 | 模型 |
|-------|------|------|
| `researcher` | 使用 tavily-search 搜索新闻并整理素材 | Sonnet |
| `toutiao-writer` | 生成今日头条风格文章 | Sonnet |
| `xhs-writer` | 生成小红书风格笔记 | Sonnet |
| `wechat-writer` | 生成微信公众号文章 | Sonnet |
| `douyin-writer` | 生成抖音短视频脚本 | Sonnet |
| `editor` | 审核所有内容并指出问题 | Sonnet |


## 工作流

<img width="1250" height="1826" alt="d739209540b3db9d06a233bfd06ddb0c" src="https://github.com/user-attachments/assets/343e2692-f088-460d-89ba-f12f3fd8d297" />

```text
用户 -> researcher -> toutiao-writer \
                   -> xhs-writer      -> editor -> 用户
                   -> wechat-writer  /
                   -> douyin-writer  /
```

1. 用户提供新闻标题或链接
2. `researcher` 作为唯一入口 agent 搜索相关内容，并把素材写入共享工作区
3. `researcher` 在同一轮工作流里把任务并行分发给四个 writer
4. 四个 writer 产出平台内容，并在 `submissions/{task-id}/` 下写各自的提交标记
5. `editor` 以 `submissions/{task-id}/` 为准汇总四个平台稿件，审核后输出结论
6. 用户收到审核报告和全部输出文件

## 前置要求

- 准备好 Tavily API Key
- Node.js `>= 18`
- macOS / Linux：运行 `setup.js` 的环境中需要有 `unzip`
- Windows：使用 PowerShell 内置解压能力，无需额外安装 `curl` / `zip` / `unzip`

## 使用方法

```bash
# 部署 kit
clawkit deploy hotnews-kit --config ~/.openclaw --apply

# setup 脚本会：
# 1. 询问两组模型配置
# 2. 询问 Tavily API Key
# 3. 把模型写入对应 agent 的 models.json，并同步更新 openclaw.json 中各 agent 的 model 字段
# 4. 追加 TAVILY_API_KEY 到 ~/.openclaw/.env
# 5. 下载并安装 tavily-search 到 researcher 的 workspace
```

Tavily skill 默认安装到：

```text
~/.openclaw/workspace-hotnews-kit-researcher/skills/tavily-search/
```

## 输出结构

每次任务会在共享工作区 `workspace-hotnews-kit-shared` 下产出这些文件：

```text
workspace-hotnews-kit-shared/
├── materials/{task-id}/research.md    # 搜索素材
├── submissions/{task-id}/
│   ├── toutiao.md                     # writer 提交给 editor 的完成标记
│   ├── xiaohongshu.md
│   ├── wechat.md
│   └── douyin.md
└── output/{task-id}/
    ├── toutiao.md                     # 今日头条文章
    ├── xiaohongshu.md                 # 小红书笔记
    ├── wechat.md                      # 微信公众号文章
    ├── douyin.md                      # 抖音脚本
    └── review.md                      # 审核报告
```

说明：

- 默认只有 `researcher` 作为入口先被触发
- 四个 writer 和 `editor` 都是收到上游 handoff 后按需参与，不会在部署后自动常驻启动
- `submissions/{task-id}/` 用来让 `editor` 判断四个平台是否都已完成提交

## 自定义模型

如果你要调整模型分配，可以编辑 `setup.js` 里的配置逻辑。例如：

```javascript
const modelConfig = {
  researcher: 'sonnet',
  'toutiao-writer': 'haiku',
  'xhs-writer': 'haiku',
  'wechat-writer': 'sonnet',
  'douyin-writer': 'haiku',
  editor: 'opus',
};
```
