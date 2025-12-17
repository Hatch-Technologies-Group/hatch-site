import crypto from 'crypto';

export const slugify = (input: string, maxLength = 80): string => {
  const value = input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!value) return '';
  return value.length <= maxLength ? value : value.slice(0, maxLength).replace(/-+$/g, '');
};

export const parseDateOnlyToUtc = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }

  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

export const normalizeEmail = (value?: string | null): string | null => {
  const trimmed = (value ?? '').trim().toLowerCase();
  return trimmed ? trimmed : null;
};

export const normalizePhone = (value?: string | null): string | null => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^0-9+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+1${digits}`;
  return digits;
};

export const sha256Hex = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

