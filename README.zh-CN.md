# ClawKit

OpenClaw 多智能体系统的可复用工作流套件。

## 什么是 Kit？

Kit 是一个打包好的多智能体工作流，可以部署到任何 OpenClaw 环境中。每个 kit 包含：

- **智能体定义**：`SOUL.md` 文件定义个性、职责和约束
- **路由规则**：谁可以和谁对话，也就是 `kit.json` 里的 `allowAgents`
- **共享工作区**：智能体协作产物的目录结构
- **元数据**：`kit.json` 包含版本、描述和智能体清单

Kit 让你可以直接复用已经验证过的多智能体模式，不用每次都从零搭建。

## 环境要求

- `clawkit` CLI：Node.js `>= 18`
- `clawkittool` 安装器：Node.js `>= 22`
- macOS / Linux：`build:distribution` 和 `hotnews-kit/setup.js` 需要系统里有 `zip` / `unzip`
- Windows：`build:distribution`、`clawkittool get`、`hotnews-kit/setup.js` 使用 PowerShell 内置压缩/解压能力，不再依赖 `curl` / `zip` / `unzip`

## 使用方式

### 1. `git clone` 仓库后直接使用 `clawkit`

```bash
# 克隆仓库
git clone https://github.com/iamhanson/clawkit.git
cd openclawstudy

# 运行测试
npm test

# 列出可用的 kit
node cli/index.js list

# 查看 kit 详情
node cli/index.js info product-kit

# 校验 kit 结构
node cli/index.js validate product-kit

# 预览部署效果（dry-run）
node cli/index.js deploy product-kit --config ~/.openclaw

# 实际部署
node cli/index.js deploy product-kit --config ~/.openclaw --apply
```

### 2. 通过 `npm` 安装 `clawkittool`

适合最终用户按需下载某一个 kit，并尽量自动部署到本机 OpenClaw 环境：

```bash
npm install -g clawkittool

clawkittool get product-kit \
  --manifest https://github.com/iamhanson/clawkit/releases/download/v0.1.0/manifest.json
```

安装器默认会：

- 下载 `core.zip`
- 下载指定 kit 的 zip
- 在目标目录执行 `npm install`
- 自动探测 OpenClaw 配置
- 先询问是否使用探测到的配置路径
- 用户确认后执行 `deploy`
- 如果用户拒绝，可以手动输入配置目录或 `openclaw.json` 路径

如果只想下载，不自动执行安装或部署：

```bash
clawkittool get product-kit \
  --manifest https://github.com/iamhanson/clawkit/releases/download/v0.1.0/manifest.json \
  --skip-install \
  --skip-deploy
```

## 可用的 Kit

### product-kit

基于 Harness 设计的产品交付工作流，由 `pm` 统一编排需求、开发、测试和最终汇报。

```text
Boss -> pm -> dev -> pm -> qa -> pm -> Boss
```

| 智能体 | 角色 | 通信对象 |
|-------|------|---------|
| `pm`  | 产品经理 / control layer | `dev`, `qa` |
| `dev` | 开发者 | `pm` |
| `qa`  | 测试工程师 | `pm` |

**使用场景：** 结构化产品研发流程，适合清晰交接、缺陷回路、统一验收和单一业务出口。

```bash
clawkit deploy product-kit --config ~/.openclaw --apply
```

### hotnews-kit

基于 Harness 设计的热点新闻多平台内容工作流，由 `orchestrator` 统一调度研究、写作、审核和返工。

```text
用户 -> orchestrator -> researcher -> orchestrator
                                   -> toutiao-writer \
                                   -> xhs-writer      -> orchestrator -> editor -> orchestrator -> 用户
                                   -> wechat-writer  /
                                   -> douyin-writer /
```

