import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, of } from 'rxjs'

import { DemoConfig } from '@/config/demo.config'

@Injectable()
export class DemoModeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!DemoConfig.isDemoMode || !DemoConfig.demoOrgId) {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest()
    const method = (request?.method ?? 'GET').toUpperCase()
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

    if (!isMutating) {
      return next.handle()
    }

    const orgId = this.resolveOrgId(request)
    if (orgId && orgId === DemoConfig.demoOrgId) {
      return of({
        demoMode: true,
        message: 'Demo mode: this change is not persisted.'
      })
    }

    return next.handle()
  }

  private resolveOrgId(request: any) {
    return (
      request?.params?.orgId ||
      request?.body?.organizationId ||
      request?.query?.orgId ||
      request?.headers?.['x-org-id'] ||
      null
    )
  }
}
