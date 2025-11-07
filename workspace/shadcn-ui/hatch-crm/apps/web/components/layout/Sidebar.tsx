"use client";

import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeDollarSign,
  BarChart3,
  Calendar,
  ChevronLeft,
  FileText,
  Globe,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Map,
  MessageCircle,
  Route,
  Search,
  ShieldCheck,
  UserCircle2,
  Users,
  Webhook
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FocusEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useSidebar } from './sidebar-context';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Cohort Hub', icon: LayoutGrid },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/people', label: 'Pipeline', icon: Users },
  { href: '/contacts', label: 'Contacts', icon: UserCircle2 },
  { href: '/opportunities', label: 'Opportunities', icon: BarChart3 },
  { href: '/messages', label: 'Messaging', icon: MessageCircle },
  { href: '/routing', label: 'Lead Routing', icon: Route },
  { href: '/journeys', label: 'Journeys', icon: Map },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/tour-booker', label: 'Tour Booker', icon: Calendar },
  { href: '/agreements/buyer-rep', label: 'Compliance', icon: FileText },
  { href: '/mls/preflight', label: 'Publishing Check', icon: Globe },
  { href: '/cases', label: 'Cases', icon: LifeBuoy },
  { href: '/payouts', label: 'Commission Plans', icon: BadgeDollarSign },
  { href: '/admin/audit', label: 'Audit', icon: ShieldCheck }
];

type SidebarProps = {
  activeHref?: string;
};

const EXPANDED_WIDTH = 248;
const COLLAPSED_WIDTH = 72;

export function Sidebar({ activeHref }: SidebarProps) {
  const pathname = usePathname();
  const { mobileOpen, closeMobile } = useSidebar();

  const active = activeHref ?? pathname ?? '';

  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);

  const expanded = pinned || hovering;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('sidebar:pinned');
    if (saved === '1') {
      setPinned(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sidebar:pinned', pinned ? '1' : '0');
    window.dispatchEvent(new CustomEvent<boolean>('sidebar:pinned', { detail: pinned }));
  }, [pinned]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<boolean>('sidebar:hover', { detail: hovering }));
  }, [hovering]);

  const handleFocus = useCallback(() => {
    setHovering(true);
  }, []);

  const handleBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setHovering(false);
    }
  }, []);

  const brand = (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#1F5FFF] to-[#2A47FF]" />
      {expanded ? <span className="text-sm font-semibold text-gray-900">Hatch</span> : null}
    </div>
  );

  const navItems = useMemo(
    () =>
      NAV.map(({ href, label, icon: Icon }) => {
        const isActive = active.startsWith(href);
        const icon = (
          <Icon
            className={cn(
              'h-4.5 w-4.5',
              isActive ? 'text-white' : 'text-gray-500 transition-colors group-hover:text-gray-900'
            )}
          />
        );

        if (expanded) {
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-2 py-2 text-[13px] font-medium',
                isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
              )}
              onClick={closeMobile}
            >
              {icon}
              <span className="truncate">{label}</span>
            </Link>
          );
        }

        return (
          <Tooltip key={href}>
            <TooltipTrigger asChild>
              <Link
                href={href}
                className={cn(
                  'group flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100',
                  isActive && 'bg-gray-900 text-white hover:bg-gray-900'
                )}
                aria-label={label}
                onClick={closeMobile}
              >
                {icon}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      }),
    [active, closeMobile, expanded]
  );

  return (
    <>
      <TooltipProvider delayDuration={100}>
        <motion.aside
          initial={false}
          animate={{ width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'hidden md:flex fixed inset-y-0 left-0 z-30 border-r border-gray-100 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 shadow-sm',
            'transition-[width] duration-200 ease-out'
          )}
          aria-label="Main navigation"
          aria-expanded={expanded}
        >
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between px-3 pt-3">
              {brand}
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn('h-8 w-8 text-gray-500', !expanded && 'pointer-events-none opacity-0')}
                onClick={() => setPinned((prev) => !prev)}
                aria-pressed={pinned}
                aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                <ChevronLeft className={cn('h-4 w-4 transition-transform', !pinned && 'rotate-180')} />
              </Button>
            </div>

            <nav className="mt-3 flex-1 space-y-1 px-2">{navItems}</nav>

            <div className="border-t border-gray-100 p-2">
              {expanded ? (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 text-[13px]"
                  onClick={closeMobile}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={closeMobile}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sign Out</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </motion.aside>
      </TooltipProvider>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeMobile}
              aria-hidden="true"
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(80vw,260px)] flex-col border-r border-gray-100 bg-white px-4 pb-6 pt-4 shadow-xl md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between">
                {brand}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-8 w-8 text-gray-500"
                  onClick={closeMobile}
                  aria-label="Close navigation"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100',
                      active.startsWith(href) && 'bg-gray-900 text-white hover:bg-gray-900'
                    )}
                    onClick={closeMobile}
                  >
                    <Icon className={cn('h-4.5 w-4.5', active.startsWith(href) && 'text-white')} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
              <Button variant="outline" className="mt-auto w-full justify-start gap-3 text-sm" onClick={closeMobile}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
