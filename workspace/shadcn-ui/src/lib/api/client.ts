import axios from 'axios'

const ensurePrefix = (prefix: string) => (prefix.startsWith('/') ? prefix : `/${prefix}`)
const withApiPrefix = (base: string, prefix: string) => {
  const normalizedBase = base.replace(/\/+$/, '')
  const normalizedPrefix = ensurePrefix(prefix)
  return normalizedBase.endsWith(normalizedPrefix)
    ? normalizedBase
    : `${normalizedBase}${normalizedPrefix}`
}

const apiPrefix = ensurePrefix(import.meta.env.VITE_API_PREFIX || '/api/v1')

const baseApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000')

export const apiBaseUrl = withApiPrefix(baseApiUrl, apiPrefix).replace(/\/$/, '')

export type RequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export const buildHeaders = (options?: RequestOptions) => {
  const headers: Record<string, string> = {
    ...(options?.headers ?? {}),
  }

  const hasFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  const hasJsonPayload = options?.body !== undefined && !hasFormData

  if (hasJsonPayload && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    return response.ok
  } catch {
    return false
  }
}

export const request = async <T>(path: string, options?: RequestOptions): Promise<T> => {
  if (!apiBaseUrl) throw new Error('api_base_url_missing')

  const shouldAttemptRefresh = (requestPath: string) => {
    const normalized = requestPath.startsWith('/') ? requestPath : `/${requestPath}`
    return normalized !== '/auth/refresh' && normalized !== '/auth/logout'
  }

  const doFetch = async (attemptedRefresh: boolean): Promise<Response> => {
    const method = options?.method ?? 'GET'
    const hasFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
    const headers = buildHeaders(options)
    const body: BodyInit | undefined = hasFormData
      ? (options?.body as BodyInit | undefined)
      : typeof options?.body === 'string'
        ? options.body
        : options?.body !== undefined
          ? JSON.stringify(options.body)
          : undefined

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body,
      credentials: 'include',
    })

    if (response.status !== 401 || attemptedRefresh || !shouldAttemptRefresh(path)) {
      return response
    }

    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      return response
    }

    return doFetch(true)
  }

  const response = await doFetch(false)

  const contentType = response.headers.get('Content-Type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : undefined

  if (!response.ok) {
    const errorCode = payload?.error ?? response.statusText
    const error = new Error(typeof errorCode === 'string' ? errorCode : 'request_failed')
    ;(error as Error & { status?: number }).status = response.status
    if (payload) {
      ;(error as Error & { payload?: unknown }).payload = payload
    }
    throw error
  }

  return (payload?.data ?? payload) as T
}

// Axios client for direct API calls
export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

// NOTE: All authentication headers must come from real user sessions
// No default headers are injected to prevent unauthorized access

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers ?? {}
  // Headers must be provided by the application's auth system
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const originalRequest = error?.config

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      return Promise.reject(error)
    }

    return apiClient.request(originalRequest)
  }
)
