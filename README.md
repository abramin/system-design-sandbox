# System Design Sandbox

System Design Sandbox is a Vite + React + TypeScript application for sketching distributed systems, simulating traffic spikes or incidents, and reading live capacity/latency/cost projections. It ships with a coach mode, pattern library, what-if analytics. Using the coach mode requires an optional LLM model.

![2025-11-09, 08_31_15 a m -Master_System_Design_with_Interactive_Templates_and_Coaching (1)](https://github.com/user-attachments/assets/badbab69-dfa6-481e-b680-d42bdd4b9028)


## Features at a Glance

- **Drag-and-drop canvas** with configurable nodes (services, queues, caches, databases, CDN, etc.) and auto-layout.
- **Traffic & scenario simulators** to model DAU bursts, latency spikes, outages, throttling.
- **Metrics board** that aggregates QPS, latency, error rate, cost, saturation hot spots, and what-if insights.
- **Coach tab** to practice interview-style conversations backed by a local or remote LLM (optional).
- **Guide tab** describing recommended workflows and an end-to-end example.

## Download & Run Locally

Clone the repo

```bash
cd sysdesign-sandbox
npm install
npm run dev
```

Open the printed URL (normally `http://localhost:5173`). The app hot-reloads as you edit.


## Coach / LLM Integration

The Coach tab can talk to either a **local** model or an **external API**:

### Option A: Local Llama (Ollama example)

1. Install [Ollama](https://ollama.ai/) and pull a model, e.g.:
   ```bash
   ollama run llama3.2
   ```
2. Start the sandbox (`npm run dev`) and open the Coach tab.
3. Set *Base URL* to `http://localhost:11434` (default) and the *Model* name you pulled (e.g. `llama3.2`).
4. Chat with the coach; snapshots stay on your machine.

### Option B: Remote API (OpenAI, Anthropic, etc.)

1. Provide the HTTPS base URL and model ID for the service.
2. Enter an API key **only if you accept the risk**: the UI never uploads your conversations anywhere, but your key will be sent to the configured endpoint for inference.
3. Avoid sharing private credentials in screenshots/commits and rotate keys regularly.

> ⚠️ **Security Warning**: Never upload production or proprietary API keys to GitHub or other public places. If you use a hosted LLM, keep the sandbox on trusted networks and store keys in `.env.local` (gitignored) rather than hard-coding them.

## Documentation

- [`docs/USAGE.md`](docs/USAGE.md) — full walkthrough of builder panels, traffic profiles, scenario scripting, metrics, and troubleshooting.
- **Guide tab** — in-app reference with an example (“Personalised Feed”), onboarding steps, and tips.
- **Coach tab** — system-design interview practice with snapshot/export support.

## Tooling Notes

- Built with [Vite](https://vitejs.dev) + React 18 + TypeScript.
- ESLint config lives in `eslint.config.js`. For type-aware linting, enable `tseslint.configs.recommendedTypeChecked` as described in-file and optionally add React plugins (e.g., `eslint-plugin-react-x`).
- Styles live in `src/App.css`; domain-specific logic is organized under `src/features/system-designer`.


**Screenshots**
 
<img width="1709" height="1079" alt="Captura de pantalla 2025-11-09 a las 11 29 22" src="https://github.com/user-attachments/assets/eb1f8d3d-430c-4342-8883-0f4719f1a785" />
<img width="1335" height="1019" alt="Captura de pantalla 2025-11-09 a las 11 28 49" src="https://github.com/user-attachments/assets/7e72bf33-b1ee-45af-a506-833442590eca" />
<img width="1704" height="933" alt="Captura de pantalla 2025-11-09 a las 11 28 41" src="https://github.com/user-attachments/assets/55641d08-7aa2-4ff5-b07a-eee6d015cfef" />
