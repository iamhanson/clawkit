const principles = [
  {
    title: 'One Control Layer',
    text: 'Every workflow has a deliberate owner. Control lives in one place so progression is explicit, not accidental.',
  },
  {
    title: 'Hub-and-Spoke Routing',
    text: 'Workers do work. They do not secretly become planners. Results always return to the control layer before the next move.',
  },
  {
    title: 'Shared Artifact Contracts',
    text: 'Formal handoff files live in shared workspaces so tasks remain traceable, reviewable, and recoverable.',
  },
  {
    title: 'Clear Failure Loops',
    text: 'Evaluation, QA, and review outcomes feed back into the orchestrator instead of creating sideways chaos.',
  },
];

const primitives = [
  {
    label: 'SOUL.md',
    title: 'Agent identity with boundaries',
    text: 'Roles, tone, output structure, forbidden moves, and handoff expectations all live in one file.',
  },
  {
    label: 'kit.json',
    title: 'Real routing, real topology',
    text: 'The kit definition declares agent metadata and the actual allow-list graph that controls collaboration.',
  },
  {
    label: 'Shared Workspace',
    title: 'Artifacts over vibes',
    text: 'Briefs, schedules, deliveries, reviews, and reports become durable workflow contracts instead of chat-only context.',
  },
  {
    label: 'Setup + Deploy',
    title: 'Portable into any OpenClaw environment',
    text: 'Each kit is deployable, configurable, and reproducible without hand-editing a maze of runtime files.',
  },
];

const productArtifacts = ['brief.json', 'schedule.json', 'delivery.json', 'review.json', 'report.json'];
const hotnewsArtifacts = ['brief.json', 'research.json', 'submission.json', 'review.json'];

