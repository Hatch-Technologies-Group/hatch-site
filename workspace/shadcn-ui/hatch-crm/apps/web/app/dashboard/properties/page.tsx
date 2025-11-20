import { PropertiesView } from './components/properties-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function PropertiesDashboardPage() {
  return <PropertiesView orgId={DEFAULT_ORG_ID} />;
}
