# System Design Sandbox Guide

Model distributed systems, inject failures, and narrate outcomes with a single playground. This guide walks through every surface area—canvas controls, panels, labs, coach, analytics, and template sharing—so you can demonstrate full scenarios quickly.

---

## 1. Prerequisites & Setup

1. Install Node.js 18+ (`node -v` to verify).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the printed URL (default `http://localhost:5173`). The UI hot-reloads as you edit the repo.

---

## 2. Layout Controls at a Glance

The toolbar above the canvas centralizes all management actions:

- **Load Examples** – Opens curated templates. Adjacent actions export/import JSON snapshots; the file stores nodes, edges, configs, positions, and current SLO targets.
- **Panel Toggles** – Show/hide the Component Library, Pattern drawer, Traffic Profile, Scenario panel, Guided Labs, Dependency Heatmap & Ripple Effects, and What-if Insights to suit your workflow.
- **Auto Arrange** – Reflows every node with extra spacing, useful after importing or large edits.
- **Inline SLO Inputs** – Adjust systemwide latency (ms) and error (%) targets directly from the builder; they sync instantly with the Metrics Board’s SLO card.
- **Guided Labs Toggle** – Highlights the labs sidebar so you can follow step-by-step exercises without leaving the canvas.
- **Clear Canvas** – Wipes the board after a confirmation warning so you never lose work accidentally.

---

## 3. Building With Components & Patterns

1. **Component Library** – Drag nodes (User, CDN, Load Balancer, Service, Cache, Queue, Database, etc.) from the left panel. Types control iconography and default configs.
2. **Patterns Drawer** – Drop pre-wired motifs (cache-aside, dual-write, async workers, analytics fan-out) to bootstrap common topologies. They land as normal nodes you can reconfigure.
3. **Connections** – Drag from the enlarged connection handles on a source node to a target. Edges animate to indicate direction; select an edge to edit labels or delete.
4. **Node Configuration** – Click the ⚙️ icon on a node to set throughput, max connections, latency, error budgets, storage, cost, or instance counts. These numbers drive capacity usage, What-if calculations, and scenario impact.
5. **Display Labels** – Rename nodes (e.g., “Checkout API”) while retaining the underlying type so analytics remain accurate.

---

## 4. Shape Demand With the Traffic Panel

- Open the **Traffic Profile** panel to tune Base DAUs, peak percentage, read/write ratio, payload size, and named burst events (multiplier + duration).
- Click **Apply Profile** to push the new profile into the graph. Every connected node recalculates QPS, bandwidth, queue depth, and storage estimates instantly.
- Combine traffic tweaks with inline SLO edits to see how much headroom remains before you even run scenarios.

---

## 5. Scenarios, What-if, & Dependency Heatmap

### Scenario Panel
- Add incidents targeting any node: Outage (down), Latency Spike, Error Spike, or Throttle.
- Configure severity, duration, and start offset; queue multiple events and hit **Play** to advance the scenario clock, or **Trigger** to fire immediately.
- As incidents run, node badges change (healthy/degraded/down), capacity usage adjusts, and scenario events appear in the Metrics Board timeline.

### What-if Insights
- Lives in its own sidebar, independent from the Scenario panel.
- Continuously stress-tests services (cache-miss storms, queue overruns, worker slowdowns) using your live configs and traffic profile.
- Cards show the predicted metric delta, downstream components that would exceed capacity, and suggested mitigations (scale out, add caching, adjust replication).

### Dependency Heatmap & Ripple Effects
- Toggle the heatmap to rank upstream/downstream links by saturation.
- Ripple cards list “blast radius” paths so you know which services inherit load when a dependency degrades—perfect for validating buffers before drills.

---

## 6. Guided Labs

- Enable the **Guided Labs** sidebar from the toolbar.
- Each lab contains a narrative plus a checklist (e.g., “Add a write buffer”, “Split reads and writes”, “Introduce a queue + worker tier”).
- Checkboxes persist in `localStorage`, so you can return later and continue where you left off.
- Labs encourage hands-on practice: complete the steps directly on the canvas, then run What-if/Scenario drills to verify the intended resilience pattern.

---

## 7. Coach & Push to Canvas

- Switch to the **Coach** view to role-play design interviews or system critiques with an LLM.
- Configure the base URL and model (local LLaMA via Ollama, remote endpoint, etc.). *Never paste sensitive API keys unless you understand the security trade-offs.*
- Share your current architecture context, ask the coach for feedback, and iterate in the chat.
- When the coach proposes a topology, click **Push to Design Canvas** to apply the generated nodes/edges back into the builder for further editing.

---

## 8. Metrics Board & SLO Tracking

- Use the top-level toggle to open **Metrics Board** for presentation-ready analytics:
  - **Summary tiles** – Total QPS, avg/p95 latency, error rate, monthly cost, active incidents, bandwidth.
  - **Sparklines** – QPS trend, latency pulse, error budget over time.
  - **Operational Health** – Gauge and counts of healthy/degraded/down nodes.
  - **Leaderboards** – Capacity hotspots, latency hotspots, highest monthly cost.
  - **Scenario Timeline** – Monitors queued/active incidents.
  - **Traffic Snapshot** – Visual of active bursts.
- The **SLO card** pulls targets from the builder toolbar. If latency or error rates exceed your budget, the panel recommends mitigations (scale services, add caching, improve retries).

---

## 9. Templates, Import/Export, & Collaboration

- **Export Template** anytime to capture the entire state (nodes, edges, configs, display labels, positions, and SLO targets). Share via source control or chat.
- **Import Template** to load someone else’s snapshot or a coach-generated design. The importer relays out the graph to avoid overlap and restores SLO budgets from the file.
- **Guide/Coach Integration** – When the Coach generates a design, it uses the same template schema, so exporting later preserves those recommendations.

---

## 10. Putting It All Together (Suggested Flow)

1. Load a template (e.g., “Social Feed”) and rename key nodes for clarity.
2. Use Guided Labs to add a write buffer + cache pattern while following the checklist.
3. Adjust Traffic Profile (DAUs + bursts) and set stricter SLOs (e.g., 150 ms / 0.5%).
4. Run What-if insights to see which downstream nodes are at risk; address them by scaling components or inserting queues.
5. Script a Scenario: cache outage + service latency spike. Play it and watch dependency ripples.
6. Switch to Metrics Board to confirm SLO compliance and capture screenshots for your review doc.
7. Export the template, send it to a teammate, or continue iterating in the Coach tab before pushing refinements back onto the canvas.

With every feature—components, traffic modeling, scenarios, labs, coach, dependency analysis, and SLO-aware metrics—you can teach or evaluate system design trade-offs end-to-end in one place.
