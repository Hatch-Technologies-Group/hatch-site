import type { Database } from '@/types/database'
import { request } from './client'
import type { RequestOptions } from './client'

export type BrokerPropertyRow = Database['public']['Views']['vw_broker_properties']['Row']

export const fetchBrokerProperties = (options?: RequestOptions) =>
  request<BrokerPropertyRow[]>('/properties', options)

export const fetchBrokerProperty = (id: string, options?: RequestOptions) =>
  request<BrokerPropertyRow>(`/properties/${encodeURIComponent(id)}`, options)

export const updateBrokerProperty = (
  id: string,
  payload: Partial<BrokerPropertyRow>,
  options?: RequestOptions
) =>
  request<BrokerPropertyRow>(`/properties/${encodeURIComponent(id)}`, {
    ...options,
    method: 'PATCH',
    body: payload,
  })

export const publishBrokerProperty = (id: string, options?: RequestOptions) =>
  request<BrokerPropertyRow>(`/properties/${encodeURIComponent(id)}/publish`, {
    ...options,
    method: 'POST',
  })

export const unpublishBrokerProperty = (id: string, options?: RequestOptions) =>
  request<BrokerPropertyRow>(`/properties/${encodeURIComponent(id)}/unpublish`, {
    ...options,
    method: 'POST',
  })

export const closeBrokerProperty = (id: string, options?: RequestOptions) =>
  request<BrokerPropertyRow>(`/properties/${encodeURIComponent(id)}/close`, {
    ...options,
    method: 'POST',
  })

export const reopenBrokerProperty = (
  id: string,
  payload?: { status?: 'active' | 'pending' | 'withdrawn' },
  options?: RequestOptions
) =>
  request<BrokerPropertyRow>(`/properties/${encodeURIComponent(id)}/reopen`, {
    ...options,
    method: 'POST',
    body: payload ?? {},
  })

export const deleteBrokerProperty = (id: string, options?: RequestOptions) =>
  request<{ id: string }>(`/properties/${encodeURIComponent(id)}`, {
    ...options,
    method: 'DELETE',
  })

export interface PromoteDraftPayload {
  draftId?: string
  firmId: string
  agentId?: string
  source?: 'bulk_upload' | 'manual' | 'mls'
  fileName?: string
  property: Record<string, unknown>
  validationSummary?: Record<string, unknown>
  isTest?: boolean
}

export const promoteDraftProperty = (payload: PromoteDraftPayload, options?: RequestOptions) =>
  request<BrokerPropertyRow>('/properties/promote', {
    ...options,
    method: 'POST',
    body: payload,
  })
