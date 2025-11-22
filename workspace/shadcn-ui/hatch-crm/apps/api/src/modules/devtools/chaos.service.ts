import { Injectable, Logger } from '@nestjs/common'

import { PrismaService } from '@/modules/prisma/prisma.service'
import { ChaosConfig } from '@/config/chaos.config'

const randomInRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

@Injectable()
export class ChaosService {
  private readonly logger = new Logger(ChaosService.name)
  private sqlDelayRange: [number, number] | null = null
  private failureProbability = 0
  private httpDelayRange: [number, number] | null = null

  constructor(private readonly prisma: PrismaService) {
    this.prisma.$use(async (params, next) => {
      if (this.sqlDelayRange) {
        await this.delay(randomInRange(this.sqlDelayRange[0], this.sqlDelayRange[1]))
      }
      if (this.failureProbability && Math.random() < this.failureProbability) {
        this.logger.warn(`Chaos SQL failure injected for ${params.model}.${params.action}`)
        throw new Error('Chaos failure (SQL)')
      }
      return next(params)
    })

    if (ChaosConfig.enabled) {
      this.enableLatency(200, 600)
      this.enableSqlDelay(25, 120)
    }
  }

  async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  async applyHttpChaos() {
    if (!this.httpDelayRange) return
    const ms = randomInRange(this.httpDelayRange[0], this.httpDelayRange[1])
    await this.delay(ms)
  }

  enableSqlDelay(minMs: number, maxMs: number) {
    this.sqlDelayRange = [Math.max(0, minMs), Math.max(minMs, maxMs)]
    this.logger.log(`Chaos SQL delay enabled: ${this.sqlDelayRange.join('-')}ms`)
  }

  disableSqlDelay() {
    this.sqlDelayRange = null
    this.logger.log('Chaos SQL delay disabled')
  }

  setFailureProbability(probability: number) {
    this.failureProbability = Math.max(0, Math.min(1, probability))
    this.logger.log(`Chaos SQL failure probability set to ${this.failureProbability}`)
  }

  enableLatency(minMs: number, maxMs: number) {
    this.httpDelayRange = [Math.max(0, minMs), Math.max(minMs, maxMs)]
    this.logger.log(`Chaos HTTP latency enabled: ${this.httpDelayRange.join('-')}ms`)
  }

  disableLatency() {
    this.httpDelayRange = null
    this.logger.log('Chaos HTTP latency disabled')
  }

  resetAll() {
    this.disableLatency()
    this.disableSqlDelay()
    this.failureProbability = 0
    this.logger.log('Chaos settings reset')
  }
}
