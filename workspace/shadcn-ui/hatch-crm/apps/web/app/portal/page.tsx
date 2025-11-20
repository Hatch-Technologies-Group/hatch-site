import { PortalHomeView } from './components/portal-home-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function PortalPage() {
  return <PortalHomeView orgId={DEFAULT_ORG_ID} />;
}
