import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/modules/prisma/prisma.service'
import { EntityType, TimelineEntry, TimelineResponse } from './dto/get-timeline.dto'

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getTimeline(orgId: string, entityType: EntityType, entityId: string): Promise<TimelineResponse> {
    const timeline: TimelineEntry[] = []

    // Org events (filter in code for flexible payload)
    const events = await this.prisma.orgEvent.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 200 })
    for (const event of events) {
      const payload = (event.payload as any) ?? {}
      const matches = [payload.listingId, payload.leadId, payload.transactionId, payload.leaseId, payload.fileId].includes(entityId)
      if (!matches) continue
      timeline.push({
        ts: event.createdAt.toISOString(),
        source: 'EVENT',
        eventType: event.type,
        summary: event.message ?? event.type,
        metadata: payload
      })
    }

    // Notifications
    const notifications = await this.prisma.notification.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { listingId: entityId },
          { leadId: entityId },
          { transactionId: entityId },
          { leaseId: entityId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    for (const n of notifications) {
      timeline.push({
        ts: n.createdAt.toISOString(),
        source: 'NOTIFICATION',
        eventType: n.type,
        summary: n.title,
        metadata: { message: n.message }
      })
    }

    // Documents and compliance evaluations
    const orgFiles = await this.prisma.orgFile.findMany({
      where: {
        orgId,
        OR: [
          { listingId: entityId },
          { transactionId: entityId },
          { leaseId: entityId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    for (const file of orgFiles) {
      timeline.push({
        ts: (file.updatedAt ?? file.createdAt).toISOString(),
        source: 'DOCUMENT',
        eventType: 'DOCUMENT_EVALUATED',
        summary: `${file.name ?? 'Document'} · ${file.documentType}`,
        metadata: {
          complianceStatus: file.complianceStatus,
          documentType: file.documentType,
          fileId: file.id
        }
      })
    }

    // Playbook runs with entity context
    const playbookRuns = await this.prisma.playbookRun.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { listingId: entityId },
          { leadId: entityId },
          { transactionId: entityId },
          { leaseId: entityId }
        ]
      },
      orderBy: { startedAt: 'desc' },
      take: 100
    })
    for (const run of playbookRuns) {
      timeline.push({
        ts: (run.finishedAt ?? run.startedAt).toISOString(),
        source: 'PLAYBOOK',
        eventType: 'PLAYBOOK_RUN',
        summary: run.actionSummary ?? 'Playbook executed',
        metadata: { playbookId: run.playbookId, success: run.success, error: run.errorMessage }
      })
    }

    timeline.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))

    return { entityId, entityType, timeline }
  }

  private buildPayloadFilters(entityId: string) {
    return [
      { payload: { path: ['listingId'], equals: entityId } },
      { payload: { path: ['leadId'], equals: entityId } },
      { payload: { path: ['transactionId'], equals: entityId } },
      { payload: { path: ['leaseId'], equals: entityId } },
      { payload: { path: ['fileId'], equals: entityId } }
    ]
  }
}
