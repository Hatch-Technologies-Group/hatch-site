import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { HATCH_AUTH_COOKIE } from '@/lib/auth/session';

export default function Home() {
  const hasAuth = cookies().has(HATCH_AUTH_COOKIE);
  redirect(hasAuth ? '/dashboard' : '/login');
}
