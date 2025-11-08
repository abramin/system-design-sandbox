# System Design Sandbox Guide

This guide walks through the core workflows in the System Design Sandbox app so you can quickly model architectures, stress them, and interpret the resulting insights.

## Prerequisites & Setup

- Node.js 18+ (ensure `node -v` reports a compatible version).
- Install dependencies once with:

  ```bash
  npm install
  ```

- Start the dev server when you are ready to experiment:

  ```bash
  npm run dev
  ```

  The CLI prints the local URL (usually `http://localhost:5173`). Open it in a browser; the app hot-reloads as you edit.

## 1. Build With the Design Canvas

1. **Load a starting point**
   - Use *Load Template* to pick one of the baked-in topologies or import a JSON file exported from a previous session (see `custom-template.json` for the schema).
   - Export at any point to snapshot the current node/edge graph and share it with teammates.
2. **Place components**
   - Drag tiles from the palette onto the canvas. Each node’s type (e.g., *API Gateway*, *Database*, *Cache*) drives default configs and icons.
3. **Wire connections**
   - Drag from a node handle to another node to create an edge. Double-click an edge to flip its direction; select + Delete/Backspace removes it.
4. **Configure nodes**
   - Double-click a node or tap the `⚙️` icon to open the configuration panel. Key fields—`maxConnections`, `throughputRate`, `storageGB`, `instances`, latency/error overrides—feed every downstream calculation (capacity, cost, what-if).
5. **Rename for clarity**
   - Provide a display label (e.g., “Checkout API”). The underlying type must stay accurate (keep “Service”, “Database”, etc.) so analytics remain correct.

### Example: Expanding the Basic Template

1. Load `custom-template.json` (User → API Gateway → Database).
2. Add a *Service* node between the gateway and database; connect edges accordingly.
3. Configure the Service with:
   - `instances = 6`
   - `maxConnections = 1200`
   - `latencyMs = 35`
4. Configure the Database with `maxConnections = 900` and `storageGB = 1000`.
5. Notice the capacity badges on each node update immediately—green when under 75%, amber above 75%, red above 90%.

## 2. Shape Demand With Traffic Profiles

- Open *Traffic Profile* from the right sidebar.
- Controls:
  - **Base DAUs** and **Requests/User/Day** (fixed constant in code) derive baseline QPS.
  - **Peak %** and **Bursts** overlay surges (each burst=multiplier + duration seconds).
  - **Read/Write ratio** splits load for caches/datastores.
- Press *Apply Profile* to propagate changes into node metrics (QPS, bandwidth, queue depth, storage estimates).

### Quick Test

Set `baseDAUs` to `2,500,000` and create a burst `Promo Push` with multiplier `3.0` for `1200s`. Apply and watch total QPS + bandwidth jump in the Metrics Board (see §4).

## 3. Simulate Incidents With Scenarios

- Open *Scenarios* (right sidebar).
- Create an event:
  1. Choose a target node.
  2. Pick an event type:
     - `Outage` → forces status down, zero throughput.
     - `Latency Spike` → multiplies latency.
     - `Error Spike` → adds failure rate.
     - `Throttle` → reduces throughput capacity.
  3. Set severity (0–100), duration, optional note, and start offset.
- Press *Add Event*, then *Play* to start the scenario clock. Events auto-trigger once their `startTime` arrives; use *Trigger* next to an event to force immediate execution.
- While an event is active, the affected node’s status is reflected everywhere:
  - Node tiles badge as degraded/down.
  - Metrics Board updates `activeIncidents`, error rate, etc.

### Example: Latency Spike Drill

1. Target the Service node created earlier.
2. Choose **Latency Spike**, severity `60`, duration `120s`.
3. Hit *Play* and *Trigger*.
4. Observe:
   - Service latency increases (node badge + flow step info).
   - Downstream Database capacity usage rises because QPS shifts.

## 4. Read the Metrics Board

Switch the top toggle to **Metrics Board** for an aggregate view:

