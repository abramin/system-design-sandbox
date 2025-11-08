# System Design Sandbox

This Vite + React + TypeScript app lets you sketch distributed-system topologies, inject synthetic demand/failure scenarios, and inspect live metrics.

## Getting Started

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`) to launch the sandbox. Hot reloading is enabled by default.

## Documentation

See [`docs/USAGE.md`](docs/USAGE.md) for a comprehensive walkthrough that covers:

- Building architectures on the design canvas
- Using traffic profiles, scenario simulations, and message flows
- Interpreting the Metrics Board and What-if Insights
- Step-by-step examples and troubleshooting tips

## Tooling Notes

- The project uses [Vite](https://vitejs.dev) with React Fast Refresh for rapid iteration.
- ESLint is configured via `eslint.config.js`. If you need type-aware rules, follow the guidance in the config file comments to enable `tseslint.configs.recommendedTypeChecked` (or stricter variants) and optionally add React-specific plugins such as `eslint-plugin-react-x` and `eslint-plugin-react-dom`.
