import { MissionControlOverview } from './mission-control-overview';
import { MissionControlAgentsPanel } from './mission-control-agents-panel';
import { MissionControlCompliancePanel } from './mission-control-compliance-panel';
import { MissionControlActivityFeed } from './mission-control-activity-feed';
import { MissionControlAiAssistantPanel } from './mission-control-ai-assistant-panel';

type MissionControlViewProps = {
  orgId: string;
};

export function MissionControlView({ orgId }: MissionControlViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Mission Control</p>
        <h1 className="text-3xl font-semibold text-slate-900">Virtual Brokerage Command Center</h1>
        <p className="text-sm text-slate-500">
          Monitor compliance, track agent progress, and collaborate with AI to keep your brokerage on track.
        </p>
      </div>

      <MissionControlOverview orgId={orgId} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MissionControlAgentsPanel orgId={orgId} />
        </div>
        <MissionControlCompliancePanel orgId={orgId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MissionControlActivityFeed orgId={orgId} />
        </div>
        <MissionControlAiAssistantPanel orgId={orgId} />
      </div>
    </div>
  );
}
