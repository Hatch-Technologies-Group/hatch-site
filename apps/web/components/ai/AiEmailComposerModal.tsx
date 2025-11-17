"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendEmail, type PersonaId } from "@/lib/api/email";
import { requestAiEmailDraft } from "@/lib/api/ai";
import { cn } from "@/lib/utils";

type AudienceOptionKey =
  | "all_hot_leads"
  | "past_clients"
  | "open_house_invites"
  | "all_leads";

const AUDIENCE_OPTIONS: {
  key: AudienceOptionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "all_hot_leads",
    label: "All hot leads",
    description: "Leads in a hot/active stage with recent activity.",
  },
  {
    key: "past_clients",
    label: "Past clients",
    description: "Closed deals in the last 24 months.",
  },
  {
    key: "open_house_invites",
    label: "Open house invites",
    description: "Leads within a radius of a target property.",
  },
  {
    key: "all_leads",
    label: "All leads",
    description: "Entire CRM (use carefully for broad announcements).",
  },
];

type AiEmailComposerModalProps = {
  open: boolean;
  onClose: () => void;
  personaId: PersonaId;
};

export function AiEmailComposerModal({
  open,
  onClose,
  personaId,
}: AiEmailComposerModalProps) {
  const [audienceKey, setAudienceKey] =
    React.useState<AudienceOptionKey>("all_hot_leads");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [step, setStep] = React.useState<"configure" | "draft" | "sending">(
    "configure",
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStep("configure");
      setLoading(false);
      setError(null);
      setSent(false);
      setSubject("");
      setBody("");
      setPrompt("");
      setAudienceKey("all_hot_leads");
    }
  }, [open]);

  const personaName = React.useMemo(() => {
    switch (personaId) {
      case "lead_nurse":
        return "Lumen";
      case "listing_concierge":
        return "Haven";
      case "agent_copilot":
        return "Echo";
      case "market_analyst":
        return "Atlas";
      case "transaction_coordinator":
        return "Nova";
      default:
        return "Hatch AI";
    }
  }, [personaId]);

  const personaDescription = React.useMemo(() => {
    switch (personaId) {
      case "lead_nurse":
        return "Lumen writes warm follow-up and nurture campaigns.";
      case "listing_concierge":
        return "Haven writes listing and property marketing emails.";
      case "agent_copilot":
        return "Echo summarizes your book and highlights what matters.";
      case "market_analyst":
        return "Atlas explains market moves and pricing context.";
      case "transaction_coordinator":
        return "Nova keeps track of dates, deadlines, and checklists.";
      default:
        return "AI teammate for this campaign.";
    }
  }, [personaId]);

  const handleGenerateDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const draft = await requestAiEmailDraft({
        personaId,
        contextType: "segment",
        segmentKey: audienceKey,
        prompt: prompt || undefined,
      });
      setSubject(draft.subject);
      setBody(draft.html);
      setStep("draft");
    } catch (e) {
      console.error(e);
      setError("Something went wrong generating a draft. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Please provide a subject and body before sending.");
      return;
    }
    setLoading(true);
    setError(null);
    setSent(false);
    setStep("sending");
    try {
      await sendEmail({
        to: "your-test-email@findyourhatch.com",
        subject,
        html: body,
        personaId,
      });
      setSent(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      console.error(e);
      setError("Failed to send email. Please try again.");
      setStep("draft");
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = !loading && !!audienceKey;
  const canSend = !loading && !!subject.trim() && !!body.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            New AI email with {personaName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-[10px] font-semibold">
                {personaName.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-[12px]">
                  {personaName} – {personaDescription}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Choose your audience, let {personaName} draft the email, then
                  review and send.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "flex items-center gap-1",
                step === "configure" && "font-semibold text-foreground",
              )}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border bg-background text-[10px]">
                1
              </span>
              Audience & direction
            </span>
            <span className="h-px flex-1 bg-border" />
            <span
              className={cn(
                "flex items-center gap-1",
                step !== "configure" && "font-semibold text-foreground",
              )}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border bg-background text-[10px]">
                2
              </span>
              Review & send
            </span>
          </div>

          {step === "configure" && (
            <div className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
              <div className="space-y-2">
                <Label className="text-[11px]">Audience</Label>
                <div className="grid gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={cn(
                        "flex flex-col rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-muted",
                        audienceKey === opt.key && "border-primary bg-primary/5",
                      )}
                      onClick={() =>
                        setAudienceKey(opt.key as AudienceOptionKey)
                      }
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {opt.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px]">
                  Extra direction (optional)
                </Label>
                <Textarea
                  className="min-h-[140px] text-xs"
                  placeholder={`Tell ${personaName} what you want this email to do.\n\nExample: "Remind hot leads about our open houses this weekend and offer a quick 15-minute call to discuss options."`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
            </div>
          )}

          {step !== "configure" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Subject</Label>
                <Input
                  className="text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Body</Label>
                <Textarea
                  className="min-h-[220px] text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-[11px] text-red-500">{error}</div>
          )}

          {sent && !error && (
            <div className="text-[11px] text-emerald-600">
              Email sent successfully.
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Close
            </Button>

            {step === "configure" && (
              <Button
                size="sm"
                onClick={handleGenerateDraft}
                disabled={!canGenerate}
              >
                {loading ? "Thinking…" : `Generate draft with ${personaName}`}
              </Button>
            )}

            {step !== "configure" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("configure")}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button size="sm" onClick={handleSend} disabled={!canSend}>
                  {loading ? "Sending…" : "Send"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
