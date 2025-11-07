import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';

type Key = string;
type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<Key, Bucket>();

const RPS = Number(process.env.AI_AUTOCONTACT_RPS_PER_USER ?? 0.3);
const BURST = Number(process.env.AI_AUTOCONTACT_BURST_PER_USER ?? 3);

function keyFrom(context: ExecutionContext): Key {
  const req: any = context.switchToHttp().getRequest();
  const userId = req.user?.id ?? 'anon';
  const orgId = req.user?.orgId ?? 'noorg';
  return `${orgId}:${userId}:autocontact`;
}

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const key = keyFrom(context);
    const now = Date.now();
    const bucket = buckets.get(key) ?? { tokens: BURST, updatedAt: now };

    const elapsedSeconds = (now - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(BURST, bucket.tokens + elapsedSeconds * RPS);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      buckets.set(key, bucket);
      throw new HttpException('Rate limit: try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return true;
  }
}
