import { Link } from 'react-router-dom';

import { MissionControlOverview } from './mission-control-overview';
import { MissionControlAgentsPanel } from './mission-control-agents-panel';
import { MissionControlCompliancePanel } from './mission-control-compliance-panel';
import { MissionControlActivityFeed } from './mission-control-activity-feed';
import { MissionControlAiAssistantPanel } from './mission-control-ai-assistant-panel';
import { MlsSyncSummaryCard } from '@/components/mls/mls-sync-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

      <div className="grid gap-6 lg:grid-cols-2">
        <MlsSyncSummaryCard orgId={orgId} />
        <Card className="rounded-2xl border border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Security &amp; Audit</CardTitle>
            <p className="text-sm text-slate-500">
              Track MLS syncs, accounting pushes, notification changes, and AI persona runs in one place.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Stay investor- and compliance-ready.</p>
              <p className="text-xs text-slate-400">Every sensitive action is logged automatically.</p>
            </div>
            <Button asChild>
              <Link to="/broker/audit-log">Open log</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Automations</CardTitle>
          <p className="text-sm text-slate-500">Build playbooks that react to leads, listings, docs, and syncs.</p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Trigger → Condition → Action.</p>
              <p className="text-xs text-slate-400">Route leads, flag compliance, notify teams automatically.</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/broker/playbooks">Manage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

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
