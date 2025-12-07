export const HATCH_AUTH_COOKIE = 'hatch_auth';
export const HATCH_AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const hasAuthCookie = (cookieValue?: string | null) => Boolean(cookieValue && cookieValue.length > 0);

export const normalizeRedirectTarget = (value: string | null) => {
  if (!value) return '/dashboard';
  // Only allow same-origin paths to prevent open redirects.
  try {
    const url = new URL(value, 'https://example.com');
    const target = `${url.pathname}${url.search}${url.hash}`;
    return target.startsWith('/') ? target : '/dashboard';
  } catch {
    return value.startsWith('/') ? value : '/dashboard';
  }
};
