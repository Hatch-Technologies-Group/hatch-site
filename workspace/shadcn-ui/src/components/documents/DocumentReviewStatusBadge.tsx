import React from 'react'
import type { ReviewStatus } from '@/lib/api/documents-collab'

const statusTone: Record<ReviewStatus, string> = {
  NONE: 'bg-slate-100 text-slate-700',
  DRAFT: 'bg-yellow-100 text-yellow-800',
  IN_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800'
}

type Props = {
  status: ReviewStatus
}

export const DocumentReviewStatusBadge: React.FC<Props> = ({ status }) => {
  const cls = statusTone[status] ?? statusTone.NONE
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
