import type { PersonaId } from "./email";

export type AiEmailDraftRequest = {
  personaId: PersonaId;
  contextType: "segment" | "singleLead";
  segmentKey?: string;
  leadId?: string;
  prompt?: string;
};

export type AiEmailDraftResponse = {
  subject: string;
  html: string;
};

export async function requestAiEmailDraft(
  payload: AiEmailDraftRequest,
): Promise<AiEmailDraftResponse> {
  const res = await fetch("/api/ai/email-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("AI email draft failed", text);
    throw new Error("Failed to get AI email draft");
  }

  return res.json();
}
