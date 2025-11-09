export default function GuidePage() {
  return (
    <div className="guide-page">
      <section className="guide-hero">
        <p className="guide-eyebrow">Product Guide</p>
        <h1>Build, stress, and explain a system in minutes.</h1>
        <p>
          This walkthrough pairs the canvas, scenario tools, and monitoring panels so you can move from a blank slate
          to a narrated architecture example without guesswork.
        </p>
      </section>

      <section className="guide-section">
        <h2>Control bar essentials</h2>
        <ul>
          <li>
            <strong>Load Examples</strong> opens curated templates. Import/export JSON snapshots (including configs, positions, and SLO targets) to collaborate or version designs.
          </li>
          <li>
            <strong>Canvas management toggles</strong> hide/show the component library, scenario tools, patterns, traffic profile, dependency heatmap, and What-if insights so you can focus.
          </li>
          <li>
            <strong>Auto Arrange</strong> reflows the current topology based on available space; use it after large edits or template imports.
          </li>
          <li>
            <strong>Inline SLO controls</strong> let you edit latency and error budgets directly from the builder toolbar. The thresholds sync with the Metrics Board instantly.
          </li>
          <li>
            <strong>Clear Canvas</strong> starts fresh (with a confirmation dialog so you do not lose work accidentally).
          </li>
        </ul>
      </section>

      <section className="guide-section guide-tips">
        <h2>Panels & workflows</h2>
        <div className="guide-tip-grid">
          <article>
            <h4>Components & patterns</h4>
            <p>
              The left panel houses the drag-and-drop component library plus expandable pattern bundles (cache-aside, async queues, etc.). Drop them onto the canvas, rename via the node header, and open the config drawer to tune throughput, latency, storage, or cost assumptions.
            </p>
          </article>
          <article>
            <h4>Traffic & labs</h4>
            <p>
              The Traffic Profile panel sets Base DAUs, burst multipliers, read/write ratios, and payload sizes. Toggle Guided Labs to follow step-by-step exercises (“Add a write buffer”, “Split reads and writes”) and check off each instruction as you manipulate the live canvas.
            </p>
          </article>
          <article>
            <h4>Scenarios & What-if</h4>
            <p>
              Use the Scenario panel to schedule outages, latency spikes, error bursts, or throttling events. The separate What-if panel runs standing stress tests (cache miss storms, queue saturation, etc.) against your current graph and suggests mitigations.
            </p>
          </article>
          <article>
            <h4>Dependency heatmap</h4>
            <p>
              Toggle the Dependency map / Ripple Effects tray to view upstream/downstream chains ranked by saturation. It highlights which nodes inherit load when a dependency slows down so you can add buffers before attempting a drill.
            </p>
          </article>
        </div>
      </section>

      <section className="guide-section guide-example">
        <div className="guide-card">
          <p className="guide-eyebrow">Example: Personalised Feed</p>
          <h3>Goal</h3>
          <p>
            Serve an infinitely scrolling social feed for 10M DAUs with strict p95 latency &lt; 200ms while
            supporting write fan-out, search, and analytics.
          </p>
          <div className="guide-columns">
            <div>
              <h4>Canvas Steps</h4>
              <ol>
                <li>Add <code>User → CDN → API Gateway</code>.</li>
                <li>Branch to <code>Load Balancer → Feed Service</code> and <code>Fan-out Cache</code>.</li>
                <li>Connect the cache to <code>Timeline Stream</code> and <code>Search Index</code> for fallback reads.</li>
                <li>Route writes into <code>Message Broker → Queue → Delivery Workers → Database</code>.</li>
                <li>Open Traffic Profile, set Base DAUs to 12M with a 2.5x launch burst, then adjust the inline SLO to 180ms / 0.8%.</li>
              </ol>
            </div>
            <div>
              <h4>What to watch</h4>
              <ul>
                <li>Use What-if cards to see how a cache-miss storm will push the Delivery Queue toward saturation.</li>
                <li>Run a Scenario outage on the cache, then inspect Dependency heatmap ripple counts to identify impacted downstream nodes.</li>
                <li>On the Metrics Board, confirm latency/error stay under the SLO you set; if not, add replicas or a read-through cache, then re-run the drill.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="guide-section guide-tips">
        <h2>Guided practice &amp; coaching</h2>
        <div className="guide-tip-grid">
          <article>
            <h4>Guided Labs</h4>
            <p>
              Each lab contains a checklist of mutations to make on the live canvas. Progress persists locally, and every completed lab reinforces a scaling technique (write buffering, dual writes, multi-region reads, etc.).
            </p>
          </article>
          <article>
            <h4>Coach &amp; push to canvas</h4>
            <p>
              The Coach tab lets you practice explaining trade-offs with any local or remote LLM (configure base URL + model). Ask for critiques, iterate in the chat, then hit “Push to Design Canvas” to apply the suggested topology back into the builder for further refinement.
            </p>
          </article>
          <article>
            <h4>Templates &amp; sharing</h4>
            <p>
              Export templates frequently—the JSON contains nodes, edges, configs, and SLO targets. Teammates can import the file, inspect the What-if cards, and run their own scenarios without losing your baseline.
            </p>
          </article>
        </div>
      </section>

      <section className="guide-section">
        <h2>Metrics &amp; SLO tracking</h2>
        <p>
          Switch to the Metrics Board view whenever you need to narrate system health. The SLO card reflects whatever latency/error budgets you set in the builder toolbar, and the suggestions list tells you whether to scale out, cache, or add redundancy. Capacity, cost, and latency leaderboards help prioritize fixes before you re-run Guided Labs or scenario drills.
        </p>
        <p>
          Combined with the dependency heatmap, these analytics close the loop: model → stress → observe → iterate. Export a snapshot once the dashboards show every node under budget and every lab checklist is complete.
        </p>
      </section>
    </div>
  );
}
