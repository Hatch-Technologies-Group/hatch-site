import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useMissionControlFilters } from '@/hooks/useMissionControlFilters'
import { useGlobalSearch } from './hooks/useGlobalSearch'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const { activeOrgId } = useAuth()
  const scope = useMissionControlFilters()
  const { query, setQuery, results, loading, error, selectedIndex, moveSelection, activeResult, aiEnabled, setAiEnabled, aiSummary } = useGlobalSearch(activeOrgId, scope)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!open) return
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveSelection(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveSelection(-1)
      } else if (event.key === 'Enter') {
        if (activeResult?.route) {
          navigate(activeResult.route)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, moveSelection, activeResult, navigate, onClose])

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open, setQuery])

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-muted-foreground px-4 py-6">Searching…</p>
    }
    if (error) {
      return (
        <p className="text-sm text-red-500 px-4 py-6">
          {error}
        </p>
      )
    }
    if (!results.length && query) {
      return <p className="text-sm text-muted-foreground px-4 py-6">No results for “{query}”.</p>
    }
    return (
      <ul className="max-h-[60vh] overflow-y-auto">
        {results.map((result, idx) => (
          <li
            key={`${result.type}:${result.id}`}
            className={`px-4 py-3 cursor-pointer ${idx === selectedIndex ? 'bg-muted' : ''}`}
            onMouseEnter={() => moveSelection(idx - selectedIndex)}
            onClick={() => {
              if (result.route) {
                navigate(result.route)
                onClose()
              }
            }}
          >
            <p className="text-sm font-medium">{result.title}</p>
            <p className="text-xs text-muted-foreground">{result.subtitle}</p>
          </li>
        ))}
      </ul>
    )
  }, [loading, error, results, query, selectedIndex, moveSelection, navigate, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10">
      <div className="w-full max-w-2xl rounded-lg bg-background shadow-xl">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Input
            autoFocus
            placeholder="Search anything…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-between items-center px-4 py-2 border-b text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Switch id="search-ai" checked={aiEnabled} onCheckedChange={setAiEnabled} />
            <Label htmlFor="search-ai" className="cursor-pointer text-xs">
              Ask AI for summary
            </Label>
          </div>
          <span>Use ⌘K / Ctrl+K to open</span>
        </div>
        {content}
        {aiSummary && (
          <div className="border-t px-4 py-3 text-sm">
            <p className="font-medium mb-1">AI Summary</p>
            <p className="text-muted-foreground mb-2">{aiSummary.summary}</p>
            {aiSummary.recommendations?.length ? (
              <ul className="list-disc pl-5 text-muted-foreground text-xs">
                {aiSummary.recommendations.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
