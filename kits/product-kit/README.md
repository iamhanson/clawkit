# Product Kit

这个示例描述了一套轻量的产品交付工作流，包含 3 个智能体：

- `pm`：产品经理
- `dev`：研发
- `qa`：测试

老板是工作流之外的人类用户。智能体之间按固定链路通信：

```text
Boss -> pm -> dev -> qa -> pm -> Boss
```

缺陷回路是：

```text
qa -> dev
qa -> pm
dev -> qa
```

## 允许的通信路径

- `pm -> dev`
- `dev -> pm, qa`
- `qa -> dev, pm`

## 目录结构

- `workspace-pm/SOUL.md`：产品经理角色定义和工作上下文
- `workspace-dev/SOUL.md`：研发角色定义和工作上下文
- `workspace-qa/SOUL.md`：测试角色定义和工作上下文
- `workspace-shared/briefs/`：`pm` 输出的正式需求
- `workspace-shared/schedules/`：`dev` 输出的评估与排期
- `workspace-shared/deliveries/`：`dev` 输出的交付说明
- `workspace-shared/tests/`：`qa` 输出的测试结论
- `workspace-shared/reports/`：`pm` 输出的最终验收汇报

## 使用方法

1. 先检查每个 `SOUL.md`，按你的团队风格调整措辞
2. 把 `examples/product-cycle/...` 这类示例路径替换成你自己的实际路径
3. 保持每个智能体的 `SOUL.md` 位于各自 workspace 根目录
4. 把配置加载进 OpenClaw，运行前确认 `allowAgents` 路由是否正确

## 适配真实 OpenClaw 环境

如果你的 OpenClaw 环境要求使用绝对路径，请把下面这些示例路径：

- `examples/product-cycle/workspace-pm`
- `examples/product-cycle/workspace-dev`
- `examples/product-cycle/workspace-qa`
- `examples/product-cycle/workspace-shared`

替换成你在 `~/.openclaw/` 环境中的真实路径。

这个示例为了便于展示，保留了仓库内相对路径；真实部署通常应该使用绝对路径。

## Setup 脚本

这个 kit 带了一个 `setup.example.js` 示例脚本，用来演示部署后如何继续配置模型和技能。

使用方法：

1. 复制示例脚本：`cp setup.example.js setup.js`
2. 按需要调整模型和技能配置
3. 在 `kit.json` 中加入 `"setup": "setup.js"`
4. 执行部署：`clawkit deploy product-kit --config ~/.openclaw --apply`

部署完成后，setup 脚本会自动运行，并为各个智能体补充模型和技能配置。
