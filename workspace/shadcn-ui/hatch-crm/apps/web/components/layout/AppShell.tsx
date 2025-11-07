"use client";

import { type ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ClientSidebarWidthVar } from './ClientSidebarWidthVar';
import { Sidebar } from './Sidebar';
import { SidebarProvider } from './sidebar-context';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SidebarProvider>
      <ClientSidebarWidthVar />
      <div className="relative min-h-screen bg-gray-50">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[-1] h-[460px] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.25),transparent_55%)]" />
        <Sidebar activeHref={pathname} />
        <QueryClientProvider client={queryClient}>
          <div className="flex min-h-screen flex-col transition-[padding-left] duration-200 ease-out md:pl-[var(--sb-w,72px)]">
            <Topbar />
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-12 pt-6 md:px-8 md:pb-16">
              {children}
            </main>
          </div>
        </QueryClientProvider>
      </div>
    </SidebarProvider>
  );
}
