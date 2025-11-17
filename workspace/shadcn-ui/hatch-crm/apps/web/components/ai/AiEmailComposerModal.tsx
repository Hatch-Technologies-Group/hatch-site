'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { requestAiEmailDraft, type AudienceSegmentKey } from '@/lib/api/ai';
import { sendEmail } from '@/lib/api/email';
import type { MarketingCampaign, PersonaId } from '@/lib/marketing/types';
import { cn } from '@/lib/utils';

type AiEmailComposerModalProps = {
  open: boolean;
  onClose: () => void;
  personaId: PersonaId;
  onCampaignCreated?: (campaign: MarketingCampaign) => void;
};

type PersonaPreset = {
  id: PersonaId;
  name: string;
  nickname: string;
  tagline: string;
  defaultAudience: string;
  defaultCta: string;
  sampleBrief: string;
};

type AudienceSegment = {
  key: AudienceSegmentKey;
  label: string;
  description: string;
  defaultAudience: string;
  estimatedRecipients: number;
};

const PERSONA_PRESETS: Record<PersonaId, PersonaPreset> = {
  agent_copilot: {
    id: 'agent_copilot',
    name: 'Echo',
    nickname: 'Echo',
    tagline: 'Daily briefing & call prioritization',
    defaultAudience: 'your top 25 leads this week',
    defaultCta: 'Book a strategy session',
    sampleBrief: 'Summarize why we should connect this week and highlight how we can help with planning.'
  },
  lead_nurse: {
    id: 'lead_nurse',
    name: 'Lumen',
    nickname: 'Lumen',
    tagline: 'Warm nurture & follow-ups',
    defaultAudience: 'leads who toured but went quiet',
    defaultCta: 'Schedule a quick 10-minute check-in',
    sampleBrief: 'Invite them back into the process, acknowledge any pause, and make it feel easy to reply.'
  },
  listing_concierge: {
    id: 'listing_concierge',
    name: 'Haven',
    nickname: 'Haven',
    tagline: 'Listing copy & launch kits',
    defaultAudience: 'your sphere in Naples',
    defaultCta: 'Come tour 456 Shoreline Ct this weekend',
    sampleBrief: 'Showcase the value props of the property and include a friendly invite to our open house.'
  },
  market_analyst: {
    id: 'market_analyst',
    name: 'Atlas',
    nickname: 'Atlas',
    tagline: 'Market analysis & pricing',
    defaultAudience: 'active sellers on the fence',
    defaultCta: 'Review the latest pricing adjustments',
    sampleBrief: 'Explain the local data in approachable terms and give two concrete talking points.'
  },
  transaction_coordinator: {
    id: 'transaction_coordinator',
    name: 'Nova',
    nickname: 'Nova',
    tagline: 'Timeline & closing prep',
    defaultAudience: 'buyers under contract',
    defaultCta: 'Confirm contingency deadlines',
    sampleBrief: 'Remind them of key milestones and what they should prepare for next week.'
  }
};

const AUDIENCE_SEGMENTS: AudienceSegment[] = [
  {
    key: 'all_hot_leads',
    label: 'All hot leads',
    description: 'Leads in a hot/active stage with recent activity.',
    defaultAudience: 'your hottest pipeline this week',
    estimatedRecipients: 35
  },
  {
    key: 'past_clients',
    label: 'Past clients',
    description: 'Closed deals in the last 24 months.',
    defaultAudience: 'past clients from the last 24 months',
    estimatedRecipients: 18
  },
  {
    key: 'open_house_invites',
    label: 'Open house invites',
    description: 'Sphere and leads near your next open house.',
    defaultAudience: 'neighbors near the listing',
    estimatedRecipients: 54
  },
  {
    key: 'all_leads',
    label: 'All leads',
    description: 'Entire CRM (use carefully for broad announcements).',
    defaultAudience: 'entire CRM',
    estimatedRecipients: 120
  }
];

const containsHtml = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);

const plainTextToHtml = (value: string): string =>
  value
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => `<p>${section}</p>`)
    .join('\n');

const ensureHtmlBody = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return containsHtml(trimmed) ? trimmed : plainTextToHtml(trimmed);
};

