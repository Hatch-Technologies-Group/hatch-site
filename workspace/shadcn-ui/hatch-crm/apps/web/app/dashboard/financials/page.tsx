import { FinancialsView } from './components/financials-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function FinancialsPage() {
  return <FinancialsView orgId={DEFAULT_ORG_ID} />;
}
