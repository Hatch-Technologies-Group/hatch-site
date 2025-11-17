import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { ContactListQueryDto, ContactListSort } from './dto/contact-list-query.dto';

type ContactListRow = {
  person_id: string;
  tenant_id: string;
  org_id: string;
  owner_id: string | null;
  team_id: string | null;
  status: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  company_name: string | null;
  household_id: string | null;
  household_name: string | null;
  score: number | null;
  source: string | null;
  updated_at: Date;
  created_at: Date;
  last_activity_at: Date | null;
  open_tasks: bigint | number;
  has_sms_opt_in: boolean;
  has_email_opt_in: boolean;
  has_call_opt_in: boolean;
  is_dnc_blocked: boolean;
};

type CursorPayload = {
  sort: ContactListSort;
  updatedAt: string;
  personId: string;
  score?: number | null;
};

export interface ContactListItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  ownerId: string | null;
  teamId: string | null;
  companyId: string | null;
  companyName: string | null;
  householdId: string | null;
  householdName: string | null;
  score: number | null;
  source: string | null;
  updatedAt: string;
  createdAt: string;
  lastActivityAt: string | null;
  openTasks: number;
  consent: {
    sms: boolean;
    email: boolean;
    call: boolean;
  };
  dnc: boolean;
}

export interface ContactListPage {
  rows: ContactListItem[];
  nextCursor?: string;
}

interface ContactListInternalQuery extends ContactListQueryDto {
  orgId: string;
  tenantId: string;
  ownerIds?: string[] | null;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor?: string): CursorPayload | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
    if (parsed && parsed.sort && parsed.updatedAt && parsed.personId) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

@Injectable()
export class ContactsRepo {
  constructor(private readonly db: PrismaService) {}

