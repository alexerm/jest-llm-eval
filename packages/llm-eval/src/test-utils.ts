// @jest-environment jsdom
import { generateText, generateObject, type LanguageModel, type CoreMessage, type Schema } from 'ai';
import type { GenericMessage, JudgeAdapter, TokenUsage } from './types';
import {
  type EvaluationCriterionDef,
  evaluateAiResponse,
  type EvaluatedCriterionResult,
  type EvaluationResultWithUsage,
} from './evaluation-utils';
import util from 'util';
import { z, ZodTypeAny } from 'zod';

/**
 * Combines two arrays of messages into a single conversation array.
 * This is useful for combining initial conversation context with AI responses.
 *
 * @param initialMessages - The initial messages (e.g., from agent config).
 * @param responseMessages - The response messages to append.
 * @returns A combined array of ModelMessage objects representing the full conversation.
 */
export function combineConversation(
  initialMessages: GenericMessage[],
  responseMessages: GenericMessage[]
): GenericMessage[] {
  return [...initialMessages, ...responseMessages];
}

// This type is essentially EvaluatedCriterionResult[], kept for potential distinct usage or can be removed.
export type LLMEvalCriteria = EvaluatedCriterionResult[];

// Structure for storing a single, detailed evaluation record
export interface EvaluationRecord {
  id: string; // Unique ID for the evaluation run
  testPath: string; // Path to the test file
  testName: string; // Name of the test (e.g., from describe/it)
  timestamp: string; // ISO string of when the evaluation occurred
  durationMs: number; // How long the evaluation took in milliseconds
  modelId: string; // Identifier for the language model used
  conversation: GenericMessage[];
  criteria: ReadonlyArray<EvaluationCriterionDef>;
  results: EvaluatedCriterionResult[];
  usage: TokenUsage;
  passed: boolean; // Overall pass/fail status for this evaluation
}

// Initialize the global store if it doesn't exist
(global as unknown as NodeJS.Global).evaluationRecords =
  (global as unknown as NodeJS.Global).evaluationRecords || [];

/**
 * Custom matcher: expect(conversation).toPassAllCriteria(evaluationCriteria, evaluationModel)
 */
function isJudgeAdapter(value: unknown): value is JudgeAdapter {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as { evaluateObject?: unknown }).evaluateObject === 'function';
}

async function toPassAllCriteria(
  this: jest.MatcherContext,
  receivedConversation: GenericMessage[],
  criteria: ReadonlyArray<EvaluationCriterionDef>,
  judge: JudgeAdapter | LanguageModel
): Promise<jest.CustomMatcherResult> {
  const startTime = Date.now();

  if (!receivedConversation) {
    return {
      message: () => 'Expected a conversation (ModelMessage[]) to be provided.',
      pass: false,
    };
  }
  if (!criteria || criteria.length === 0) {
    return {
      message: () =>
        'Expected evaluation criteria (EvaluationCriterionDef[]) to be provided.',
      pass: false,
    };
  }
  if (!judge) {
    return {
      message: () => 'Expected a judge adapter to be provided.',
      pass: false,
    };
  }
  const judgeToUse: JudgeAdapter = isJudgeAdapter(judge)
    ? judge
    : {
        evaluateObject: async (args: {
          jsonSchema: object;
          messages: GenericMessage[];
          systemPrompt?: string;
        }): Promise<{ object: unknown; usage?: TokenUsage }> => {
          // Adapt our fixed JSON schema to a Zod schema for generateObject
          const zodCriteria = z
            .object({ id: z.string(), description: z.string(), passed: z.boolean() })
            .strict();
          const zodSchema = z.object({ criteria: z.array(zodCriteria) }).strict();

          const result = await generateObject({
            model: judge as LanguageModel,
            schema: zodSchema as unknown as Schema,
            messages: args.messages as unknown as CoreMessage[],
            system: args.systemPrompt,
          });
          return { object: result.object, usage: result.usage as TokenUsage };
        },
      };

  const evaluationData = await evaluateAiResponse(
    judgeToUse,
    receivedConversation,
    criteria
  );
  const endTime = Date.now();
  const durationMs = endTime - startTime;

  const allPassed =
    Array.isArray(evaluationData.results) &&
    evaluationData.results.every(c => c.passed);

  // Model id is not available when using generic judge; set placeholder
  const modelId = 'judge';

  const testPath = this.testPath || 'unknown_path';
  const testName = this.currentTestName || 'unknown_test_name';

  const record: EvaluationRecord = {
    id: `${testPath}-${testName}-${startTime}`.replace(/[^a-zA-Z0-9-_]/g, '_'), // Basic sanitization for ID
    testPath,
    testName,
    timestamp: new Date(startTime).toISOString(),
    durationMs,
    modelId,
    conversation: receivedConversation,
    criteria,
    results: evaluationData.results,
    usage: evaluationData.usage,
    passed: allPassed,
  };

  (global as unknown as NodeJS.Global).evaluationRecords.push(record);

  if (allPassed) {
    return { message: () => `expected all criteria not to pass`, pass: true };
  } else {
    const failed = evaluationData.results
      .filter(c => !c.passed)
      .map(c => `${c.id}: ${c.description}`)
      .join('\n  ');
    return {
      message: () =>
        `expected all criteria to pass, but these failed:\n  ${failed}`,
      pass: false,
    };
  }
}

