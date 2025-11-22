import { Body, Controller, NotFoundException, Post } from '@nestjs/common'

import { SeedService } from './seed.service'
import { StressService } from './stress.service'
import { ChaosService } from './chaos.service'

const ensureDev = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new NotFoundException('Devtools are disabled in production')
  }
}

@Controller('dev')
export class DevtoolsController {
  constructor(
    private readonly seed: SeedService,
    private readonly stress: StressService,
    private readonly chaos: ChaosService
  ) {}

  @Post('seed/org')
  async seedOrg(@Body() body: { orgId: string }) {
    ensureDev()
    const orgId = body?.orgId ?? 'org-demo'
    await this.seed.seedOrganization(orgId)
    return { ok: true, orgId }
  }

  @Post('stress/mls')
  async stressMls(@Body() body: { orgId: string; runs?: number }) {
    ensureDev()
    return this.stress.runMlsSyncBurst(body.orgId, body.runs ?? 5)
  }

  @Post('stress/ai')
  async stressAi(@Body() body: { orgId: string; personaId: string; count?: number }) {
    ensureDev()
    return this.stress.runPersonaBurst(body.orgId, body.personaId ?? 'brokerAssistant', body.count ?? 10)
  }

  @Post('stress/accounting')
  async stressAccounting(@Body() body: { orgId: string; iterations?: number }) {
    ensureDev()
    return this.stress.runAccountingBurst(body.orgId, body.iterations ?? 5)
  }

  @Post('stress/notifications')
  async stressNotifications(@Body() body: { orgId: string; userId: string; count?: number }) {
    ensureDev()
    return this.stress.runNotificationFlood(body.orgId, body.userId, body.count ?? 1000)
  }

  @Post('stress/leads')
  async stressLeads(@Body() body: { orgId: string; count?: number }) {
    ensureDev()
    return this.stress.runLeadFlood(body.orgId, body.count ?? 200)
  }

  @Post('chaos/sql')
  enableSqlChaos(@Body() body: { min?: number; max?: number; failureProbability?: number }) {
    ensureDev()
    this.chaos.enableSqlDelay(body?.min ?? 25, body?.max ?? 150)
    if (body?.failureProbability !== undefined) {
      this.chaos.setFailureProbability(body.failureProbability)
    }
    return { ok: true }
  }

  @Post('chaos/latency')
  enableLatency(@Body() body: { min?: number; max?: number }) {
    ensureDev()
    this.chaos.enableLatency(body?.min ?? 200, body?.max ?? 1200)
    return { ok: true }
  }

  @Post('chaos/reset')
  resetChaos() {
    ensureDev()
    this.chaos.resetAll()
    return { ok: true }
  }
}
