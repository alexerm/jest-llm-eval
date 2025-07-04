# Migration Guide: AI SDK v5 Beta

This guide helps you migrate from Jest LLM Eval v1.x (AI SDK v3) to v2.x (AI SDK v5 beta).

## ⚠️ Breaking Changes

### 1. AI SDK Version

- **v1.x**: Uses AI SDK v3.x
- **v2.x**: Uses AI SDK v5 beta

### 2. Language Model Interface

```typescript
// ❌ v1.x (AI SDK v3)
import { LanguageModel } from 'ai';

async function evaluate(model: LanguageModel) {
  // ...
}

// ✅ v2.x (AI SDK v5 beta)
import { LanguageModelV2 } from 'ai';

async function evaluate(model: LanguageModelV2) {
  // ...
}
```

### 3. Provider Imports

```typescript
// ❌ v1.x (AI SDK v3)
import { openai } from '@ai-sdk/openai';

// ✅ v2.x (AI SDK v5 beta) - Same import, but new capabilities
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
```

### 4. Message Types

```typescript
// ❌ v1.x (AI SDK v3)
import { CoreMessage, Message } from 'ai';

// ✅ v2.x (AI SDK v5 beta)
import { CoreMessage, UIMessage } from 'ai';

// UIMessage replaces the generic Message type
const uiMessage: UIMessage = {
  id: 'msg-1',
  role: 'user',
  content: 'Hello',
};
```

## 🔄 Migration Steps

### Step 1: Update Dependencies

```bash
# Uninstall old version
npm uninstall jest-llm-eval

# Install v2.x beta
npm install jest-llm-eval@2.0.0-beta.1
```

### Step 2: Update Package Dependencies

```json
{
  "dependencies": {
    "ai": "5.0.0-beta.0",
    "@ai-sdk/openai": "^0.0.1-beta.0",
    "@ai-sdk/anthropic": "^0.0.1-beta.0",
    "@ai-sdk/google": "^0.0.1-beta.0"
  }
}
```

### Step 3: Update Type Imports

```typescript
// ❌ Old imports
import { LanguageModel } from 'ai';

// ✅ New imports
import { LanguageModelV2 } from 'ai';
```

### Step 4: Update Test Functions

```typescript
// ❌ v1.x
describe('LLM Tests', () => {
  const model: LanguageModel = openai('gpt-4');

  test('example', async () => {
    const conversation: CoreMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    await expect(conversation).toPassAllCriteria(criteria, model);
  });
});

// ✅ v2.x
describe('LLM Tests', () => {
  const model: LanguageModelV2 = openai('gpt-4');

  test('example', async () => {
    const conversation: CoreMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    await expect(conversation).toPassAllCriteria(criteria, model);
  });
});
```

### Step 5: Update Multi-Step Testing

```typescript
// ❌ v1.x
import { Message } from 'ai';

const conversation = await runMultiStepTest(['Hello', 'How are you?'], {
  createAgentPrompt: (messages: Message[]) => ({
    model: openai('gpt-4'),
    messages,
  }),
});

// ✅ v2.x
import { UIMessage } from 'ai';

const conversation = await runMultiStepTest(['Hello', 'How are you?'], {
  createAgentPrompt: (messages: UIMessage[]) => ({
    model: openai('gpt-4'),
    messages,
  }),
});
```

## 🆕 New Features in v2.x

### 1. Enhanced Tool Support

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const tools = {
  search: tool({
    description: 'Search for information',
    parameters: z.object({
      query: z.string(),
      limit: z.number().optional(),
    }),
    execute: async ({ query, limit = 10 }) => {
      return `Found ${limit} results for: ${query}`;
    },
  }),
};

const result = await generateText({
  model: openai('gpt-4'),
  prompt: 'Search for AI news',
  tools,
  maxSteps: 2,
});
```

### 2. Multiple Provider Testing

```typescript
const providers = {
  openai: openai('gpt-4'),
  anthropic: anthropic('claude-3-haiku-20240307'),
  google: google('gemini-pro'),
};

for (const [name, model] of Object.entries(providers)) {
  await expect(conversation).toPassAllCriteria(criteria, model);
}
```

### 3. Enhanced Structured Generation

```typescript
const result = await generateObject({
  model: openai('gpt-4'),
  schema: z.object({
    summary: z.string(),
    recommendations: z.array(
      z.object({
        action: z.string(),
        priority: z.enum(['high', 'medium', 'low']),
      })
    ),
  }),
  prompt: 'Analyze this data...',
});
```

## 🔧 Configuration Updates

### Jest Configuration

```javascript
// jest.config.js - No changes needed
module.exports = {
  setupFilesAfterEnv: ['jest-llm-eval/setup'],
  reporters: [
    'default',
    [
      'jest-llm-eval/terminal-reporter',
      {
        theme: 'vibrant',
        showDetails: true,
      },
    ],
    [
      'jest-llm-eval/evaluation-reporter',
      {
        outputDir: './evaluation-reports',
      },
    ],
  ],
};
```

## 🐛 Common Migration Issues

### Issue 1: Type Errors with LanguageModel

```typescript
// ❌ Error: Type 'LanguageModel' is not assignable to 'LanguageModelV2'
const model: LanguageModel = openai('gpt-4');

// ✅ Solution: Update type annotation
const model: LanguageModelV2 = openai('gpt-4');
```

### Issue 2: Message Type Conflicts

```typescript
// ❌ Error: Property 'parts' does not exist on type 'UIMessage'
const message: UIMessage = {
  id: '1',
  role: 'user',
  parts: [{ type: 'text', text: 'Hello' }], // Wrong property
};

// ✅ Solution: Use 'content' property
const message: UIMessage = {
  id: '1',
  role: 'user',
  content: 'Hello',
};
```

### Issue 3: Tool Definition Changes

```typescript
// ❌ Old tool definition (may not work with v5)
const tools = {
  search: {
    description: 'Search',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => `Results for ${query}`,
  },
};

// ✅ New tool definition with tool() helper
import { tool } from 'ai';

const tools = {
  search: tool({
    description: 'Search',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => `Results for ${query}`,
  }),
};
```

## 📚 Additional Resources

- [AI SDK v5 Beta Documentation](https://ai-sdk.dev/docs/announcing-ai-sdk-5-beta)
- [Jest LLM Eval Examples](./examples/ai-sdk-v5-features.ts)
- [TypeScript Configuration Guide](./README.md#typescript)

## 🆘 Need Help?

If you encounter issues during migration:

1. Check the [Issues](https://github.com/alexerm/jest-llm-eval/issues) page
2. Review the [AI SDK v5 examples](./examples/ai-sdk-v5-features.ts)
3. Compare with working examples in the repository
4. Open a new issue with your specific migration problem

## ⚠️ Beta Considerations

Remember that AI SDK v5 is in beta:

- **Development/Testing**: Safe to use for development and testing
- **Production**: Consider waiting for stable release
- **Breaking Changes**: Possible in future beta versions
- **Provider Support**: Some providers may have limited v5 support

## 📈 Benefits of Upgrading

- **Better Type Safety**: Enhanced TypeScript support
- **Improved Tool Handling**: More robust tool definitions and execution
- **Multiple Providers**: Easier testing across different AI providers
- **Enhanced Streaming**: Better support for streaming responses
- **Future-Ready**: Prepared for AI SDK v5 stable release
