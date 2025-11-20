import { RentalsView } from './components/rentals-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function RentalsPage() {
  return <RentalsView orgId={DEFAULT_ORG_ID} />;
}