  async list(query: ContactListInternalQuery): Promise<ContactListPage> {
    const limit = Math.min(query.limit ?? 50, 200);
    const sort = query.sort ?? 'updatedAt:desc';
    let cursor = decodeCursor(query.cursor);

    const where: string[] = ['clv.org_id = $1', 'clv.tenant_id = $2'];
    const params: Array<string | number | boolean | string[] | null> = [query.orgId, query.tenantId];
    let index = 3;

    if (query.ownerId) {
      where.push(`clv.owner_id = $${index}`);
      params.push(query.ownerId);
      index += 1;
    } else if (query.ownerIds?.length) {
      where.push(`clv.owner_id = ANY($${index}::text[])`);
      params.push(query.ownerIds);
      index += 1;
    }

    if (query.teamId) {
      where.push(`clv.team_id = $${index}`);
      params.push(query.teamId);
      index += 1;
    }

    if (query.status?.length) {
      where.push(`clv.status = ANY($${index}::text[])`);
      params.push(query.status);
      index += 1;
    }

    if (query.source?.length) {
      where.push(`clv.source = ANY($${index}::text[])`);
      params.push(query.source);
      index += 1;
    }

    if (typeof query.minScore === 'number') {
      where.push(`clv.score >= $${index}`);
      params.push(query.minScore);
      index += 1;
    }

    if (typeof query.maxAgeDays === 'number') {
      where.push(`clv.last_activity_at >= NOW() - ($${index}::int || ' days')::interval`);
      params.push(query.maxAgeDays);
      index += 1;
    }

    if (query.q) {
      where.push(
        `(clv.full_name ILIKE $${index} OR clv.email ILIKE $${index} OR clv.phone ILIKE $${index})`
      );
      params.push(`%${query.q}%`);
      index += 1;
    }

    if (query.consent?.length) {
      if (query.consent.includes('sms')) {
        where.push(`clv.has_sms_opt_in = true`);
      }
      if (query.consent.includes('email')) {
        where.push(`clv.has_email_opt_in = true`);
      }
      if (query.consent.includes('call')) {
        where.push(`clv.has_call_opt_in = true`);
      }
    }

    if (query.dncBlocked === true) {
      where.push(`clv.is_dnc_blocked = true`);
    } else if (query.dncBlocked === false) {
      where.push(`clv.is_dnc_blocked = false`);
    }

    if (cursor && cursor.sort !== sort) {
      cursor = null;
    }

    if (cursor && cursor.updatedAt) {
      const updatedParam = `to_timestamp($${index} / 1000.0)`;
      const idParam = `$${index + 1}`;
      const scoreParam = `$${index + 2}`;
      const updatedMs = Date.parse(cursor.updatedAt);
      params.push(updatedMs);
      params.push(cursor.personId);
      params.push(typeof cursor.score === 'number' ? cursor.score : null);

      if (sort === 'updatedAt:desc') {
        where.push(
          `(clv.updated_at < ${updatedParam} OR (clv.updated_at = ${updatedParam} AND clv.person_id < ${idParam}))`
        );
      } else if (sort === 'updatedAt:asc') {
        where.push(
          `(clv.updated_at > ${updatedParam} OR (clv.updated_at = ${updatedParam} AND clv.person_id > ${idParam}))`
        );
      } else if (sort === 'score:desc') {
        where.push(
          `(COALESCE(clv.score, -1e9) < COALESCE(${scoreParam}, -1e9) OR (COALESCE(clv.score, -1e9) = COALESCE(${scoreParam}, -1e9) AND (clv.updated_at < ${updatedParam} OR (clv.updated_at = ${updatedParam} AND clv.person_id < ${idParam}))))`
        );
      } else if (sort === 'score:asc') {
        where.push(
          `(COALESCE(clv.score, 1e9) > COALESCE(${scoreParam}, 1e9) OR (COALESCE(clv.score, 1e9) = COALESCE(${scoreParam}, 1e9) AND (clv.updated_at > ${updatedParam} OR (clv.updated_at = ${updatedParam} AND clv.person_id > ${idParam}))))`
        );
      }

      index += 3;
    }

    const whereSql = where.length ? `WHERE ${where.join('\n  AND ')}` : '';

    const order =
      sort === 'updatedAt:asc'
        ? `ORDER BY clv.updated_at ASC, clv.person_id ASC`
        : sort === 'score:desc'
          ? `ORDER BY clv.score DESC NULLS LAST, clv.updated_at DESC, clv.person_id DESC`
          : sort === 'score:asc'
            ? `ORDER BY clv.score ASC NULLS LAST, clv.updated_at ASC, clv.person_id ASC`
            : `ORDER BY clv.updated_at DESC, clv.person_id DESC`;

    const sql = `
      SELECT
        clv.person_id,
        clv.tenant_id,
        clv.org_id,
        clv.owner_id,
        clv.team_id,
        clv.status,
        clv.full_name,
        clv.email,
        clv.phone,
        clv.company_id,
        clv.company_name,
        clv.household_id,
        clv.household_name,
        clv.score,
        clv.source,
        clv.updated_at,
        clv.created_at,
        clv.last_activity_at,
        clv.open_tasks,
        clv.has_sms_opt_in,
        clv.has_email_opt_in,
        clv.has_call_opt_in,
        clv.is_dnc_blocked
      FROM contact_list_view clv
      ${whereSql}
      ${order}
      LIMIT $${index}
    `;

    params.push(limit + 1);

    let rows: ContactListRow[];
    try {
      rows = await this.db.$queryRawUnsafe<ContactListRow[]>(sql, ...params);
    } catch (error) {
      const message = String((error as Error)?.message ?? '').toLowerCase();
      const code = (error as { code?: string } | undefined)?.code;
      const isMissingView =
        code === '42P01' ||
        code === 'P2010' ||
        message.includes('contact_list_view') ||
        message.includes('relation') && message.includes('does not exist');
      // If the materialized view does not exist yet, fall back to a direct Person query
      if (isMissingView) {
        return this.fallbackListDirect(query);
      }
      throw error;
    }
    const page = rows.slice(0, limit);

    // If view returns no matches for a name search, fall back to direct Person search
    if (page.length === 0 && query.q) {
      return this.fallbackListDirect(query);
    }

    const nextCursor =
      rows.length > limit && page.length > 0
        ? encodeCursor({
            sort,
            updatedAt: toIso(page[page.length - 1].updated_at)!,
            personId: page[page.length - 1].person_id,
            score: page[page.length - 1].score
          })
        : undefined;

    return {
      rows: page.map((row) => ({
        id: row.person_id,
        name: row.full_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        ownerId: row.owner_id,
        teamId: row.team_id,
        companyId: row.company_id,
        companyName: row.company_name,
        householdId: row.household_id,
        householdName: row.household_name,
        score: row.score,
        source: row.source,
        updatedAt: toIso(row.updated_at)!,
        createdAt: toIso(row.created_at)!,
        lastActivityAt: toIso(row.last_activity_at),
        openTasks: Number(row.open_tasks ?? 0),
        consent: {
          sms: !!row.has_sms_opt_in,
          email: !!row.has_email_opt_in,
          call: !!row.has_call_opt_in
        },
        dnc: !!row.is_dnc_blocked
      })),
      nextCursor
    };
  }

