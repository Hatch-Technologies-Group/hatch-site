export class ViewDto {
  brokerageId!: string;
  name!: string;
  scope!: 'pipeline' | 'global';
  layout!: unknown;
  filters?: unknown;
  sort?: unknown;
  roles!: string[];
  isDefault?: boolean;
}
