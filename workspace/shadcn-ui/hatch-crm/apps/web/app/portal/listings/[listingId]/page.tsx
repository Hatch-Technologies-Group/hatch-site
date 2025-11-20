import { notFound } from 'next/navigation';

import { fetchPublicListing } from '@/lib/api/org-listings';
import { ListingDetailView } from '../../components/listing-detail-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export default async function ListingDetailPage({ params }: { params: { listingId: string } }) {
  try {
    const listing = await fetchPublicListing(DEFAULT_ORG_ID, params.listingId);
    return <ListingDetailView orgId={DEFAULT_ORG_ID} listing={listing} />;
  } catch (error) {
    notFound();
  }
}
