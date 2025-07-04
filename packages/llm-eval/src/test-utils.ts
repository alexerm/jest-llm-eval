// @jest-environment jsdom
import { generateText, type ModelMessage, type LanguageModel } from 'ai';
import {
  type EvaluationCriterionDef,
  evaluateAiResponse,
  type EvaluatedCriterionResult,
  type TokenUsage,
} from './evaluation-utils';
import util from 'util';

/**
 * Combines two arrays of messages into a single conversation array.
 * This is useful for combining initial conversation context with AI responses.
 *
 * @param initialMessages - The initial messages (e.g., from agent config).
 * @param responseMessages - The response messages to append.
 * @returns A combined array of ModelMessage objects representing the full conversation.
 */
export function combineConversation(
  initialMessages: ModelMessage[],
  responseMessages: ModelMessage[]
): ModelMessage[] {
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
  conversation: ModelMessage[]; // Message array in AI SDK v5
  criteria: ReadonlyArray<EvaluationCriterionDef>;
  results: EvaluatedCriterionResult[];
  usage: TokenUsage;
  passed: boolean; // Overall pass/fail status for this evaluation
}

// Declare a global variable to store evaluation records
declare global {
  // eslint-disable-next-line no-var
  var evaluationRecords: EvaluationRecord[];
}

// Initialize the global store if it doesn't exist
global.evaluationRecords = global.evaluationRecords || [];

// Type guard helpers for modelId and id
function hasModelId(obj: unknown): obj is { modelId: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as { modelId?: unknown }).modelId === 'string'
  );
}

function hasId(obj: unknown): obj is { id: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as { id?: unknown }).id === 'string'
  );
}

// Helper to check if value is a record (object with string keys)
function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Custom matcher: expect(conversation).toPassAllCriteria(evaluationCriteria, evaluationModel)
 */
async function toPassAllCriteria(
  this: jest.MatcherContext,
  receivedConversation: ModelMessage[],
  criteria: ReadonlyArray<EvaluationCriterionDef>,
  model: LanguageModel
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
  if (!model) {
    return {
      message: () =>
        'Expected an evaluation model (LanguageModel) to be provided.',
      pass: false,
    };
  }

  const evaluationData = await evaluateAiResponse(
    model,
    receivedConversation,
    criteria
  );
  const endTime = Date.now();
  const durationMs = endTime - startTime;

  const allPassed =
    Array.isArray(evaluationData.results) &&
    evaluationData.results.every(c => c.passed);

  // Attempt to get a model identifier
  let modelId = 'Unknown Model';
  if (hasModelId(model)) {
    modelId = model.modelId;
  } else if (typeof model === 'string') {
    modelId = model;
  } else if (
    typeof model === 'object' &&
    model !== null &&
    'constructor' in model &&
    (model as { constructor?: unknown }).constructor &&
    typeof (model as { constructor?: unknown }).constructor === 'function'
  ) {
    const ctorName = (model as { constructor: { name?: string } }).constructor
      .name;
    modelId = typeof ctorName === 'string' ? ctorName : 'Unknown Model';
  }

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

  global.evaluationRecords.push(record);

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
  receivedTestFn: () => Promise<unknown>,
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
  received: ModelMessage[],
  toolName: string
): Promise<jest.CustomMatcherResult> {
  const calls = received.filter(msg => msg.role === 'tool');
  // Check each tool message's content entries for the specified toolName
  const hasCall = calls.some(
    (call: ModelMessage) =>
      Array.isArray(call.content) &&
      call.content.some(
        entry => isToolCallContent(entry) && entry.toolName === toolName
      )
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
export function printConversation(conversation: ModelMessage[]) {
  console.log(util.inspect(conversation, { depth: null, colors: true }));
}

// ------------------ new multi-step helper with control ------------------
export async function runMultiStepTest(
  userMessages: string[],
  options: {
    createAgentPrompt: (messages: ModelMessage[]) => {
      model: LanguageModel;
      messages: ModelMessage[];
    };
    onStep?: (conversation: ModelMessage[], stepIndex: number) => void;
  }
): Promise<ModelMessage[]> {
  const uiHistory: ModelMessage[] = [];
  let modelHistory: ModelMessage[] = [];

  for (let i = 0; i < userMessages.length; i++) {
    // Create and record UI user message
    const userMsg: ModelMessage = {
      role: 'user' as const,
      content: userMessages[i],
    };
    uiHistory.push(userMsg);
    modelHistory = [...modelHistory, userMsg];

    // Generate agent response
    const agentConfig = options.createAgentPrompt(uiHistory);
    const result = await generateText(agentConfig);
    const assistantMsg: ModelMessage = {
      role: 'assistant' as const,
      content: result.text,
    };
    modelHistory = [...modelHistory, assistantMsg];

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
  actual: unknown,
  expected: Record<string, unknown>
): boolean {
  if (!expected) return true;
  if (!isRecord(actual)) return false;
  const actualRecord = actual;
  return Object.entries(expected).every(([key, val]) => {
    if (!Object.prototype.hasOwnProperty.call(actualRecord, key)) return false;
    const actualValue = (actualRecord as { [k: string]: unknown })[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (!isRecord(actualValue)) return false;
      return deepPartialMatch(actualValue, val as Record<string, unknown>);
    }
    if (Array.isArray(val)) {
      if (!Array.isArray(actualValue)) return false;
      return val.every((v, i) => actualValue[i] === v);
    }
    return actualValue === val;
  });
}

// Tool call content type for tool-call entries
interface ToolCallContent {
  type: 'tool-call';
  toolName: string;
  args: Record<string, unknown>;
}

function isToolCallContent(entry: unknown): entry is ToolCallContent {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    (entry as { type?: unknown }).type === 'tool-call' &&
    typeof (entry as { toolName?: unknown }).toolName === 'string' &&
    typeof (entry as { args?: unknown }).args === 'object'
  );
}

/**
 * Custom matcher: expect(conversation).toHaveToolCall(toolName, expectedArgs?)
 */
async function toHaveToolCall(
  this: jest.MatcherContext,
  received: ModelMessage[],
  toolName: string,
  expectedArgs?: Record<string, unknown>
): Promise<jest.CustomMatcherResult> {
  const assistantMsgs = received.filter(msg => msg.role === 'assistant');
  let found = false;
  let foundWithArgs = false;
  let actualArgs: Record<string, unknown> | undefined = undefined;
  for (const msg of assistantMsgs) {
    if (Array.isArray(msg.content)) {
      for (const entry of msg.content) {
        if (isToolCallContent(entry) && entry.toolName === toolName) {
          found = true;
          actualArgs = entry.args;
          if (!expectedArgs || deepPartialMatch(entry.args, expectedArgs)) {
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
expect.extend({
  toPassAllCriteria,
  toPassWithConfidence,
  toHaveToolCallResult,
  toHaveToolCall,
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toPassAllCriteria(
        criteria: ReadonlyArray<EvaluationCriterionDef>,
        model: LanguageModel
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
        expectedArgs?: Record<string, unknown>
      ): R;
    }
  }
}
