# Product Kit

这个 kit 描述了一套由 `pm` 统一编排的轻量产品研发闭环，多 Agent 分工如下：

- `pm`：产品经理
- `dev`：研发
- `qa`：测试

老板是工作流之外的人类用户，入口固定为 `pm`。

<img width="1073" height="592" alt="image" src="https://github.com/user-attachments/assets/427c8c2a-1de5-4979-8daf-ca97954f6fe0" />



## 通信链路

主流程：

```text
Boss -> pm -> dev -> pm -> qa -> pm -> Boss
```

缺陷回路：

```text
qa -> pm -> dev -> pm -> qa
```

允许的内部路由：

- `pm -> dev, qa`
- `dev -> pm`
- `qa -> pm`

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

其中正式交接物建议按任务维度落盘：

- `pm` 写 `briefs/{taskId}/brief.json`
- `dev` 写 `schedules/{taskId}/schedule.json`
- `dev` 写 `deliveries/{taskId}/delivery.json`
- `qa` 写 `tests/{taskId}/review.json`
- `pm` 写 `reports/{taskId}/report.json`

## kit 源文件结构

仓库里的模板文件位于：

- `agents/pm/SOUL.md`
- `agents/dev/SOUL.md`
- `agents/qa/SOUL.md`
- `workspace-shared/`

部署器会把这些模板复制到目标 OpenClaw 目录，并改写成带 `target-name` 的实际路径。

## 协作逻辑

这套 kit 的重点不是“谁都能互相叫人”，而是把流程控制权收敛到 `pm`：

- 老板只和 `pm` 说话
- `pm` 先做需求澄清和方案汇报，再把任务派给 `dev`
- `dev` 只回 `pm`，提交排期、实现结果、风险说明
- `pm` 判断开发交付是否足够进入测试，再调用 `qa`
- `qa` 只回 `pm`，输出测试结论并明确是否可以上线
- `pm` 统一做产品验收和老板汇报

这样做的好处是：

- 路由更稳定，不容易出现 `dev` 和 `qa` 互相绕过产品经理的情况
- 责任更清晰，谁负责“推进流程”一眼就能看出来
- 后续要扩展审计、归档、审批节点时，直接挂在 `pm` 这一层就行

## Harness 开发要求映射

这个 kit 是对仓库根目录 Harness 规范的一次直接落地：

- `pm` 是唯一 control layer，也是默认用户入口
- `dev` 和 `qa` 都是专业 worker，不负责主流程推进
- 所有状态推进都通过 `pm` 回流和再派发
- 正式交接物全部落到 shared workspace，而不是散落在各 agent 私有目录
- `kit.json` 的 `allowAgents`、各自的 `SOUL.md`、这里的 README 都使用同一套路由模型

如果你后续要扩展这个 kit，建议也遵守同样的约束：

- 新增审批、设计评审、上线确认节点时，优先挂到 `pm`
- 不要把 `dev` 和 `qa` 改回直接互相调度
- 新增 artifact 时，优先按 `taskId` 写入 shared workspace

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
