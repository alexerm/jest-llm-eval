export type TextPart = {
  type: 'text';
  text: string;
};

export type ToolCallPart = {
  type: 'tool-call';
  toolCallId?: string;
  toolName: string;
  input: Record<string, unknown>;
};

export type ToolResultPart = {
  type: 'tool-result';
  toolCallId?: string;
  toolName: string;
  output: unknown;
  isError?: boolean;
};

export type MessagePart = TextPart | ToolCallPart | ToolResultPart | string;

export type GenericMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | MessagePart[];
};

export type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens: number;
};

import type { ZodTypeAny } from 'zod';

export interface JudgeAdapter {
  evaluateObject(args: {
    // Prefer Zod; JSON Schema is optional for SDKs that require it
    zodSchema?: ZodTypeAny;
    jsonSchema?: object;
    messages: GenericMessage[];
    systemPrompt?: string;
  }): Promise<{ object: unknown; usage?: TokenUsage }>;
}
