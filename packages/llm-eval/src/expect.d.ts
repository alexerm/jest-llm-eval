import type { JudgeAdapter } from './types';
import type { ZodTypeAny } from 'zod';
import type { EvaluationCriterionDef } from './evaluation-utils';

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
    toHaveToolCall(
      toolName: string,
      expectedArgs?: Record<string, import('zod').infer<ZodTypeAny>>
    ): R;
  }
}

declare global {
  namespace jest {
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
      toHaveToolCall(
        toolName: string,
        expectedArgs?: Record<string, import('zod').infer<ZodTypeAny>>
      ): R;
    }
  }
}
