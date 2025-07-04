import { defineEvaluationCriteria, CRITERIA } from '../src';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { generateText, generateObject, tool } from 'ai';
import { z } from 'zod';

/**
 * AI SDK v5 Features Example
 *
 * This example demonstrates how to use Jest LLM Eval with the new AI SDK v5 beta features:
 * - LanguageModelV2 interface
 * - Enhanced UIMessage/CoreMessage system
 * - Improved tool handling
 * - Multiple provider support
 * - Enhanced streaming capabilities
 */

describe('AI SDK v5 Beta Features', () => {
  // Test with multiple providers using v5 syntax
  const providers = {
    openai: openai('gpt-4'),
    anthropic: anthropic('claude-3-haiku-20240307'),
    google: google('gemini-pro'),
  };

  const evaluationModel = openai('gpt-4'); // For evaluation

  const baseCriteria = defineEvaluationCriteria()
    .add(CRITERIA.Professionalism)
    .add(CRITERIA.Relevance)
    .add({
      id: 'provider_appropriate',
      description:
        'The response is appropriate for the specific AI provider capabilities',
    })
    .build();

  test('multiple providers with LanguageModelV2', async () => {
    const prompt = 'Explain the concept of machine learning in simple terms.';

    for (const [providerName, model] of Object.entries(providers)) {
      console.log(`Testing with ${providerName}...`);

      const result = await generateText({
        model,
        prompt,
        maxTokens: 200,
      });

      const conversation = [
        {
          role: 'user' as const,
          content: prompt,
        },
        {
          role: 'assistant' as const,
          content: result.text,
        },
      ];

      const providerCriteria = defineEvaluationCriteria()
        .add(CRITERIA.Relevance)
        .add({
          id: `${providerName}_appropriate`,
          description: `The response demonstrates ${providerName} model capabilities effectively`,
        })
        .build();

      await expect(conversation).toPassAllCriteria(
        providerCriteria,
        evaluationModel
      );
    }
  });

  test('enhanced tool system with type safety', async () => {
    // Define tools with enhanced v5 syntax
    const tools = {
      analyzeData: tool({
        description: 'Analyze a dataset and provide insights',
        parameters: z.object({
          dataType: z
            .enum(['sales', 'user_behavior', 'performance'])
            .describe('Type of data to analyze'),
          timeRange: z
            .string()
            .describe('Time range for analysis (e.g., "last_month")'),
          metrics: z.array(z.string()).describe('Specific metrics to focus on'),
        }),
        execute: async ({ dataType, timeRange, metrics }) => {
          return `Analysis of ${dataType} data for ${timeRange}: Key metrics ${metrics.join(', ')} show positive trends.`;
        },
      }),

      generateReport: tool({
        description: 'Generate a formatted report',
        parameters: z.object({
          title: z.string().describe('Report title'),
          sections: z.array(z.string()).describe('Report sections to include'),
          format: z.enum(['pdf', 'html', 'markdown']).describe('Output format'),
        }),
        execute: async ({ title, sections, format }) => {
          return `Generated ${format} report "${title}" with sections: ${sections.join(', ')}`;
        },
      }),
    };

    const result = await generateText({
      model: openai('gpt-4'),
      prompt:
        'I need to analyze our sales data from last quarter and generate a comprehensive report. Focus on revenue, conversion rates, and customer acquisition.',
      tools,
      maxSteps: 3,
    });

    const conversation = result.response.messages;

    // Verify tool usage
    await expect(conversation).toHaveToolCall('analyzeData', {
      dataType: 'sales',
      timeRange: expect.stringContaining('quarter'),
    });

    await expect(conversation).toHaveToolCall('generateReport');

    // Evaluate overall response quality
    const toolCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Relevance)
      .add({
        id: 'uses_appropriate_tools',
        description:
          'The assistant uses the right tools for data analysis and reporting',
      })
      .add({
        id: 'tool_sequence_logical',
        description:
          'The tools are used in a logical sequence (analyze first, then report)',
      })
      .build();

    await expect(conversation).toPassAllCriteria(toolCriteria, evaluationModel);
  });

  test('structured data generation with enhanced validation', async () => {
    const schema = z.object({
      summary: z.string().describe('Brief summary of the analysis'),
      recommendations: z
        .array(
          z.object({
            category: z.string().describe('Category of recommendation'),
            action: z.string().describe('Specific action to take'),
            priority: z
              .enum(['high', 'medium', 'low'])
              .describe('Priority level'),
            impact: z
              .number()
              .min(1)
              .max(10)
              .describe('Expected impact score (1-10)'),
          })
        )
        .describe('List of actionable recommendations'),
      metrics: z
        .object({
          confidence: z
            .number()
            .min(0)
            .max(1)
            .describe('Confidence in analysis (0-1)'),
          dataQuality: z
            .enum(['excellent', 'good', 'fair', 'poor'])
            .describe('Quality of source data'),
        })
        .describe('Analysis metadata'),
    });

    const result = await generateObject({
      model: openai('gpt-4'),
      schema,
      prompt:
        'Analyze the performance of our mobile app and provide structured recommendations for improvement.',
    });

    // Validate the structured output
    expect(result.object.summary).toBeDefined();
    expect(result.object.recommendations).toHaveLength(expect.any(Number));
    expect(result.object.metrics.confidence).toBeGreaterThan(0);

    // Create conversation for evaluation
    const conversation = [
      {
        role: 'user' as const,
        content:
          'Analyze the performance of our mobile app and provide structured recommendations for improvement.',
      },
      {
        role: 'assistant' as const,
        content: JSON.stringify(result.object, null, 2),
      },
    ];

    const structuredCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Relevance)
      .add({
        id: 'structured_output_complete',
        description:
          'The structured output contains all required fields with appropriate values',
      })
      .add({
        id: 'recommendations_actionable',
        description: 'The recommendations are specific and actionable',
      })
      .add({
        id: 'priorities_logical',
        description:
          'The priority assignments are logical based on potential impact',
      })
      .build();

    await expect(conversation).toPassAllCriteria(
      structuredCriteria,
      evaluationModel
    );
  });

  test('streaming evaluation with intermediate steps', async () => {
    const result = await generateText({
      model: openai('gpt-4'),
      prompt:
        'Explain the process of building a scalable web application, step by step.',
      maxTokens: 500,
    });

    // Simulate streaming chunks for evaluation
    const streamChunks = result.text
      .split('. ')
      .map(chunk => chunk.trim())
      .filter(Boolean);

    const conversation = [
      {
        role: 'user' as const,
        content:
          'Explain the process of building a scalable web application, step by step.',
      },
      {
        role: 'assistant' as const,
        content: result.text,
      },
    ];

    const streamingCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Relevance)
      .add({
        id: 'step_by_step_structure',
        description: 'The response follows a clear step-by-step structure',
      })
      .add({
        id: 'scalability_focus',
        description:
          'The explanation specifically addresses scalability concerns',
      })
      .add({
        id: 'technical_accuracy',
        description: 'The technical information is accurate and up-to-date',
      })
      .build();

    await expect(conversation).toPassAllCriteria(
      streamingCriteria,
      evaluationModel
    );

    // Verify content quality of intermediate steps
    expect(streamChunks.length).toBeGreaterThan(3); // Should have multiple steps
    expect(result.text.toLowerCase()).toContain('scalable');
  });

  test('confidence testing with multiple providers', async () => {
    const testFunction = async () => {
      // Randomly select a provider for each iteration
      const providerEntries = Object.entries(providers);
      const [providerName, model] =
        providerEntries[Math.floor(Math.random() * providerEntries.length)];

      const result = await generateText({
        model,
        prompt: 'What are the key principles of good software architecture?',
        maxTokens: 300,
        temperature: 0.7, // Add some randomness
      });

      const conversation = [
        {
          role: 'user' as const,
          content: 'What are the key principles of good software architecture?',
        },
        {
          role: 'assistant' as const,
          content: result.text,
        },
      ];

      const architectureCriteria = defineEvaluationCriteria()
        .add(CRITERIA.Relevance)
        .add({
          id: 'mentions_key_principles',
          description:
            'The response mentions recognized software architecture principles',
        })
        .add({
          id: 'practical_examples',
          description:
            'The response includes practical examples or applications',
        })
        .build();

      await expect(conversation).toPassAllCriteria(
        architectureCriteria,
        evaluationModel
      );
    };

    // Test consistency across providers and iterations
    await expect(testFunction).toPassWithConfidence({
      iterations: 6, // Test multiple times with different providers
      minSuccessRate: 0.8, // 80% success rate across providers
    });
  });
});
