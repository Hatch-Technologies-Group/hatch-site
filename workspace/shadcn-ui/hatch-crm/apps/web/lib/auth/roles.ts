'use client';

import { useEffect, useState } from 'react';

export type UserRole = 'BROKER' | 'AGENT' | 'CONSUMER' | 'ADMIN';

const FALLBACK_ROLE: UserRole = (
  (process.env.NEXT_PUBLIC_USER_ROLE as UserRole | undefined) ??
  'BROKER'
) as UserRole;

const ROLE_STORAGE_KEY = 'hatch:user-role';

const isUserRole = (role: string | null | undefined): role is UserRole => {
  if (!role) return false;
  return ['BROKER', 'AGENT', 'CONSUMER', 'ADMIN'].includes(role);
};

export function userHasRole(role: UserRole | null | undefined, allowed: UserRole[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window === 'undefined') {
      return FALLBACK_ROLE;
    }
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (isUserRole(stored)) {
      return stored;
    }
    return FALLBACK_ROLE;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = () => {
      const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
      if (isUserRole(stored)) {
        setRole(stored);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return role;
}

export function setUserRole(role: UserRole) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new StorageEvent('storage', { key: ROLE_STORAGE_KEY, newValue: role }));
}
