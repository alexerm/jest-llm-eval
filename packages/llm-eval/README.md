# Jest LLM Eval

[![npm version](https://img.shields.io/npm/v/jest-llm-eval.svg?style=flat-square)](https://www.npmjs.com/package/jest-llm-eval)
[![Build](https://img.shields.io/github/actions/workflow/status/yourusername/jest-llm-eval/ci.yml?branch=main&style=flat-square)](https://github.com/yourusername/jest-llm-eval/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

> **AI-powered evaluation framework for testing Large-Language-Model (LLM) responses with Jest.**
> Replace brittle string matching with semantic, criteria-driven assertions powered by an LLM judge.

---

## Table of Contents

1. [Why Jest LLM Eval?](#why)
2. [Features](#features)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [Folder Structure](#folder-structure)
6. [Using the CLI Viewer](#cli)
7. [Jest Configuration](#jest-configuration)
8. [Advanced Usage](#advanced-usage)
9. [API Reference](#api-reference)
10. [Examples](#examples)
11. [Contributing](#contributing)
12. [License](#license)
13. [Support](#support)

---

## <a id="why"></a>Why Jest LLM Eval?

Traditional unit tests struggle with AI output:

* Unpredictable, non-deterministic responses.
* Multiple correct answers with different wording.
* String equality or regex matching quickly becomes brittle.

**Jest LLM Eval** lets you write *intent-based* tests: you describe the qualities a good response should have (relevance, professionalism, accuracy, …) and let **another LLM** act as the judge. The result is resilient, maintainable tests that focus on behaviour, not exact wording.

---

## <a id="features"></a>Features

* 🤖 **AI-Powered Assertions** – Evaluate responses with an LLM judge.
* 🎨 **Beautiful Terminal UI** – Colourful tables, progress bars & themes.
* 📊 **Rich Reporting** – JSON & interactive HTML output for CI, dashboards, or manual inspection.
* 🔧 **Jest Integration** – Custom matchers (`toPassAllCriteria`, `toPassWithConfidence`, `toHaveToolCall`, …).
* 📈 **Confidence Testing** – Run the same test _n_ times and require a minimum pass-rate.
* 🔄 **Multi-Step Conversations** – Assert complex dialogue flows.
* 🛠️ **Tool-Call Testing** – Verify function / tool calls produced by agents.
* 📝 **TypeScript First** – Full typings included.
* 🖥️ **CLI Viewer** – Quickly explore results in your terminal.

---

## <a id="installation"></a>Installation

```bash
# Add to devDependencies (-D) with npm / pnpm / yarn
npm install -D jest-llm-eval
```

> Requires **Node 16+** and **Jest 29+**.

---

## <a id="quick-start"></a>Quick Start

```ts
import { defineEvaluationCriteria, CRITERIA } from 'jest-llm-eval';
import { openai } from '@ai-sdk/openai';

// 1️⃣ Build criteria
const criteria = defineEvaluationCriteria()
  .add(CRITERIA.Relevance)
  .add(CRITERIA.Professionalism)
  .add({ id: 'technical_detail', description: 'Mentions at least one concrete technical detail.' })
  .build();

// 2️⃣ Choose an evaluation model (judge)
const judge = openai('gpt-4');

// 3️⃣ Write your test as usual
it('assistant answers deployment question', async () => {
  const conversation = [
    { role: 'user', content: 'How do I deploy a React app?' },
    { role: 'assistant', content: 'Use platforms such as Vercel, Netlify or AWS…' }
  ];

  await expect(conversation).toPassAllCriteria(criteria, judge);
});
```

Run `npx jest` – your assertion is evaluated by *another* LLM and the result is displayed in a colourful table.

---

## <a id="folder-structure"></a>Folder Structure

```
packages/llm-eval
├── src/                     # TypeScript source
│   ├── cli-viewer.ts        # Interactive CLI
│   ├── evaluation-utils.ts  # Core logic
│   ├── terminal-reporter.ts # Jest reporter (colourful UI)
│   └── …
├── examples/                # Self-contained reference tests
├── jest-evaluation-results/ # Generated JSON/HTML reports (ignored by git)
├── dist/                    # Compiled JS (published to npm)
└── README.md                # You're reading it 😊
```

Feel free to copy patterns from `examples/` to bootstrap your own suite.

---

## <a id="cli"></a>Using the CLI Viewer

```
# View latest results with the vibrant theme
npx jest-llm-eval view --theme vibrant

# Show only failed evaluations
npx jest-llm-eval view --filter failed

# Point to a specific report file
npx jest-llm-eval view --report-path ./jest-evaluation-results/my-run.json
```

Flags:

| Flag                 | Description                                 | Default                         |
| -------------------- | ------------------------------------------- | ------------------------------- |
| `--theme`            | `default`, `minimal`, `vibrant`             | `default`                       |
| `--filter`           | `all`, `passed`, `failed`                   | `all`                           |
| `--report-path`      | Path to a JSON report                       | Latest run in default directory |
| `--no-details`       | Hide criteria breakdown                     | —                               |

---

## <a id="jest-configuration"></a>Jest Configuration

Add the setup file and reporters in your `jest.config.js`:

```js
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['jest-llm-eval/setup'],
  reporters: [
    'default',
    ['jest-llm-eval/terminal-reporter', { theme: 'vibrant', compact: false }],
    ['jest-llm-eval/evaluation-reporter', { outputDir: './jest-evaluation-results' }]
  ]
};
```

### TypeScript

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": ["jest", "jest-llm-eval"]
  }
}
```

---

## <a id="advanced-usage"></a>Advanced Usage

### Confidence Testing

```ts
// Require a ≥ 80 % pass-rate over 5 iterations
await expect(myFn).toPassWithConfidence({ iterations: 5, minSuccessRate: 0.8 });
```

### Multi-Step Conversations

```ts
import { runMultiStepTest } from 'jest-llm-eval';

const conversation = await runMultiStepTest(
  [
    'I need help with my order',
    'Order #12345',
    'I want to return it'
  ],
  {
    createAgentPrompt: (messages) => ({
      model: openai('gpt-4'),
      messages: [{ role: 'system', content: 'You are a helpful agent' }, ...messages]
    })
  }
);
```

### Tool / Function Call Assertions

```ts
await expect(conversation).toHaveToolCall('search_database', { query: 'user preferences' });
```

---

## <a id="api-reference"></a>API Reference

### Builders & Helpers

| Function                               | Description                                      |
| -------------------------------------- | ------------------------------------------------ |
| `defineEvaluationCriteria()`           | Fluent builder for criteria arrays               |
| `evaluateAiResponse(model, msgs, c)`   | Low-level helper for direct evaluation           |
| `runMultiStepTest(prompts, options)`   | Utility for step-based conversation tests        |

### Predefined Criteria (`CRITERIA` enum)

* `Welcome` – Greeting tone
* `Relevance` – Addresses the user's question
* `Conciseness` – Avoids unnecessary fluff
* `Professionalism` – Maintains professional language
* …and more

### Result Types (simplified)

```ts
interface EvaluationCriterionDef { id: string; description: string; }
interface EvaluatedCriterionResult { id: string; passed: boolean; description: string; }
interface TokenUsage { promptTokens?: number; completionTokens?: number; totalTokens: number; }
```

---

## <a id="examples"></a>Examples

See [`packages/llm-eval/examples/`](./examples) for fully-working demos:

* `basic-evaluation.ts` – Smallest possible test.
* `multi-step-conversation.ts` – End-to-end dialogue flow.
* `tool-call-testing.ts` – Verify structured tool calls.
* `confidence-testing.ts` – Consistency over multiple runs.
* `terminal-reporting.ts` – Showcase terminal UI & CLI.

Run them with:

```bash
node examples/basic-evaluation.ts   # or ts-node
```

---

## <a id="contributing"></a>Contributing

1. **Fork** the repo & create a branch.
2. Run `pnpm install` (or your package manager).
3. Execute `turbo dev --filter=@repo/llm-eval` to watch source ↔ tests.
4. Follow the coding guidelines in [`CONTRIBUTING.md`](CONTRIBUTING.md).

All PRs must pass `eslint`, `prettier` and unit tests (`pnpm test`).

---

## <a id="license"></a>License

MIT © [Your Name](https://github.com/yourusername)

---

## <a id="support"></a>Support

* **Issues** – <https://github.com/yourusername/jest-llm-eval/issues>
* **Discussions** – <https://github.com/yourusername/jest-llm-eval/discussions>
* **Email** – <mailto:support@example.com>

Made with ❤️ for the AI development community.