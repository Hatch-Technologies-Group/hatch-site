import { DashboardLeadsView } from './DashboardLeadsView';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function LeadsDashboardPage() {
  return <DashboardLeadsView orgId={DEFAULT_ORG_ID} />;
}
