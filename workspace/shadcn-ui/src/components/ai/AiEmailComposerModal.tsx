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
import {
  type AiEmailDraftRequest,
  type MarketingCampaign,
  type MarketingChannel,
  generateAiEmailDraft,
  sendAiEmailPreview
} from '@/lib/api/hatch';
import type { PersonaId } from '@/lib/ai/aiPersonas';
import { cn, resolveUserIdentity } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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

type AudienceSegmentKey =
  | 'hot_leads'
  | 'past_clients'
  | 'sphere'
  | 'open_house'
  | 'buyers_under_contract';

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
    key: 'hot_leads',
    label: 'Hot leads this week',
    description: 'Active buyers/sellers with a stage change in the last 7 days.',
    defaultAudience: 'your hot pipeline this week',
    estimatedRecipients: 35
  },
  {
    key: 'past_clients',
    label: 'Past clients',
    description: 'Closed deals in the last 24 months for reviews & testimonials.',
    defaultAudience: 'past clients from the last 24 months',
    estimatedRecipients: 18
  },
  {
    key: 'sphere',
    label: 'Sphere in Naples',
    description: 'All tagged sphere contacts within Collier County.',
    defaultAudience: 'your Naples sphere',
    estimatedRecipients: 120
  },
  {
    key: 'open_house',
    label: 'Open house radius',
    description: 'Contacts within 5 miles of your upcoming open house.',
    defaultAudience: 'neighbors near the listing',
    estimatedRecipients: 54
  },
  {
    key: 'buyers_under_contract',
    label: 'Buyers under contract',
    description: 'Active buyers under contract for milestone reminders.',
    defaultAudience: 'buyers currently under contract',
    estimatedRecipients: 6
  }
];

const CHANNEL_OPTIONS: { value: MarketingChannel; label: string; description: string }[] = [
  {
    value: 'EMAIL',
    label: 'Email blast',
    description: 'Great for nurtures, announcements, and longer-form updates.'
  },
  {
    value: 'SMS',
    label: 'Text follow-up',
    description: 'Short nudges for tight segments or event RSVPs.'
  }
];

export function AiEmailComposerModal({ open, onClose, personaId, onCampaignCreated }: AiEmailComposerModalProps) {
  const persona = PERSONA_PRESETS[personaId] ?? PERSONA_PRESETS.lead_nurse;
  const { toast } = useToast();
  const { session, user } = useAuth();
  const [segmentKey, setSegmentKey] = useState<AudienceSegmentKey>('hot_leads');
  const [channel, setChannel] = useState<MarketingChannel>('EMAIL');
  const [customAudience, setCustomAudience] = useState('');
  const [recipientEstimate, setRecipientEstimate] = useState(AUDIENCE_SEGMENTS[0].estimatedRecipients);
  const [callToAction, setCallToAction] = useState(persona.defaultCta);
  const [brief, setBrief] = useState(persona.sampleBrief);
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const senderName = useMemo(() => {
    const { displayName } = resolveUserIdentity(session?.profile ?? {}, user?.email ?? undefined, 'Your Account');
    return displayName || undefined;
  }, [session?.profile, user?.email]);

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
    setSegmentKey('hot_leads');
    setChannel('EMAIL');
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
      const request: AiEmailDraftRequest = {
        personaId,
        audience: audienceLabel,
        callToAction,
        subject,
        brief
      };
      const response = await generateAiEmailDraft(request);
      setDraft(personalizeEmail(response.body, senderName));
      setSubject(personalizeEmail(response.subject, senderName));
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
    if (!draft.trim()) {
      toast({
        variant: 'destructive',
        title: 'Write a draft first',
        description: 'Generate or paste a message before sending.'
      });
      return;
    }
    setSending(true);
    try {
      const personalizedSubject = personalizeEmail(subject || persona.defaultCta, senderName);
      const campaign = await sendAiEmailPreview({
        personaId,
        subject: personalizedSubject,
        body: personalizeEmail(draft, senderName),
        name: (personalizedSubject || `${persona.name} outreach`).trim(),
        audienceKey: selectedSegment?.key,
        audienceLabel,
        callToAction,
        recipientsCount: recipientEstimate,
        channel,
        status: 'scheduled'
      });
      toast({
        title: 'Preview scheduled',
        description: `Campaign ${campaign.id} is queued for review.`
      });
      onCampaignCreated?.(campaign);
      onClose();
    } catch (error) {
      console.error('Failed to send AI email preview', error);
      toast({
        variant: 'destructive',
        title: 'Could not send preview',
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
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channel</p>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={channel === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChannel(option.value)}
                >
                  <div className="flex flex-col text-left">
                    <span>{option.label}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{option.description}</span>
                  </div>
                </Button>
              ))}
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

function personalizeEmail(body: string, senderName?: string) {
  let result = body ?? '';
  if (senderName) {
    result = result.replace(/\[your name\]/gi, senderName);
  }
  return result
    .replace(/\[your contact information\]/gi, '')
    .replace(/\[your position\]/gi, '')
    .trim();
}
