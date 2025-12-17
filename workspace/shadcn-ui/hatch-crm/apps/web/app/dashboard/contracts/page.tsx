import { ContractsView } from './components/contracts-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function ContractsPage() {
  return <ContractsView orgId={DEFAULT_ORG_ID} />;
}
