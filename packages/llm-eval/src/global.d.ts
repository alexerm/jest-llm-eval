import { EvaluationRecord } from './test-utils';

declare global {
  // Modern Node/TS: augment globalThis
  // eslint-disable-next-line no-var
  var evaluationRecords: EvaluationRecord[];

  // Backward compatibility for older NodeJS type definitions
  namespace NodeJS {
    interface Global {
      evaluationRecords: EvaluationRecord[];
    }
  }
}
