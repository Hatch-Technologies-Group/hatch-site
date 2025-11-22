import axios from 'axios'
import { supabase } from '../supabase'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const fallbackSupabaseUrl = 'https://rdakjayhdvewbpguyuiv.supabase.co'
const fallbackAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYWtqYXloZHZld2JwZ3V5dWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTAxODAsImV4cCI6MjA3NDU4NjE4MH0.Fhy_UCtPfNcIvRYTt6BdSQLos5snjW56l6HPm97HU28'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

export type RequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export const buildHeaders = async (options?: RequestOptions) => {
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    ...(options?.headers ?? {}),
  }

  const hasFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  const hasJsonPayload = options?.body !== undefined && !hasFormData

  if (hasJsonPayload && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token

  if (token) {
    headers.Authorization = `Bearer ${token}`
  } else if (supabaseAnonKey) {
    headers.Authorization = `Bearer ${supabaseAnonKey}`
  }

  return headers
}

export async function reindexEntity(entityType: 'client' | 'lead', entityId: string) {
  const res = await apiClient.post(
    `/index/entity`,
    { entityType, entityId },
    { headers: await buildHeaders({ body: { entityType, entityId } }) }
  )
  return res.data as { ok: boolean; queued: { entityType: string; entityId: string } }
}
