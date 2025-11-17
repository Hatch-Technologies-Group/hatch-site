"use client";

import { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { PERSONAS, type PersonaId } from '@/lib/ai/aiPersonas';
import { sendCustomerEmail } from '@/lib/api/hatch';

type CopilotSendEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPersonaId: PersonaId;
  defaultSubject?: string;
  defaultBody?: string;
  defaultRecipients?: string[];
  defaultSenderName?: string;
};

const splitRecipients = (value: string) =>
  value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export function CopilotSendEmailDialog({
  open,
  onOpenChange,
  defaultPersonaId,
  defaultSubject,
  defaultBody,
  defaultRecipients,
  defaultSenderName
}: CopilotSendEmailDialogProps) {
  const { toast } = useToast();
  const [personaId, setPersonaId] = useState<PersonaId>(defaultPersonaId);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setPersonaId(defaultPersonaId);
    // Pre-personalize the subject and body so users don't see placeholders
    const preparedSubject = personalizeBody((defaultSubject ?? '').trim(), defaultSenderName);
    const preparedBody = personalizeBody((defaultBody ?? '').trim(), defaultSenderName);
    setSubject(preparedSubject);
    setBody(preparedBody);
    setTo((defaultRecipients ?? []).join(', '));
  }, [defaultBody, defaultPersonaId, defaultRecipients, defaultSubject, defaultSenderName, open]);

  const personaLabel = useMemo(() => PERSONAS.find((persona) => persona.id === personaId)?.name ?? 'Lumen', [personaId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const recipients = splitRecipients(to);
    if (!recipients.length) {
      toast({ variant: 'destructive', title: 'Recipients required', description: 'Add at least one email address.' });
      return;
    }
    if (!subject.trim()) {
      toast({ variant: 'destructive', title: 'Subject required', description: 'Add a subject before sending.' });
      return;
    }
    if (!body.trim()) {
      toast({ variant: 'destructive', title: 'Message required', description: 'Write a message before sending.' });
      return;
    }

    setSending(true);
    const preparedSubject = personalizeBody(subject.trim(), defaultSenderName);
    const preparedBody = personalizeBody(body.trim(), defaultSenderName);
    try {
      await sendCustomerEmail({
        to: recipients,
        subject: preparedSubject,
        text: preparedBody,
        personaId
      });
      toast({
        title: `Sent with ${personaLabel}`,
        description: `Queued for ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}.`
      });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send email right now.';
      toast({ variant: 'destructive', title: 'Failed to send email', description: message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Have {personaLabel} send this email</DialogTitle>
          <DialogDescription>
            We&apos;ll use your AI persona to deliver this note. Recipients must already exist in your CRM or
            have opted in.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="copilot-email-to">Recipients</Label>
            <Input
              id="copilot-email-to"
              placeholder="norman@example.com, ria@example.com"
              value={to}
              disabled={sending}
              onChange={(event) => setTo(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separate multiple addresses with commas or new lines.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="copilot-email-subject">Subject</Label>
            <Input
              id="copilot-email-subject"
              value={subject}
              disabled={sending}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="copilot-email-body">Body</Label>
            <Textarea
              id="copilot-email-body"
              rows={8}
              value={body}
              disabled={sending}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Send as</Label>
            <Select value={personaId} onValueChange={(value: PersonaId) => setPersonaId(value)} disabled={sending}>
              <SelectTrigger>
                <SelectValue placeholder="Choose persona" />
              </SelectTrigger>
              <SelectContent>
                {PERSONAS.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    {persona.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function personalizeBody(body: string, senderName?: string) {
  let result = body;
  if (senderName) {
    result = result.replace(/\[your name\]/gi, senderName);
  }
  result = result.replace(/\[your contact information\]/gi, '').replace(/\[your position\]/gi, '');
  return result.trim();
}
