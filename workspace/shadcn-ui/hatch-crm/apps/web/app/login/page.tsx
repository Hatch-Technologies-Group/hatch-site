import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { HATCH_AUTH_COOKIE, normalizeRedirectTarget } from '@/lib/auth/session';

type LoginPageProps = {
  searchParams?: {
    redirect?: string | string[];
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const redirectParam = Array.isArray(searchParams?.redirect)
    ? searchParams?.redirect?.[0] ?? null
    : searchParams?.redirect ?? null;

  const redirectTarget = normalizeRedirectTarget(redirectParam);

  if (cookies().has(HATCH_AUTH_COOKIE)) {
    redirect(redirectTarget);
  }

  const loginUrl = `/api/v1/auth/cognito/login?redirect=${encodeURIComponent(redirectTarget)}`;

  return (
    <div className="mx-auto mt-20 max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Sign in to Hatch CRM</h1>
      <p className="mt-2 text-sm text-slate-500">Continue with single sign-on.</p>
      <a
        className="mt-6 inline-flex w-full items-center justify-center rounded bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
        href={loginUrl}
      >
        Continue with SSO
      </a>
    </div>
  );
}
