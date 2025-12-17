import Link from 'next/link';

import { ContactDetailView } from './components/contact-detail-view';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? process.env.VITE_TENANT_ID ?? 'tenant-hatch';

type ContactDetailPageProps = {
  params: { id: string };
};

export default function ContactDetailPage({ params }: ContactDetailPageProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        <Link href="/contacts" className="text-brand-600 hover:underline">
          Contacts
        </Link>{' '}
        / Contact detail
      </p>
      <ContactDetailView tenantId={TENANT_ID} contactId={params.id} />
    </div>
  );
}

