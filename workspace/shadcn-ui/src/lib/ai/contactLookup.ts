import { searchContacts } from '@/lib/api/hatch';

export async function lookupContactEmail(query: string): Promise<{ email: string; name?: string } | null> {
  const q = (query || '').trim();
  if (!q) return null;
  // If the user specified a raw email address, accept it directly without requiring a contact match.
  const emailMatch = q.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) {
    return { email: emailMatch[0] };
  }
  try {
    const tenantId = import.meta.env.VITE_TENANT_ID || 'tenant-hatch';

    // Build query variants to be resilient to name order and partials
    const parts = q.split(/\s+/).filter(Boolean);
    const variants: string[] = [q];
    if (parts.length === 2) {
      variants.push(`${parts[1]} ${parts[0]}`); // reversed order
    }
    for (const p of parts) {
      if (p.length >= 2) variants.push(p);
    }
    const uniqueVariants = Array.from(new Set(variants));

    // Accumulate results from the first variant that returns matches,
    // otherwise merge and score across all variants
    const pages: any[][] = [];
    for (const v of uniqueVariants) {
      const resp: any = await searchContacts({ query: v, limit: 5, tenantId });
      const list: any[] = Array.isArray(resp?.items)
        ? (resp.items as any[])
        : Array.isArray(resp?.rows)
          ? (resp.rows as any[])
          : [];
      if (list.length) pages.push(list);
    }

    const merged: any[] = pages.flat();
    if (!merged.length) return null;

    // Prefer name-matching candidates by token score
    const norm = (s: unknown) => (typeof s === 'string' ? s.trim().toLowerCase() : '');
    const qnorm = norm(q);
    const toName = (c: any) => {
      const composite =
        (typeof c?.name === 'string' && c.name) ||
        [c?.firstName, c?.lastName].filter((v: unknown) => typeof v === 'string' && v).join(' ');
      return norm(composite);
    };

    const tokens = parts.map((p) => norm(p)).filter(Boolean);

    const ranked = merged
      .map((c) => ({
        row: c,
        name: toName(c),
        email: (c?.primaryEmail as string) ?? (c?.email as string) ?? (Array.isArray(c?.secondaryEmails) ? c.secondaryEmails[0] : undefined)
      }))
      .filter((x) => typeof x.email === 'string' && x.email);

    // Score by how many tokens appear in the candidate name
    const withScore = ranked.map((x) => ({
      ...x,
      score:
        (x.name ? tokens.reduce((acc, t) => acc + (x.name.includes(t) ? 1 : 0), 0) : 0) +
        (x.email ? (qnorm && x.email.toLowerCase().includes(qnorm) ? 1 : 0) : 0)
    }));

    withScore.sort((a, b) => b.score - a.score);
    const chosen = withScore[0];
    const candidate = chosen?.row;

    if (!candidate) {
      return null;
    }

    const email: string | undefined =
      candidate.primaryEmail ?? candidate.email ?? (Array.isArray(candidate.secondaryEmails) ? candidate.secondaryEmails[0] : undefined);
    if (!email) {
      return null;
    }

    const firstName: string | undefined = candidate.firstName ?? undefined;
    const lastName: string | undefined = candidate.lastName ?? undefined;
    const displayName: string | undefined = candidate.name ?? undefined;
    const name = [firstName, lastName].filter(Boolean).join(' ').trim() || displayName || email;
    return { email, name };
  } catch (error) {
    console.error('Failed to lookup contact email', error);
    return null;
  }
}

/**
 * Extract and resolve multiple recipient emails from a free-form string.
 * - Returns any literal emails directly
 * - Attempts name-based lookups for remaining tokens (split on commas, semicolons, and conjunctions)
 */
export async function lookupContactEmailsFromString(input: string): Promise<string[]> {
  const value = String(input ?? '').trim();
  if (!value) return [];

  const emails = new Set<string>();

  // 1) Pull all literal emails
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const literalMatches = value.match(emailRegex) || [];
  literalMatches.forEach((e) => emails.add(e));

  // 2) Remove emails and split remainder into candidate name tokens
  const scrubbed = value.replace(emailRegex, ' ');
  const rawTokens = scrubbed
    .split(/\s*(?:,|;|\band\b|\bto\b|\babout\b|\bregarding\b|\bre:\b|\&|\+)\s*/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const STOPWORDS = new Set([
    'draft','email','note','message','send','compose','shoot',
    'about','regarding','re','tomorrow','tomorrows','meeting','with','the','group','at','for','prep','prepped','we','are','to','and','ask','him','her','them','name','what',
    'me','an','a','of','if','on','in','into','by','from','this','that','it','is','was','be','will','are','were'
  ]);

  const isLikelyName = (t: string) => {
    if (!t) return false;
    if (/\d/.test(t)) return false;
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 4) return false;
    // skip very long text fragments
    if (t.length > 60) return false;
    // require at least one non-stopword of length >= 2
    let informative = 0;
    for (const w of words) {
      const lw = w.toLowerCase();
      if (!STOPWORDS.has(lw) && /[a-zA-Z]{2,}/.test(w)) informative += 1;
    }
    // require at least one capitalized word (looks like a name)
    const hasCapitalized = words.some((w) => /^[A-Z][a-zA-Z'.-]*$/.test(w));
    return informative > 0 && hasCapitalized;
  };

  const tokens = rawTokens.filter(isLikelyName);

  // 3) Resolve name tokens via contact search
  for (const token of tokens) {
    const resolved = await lookupContactEmail(token);
    if (resolved?.email) {
      emails.add(resolved.email);
    }
  }

  return Array.from(emails);
}
