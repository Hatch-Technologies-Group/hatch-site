export type PersonaId =
  | "agent_copilot" // Echo
  | "lead_nurse" // Lumen
  | "listing_concierge" // Haven
  | "market_analyst" // Atlas
  | "transaction_coordinator"; // Nova

export type SendEmailRequest = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  personaId?: PersonaId;
};

export async function sendEmail(
  payload: SendEmailRequest,
): Promise<{ success: boolean }> {
  const res = await fetch("/api/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Email send failed", text);
    throw new Error("Failed to send email");
  }

  return res.json();
}
