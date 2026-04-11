# HotNews Kit

基于 Harness Engineering 思路的热点新闻多平台内容工作流。

## 智能体

| 智能体 | 角色 | 职责 |
|-------|------|------|
| `orchestrator` | 工作流调度器 | 唯一入口，创建任务、派工、汇总、返工控制、对用户输出 |
| `researcher` | 资料研究员 | 搜索新闻素材，输出结构化 research artifacts |
| `toutiao-writer` | 今日头条写手 | 生成今日头条稿件 |
| `xhs-writer` | 小红书写手 | 生成小红书笔记 |
| `wechat-writer` | 微信公众号写手 | 生成微信公众号文章 |
| `douyin-writer` | 抖音脚本写手 | 生成抖音脚本 |
| `editor` | 内容审核员 | 统一审核四个平台稿件并输出 review artifacts |

## 工作流

```text
用户 -> orchestrator -> researcher -> orchestrator
                                   -> toutiao-writer \
                                   -> xhs-writer      -> orchestrator -> editor -> orchestrator -> 用户
                                   -> wechat-writer  /
                                   -> douyin-writer /
```

1. 用户把新闻标题或链接交给 `orchestrator`
2. `orchestrator` 创建 `task-id` 并写 `tasks/{task-id}/brief.json`
3. `orchestrator` 调起 `researcher`
4. `researcher` 输出 `research.md` 和 `research.json` 后回到 `orchestrator`
5. `orchestrator` 并行调起四个 writer
6. 四个 writer 各自产出平台稿件和 `submission.json`
7. `orchestrator` 确认四个平台都提交后，再统一调起 `editor`
8. `editor` 输出 `review.md` 和 `review.json`
9. `orchestrator` 根据 review 结果决定：
   - 直接交付给用户
   - 或只重派有问题的平台 writer 进行 revision

## 前置要求

- 准备好 Tavily API Key
- Node.js `>= 18`
- macOS / Linux：运行 `setup.js` 的环境中需要有 `unzip`
- Windows：使用 PowerShell 内置解压能力，无需额外安装 `curl` / `zip` / `unzip`

## 使用方法

```bash
clawkit deploy hotnews-kit --config ~/.openclaw --apply
```

setup 脚本会：

1. 询问两组模型配置
2. 询问 Tavily API Key
3. 把模型写入对应 agent 的 `models.json`
4. 同步更新 `openclaw.json` 中各 agent 的 `model` 字段
5. 追加 `TAVILY_API_KEY` 到 `~/.openclaw/.env`
6. 下载并安装 `tavily-search` 到 researcher 的 workspace

模型分组现在是：

- `orchestrator + researcher + editor`
- `4 个 writer`

Tavily skill 默认安装到：

```text
~/.openclaw/workspace-hotnews-kit-researcher/skills/tavily-search/
```

## 输出结构

每次任务会在共享工作区 `workspace-hotnews-kit-shared` 下产出这些文件：

```text
workspace-hotnews-kit-shared/
├── tasks/{task-id}/
│   └── brief.json
├── materials/{task-id}/
│   ├── research.md
│   └── research.json
├── output/{task-id}/
│   ├── toutiao.md
│   ├── xiaohongshu.md
│   ├── wechat.md
│   └── douyin.md
├── submissions/{task-id}/
│   ├── toutiao.json
│   ├── xiaohongshu.json
│   ├── wechat.json
│   └── douyin.json
└── reviews/{task-id}/
    ├── review.md
    └── review.json
```

说明：

- 只有 `orchestrator` 是用户入口
- `researcher` 不再直接派发 writer
- writer 不再直接调 `editor`
- `editor` 不再直接对用户汇报
- 所有流程推进都回到 `orchestrator`

## Harness 设计意图

这个 kit 不再是简单的“researcher 驱动内容流水线”，而是标准的 harness 分层：

- `orchestrator` = 控制层 / planner
- `researcher + writers` = generator workers
- `editor` = evaluator
- `workspace-shared` = artifacts contract

这样做的收益是：

- 用户入口统一
- handoff 更稳定
- revision 回路更清晰
- 更适合做长任务和多轮返工

## Harness 开发要求映射

这个 kit 对根目录中的 Harness 规范，具体落实为：

- `orchestrator` 是唯一 control layer，也是默认用户入口
- `researcher` 只负责 research，不直接派 writer
- writer 只负责生成内容，不直接调用 `editor`
- `editor` 只负责评审，不直接对用户输出最终结果
- 所有正式推进动作都回到 `orchestrator`
- 所有正式交接物都写入 shared workspace，对应清晰的 artifact contract

如果你后续扩展这个 kit，建议继续遵守这些约束：

- 新平台优先作为新的 writer 挂到 `orchestrator`
- 新评审节点优先作为 evaluator 挂到 `orchestrator`
- 不要把 writer 和 editor 改回互相直连
- revision、重写、补素材都通过 `orchestrator` 收口
