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
import {
  defineEvaluationCriteria,
  CRITERIA,
  type JudgeAdapter,
} from "jest-llm-eval";

const criteria = defineEvaluationCriteria()
  .add(CRITERIA.Relevance)
  .add(CRITERIA.Professionalism)
  .build();

const judge: JudgeAdapter = {
  /* call your preferred LLM and return { object, usage } */
};

it("answers deployment question", async () => {
  const convo = [
    { role: "user", content: "How do I deploy a React app?" },
    {
      role: "assistant",
      content: "Use platforms such as Vercel, Netlify or AWS…",
    },
  ];
  await expect(convo).toPassAllCriteria(criteria, judge);
});
```

### Judge Adapter

The judge adapter is a tiny interface you implement to call your preferred LLM and return a JSON object that matches a provided JSON Schema.

```ts
export interface JudgeAdapter {
  evaluateObject(args: {
    jsonSchema: object;
    messages: GenericMessage[]; // your conversation to evaluate
    systemPrompt?: string; // optional extra instruction
  }): Promise<{ object: unknown; usage?: TokenUsage }>;
}
```

- **Your job**: call an LLM with `messages` (+ optional `systemPrompt`), ask it to produce JSON matching `jsonSchema`, then return `{ object, usage }`.
- **Returned `object` must validate** against `jsonSchema`. The built-in helpers expect a shape like `{ criteria: Array<{ id, description, passed }> }`.
- **`usage` is optional** (token counts), but recommended for cost tracking.

#### Example: Pre-built AI SDK Judge (pass a model)

```ts
import { openai } from "@ai-sdk/openai";
import { createAiSdkJudge } from "jest-llm-eval";

const judge = createAiSdkJudge(openai("gpt-4o-mini"));
```

#### Example: Vercel AI SDK (custom)

```ts
import { generateObject, jsonSchema } from "ai";
import { openai } from "@ai-sdk/openai";
import type { JudgeAdapter, GenericMessage, TokenUsage } from "jest-llm-eval";

export const judge: JudgeAdapter = {
  async evaluateObject({ jsonSchema: schema, messages, systemPrompt }) {
    const fullMessages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const { object, usage } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: jsonSchema(schema),
      messages: fullMessages,
    });

    return {
      object,
      usage: {
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
        totalTokens: usage?.totalTokens ?? 0,
      },
    };
  },
};
```

#### Example: OpenAI SDK (JSON Schema response_format)

```ts
import OpenAI from "openai";
import type { JudgeAdapter, GenericMessage, TokenUsage } from "jest-llm-eval";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const judge: JudgeAdapter = {
  async evaluateObject({ jsonSchema, messages, systemPrompt }) {
    const fullMessages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: fullMessages.map((m) => ({
        role: m.role === "tool" ? "assistant" : m.role, // map unsupported role if needed
        content:
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      response_format: {
        type: "json_schema",
        json_schema: { name: "Evaluation", schema: jsonSchema, strict: true },
      },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    return {
      object: parsed,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens ?? 0,
      },
    };
  },
};
```

Tips

- **Keep prompts minimal**: the library already supplies an evaluation system prompt when using `evaluateAiResponse`.
- **Use strict JSON outputs**: prefer SDK features that enforce JSON Schema to avoid brittle string parsing.
- **Map roles if needed**: if your SDK does not support the `tool` role, fallback to `assistant` or stringify tool events.

### CLI Viewer

```bash
npx jest-llm-eval view --theme vibrant --filter failed
```

### Jest Setup

```js
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ["jest-llm-eval/setup"],
  reporters: [
    "default",
    ["jest-llm-eval/terminal-reporter", { theme: "vibrant", compact: false }],
    [
      "jest-llm-eval/evaluation-reporter",
      { outputDir: "./jest-evaluation-results" },
    ],
  ],
};
```

### Examples

See `packages/llm-eval/examples/` for runnable demos: basic evaluation, multi-step conversation, tool-call testing, and terminal reporting.

### Contributing

PRs welcome. Please see `packages/llm-eval/CONTRIBUTING.md`.

### Release & Publish

1. Bump version in `packages/llm-eval/package.json` (SemVer).
2. Commit the change to `main`.
3. Create and push a tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
   The release workflow publishes `packages/llm-eval` to npm when the tag matches the package version.

### License

MIT © [Oleksandr Erm](https://github.com/alexerm)
