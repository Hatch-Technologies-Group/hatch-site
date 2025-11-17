import { PERSONAS, type PersonaId } from '@/lib/ai/aiPersonas';
import { Button } from '@/components/ui/button';

type PersonaProfile = {
  id: PersonaId;
  bio: string;
  strengths: string[];
  bestFor: string[];
  tone: string;
};

const PROFILES: PersonaProfile[] = [
  {
    id: 'agent_copilot',
    bio: 'Echo acts like your chief of staff. It looks across your pipeline and tells you where to focus next.',
    strengths: [
      'Prioritizing leads based on score, recency, and stage',
      'Highlighting risks and blind spots in your pipeline',
      'Turning CRM data into a simple, daily plan'
    ],
    bestFor: ['"What should I focus on today?"', '"Who should I call first?"', '"Which deals are at risk?"'],
    tone: 'Direct, calm, and practical'
  },
  {
    id: 'lead_nurse',
    bio: 'Lumen keeps your relationships warm. It writes human, empathetic outreach so leads don\'t go cold.',
    strengths: ['Warm follow-up emails and texts', 'Nurture sequences over weeks or months', 'Tone-matching to your brand and voice'],
    bestFor: ['"Follow up with this lead who went quiet."', '"Write a thank-you text after a showing."', '"Create a 3-email nurture sequence."'],
    tone: 'Friendly, encouraging, and human'
  },
  {
    id: 'listing_concierge',
    bio: 'Haven is your listing copywriter. It turns raw property details into polished, on-brand marketing.',
    strengths: ['MLS-ready listing descriptions', 'Feature highlights and bullet points', 'Social captions for new listings'],
    bestFor: ['"Write a listing for this 3/2 pool home."', '"Make this description sound more luxury."', '"Turn this feature list into bullets."'],
    tone: 'Creative, visual, and polished'
  },
  {
    id: 'market_analyst',
    bio: 'Atlas translates market data into talking points your clients understand.',
    strengths: ['Explaining price trends in plain language', 'Framing buyer/seller expectations', 'Comparing listings with simple comps logic'],
    bestFor: ['"Is this listing overpriced?"', '"Explain what\'s happening in this ZIP."', '"Give me seller talking points for this market."'],
    tone: 'Analytical, steady, and concise'
  },
  {
    id: 'transaction_coordinator',
    bio: 'Nova is your deadline brain. It tracks dates, contingencies, and closing-table details.',
    strengths: ['Summarizing key dates and milestones', 'Keeping track of open contingencies', 'Turning a deal into a simple checklist'],
    bestFor: ['"Summarize key dates for 123 Main St."', '"What contingencies are still open?"', '"Create a checklist to get this deal closed."'],
    tone: 'Organized, precise, and calm'
  }
];

type PersonaProfilesProps = {
  onStartChat?: (personaId: PersonaId) => void;
};

export function PersonaProfiles({ onStartChat }: PersonaProfilesProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">Meet your AI team</h1>
        <p className="text-sm text-muted-foreground">
          Echo, Lumen, Haven, Atlas, and Nova each specialize in a different part of your workflow. Pick the right teammate for the job.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {PERSONAS.map((persona) => {
          const profile = PROFILES.find((item) => item.id === persona.id)!;
          return (
            <article key={persona.id} className="flex flex-col rounded-2xl border bg-background/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-xl" style={{ backgroundColor: persona.avatarBg }}>
                  {persona.avatarEmoji}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{persona.name}</span>
                  <span className="text-[11px] text-muted-foreground">{persona.tagline}</span>
                </div>
              </div>

              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{profile.bio}</p>

              <div className="mb-3 space-y-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Strengths</h3>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {profile.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-3 space-y-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ask {persona.name} for...</h3>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {profile.bestFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                <span>Typical tone: {profile.tone}</span>
                <Button size="sm" variant="outline" type="button" onClick={() => onStartChat?.(persona.id)}>
                  Start chat with {persona.name}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
