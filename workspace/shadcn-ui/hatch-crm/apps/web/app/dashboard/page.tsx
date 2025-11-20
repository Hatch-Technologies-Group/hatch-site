import { ClientInsightsHub } from './components/client-insights-hub';
import { AgentCopilotPanel } from './components/agent-copilot-panel';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? process.env.VITE_TENANT_ID ?? 'tenant-hatch';

export default async function DashboardPage() {
  return (
    <div className="space-y-4">
      <AgentCopilotPanel />
      <ClientInsightsHub tenantId={TENANT_ID} />
    </div>
  );
}
