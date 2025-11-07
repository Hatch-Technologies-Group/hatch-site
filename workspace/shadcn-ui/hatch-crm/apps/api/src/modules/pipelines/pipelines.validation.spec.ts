import { compileJsonSchemaOrThrow, validateAutomationPayload, validateUniqueStageNamesAndOrder } from './pipelines.validation';

describe('pipelines.validation', () => {
  it('throws when stage names are duplicated', () => {
    const stages = [
      { name: 'New', order: 1 },
      { name: 'New', order: 2 }
    ];
    expect(() => validateUniqueStageNamesAndOrder(stages as any)).toThrow(/Duplicate stage name/i);
  });

  it('throws when stage orders are duplicated', () => {
    const stages = [
      { name: 'A', order: 1 },
      { name: 'B', order: 1 }
    ];
    expect(() => validateUniqueStageNamesAndOrder(stages as any)).toThrow(/Duplicate stage order/i);
  });

  it('accepts a valid JSON schema', () => {
    const schema = { type: 'object', properties: { email: { type: 'string', format: 'email' } } };
    expect(() => compileJsonSchemaOrThrow(schema, 'FieldSet')).not.toThrow();
  });

  it('rejects an invalid JSON schema', () => {
    const schema = { type: 'not-real' };
    expect(() => compileJsonSchemaOrThrow(schema, 'FieldSet')).toThrow(/not a valid JSON Schema/i);
  });

  it('requires automation trigger.on', () => {
    const automation = { trigger: {}, actions: [{}] };
    expect(() => validateAutomationPayload(automation as any)).toThrow(/trigger.on/);
  });

  it('requires automation actions array', () => {
    const automation = { trigger: { on: 'stage.enter' }, actions: [] };
    expect(() => validateAutomationPayload(automation as any)).toThrow(/actions/);
  });

  it('accepts a valid automation payload', () => {
    const automation = { trigger: { on: 'stage.enter' }, actions: [{ type: 'assign' }] };
    expect(() => validateAutomationPayload(automation as any)).not.toThrow();
  });
});
