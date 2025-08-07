import { defineEvaluationCriteria, CRITERIA } from '../src';
import { openai } from '@ai-sdk/openai';

/**
 * Basic Example: Evaluating a simple AI response
 *
 * This example demonstrates how to evaluate a basic AI conversation
 * using predefined criteria.
 */

describe('Basic LLM Evaluation', () => {
  // Setup evaluation model
  const evaluationModel = openai('gpt-4');

  // Define evaluation criteria
  const criteria = defineEvaluationCriteria()
    .add(CRITERIA.Welcome)
    .add(CRITERIA.Relevance)
    .add(CRITERIA.Professionalism)
    .build();

  test('AI assistant provides welcoming and relevant response', async () => {
    const conversation = [
      {
        role: 'user' as const,
        content: 'Hello, I need help with my JavaScript project.',
      },
      {
        role: 'assistant' as const,
        content:
          "Hello! I'd be happy to help you with your JavaScript project. What specific issue are you facing or what would you like assistance with?",
      },
    ];

    await expect(conversation).toPassAllCriteria(criteria, evaluationModel);
  });

  test('AI assistant handles technical questions professionally', async () => {
    const conversation = [
      {
        role: 'user' as const,
        content: 'How do I handle async operations in JavaScript?',
      },
      {
        role: 'assistant' as const,
        content:
          "There are several ways to handle async operations in JavaScript: Promises, async/await, and callbacks. I recommend using async/await for cleaner, more readable code. Here's a basic example:\n\n```javascript\nasync function fetchData() {\n  try {\n    const response = await fetch('https://api.example.com/data');\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error('Error fetching data:', error);\n  }\n}\n```\n\nWould you like me to explain any specific part of this?",
      },
    ];

    const technicalCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Relevance)
      .add(CRITERIA.Professionalism)
      .add({
        id: 'technical_accuracy',
        description:
          'The response contains technically accurate information about JavaScript async operations',
      })
      .add({
        id: 'code_example',
        description: 'The response includes a helpful code example',
      })
      .build();

    await expect(conversation).toPassAllCriteria(
      technicalCriteria,
      evaluationModel
    );
  });

  test('AI assistant fails inappropriate response', async () => {
    const conversation = [
      {
        role: 'user' as const,
        content: 'Hello, can you help me?',
      },
      {
        role: 'assistant' as const,
        content: "No, I can't help you. Figure it out yourself.",
      },
    ];

    // This should fail the professionalism and welcome criteria
    await expect(async () => {
      await expect(conversation).toPassAllCriteria(criteria, evaluationModel);
    }).rejects.toThrow();
  });
});
