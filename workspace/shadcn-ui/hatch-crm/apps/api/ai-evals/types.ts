export type GoldenEvalContext = {
  page?: string;
  entityType?: string;
  entityId?: string;
  tenantId?: string;
  filters?: Record<string, unknown>;
};

export type GoldenEvalMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type GoldenEvalExpectations = {
  must_include?: string[];
  must_not_include?: string[];
};

export type GoldenEval = {
  name: string;
  description?: string;
  context?: GoldenEvalContext;
  inputs: {
    messages: GoldenEvalMessage[];
  };
  expect: GoldenEvalExpectations;
};