- **Summary tiles**: Total QPS, Avg/P95 latency, Error rate, Monthly cost, Active incidents.
- **Sparklines**: QPS trend, Latency pulse, Error budget—generated from live metrics and scenario count.
- **Operational Health**: Gauge plus counts of healthy/degraded/down nodes.
- **Capacity Hotspots / Cost Drivers / Latency Hotspots**: sortable quick lists of problem nodes.
- **Scenario Timeline**: Upcoming and in-progress injected incidents.
- **Traffic Profile**: Visual of burst multipliers currently in effect.

Use this board when presenting: the cards explain where saturation or spend is emerging without diving back into each node.

## 5. Interpret What-if Insights

When at least one node of type `Service` exists, a **What-if Insights** panel appears in the builder sidebar:

1. The sandbox imagines a fixed scenario: “Service latency +50%”.
2. For the top three Service nodes it:
   - Calculates the additional latency delta.
   - Recomputes each direct downstream node with +20% load to see if any exceed 95% of their configured capacity.
3. Cards list any saturated downstream components plus mitigation tips (e.g., “Add read replicas”, “Scale cache nodes”).

Use this panel to sanity-check buffer margins even before running custom scenarios. If nothing changes, ensure:

- The node’s type remains “Service”.
- Downstream configs set realistic `maxConnections`/`throughputRate`.
- Traffic profile generates non-zero QPS.

## 6. Animate Message Flows

- Expand *Message Flow Simulator* in the builder toolbar.
- Pick a predefined flow (e.g., “Read Path”, “Write Path”).
- Once selected:
  - Nodes and edges highlight following the request path.
  - Flow panel shows per-step latency, QPS, and status.
  - Use the play controls within the panel to step through each hop.

Great for demos: combine with scenario events to show how bottlenecks move across the flow.

## 7. Pattern Library & Circuit Breakers

- Open the *Pattern Library* sidebar to drop in reusable motifs like cache-aside, fan-out, etc. (Each is just a curated set of nodes/edges.)
- Add *Circuit Breaker* nodes between services to model failover. When a downstream outage is simulated, route around it by connecting the breaker to alternative targets.

## 8. End-to-End Example

The following mini-playbook ties the tools together:

1. **Model**  
   - Load the basic template, add Service + Cache + Message Broker downstream of the API Gateway.
   - Configure each component with capacity limits (Service `maxConnections=1000`, Cache `hitRate=85`, Broker `throughputRate=50,000 msg/s`).
2. **Stress**  
   - Traffic Profile: `baseDAUs=3,000,000`, `peakPercent=35`. Add bursts *Launch Day* (x2.5 for 1h) and *Evening Peak* (x1.8 for 40m).
3. **Observe**  
   - Metrics Board should now show multi-million QPS and highlight whichever component is closest to capacity.
   - What-if panel predicts if downstream Databases or Queues will saturate when Service latency jumps.
4. **Inject Failure**  
   - Scenario: *Outage* on the Cache, severity 100, duration 300s.
   - Play/trigger it; Service QPS now pounds the Database directly. Operational Health shows increased degraded nodes.
5. **Iterate**  
   - Add another Cache shard (set `instances=2`) or insert a Queue to absorb spikes. Re-run the scenario to confirm reduced saturation.

## Tips & Troubleshooting

- **Unsaved changes**: Export templates liberally; JSON includes positions, configs, labels, and edges.
- **No metrics updating**: Ensure Traffic Profile base DAUs > 0 and nodes remain connected so load can propagate.
- **Scenario doesn’t fire**: Events only take effect after you press *Play*. Use *Trigger* to force immediate activation.
- **What-if missing**: Requires at least one Service node. Check node type; renaming to another type removes it from analysis.
- **Dirty state after large edits**: Refresh the browser tab—the app reloads from the initial template or the last import.

With these workflows you can quickly storyboard a distributed system, articulate failure drills, and share evidence-based mitigation steps using the sandbox’s built-in analytics.
