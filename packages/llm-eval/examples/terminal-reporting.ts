import { defineEvaluationCriteria, CRITERIA } from '../src';
import { openai } from '@ai-sdk/openai';

/**
 * Terminal Reporting Example
 *
 * This example demonstrates the beautiful terminal output for LLM evaluations.
 * The terminal reporter provides colorful, well-formatted results with tables,
 * progress indicators, and detailed breakdowns.
 *
 * To use the terminal reporter, add it to your Jest configuration:
 *
 * // jest.config.js
 * module.exports = {
 *   reporters: [
 *     'default',
 *     ['jest-llm-eval/terminal-reporter', {
 *       theme: 'vibrant',
 *       showDetails: true,
 *       compact: false
 *     }]
 *   ]
 * };
 */

describe('Terminal Reporting Demo', () => {
  const evaluationModel = openai('gpt-4');

  const baseCriteria = defineEvaluationCriteria()
    .add(CRITERIA.Professionalism)
    .add(CRITERIA.Relevance)
    .add(CRITERIA.Conciseness)
    .build();

  test('professional customer service response', async () => {
    const conversation = [
      {
        role: 'user' as const,
        content:
          'I am frustrated with my recent purchase and want a refund immediately!',
      },
      {
        role: 'assistant' as const,
        content:
          "I understand your frustration and I'm here to help. Let me look into your purchase right away and see what options we have for you. Could you please provide your order number so I can assist you better?",
      },
    ];

    await expect(conversation).toPassAllCriteria(baseCriteria, evaluationModel);
  });

  test('technical support response', async () => {
    const conversation = [
      {
        role: 'user' as const,
        content:
          'My website keeps crashing when users try to login. This is urgent!',
      },
      {
        role: 'assistant' as const,
        content:
          "I understand this is urgent and impacts your users. Let's troubleshoot this immediately. First, can you check if there are any error messages in your server logs? Also, when did this issue start occurring?",
      },
    ];

    const technicalCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Professionalism)
      .add(CRITERIA.Relevance)
      .add({
        id: 'urgency_acknowledgment',
        description: 'The response acknowledges the urgency of the situation',
      })
      .add({
        id: 'diagnostic_approach',
        description: 'The response includes diagnostic questions or steps',
      })
      .build();

    await expect(conversation).toPassAllCriteria(
      technicalCriteria,
      evaluationModel
    );
  });

  test('educational explanation response', async () => {
    const conversation = [
      {
        role: 'user' as const,
        content:
          "Can you explain how machine learning works? I'm a complete beginner.",
      },
      {
        role: 'assistant' as const,
        content:
          'Great question! Think of machine learning like teaching a computer to recognize patterns, similar to how you learned to recognize different dog breeds. Instead of giving the computer specific rules, we show it thousands of examples and let it figure out the patterns on its own. For instance, we might show it pictures labeled "golden retriever" and "poodle" until it learns to tell them apart. Would you like me to explain a specific type of machine learning?',
      },
    ];

    const educationalCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Relevance)
      .add({
        id: 'beginner_friendly',
        description: 'The explanation is appropriate for a complete beginner',
      })
      .add({
        id: 'uses_analogies',
        description: 'The response uses helpful analogies or examples',
      })
      .add({
        id: 'encourages_further_learning',
        description: 'The response encourages further questions or learning',
      })
      .build();

    await expect(conversation).toPassAllCriteria(
      educationalCriteria,
      evaluationModel
    );
  });

  test('intentionally failing response for demo', async () => {
    const conversation = [
      {
        role: 'user' as const,
        content: 'Hello, can you help me with my account?',
      },
      {
        role: 'assistant' as const,
        content: 'No.',
      },
    ];

    // This test is designed to fail to show error reporting
    try {
      await expect(conversation).toPassAllCriteria(
        baseCriteria,
        evaluationModel
      );
    } catch (error) {
      // Expected to fail - this demonstrates error formatting in terminal
      expect(error).toBeDefined();
    }
  });

  test('complex multi-criteria evaluation', async () => {
    const conversation = [
      {
        role: 'user' as const,
        content:
          "I'm building a React app and need help with state management. Should I use Redux or Context API?",
      },
      {
        role: 'assistant' as const,
        content:
          "Great question! The choice between Redux and Context API depends on your app's complexity. For smaller apps with simple state, Context API is perfect - it's built into React and requires less boilerplate. For larger apps with complex state logic, frequent updates, or need for debugging tools, Redux offers better structure and DevTools. What's the scope of your project?",
      },
    ];

    const comprehensiveCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Relevance)
      .add(CRITERIA.Professionalism)
      .add({
        id: 'technical_accuracy',
        description:
          'The response provides technically accurate information about React state management',
      })
      .add({
        id: 'comparative_analysis',
        description:
          'The response compares different options (Redux vs Context API)',
      })
      .add({
        id: 'decision_guidance',
        description: 'The response provides guidance for making the decision',
      })
      .add({
        id: 'follow_up_question',
        description: 'The response asks a relevant follow-up question',
      })
      .build();

    await expect(conversation).toPassAllCriteria(
      comprehensiveCriteria,
      evaluationModel
    );
  });
});
