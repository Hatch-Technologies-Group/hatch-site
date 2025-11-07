export interface MigrationTarget {
  listItems(pipelineId: string): Promise<Array<{ id: string; stageName: string | null }>>;
  updateStage(id: string, newStageId: string): Promise<void>;
  countByStage(pipelineId: string): Promise<Record<string, number>>;
}
