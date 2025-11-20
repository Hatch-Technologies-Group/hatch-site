import { OfferIntentsView } from './components/offer-intents-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

export default function OfferIntentsPage() {
  return <OfferIntentsView orgId={DEFAULT_ORG_ID} />;
}