/**
 * Custom matcher: expect(testFunction).toPassWithConfidence({ iterations, minSuccessRate })
 */
async function toPassWithConfidence(
  this: jest.MatcherContext,
  receivedTestFn: () => Promise<z.infer<ZodTypeAny>>,
  options: { iterations?: number; minSuccessRate?: number } = {}
) {
  const { iterations = 10, minSuccessRate = 0.8 } = options;

  const results = await Promise.allSettled(
    Array(iterations)
      .fill(0)
      .map(async (_, i) => {
        try {
          await receivedTestFn();
          return true;
        } catch (error: unknown) {
          // Log the error message for the failed iteration
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.log(
            `Iteration ${i + 1}/${iterations} failed: ${errorMessage}`
          );
          return false;
        }
      })
  );

  const successes = results.filter(
    r => r.status === 'fulfilled' && r.value
  ).length;
  const successRate = successes / iterations;

  if (successRate >= minSuccessRate) {
    return {
      message: () =>
        `expected success rate (${successRate.toFixed(2)}) for test function not to be >= ${minSuccessRate}`,
      pass: true,
    };
  } else {
    return {
      message: () =>
        `expected success rate for test function to be >= ${minSuccessRate}, but got ${successRate.toFixed(2)} (${successes}/${iterations} passed)`,
      pass: false,
    };
  }
}

/**
 * Custom matcher: expect(conversation).toHaveToolCall(toolName)
 */
async function toHaveToolCallResult(
  this: jest.MatcherContext,
  received: GenericMessage[],
  toolName: string
): Promise<jest.CustomMatcherResult> {
  const calls = received.filter(msg => msg.role === 'tool');
  // Check each tool message's content entries for the specified toolName
  const hasCall = calls.some(
    (call: any) =>
      Array.isArray(call.content) &&
      call.content.some((entry: any) => entry.toolName === toolName)
  );
  return {
    pass: hasCall,
    message: () =>
      hasCall
        ? `Expected conversation not to contain a call to "${toolName}", but it did.`
        : `Expected conversation to contain a call to "${toolName}", but none was found.`,
  };
}

/**
 * Pretty-print a conversation array in the terminal with full depth and colors.
 */
export function printConversation(conversation: GenericMessage[]) {
  console.log(util.inspect(conversation, { depth: null, colors: true }));
}

