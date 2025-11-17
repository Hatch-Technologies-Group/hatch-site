import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientInsightsHub } from '@/app/dashboard/components/client-insights-hub';
import { ApiError } from '@/lib/api/errors';

const useQueryMock = vi.fn();
const invalidateQueriesMock = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/components/crm/ClientInsights', () => ({
  EngagementHeatmap: () => <div data-testid="mock-heatmap" />,
  ConversionChart: () => null,
  Leaderboard: () => null,
  ReengagementList: () => null
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  )
}));

vi.mock('@/components/ui/select', () => {
  const Base = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const Trigger = ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>;
  return {
    Select: Base,
    SelectContent: Base,
    SelectItem: Base,
    SelectTrigger: Trigger,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>
  };
});

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('ClientInsightsHub React Query config', () => {
  beforeEach(() => {
    useQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn()
    });
    useQueryMock.mockClear();
  });

  it('disables retries when the API responds with 429', () => {
    render(<ClientInsightsHub tenantId="tenant-test" />);

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    const options = useQueryMock.mock.calls[0][0] as {
      retry: (failureCount: number, error: unknown) => boolean;
    };

    const rateLimitError = new ApiError('Too many refreshes', { status: 429 });
    expect(options.retry(0, rateLimitError)).toBe(false);
    expect(options.retry(0, new Error('boom'))).toBe(true);
    expect(options.retry(2, new Error('boom'))).toBe(false);
  });
});
