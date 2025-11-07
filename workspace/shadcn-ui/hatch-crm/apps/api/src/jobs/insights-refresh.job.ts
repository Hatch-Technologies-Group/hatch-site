import { Queue } from 'bullmq';

export const queueConnection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379)
    };

export const INSIGHTS_REFRESH_QUEUE = 'insights.refresh';

export const insightsRefreshQueue = new Queue(INSIGHTS_REFRESH_QUEUE, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 10
  }
});

const sanitizeTenantId = (tenantId: string) => tenantId.replace(/[^a-zA-Z0-9_-]/g, '-');

export async function enqueueInsightsRefresh(tenantId: string, debounceMs = 30_000) {
  const safeTenantId = sanitizeTenantId(tenantId);
  const jobKey = `refresh-${safeTenantId}`;

  await insightsRefreshQueue.add(jobKey, { tenantId }, { jobId: jobKey, delay: debounceMs });
}
