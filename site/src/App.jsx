const principles = [
  {
    title: '唯一控制层',
    text: '每条工作流都必须有明确的拥有者。流程推进只能发生在一个控制层里，而不是在多个 agent 之间意外漂移。',
  },
  {
    title: 'Hub-and-Spoke 路由',
    text: 'worker 负责产出，不偷偷接管编排。所有结果都要先回到控制层，再决定下一步怎么走。',
  },
  {
    title: '共享交接物契约',
    text: '正式交接文件写入 shared workspace，让任务具备可追溯、可审阅、可恢复的结构，而不是只停留在对话里。',
  },
  {
    title: '清晰的失败回流',
    text: '评审、测试、审核的结论统一回流到 orchestrator 或 control layer，而不是横向扩散成混乱的返工链路。',
  },
];

const primitives = [
  {
    label: 'SOUL.md',
    title: '带边界的 agent 身份定义',
    text: '角色、语气、输出结构、禁止事项、交接要求，都沉淀在一个文件里。',
  },
  {
    label: 'kit.json',
    title: '真实路由，真实拓扑',
    text: 'kit 定义里不仅有 agent 元数据，还有真正控制协作关系的 allow-list 图。',
  },
  {
    label: 'Shared Workspace',
    title: '用 artifacts 代替口头默契',
    text: 'brief、schedule、delivery、review、report 这些正式交接物，会成为稳定的工作流契约，而不是只留在聊天上下文里。',
  },
  {
    label: 'Setup + Deploy',
    title: '可移植到任何 OpenClaw 环境',
    text: '每个 kit 都可以被部署、配置、复用，而不需要手工去改一堆运行时文件。',
  },
];

const productArtifacts = ['brief.json', 'schedule.json', 'delivery.json', 'review.json', 'report.json'];
const hotnewsArtifacts = ['brief.json', 'research.json', 'submission.json', 'review.json'];

const installCommands = [
  {
    title: '克隆仓库后直接使用 ClawKit',
    code: `git clone https://github.com/iamhanson/clawkit.git\ncd openclawstudy\nnode cli/index.js deploy product-kit --config ~/.openclaw --apply`,
  },
  {
    title: '通过 ClawKitTool 安装单个 Kit',
    code: `npm install -g clawkittool\nclawkittool get product-kit \\\n  --manifest https://github.com/iamhanson/clawkit/releases/download/v0.1.0/manifest.json`,
  },
];

function SectionTag({ children }) {
  return <span className="section-tag">{children}</span>;
}

