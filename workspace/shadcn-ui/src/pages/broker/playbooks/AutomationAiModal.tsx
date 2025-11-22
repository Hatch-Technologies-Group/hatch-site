import React, { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { createPlaybook } from '@/lib/api/playbooks'
import { generatePlaybookFromNaturalLanguage } from '@/lib/api/playbooks-ai'

interface AutomationAiModalProps {
  open: boolean
  onClose: () => void
  onCreated?: (playbookId: string) => void
}

export const AutomationAiModal: React.FC<AutomationAiModalProps> = ({ open, onClose, onCreated }) => {
  const { activeOrgId } = useAuth()
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!activeOrgId || !text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await generatePlaybookFromNaturalLanguage(activeOrgId, text)
      setDraft(res.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate playbook')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!activeOrgId || !draft) return
    const created = await createPlaybook(activeOrgId, draft)
    onCreated?.(created.id)
    onClose()
    setDraft(null)
    setText('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Automation with AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            rows={4}
            placeholder="Describe the automation you want (e.g., when a listing fails compliance, notify the broker and flag it)."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate with AI'}
          </Button>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {draft ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-semibold">{draft.name}</p>
              <p className="text-muted-foreground text-xs mb-2">{draft.description}</p>
              <p className="text-xs font-semibold">Triggers</p>
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(draft.triggers, null, 2)}</pre>
              <p className="text-xs font-semibold mt-2">Actions</p>
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(draft.actions, null, 2)}</pre>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={!draft}>
            Save Playbook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AutomationAiModal
