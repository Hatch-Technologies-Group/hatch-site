import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

import { runWithRequestContext } from '@/shared/request-context';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request: any = context.switchToHttp().getRequest();
    const reqId =
      request?.id ??
      request?.reqId ??
      request?.headers?.['x-request-id'] ??
      request?.headers?.['X-Request-Id'];
    const method = typeof request?.method === 'string' ? request.method : undefined;
    const url = typeof request?.url === 'string' ? request.url : undefined;
    const route =
      typeof request?.routeOptions?.url === 'string'
        ? request.routeOptions.url
        : typeof request?.routerPath === 'string'
          ? request.routerPath
          : undefined;

    return new Observable((subscriber) => {
      runWithRequestContext({ reqId, method, url, route }, () => next.handle().subscribe(subscriber));
    });
  }
}
