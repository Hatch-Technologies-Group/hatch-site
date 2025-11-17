import { Queue } from 'bullmq';

const queuesDisabled = process.env.DISABLE_BULLMQ === 'true';

export const queueConnection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379)
    };

export const INSIGHTS_REFRESH_QUEUE = 'insights.refresh';

const createQueue = () => {
  if (queuesDisabled) {
    return {
      add: async () => undefined,
      getJob: async () => null
    } as unknown as Queue;
  }

  return new Queue(INSIGHTS_REFRESH_QUEUE, {
    connection: queueConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 10
    }
  });
};

export const insightsRefreshQueue = createQueue();

const sanitizeTenantId = (tenantId: string) => tenantId.replace(/[^a-zA-Z0-9_-]/g, '-');

export async function enqueueInsightsRefresh(tenantId: string, debounceMs = 30_000) {
  const safeTenantId = sanitizeTenantId(tenantId);
  const jobKey = `refresh-${safeTenantId}`;

  await insightsRefreshQueue.add(jobKey, { tenantId }, { jobId: jobKey, delay: debounceMs });
}
