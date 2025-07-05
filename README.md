# Jest-LLM-Eval Monorepo

[![CI](https://img.shields.io/github/actions/workflow/status/alexerm/jest-llm-eval/ci.yml?branch=main&style=flat-square)](https://github.com/alexerm/jest-llm-eval/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

> **AI-powered testing utilities for Large-Language-Model applications, packaged as a Turborepo workspace.**

This repository hosts **Jest LLM Eval**, a framework that lets you write intent-driven tests for LLM responses, plus a set of shared configs used across projects.

---

## Packages

| Package | Version | Description |
| ------- | ------- | ----------- |
| [`packages/llm-eval`](./packages/llm-eval) | ![npm](https://img.shields.io/npm/v/jest-llm-eval.svg?label=jest-llm-eval&style=flat-square) | The core library: custom Jest matchers, CLI viewer, terminal/html reporters. |
| [`packages/eslint-config`](./packages/eslint-config) | – | Opinionated ESLint rules for TypeScript & React (re-exporting `eslint-config-next`, `prettier`, etc.). |
| [`packages/typescript-config`](./packages/typescript-config) | – | Shared `tsconfig` presets for apps & packages. |

> **Note:** `apps/` is intentionally empty – this repo focuses on *libraries*, but it can be extended with demo apps if needed.

---

## Getting Started

### Prerequisites

* Node.js **18+**
* npm, pnpm or yarn (examples use **npm**)

### Install dependencies

```bash
npm install
```

### Build all packages

```bash
# Uses Turborepo to cache & parallelise
npm run build
```

### Run tests

```bash
npm run test
```

### Develop locally

```bash
# Watch src changes & re-run test commands for all packages
npm run dev

# Or focus on a single package
npm run dev -- --filter=llm-eval
```

---

## Publishing a new version

1. Bump the version in `packages/llm-eval/package.json` (follow semver).  
2. Run the release script:

   ```bash
   npm run build --workspace=packages/llm-eval
   cd packages/llm-eval && npm publish
   ```

3. Tag & push:

   ```bash
   git tag vX.Y.Z && git push --tags
   ```

---

## Folder Structure (simplified)

```
.
├── apps/                  # Empty – slot for example apps
├── packages/
│   ├── llm-eval/          # Core library (TypeScript)
│   ├── eslint-config/     # Shared ESLint presets
│   └── typescript-config/ # Shared tsconfig presets
├── jest-evaluation-results/ # Generated test reports (git-ignored)
├── turbo.json             # Turborepo config
└── README.md              # You're here 😊
```

---

## Contributing

We love contributions! Please read [`packages/llm-eval/CONTRIBUTING.md`](./packages/llm-eval/CONTRIBUTING.md) for guidelines.

To start hacking on the core package:

```bash
# From repo root
npm run dev -- --filter=llm-eval
```

The command runs `jest --watch` and recompiles TypeScript on change.

---

## License

MIT © [Oleksandr Erm](https://github.com/alexerm)
