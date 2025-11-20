import { TransactionsView } from './components/transactions-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function TransactionsDashboardPage() {
  return <TransactionsView orgId={DEFAULT_ORG_ID} />;
}
