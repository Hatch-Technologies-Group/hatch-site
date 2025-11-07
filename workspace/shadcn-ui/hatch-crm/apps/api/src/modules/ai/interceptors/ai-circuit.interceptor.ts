import { CallHandler, ExecutionContext, Injectable, NestInterceptor, ServiceUnavailableException } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';

let consecutiveFails = 0;
let state: 'closed' | 'open' | 'half' = 'closed';
let openedAt = 0;

const FAILS_TO_OPEN = Number(process.env.AI_CIRCUIT_FAILS_TO_OPEN ?? 5);
const RESET_MS = Number(process.env.AI_CIRCUIT_RESET_MS ?? 60000);

const metrics = {
  total: 0,
  ok: 0,
  fail: 0,
  latencies: [] as number[]
};

const now = () => Date.now();

@Injectable()
export class AiCircuitInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    if (state === 'open') {
      if (now() - openedAt > RESET_MS) {
        state = 'half';
      } else {
        throw new ServiceUnavailableException('AI service temporarily unavailable');
      }
    }

    metrics.total += 1;
    const started = now();

    return next.handle().pipe(
      tap(() => {
        const duration = now() - started;
        metrics.ok += 1;
        consecutiveFails = 0;
        if (state === 'half') {
          state = 'closed';
        }
        recordLatency(duration);
      }),
      catchError((error) => {
        const duration = now() - started;
        metrics.fail += 1;
        consecutiveFails += 1;
        recordLatency(duration);

        if (consecutiveFails >= FAILS_TO_OPEN && state !== 'open') {
          state = 'open';
          openedAt = now();
        }

        return throwError(() => error);
      })
    );
  }
}

function recordLatency(value: number) {
  metrics.latencies.push(value);
  if (metrics.latencies.length > 200) {
    metrics.latencies.shift();
  }
}

export function getAiMetrics() {
  const samples = metrics.latencies.length || 1;
  const avg = metrics.latencies.reduce((sum, val) => sum + val, 0) / samples;
  const sorted = [...metrics.latencies].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(0.95 * (sorted.length - 1))] ?? avg;

  return {
    state,
    consecutiveFails,
    total: metrics.total,
    ok: metrics.ok,
    fail: metrics.fail,
    avgMs: Math.round(avg || 0),
    p95Ms: Math.round(p95 || 0)
  };
}