function ArtifactList({ items }) {
  return (
    <div className="artifact-list">
      {items.map((item) => (
        <span key={item} className="artifact-pill">
          {item}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <div className="page-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">CK</span>
          <div>
            <strong>ClawKit</strong>
            <p>以 Harness 为核心的 OpenClaw 工作流套件</p>
          </div>
        </div>
        <nav className="topnav">
          <a href="#harness">Harness</a>
          <a href="#kits">案例</a>
          <a href="#install">安装</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <SectionTag>Harness 作为中心叙事</SectionTag>
            <h1>
              面向 <span>OpenClaw</span> 的可复用工作流套件，
              用 Harness 重构多智能体协作。
            </h1>
            <p className="hero-text">
              ClawKit 不是把一堆 agent 拼在一起，而是把多智能体系统收敛成可复用的
              Harness 工作流。它为每个 kit 明确控制层、通信边界和 artifact contract，
              让协作关系稳定、可解释、可部署。
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="https://github.com/iamhanson/clawkit" target="_blank" rel="noreferrer">
                查看 GitHub
              </a>
              <a className="button button-secondary" href="#install">
                快速开始
              </a>
            </div>
            <div className="hero-metrics">
              <div>
                <span className="metric-value">2</span>
                <span className="metric-label">参考 Kit</span>
              </div>
              <div>
                <span className="metric-value">1</span>
                <span className="metric-label">每条工作流一个控制层</span>
              </div>
              <div>
                <span className="metric-value">6</span>
                <span className="metric-label">仓库内 Harness 规则</span>
              </div>
            </div>
          </div>

          <div className="hero-diagram">
            <div className="diagram-frame">
              <div className="diagram-header">Harness 拓扑</div>
              <div className="diagram-core">Control Layer</div>
              <div className="diagram-workers">
                <span>Workers</span>
                <span>Evaluators</span>
                <span>Shared Artifacts</span>
              </div>
              <div className="diagram-route route-top" />
              <div className="diagram-route route-left" />
              <div className="diagram-route route-right" />
              <div className="diagram-grid" />
            </div>
          </div>
        </section>

        <section className="section-block primitives">
          <div className="section-heading">
            <SectionTag>项目基础构件</SectionTag>
            <h2>ClawKit 不是 prompt 文件的堆砌。</h2>
            <p>
              一个 kit 是一整套可移植的工作流系统：人格定义、通信规则、交接契约、部署钩子，
              都作为一个整体协同存在。
            </p>
          </div>
          <div className="card-grid four-up">
            {primitives.map((item) => (
              <article key={item.label} className="info-card">
                <span className="card-label">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block harness-first" id="harness">
          <div className="section-heading narrow">
            <SectionTag>Harness First</SectionTag>
            <h2>这个仓库围绕“控制”组织，而不是围绕 agent 蔓延。</h2>
            <p>
              在 ClawKit 里，Harness 不是附带概念，而是设计语法。它决定 kit 怎么写、
              通信怎么收敛、任务怎么可观测。
            </p>
          </div>

          <div className="harness-layout">
            <div className="stack-visual">
              <div className="stack-layer stack-control">
                <strong>Control Layer</strong>
                <span>拥有流程推进权、用户入口和最终输出权。</span>
              </div>
              <div className="stack-layer stack-workers">
                <strong>Worker Layer</strong>
                <span>负责专业产出，但不悄悄接管编排职责。</span>
              </div>
              <div className="stack-layer stack-evaluator">
                <strong>Evaluator Layer</strong>
                <span>把结论回传给控制层，由它决定返工还是验收。</span>
              </div>
              <div className="stack-layer stack-artifacts">
                <strong>Shared Artifact Layer</strong>
                <span>把 briefs、deliveries、reviews、reports 沉淀成正式交接物。</span>
              </div>
            </div>

            <div className="principles-panel">
              {principles.map((principle) => (
                <article key={principle.title} className="principle-row">
                  <h3>{principle.title}</h3>
                  <p>{principle.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block comparison-block">
          <div className="section-heading narrow">
            <SectionTag>通信模型</SectionTag>
            <h2>ClawKit 选择明确的回流路径，而不是 mesh 式 agent 漂移。</h2>
          </div>
          <div className="comparison-grid">
            <article className="comparison-card comparison-bad">
              <span className="card-label">没有 Harness</span>
              <h3>到处横向互调</h3>
              <p>
                agent 之间会不断发明侧向通道，悄悄接管下一步，把失败变成隐藏的路由问题。
              </p>
              <ul>
                <li>入口过多</li>
                <li>状态所有权不清晰</li>
                <li>横向返工和隐藏循环</li>
              </ul>
            </article>
            <article className="comparison-card comparison-good">
              <span className="card-label">有 Harness</span>
              <h3>Hub-and-Spoke 协调</h3>
              <p>
                控制层拥有推进权。worker 和 evaluator 统一回传。shared artifacts 负责保留交接历史。
              </p>
              <ul>
                <li>唯一且明确的入口</li>
                <li>成功和失败都具备清晰回流路径</li>
                <li>协作关系稳定，可解释、可调试</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section-block kits-showcase" id="kits">
          <div className="section-heading">
            <SectionTag>参考案例</SectionTag>
            <h2>两个真实 workflow，展示 Harness 如何被嵌入到具体系统中。</h2>
          </div>
          <div className="kit-grid">
            <article className="kit-card">
              <div className="kit-card-header">
                <span className="card-label">产品交付 Harness</span>
                <h3>product-kit</h3>
              </div>
              <p>
                `pm` 是整个流程的 control layer，负责需求 intake、研发推进、测试协调和最终对老板汇报。
              </p>
              <pre className="flow-block">Boss -&gt; pm -&gt; dev -&gt; pm -&gt; qa -&gt; pm -&gt; Boss</pre>
              <ArtifactList items={productArtifacts} />
              <ul className="kit-points">
                <li>`pm` 负责需求澄清、设计汇报和最终验收。</li>
                <li>`dev` 只向 `pm` 回传排期和交付物。</li>
                <li>`qa` 只把测试结论回传给 `pm`。</li>
              </ul>
            </article>

            <article className="kit-card accent-card">
              <div className="kit-card-header">
                <span className="card-label">内容生产 Harness</span>
                <h3>hotnews-kit</h3>
              </div>
              <p>
                `orchestrator` 位于中心，让 research、writing、editorial review 都经过同一条可见的控制路径。
              </p>
              <pre className="flow-block">用户 -&gt; orchestrator -&gt; researcher / writers / editor -&gt; orchestrator -&gt; 用户</pre>
              <ArtifactList items={hotnewsArtifacts} />
              <ul className="kit-points">
                <li>`researcher` 不再直接派发 writer。</li>
                <li>writer 不再直接调 `editor`。</li>
                <li>`editor` 通过 `orchestrator` 回传评审结果。</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section-block install-block" id="install">
          <div className="section-heading">
            <SectionTag>安装与部署</SectionTag>
            <h2>你可以直接跑仓库，也可以只安装一个 kit，或者把这个站点发布到 GitHub Pages。</h2>
          </div>
          <div className="install-grid">
            {installCommands.map((item) => (
              <article key={item.title} className="command-card">
                <h3>{item.title}</h3>
                <pre>{item.code}</pre>
              </article>
            ))}
          </div>
          <div className="pages-note">
            <strong>GitHub Pages 已就绪：</strong> 这个展示站可以直接从当前仓库发布，依赖单独的
            Actions workflow 构建 `site/` 并把静态产物部署到 Pages。
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>ClawKit</strong>
          <p>面向 OpenClaw 的可复用工作流套件，用 Harness 约束多智能体协作。</p>
        </div>
        <div className="footer-links">
          <a href="https://github.com/iamhanson/clawkit" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://github.com/iamhanson/clawkit#readme" target="_blank" rel="noreferrer">
            文档
          </a>
          <a href="https://github.com/iamhanson/clawkit/tree/main/kits" target="_blank" rel="noreferrer">
            Kits
          </a>
          <a href="https://www.npmjs.com/package/clawkittool" target="_blank" rel="noreferrer">
            clawkittool
          </a>
        </div>
      </footer>
    </div>
  );
}
