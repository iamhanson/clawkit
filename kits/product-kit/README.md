# Product Kit

这个 kit 描述了一套轻量的产品研发闭环，多 Agent 分工如下：

- `pm`：产品经理
- `dev`：研发
- `qa`：测试

老板是工作流之外的人类用户，入口固定为 `pm`。

## 通信链路

主流程：

```text
Boss -> pm -> dev -> qa -> pm -> Boss
```

缺陷回路：

```text
qa -> dev
qa -> pm
dev -> qa
```

允许的内部路由：

- `pm -> dev`
- `dev -> pm, qa`
- `qa -> dev, pm`

## 部署后的目录结构

部署到目标 OpenClaw 环境后，会生成：

- `workspace-<target>-pm/SOUL.md`
- `workspace-<target>-dev/SOUL.md`
- `workspace-<target>-qa/SOUL.md`
- `workspace-<target>-shared/briefs/`
- `workspace-<target>-shared/schedules/`
- `workspace-<target>-shared/deliveries/`
- `workspace-<target>-shared/tests/`
- `workspace-<target>-shared/reports/`

其中：

- `pm` 在 shared 的 `briefs/` 和 `reports/` 中写正式交接物
- `dev` 在 shared 的 `schedules/` 和 `deliveries/` 中写正式交接物
- `qa` 在 shared 的 `tests/` 中写正式交接物

## kit 源文件结构

仓库里的模板文件位于：

- `agents/pm/SOUL.md`
- `agents/dev/SOUL.md`
- `agents/qa/SOUL.md`
- `workspace-shared/`

部署器会把这些模板复制到目标 OpenClaw 目录，并改写成带 `target-name` 的实际路径。

## 使用方法

先执行 dry-run：

```bash
clawkit deploy product-kit --config ~/.openclaw
```

确认无误后正式部署：

```bash
clawkit deploy product-kit --config ~/.openclaw --apply
```

如果要用自定义前缀：

```bash
clawkit deploy product-kit --config ~/.openclaw --target-name sandbox --apply
```

部署后，实际 agent id 会变成：

- `sandbox-pm`
- `sandbox-dev`
- `sandbox-qa`

## 工具画像

这个 kit 的 3 个 agent 都显式声明了：

```json
{
  "tools": {
    "profile": "full"
  }
}
```

这样可以减少不同 OpenClaw 环境默认工具配置不一致带来的运行偏差。

## 默认 Setup

这个 kit 现在自带可执行的 [setup.js](/Users/hanson/Documents/work/openclawstudy/kits/product-kit/setup.js)。

它的默认行为是：

1. 只收集 **一套** 模型与认证信息
2. 把同一套模型配置应用到 `pm/dev/qa`
3. 仍然给每个 agent 各自生成独立文件：
   - `agents/<agentId>/agent/models.json`
   - `agents/<agentId>/agent/auth-profiles.json`

这样默认配置最简单，但后续你仍然可以按 agent 单独改文件。

部署时会同步更新：

- `openclaw.json` 里的 `agent.model`
- 各 agent 自己目录下的 `models.json`
- 各 agent 自己目录下的 `auth-profiles.json`

如果你想看一个更偏“模板/二次开发”的版本，可以参考：
[setup.example.js](/Users/hanson/Documents/work/openclawstudy/kits/product-kit/setup.example.js)
