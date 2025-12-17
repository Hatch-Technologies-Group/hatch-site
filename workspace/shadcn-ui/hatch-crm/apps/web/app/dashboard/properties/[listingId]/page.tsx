import Link from 'next/link';

import { PropertyDetailView } from '../components/property-detail-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

type PropertyDetailPageProps = {
  params: { listingId: string };
};

export default function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        <Link href="/dashboard/properties" className="text-brand-600 hover:underline">
          Properties
        </Link>{' '}
        / Property detail
      </p>
      <PropertyDetailView orgId={DEFAULT_ORG_ID} listingId={params.listingId} />
    </div>
  );
}

