export type EmailDraft = {
  subject: string;
  body: string;
};

const SUBJECT_PATTERNS = [
  /^\s*\*\*?subject\*\*?\s*:\s*([^\n]+)$/im,
  /^\s*subject\s*:\s*([^\n]+)$/im
];

const DISCLAIMER_PATTERNS = [
  /you can copy this draft/i,
  /send it from your email account/i,
  /if you need any adjustments/i,
  /feel free to customize/i,
  /customize it (?:as needed|further)/i,
  /feel free to (?:tailor|modify)/i,
  /before sending\.?$/i
];

export function extractEmailDraft(content: string | null | undefined): EmailDraft {
  if (!content) {
    return {
      subject: 'Quick follow up',
      body: ''
    };
  }

  let working = content.trim();
  const tripleDashIndex = working.indexOf('---');
  if (tripleDashIndex >= 0) {
    working = working.slice(tripleDashIndex + 3).trim();
  }

  working = working.replace(/^\s*-{3,}\s*/gm, '');

  const lines = working.split(/\r?\n/);
  let subject: string | null = null;
  const bodyLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!subject) {
      const matchedPattern = SUBJECT_PATTERNS.find((pattern) => pattern.test(line));
      if (matchedPattern) {
        const match = line.match(matchedPattern);
        if (match) {
          subject = match[1].replace(/\*\*/g, '').trim();
          continue;
        }
      }
    }
    if (SUBJECT_PATTERNS.some((pattern) => pattern.test(line))) {
      continue;
    }
    bodyLines.push(raw);
  }

  if (!subject) {
    const firstLine = bodyLines.map((line) => line.trim()).find((line) => line.length > 0);
    subject = firstLine ? firstLine.replace(/\*\*/g, '').slice(0, 80) : 'Quick follow up';
  }

  // Final cleanup to ensure no accidental "Subject:" leakage
  subject = subject.replace(/^\s*subject\s*:\s*/i, '').replace(/^"|"$/g, '').trim();

  const cleanedBody = bodyLines
    .map((line) => line.replace(/\*\*/g, ''))
    .filter((line) => !DISCLAIMER_PATTERNS.some((pattern) => pattern.test(line)))
    .join('\n')
    .replace(/^\s*subject\s*:[^\n]*\n?/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    subject,
    body: cleanedBody
  };
}
