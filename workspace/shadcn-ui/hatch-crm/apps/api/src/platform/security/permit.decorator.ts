import { SetMetadata } from '@nestjs/common';

export const PERMIT_METADATA_KEY = 'platform:permit';

export type PermitAction = 'create' | 'read' | 'update' | 'delete';

export interface PermitMetadata {
  object: string;
  action: PermitAction;
}

const PERMISSIONS_DISABLED =
  process.env.NODE_ENV !== 'production' &&
  (process.env.DISABLE_PERMISSIONS_GUARD ?? 'true').toLowerCase() === 'true';

export const Permit = (object: string, action: PermitAction) => {
  if (PERMISSIONS_DISABLED) {
    return () => undefined;
  }
  return SetMetadata<string, PermitMetadata>(PERMIT_METADATA_KEY, { object, action });
};
