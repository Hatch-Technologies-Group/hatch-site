import Link from 'next/link';

import { ContractInstanceDetailView } from '../components/contract-instance-detail-view';

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'org-hatch';

export const dynamic = 'force-dynamic';

type ContractInstanceDetailPageProps = {
  params: { contractInstanceId: string };
};

export default function ContractInstanceDetailPage({ params }: ContractInstanceDetailPageProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        <Link href="/dashboard/contracts" className="text-brand-600 hover:underline">
          Contracts
        </Link>{' '}
        / Contract detail
      </p>
      <ContractInstanceDetailView orgId={DEFAULT_ORG_ID} contractInstanceId={params.contractInstanceId} />
    </div>
  );
}

