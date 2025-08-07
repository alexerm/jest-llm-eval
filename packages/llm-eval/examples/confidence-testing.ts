import { defineEvaluationCriteria, CRITERIA } from '../src';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

/**
 * Confidence Testing Example
 *
 * This example demonstrates how to test AI responses multiple times
 * to ensure consistency and reliability, especially important for
 * non-deterministic AI models.
 */

describe('Confidence Testing', () => {
  const evaluationModel = openai('gpt-4');
  const aiModel = openai('gpt-3.5-turbo');

  const criteria = defineEvaluationCriteria()
    .add(CRITERIA.Professionalism)
    .add(CRITERIA.Relevance)
    .add({
      id: 'helpful_response',
      description: 'The response provides helpful and actionable advice',
    })
    .build();

  test('AI provides consistent helpful responses', async () => {
    const testFunction = async () => {
      const result = await generateText({
        model: aiModel,
        prompt:
          'A user asks: "How can I improve my productivity while working from home?" Please provide a helpful response.',
        temperature: 0.7, // Some randomness to test consistency
      });

      const conversation = [
        {
          role: 'user' as const,
          content: 'How can I improve my productivity while working from home?',
        },
        {
          role: 'assistant' as const,
          content: result.text,
        },
      ];

      await expect(conversation).toPassAllCriteria(criteria, evaluationModel);
    };

    // Run the test 5 times, require 80% success rate
    await expect(testFunction).toPassWithConfidence({
      iterations: 5,
      minSuccessRate: 0.8,
    });
  });

  test('AI handles edge cases consistently', async () => {
    const edgeCases = [
      'What is the meaning of life?',
      'Tell me a joke about programming',
      'How do I center a div in CSS?',
      "What's the best programming language?",
      'How do I deal with imposter syndrome?',
    ];

    const testFunction = async () => {
      // Pick a random edge case
      const randomCase =
        edgeCases[Math.floor(Math.random() * edgeCases.length)];

      const result = await generateText({
        model: aiModel,
        prompt: `A user asks: "${randomCase}" Please provide a helpful and appropriate response.`,
        temperature: 0.8,
      });

      const conversation = [
        {
          role: 'user' as const,
          content: randomCase,
        },
        {
          role: 'assistant' as const,
          content: result.text,
        },
      ];

      const edgeCaseCriteria = defineEvaluationCriteria()
        .add(CRITERIA.Professionalism)
        .add(CRITERIA.Relevance)
        .add({
          id: 'appropriate_response',
          description:
            'The response is appropriate for the question asked, even if the question is unconventional',
        })
        .build();

      await expect(conversation).toPassAllCriteria(
        edgeCaseCriteria,
        evaluationModel
      );
    };

    // Test with higher iteration count for edge cases
    await expect(testFunction).toPassWithConfidence({
      iterations: 10,
      minSuccessRate: 0.7, // Lower success rate for edge cases
    });
  });

  test('AI maintains quality under different temperature settings', async () => {
    const temperatures = [0.1, 0.5, 0.9];

    for (const temperature of temperatures) {
      const testFunction = async () => {
        const result = await generateText({
          model: aiModel,
          prompt:
            'A user asks: "Explain the concept of recursion in programming." Please provide a clear and educational response.',
          temperature: temperature,
        });

        const conversation = [
          {
            role: 'user' as const,
            content: 'Explain the concept of recursion in programming.',
          },
          {
            role: 'assistant' as const,
            content: result.text,
          },
        ];

        const technicalCriteria = defineEvaluationCriteria()
          .add(CRITERIA.Relevance)
          .add({
            id: 'technical_accuracy',
            description: 'The explanation of recursion is technically accurate',
          })
          .add({
            id: 'clear_explanation',
            description: 'The explanation is clear and easy to understand',
          })
          .add({
            id: 'includes_example',
            description: 'The response includes a practical example or analogy',
          })
          .build();

        await expect(conversation).toPassAllCriteria(
          technicalCriteria,
          evaluationModel
        );
      };

      await expect(testFunction).toPassWithConfidence({
        iterations: 3,
        minSuccessRate: 0.8,
      });
    }
  });

  test('AI handles complex multi-part questions consistently', async () => {
    const complexQuestions = [
      "I'm building a web app with React and Node.js. How do I handle authentication, what database should I use, and how do I deploy it?",
      'I want to switch careers from marketing to software development. What programming languages should I learn, how long will it take, and what job opportunities are available?',
      'My startup is growing rapidly. How do I scale my infrastructure, manage my team, and maintain code quality as we expand?',
    ];

    const testFunction = async () => {
      const question =
        complexQuestions[Math.floor(Math.random() * complexQuestions.length)];

      const result = await generateText({
        model: aiModel,
        prompt: `A user asks: "${question}" Please provide a comprehensive and structured response.`,
        temperature: 0.6,
      });

      const conversation = [
        {
          role: 'user' as const,
          content: question,
        },
        {
          role: 'assistant' as const,
          content: result.text,
        },
      ];

      const complexCriteria = defineEvaluationCriteria()
        .add(CRITERIA.Relevance)
        .add({
          id: 'comprehensive_coverage',
          description:
            'The response addresses all parts of the multi-part question',
        })
        .add({
          id: 'structured_response',
          description: 'The response is well-structured and organized',
        })
        .add({
          id: 'actionable_advice',
          description: 'The response provides actionable, practical advice',
        })
        .build();

      await expect(conversation).toPassAllCriteria(
        complexCriteria,
        evaluationModel
      );
    };

    await expect(testFunction).toPassWithConfidence({
      iterations: 6,
      minSuccessRate: 0.75,
    });
  });
});
