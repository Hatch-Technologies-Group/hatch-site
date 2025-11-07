import { Prisma } from '@hatch/db';

/**
 * Use for JSON columns when you have a concrete JS value (object/array/primitive).
 * Never pass `null` directly to Prisma JSON—use JsonNull or undefined (optional).
 */
export function toJsonValue<T>(v: T): Prisma.InputJsonValue {
  return (v as unknown) as Prisma.InputJsonValue;
}

/**
 * Use for optional JSON fields where `null` should mean "no update" (omit).
 * Returns `undefined` for nullish, which Prisma interprets as "leave unchanged".
 */
export function toOptionalJson<T>(v: T | null | undefined): Prisma.InputJsonValue | undefined {
  return v == null ? undefined : ((v as unknown) as Prisma.InputJsonValue);
}

/**
 * Use for JSON columns that are nullable in the DB schema and you *intend to store NULL*.
 * This maps JS null → Prisma.JsonNull (not DbNull), which is the correct sentinel.
 */
export function toNullableJson<T>(v: T | null | undefined):
  | Prisma.InputJsonValue
  | typeof Prisma.JsonNull {
  return v == null ? Prisma.JsonNull : ((v as unknown) as Prisma.InputJsonValue);
}

/**
 * Guard: Prisma JSON inputs cannot be functions/symbols/bigint.
 * Optional: enable to hard-fail on unsupported types instead of trusting casts.
 */
export function assertJsonSafe(value: unknown, path = 'json'): void {
  const t = typeof value;
  if (t === 'function' || t === 'symbol' || t === 'bigint') {
    throw new TypeError(`Invalid ${path}: ${t} is not JSON-serializable`);
  }
}
