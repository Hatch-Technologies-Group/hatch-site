"use client";

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { HATCH_AUTH_COOKIE, HATCH_AUTH_MAX_AGE_SECONDS, normalizeRedirectTarget } from '@/lib/auth/session';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = useMemo(
    () => normalizeRedirectTarget(searchParams.get('redirect')),
    [searchParams]
  );

  useEffect(() => {
    const hasAuth = document.cookie.split(';').some((cookie) => cookie.trim().startsWith(`${HATCH_AUTH_COOKIE}=`));
    if (hasAuth) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router]);

  const handleLogin = () => {
    document.cookie = `${HATCH_AUTH_COOKIE}=1; path=/; max-age=${HATCH_AUTH_MAX_AGE_SECONDS}; samesite=lax`;
    router.replace(redirectTarget);
  };

  return (
    <div className="mx-auto mt-20 max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Sign in to Hatch CRM</h1>
      <p className="mt-2 text-sm text-slate-500">
        Staff authenticate via single sign-on with Google or Microsoft. This demo simulates an authenticated session.
      </p>
      <button className="mt-6 w-full rounded bg-brand-600 px-3 py-2 text-sm font-semibold text-white" onClick={handleLogin}>
        Continue with SSO
      </button>
    </div>
  );
}
