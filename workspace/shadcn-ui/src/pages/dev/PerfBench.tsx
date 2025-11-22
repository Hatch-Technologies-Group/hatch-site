import { useMemo, useState, useCallback } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'

const generateRecords = (type: string, count: number) => {
  return Array.from({ length: count }).map((_, index) => ({
    id: `${type}-${index}`,
    title: `${type} Item ${index}`,
    price: (300000 + index * 50).toLocaleString(),
    agent: `Agent ${index % 50}`,
    status: index % 2 === 0 ? 'Active' : 'Pending'
  }))
}

const rowHeight = 48

export default function PerfBenchPage() {
  const [records, setRecords] = useState(() => generateRecords('listing', 100))
  const [duration, setDuration] = useState<number | null>(null)
  const [virtualized, setVirtualized] = useState(true)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 25 })
  const [count, setCount] = useState(5000)
  const [mode, setMode] = useState<'listings' | 'leads' | 'transactions'>('listings')

  const visibleRecords = useMemo(() => {
    if (!virtualized) return records
    return records.slice(visibleRange.start, visibleRange.end)
  }, [records, visibleRange, virtualized])

  const totalHeight = virtualized ? records.length * rowHeight : undefined
  const offset = virtualized ? visibleRange.start * rowHeight : 0

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!virtualized) return
    const top = event.currentTarget.scrollTop
    const start = Math.floor(top / rowHeight)
    setVisibleRange({ start, end: Math.min(records.length, start + 30) })
  }, [virtualized, records.length])

  const runBench = () => {
    const start = performance.now()
    const nextRecords = generateRecords(mode.slice(0, -1), count)
    setRecords(nextRecords)
    requestAnimationFrame(() => {
      setDuration(performance.now() - start)
      setVisibleRange({ start: 0, end: virtualized ? 30 : nextRecords.length })
    })
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Frontend Performance Bench</CardTitle>
            <p className="text-sm text-muted-foreground">Generate heavy datasets and measure render impact.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase">Virtualized</label>
              <Switch checked={virtualized} onCheckedChange={setVirtualized} />
            </div>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="listings">Listings</option>
              <option value="leads">Leads</option>
              <option value="transactions">Transactions</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase">Rows</label>
              <Input
                type="number"
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="w-24"
              />
            </div>
            <Button onClick={runBench}>Render Dataset</Button>
          </div>
        </CardHeader>
        <CardContent>
          {duration !== null && (
            <p className="text-sm text-muted-foreground">Last render: {duration.toFixed(2)} ms for {records.length} rows.</p>
          )}
          <div
            className="mt-4 h-[480px] overflow-auto rounded border"
            onScroll={handleScroll}
          >
            {virtualized ? (
              <div style={{ height: totalHeight }}>
                <div style={{ transform: `translateY(${offset}px)` }}>
                  {visibleRecords.map((record) => (
                    <PerfRow key={record.id} {...record} />
                  ))}
                </div>
              </div>
            ) : (
              visibleRecords.map((record) => <PerfRow key={record.id} {...record} />)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PerfRow({ title, price, agent, status }: { title: string; price: string; agent: string; status: string }) {
  return (
    <div className="flex items-center justify-between border-b px-4" style={{ height: rowHeight }}>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{agent}</p>
      </div>
      <div className="text-sm text-slate-500">${price}</div>
      <span className="text-xs uppercase text-slate-500">{status}</span>
    </div>
  )
}
