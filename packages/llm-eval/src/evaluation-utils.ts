import { type LanguageModel, generateObject, type ModelMessage, jsonSchema } from 'ai';
import { z } from 'zod';

// Defines the structure for an evaluation criterion input
export type EvaluationCriterionDef = {
  readonly id: string; // Changed back to string to allow custom IDs
  readonly description: string;
};

// Defines the structure for an evaluated criterion result
export type EvaluatedCriterionResult = {
  id: string; // Changed back to string
  description: string;
  passed: boolean;
};

// Type for token usage, mirroring the Vercel AI SDK structure
export type TokenUsage = {
  promptTokens?: number; // Made optional to align with LanguageModelV2Usage
  completionTokens?: number; // Made optional to align with LanguageModelV2Usage
  totalTokens: number;
};

// Type for the combined result of evaluation and token usage
export type EvaluationResultWithUsage = {
  results: EvaluatedCriterionResult[];
  usage: TokenUsage;
};

// Predefined evaluation criteria with ids and descriptions
export const CRITERIA = {
  Welcome: {
    id: 'welcome',
    description: 'The response is welcoming to the user',
  },
  Relevance: {
    id: 'relevance',
    description: "The response is relevant to the user's initial greeting",
  },
  LanguageMatch: {
    id: 'language_match',
    description: "The response is in the same language as the user's message",
  },
  Conciseness: {
    id: 'conciseness',
    description: 'The response is concise and to the point',
  },
  Professionalism: {
    id: 'professionalism',
    description: 'The response maintains a professional tone',
  },
} as const;

// Type-safe keys and values for predefined criteria
export type CriterionKey = keyof typeof CRITERIA;
export type PredefinedCriterion = (typeof CRITERIA)[CriterionKey];

class CriteriaBuilder {
  private readonly currentCriteria: EvaluationCriterionDef[] = [];

  /**
   * Add a predefined criterion by key or a custom criterion object.
   * @param key The key of a predefined criterion.
   * @returns The builder instance for chaining.
   */
  add(key: CriterionKey): this;
  /**
   * @param criterion A custom criterion definition.
   */
  add(criterion: EvaluationCriterionDef): this;
  add(arg: CriterionKey | EvaluationCriterionDef): this {
    if (typeof arg === 'string') {
      this.currentCriteria.push(CRITERIA[arg]);
    } else {
      this.currentCriteria.push(arg);
    }
    return this;
  }

  /**
   * Builds and returns the array of evaluation criteria.
   * @returns A readonly array of EvaluationCriterionDef.
   */
  build(): ReadonlyArray<EvaluationCriterionDef> {
    return [...this.currentCriteria]; // Return a copy
  }
}

/**
 * Initializes a new CriteriaBuilder to fluently define evaluation criteria.
 * @returns A new instance of CriteriaBuilder.
 */
export function defineEvaluationCriteria() {
  return new CriteriaBuilder();
}

/**
 * Evaluates an AI response against a given set of criteria using a specified language model.
 *
 * @param evaluationModel The language model instance (e.g., from 'ai' package) to use for evaluation.
 * @param messages The messages array including the AI-generated text to be evaluated.
 * @param evaluationCriteria An array of criteria definitions (id and description) to evaluate against.
 * @returns A promise that resolves to an array of evaluated criteria, each indicating if it passed.
 */
export async function evaluateAiResponse(
  evaluationModel: LanguageModel,
  messages: ModelMessage[],
  evaluationCriteria: ReadonlyArray<EvaluationCriterionDef>
): Promise<EvaluationResultWithUsage> {
  // MODIFIED return type

  // Capture the full result from generateObject
  const generateObjectResult = await generateObject({
    model: evaluationModel,
    schema: jsonSchema({
      type: 'object',
      additionalProperties: false,
      required: ['criteria'],
      properties: {
        criteria: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'description', 'passed'],
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              passed: { type: 'boolean' },
            },
          },
        },
      },
    }),
    messages,
    system: `
      You evaluate the response of AI assistant. You should look at whole conversation and evaluate 
      it against the following criteria:
      ${evaluationCriteria.map(c => `- ${c.description} (ID: ${c.id})`).join('\n')}
    `,
  });

  // Return both the criteria results and the token usage
  return {
    results: (generateObjectResult.object as any).criteria as EvaluatedCriterionResult[],
    // The Vercel AI SDK's generateObject returns a 'usage' object with
    // { promptTokens: number; completionTokens: number; totalTokens: number; }
    // This casting assumes generateObjectResult.usage conforms to TokenUsage.
    usage: generateObjectResult.usage as TokenUsage,
  };
}
