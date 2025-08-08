import {
  generateObject,
  type LanguageModel,
  type CoreMessage,
  type Schema,
} from 'ai';
import type { JudgeAdapter, GenericMessage, TokenUsage } from './types';

/**
 * Factory for a pre-built judge adapter using the Vercel AI SDK.
 * Pass any `LanguageModel` (e.g., `openai('gpt-4o-mini')`).
 */
export function createAiSdkJudge(model: LanguageModel): JudgeAdapter {
  return {
    async evaluateObject({ zodSchema, jsonSchema, messages, systemPrompt }) {
      const schemaToUse: Schema | undefined =
        (zodSchema as unknown as Schema) ?? (jsonSchema as unknown as Schema);
      if (!schemaToUse) {
        throw new Error(
          'createAiSdkJudge: either zodSchema or jsonSchema must be provided'
        );
      }

      const { object, usage } = await generateObject({
        model,
        schema: schemaToUse,
        messages: messages as unknown as CoreMessage[],
        system: systemPrompt,
      });

      const normalizedUsage: TokenUsage = {
        totalTokens:
          (usage as { totalTokens?: number } | undefined)?.totalTokens ?? 0,
      };

      return { object, usage: normalizedUsage };
    },
  };
}
