import type { GoldenEval } from './types';

export type GoldenTest = GoldenEval & {
  expect: GoldenEval['expect'] & {
    scoring?: Record<string, unknown>;
  };
};

export type { GoldenEval };