| 智能体 | 角色 | 通信对象 |
|-------|------|---------|
| `orchestrator` | 工作流调度器 / control layer | `researcher`, `toutiao-writer`, `xhs-writer`, `wechat-writer`, `douyin-writer`, `editor` |
| `researcher` | 新闻搜索 | `orchestrator` |
| `toutiao-writer` | 今日头条写手 | `orchestrator` |
| `xhs-writer` | 小红书写手 | `orchestrator` |
| `wechat-writer` | 微信公众号写手 | `orchestrator` |
| `douyin-writer` | 抖音脚本写手 | `orchestrator` |
| `editor` | 内容审核 | `orchestrator` |

**使用场景：** 新闻内容创作流水线，适合统一入口、多平台并行生成、集中审核和多轮 revision。

```bash
clawkit deploy hotnews-kit --config ~/.openclaw --apply
```

部署时，setup 会询问 Tavily API Key，把 `TAVILY_API_KEY=...` 追加到 `~/.openclaw/.env`，并把 `tavily-search` skill 安装到 researcher 的 workspace 中。

## CLI 用法

```bash
# 列出所有可用的 kit
clawkit list

# 显示 kit 详情（智能体、版本、描述）
clawkit info <kit>

# 验证 kit 结构
clawkit validate <kit>

# 部署 kit（默认 dry-run）
clawkit deploy <kit> --config ~/.openclaw

# 实际部署
clawkit deploy <kit> --config ~/.openclaw --apply

# 使用自定义前缀部署（避免 ID 冲突）
clawkit deploy <kit> --config ~/.openclaw --apply --target-name sandbox

# 强制覆盖已部署的文件
clawkit deploy <kit> --config ~/.openclaw --apply --force
```

**注意：** `--config` 支持目录路径（例如 `~/.openclaw`）或完整文件路径（例如 `~/.openclaw/openclaw.json`）。如果你传的是目录，ClawKit 会自动在其中查找 `openclaw.json`。

## 项目结构

```text
clawkit/
├── kits/                     # 所有可用的 kit
│   └── product-kit/          # 每个 kit 一个目录
│       ├── kit.json          # Kit 元数据和智能体清单
│       ├── README.md         # Kit 文档
│       ├── agents/           # 智能体 SOUL 文件
│       │   ├── pm/SOUL.md
│       │   ├── dev/SOUL.md
│       │   └── qa/SOUL.md
│       └── workspace-shared/ # 共享工作区模板
├── cli/                      # CLI 工具
│   ├── index.js              # 入口
│   └── lib/
│       ├── kit-loader.js     # Kit 发现与验证
│       ├── deployer.js       # 部署逻辑
│       └── merger.js         # 配置合并
├── tests/                    # 测试套件
├── docs/KIT-SPEC.md          # Kit 格式规范
└── package.json
```

## Harness 设计规范

从当前版本开始，ClawKit 推荐所有新 kit 优先采用 Harness 风格设计，而不是任由 agent 彼此自由串联。

### 1. 必须有明确的控制层 agent

- 每个 kit 应有一个中枢 agent 负责流程编排
- 这个 agent 是默认用户入口，也是主要状态出口
- 其他 worker agent 尽量不要直接对用户汇报最终结果

常见映射：

- 产品类流程：`pm` 作为 control layer
- 内容类流程：`orchestrator` 作为 control layer

### 2. 通信链路应尽量收敛为 Hub-and-Spoke

- 优先采用“中枢 -> worker -> 中枢”的通信模式
- 避免 worker 之间形成隐式流程依赖
- 除非业务上确实必要，不要让 `dev -> qa -> dev`、`writer -> editor -> writer` 这种横向直连成为主链路

推荐原则：

- 流程推进通过 control layer 完成
- worker 负责产出专业结果，不负责推进整个流程
- evaluator 的结论回到 control layer，由 control layer 决定是否返工、升级、结束

### 3. 共享工作区必须承担正式交接物契约

