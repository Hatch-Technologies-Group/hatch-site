'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'BROKER' | 'AGENT' | 'ADMIN' | 'CONSUMER';

const BROKER_ROLES = new Set(['BROKER_OWNER', 'BROKER_MANAGER']);

const deriveRole = (globalRole?: string | null, membershipRole?: string | null): UserRole => {
  if (globalRole === 'SUPER_ADMIN') return 'ADMIN';
  if (membershipRole && BROKER_ROLES.has(membershipRole)) return 'BROKER';
  if (membershipRole === 'AGENT') return 'AGENT';
  return 'CONSUMER';
};

export const useUserRole = (): UserRole => {
  const { activeMembership, user } = useAuth();
  return useMemo(() => deriveRole(user?.globalRole, activeMembership?.role ?? null), [user, activeMembership]);
};

export const userHasRole = (role: UserRole, allowed: UserRole[]) => allowed.includes(role);
