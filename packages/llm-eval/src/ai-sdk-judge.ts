import { generateObject, jsonSchema as wrapJsonSchema, type Schema, type LanguageModel } from 'ai';
import type { JudgeAdapter, GenericMessage, TokenUsage, MessagePart } from './types';

/**
 * Factory for a pre-built judge adapter using the Vercel AI SDK.
 * Pass any `LanguageModel` (e.g., `openai('gpt-4o-mini')`).
 */
export function createAiSdkJudge(model: LanguageModel): JudgeAdapter {
  return {
    async evaluateObject({ zodSchema, jsonSchema, messages, systemPrompt }) {
      if (!zodSchema && !jsonSchema) {
        throw new Error(
          'createAiSdkJudge: either zodSchema or jsonSchema must be provided'
        );
      }

      type MinimalGenObjectResult = {
        object: unknown;
        usage?: { totalTokens?: number };
      };

      let result: MinimalGenObjectResult;
      const prompt = buildPromptFromMessages(messages);
      if (zodSchema) {
        const r = await generateObject({
          model,
          schema: (zodSchema as unknown as Schema),
          prompt,
          system: systemPrompt,
        });
        result = { object: r.object, usage: (r as { usage?: { totalTokens?: number } }).usage };
      } else {
        const r = await generateObject({
          model,
          schema: wrapJsonSchema(jsonSchema as object),
          prompt,
          system: systemPrompt,
        });
        result = { object: r.object, usage: (r as { usage?: { totalTokens?: number } }).usage };
      }

      const { object, usage } = result;

      const normalizedUsage: TokenUsage = {
        totalTokens:
          (usage as { totalTokens?: number } | undefined)?.totalTokens ?? 0,
      };

      return { object, usage: normalizedUsage };
    },
  };
}

function buildPromptFromMessages(messages: GenericMessage[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    const text = extractText(m.content);
    const role = m.role.charAt(0).toUpperCase() + m.role.slice(1);
    lines.push(`${role}: ${text}`);
  }
  return lines.join('\n');
}

function extractText(content: string | MessagePart[]): string {
  if (typeof content === 'string') return content;
  const parts: string[] = [];
  for (const p of content) {
    if (typeof p === 'string') {
      parts.push(p);
      continue;
    }
    if (p.type === 'text') {
      parts.push(p.text);
    } else if (p.type === 'tool-result') {
      parts.push(`Tool ${p.toolName} result: ${JSON.stringify(p.output)}`);
    } else if (p.type === 'tool-call') {
      parts.push(`Tool ${p.toolName} called`);
    }
  }
  return parts.join('\n');
}
