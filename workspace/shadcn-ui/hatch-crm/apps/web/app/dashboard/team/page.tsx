import { TeamView } from './components/team-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function TeamDashboardPage() {
  return <TeamView orgId={DEFAULT_ORG_ID} />;
}
