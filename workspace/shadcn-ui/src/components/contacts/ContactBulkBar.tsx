import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TeamMemberRecord } from '@/lib/api/hatch'

interface ContactBulkBarProps {
  totalSelected: number
  allSelected: boolean
  partiallySelected: boolean
  onToggleAll: (checked: boolean) => void
  onClearSelection: () => void
  owners: TeamMemberRecord[]
  onBulkAssign: (ownerId: string) => void
  onBulkDelete: () => void
  deleting?: boolean
}

export function ContactBulkBar({
  totalSelected,
  allSelected,
  partiallySelected,
  onToggleAll,
  onClearSelection,
  owners,
  onBulkAssign,
  onBulkDelete,
  deleting
}: ContactBulkBarProps) {
  const ownerOptions = useMemo(() => owners ?? [], [owners])

  return (
    <div className="flex items-center justify-between rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 p-3 text-sm">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected ? true : partiallySelected ? 'indeterminate' : false}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
        />
        <span>{totalSelected} selected</span>
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Select onValueChange={onBulkAssign}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Assign to owner" />
          </SelectTrigger>
          <SelectContent>
            {ownerOptions.length === 0 && (
              <SelectItem value="__no_owners__" disabled>
                No owners available
              </SelectItem>
            )}
            {ownerOptions.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={onBulkDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Soft delete selected'}
        </Button>
      </div>
    </div>
  )
}

export default ContactBulkBar