  private async fallbackListDirect(query: ContactListInternalQuery): Promise<ContactListPage> {
    const take = Math.min(query.limit ?? 50, 200);
    const where: any = {
      tenantId: query.tenantId
    };
    if (query.q) {
      const search = `%${query.q}%`;
      // Using $queryRaw to keep case-insensitive matching similar to ILIKE
      const sql = `
        SELECT "id" as person_id, "tenantId" as tenant_id, "organizationId" as org_id,
               "ownerId" as owner_id, NULL::text as team_id, "stage" as status,
               NULLIF(concat_ws(' ', NULLIF("firstName", ''), NULLIF("lastName", '')), '') as full_name,
               "primaryEmail" as email, "primaryPhone" as phone,
               "companyId" as company_id, NULL::text as company_name,
               "householdId" as household_id, NULL::text as household_name,
               "leadScore" as score, "source", "updatedAt" as updated_at, "createdAt" as created_at,
               NULL::timestamp as last_activity_at, 0::bigint as open_tasks,
               false as has_sms_opt_in, false as has_email_opt_in, false as has_call_opt_in,
               "doNotContact" as is_dnc_blocked
        FROM "Person"
        WHERE "tenantId" = $1 AND "organizationId" = $2
          AND ("firstName" ILIKE $3 OR "lastName" ILIKE $3 OR "primaryEmail" ILIKE $3 OR "primaryPhone" ILIKE $3)
        ORDER BY "updatedAt" DESC, "id" DESC
        LIMIT $4
      `;
      const rows = await this.db.$queryRawUnsafe<ContactListRow[]>(
        sql,
        query.tenantId,
        query.orgId,
        search,
        take + 1
      );
      return {
        rows: rows.slice(0, take).map((row) => ({
          id: row.person_id,
          name: row.full_name,
          email: row.email,
          phone: row.phone,
          status: row.status,
          ownerId: row.owner_id,
          teamId: row.team_id,
          companyId: row.company_id,
          companyName: row.company_name,
          householdId: row.household_id,
          householdName: row.household_name,
          score: row.score,
          source: row.source,
          updatedAt: toIso(row.updated_at)!,
          createdAt: toIso(row.created_at)!,
          lastActivityAt: toIso(row.last_activity_at),
          openTasks: Number(row.open_tasks ?? 0),
          consent: { sms: false, email: false, call: false },
          dnc: !!row.is_dnc_blocked
        })),
        nextCursor: undefined
      };
    }

    const sql = `
      SELECT "id" as person_id, "tenantId" as tenant_id, "organizationId" as org_id,
             "ownerId" as owner_id, NULL::text as team_id, "stage" as status,
             NULLIF(concat_ws(' ', NULLIF("firstName", ''), NULLIF("lastName", '')), '') as full_name,
             "primaryEmail" as email, "primaryPhone" as phone,
             "companyId" as company_id, NULL::text as company_name,
             "householdId" as household_id, NULL::text as household_name,
             "leadScore" as score, "source", "updatedAt" as updated_at, "createdAt" as created_at,
             NULL::timestamp as last_activity_at, 0::bigint as open_tasks,
             false as has_sms_opt_in, false as has_email_opt_in, false as has_call_opt_in,
             "doNotContact" as is_dnc_blocked
      FROM "Person"
      WHERE "tenantId" = $1 AND "organizationId" = $2
      ORDER BY "updatedAt" DESC, "id" DESC
      LIMIT $3
    `;
    const rows = await this.db.$queryRawUnsafe<ContactListRow[]>(sql, query.tenantId, query.orgId, take + 1);
    return {
      rows: rows.slice(0, take).map((row) => ({
        id: row.person_id,
        name: row.full_name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        ownerId: row.owner_id,
        teamId: row.team_id,
        companyId: row.company_id,
        companyName: row.company_name,
        householdId: row.household_id,
        householdName: row.household_name,
        score: row.score,
        source: row.source,
        updatedAt: toIso(row.updated_at)!,
        createdAt: toIso(row.created_at)!,
        lastActivityAt: toIso(row.last_activity_at),
        openTasks: Number(row.open_tasks ?? 0),
        consent: { sms: false, email: false, call: false },
        dnc: !!row.is_dnc_blocked
      })),
      nextCursor: undefined
    };
  }
}
