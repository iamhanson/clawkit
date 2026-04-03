# ClawKit

OpenClaw 多智能体系统的可复用工作流套件。

## 什么是 Kit？

Kit 是一个打包好的多智能体工作流，可以部署到任何 OpenClaw 环境中。每个 kit 包含：

- **智能体定义**：`SOUL.md` 文件定义个性、职责和约束
- **路由规则**：谁可以和谁对话，也就是 `kit.json` 里的 `allowAgents`
- **共享工作区**：智能体协作产物的目录结构
- **元数据**：`kit.json` 包含版本、描述和智能体清单

Kit 让你可以直接复用已经验证过的多智能体模式，不用每次都从零搭建。

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/user/clawkit.git
cd clawkit

# 列出可用的 kit
node cli/index.js list

# 预览部署效果（dry-run）
node cli/index.js deploy product-kit --config ~/.openclaw

# 实际部署
node cli/index.js deploy product-kit --config ~/.openclaw --apply
```

或者通过 npm 全局安装：

```bash
npm install -g clawkit

clawkit list
clawkit deploy product-kit --config ~/.openclaw --apply
```

## 可用的 Kit

### product-kit

`PM -> Dev -> QA` 的产品交付工作流，具有严格路由和共享工作区。

```text
Boss -> pm -> dev -> qa -> pm -> Boss
```

| 智能体 | 角色 | 通信对象 |
|-------|------|---------|
| `pm`  | 产品经理 | `dev` |
| `dev` | 开发者 | `pm`, `qa` |
| `qa`  | 测试工程师 | `dev`, `pm` |

**使用场景：** 结构化产品研发流程，适合清晰交接、缺陷回路和单一业务出口。

```bash
clawkit deploy product-kit --config ~/.openclaw --apply
```

### hotnews-kit

搜索新闻并为今日头条、小红书、微信公众号、抖音生成平台专属内容。

```text
用户 -> researcher -> toutiao-writer \
                   -> xhs-writer      -> editor -> 用户
                   -> wechat-writer  /
                   -> douyin-writer  /
```

| 智能体 | 角色 | 通信对象 |
|-------|------|---------|
| `researcher` | 新闻搜索 | `toutiao-writer`, `xhs-writer`, `wechat-writer`, `douyin-writer` |
| `toutiao-writer` | 今日头条写手 | `editor` |
| `xhs-writer` | 小红书写手 | `editor` |
| `wechat-writer` | 微信公众号写手 | `editor` |
| `douyin-writer` | 抖音脚本写手 | `editor` |
| `editor` | 内容审核 | `researcher` |

**使用场景：** 新闻内容创作流水线，包含搜索、多平台写作和编辑审核。

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

## 贡献

欢迎社区贡献新的 kit，详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

**快速概览：**

1. 创建 `kits/your-kit-name/`，包含 `kit.json` 和智能体 `SOUL.md`
2. 运行 `clawkit validate your-kit-name` 验证结构
3. 在 `tests/` 下补充测试
4. 提交 PR

ClawKit 默认保留目标环境中已有的 `agents.defaults` 不变。如果某个 kit 确实需要调整默认值，应通过 `setup.js` 显式处理，并在文档中明确提示用户。

完整 kit 规范见 [docs/KIT-SPEC.md](./docs/KIT-SPEC.md)。

## 发布 distribution 到 GitHub Release

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
