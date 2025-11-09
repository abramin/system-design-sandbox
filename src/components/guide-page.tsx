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
        <h2>Getting started</h2>
        <ol>
          <li>
            <strong>Load an example</strong> from the control bar to explore a pre-built topology.
          </li>
          <li>
            <strong>Drag components</strong> from the left panel or drop in patterns to establish common motifs like caches,
            queues, and stream processors.
          </li>
          <li>
            <strong>Configure nodes</strong> by clicking on the gear icon. Set capacity, latency, or error-rate assumptions.
          </li>
          <li>
            <strong>Stress the system</strong> via the Scenario panel—queue up outages, latency spikes, or throttling events to see how capacity bars and metrics respond in real time.
          </li>
          <li>
            <strong>Inspect metrics</strong> on the Metrics Board for load, saturation, and cost projections.
          </li>
        </ol>
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
              </ol>
            </div>
            <div>
              <h4>What to watch</h4>
              <ul>
                <li>Use the What-if Insights cards plus the Scenario panel to observe how cache misses immediately raise load on the Database and Stream Processor.</li>
                <li>Metrics Board capacity bars should keep Cache &amp; DB under 70% utilisation; add shards or queue buffers if they creep higher.</li>
                <li>Use Scenario Panel to trigger a cache outage and observe queue buildup.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="guide-section guide-tips">
        <h2>Tips &amp; tricks</h2>
        <div className="guide-tip-grid">
          <article>
            <h4>Scenario scripting</h4>
            <p>
              Create overlapping incidents (outage + latency spike) to validate that your buffers—queues, caches, and circuit
              breakers—behave as expected.
            </p>
          </article>
          <article>
              <h4>Node insights</h4>
              <p>
                Select a node or open the Metrics Board to review QPS, bandwidth, latency, cost, and capacity hotspots. Rename nodes to match service names for clearer discussions, and use the What-if cards before presenting to highlight risk areas.
              </p>
          </article>
          <article>
            <h4>Coach pairing</h4>
            <p>
              Switch to the Coach tab to practice explaining your design. You push your design to the canvas once you are
              satisfied.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
