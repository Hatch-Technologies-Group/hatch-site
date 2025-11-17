'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  AiEmployeeInstance,
  AiEmployeeTemplate,
  AiEmployeeUsageStats,
  AvatarShape
} from '@/lib/api/ai-employees';
import { updateAiEmployeeInstance, updateAiEmployeeTemplate } from '@/lib/api/ai-employees';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

type Props = {
  initialTemplates: AiEmployeeTemplate[];
  initialInstances: AiEmployeeInstance[];
  usageStats?: AiEmployeeUsageStats[];
};

type FormState = {
  displayName: string;
  description: string;
  personaColor: string;
  tone: string;
  systemPrompt: string;
  avatarShape: AvatarShape;
  avatarIcon: string;
  avatarInitial: string;
};

const DEFAULT_COLOR = '#475569';
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const AVATAR_SHAPE_OPTIONS: { value: AvatarShape; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'rounded-square', label: 'Rounded square' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'pill', label: 'Pill' }
];
const KNOWN_TOOL_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'lead_add_note', label: 'Lead · Add note', description: 'Log quick context on a lead record.' },
  { value: 'lead_create_follow_up_task', label: 'Lead · Follow-up task', description: 'Schedule a lead follow-up reminder.' },
  { value: 'lead_update_stage', label: 'Lead · Update stage', description: 'Move the lead to a new pipeline stage.' },
  { value: 'get_lead_context', label: 'Lead · Context fetch', description: 'Summarize lead profile and touchpoints.' },
  { value: 'send_email', label: 'Send email', description: 'Draft or send templated outreach emails.' },
  { value: 'send_sms', label: 'Send SMS', description: 'Deliver short text follow-ups.' },
  { value: 'schedule_call', label: 'Schedule call', description: 'Log a scheduled call task for an agent.' },
  { value: 'listing_get_details', label: 'Listing · Details', description: 'Fetch listing summary + metrics.' },
  { value: 'listing_generate_copy', label: 'Listing · Copy', description: 'Draft MLS-ready descriptions.' },
  { value: 'listing_generate_marketing_kit', label: 'Listing · Marketing kit', description: 'Produce social/email campaign kit.' },
  { value: 'create_social_post_draft', label: 'Listing · Social draft', description: 'Write short social media captions.' },
  { value: 'add_listing_note', label: 'Listing · Note', description: 'Attach notes to listing timelines.' },
  { value: 'market_get_comps', label: 'Market · Comps', description: 'Pull recent comparable sales.' },
  { value: 'market_get_stats', label: 'Market · Stats', description: 'Summarize DOM, prices, and volume.' },
  { value: 'generate_market_report', label: 'Market · Report', description: 'Assemble comps + stats snapshot.' },
  { value: 'transaction_get_timeline', label: 'Transaction · Timeline', description: 'Surface escrow milestones.' },
  { value: 'transaction_get_missing_items', label: 'Transaction · Missing items', description: 'Highlight overdue docs/tasks.' },
  { value: 'transaction_add_note', label: 'Transaction · Note', description: 'Log compliance notes to a deal.' },
  { value: 'get_daily_summary', label: 'Daily summary', description: 'Provide tenant-level daily metrics.' },
  { value: 'get_hot_leads', label: 'Hot leads', description: 'List high-priority leads.' },
  { value: 'get_overdue_tasks', label: 'Overdue tasks', description: 'List tasks past due dates.' }
];
const KNOWN_TOOL_KEYS = KNOWN_TOOL_OPTIONS.map((option) => option.value);

const resolveStringSetting = (settings: Record<string, unknown>, key: string, fallback = ''): string => {
  const value = settings?.[key];
  return typeof value === 'string' ? value : fallback;
};

const resolveColorSetting = (settings: Record<string, unknown>): string => {
  const value = settings?.personaColor;
  if (typeof value === 'string' && HEX_COLOR.test(value)) {
    return value;
  }
  return DEFAULT_COLOR;
};

const isAvatarShape = (value: unknown): value is AvatarShape => {
  return typeof value === 'string' && AVATAR_SHAPE_OPTIONS.some((option) => option.value === value);
};

const resolveAvatarShape = (settings: Record<string, unknown>): AvatarShape => {
  const value = settings?.avatarShape;
  return isAvatarShape(value) ? value : 'circle';
};

const resolveAvatarInitial = (
  settings: Record<string, unknown>,
  displayName: string
): string => {
  const value = settings?.avatarInitial;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().slice(0, 2).toUpperCase();
  }
  if (displayName?.trim()?.length) {
    return displayName
      .trim()
      .slice(0, 2)
      .toUpperCase();
  }
  return 'AI';
};