- agent 自己的 workspace 用于本地思考、草稿、临时上下文
- shared workspace 用于正式 handoff artifacts
- README 和 `SOUL.md` 中应明确每类 artifact 写到哪里
- 建议按 `taskId` 分目录，避免多轮任务相互覆盖

推荐模式：

- `tasks/{taskId}/...`
- `briefs/{taskId}/...`
- `materials/{taskId}/...`
- `deliveries/{taskId}/...`
- `reviews/{taskId}/...`
- `reports/{taskId}/...`

### 4. 状态回流必须清晰

- kit 设计里必须明确谁创建任务、谁接收完成态、谁接收失败态
- 返工回路应写清楚，不要依赖 agent 自己“猜下一步”
- 如果存在评审、测试、审核节点，默认应把结论回传给 control layer，而不是直接跨级派工

一个合格的 harness 设计，至少应该能回答：

- 谁是入口？
- 谁是流程拥有者？
- 谁负责最终对外输出？
- 失败后回流给谁？
- 正式交接物写到哪里？

### 5. `SOUL.md`、`kit.json`、README 必须一致

- `kit.json` 负责声明真实路由和 agent 元数据
- `SOUL.md` 负责声明角色边界、输出格式、禁止事项
- README 负责解释工作流逻辑和部署结果
- 三者必须表达同一套协作模型，不能 README 说 hub-and-spoke、`allowAgents` 却还是全互通

### 6. 默认不要改目标环境的 `agents.defaults`

- kit 应尽量在自己的 agent 作用域内完成模型、认证、skills 等配置
- 原有 `agents.defaults` 应默认保留
- 如果某个 kit 确实需要特殊默认值，应在 `setup.js` 中显式处理，并在 README 里明确提示用户影响范围

## 贡献

欢迎社区贡献新的 kit，详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

**快速概览：**

1. 创建 `kits/your-kit-name/`，包含 `kit.json` 和智能体 `SOUL.md`
2. 运行 `clawkit validate your-kit-name` 验证结构
3. 在 `tests/` 下补充测试
4. 提交 PR

ClawKit 默认保持目标环境中已有的 `agents.defaults` 不变。如果某个 kit 确实需要调整默认值，应通过 `setup.js` 显式处理，并在文档中清楚提示用户。

完整的 kit 规范见 [docs/KIT-SPEC.md](./docs/KIT-SPEC.md)。

## 发布 distribution 到 GitHub Release

如果你是维护者，需要为 `clawkittool` 提供可下载的 release assets，可以在仓库根目录执行：

```bash
npm run build:distribution
```

构建完成后会在 `dist/distribution/` 下生成：

- `core.zip`
- `manifest.json`
- `kits/*.zip`

默认情况下，`manifest.json` 会把下载前缀写成 `https://example.com/clawkit`。正式发布前请至少配置下面两种方式之一：

- `CLAWKIT_DIST_BASE_URL`
- `CLAWKIT_GITHUB_REPO` + `CLAWKIT_GITHUB_TAG`

如果要把产物发布到 GitHub Release，可以这样构建：

```bash
CLAWKIT_GITHUB_REPO=iamhanson/clawkit \
CLAWKIT_GITHUB_TAG=v0.1.0 \
npm run build:distribution
```

仓库内已经包含自动化 workflow：

- [.github/workflows/release-distribution.yml](/Users/hanson/Documents/work/openclawstudy/.github/workflows/release-distribution.yml)

当你 push 一个形如 `v*` 的 tag 时，GitHub Actions 会自动：

1. 运行 `npm test`
2. 运行 `npm run build:distribution`
3. 创建或更新对应 tag 的 GitHub Release
4. 上传这些 release assets：
   - `core.zip`
   - `manifest.json`
   - `kits/*.zip`

使用方式：

```bash
git tag v0.1.0
git push origin v0.1.0
```

构建时会自动把 `manifest.json` 里的下载地址写成当前仓库和当前 tag 对应的 GitHub Release 地址。

## 许可证

MIT
