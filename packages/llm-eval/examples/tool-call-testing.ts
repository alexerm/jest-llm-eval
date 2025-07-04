import { defineEvaluationCriteria, CRITERIA } from '../src';
import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';

/**
 * Tool Call Testing Example
 * 
 * This example demonstrates how to test AI agents that use tools/functions,
 * verifying that they make the right tool calls with appropriate arguments.
 */

describe('Tool Call Testing', () => {
  const evaluationModel = openai('gpt-4');
  const aiModel = openai('gpt-3.5-turbo');

  // Define some example tools
  const tools = {
    searchDatabase: tool({
      description: 'Search the customer database',
      parameters: z.object({
        query: z.string().describe('The search query'),
        limit: z.number().optional().describe('Maximum number of results')
      }),
      execute: async ({ query, limit = 10 }) => {
        return `Found ${Math.min(limit, 5)} customers matching "${query}"`;
      }
    }),
    
    sendEmail: tool({
      description: 'Send an email to a customer',
      parameters: z.object({
        to: z.string().describe('Recipient email address'),
        subject: z.string().describe('Email subject'),
        body: z.string().describe('Email body')
      }),
      execute: async ({ to, subject, body }) => {
        return `Email sent to ${to} with subject: ${subject}`;
      }
    }),

    calculatePrice: tool({
      description: 'Calculate the total price including tax',
      parameters: z.object({
        basePrice: z.number().describe('Base price before tax'),
        taxRate: z.number().describe('Tax rate as decimal (e.g., 0.1 for 10%)'),
        discount: z.number().optional().describe('Discount amount')
      }),
      execute: async ({ basePrice, taxRate, discount = 0 }) => {
        const discountedPrice = basePrice - discount;
        const totalPrice = discountedPrice * (1 + taxRate);
        return `Total price: $${totalPrice.toFixed(2)}`;
      }
    })
  };

  test('AI agent calls search tool when looking up customer information', async () => {
    const result = await generateText({
      model: aiModel,
      prompt: 'A customer named John Smith called asking about his order. Please look up his information in the database.',
      tools,
    });

    const conversation = result.response.messages;

    // Verify that the searchDatabase tool was called
    await expect(conversation).toHaveToolCall('searchDatabase');
    
    // Verify that the search query includes the customer name
    await expect(conversation).toHaveToolCall('searchDatabase', {
      query: expect.stringContaining('John Smith')
    });
  });

  test('AI agent calls email tool with proper parameters', async () => {
    const result = await generateText({
      model: aiModel,
      prompt: 'Send a welcome email to new customer jane.doe@example.com',
      tools,
    });

    const conversation = result.response.messages;

    // Verify email tool was called with correct parameters
    await expect(conversation).toHaveToolCall('sendEmail', {
      to: 'jane.doe@example.com',
      subject: expect.stringContaining('welcome')
    });

    // Evaluate the overall response quality
    const criteria = defineEvaluationCriteria()
      .add(CRITERIA.Professionalism)
      .add({
        id: 'appropriate_tool_use',
        description: 'The AI correctly identified the need to send an email and used the appropriate tool'
      })
      .build();

    await expect(conversation).toPassAllCriteria(criteria, evaluationModel);
  });

  test('AI agent performs complex multi-tool workflows', async () => {
    const result = await generateText({
      model: aiModel,
      prompt: 'A customer wants to know the total price for 3 items at $29.99 each with 8.5% tax and a 10% discount. After calculating, send them the quote via email to customer@example.com.',
      tools,
    });

    const conversation = result.response.messages;

    // Verify price calculation tool was called
    await expect(conversation).toHaveToolCall('calculatePrice', {
      basePrice: expect.any(Number),
      taxRate: expect.any(Number)
    });

    // Verify email tool was called after calculation
    await expect(conversation).toHaveToolCall('sendEmail', {
      to: 'customer@example.com'
    });

    // Evaluate the workflow quality
    const workflowCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Relevance)
      .add({
        id: 'correct_sequence',
        description: 'The AI performed the calculation first, then sent the email with the results'
      })
      .add({
        id: 'accurate_calculation',
        description: 'The price calculation used the correct base price (3 × $29.99), tax rate (8.5%), and discount (10%)'
      })
      .build();

    await expect(conversation).toPassAllCriteria(workflowCriteria, evaluationModel);
  });

  test('AI agent handles missing required tool parameters appropriately', async () => {
    const result = await generateText({
      model: aiModel,
      prompt: 'Send an email to a customer about their order status.',
      tools,
    });

    const conversation = result.response.messages;

    // The AI should either ask for missing information or not call the tool
    const hasEmailTool = conversation.some(msg => 
      msg.role === 'assistant' && 
      Array.isArray(msg.content) && 
      msg.content.some(content => 
        content.type === 'tool-call' && content.toolName === 'sendEmail'
      )
    );

    if (hasEmailTool) {
      // If email tool was called, verify it has required parameters
      await expect(conversation).toHaveToolCall('sendEmail', {
        to: expect.any(String),
        subject: expect.any(String),
        body: expect.any(String)
      });
    }

    // Evaluate how the AI handled the ambiguous request
    const handlingCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Professionalism)
      .add({
        id: 'handles_ambiguity',
        description: 'The AI appropriately handles the ambiguous request by either asking for clarification or making reasonable assumptions'
      })
      .build();

    await expect(conversation).toPassAllCriteria(handlingCriteria, evaluationModel);
  });

  test('AI agent uses tools efficiently without unnecessary calls', async () => {
    const result = await generateText({
      model: aiModel,
      prompt: 'What is the weather like today?',
      tools,
    });

    const conversation = result.response.messages;

    // The AI should not call irrelevant tools for a weather question
    const hasIrrelevantToolCalls = conversation.some(msg =>
      msg.role === 'assistant' &&
      Array.isArray(msg.content) &&
      msg.content.some(content => 
        content.type === 'tool-call' && 
        ['searchDatabase', 'sendEmail', 'calculatePrice'].includes(content.toolName)
      )
    );

    expect(hasIrrelevantToolCalls).toBe(false);

    // Evaluate the appropriateness of the response
    const appropriatenessCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Relevance)
      .add({
        id: 'no_unnecessary_tools',
        description: 'The AI did not call tools that are irrelevant to the weather question'
      })
      .add({
        id: 'appropriate_response',
        description: 'The AI provided an appropriate response explaining it cannot check weather without weather tools'
      })
      .build();

    await expect(conversation).toPassAllCriteria(appropriatenessCriteria, evaluationModel);
  });

  test('AI agent provides helpful responses even when tools fail', async () => {
    // Create a tool that always fails for testing
    const failingTools = {
      ...tools,
      searchDatabase: tool({
        description: 'Search the customer database',
        parameters: z.object({
          query: z.string().describe('The search query'),
          limit: z.number().optional().describe('Maximum number of results')
        }),
        execute: async ({ query, limit = 10 }) => {
          throw new Error('Database connection failed');
        }
      })
    };

    const result = await generateText({
      model: aiModel,
      prompt: 'Please look up customer information for John Smith.',
      tools: failingTools,
    });

    const conversation = result.response.messages;

    // Evaluate how the AI handles tool failures
    const errorHandlingCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Professionalism)
      .add({
        id: 'graceful_failure',
        description: 'The AI handles tool failures gracefully and provides helpful alternative suggestions'
      })
      .add({
        id: 'error_acknowledgment',
        description: 'The AI acknowledges that there was an issue with the search functionality'
      })
      .build();

    await expect(conversation).toPassAllCriteria(errorHandlingCriteria, evaluationModel);
  });
});