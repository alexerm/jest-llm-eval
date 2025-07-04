import { defineEvaluationCriteria, CRITERIA } from './evaluation-utils';
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4.1-mini');

describe('LLM Evals', () => {
  it('should pass all criteria', async () => {
    const conversation = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi, how can I help you?' },
    ];
    const criteria = defineEvaluationCriteria()
      .add(CRITERIA.Welcome)
      .add(CRITERIA.Relevance)
      .build();

    await expect(conversation).toPassAllCriteria(criteria, model);
  });
});
