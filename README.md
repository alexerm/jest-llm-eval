# Jest LLM Eval

[![CI](https://img.shields.io/github/actions/workflow/status/alexerm/jest-llm-eval/ci.yml?branch=main&style=flat-square)](https://github.com/alexerm/jest-llm-eval/actions)
[![npm](https://img.shields.io/npm/v/jest-llm-eval.svg?style=flat-square)](https://www.npmjs.com/package/jest-llm-eval)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

> AI-powered evaluation framework for testing Large-Language-Model (LLM) responses with Jest.

### Why

Traditional tests break on non-deterministic AI output. Jest LLM Eval gives you intent-based assertions judged by an LLM so you can test behaviour, not exact strings.

### Features

- AI-powered assertions and confidence testing
- Beautiful terminal UI and reporters (terminal/JSON/HTML)
- Tool-call and multi-step conversation helpers
- TypeScript-first with full typings

### Install

```bash
npm install -D jest-llm-eval
```

Requires Node 16+ and Jest 29+.

### Quick Start

```ts
import { defineEvaluationCriteria, CRITERIA, type JudgeAdapter } from 'jest-llm-eval';

const criteria = defineEvaluationCriteria()
  .add(CRITERIA.Relevance)
  .add(CRITERIA.Professionalism)
  .build();

const judge: JudgeAdapter = { /* call your preferred LLM and return { object, usage } */ };

it('answers deployment question', async () => {
  const convo = [
    { role: 'user', content: 'How do I deploy a React app?' },
    { role: 'assistant', content: 'Use platforms such as Vercel, Netlify or AWS…' },
  ];
  await expect(convo).toPassAllCriteria(criteria, judge);
});
```

### CLI Viewer

```bash
npx jest-llm-eval view --theme vibrant --filter failed
```

### Jest Setup

```js
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['jest-llm-eval/setup'],
  reporters: [
    'default',
    ['jest-llm-eval/terminal-reporter', { theme: 'vibrant', compact: false }],
    ['jest-llm-eval/evaluation-reporter', { outputDir: './jest-evaluation-results' }],
  ],
};
```

### Examples

See `packages/llm-eval/examples/` for runnable demos: basic evaluation, multi-step conversation, tool-call testing, and terminal reporting.

### Contributing

PRs welcome. Please see `packages/llm-eval/CONTRIBUTING.md`.

### License

MIT © [Oleksandr Erm](https://github.com/alexerm)
