# Jest LLM Eval

[![npm version](https://badge.fury.io/js/jest-llm-eval.svg)](https://badge.fury.io/js/jest-llm-eval)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Jest extension for evaluating Large Language Model (LLM) responses using AI-powered assertions. Test your AI applications with semantic understanding rather than brittle string matching.

## Features

- 🤖 **AI-Powered Assertions**: Evaluate LLM responses using another LLM as a judge
- 📊 **Rich Reporting**: Generate detailed HTML and JSON reports of evaluation results
- 🎯 **Flexible Criteria**: Use predefined criteria or create custom evaluation rules
- 🔧 **Jest Integration**: Seamlessly extends Jest with custom matchers
- 📈 **Confidence Testing**: Run tests multiple times to ensure reliability
- 🛠️ **Tool Call Testing**: Verify AI agents make correct tool/function calls
- 🔄 **Multi-Step Conversations**: Test complex conversation flows
- 📝 **TypeScript Support**: Full TypeScript definitions included

## Installation

```bash
npm install jest-llm-eval
```

## Quick Start

```typescript
import { defineEvaluationCriteria, CRITERIA } from 'jest-llm-eval';
import { openai } from '@ai-sdk/openai';

// Define your evaluation criteria
const criteria = defineEvaluationCriteria()
  .add(CRITERIA.Relevance)
  .add(CRITERIA.Professionalism)
  .add({ id: 'custom', description: 'Response mentions specific technical details' })
  .build();

// Create your LLM for evaluation
const evaluationModel = openai('gpt-4');

test('AI assistant provides helpful response', async () => {
  // Your LLM conversation
  const conversation = [
    { role: 'user', content: 'How do I deploy a React app?' },
    { role: 'assistant', content: 'You can deploy a React app using services like Vercel, Netlify, or AWS. Here\\'s how...' }
  ];

  // AI-powered assertion
  await expect(conversation).toPassAllCriteria(criteria, evaluationModel);
});
```

## Core Concepts

### Evaluation Criteria

Define what makes a good LLM response:

```typescript
import { defineEvaluationCriteria, CRITERIA } from 'jest-llm-eval';

// Use predefined criteria
const criteria = defineEvaluationCriteria()
  .add(CRITERIA.Welcome)        // Response is welcoming
  .add(CRITERIA.Relevance)      // Response is relevant
  .add(CRITERIA.Conciseness)    // Response is concise
  .add(CRITERIA.Professionalism) // Response is professional
  .build();

// Or create custom criteria
const customCriteria = defineEvaluationCriteria()
  .add({
    id: 'accuracy',
    description: 'The response contains factually accurate information'
  })
  .add({
    id: 'code_quality',
    description: 'Any code examples follow best practices'
  })
  .build();
```

### Custom Matchers

Jest LLM Eval provides several powerful matchers:

#### `toPassAllCriteria`
Evaluates responses against defined criteria:

```typescript
await expect(conversation).toPassAllCriteria(criteria, evaluationModel);
```

#### `toPassWithConfidence`
Runs tests multiple times to ensure reliability:

```typescript
const testFunction = async () => {
  const response = await generateAIResponse(prompt);
  await expect(response).toPassAllCriteria(criteria, evaluationModel);
};

await expect(testFunction).toPassWithConfidence({
  iterations: 5,
  minSuccessRate: 0.8  // 80% success rate required
});
```

#### `toHaveToolCall`
Verifies AI agents make correct tool/function calls:

```typescript
// Check if a specific tool was called
await expect(conversation).toHaveToolCall('search_database');

// Check tool call with specific arguments
await expect(conversation).toHaveToolCall('search_database', {
  query: 'user preferences',
  limit: 10
});
```

## Advanced Usage

### Multi-Step Conversations

Test complex conversation flows:

```typescript
import { runMultiStepTest } from 'jest-llm-eval';

test('multi-step customer service conversation', async () => {
  const conversation = await runMultiStepTest(
    [
      "I need help with my order",
      "Order #12345",
      "I want to return it"
    ],
    {
      createAgentPrompt: (messages) => ({
        model: openai('gpt-4'),
        messages: [
          { role: 'system', content: 'You are a helpful customer service agent' },
          ...messages
        ]
      }),
      onStep: (conversation, stepIndex) => {
        console.log(`Step ${stepIndex + 1} completed`);
      }
    }
  );

  const criteria = defineEvaluationCriteria()
    .add(CRITERIA.Professionalism)
    .add({ id: 'helpful', description: 'Provides helpful assistance throughout' })
    .build();

  await expect(conversation).toPassAllCriteria(criteria, evaluationModel);
});
```

### Custom Evaluation Models

Use any LLM provider supported by the AI SDK:

```typescript
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// Different models for different purposes
const fastModel = openai('gpt-3.5-turbo');      // Quick evaluations
const smartModel = openai('gpt-4');              // Complex evaluations
const alternativeModel = anthropic('claude-3-haiku'); // Different perspective
```

## Configuration

### Jest Setup

Add to your `jest.config.js`:

```javascript
module.exports = {
  setupFilesAfterEnv: ['jest-llm-eval/setup'],
  reporters: [
    'default',
    ['jest-llm-eval/reporter', { outputDir: './evaluation-reports' }]
  ]
};
```

### TypeScript

If using TypeScript, add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["jest", "jest-llm-eval"]
  }
}
```

## Reporting

Jest LLM Eval generates comprehensive reports:

- **HTML Reports**: Visual overview of all evaluations with detailed breakdowns
- **JSON Reports**: Machine-readable data for further analysis
- **Console Output**: Real-time feedback during test runs

Reports include:
- ✅ Pass/fail status for each criterion
- 📊 Token usage statistics
- 🕐 Execution timing
- 💬 Full conversation context
- 🔍 Detailed failure analysis

## Best Practices

### 1. Choose the Right Evaluation Model
- Use `gpt-4` for complex evaluations requiring nuanced understanding
- Use `gpt-3.5-turbo` for simple, fast evaluations
- Consider using different models for different types of criteria

### 2. Design Clear Criteria
```typescript
// Good: Specific and measurable
.add({
  id: 'code_syntax',
  description: 'Code examples have correct syntax and can be executed'
})

