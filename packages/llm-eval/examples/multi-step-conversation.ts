import { defineEvaluationCriteria, CRITERIA, runMultiStepTest } from '../src';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

/**
 * Multi-Step Conversation Example
 *
 * This example demonstrates how to test complex conversation flows
 * where the AI needs to maintain context across multiple interactions.
 */

describe('Multi-Step Conversation Testing', () => {
  const evaluationModel = openai('gpt-4');
  const aiModel = openai('gpt-3.5-turbo');

  test('customer service conversation maintains context', async () => {
    const conversation = await runMultiStepTest(
      [
        "Hi, I'm having trouble with my order",
        'My order number is #12345',
        'I want to return one of the items',
        "It's the blue shirt, size medium",
      ],
      {
        createAgentPrompt: messages => ({
          model: aiModel,
          messages: [
            {
              role: 'system' as const,
              content:
                'You are a helpful customer service representative. Be professional, empathetic, and gather necessary information to help customers.',
            },
            ...messages,
          ],
        }),
        onStep: (conversation, stepIndex) => {
          console.log(`Completed step ${stepIndex + 1}/${4}`);
        },
      }
    );

    const criteria = defineEvaluationCriteria()
      .add(CRITERIA.Professionalism)
      .add(CRITERIA.Relevance)
      .add({
        id: 'context_awareness',
        description:
          'The assistant maintains context from previous messages and refers to the order number when appropriate',
      })
      .add({
        id: 'helpful_questions',
        description:
          'The assistant asks relevant follow-up questions to gather necessary information',
      })
      .add({
        id: 'return_process',
        description:
          'The assistant provides clear guidance on the return process',
      })
      .build();

    await expect(conversation).toPassAllCriteria(criteria, evaluationModel);
  });

  test('technical support conversation shows problem-solving approach', async () => {
    const conversation = await runMultiStepTest(
      [
        'My website is not loading properly',
        "It's a React application",
        'The error happens when I try to login',
        "I see a 'Network Error' message",
      ],
      {
        createAgentPrompt: messages => ({
          model: aiModel,
          messages: [
            {
              role: 'system' as const,
              content:
                'You are a technical support specialist. Help users debug their technical issues by asking relevant questions and providing step-by-step guidance.',
            },
            ...messages,
          ],
        }),
      }
    );

    const technicalCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Professionalism)
      .add(CRITERIA.Relevance)
      .add({
        id: 'diagnostic_approach',
        description:
          'The assistant follows a systematic diagnostic approach, asking relevant technical questions',
      })
      .add({
        id: 'react_knowledge',
        description:
          'The assistant demonstrates knowledge of React applications and common issues',
      })
      .add({
        id: 'troubleshooting_steps',
        description:
          'The assistant provides specific troubleshooting steps for the network error',
      })
      .build();

    await expect(conversation).toPassAllCriteria(
      technicalCriteria,
      evaluationModel
    );
  });

  test('educational conversation builds on previous knowledge', async () => {
    const conversation = await runMultiStepTest(
      [
        'I want to learn about machine learning',
        "I'm familiar with Python programming",
        "What's the difference between supervised and unsupervised learning?",
        'Can you give me a practical example of supervised learning?',
      ],
      {
        createAgentPrompt: messages => ({
          model: aiModel,
          messages: [
            {
              role: 'system' as const,
              content:
                "You are an educational AI tutor. Adapt your explanations to the student's level and build on their existing knowledge.",
            },
            ...messages,
          ],
        }),
      }
    );

    const educationalCriteria = defineEvaluationCriteria()
      .add(CRITERIA.Relevance)
      .add({
        id: 'builds_on_knowledge',
        description:
          "The assistant builds on the student's existing Python knowledge when explaining concepts",
      })
      .add({
        id: 'clear_explanations',
        description:
          'The assistant provides clear, understandable explanations of machine learning concepts',
      })
      .add({
        id: 'practical_examples',
        description:
          'The assistant provides practical, relatable examples when requested',
      })
      .add({
        id: 'progressive_learning',
        description:
          'The conversation flows logically from basic concepts to more specific examples',
      })
      .build();

    await expect(conversation).toPassAllCriteria(
      educationalCriteria,
      evaluationModel
    );
  });
});