// ------------------ new multi-step helper with control ------------------
export async function runMultiStepTest(
  userMessages: string[],
  options: {
    createAgentPrompt: (messages: GenericMessage[]) => z.infer<ZodTypeAny>;
    onStep?: (conversation: GenericMessage[], stepIndex: number) => void;
  }
): Promise<GenericMessage[]> {
  const history: GenericMessage[] = [];
  let modelHistory: GenericMessage[] = [];

  for (let i = 0; i < userMessages.length; i++) {
    // Create and record UI user message
    const userMsg: GenericMessage = {
      role: 'user',
      content: userMessages[i],
    };
    history.push(userMsg);

    // Append user message to model history
    modelHistory = [...modelHistory, userMsg];

    // Generate agent response
    const agentConfig = options.createAgentPrompt(history);
    const result = await generateText(agentConfig);
    const assistantMsgs = result.response.messages as unknown as GenericMessage[];

    // Append assistant messages
    modelHistory = [...modelHistory, ...assistantMsgs];

    // Invoke step callback if supplied
    if (options.onStep) {
      options.onStep(modelHistory, i);
    }
  }

  // Return full conversation history for external evaluation
  return modelHistory;
}

// Helper: deep partial match (all keys in expected must be present and equal in actual)
function deepPartialMatch(
  actual: Record<string, z.infer<ZodTypeAny>>,
  expected: Record<string, z.infer<ZodTypeAny>>
): boolean {
  if (!expected) return true;
  if (!actual) return false;
  return Object.entries(expected).every(([key, val]) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return deepPartialMatch(actual[key], val);
    }
    if (Array.isArray(val)) {
      // For arrays, require shallow equality
      return (
        Array.isArray(actual[key]) && val.every((v, i) => actual[key][i] === v)
      );
    }
    return actual[key] === val;
  });
}

/**
 * Custom matcher: expect(conversation).toHaveToolCall(toolName, expectedArgs?)
 */
async function toHaveToolCall(
  this: jest.MatcherContext,
  received: GenericMessage[],
  toolName: string,
  expectedArgs?: Record<string, z.infer<ZodTypeAny>>
): Promise<jest.CustomMatcherResult> {
  const assistantMsgs = received.filter(msg => msg.role === 'assistant');
  let found = false;
  let foundWithArgs = false;
  let actualArgs: any = undefined;
  for (const msg of assistantMsgs) {
    if (Array.isArray(msg.content)) {
      for (const entry of msg.content as unknown[]) {
        const e: any = entry as any;
        if (e && e.type === 'tool-call' && e.toolName === toolName) {
          found = true;
          actualArgs = e.input;
          if (
            !expectedArgs ||
            deepPartialMatch(e.input as Record<string, z.infer<ZodTypeAny>>, expectedArgs)
          ) {
            foundWithArgs = true;
            break;
          }
        }
      }
    }
    if (foundWithArgs) break;
  }
  return {
    pass: foundWithArgs,
    message: () =>
      foundWithArgs
        ? `Expected conversation not to contain a tool-call to "${toolName}" with args ${expectedArgs ? JSON.stringify(expectedArgs) : ''}, but it did.`
        : found
          ? `Expected conversation to contain a tool-call to "${toolName}" with args ${expectedArgs ? JSON.stringify(expectedArgs) : ''}, but args did not match.\nActual args: ${JSON.stringify(actualArgs, null, 2)}`
          : `Expected conversation to contain a tool-call to "${toolName}", but none was found.`,
  };
}

// Register custom matchers and augment types
declare module 'expect' {
  interface Matchers<R> {
    toPassAllCriteria(
      criteria: ReadonlyArray<EvaluationCriterionDef>,
      judge: JudgeAdapter
    ): R;
    toPassWithConfidence(options?: {
      iterations?: number;
      minSuccessRate?: number;
    }): R;
    toHaveToolCallResult(toolName: string): R;
    /**
     * Checks that an assistant message contains a tool-call with the given toolName (and optionally, matching args)
     * @param toolName The name of the tool
     * @param expectedArgs (optional) Partial args to match
     */
    toHaveToolCall(
      toolName: string,
      expectedArgs?: Record<string, z.infer<ZodTypeAny>>
    ): R;
  }
}

expect.extend({
  toPassAllCriteria,
  toPassWithConfidence,
  toHaveToolCall,
  toHaveToolCallResult,
});
