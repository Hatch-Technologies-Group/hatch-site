import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'

import { ChaosService } from '@/modules/devtools/chaos.service'

@Injectable()
export class ChaosInterceptor implements NestInterceptor {
  constructor(private readonly chaos: ChaosService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    await this.chaos.applyHttpChaos()
    return next.handle()
  }
}
