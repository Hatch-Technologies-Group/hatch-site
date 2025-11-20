import { MissionControlView } from './components/mission-control-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function MissionControlPage() {
  return <MissionControlView orgId={DEFAULT_ORG_ID} />;
}
