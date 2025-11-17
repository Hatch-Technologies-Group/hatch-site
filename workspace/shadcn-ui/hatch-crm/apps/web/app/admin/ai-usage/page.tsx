import AiUsageDashboard from '@/components/admin/ai-usage/AiUsageDashboard';
import { AiEmployeesDisabledError, getAiEmployeeUsageStats } from '@/lib/api/ai-employees';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: {
    from?: string;
    to?: string;
  };
}

export default async function AdminAiUsagePage({ searchParams }: PageProps) {
  const from = searchParams?.from ?? '';
  const to = searchParams?.to ?? '';
  let disabledMessage: string | null = null;
  let stats: Awaited<ReturnType<typeof getAiEmployeeUsageStats>> = [];

  try {
    stats = await getAiEmployeeUsageStats({
      from: from || undefined,
      to: to || undefined
    });
  } catch (error) {
    if (error instanceof AiEmployeesDisabledError) {
      disabledMessage = error.message;
    } else {
      throw error;
    }
  }

  return (
    <AiUsageDashboard
      initialStats={stats}
      initialFrom={from}
      initialTo={to}
      disabledMessage={disabledMessage ?? undefined}
    />
  );
}