export function AiEmailComposerModal({ open, onClose, personaId, onCampaignCreated }: AiEmailComposerModalProps) {
  const persona = PERSONA_PRESETS[personaId] ?? PERSONA_PRESETS.lead_nurse;
  const { toast } = useToast();
  const [segmentKey, setSegmentKey] = useState<AudienceSegmentKey>('all_hot_leads');
  const [customAudience, setCustomAudience] = useState('');
  const [recipientEstimate, setRecipientEstimate] = useState(AUDIENCE_SEGMENTS[0].estimatedRecipients);
  const [callToAction, setCallToAction] = useState(persona.defaultCta);
  const [brief, setBrief] = useState(persona.sampleBrief);
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedSegment = useMemo(
    () => AUDIENCE_SEGMENTS.find((segment) => segment.key === segmentKey) ?? AUDIENCE_SEGMENTS[0],
    [segmentKey]
  );
  const audienceLabel = customAudience.trim() || selectedSegment?.label || persona.defaultAudience;

  useEffect(() => {
    if (!open) {
      return;
    }
    const preset = PERSONA_PRESETS[personaId] ?? PERSONA_PRESETS.lead_nurse;
    setSegmentKey('all_hot_leads');
    setCustomAudience('');
    setRecipientEstimate(AUDIENCE_SEGMENTS[0].estimatedRecipients);
    setCallToAction(preset.defaultCta);
    setBrief(preset.sampleBrief);
    setSubject('');
    setDraft('');
  }, [open, personaId]);

  useEffect(() => {
    setRecipientEstimate(selectedSegment?.estimatedRecipients ?? 0);
  }, [selectedSegment]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const promptParts = [
        audienceLabel ? `Audience: ${audienceLabel}` : null,
        callToAction ? `Call to action: ${callToAction}` : null,
        brief ? `Brief: ${brief}` : null
      ]
        .filter(Boolean)
        .join('\n');

      const response = await requestAiEmailDraft({
        personaId,
        contextType: 'segment',
        segmentKey,
        prompt: promptParts || undefined
      });
      setDraft(response.html);
      setSubject(response.subject);
      toast({
        title: `${persona.name} drafted a note`,
        description: 'Give it a quick edit, then send a preview to yourself or your list.'
      });
    } catch (error) {
      console.error('Failed to generate AI email', error);
      toast({
        variant: 'destructive',
        title: 'Composer unavailable',
        description:
          error instanceof Error ? error.message : 'We could not reach the AI composer. Try again in a moment.'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSendPreview = async () => {
    const htmlBody = ensureHtmlBody(draft);
    if (!htmlBody) {
      toast({
        variant: 'destructive',
        title: 'Write a draft first',
        description: 'Generate or paste a message before sending.'
      });
      return;
    }
    setSending(true);
    try {
      const result = await sendEmail({
        personaId,
        subject: subject?.trim() || persona.defaultCta,
        html: htmlBody,
        segmentKey
      });
      toast({
        title: 'Email scheduled',
        description: `${persona.name} queued this campaign for delivery.`
      });
      if (result.campaign) {
        onCampaignCreated?.(result.campaign);
      }
      onClose();
    } catch (error) {
      console.error('Failed to send AI email preview', error);
      toast({
        variant: 'destructive',
        title: 'Could not send email',
        description: error instanceof Error ? error.message : 'Please try again after refreshing the page.'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <SheetContent side="right" className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Compose with {persona.name}</SheetTitle>
          <SheetDescription>
            {persona.tagline}. Describe the audience and intent, let the AI draft it, then edit before scheduling.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/60 p-3">
            <Badge className="text-[11px]" variant="secondary">
              {persona.nickname}
            </Badge>
            <div>
              <p className="text-sm font-medium text-foreground">Persona tone: {persona.tagline}</p>
              <p className="text-xs text-muted-foreground">Tailor the brief—{persona.name} adapts instantly.</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audience segment</p>
              <span className="text-xs text-muted-foreground">Pick a target list</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {AUDIENCE_SEGMENTS.map((segment) => {
                const active = segment.key === selectedSegment?.key;
                return (
                  <button
                    type="button"
                    key={segment.key}
                    onClick={() => {
                      setSegmentKey(segment.key);
                      setCustomAudience('');
                    }}
                    className={cn(
                      'rounded-xl border p-3 text-left text-xs transition hover:border-foreground/50',
                      active ? 'border-foreground bg-foreground/5' : 'border-border bg-background'
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{segment.label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{segment.description}</p>
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                      Est. recipients {segment.estimatedRecipients.toLocaleString()}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Audience override
              <Input
                className="mt-1 text-sm"
                placeholder={selectedSegment?.defaultAudience ?? persona.defaultAudience}
                value={customAudience}
                onChange={(event) => setCustomAudience(event.target.value)}
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Call to action
              <Input
                className="mt-1 text-sm"
                placeholder="What do you want them to do?"
                value={callToAction}
                onChange={(event) => setCallToAction(event.target.value)}
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subject
              <Input
                className="mt-1 text-sm"
                placeholder="Add a compelling subject line"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Brief for {persona.name}
              <Textarea
                className="mt-1 text-sm"
                rows={5}
                placeholder="Add context, bullet points, or outcomes."
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
              />
            </label>
          </div>

          <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Prompting tips
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Reference the property, lead source, or past interactions.</li>
              <li>Share the tone or persona you want to emulate.</li>
              <li>Describe what “success” looks like (reply, RSVP, showing, etc.).</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Draft</p>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                )}
                Generate with AI
              </Button>
            </div>
            <Textarea
              className="text-sm"
              rows={10}
              placeholder="Your AI draft will appear here."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>Recipients</span>
            <Input
              type="number"
              min={0}
              className="h-8 w-20"
              value={recipientEstimate}
              onChange={(event) => {
                const value = Number(event.target.value);
                setRecipientEstimate(Number.isFinite(value) && value >= 0 ? value : 0);
              }}
            />
          </div>
          <Button type="button" variant="ghost" onClick={onClose} disabled={generating || sending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSendPreview} disabled={sending || !draft.trim()}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send preview
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
