// @ts-nocheck
import { defineEvaluationCriteria, CRITERIA } from './evaluation-utils';
import './test-utils';
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-5');

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);
const hasApiKey = !!process.env.OPENAI_API_KEY;

describeIf(hasApiKey)('LLM Evals', () => {
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