// Avoid: Vague or subjective
.add({
  id: 'good_response',
  description: 'The response is good'
})
```

### 3. Use Confidence Testing for Critical Paths
```typescript
// For critical functionality, ensure consistency
await expect(criticalTestFunction).toPassWithConfidence({
  iterations: 10,
  minSuccessRate: 0.9
});
```

### 4. Structure Your Tests
```typescript
describe('Customer Service Agent', () => {
  const evaluationModel = openai('gpt-4');
  
  const baseCriteria = defineEvaluationCriteria()
    .add(CRITERIA.Professionalism)
    .add(CRITERIA.Relevance)
    .build();

  test('handles billing questions', async () => {
    // Test specific scenario
  });

  test('handles technical support', async () => {
    // Test specific scenario
  });
});
```

## Examples

Check out the `/examples` directory for complete working examples:

- **Basic Evaluation**: Simple response evaluation
- **Multi-Step Conversation**: Complex conversation flows
- **Tool Call Testing**: Function calling verification
- **Confidence Testing**: Reliability testing
- **Custom Criteria**: Domain-specific evaluation rules

## API Reference

### Core Functions

#### `defineEvaluationCriteria()`
Creates a builder for defining evaluation criteria.

#### `evaluateAiResponse(model, messages, criteria)`
Directly evaluate a conversation against criteria.

### Predefined Criteria

- `CRITERIA.Welcome`: Response is welcoming
- `CRITERIA.Relevance`: Response is relevant to user's message
- `CRITERIA.LanguageMatch`: Response matches user's language
- `CRITERIA.Conciseness`: Response is concise and to the point
- `CRITERIA.Professionalism`: Response maintains professional tone

### Types

```typescript
interface EvaluationCriterionDef {
  id: string;
  description: string;
}

interface EvaluatedCriterionResult {
  id: string;
  description: string;
  passed: boolean;
}

interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens: number;
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/yourusername/jest-llm-eval/docs)
- 🐛 [Issues](https://github.com/yourusername/jest-llm-eval/issues)
- 💬 [Discussions](https://github.com/yourusername/jest-llm-eval/discussions)
- 📧 [Email Support](mailto:support@example.com)

---

**Made with ❤️ for the AI development community**