const resolveAvatarIcon = (settings: Record<string, unknown>): string => {
  const value = settings?.avatarIcon;
  return typeof value === 'string' ? value : '';
};

export function PersonaAdminPanel({ initialTemplates, initialInstances, usageStats }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [instances, setInstances] = useState(initialInstances);
  const [selectedId, setSelectedId] = useState<string | null>(initialTemplates[0]?.id ?? null);
  const [formState, setFormState] = useState<FormState>({
    displayName: '',
    description: '',
    personaColor: DEFAULT_COLOR,
    tone: '',
    systemPrompt: '',
    avatarShape: 'circle',
    avatarIcon: '',
    avatarInitial: 'AI'
  });
  const [allowedTools, setAllowedTools] = useState<string[]>(initialTemplates[0]?.allowedTools ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingInstanceId, setUpdatingInstanceId] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [selectedId, templates]
  );

  const usageByPersona = useMemo(() => {
    const map = new Map<string, AiEmployeeUsageStats>();
    (usageStats ?? []).forEach((stat) => map.set(stat.personaKey, stat));
    return map;
  }, [usageStats]);

  const matchingInstances = useMemo(() => {
    if (!selectedTemplate) return [];
    return instances.filter((instance) => instance.template.key === selectedTemplate.key);
  }, [instances, selectedTemplate]);

  const selectedUsage = selectedTemplate ? usageByPersona.get(selectedTemplate.key) : undefined;
  const customTools = useMemo(
    () => allowedTools.filter((tool) => !KNOWN_TOOL_KEYS.includes(tool)),
    [allowedTools]
  );

  useEffect(() => {
    if (!selectedTemplate) {
      setFormState({
        displayName: '',
        description: '',
        personaColor: DEFAULT_COLOR,
        tone: '',
        systemPrompt: '',
        avatarShape: 'circle',
        avatarIcon: '',
        avatarInitial: 'AI'
      });
      setAllowedTools([]);
      return;
    }

      setFormState({
        displayName: selectedTemplate.displayName,
      description: selectedTemplate.description,
      personaColor: resolveColorSetting(selectedTemplate.defaultSettings),
      tone: resolveStringSetting(selectedTemplate.defaultSettings, 'tone'),
      systemPrompt: selectedTemplate.systemPrompt,
      avatarShape: resolveAvatarShape(selectedTemplate.defaultSettings),
      avatarIcon: resolveStringSetting(selectedTemplate.defaultSettings, 'avatarIcon'),
      avatarInitial: resolveAvatarInitial(selectedTemplate.defaultSettings, selectedTemplate.displayName)
    });
      setAllowedTools(
        Array.isArray(selectedTemplate.allowedTools) ? [...selectedTemplate.allowedTools] : []
      );
  }, [selectedTemplate]);

  const handleFormChange = (patch: Partial<FormState>) => {
    setFormState((current) => ({ ...current, ...patch }));
  };

  const handleToggleTool = (tool: string) => {
    setAllowedTools((current) =>
      current.includes(tool) ? current.filter((value) => value !== tool) : [...current, tool]
    );
  };

  const handleAutoModeChange = async (instanceId: string, autoMode: AiEmployeeInstance['autoMode']) => {
    setUpdatingInstanceId(instanceId);
    try {
      const updated = await updateAiEmployeeInstance(instanceId, { autoMode });
      setInstances((current) => current.map((instance) => (instance.id === updated.id ? updated : instance)));
      toast({
        title: 'Execution mode updated',
        description: `Set to ${autoMode.replace('-', ' ')}.`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update execution mode';
      toast({
        title: 'Unable to update execution mode',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setUpdatingInstanceId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTemplate) {
      return;
    }

    setIsSaving(true);
    try {
      const trimmedInitial = formState.avatarInitial.trim().slice(0, 2).toUpperCase() || 'AI';
      const normalizedTools = Array.from(new Set(allowedTools));
      const payload = {
        displayName: formState.displayName.trim(),
        description: formState.description.trim(),
        systemPrompt: formState.systemPrompt.trim(),
        allowedTools: normalizedTools,
        personaColor: formState.personaColor,
        avatarShape: formState.avatarShape,
        avatarIcon: formState.avatarIcon.trim(),
        avatarInitial: trimmedInitial,
        tone: formState.tone.trim(),
        defaultSettings: {
          ...selectedTemplate.defaultSettings,
          personaColor: formState.personaColor,
          tone: formState.tone.trim(),
          avatarShape: formState.avatarShape,
          avatarIcon: formState.avatarIcon.trim(),
          avatarInitial: trimmedInitial
        }
      };

      const updated = await updateAiEmployeeTemplate(selectedTemplate.id, payload);
      setTemplates((current) => current.map((template) => (template.id === updated.id ? updated : template)));
      setSelectedId(updated.id);
      toast({
        title: 'Persona updated',
        description: `${updated.displayName} saved successfully.`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      toast({
        title: 'Unable to update persona',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!templates.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white/50 p-8 text-center text-sm text-slate-500">
        No persona templates found. Run the database seed to provision the default personas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Persona</th>
              <th className="px-4 py-3">Tone &amp; Color</th>
              <th className="px-4 py-3">Allowed tools</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {templates.map((template) => {
              const color = resolveColorSetting(template.defaultSettings);
              const tone = resolveStringSetting(template.defaultSettings, 'tone', 'default');
              const shape = resolveAvatarShape(template.defaultSettings);
              const initials = resolveAvatarInitial(template.defaultSettings, template.displayName);
              return (
                <tr
                  key={template.id}
                  className={cn(
                    'cursor-pointer bg-white transition hover:bg-slate-50',
                    selectedId === template.id && 'bg-slate-50'
                  )}
                  onClick={() => setSelectedId(template.id)}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-3">
                      <AvatarPreview color={color} shape={shape} initial={initials} />
                      <div>
                        <div className="font-medium text-slate-900">{template.displayName}</div>
                        <div className="text-xs text-slate-500">{template.description}</div>
                        <div className="text-xs text-slate-400">Key: {template.key}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span
                        className="h-4 w-4 rounded-full border border-slate-300"
                        style={{ backgroundColor: color }}
                        aria-label="Persona color"
                      />
                      <span>{tone || 'default'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {template.allowedTools.map((tool) => (
                        <Badge key={tool} variant="secondary">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Edit persona</h2>
          <p className="text-sm text-slate-600">
            Update the display copy, tone, brand color, or base system prompt. Changes are saved to the template and flow to every tenant instance.
          </p>
        </div>

        {!selectedTemplate ? (
          <p className="text-sm text-slate-500">Select a persona above to start editing.</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Display name
                <input
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={formState.displayName}
                  onChange={(event) => handleFormChange({ displayName: event.target.value })}
                  required
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-slate-700">
                Tone
                <input
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={formState.tone}
                  onChange={(event) => handleFormChange({ tone: event.target.value })}
                  placeholder="warm, concise, analytical..."
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Accent color
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-16 rounded-md border border-slate-300 bg-white p-1"
                    value={HEX_COLOR.test(formState.personaColor) ? formState.personaColor : DEFAULT_COLOR}
                    onChange={(event) => handleFormChange({ personaColor: event.target.value })}
                  />
                  <input
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={formState.personaColor}
                    data-testid="persona-color-input"
                    onChange={(event) => handleFormChange({ personaColor: event.target.value })}
                  />
                </div>
              </label>

              <label className="flex flex-col text-sm font-medium text-slate-700">
                Description
                <input
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={formState.description}
                  onChange={(event) => handleFormChange({ description: event.target.value })}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Avatar shape
                <select
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={formState.avatarShape}
                  data-testid="avatar-shape-select"
                  onChange={(event) =>
                    handleFormChange({ avatarShape: event.target.value as AvatarShape })
                  }
                >
                  {AVATAR_SHAPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col text-sm font-medium text-slate-700">
                Avatar initials
                <input
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={formState.avatarInitial}
                  maxLength={2}
                  data-testid="avatar-initial-input"
                  onChange={(event) => handleFormChange({ avatarInitial: event.target.value.toUpperCase() })}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Avatar icon
                <input
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={formState.avatarIcon}
                  data-testid="avatar-icon-input"
                  onChange={(event) => handleFormChange({ avatarIcon: event.target.value })}
                  placeholder="stethoscope, sparkles, assistant..."
                />
              </label>

              <div className="flex flex-col text-sm font-medium text-slate-700">
                Preview
                <div className="mt-2 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                  <AvatarPreview
                    color={formState.personaColor}
                    shape={formState.avatarShape}
                    initial={formState.avatarInitial}
                  />
                  <p className="text-xs font-normal text-slate-500">
                    Updates instantly as you change initials, shape, or color.
                  </p>
                </div>
              </div>
            </div>

            <label className="flex flex-col text-sm font-medium text-slate-700">
              System prompt
              <Textarea
                className="mt-1 h-48"
                value={formState.systemPrompt}
                onChange={(event) => handleFormChange({ systemPrompt: event.target.value })}
              />
            </label>

            <UsageSummary usage={selectedUsage} />

            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-slate-900">Allowed tools</h3>
                <p className="text-xs text-slate-500">
                  Toggle which AI tools this persona can call when proposing or executing actions.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {KNOWN_TOOL_OPTIONS.map((tool) => (
                  <label
                    key={tool.value}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-slate-300"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={allowedTools.includes(tool.value)}
                      onChange={() => handleToggleTool(tool.value)}
                      aria-label={tool.label}
                    />
                    <span>
                      <span className="font-medium text-slate-900">{tool.label}</span>
                      <span className="block text-xs text-slate-500">{tool.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              {customTools.length > 0 && (
                <p className="text-xs text-slate-500">
                  Custom tools preserved:{' '}
                  {customTools.map((tool) => (
                    <span key={tool} className="mr-1 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
                      {tool}
                    </span>
                  ))}
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-slate-900">Execution mode</h3>
                <p className="text-xs text-slate-500">
                  Choose whether this persona should always suggest, require approval, or auto-run actions for this tenant.
                </p>
              </div>
              {matchingInstances.length === 0 ? (
                <p className="text-xs text-slate-500">No AI employee instance exists for this persona yet.</p>
              ) : (
                <div className="space-y-3">
                  {matchingInstances.map((instance) => {
                    const label = instance.userId ? `Personal instance (${instance.userId})` : 'Tenant default instance';
                    return (
                      <label
                        key={instance.id}
                        className="flex flex-col rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        {label}
                        <select
                          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={instance.autoMode}
                          data-testid={`auto-mode-${instance.id}`}
                          disabled={updatingInstanceId === instance.id}
                          onChange={(event) =>
                            handleAutoModeChange(instance.id, event.target.value as AiEmployeeInstance['autoMode'])
                          }
                        >
                          <option value="suggest-only">Suggest only</option>
                          <option value="requires-approval">Requires approval</option>
                          <option value="auto-run">Auto-run</option>
                        </select>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Changes apply globally and propagate to every AI employee instance within seconds.
              </span>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save persona'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function AvatarPreview({
  color,
  shape,
  initial
}: {
  color: string;
  shape: AvatarShape;
  initial: string;
}) {
  const normalizedColor = HEX_COLOR.test(color) ? color : DEFAULT_COLOR;
  const baseInitial = initial.trim().slice(0, 2).toUpperCase() || 'AI';
  const sizeClass =
    shape === 'pill'
      ? 'h-10 px-5'
      : shape === 'hexagon'
        ? 'h-12 w-14'
        : 'h-12 w-12';
  const rounding =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'rounded-square'
        ? 'rounded-2xl'
        : shape === 'square'
          ? 'rounded-lg'
          : shape === 'pill'
            ? 'rounded-full'
            : '';
  const style =
    shape === 'hexagon'
      ? {
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
        }
      : undefined;
  return (
    <div
      className={cn(
        'flex select-none items-center justify-center text-base font-semibold uppercase tracking-wide text-white shadow-sm ring-1 ring-white/40',
        sizeClass,
        rounding
      )}
      style={{ backgroundColor: normalizedColor, ...(style ?? {}) }}
      data-testid="persona-avatar-preview"
      data-shape={shape}
      data-color={normalizedColor}
    >
      {baseInitial}
    </div>
  );
}

function UsageSummary({ usage }: { usage?: AiEmployeeUsageStats }) {
  if (!usage) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-500">
        No usage recorded for this persona in the last 30 days.
      </div>
    );
  }

  const successRate = usage.totalActions
    ? Math.round((usage.successfulActions / usage.totalActions) * 100)
    : 0;
  const topTools = usage.toolsUsed.slice(0, 3);

  return (
    <div
      className="space-y-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
      data-testid="usage-summary"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
        <span>Usage snapshot</span>
        <span>
          {new Date(usage.timeWindow.from).toLocaleDateString()} –{' '}
          {new Date(usage.timeWindow.to).toLocaleDateString()}
        </span>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <p className="text-xs uppercase text-slate-500">Total actions</p>
          <p className="text-lg font-semibold text-slate-900">{usage.totalActions}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Success rate</p>
          <p className="text-lg font-semibold text-emerald-600">{successRate}%</p>
        </div>
        <div className="flex-1 min-w-[160px]">
          <p className="text-xs uppercase text-slate-500">Top tools</p>
          <p className="text-xs text-slate-600" data-testid="usage-top-tools">
            {topTools.length
              ? topTools.map((tool) => `${tool.toolKey} (${tool.count})`).join(', ')
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