const installCommands = [
  {
    title: 'Clone And Use ClawKit',
    code: `git clone https://github.com/iamhanson/clawkit.git\ncd openclawstudy\nnode cli/index.js deploy product-kit --config ~/.openclaw --apply`,
  },
  {
    title: 'Install One Kit With ClawKitTool',
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
            <p>Harness-first OpenClaw workflows</p>
          </div>
        </div>
        <nav className="topnav">
          <a href="#harness">Harness</a>
          <a href="#kits">Kits</a>
          <a href="#install">Install</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <SectionTag>Harness At The Center</SectionTag>
            <h1>
              Reusable workflow kits for <span>OpenClaw</span>, built around disciplined
              multi-agent orchestration.
            </h1>
            <p className="hero-text">
              ClawKit turns multi-agent systems into repeatable Harness workflows. Instead of
              letting agents cross-call each other into a fog of state, it gives every kit a
              control layer, explicit routing rules, and artifact contracts that make collaboration
              stable.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="https://github.com/iamhanson/clawkit" target="_blank" rel="noreferrer">
                View GitHub
              </a>
              <a className="button button-secondary" href="#install">
                Quick Start
              </a>
            </div>
            <div className="hero-metrics">
              <div>
                <span className="metric-value">2</span>
                <span className="metric-label">Reference Kits</span>
              </div>
              <div>
                <span className="metric-value">1</span>
                <span className="metric-label">Control Layer Per Workflow</span>
              </div>
              <div>
                <span className="metric-value">6</span>
                <span className="metric-label">Harness Rules In The Repo</span>
              </div>
            </div>
          </div>

          <div className="hero-diagram">
            <div className="diagram-frame">
              <div className="diagram-header">Harness Topology</div>
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
            <SectionTag>Project Primitives</SectionTag>
            <h2>ClawKit is more than agent prompts.</h2>
            <p>
              A kit is a portable workflow system: personality files, routing rules, artifact
              conventions, and deployment hooks all moving together.
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
            <h2>The repo is organized around control, not agent sprawl.</h2>
            <p>
              Harness is not a side note in ClawKit. It is the design grammar that shapes how kits
              are authored, how communication is constrained, and how work becomes observable.
            </p>
          </div>

          <div className="harness-layout">
            <div className="stack-visual">
              <div className="stack-layer stack-control">
                <strong>Control Layer</strong>
                <span>Owns workflow progression, user entry, and final output.</span>
              </div>
              <div className="stack-layer stack-workers">
                <strong>Worker Layer</strong>
                <span>Produces domain output without silently taking over orchestration.</span>
              </div>
              <div className="stack-layer stack-evaluator">
                <strong>Evaluator Layer</strong>
                <span>Returns conclusions to the control layer for revision or acceptance.</span>
              </div>
              <div className="stack-layer stack-artifacts">
                <strong>Shared Artifact Layer</strong>
                <span>Persists briefs, deliveries, reviews, and reports as formal handoffs.</span>
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
            <SectionTag>Communication Model</SectionTag>
            <h2>ClawKit chooses explicit return paths over mesh-like agent drift.</h2>
          </div>
          <div className="comparison-grid">
            <article className="comparison-card comparison-bad">
              <span className="card-label">Without Harness</span>
              <h3>Cross-calls everywhere</h3>
              <p>
                Agents invent side channels, silently own the next step, and turn failures into
                invisible routing problems.
              </p>
              <ul>
                <li>Too many entry points</li>
                <li>Unclear ownership of state</li>
                <li>Sideways retries and hidden loops</li>
              </ul>
            </article>
            <article className="comparison-card comparison-good">
              <span className="card-label">With Harness</span>
              <h3>Hub-and-spoke coordination</h3>
              <p>
                A control layer owns progression. Workers and evaluators report back. Shared
                artifacts preserve the handoff history.
              </p>
              <ul>
                <li>One deliberate entry point</li>
                <li>Explicit success and failure return paths</li>
                <li>Stable coordination you can explain and debug</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section-block kits-showcase" id="kits">
          <div className="section-heading">
            <SectionTag>Reference Kits</SectionTag>
            <h2>Two concrete workflows that show how Harness gets embedded into real systems.</h2>
          </div>
          <div className="kit-grid">
            <article className="kit-card">
              <div className="kit-card-header">
                <span className="card-label">Product Delivery Harness</span>
                <h3>product-kit</h3>
              </div>
              <p>
                `pm` acts as the control layer between idea intake, engineering, testing, and final
                business reporting.
              </p>
              <pre className="flow-block">Boss -&gt; pm -&gt; dev -&gt; pm -&gt; qa -&gt; pm -&gt; Boss</pre>
              <ArtifactList items={productArtifacts} />
              <ul className="kit-points">
                <li>`pm` owns requirement clarification and final acceptance.</li>
                <li>`dev` reports only to `pm`.</li>
                <li>`qa` returns testing conclusions only to `pm`.</li>
              </ul>
            </article>

            <article className="kit-card accent-card">
              <div className="kit-card-header">
                <span className="card-label">Content Workflow Harness</span>
                <h3>hotnews-kit</h3>
              </div>
              <p>
                `orchestrator` sits at the center so research, writing, and editorial review move
                through one visible control path.
              </p>
              <pre className="flow-block">user -&gt; orchestrator -&gt; researcher/writers/editor -&gt; orchestrator -&gt; user</pre>
              <ArtifactList items={hotnewsArtifacts} />
              <ul className="kit-points">
                <li>`researcher` does not directly dispatch writers anymore.</li>
                <li>writers do not directly invoke `editor`.</li>
                <li>`editor` evaluates and reports back through `orchestrator`.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="section-block install-block" id="install">
          <div className="section-heading">
            <SectionTag>Install And Deploy</SectionTag>
            <h2>Try the repo, install one kit, or publish the site directly from GitHub.</h2>
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
            <strong>GitHub Pages ready:</strong> this showcase can be deployed from the repository
            itself using a dedicated Actions workflow that builds the `site/` app and publishes the
            generated static assets.
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>ClawKit</strong>
          <p>Reusable workflow kits for disciplined OpenClaw orchestration.</p>
        </div>
        <div className="footer-links">
          <a href="https://github.com/iamhanson/clawkit" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://github.com/iamhanson/clawkit#readme" target="_blank" rel="noreferrer">
            Docs
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
