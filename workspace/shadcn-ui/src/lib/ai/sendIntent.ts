const SEND_PATTERNS = [
  /\bcan\s+you\s+send\b/i,
  /\bplease\s+send\b/i,
  /\bsend\s+(?:it|this|that)\b/i,
  /\bsend\s+the\s+email\b/i,
  /\bgo\s+ahead\s+and\s+send\b/i,
  /\bshoot\s+(?:it|this)\s+over\b/i,
  /\bcan\s+you\s+(?:email|compose|draft)\b/i,
  /\bcompose\s+(?:an\s+)?email\b/i,
  /\bdraft\s+(?:an\s+)?email\b/i,
  /\bemail\s+(?:him|her|them|[a-zA-Z][a-zA-Z\s'.-]+)\b/i,
  // Loose heuristic: mention both "email" and a send verb anywhere in the sentence
  /(?=.*\bemail\b)(?=.*\b(send|shoot|compose|draft)\b)/i
];

export function wantsAiToSendEmail(value: string): boolean {
  if (!value) return false;
  const input = value.trim();
  if (!input) return false;

  return SEND_PATTERNS.some((pattern) => pattern.test(input));
}
