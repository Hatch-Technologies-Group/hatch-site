import { ComplianceView } from './components/compliance-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function ComplianceDashboardPage() {
  return <ComplianceView orgId={DEFAULT_ORG_ID} />;
}
