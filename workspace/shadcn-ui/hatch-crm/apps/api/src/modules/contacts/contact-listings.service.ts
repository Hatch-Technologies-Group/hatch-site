import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/modules/prisma/prisma.service';

type PageOptions = { limit: number; cursor?: string };

type CursorPayload = { ms: number; id: string };

type ListingRow = {
  id: string;
  mlsId: string;
  address: string | null;
  price: number | null;
  status: string | null;
  photoUrl?: string | null;
  sent_at?: Date | string | null;
  favorited_at?: Date | string | null;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class ContactListingsService {
  constructor(private readonly db: PrismaService) {}

  async getSent(contactId: string, { limit, cursor }: PageOptions) {
    const safeLimit = this.normalizeLimit(limit);
    const cur = decodeCursor(cursor);

    const rows = await this.db.$queryRawUnsafe<ListingRow[]>(
      `
        SELECT a.id,
               a.ts AS sent_at,
               a.meta->>'mlsId' AS "mlsId",
               p.address_line1 AS "address",
               p.price,
               p.status,
               p.photo_url AS "photoUrl"
        FROM activity a
        JOIN property p ON p.mls_id = a.meta->>'mlsId'
        WHERE a.contact_id = $1
          AND a.type = 'PropertySent'
          ${cursorWhere(cur, '<')}
        ORDER BY a.ts DESC, a.id DESC
        LIMIT ${safeLimit + 1}
      `,
      contactId
    );

    return buildPage(rows, safeLimit, 'sent_at');
  }

  async getFavorites(contactId: string, { limit, cursor }: PageOptions) {
    const safeLimit = this.normalizeLimit(limit);
    const cur = decodeCursor(cursor);

    const rows = await this.db.$queryRawUnsafe<ListingRow[]>(
      `
        SELECT a.id,
               a.ts AS favorited_at,
               a.meta->>'mlsId' AS "mlsId",
               p.address_line1 AS "address",
               p.price,
               p.status,
               p.photo_url AS "photoUrl"
        FROM activity a
        JOIN property p ON p.mls_id = a.meta->>'mlsId'
        WHERE a.contact_id = $1
          AND a.type = 'PropertyFavorited'
          ${cursorWhere(cur, '<')}
        ORDER BY a.ts DESC, a.id DESC
        LIMIT ${safeLimit + 1}
      `,
      contactId
    );

    return buildPage(rows, safeLimit, 'favorited_at');
  }

  private normalizeLimit(input: number | undefined): number {
    if (!Number.isFinite(input)) {
      return DEFAULT_LIMIT;
    }

    const coerced = Math.floor(Number(input));
    return Math.min(Math.max(coerced, 1), MAX_LIMIT);
  }
}

function cursorWhere(cursor: CursorPayload | null, operator: '<' | '>'): string {
  if (!cursor) {
    return '';
  }

  const safeId = cursor.id.replace(/'/g, "''");
  return `AND (a.ts, a.id) ${operator} (to_timestamp(${cursor.ms} / 1000.0), '${safeId}')`;
}

function encodeCursor(ts: Date | string | null | undefined, id: string): string {
  if (!ts) {
    return '';
  }

  const time = typeof ts === 'string' ? Date.parse(ts) : new Date(ts).getTime();
  return Buffer.from(`${time}.${id}`).toString('base64url');
}

function decodeCursor(cursor?: string): CursorPayload | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [ms, id] = decoded.split('.');
    if (!ms || !id) {
      return null;
    }

    return { ms: Number(ms), id };
  } catch {
    return null;
  }
}

function buildPage(rows: ListingRow[], limit: number, tsKey: 'sent_at' | 'favorited_at') {
  const page = rows.slice(0, limit);
  let nextCursor: string | undefined;

  if (rows.length > limit && page.length) {
    const last = page[page.length - 1]!;
    const encoded = encodeCursor(last[tsKey] ?? null, last.id);
    if (encoded) {
      nextCursor = encoded;
    }
  }

  return { rows: page, nextCursor };
}
