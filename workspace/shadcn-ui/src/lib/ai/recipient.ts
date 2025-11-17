const RECIPIENT_PATTERNS = [
  // Strong "... to {Name}" patterns first to avoid capturing the word "to"
  /\b(?:email|send|compose|draft)[\s\S]{0,80}?\bto\s+([a-zA-Z][a-zA-Z\s'.-]+?)(?=(?:\s+(?:about|regarding|re:)|[.,!?]|$))/i,
  /send(?:\s+a[n]?)?\s+(?:note|email|message)?\s*to\s+([a-zA-Z][a-zA-Z\s'.-]+?)(?=(?:\s+(?:about|regarding)|[.,!?]|$))/i,
  // Other common phrasings
  /send\s+([a-zA-Z][a-zA-Z\s'.-]+?)\s+(?:an\s+)?email\b/i,
  /email\s+([a-zA-Z][a-zA-Z\s'.-]+?)(?=\s|$)/i,
  /reach out to\s+([a-zA-Z][a-zA-Z\s'.-]+?)(?=\s|$)/i,
  /contact\s+([a-zA-Z][a-zA-Z\s'.-]+?)(?=\s|$)/i,
  /([a-zA-Z][a-zA-Z\s'.-]+)\s+about/i
];

export function extractRecipientQuery(input: string): string | null {
  if (!input) return null;
  // Normalize whitespace
  const value = String(input).trim();
  if (!value) return null;
  // If an email address appears anywhere, use it directly
  const emailMatch = value.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (emailMatch) {
    return emailMatch[1];
  }
  for (const pattern of RECIPIENT_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Guard against accidentally capturing the preposition "to"
      if (name && name.toLowerCase() !== 'to') {
        return name.replace(/\s+/g, ' ');
      }
    }
  }

  const consecutiveMatch = value.match(/([A-Z][a-zA-Z'.-]*(?:\s+[A-Z][a-zA-Z'.-]*)+)/);
  if (consecutiveMatch) {
    return consecutiveMatch[1].trim();
  }

  const capitalizedWords = value
    .split(/\s+/)
    .filter((word) => /^[A-Z][a-zA-Z'.-]*$/.test(word));
  if (capitalizedWords.length) {
    return capitalizedWords.slice(0, 2).join(' ').trim();
  }

  return null;
}
