import {
  defineEvaluationCriteria,
  CRITERIA,
  evaluateAiResponse,
} from './evaluation-utils';
import './test-utils';
import type { JudgeAdapter, GenericMessage } from './types';
import { z } from 'zod';

// A stub judge that returns deterministic results to avoid external calls
const stubJudge: JudgeAdapter = {
  async evaluateObject({ zodSchema }) {
    const schema =
      zodSchema ??
      z.object({
        criteria: z.array(
          z.object({
            id: z.string(),
            description: z.string(),
            passed: z.boolean(),
          })
        ),
      });
    const object = schema.parse({
      criteria: [
        {
          id: 'welcome',
          description: 'The response is welcoming to the user',
          passed: true,
        },
        {
          id: 'relevance',
          description:
            "The response is relevant to the user's initial greeting",
          passed: true,
        },
      ],
    });
    return { object, usage: { totalTokens: 0 } };
  },
};

describe('LLM Evals (unit)', () => {
  it('evaluateAiResponse aggregates results and usage', async () => {
    const messages: GenericMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi, how can I help you?' },
    ];
    const criteria = defineEvaluationCriteria()
      .add(CRITERIA.Welcome)
      .add(CRITERIA.Relevance)
      .build();

    const result = await evaluateAiResponse(stubJudge, messages, criteria);
    expect(result.results).toHaveLength(2);
    expect(result.results.every(r => r.passed)).toBe(true);
    expect(result.usage.totalTokens).toBe(0);
  });

  it('evaluateAiResponse defaults usage when adapter omits it', async () => {
    const noUsageJudge: JudgeAdapter = {
      async evaluateObject({ zodSchema }) {
        const schema =
          zodSchema ??
          z.object({
            criteria: z.array(
              z.object({
                id: z.string(),
                description: z.string(),
                passed: z.boolean(),
              })
            ),
          });
        const object = schema.parse({
          criteria: [
            {
              id: 'welcome',
              description: 'The response is welcoming to the user',
              passed: true,
            },
          ],
        });
        return { object };
      },
    };

    const messages: GenericMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    const criteria = defineEvaluationCriteria().add(CRITERIA.Welcome).build();
    const result = await evaluateAiResponse(noUsageJudge, messages, criteria);
    expect(result.results).toHaveLength(1);
    expect(result.usage.totalTokens).toBe(0);
  });
});
