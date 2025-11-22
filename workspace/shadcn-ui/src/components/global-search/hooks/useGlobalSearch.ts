import { useCallback, useEffect, useMemo, useState } from 'react'

import { useDebounce } from '@/hooks/useDebounce'
import { globalSearch, globalSearchAI } from '@/lib/api/search'

export type GlobalSearchScope = { officeId?: string; teamId?: string }

export function useGlobalSearch(orgId: string | null, scope?: GlobalSearchScope) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiSummary, setAiSummary] = useState<{ summary: string; recommendations?: string[] } | null>(null)

  const debouncedQuery = useDebounce(query, 200)
  // Stabilize scope so useCallback dependencies don't thrash on object identity
  const scopeKey = useMemo(() => JSON.stringify(scope ?? {}), [scope])

  const fetchResults = useCallback(async () => {
    if (!orgId || !debouncedQuery) {
      setResults([])
      setAiSummary(null)
      return
    }
    const parsedScope = scopeKey ? (JSON.parse(scopeKey) as GlobalSearchScope) : undefined
    setLoading(true)
    setError(null)
    try {
      const data = await globalSearch(orgId, debouncedQuery, parsedScope)
      setResults(data.results || [])
      if (aiEnabled) {
        const aiData = await globalSearchAI(orgId, debouncedQuery, parsedScope)
        setAiSummary(aiData)
      } else {
        setAiSummary(null)
      }
      setSelectedIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [orgId, debouncedQuery, aiEnabled, scopeKey])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const moveSelection = useCallback(
    (delta: number) => {
      setSelectedIndex((prev) => {
        if (!results.length) return 0
        const next = (prev + delta + results.length) % results.length
        return next
      })
    },
    [results]
  )

  const activeResult = useMemo(() => results[selectedIndex], [results, selectedIndex])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    selectedIndex,
    moveSelection,
    activeResult,
    aiEnabled,
    setAiEnabled,
    aiSummary
  }
}
